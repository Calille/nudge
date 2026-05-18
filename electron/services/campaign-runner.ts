import { BrowserWindow } from "electron";
import {
  getCampaign,
  getContactById,
  getTemplateById,
  incrementCampaignCounts,
  listPendingCampaignEmails,
  markContactEmailed,
  setCampaignTimestamps,
  updateCampaignEmail,
  updateCampaignStatus,
} from "../database/queries";
import { requireDefaultAccount, sendEmail } from "./email-sender";
import { renderTemplateForContact } from "./template-compiler";
import { getSenderDefaults } from "./sender-defaults";
import type { SendProgressEvent } from "../../src/types";

interface RunnerState {
  campaignId: number;
  paused: boolean;
  cancelled: boolean;
}

const activeRunners = new Map<number, RunnerState>();
const DEFAULT_DELAY_MS = 2000;

function broadcast(event: SendProgressEvent) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("campaigns:progress", event);
  }
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export function pauseCampaign(id: number) {
  const state = activeRunners.get(id);
  if (!state) return;
  state.paused = true;
  updateCampaignStatus(id, "paused");
}

export function resumeCampaign(id: number) {
  const state = activeRunners.get(id);
  if (!state) {
    // Not currently running — relaunch the runner
    runCampaign(id).catch((e) => console.error("[campaign] resume failed", e));
    return;
  }
  state.paused = false;
  updateCampaignStatus(id, "sending");
}

export function cancelCampaign(id: number) {
  const state = activeRunners.get(id);
  if (state) state.cancelled = true;
  updateCampaignStatus(id, "cancelled");
}

export async function runCampaign(campaignId: number) {
  if (activeRunners.has(campaignId)) {
    throw new Error("Campaign is already running");
  }
  const campaign = getCampaign(campaignId);
  if (!campaign.template_id) throw new Error("Campaign has no template");
  const template = getTemplateById(campaign.template_id);
  const sender = await getSenderDefaults();
  const account = requireDefaultAccount();

  const state: RunnerState = {
    campaignId,
    paused: false,
    cancelled: false,
  };
  activeRunners.set(campaignId, state);

  updateCampaignStatus(campaignId, "sending");
  setCampaignTimestamps(campaignId, {
    started_at: new Date().toISOString(),
  });

  const pending = listPendingCampaignEmails(campaignId);
  let sent = 0;
  let failed = 0;
  const total = campaign.total_recipients || pending.length;

  try {
    for (const email of pending) {
      while (state.paused && !state.cancelled) {
        await delay(500);
      }
      if (state.cancelled) break;

      const contact = email.contact_id ? (() => {
        try {
          return getContactById(email.contact_id);
        } catch {
          return null;
        }
      })() : null;

      const rendered = renderTemplateForContact(
        template,
        contact,
        sender,
        account.email
      );

      try {
        const res = await sendEmail(
          {
            to: { email: email.to_email, name: email.to_name },
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            replyTo: sender.reply_to || undefined,
          },
          { fromName: sender.from_name || undefined }
        );

        if (res.success) {
          updateCampaignEmail(email.id, {
            subject: rendered.subject,
            body_html: rendered.html,
            status: "sent",
            sent_at: new Date().toISOString(),
            error_message: null,
            message_id: res.messageId ?? null,
          });
          sent++;
          if (email.contact_id) markContactEmailed(email.contact_id);
          incrementCampaignCounts(campaignId, 1, 0);
        } else {
          updateCampaignEmail(email.id, {
            subject: rendered.subject,
            body_html: rendered.html,
            status: "failed",
            sent_at: null,
            error_message: res.error ?? "Send failed",
            message_id: null,
          });
          failed++;
          incrementCampaignCounts(campaignId, 0, 1);
        }

        broadcast({
          campaign_id: campaignId,
          total,
          sent,
          failed,
          current: {
            contact_id: email.contact_id,
            to_email: email.to_email,
            status: res.success ? "sent" : "failed",
            error: res.success ? undefined : res.error,
          },
          done: false,
        });
      } catch (err: any) {
        updateCampaignEmail(email.id, {
          subject: rendered.subject,
          body_html: rendered.html,
          status: "failed",
          sent_at: null,
          error_message: err.message ?? String(err),
          message_id: null,
        });
        failed++;
        incrementCampaignCounts(campaignId, 0, 1);
        broadcast({
          campaign_id: campaignId,
          total,
          sent,
          failed,
          current: {
            contact_id: email.contact_id,
            to_email: email.to_email,
            status: "failed",
            error: err.message ?? String(err),
          },
          done: false,
        });
      }

      await delay(DEFAULT_DELAY_MS);
    }

    if (state.cancelled) {
      updateCampaignStatus(campaignId, "cancelled");
    } else if (failed > 0 && sent === 0) {
      updateCampaignStatus(campaignId, "failed");
    } else {
      updateCampaignStatus(campaignId, "completed");
    }
    setCampaignTimestamps(campaignId, {
      completed_at: new Date().toISOString(),
    });

    broadcast({
      campaign_id: campaignId,
      total,
      sent,
      failed,
      done: true,
    });
  } finally {
    activeRunners.delete(campaignId);
  }
}
