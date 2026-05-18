import { useEffect, useMemo, useState } from "react";
import { Briefcase, Search } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { Checkbox } from "@/components/shared/Checkbox";
import { Badge } from "@/components/shared/Badge";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "@/stores/uiStore";
import type { Staff } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  contactIds: number[];
  initialAssigned?: number[];
}

export function StaffAssignment({
  open,
  onClose,
  contactIds,
  initialAssigned = [],
}: Props) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selected, setSelected] = useState<Set<number>>(
    new Set(initialAssigned)
  );
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const s = await window.api.staff.getAll({});
        setStaff(s);
      } catch (err: any) {
        toast({ title: "Failed to load staff", description: err.message, tone: "error" });
      }
    })();
    setSelected(new Set(initialAssigned));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return staff;
    const q = search.toLowerCase();
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.role ?? "").toLowerCase().includes(q) ||
        s.specialisms.some((sp) => sp.toLowerCase().includes(q))
    );
  }, [staff, search]);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (contactIds.length === 1) {
        await window.api.staff.assignMultipleToContact(
          contactIds[0],
          Array.from(selected)
        );
      } else {
        for (const staffId of Array.from(selected)) {
          await window.api.staff.assignToContacts(staffId, contactIds);
        }
      }
      toast({ title: "Staff assigned", tone: "success" });
      onClose();
    } catch (err: any) {
      toast({ title: "Assign failed", description: err.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Assign staff to contact"
      description={`${contactIds.length} contact(s)`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            Save ({selected.size})
          </Button>
        </>
      }
    >
      <div className="mb-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search staff by name, role or specialism"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={staff.length === 0 ? "No staff yet" : "No matches"}
          description={
            staff.length === 0
              ? "Add staff in the Staff section to offer them to your clients."
              : "Try a different search term."
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="flex items-start gap-3 p-3 hover:bg-bg-hover cursor-pointer"
              onClick={() => toggle(s.id)}
            >
              <Checkbox
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-fg">{s.name}</span>
                  {!s.is_available && (
                    <Badge tone="warning">Unavailable</Badge>
                  )}
                </div>
                <div className="text-xs text-fg-muted">
                  {[s.role, s.availability].filter(Boolean).join(" • ")}
                </div>
                {s.specialisms.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.specialisms.map((sp) => (
                      <Badge key={sp}>{sp}</Badge>
                    ))}
                  </div>
                )}
                {s.bio && (
                  <div className="text-xs text-fg-muted mt-1 line-clamp-2">
                    {s.bio}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

void Search;
