import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { TemplateList } from "./TemplateList";
import { TemplateEditorModal } from "./TemplateEditor";
import { useUIStore } from "@/stores/uiStore";
import { useTemplateStore } from "@/stores/templateStore";

export function TemplatesView() {
  const openEditor = useUIStore((s) => s.openTemplateEditor);
  const editingId = useUIStore((s) => s.editingTemplateId);
  const closeEditor = useUIStore((s) => s.closeTemplateEditor);
  const load = useTemplateStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 shrink-0 border-b border-border px-6 flex items-center">
        <div className="ml-auto">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => openEditor("new")}
          >
            New template
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <TemplateList />
      </div>
      <TemplateEditorModal
        open={editingId !== null}
        onClose={closeEditor}
        templateId={editingId}
      />
    </div>
  );
}
