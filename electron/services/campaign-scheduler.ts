import { BrowserWindow } from "electron";
import {
  getCampaignFilters,
  listDueCampaigns,
  materializeRecipientsForRun,
  resolveRecipientsForFilters,
  setCampaignLastRunAt,
  setCampaignNextRunAt,
} from "../database/queries";
import { computeNextRunAt } from "../utils/schedule";
import { runCampaign } from "./campaign-runner";
import type { Campaign } from "../../src/types";

// 60s is comfortable for email scheduling: invisible to users (worst case
// ≤1 minute drift) while still letting the event loop sit idle most of
// the time. See the design discussion in CLAUDE.md.
const CHECK_INTERVAL_MS = 60_000;

let timer: NodeJS.Timeout | null = null;
let running = false;

function broadcast(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

async function tick() {
  if (running) return; // serialise overlapping ticks
  running = true;
  try {
    const now = new Date();
    const due = listDueCampaigns(now.toISOString());
    for (const campaign of due) {
      try {
        await runDueCampaign(campaign, now);
      } catch (err) {
        console.error(
          `[scheduler] campaign ${campaign.id} run failed`,
          err
        );
      }
    }
  } finally {
    running = false;
  }
}

async function runDueCampaign(campaign: Campaign, now: Date) {
  broadcast("campaigns:scheduled-run-started", {
    campaign_id: campaign.id,
    at: now.toISOString(),
  });

  // For recurring campaigns, materialise recipients now from saved
  // filters so newly-added matching contacts are picked up. One-off
  // campaigns already have campaign_emails rows from creation time.
  if (campaign.schedule_type === "recurring") {
    const filters = getCampaignFilters(campaign.id);
    const recipients = resolveRecipientsForFilters(filters);
    materializeRecipientsForRun(campaign.id, recipients);
  }

  // Advance the schedule BEFORE running. One-off marks itself inactive;
  // recurring computes the next occurrence so a long-running send doesn't
  // re-trigger itself on the next tick.
  setCampaignLastRunAt(campaign.id, now.toISOString());
  if (campaign.schedule_type === "one_off") {
    setCampaignNextRunAt(campaign.id, null);
  } else if (
    campaign.schedule_type === "recurring" &&
    campaign.recurrence_pattern
  ) {
    const next = computeNextRunAt(
      { type: "recurring", pattern: campaign.recurrence_pattern },
      now
    );
    setCampaignNextRunAt(campaign.id, next);
  }

  await runCampaign(campaign.id);

  broadcast("campaigns:scheduled-run-completed", {
    campaign_id: campaign.id,
    completed_at: new Date().toISOString(),
  });
}

// Called from main.ts after initDatabase() and before window creation.
// Runs an immediate catch-up sweep so a campaign whose next_run_at
// passed while the app was closed will fire on next launch, then sets a
// recurring 60s interval.
export function startCampaignScheduler() {
  if (timer) return;
  // Fire-and-forget catch-up — boot shouldn't block on email sends.
  tick().catch((err) => console.error("[scheduler] boot sweep failed", err));
  timer = setInterval(() => {
    tick().catch((err) => console.error("[scheduler] tick failed", err));
  }, CHECK_INTERVAL_MS);
}

export function stopCampaignScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
