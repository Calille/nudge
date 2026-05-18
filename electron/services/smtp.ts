import nodemailer from "nodemailer";
import type { EmailAccount } from "../../src/types";
import { getEmailAccountFull, upsertEmailAccount } from "../database/queries";
import { decryptJson, encryptJson } from "./token-storage";

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
}

export async function testSmtp(config: SmtpConfig): Promise<{ ok: boolean; message: string }> {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
  });
  try {
    await transport.verify();
    return { ok: true, message: "Connection verified" };
  } catch (err: any) {
    return { ok: false, message: err.message ?? "Unknown error" };
  } finally {
    transport.close();
  }
}

export async function connectSmtpAccount(input: {
  email: string;
  display_name?: string;
  config: SmtpConfig;
}): Promise<EmailAccount> {
  const verify = await testSmtp(input.config);
  if (!verify.ok) throw new Error(`SMTP verification failed: ${verify.message}`);
  const encrypted = encryptJson(input.config);
  return upsertEmailAccount({
    provider: "smtp",
    email: input.email,
    display_name: input.display_name ?? null,
    auth_tokens: encrypted,
    smtp_config: JSON.stringify({ host: input.config.host, port: input.config.port, secure: input.config.secure }),
  });
}

export interface SmtpSendPayload {
  from: string;
  fromName?: string | null;
  to: string;
  toName?: string | null;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendViaSmtp(
  accountId: number,
  payload: SmtpSendPayload
): Promise<{ messageId?: string }> {
  const full = getEmailAccountFull(accountId);
  if (!full || full.provider !== "smtp") throw new Error("SMTP account not found");
  const cfg = decryptJson<SmtpConfig>(full.auth_tokens);
  if (!cfg) throw new Error("SMTP credentials could not be decrypted");

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.username, pass: cfg.password },
  });
  try {
    const info = await transport.sendMail({
      from: payload.fromName ? `"${payload.fromName}" <${payload.from}>` : payload.from,
      to: payload.toName ? `"${payload.toName}" <${payload.to}>` : payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return { messageId: info.messageId };
  } finally {
    transport.close();
  }
}
