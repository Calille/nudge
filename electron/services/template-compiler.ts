import mjml2html from "mjml";
import type {
  ContactWithRelations,
  MergeContext,
  SenderDefaults,
  Staff,
  Template,
} from "../../src/types";

const MERGE_RE = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractMergeFields(source: string): string[] {
  const set = new Set<string>();
  for (const match of source.matchAll(MERGE_RE)) {
    set.add(match[1]);
  }
  return Array.from(set);
}

function formatStaffList(staff: Staff[]): string {
  if (!staff.length) return "";
  const items = staff
    .map((s) => {
      const bits: string[] = [];
      if (s.role) bits.push(s.role);
      if (s.specialisms?.length) bits.push(`(${s.specialisms.join(", ")})`);
      const detail = bits.length ? ` — ${bits.join(" ")}` : "";
      const avail = s.availability ? ` — ${s.availability}` : "";
      return `<li style="margin:6px 0;"><strong>${escapeHtml(
        s.name
      )}</strong>${escapeHtml(detail)}${escapeHtml(avail)}${
        s.bio
          ? `<div style="color:#555;font-size:13px;margin-top:2px;">${escapeHtml(
              s.bio
            )}</div>`
          : ""
      }</li>`;
    })
    .join("");
  return `<ul style="padding-left:20px;margin:12px 0;">${items}</ul>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Title-cases a single word — "josh" → "Josh", "MARY" → "Mary".
// Imported names are often inconsistent (lowercase from a hasty CSV,
// SHOUTING from a CRM export) so we normalise at merge time rather
// than trusting whatever's in the DB.
function titleCase(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function buildMergeContext(
  contact: ContactWithRelations | null,
  sender: SenderDefaults
): MergeContext {
  const name = contact?.name ?? "Friend";
  const firstNameRaw = name.split(/\s+/)[0] ?? name;
  const firstName = titleCase(firstNameRaw);
  const displayName = name
    .split(/\s+/)
    .map(titleCase)
    .join(" ");
  return {
    client_name: contact?.client?.name ?? "",
    contact_name: displayName,
    contact_first_name: firstName,
    contact_role: contact?.role ?? "",
    staff_list: formatStaffList(contact?.staff ?? []),
    staff_count: contact?.staff?.length ?? 0,
    sender_name: sender.from_name ?? "",
    sender_email: "", // injected at send time
    sender_phone: sender.phone ?? "",
    company_name: sender.company_name ?? "",
    current_date: new Date().toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    unsubscribe_link:
      'mailto:?subject=Unsubscribe&body=Please%20remove%20me%20from%20future%20emails.',
  };
}

export function applyMerge(
  source: string,
  context: Record<string, unknown>
): { output: string; missing: string[] } {
  const missing = new Set<string>();
  const output = source.replace(MERGE_RE, (_, key: string) => {
    if (key in context) {
      const val = context[key];
      if (val === undefined || val === null || val === "") {
        missing.add(key);
        return "";
      }
      return String(val);
    }
    missing.add(key);
    return "";
  });
  return { output, missing: Array.from(missing) };
}

/**
 * Wrap plain HTML from the TipTap editor in a responsive MJML shell and compile.
 * The editor's HTML lives inside a single column within an `mj-raw` tag so we
 * retain the rich text styling while still getting MJML's cross-client table
 * layout. When `logoSrc` is provided, a header section with the logo is prepended.
 */
export function wrapAndCompileHtml(
  innerHtml: string,
  options: { accentColor?: string; logoSrc?: string | null } = {}
): { html: string; errors: string[] } {
  const safeHtml = innerHtml || "<p></p>";
  const logoSection = options.logoSrc
    ? `<mj-section background-color="#FFFFFF" padding="24px 32px 0">
      <mj-column>
        <mj-image src="${options.logoSrc}" alt="" width="160px" align="left" padding="0" />
      </mj-column>
    </mj-section>`
    : "";
  const mjmlSource = `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="15px" color="#1F2937" line-height="1.6" />
    </mj-attributes>
    <mj-style>
      a { color: ${options.accentColor ?? "#2563EB"}; }
      ul { padding-left: 20px; }
    </mj-style>
  </mj-head>
  <mj-body background-color="#F5F5F7">
    ${logoSection}
    <mj-section background-color="#FFFFFF" padding="32px">
      <mj-column>
        <mj-text padding="0">${safeHtml}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

  // NOTE: The @types/mjml-core package types mjml2html as async, but at runtime
  // it is synchronous in mjml v4. We cast to `any` to keep our pipeline sync.
  const result = (mjml2html as any)(mjmlSource, {
    validationLevel: "soft",
    minify: false,
  }) as { html: string; errors?: Array<string | { message: string }> };
  return {
    html: result.html,
    errors: (result.errors ?? []).map((e) =>
      typeof e === "string" ? e : e.message ?? JSON.stringify(e)
    ),
  };
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  missingFields: string[];
}

export function renderTemplateForContact(
  template: Template,
  contact: ContactWithRelations | null,
  sender: SenderDefaults,
  senderEmail: string,
  options: { logoSrc?: string | null } = {}
): RenderedEmail {
  const context = buildMergeContext(contact, sender);
  context.sender_email = senderEmail;

  const subjectMerge = applyMerge(template.subject, context);
  const bodyMerge = applyMerge(template.body_mjml, context);

  // Wrap the signature in a div with a controlled top margin instead of
  // <br/><br/> — paragraph collapsing inside mj-text otherwise leaves a
  // big visual gap before the signature renders.
  const signature = sender.signature_html
    ? `<div style="margin-top:18px;">${sender.signature_html}</div>`
    : "";
  const innerHtml = `${bodyMerge.output}${signature}`;

  const { html } = wrapAndCompileHtml(innerHtml, {
    logoSrc: options.logoSrc ?? null,
  });
  const missingFields = Array.from(
    new Set([...subjectMerge.missing, ...bodyMerge.missing])
  );

  return {
    subject: subjectMerge.output,
    html,
    text: htmlToText(`${bodyMerge.output}\n\n${sender.signature_html ?? ""}`),
    missingFields,
  };
}
