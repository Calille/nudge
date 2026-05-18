import { useEffect, useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/shared/Input";
import { Modal } from "@/components/shared/Modal";
import { useClientTypeStore } from "@/stores/clientTypeStore";
import { toast } from "@/stores/uiStore";
import type { ClientTypeWithUsage, CreateClientType } from "@/types";

const SWATCHES = [
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#A855F7",
  "#EC4899",
  "#14B8A6",
  "#64748B",
] as const;

export function ClientTypesManager() {
  const items = useClientTypeStore((s) => s.items);
  const load = useClientTypeStore((s) => s.load);
  const [editing, setEditing] = useState<ClientTypeWithUsage | "new" | null>(
    null
  );
  const [confirmDelete, setConfirmDelete] =
    useState<ClientTypeWithUsage | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Client types</h2>
          <p className="text-sm text-fg-muted mt-1">
            Categorise contacts (e.g. School, Charity, Letting Agent). Assign as
            many as apply per contact, then filter campaign recipients by type.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={14} />}
          onClick={() => setEditing("new")}
        >
          New client type
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No client types yet"
          description="Add a type to start grouping your contacts."
        />
      ) : (
        <ul className="border border-border rounded-lg divide-y divide-border bg-bg-elevated">
          {items.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover"
            >
              <span
                className="inline-block w-3 h-3 rounded-full border border-border-strong"
                style={{ backgroundColor: t.colour ?? "transparent" }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-xs text-fg-muted">
                  {t.contact_count}{" "}
                  {t.contact_count === 1 ? "contact" : "contacts"}
                </div>
              </div>
              <button
                onClick={() => setEditing(t)}
                className="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-bg-subtle"
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setConfirmDelete(t)}
                className="p-1.5 rounded-md text-fg-muted hover:text-danger hover:bg-bg-subtle"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <EditorModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
        }}
      />

      <DeleteModal
        target={confirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function EditorModal({
  target,
  onClose,
  onSaved,
}: {
  target: ClientTypeWithUsage | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const create = useClientTypeStore((s) => s.create);
  const update = useClientTypeStore((s) => s.update);
  const [name, setName] = useState("");
  const [colour, setColour] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target === "new") {
      setName("");
      setColour(SWATCHES[0]);
    } else if (target) {
      setName(target.name);
      setColour(target.colour);
    }
  }, [target]);

  const open = target !== null;
  const isNew = target === "new";

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Name is required", tone: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload: CreateClientType = { name: trimmed, colour };
      if (isNew) await create(payload);
      else if (target) await update(target.id, payload);
      onSaved();
    } catch (err) {
      toast({
        title: "Could not save client type",
        description: err instanceof Error ? err.message : String(err),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "New client type" : "Edit client type"}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. School, Charity"
          autoFocus
        />
        <div>
          <div className="text-xs font-medium text-fg-muted mb-1.5">
            Colour
          </div>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColour(c)}
                className="w-7 h-7 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: c,
                  borderColor: colour === c ? "#fff" : "transparent",
                  transform: colour === c ? "scale(1.08)" : "scale(1)",
                }}
                aria-label={`Use ${c}`}
              />
            ))}
            <button
              type="button"
              onClick={() => setColour(null)}
              className="w-7 h-7 rounded-full border border-border text-xs text-fg-muted hover:bg-bg-hover"
              style={{
                outline: colour === null ? "2px solid #fff" : undefined,
              }}
              aria-label="No colour"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DeleteModal({
  target,
  onClose,
}: {
  target: ClientTypeWithUsage | null;
  onClose: () => void;
}) {
  const remove = useClientTypeStore((s) => s.remove);
  const affectedCount = useClientTypeStore((s) => s.affectedCount);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) {
      setCount(null);
      return;
    }
    affectedCount(target.id).then(setCount).catch(() => setCount(null));
  }, [target, affectedCount]);

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const res = await remove(target.id);
      toast({
        title: `Deleted "${target.name}"`,
        description:
          res.affected_contacts > 0
            ? `Removed from ${res.affected_contacts} contact${res.affected_contacts === 1 ? "" : "s"}.`
            : undefined,
        tone: "success",
      });
      onClose();
    } catch (err) {
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : String(err),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title="Delete client type?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={busy}>
            Delete
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">
        This will remove <strong className="text-fg">{target?.name}</strong>
        {count !== null && count > 0 ? (
          <>
            {" "}
            from {count} contact{count === 1 ? "" : "s"}. The contacts
            themselves will not be deleted.
          </>
        ) : (
          <>. No contacts currently use this type.</>
        )}
      </p>
    </Modal>
  );
}
