import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Monitor, Save, Send, Smartphone, Trash2 } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { Input, Select } from "@/components/shared/Input";
import { Badge } from "@/components/shared/Badge";
import { EditorToolbar } from "./EditorToolbar";
import { MergeFieldPicker } from "./MergeFieldPicker";
import { useTemplateStore } from "@/stores/templateStore";
import { useContactStore } from "@/stores/contactStore";
import { toast } from "@/stores/uiStore";
import type { Template } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  templateId: number | "new" | null;
}

const CATEGORIES = [
  "Introduction",
  "Follow-up",
  "Staff Available",
  "Seasonal",
  "Custom",
];

export function TemplateEditorModal({ open, onClose, templateId }: Props) {
  const reload = useTemplateStore((s) => s.load);
  const contacts = useContactStore((s) => s.rows);

  const [template, setTemplate] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Introduction");
  const [previewContactId, setPreviewContactId] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop"
  );
  const [saving, setSaving] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: "Write your email body — use merge fields like {{contact_name}} for personalisation.",
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "min-h-[360px] focus:outline-none px-5 py-4",
      },
    },
  });

  // Load when opened
  useEffect(() => {
    if (!open) return;
    (async () => {
      if (templateId === "new" || templateId === null) {
        setTemplate(null);
        setName("");
        setSubject("Quick introduction — {{sender_name}} from {{company_name}}");
        setCategory("Introduction");
        editor?.commands.setContent(
          `<p>Hi {{contact_first_name}},</p><p>I hope this finds you well. My name is {{sender_name}} from {{company_name}}, and I wanted to reach out about the team we have available for {{client_name}} this term.</p><p>{{staff_list}}</p><p>Would a quick call this week work to discuss?</p><p>Best regards,<br/>{{sender_name}}</p>`
        );
      } else {
        try {
          const t = await window.api.templates.getById(templateId);
          setTemplate(t);
          setName(t.name);
          setSubject(t.subject);
          setCategory(t.category ?? "Custom");
          editor?.commands.setContent(t.body_mjml || "");
        } catch (err: any) {
          toast({
            title: "Failed to load template",
            description: err.message,
            tone: "error",
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templateId, editor]);

  const currentHtml = useMemo(() => editor?.getHTML() ?? "", [editor?.getHTML()]);

  // Update preview when template or contact changes
  useEffect(() => {
    if (!open) return;
    const handler = setTimeout(async () => {
      try {
        // Save a temporary to preview. Use a lightweight preview by calling the
        // IPC preview after we create/update? To avoid persisting, we do a
        // local merge: ask backend by first compiling via templates.update once
        // we have an id. For new/unsaved edits we do a naive client-side merge:
        const html = editor?.getHTML() ?? "";
        const clientSubject = subject;
        const contact = previewContactId
          ? await window.api.contacts.getById(previewContactId)
          : null;

        const merged = localMerge(clientSubject, html, contact);
        setPreviewSubject(merged.subject);
        setPreviewHtml(merged.html);
        setMissingFields(merged.missing);
      } catch (err) {
        console.warn(err);
      }
    }, 250);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, currentHtml, previewContactId, open]);

  const save = async () => {
    if (!editor) return;
    if (!name.trim()) {
      toast({ title: "Give your template a name", tone: "warning" });
      return;
    }
    if (!subject.trim()) {
      toast({ title: "Subject is required", tone: "warning" });
      return;
    }
    setSaving(true);
    try {
      const body = editor.getHTML();
      if (template) {
        await window.api.templates.update(template.id, {
          name,
          subject,
          body_mjml: body,
          category,
        });
        toast({ title: "Template saved", tone: "success" });
      } else {
        await window.api.templates.create({
          name,
          subject,
          body_mjml: body,
          category,
        });
        toast({ title: "Template created", tone: "success" });
      }
      reload();
      onClose();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!template) return;
    if (!confirm(`Delete template "${template.name}"?`)) return;
    try {
      await window.api.templates.delete(template.id);
      toast({ title: "Template deleted", tone: "success" });
      reload();
      onClose();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, tone: "error" });
    }
  };

  const insertSubjectMerge = (token: string) => {
    const el = subjectInputRef.current;
    if (!el) return setSubject((s) => s + token);
    const start = el.selectionStart ?? subject.length;
    const end = el.selectionEnd ?? subject.length;
    const next = subject.slice(0, start) + token + subject.slice(end);
    setSubject(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      className="h-[90vh] !max-w-[96vw]"
      title={template ? "Edit template" : "New template"}
      footer={
        <>
          {template && (
            <Button
              variant="ghost"
              onClick={remove}
              icon={<Trash2 size={14} />}
            >
              Delete
            </Button>
          )}
          <Button
            variant="secondary"
            icon={<Send size={14} />}
            onClick={() => setTestEmailOpen(true)}
            disabled={!template}
          >
            Send test
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            icon={<Save size={14} />}
            onClick={save}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-0 h-full -m-5 -mb-0">
        <div className="border-r border-border flex flex-col min-h-0">
          <div className="p-4 space-y-3 border-b border-border">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Template name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Autumn staff introduction"
              />
              <Select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5 flex items-center justify-between">
                <span>Subject</span>
                <MergeFieldPicker onInsert={insertSubjectMerge} />
              </label>
              <input
                ref={subjectInputRef}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line (use merge fields)"
                className="w-full h-9 px-3 bg-bg-subtle border border-border rounded-md text-sm focus:outline-none focus:border-accent/60"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto tiptap-editor flex flex-col">
            <EditorToolbar editor={editor} />
            <EditorContent editor={editor} className="flex-1" />
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          <div className="p-3 border-b border-border flex items-center gap-3">
            <span className="text-xs font-medium text-fg-muted">Preview as</span>
            <select
              value={previewContactId ?? ""}
              onChange={(e) =>
                setPreviewContactId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="h-8 px-2 bg-bg-subtle border border-border rounded text-xs flex-1 min-w-0"
            >
              <option value="">Generic sample data</option>
              {contacts.slice(0, 50).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.email}
                </option>
              ))}
            </select>
            <div className="flex p-0.5 bg-bg-subtle border border-border rounded">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={
                  "h-6 w-7 flex items-center justify-center rounded " +
                  (previewMode === "desktop"
                    ? "bg-bg-elevated text-fg"
                    : "text-fg-muted")
                }
              >
                <Monitor size={12} />
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={
                  "h-6 w-7 flex items-center justify-center rounded " +
                  (previewMode === "mobile"
                    ? "bg-bg-elevated text-fg"
                    : "text-fg-muted")
                }
              >
                <Smartphone size={12} />
              </button>
            </div>
          </div>

          {missingFields.length > 0 && (
            <div className="px-4 py-2 border-b border-warning/30 bg-warning/5 text-xs text-[#FCD34D] flex items-center gap-2">
              <span className="font-medium">Missing data:</span>
              {missingFields.map((f) => (
                <Badge tone="warning" key={f}>
                  {`{{${f}}}`}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-[#F5F5F7] flex justify-center p-6">
            <div
              className="transition-all duration-200 bg-white rounded-md shadow-panel overflow-hidden"
              style={{ width: previewMode === "mobile" ? 360 : "100%", maxWidth: 640 }}
            >
              <div className="px-4 py-2.5 border-b border-[#E5E7EB] text-[12px] text-[#374151] bg-[#FAFAFA]">
                <div>
                  <strong>Subject:</strong> {previewSubject || <em>(empty)</em>}
                </div>
              </div>
              <iframe
                title="email-preview"
                srcDoc={previewHtml}
                className="w-full min-h-[500px] email-preview-frame"
              />
            </div>
          </div>
        </div>
      </div>

      <SendTestModal
        open={testEmailOpen}
        onClose={() => setTestEmailOpen(false)}
        templateId={template?.id ?? null}
        previewContactId={previewContactId}
      />
    </Modal>
  );
}

function SendTestModal({
  open,
  onClose,
  templateId,
  previewContactId,
}: {
  open: boolean;
  onClose: () => void;
  templateId: number | null;
  previewContactId: number | null;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!templateId || !email.trim()) return;
    setSending(true);
    try {
      await window.api.templates.sendTest(
        templateId,
        email.trim(),
        previewContactId
      );
      toast({ title: "Test email sent", tone: "success" });
      onClose();
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, tone: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Send test email"
      description="A live send via your connected email account"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={send} loading={sending}>
            Send
          </Button>
        </>
      }
    >
      <Input
        label="Send to"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      {templateId === null && (
        <div className="mt-3 text-xs text-warning">
          Save the template first before sending a test.
        </div>
      )}
    </Modal>
  );
}

// Lightweight client-side merge for live preview while editing.
// The authoritative merge happens in the main process at send time.
function localMerge(
  subject: string,
  html: string,
  contact: Awaited<ReturnType<typeof window.api.contacts.getById>> | null
): { subject: string; html: string; missing: string[] } {
  const MERGE = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  const missing = new Set<string>();
  const now = new Date();

  const context: Record<string, string> = {
    client_name: contact?.client?.name ?? "Sample Academy",
    contact_name: contact?.name ?? "Alex Morgan",
    contact_first_name: (contact?.name ?? "Alex").split(/\s+/)[0],
    contact_role: contact?.role ?? "Head of HR",
    staff_list: staffListHtml(contact?.staff ?? sampleStaff()),
    staff_count: String((contact?.staff ?? sampleStaff()).length),
    sender_name: "Your Name",
    sender_email: "you@example.com",
    sender_phone: "+44 20 0000 0000",
    company_name: "Your Company",
    current_date: now.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    unsubscribe_link: "mailto:?subject=Unsubscribe",
  };

  const sub = subject.replace(MERGE, (_, k) => {
    if (k in context && context[k] !== "") return context[k];
    missing.add(k);
    return "";
  });
  const body = html.replace(MERGE, (_, k) => {
    if (k in context && context[k] !== "") return context[k];
    missing.add(k);
    return "";
  });

  const wrapped = `<!doctype html><html><body style="margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;background:#f5f5f7;color:#1f2937;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:6px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">${body}</div></body></html>`;

  return { subject: sub, html: wrapped, missing: Array.from(missing) };
}

function sampleStaff() {
  return [
    {
      id: 1,
      name: "Jane Smith",
      role: "Supply Teacher",
      specialisms: ["KS2", "Maths"],
      availability: "Available Mon–Fri",
      bio: "Experienced teacher with a passion for mastery maths.",
      is_available: 1,
      created_at: "",
    },
    {
      id: 2,
      name: "Tom Brown",
      role: "Cover Supervisor",
      specialisms: ["SEN"],
      availability: "Immediate start",
      bio: "",
      is_available: 1,
      created_at: "",
    },
  ];
}

function staffListHtml(staff: { name: string; role: string | null; specialisms: string[]; availability: string | null; bio: string | null }[]) {
  if (!staff.length) return "";
  const items = staff
    .map((s) => {
      const bits: string[] = [];
      if (s.role) bits.push(s.role);
      if (s.specialisms?.length) bits.push(`(${s.specialisms.join(", ")})`);
      const detail = bits.length ? ` — ${bits.join(" ")}` : "";
      const avail = s.availability ? ` — ${s.availability}` : "";
      return `<li style="margin:6px 0;"><strong>${escapeHtml(s.name)}</strong>${escapeHtml(detail)}${escapeHtml(avail)}</li>`;
    })
    .join("");
  return `<ul style="padding-left:20px;margin:12px 0;">${items}</ul>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
