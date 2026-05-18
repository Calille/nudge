import { useEffect, useState } from "react";
import { FolderKanban, LayoutList, Plus, UploadCloud } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { ContactsTable } from "./ContactsTable";
import { ClientGroupView } from "./ClientGroupView";
import { ContactDetail } from "./ContactDetail";
import { ImportDialog } from "./ImportDialog";
import { ContactCreateModal } from "./ContactCreateModal";
import { useUIStore } from "@/stores/uiStore";
import { useContactStore } from "@/stores/contactStore";
import { cn } from "@/lib/cn";

type Tab = "all" | "clients";

export function ContactsView() {
  const [tab, setTab] = useState<Tab>("all");
  const [newOpen, setNewOpen] = useState(false);
  const importOpen = useUIStore((s) => s.importWizardOpen);
  const setImportOpen = useUIStore((s) => s.setImportWizardOpen);
  const detailId = useUIStore((s) => s.contactDetailId);
  const closeDetail = useUIStore((s) => s.closeContactDetail);
  const load = useContactStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 shrink-0 border-b border-border px-6 flex items-center gap-2">
        <div className="flex p-0.5 bg-bg-subtle border border-border rounded-md">
          <button
            onClick={() => setTab("all")}
            className={cn(
              "h-7 px-3 inline-flex items-center gap-1.5 text-xs rounded transition-colors",
              tab === "all"
                ? "bg-bg-elevated text-fg shadow-ring"
                : "text-fg-muted hover:text-fg"
            )}
          >
            <LayoutList size={12} /> All contacts
          </button>
          <button
            onClick={() => setTab("clients")}
            className={cn(
              "h-7 px-3 inline-flex items-center gap-1.5 text-xs rounded transition-colors",
              tab === "clients"
                ? "bg-bg-elevated text-fg shadow-ring"
                : "text-fg-muted hover:text-fg"
            )}
          >
            <FolderKanban size={12} /> By client
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<UploadCloud size={14} />}
            onClick={() => setImportOpen(true)}
          >
            Import
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setNewOpen(true)}
          >
            New contact
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "all" ? <ContactsTable /> : <ClientGroupView />}
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ContactDetail
        open={detailId !== null}
        onClose={closeDetail}
        contactId={detailId}
      />
      <ContactCreateModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
