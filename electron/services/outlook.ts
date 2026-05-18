import { shell } from "electron";
import http from "node:http";
import { URL } from "node:url";
import {
  ConfidentialClientApplication,
  PublicClientApplication,
  type AuthenticationResult,
} from "@azure/msal-node";
import type { EmailAccount } from "../../src/types";
import { getEmailAccountFull, upsertEmailAccount } from "../database/queries";
import { decryptJson, encryptJson } from "./token-storage";

interface OutlookTokens {
  access_token: string;
  refresh_token?: string;
  expires_on?: number;
  scope?: string;
  account_id?: string;
  home_account_id?: string;
}

const SCOPES = ["Mail.Send", "offline_access", "User.Read"];

function msalConfig(clientId: string, tenantId: string) {
  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  };
}

function clientIdsOrThrow() {
  const clientId = process.env.MS_OAUTH_CLIENT_ID;
  const tenantId = process.env.MS_OAUTH_TENANT_ID ?? "common";
  if (!clientId) {
    throw new Error(
      "Outlook OAuth is not configured. Set MS_OAUTH_CLIENT_ID (and optionally MS_OAUTH_TENANT_ID)."
    );
  }
  return { clientId, tenantId };
}

async function runAuthCodeFlow(): Promise<{
  tokens: OutlookTokens;
  email: string;
  displayName: string | null;
}> {
  const { clientId, tenantId } = clientIdsOrThrow();
  const pca = new PublicClientApplication(msalConfig(clientId, tenantId));

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
      const authCodeUrl = await pca.getAuthCodeUrl({
        scopes: SCOPES,
        redirectUri,
        prompt: "select_account",
      });
      shell.openExternal(authCodeUrl).catch(reject);

      server.on("request", async (req, res) => {
        try {
          if (!req.url) throw new Error("Missing callback URL");
          const url = new URL(req.url, redirectUri);
          const code = url.searchParams.get("code");
          const err = url.searchParams.get("error_description");
          if (err) throw new Error(err);
          if (!code) throw new Error("Missing authorization code");

          const result = (await pca.acquireTokenByCode({
            code,
            scopes: SCOPES,
            redirectUri,
          })) as AuthenticationResult | null;
          if (!result) throw new Error("Failed to acquire token");

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<html><body style='font-family:sans-serif;background:#0a0a0b;color:#ededef;padding:60px;text-align:center;'><h1>Outlook connected</h1><p>You can close this window and return to NudgeMail.</p></body></html>"
          );
          server.close();

          const tokens: OutlookTokens = {
            access_token: result.accessToken,
            expires_on: result.expiresOn?.getTime(),
            scope: result.scopes?.join(" "),
            home_account_id: result.account?.homeAccountId ?? undefined,
          };
          resolve({
            tokens,
            email: result.account?.username ?? "",
            displayName: result.account?.name ?? null,
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

export async function connectOutlookAccount(): Promise<EmailAccount> {
  const { tokens, email, displayName } = await runAuthCodeFlow();
  if (!email) throw new Error("No email returned from Microsoft account");
  return upsertEmailAccount({
    provider: "outlook",
    email,
    display_name: displayName,
    auth_tokens: encryptJson(tokens),
  });
}

async function getAccessToken(accountId: number): Promise<string> {
  const full = getEmailAccountFull(accountId);
  if (!full || full.provider !== "outlook") {
    throw new Error("Outlook account not found");
  }
  const tokens = decryptJson<OutlookTokens>(full.auth_tokens);
  if (!tokens) throw new Error("Outlook tokens could not be decrypted");

  const now = Date.now();
  if (tokens.expires_on && tokens.expires_on - 60_000 > now) {
    return tokens.access_token;
  }

  // Silent refresh via MSAL
  const { clientId, tenantId } = clientIdsOrThrow();
  const pca = new PublicClientApplication(msalConfig(clientId, tenantId));
  const cache = pca.getTokenCache();
  const accounts = await cache.getAllAccounts();
  const account = accounts.find(
    (a) => a.homeAccountId === tokens.home_account_id
  );

  if (account) {
    try {
      const result = await pca.acquireTokenSilent({
        account,
        scopes: SCOPES,
      });
      if (result?.accessToken) {
        const refreshed: OutlookTokens = {
          ...tokens,
          access_token: result.accessToken,
          expires_on: result.expiresOn?.getTime(),
        };
        upsertEmailAccount({
          provider: "outlook",
          email: full.email,
          display_name: full.display_name,
          auth_tokens: encryptJson(refreshed),
        });
        return result.accessToken;
      }
    } catch (err) {
      console.warn("[outlook] silent refresh failed, falling back to token", err);
    }
  }

  // If we reach here, the token is likely invalid; surface an error so the
  // caller can prompt a re-connect. The user can reconnect from Settings.
  if (tokens.expires_on && tokens.expires_on < now) {
    throw new Error(
      "Outlook session expired. Please reconnect your account in Settings."
    );
  }
  return tokens.access_token;
}

export interface OutlookInlineAttachment {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
}

export interface OutlookSendPayload {
  from: string;
  fromName?: string | null;
  to: string;
  toName?: string | null;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  inlineAttachments?: OutlookInlineAttachment[];
}

export async function sendViaOutlook(
  accountId: number,
  payload: OutlookSendPayload
): Promise<{ messageId?: string }> {
  const accessToken = await getAccessToken(accountId);
  const attachments = (payload.inlineAttachments ?? []).map((a) => ({
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: a.filename,
    contentType: a.contentType,
    contentBytes: a.content.toString("base64"),
    contentId: a.cid,
    isInline: true,
  }));

  const body = {
    message: {
      subject: payload.subject,
      body: { contentType: "HTML", content: payload.html },
      toRecipients: [
        {
          emailAddress: {
            address: payload.to,
            name: payload.toName ?? undefined,
          },
        },
      ],
      replyTo: payload.replyTo
        ? [{ emailAddress: { address: payload.replyTo } }]
        : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    },
    saveToSentItems: true,
  };

  const resp = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Microsoft Graph sendMail failed: ${resp.status} ${text}`);
  }
  // Graph sendMail returns 202 Accepted with no message id.
  return {};
}

// Used by build-time type checking; intentionally unused.
void ConfidentialClientApplication;
