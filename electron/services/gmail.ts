import { BrowserWindow, shell } from "electron";
import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";
import type { EmailAccount } from "../../src/types";
import { getEmailAccountFull, upsertEmailAccount } from "../database/queries";
import { decryptJson, encryptJson } from "./token-storage";

export interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
}

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

function clientConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Gmail OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET environment variables, or connect via SMTP instead."
    );
  }
  return { clientId, clientSecret };
}

function createOAuth2Client(redirectUri: string) {
  const { clientId, clientSecret } = clientConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function runLoopbackFlow(): Promise<GmailTokens & { email: string; name?: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, "127.0.0.1", async () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to start OAuth callback server"));
        return;
      }
      const redirectUri = `http://127.0.0.1:${address.port}/oauth2callback`;
      const oauth2 = createOAuth2Client(redirectUri);
      const authUrl = oauth2.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: SCOPES,
      });
      shell.openExternal(authUrl).catch(reject);

      server.on("request", async (req, res) => {
        try {
          if (!req.url) throw new Error("Missing callback URL");
          const url = new URL(req.url, redirectUri);
          const code = url.searchParams.get("code");
          const err = url.searchParams.get("error");
          if (err) throw new Error(err);
          if (!code) throw new Error("Missing authorization code");

          const { tokens } = await oauth2.getToken(code);
          oauth2.setCredentials(tokens);
          const oauth = google.oauth2({ auth: oauth2, version: "v2" });
          const me = await oauth.userinfo.get();
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<html><body style='font-family:sans-serif;background:#0a0a0b;color:#ededef;padding:60px;text-align:center;'><h1>Gmail connected</h1><p>You can close this window and return to NudgeMail.</p></body></html>"
          );
          server.close();
          if (!tokens.access_token) throw new Error("No access token returned");
          resolve({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token ?? undefined,
            expiry_date: tokens.expiry_date ?? undefined,
            scope: tokens.scope ?? undefined,
            token_type: tokens.token_type ?? undefined,
            email: me.data.email ?? "",
            name: me.data.name ?? undefined,
          });
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(`<pre>${err.message}</pre>`);
          server.close();
          reject(err);
        }
      });
    });
  });
}

export async function connectGmailAccount(): Promise<EmailAccount> {
  const result = await runLoopbackFlow();
  const encrypted = encryptJson({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expiry_date: result.expiry_date,
    scope: result.scope,
    token_type: result.token_type,
  });
  return upsertEmailAccount({
    provider: "gmail",
    email: result.email,
    display_name: result.name ?? null,
    auth_tokens: encrypted,
  });
}

async function getAuthedClient(accountId: number) {
  const full = getEmailAccountFull(accountId);
  if (!full || full.provider !== "gmail") {
    throw new Error("Gmail account not found");
  }
  const tokens = decryptJson<GmailTokens>(full.auth_tokens);
  if (!tokens) throw new Error("Gmail tokens could not be decrypted");
  const oauth2 = createOAuth2Client("http://127.0.0.1/oauth2callback");
  oauth2.setCredentials(tokens);
  oauth2.on("tokens", (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    upsertEmailAccount({
      provider: "gmail",
      email: full.email,
      display_name: full.display_name,
      auth_tokens: encryptJson(merged),
    });
  });
  return oauth2;
}

export interface GmailSendPayload {
  from: string;
  fromName?: string | null;
  to: string;
  toName?: string | null;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

function buildRfc822(p: GmailSendPayload): string {
  const from = p.fromName ? `"${p.fromName}" <${p.from}>` : p.from;
  const to = p.toName ? `"${p.toName}" <${p.to}>` : p.to;
  const boundary = `b_${Math.random().toString(36).slice(2)}`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    p.replyTo ? `Reply-To: ${p.replyTo}` : "",
    `Subject: ${encodeSubject(p.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    p.text,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    p.html,
    "",
    `--${boundary}--`,
  ].filter((l) => l !== undefined);
  return lines.join("\r\n");
}

function encodeSubject(s: string) {
  // RFC 2047 encoding for non-ASCII characters
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;
}

export async function sendViaGmail(
  accountId: number,
  payload: GmailSendPayload
): Promise<{ messageId?: string }> {
  const auth = await getAuthedClient(accountId);
  const gmail = google.gmail({ version: "v1", auth });
  const raw = Buffer.from(buildRfc822(payload), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const resp = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
  return { messageId: resp.data.id ?? undefined };
}

// Silence unused import in non-browser bundles
void BrowserWindow;
