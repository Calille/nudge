import type {
  CampaignSchedule,
  RecurrencePattern,
} from "../../src/types";

// All times are interpreted in the host's local timezone — picking "10:00"
// means 10:00 local, regardless of where the user travels. We never
// hardcode a zone; whoever opened the app is the reference.

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function parseTime(time: string): { hh: number; mm: number } {
  const m = TIME_RE.exec(time);
  if (!m) throw new Error(`Invalid time "${time}" (expected HH:mm)`);
  return { hh: Number(m[1]), mm: Number(m[2]) };
}

function daysInMonth(year: number, monthZeroIdx: number): number {
  return new Date(year, monthZeroIdx + 1, 0).getDate();
}

export function validateSchedule(schedule: CampaignSchedule): void {
  if (schedule.type === "one_off") {
    const t = Date.parse(schedule.runAt);
    if (!Number.isFinite(t)) {
      throw new Error("One-off schedule runAt is not a valid datetime");
    }
    return;
  }
  if (schedule.type === "recurring") {
    const p = schedule.pattern;
    parseTime(p.time);
    if (p.frequency === "weekly") {
      if (!Number.isInteger(p.day_of_week) || p.day_of_week < 0 || p.day_of_week > 6) {
        throw new Error("Weekly schedule day_of_week must be 0–6 (Sunday=0)");
      }
      return;
    }
    if (p.frequency === "monthly") {
      if (
        !Number.isInteger(p.day_of_month) ||
        p.day_of_month < 1 ||
        p.day_of_month > 31
      ) {
        throw new Error("Monthly schedule day_of_month must be 1–31");
      }
      return;
    }
  }
  throw new Error("Unknown schedule type");
}

// Computes the next run time relative to `from` (defaults to now).
// Returns an ISO 8601 string (UTC instant) or null when there is no future
// occurrence (e.g. a one-off that's already in the past).
export function computeNextRunAt(
  schedule: CampaignSchedule,
  from: Date = new Date()
): string | null {
  validateSchedule(schedule);

  if (schedule.type === "one_off") {
    const target = new Date(schedule.runAt);
    return target.getTime() > from.getTime() ? target.toISOString() : null;
  }

  return computeRecurringNext(schedule.pattern, from);
}

function computeRecurringNext(
  pattern: RecurrencePattern,
  from: Date
): string {
  const { hh, mm } = parseTime(pattern.time);

  if (pattern.frequency === "weekly") {
    // Local-time "today at HH:mm", then walk forward to the right weekday.
    const candidate = new Date(from);
    candidate.setHours(hh, mm, 0, 0);
    const currentDay = candidate.getDay();
    let delta = (pattern.day_of_week - currentDay + 7) % 7;
    if (delta === 0 && candidate.getTime() <= from.getTime()) {
      delta = 7; // same weekday but time has passed → next week
    }
    candidate.setDate(candidate.getDate() + delta);
    return candidate.toISOString();
  }

  // Monthly — try this month, advance one month if it's already past.
  // day_of_month is clamped to the actual month length so 31 in Feb
  // resolves to 28 (or 29 in leap years).
  const tryMonth = (year: number, monthIdx: number): Date => {
    const day = Math.min(pattern.day_of_month, daysInMonth(year, monthIdx));
    return new Date(year, monthIdx, day, hh, mm, 0, 0);
  };

  let candidate = tryMonth(from.getFullYear(), from.getMonth());
  if (candidate.getTime() <= from.getTime()) {
    const nextMonth = from.getMonth() + 1;
    const yearShift = Math.floor(nextMonth / 12);
    candidate = tryMonth(from.getFullYear() + yearShift, nextMonth % 12);
  }
  return candidate.toISOString();
}
