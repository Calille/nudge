import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "@/stores/uiStore";
import type { SenderDefaults as SD } from "@/types";

export function SenderDefaults() {
  const reload = useSettingsStore((s) => s.load);
  const loaded = useSettingsStore((s) => s.defaults);
  const [form, setForm] = useState<SD>(loaded);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "Your signature (HTML, appended to every outgoing email)…",
      }),
    ],
    content: loaded.signature_html || "",
    editorProps: {
      attributes: {
        class: "focus:outline-none px-4 py-3 min-h-[140px]",
      },
    },
  });

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    setForm(loaded);
    if (editor && loaded.signature_html !== editor.getHTML()) {
      editor.commands.setContent(loaded.signature_html || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const save = async () => {
    setSaving(true);
    try {
      await window.api.settings.updateSenderDefaults({
        ...form,
        signature_html: editor?.getHTML() ?? "",
      });
      toast({ title: "Sender defaults saved", tone: "success" });
      reload();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl space-y-5">
      <div>
        <h2 className="text-base font-semibold">Sender defaults</h2>
        <p className="text-sm text-fg-muted mt-1">
          These are used as merge fields and appended to every send.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Display name"
          value={form.from_name}
          onChange={(e) => setForm({ ...form, from_name: e.target.value })}
          placeholder="Your Name"
        />
        <Input
          label="Reply-to"
          value={form.reply_to}
          onChange={(e) => setForm({ ...form, reply_to: e.target.value })}
          placeholder="replies@yourcompany.com"
          type="email"
        />
        <Input
          label="Company name"
          value={form.company_name}
          onChange={(e) =>
            setForm({ ...form, company_name: e.target.value })
          }
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="Website"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://…"
          className="col-span-2"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-fg-muted mb-1.5">
          Email signature
        </label>
        <div className="tiptap-editor border border-border rounded-md bg-bg-subtle">
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          icon={<Save size={14} />}
          onClick={save}
          loading={saving}
        >
          Save defaults
        </Button>
      </div>
    </div>
  );
}
