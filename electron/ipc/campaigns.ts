import {
  createCampaign,
  deleteCampaign,
  getCampaign,
  getCampaignEmails,
  getTemplateById,
  listCampaigns,
  updateCampaignStatus,
} from "../database/queries";
import { registerHandler } from "./helpers";
import {
  cancelCampaign,
  pauseCampaign,
  resumeCampaign,
  runCampaign,
} from "../services/campaign-runner";
import type { CreateCampaign } from "../../src/types";

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

  registerHandler(
    "campaigns:schedule",
    async (_e, id: number, sendAt: string) => {
      updateCampaignStatus(id, "scheduled");
      const { getDb } = await import("../database");
      getDb()
        .prepare("UPDATE campaigns SET scheduled_at = ? WHERE id = ?")
        .run(sendAt, id);
      return { scheduled: true };
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
}
