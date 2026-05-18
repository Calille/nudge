import { Copy, Mail, Pencil, Trash2 } from "lucide-react";
import { useTemplateStore } from "@/stores/templateStore";
import { useUIStore, toast } from "@/stores/uiStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";

export function TemplateList() {
  const templates = useTemplateStore((s) => s.templates);
  const reload = useTemplateStore((s) => s.load);
  const openEditor = useUIStore((s) => s.openTemplateEditor);

  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={Mail}
          title="No templates yet"
          description="Create your first email template. Use merge fields like {{client_name}} and {{staff_list}} to personalise sends."
          action={
            <Button variant="primary" onClick={() => openEditor("new")}>
              New template
            </Button>
          }
        />
      </div>
    );
  }

  const duplicate = async (id: number) => {
    try {
      await window.api.templates.duplicate(id);
      toast({ title: "Template duplicated", tone: "success" });
      reload();
    } catch (err: any) {
      toast({ title: "Duplicate failed", description: err.message, tone: "error" });
    }
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await window.api.templates.delete(id);
      toast({ title: "Template deleted", tone: "success" });
      reload();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, tone: "error" });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto grid grid-cols-2 gap-3">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => openEditor(t.id)}
            className="text-left bg-bg-elevated border border-border rounded-lg p-4 hover:border-accent/40 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold truncate">
                    {t.name}
                  </span>
                  {t.category && <Badge>{t.category}</Badge>}
                </div>
                <div className="text-xs text-fg-muted truncate">
                  {t.subject || <span className="text-fg-subtle">No subject</span>}
                </div>
                {t.merge_fields.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.merge_fields.slice(0, 4).map((f) => (
                      <Badge tone="accent" key={f}>
                        {`{{${f}}}`}
                      </Badge>
                    ))}
                    {t.merge_fields.length > 4 && (
                      <Badge tone="muted">+{t.merge_fields.length - 4}</Badge>
                    )}
                  </div>
                )}
                <div className="mt-3 text-[11px] text-fg-subtle">
                  Updated{" "}
                  {new Date(t.updated_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditor(t.id);
                  }}
                  className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-bg-hover"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicate(t.id);
                  }}
                  className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-bg-hover"
                  title="Duplicate"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(t.id, t.name);
                  }}
                  className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-bg-hover"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
