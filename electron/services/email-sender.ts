import {
  getDefaultEmailAccountFull,
  getEmailAccount,
  getEmailAccountFull,
} from "../database/queries";
import { sendViaGmail } from "./gmail";
import { sendViaOutlook } from "./outlook";
import { sendViaSmtp } from "./smtp";

export interface EmailPayload {
  to: { name?: string | null; email: string };
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export function requireDefaultAccount() {
  const acc = getDefaultEmailAccountFull();
  if (!acc) {
    throw new Error(
      "No email account connected. Connect Gmail, Outlook or SMTP in Settings first."
    );
  }
  return acc;
}

export async function sendEmail(
  payload: EmailPayload,
  opts: {
    accountId?: number;
    fromName?: string | null;
  } = {}
): Promise<{ success: boolean; messageId?: string; error?: string; fromEmail: string }> {
  const account = opts.accountId
    ? (() => {
        const full = getEmailAccountFull(opts.accountId!);
        if (!full) throw new Error("Email account not found");
        return full;
      })()
    : requireDefaultAccount();

  const basePayload = {
    from: account.email,
    fromName: opts.fromName ?? account.display_name ?? null,
    to: payload.to.email,
    toName: payload.to.name ?? null,
    replyTo: payload.replyTo,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  };

  try {
    let result: { messageId?: string };
    if (account.provider === "gmail") {
      result = await sendViaGmail(account.id, basePayload);
    } else if (account.provider === "outlook") {
      result = await sendViaOutlook(account.id, basePayload);
    } else if (account.provider === "smtp") {
      result = await sendViaSmtp(account.id, basePayload);
    } else {
      throw new Error(`Unknown provider: ${account.provider}`);
    }
    return { success: true, messageId: result.messageId, fromEmail: account.email };
  } catch (err: any) {
    return { success: false, error: err.message ?? String(err), fromEmail: account.email };
  }
}

export { getEmailAccount };
