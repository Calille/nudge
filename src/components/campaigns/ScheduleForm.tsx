import { Calendar, Repeat, Send } from "lucide-react";
import { useMemo } from "react";
import { Input, Select } from "@/components/shared/Input";
import { cn } from "@/lib/cn";
import type { CampaignSchedule, RecurrencePattern } from "@/types";

export type ScheduleMode = "now" | "one_off" | "recurring";

interface Props {
  mode: ScheduleMode;
  onModeChange: (mode: ScheduleMode) => void;
  schedule: CampaignSchedule | null;
  onScheduleChange: (next: CampaignSchedule | null) => void;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function ScheduleForm({
  mode,
  onModeChange,
  schedule,
  onScheduleChange,
}: Props) {
  const tz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  const handleMode = (next: ScheduleMode) => {
    onModeChange(next);
    if (next === "now") {
      onScheduleChange(null);
    } else if (next === "one_off") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setSeconds(0, 0);
      onScheduleChange({
        type: "one_off",
        runAt: toLocalInputValue(tomorrow),
      });
    } else {
      onScheduleChange({
        type: "recurring",
        pattern: { frequency: "weekly", day_of_week: 1, time: "09:00" },
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <ModeCard
          icon={<Send size={14} />}
          label="Send now"
          description="Start immediately"
          active={mode === "now"}
          onClick={() => handleMode("now")}
        />
        <ModeCard
          icon={<Calendar size={14} />}
          label="Schedule"
          description="One-off at a specific time"
          active={mode === "one_off"}
          onClick={() => handleMode("one_off")}
        />
        <ModeCard
          icon={<Repeat size={14} />}
          label="Recurring"
          description="Weekly or monthly"
          active={mode === "recurring"}
          onClick={() => handleMode("recurring")}
        />
      </div>

      {mode === "one_off" && schedule?.type === "one_off" && (
        <div>
          <Input
            type="datetime-local"
            label="Run at"
            value={schedule.runAt}
            onChange={(e) =>
              onScheduleChange({ type: "one_off", runAt: e.target.value })
            }
            hint={`Times are interpreted in ${tz}`}
          />
        </div>
      )}

      {mode === "recurring" && schedule?.type === "recurring" && (
        <RecurringEditor
          pattern={schedule.pattern}
          onChange={(pattern) =>
            onScheduleChange({ type: "recurring", pattern })
          }
          tz={tz}
        />
      )}
    </div>
  );
}

function RecurringEditor({
  pattern,
  onChange,
  tz,
}: {
  pattern: RecurrencePattern;
  onChange: (next: RecurrencePattern) => void;
  tz: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Frequency"
          value={pattern.frequency}
          onChange={(e) => {
            const freq = e.target.value as "weekly" | "monthly";
            if (freq === "weekly") {
              onChange({
                frequency: "weekly",
                day_of_week: 1,
                time: pattern.time,
              });
            } else {
              onChange({
                frequency: "monthly",
                day_of_month: 1,
                time: pattern.time,
              });
            }
          }}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </Select>

        <Input
          type="time"
          label="Time"
          value={pattern.time}
          onChange={(e) => onChange({ ...pattern, time: e.target.value })}
        />
      </div>

      {pattern.frequency === "weekly" && (
        <Select
          label="Day of week"
          value={pattern.day_of_week}
          onChange={(e) =>
            onChange({
              frequency: "weekly",
              day_of_week: Number(e.target.value),
              time: pattern.time,
            })
          }
        >
          {DAYS_OF_WEEK.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </Select>
      )}

      {pattern.frequency === "monthly" && (
        <Select
          label="Day of month"
          value={pattern.day_of_month}
          onChange={(e) =>
            onChange({
              frequency: "monthly",
              day_of_month: Number(e.target.value),
              time: pattern.time,
            })
          }
          hint="Days past month length clamp to the last day (e.g. 31 in February becomes 28 or 29)."
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      )}

      <div className="text-xs text-fg-muted">
        Times are interpreted in {tz}.
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left p-3 rounded-md border transition-colors",
        active
          ? "border-accent bg-accent/10"
          : "border-border bg-bg-elevated hover:border-accent/40"
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-xs text-fg-muted">{description}</div>
    </button>
  );
}

// Format a Date as the value accepted by <input type="datetime-local">.
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}
