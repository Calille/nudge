import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getContactById,
  getTemplateById,
  listTemplates,
  updateTemplate,
} from "../database/queries";
import { registerHandler } from "./helpers";
import {
  extractMergeFields,
  htmlToText,
  renderTemplateForContact,
  wrapAndCompileHtml,
} from "../services/template-compiler";
import { getSenderDefaults } from "../services/sender-defaults";
import { requireDefaultAccount, sendEmail } from "../services/email-sender";
import type { CreateTemplate, Template } from "../../src/types";

function normaliseTemplate<T extends Partial<CreateTemplate>>(data: T): T {
  const mjml = data.body_mjml ?? "";
  const merge_fields = extractMergeFields(
    `${data.subject ?? ""} ${mjml}`
  );
  const body_text = htmlToText(mjml);
  return { ...data, merge_fields, body_text };
}

export function registerTemplateHandlers() {
  registerHandler("templates:list", async () => listTemplates());
  registerHandler("templates:get", async (_e, id: number) =>
    getTemplateById(id)
  );

  registerHandler("templates:create", async (_e, data: CreateTemplate) => {
    const normalised = normaliseTemplate(data);
    const compiled = wrapAndCompileHtml(normalised.body_mjml ?? "");
    return createTemplate({
      ...normalised,
      body_html: compiled.html,
    } as CreateTemplate);
  });

  registerHandler(
    "templates:update",
    async (_e, id: number, data: Partial<Template>) => {
      const normalised = normaliseTemplate(data as any);
      const compiled = wrapAndCompileHtml(normalised.body_mjml ?? "");
      return updateTemplate(id, {
        ...normalised,
        body_html: compiled.html,
      });
    }
  );

  registerHandler("templates:delete", async (_e, id: number) =>
    deleteTemplate(id)
  );
  registerHandler("templates:duplicate", async (_e, id: number) =>
    duplicateTemplate(id)
  );

  registerHandler(
    "templates:preview",
    async (_e, templateId: number, contactId: number | null) => {
      const template = getTemplateById(templateId);
      const sender = await getSenderDefaults();
      const contact = contactId ? getContactById(contactId) : null;
      const account = (() => {
        try {
          return requireDefaultAccount();
        } catch {
          return { email: "me@example.com" } as any;
        }
      })();
      const rendered = renderTemplateForContact(
        template,
        contact,
        sender,
        account.email
      );
      return rendered;
    }
  );

  registerHandler(
    "templates:send-test",
    async (
      _e,
      templateId: number,
      toEmail: string,
      contactId: number | null
    ) => {
      const template = getTemplateById(templateId);
      const sender = await getSenderDefaults();
      const contact = contactId ? getContactById(contactId) : null;
      const account = requireDefaultAccount();
      const rendered = renderTemplateForContact(
        template,
        contact,
        sender,
        account.email
      );
      const res = await sendEmail(
        {
          to: { email: toEmail },
          subject: `[TEST] ${rendered.subject}`,
          html: rendered.html,
          text: rendered.text,
          replyTo: sender.reply_to || undefined,
        },
        { fromName: sender.from_name || undefined }
      );
      if (!res.success) throw new Error(res.error ?? "Send failed");
      return { success: true };
    }
  );
}
