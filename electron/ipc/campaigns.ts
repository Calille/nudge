import {
  applyCampaignSchedule,
  clearCampaignSchedule,
  createCampaign,
  deleteCampaign,
  getCampaign,
  getCampaignEmails,
  getCampaignFilters,
  getTemplateById,
  listCampaigns,
  resolveRecipientsForFilters,
  setCampaignFilters,
} from "../database/queries";
import { registerHandler } from "./helpers";
import {
  cancelCampaign,
  pauseCampaign,
  resumeCampaign,
  runCampaign,
} from "../services/campaign-runner";
import { computeNextRunAt, validateSchedule } from "../utils/schedule";
import type {
  CampaignFilters,
  CampaignSchedule,
  CreateCampaign,
} from "../../src/types";

export function registerCampaignHandlers() {
  registerHandler("campaigns:list", async () => listCampaigns());

  registerHandler("campaigns:get", async (_e, id: number) => {
    const campaign = getCampaign(id);
    const emails = getCampaignEmails(id);
    return { ...campaign, emails };
  });

  registerHandler("campaigns:create", async (_e, data: CreateCampaign) =>
    createCampaign(data)
  );

  registerHandler("campaigns:send", async (_e, id: number) => {
    // Fire-and-forget; progress events flow via 'campaigns:progress' channel.
    runCampaign(id).catch((err) => console.error("[campaign] run failed", err));
    return { started: true };
  });

  // Single entry point for all scheduling — one-off or recurring. Validates
  // the schedule, computes next_run_at and persists it atomically.
  registerHandler(
    "campaigns:schedule",
    async (_e, id: number, schedule: CampaignSchedule | null) => {
      if (schedule === null) {
        clearCampaignSchedule(id);
        return { next_run_at: null };
      }
      validateSchedule(schedule);
      const nextRunAt = computeNextRunAt(schedule);
      if (schedule.type === "one_off" && nextRunAt === null) {
        throw new Error("Scheduled time is in the past");
      }
      applyCampaignSchedule(id, schedule, nextRunAt);
      return { next_run_at: nextRunAt };
    }
  );

  registerHandler("campaigns:pause", async (_e, id: number) =>
    pauseCampaign(id)
  );
  registerHandler("campaigns:resume", async (_e, id: number) =>
    resumeCampaign(id)
  );
  registerHandler("campaigns:cancel", async (_e, id: number) =>
    cancelCampaign(id)
  );

  registerHandler("campaigns:retry-failed", async (_e, id: number) => {
    const { getDb } = await import("../database");
    getDb()
      .prepare(
        "UPDATE campaign_emails SET status = 'pending', error_message = NULL WHERE campaign_id = ? AND status = 'failed'"
      )
      .run(id);
    runCampaign(id).catch((err) => console.error("[campaign] retry failed", err));
    return { restarted: true };
  });

  registerHandler("campaigns:clone", async (_e, id: number) => {
    const campaign = getCampaign(id);
    const emails = getCampaignEmails(id);
    if (!campaign.template_id) throw new Error("Source has no template");
    getTemplateById(campaign.template_id); // validate still exists
    const contactIds = emails
      .map((e) => e.contact_id)
      .filter((x): x is number => !!x);
    return createCampaign({
      name: `${campaign.name} (copy)`,
      template_id: campaign.template_id,
      contact_ids: contactIds,
    });
  });

  registerHandler("campaigns:delete", async (_e, id: number) =>
    deleteCampaign(id)
  );

  registerHandler(
    "campaigns:setFilters",
    async (_e, campaignId: number, filters: CampaignFilters) =>
      setCampaignFilters(campaignId, filters)
  );

  registerHandler(
    "campaigns:getFilters",
    async (_e, campaignId: number) => getCampaignFilters(campaignId)
  );

  // Live resolution of a filter spec to recipients — used by the editor
  // for the running recipient count and (later) by the scheduler at send
  // time for recurring campaigns. Accepts unsaved filters so the UI can
  // preview before persisting.
  registerHandler(
    "campaigns:resolveRecipients",
    async (_e, filters: CampaignFilters) =>
      resolveRecipientsForFilters(filters)
  );
}
