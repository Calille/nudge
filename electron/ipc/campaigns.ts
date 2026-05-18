import {
  applyCampaignSchedule,
  clearCampaignSchedule,
  createCampaign,
  deleteCampaign,
  getCampaign,
  getCampaignEmails,
  getCampaignFilters,
  getContactById,
  getDefaultEmailAccountFull,
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
import { getSenderDefaults } from "../services/sender-defaults";
import { renderTemplateForContact } from "../services/template-compiler";
import { logoDataUri } from "../services/logo-storage";
import type {
  CampaignFilters,
  CampaignPreview,
  CampaignSchedule,
  CreateCampaign,
  RecipientSummary,
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

  // Renders the campaign's template with merge fields filled in for a
  // sample recipient. If sampleContactId is omitted, picks the first
  // matching recipient — filter-resolved for recurring campaigns, or the
  // first contact_id from campaign_emails for one-off ones.
  registerHandler(
    "campaigns:preview",
    async (
      _e,
      campaignId: number,
      sampleContactId?: number | null
    ): Promise<CampaignPreview> => {
      const campaign = getCampaign(campaignId);
      if (!campaign.template_id) {
        throw new Error("Campaign has no template");
      }
      const template = getTemplateById(campaign.template_id);
      const sender = await getSenderDefaults();
      const account = getDefaultEmailAccountFull();

      // Candidate list — for the recipient switcher dropdown. We cap it at
      // a sane size so the UI doesn't try to render thousands of options.
      let candidates: RecipientSummary[] = [];
      if (campaign.schedule_type === "recurring") {
        const filters = getCampaignFilters(campaignId);
        candidates = resolveRecipientsForFilters(filters).slice(0, 100);
      } else {
        const emails = getCampaignEmails(campaignId);
        candidates = emails
          .filter((e) => e.contact_id !== null)
          .slice(0, 100)
          .map((e) => ({
            id: e.contact_id as number,
            name: e.to_name ?? "",
            email: e.to_email,
            client_name: null,
            area: null,
          }));
      }

      const chosenId =
        sampleContactId ?? candidates[0]?.id ?? null;

      let resolvedFor: RecipientSummary | null = null;
      const contact =
        chosenId !== null
          ? (() => {
              try {
                return getContactById(chosenId);
              } catch {
                return null;
              }
            })()
          : null;

      if (contact) {
        resolvedFor = {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          client_name: contact.client?.name ?? null,
          area: contact.area,
        };
      }

      const rendered = renderTemplateForContact(
        template,
        contact,
        sender,
        account?.email ?? "",
        { logoSrc: logoDataUri(template.logo_filename) }
      );

      return {
        html: rendered.html,
        subject: rendered.subject,
        resolvedFor,
        missingFields: rendered.missingFields,
        candidateRecipients: candidates,
      };
    }
  );
}
