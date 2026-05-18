import { useEffect, useMemo, useState } from "react";
import { Briefcase, Pencil, Plus, Save, Trash2, Users } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Input, Textarea } from "@/components/shared/Input";
import { Modal } from "@/components/shared/Modal";
import { SearchInput } from "@/components/shared/SearchInput";
import { TagInput } from "@/components/shared/TagInput";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Checkbox } from "@/components/shared/Checkbox";
import { toast } from "@/stores/uiStore";
import type { Staff } from "@/types";

export function StaffView() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Staff | "new" | null>(null);

  const load = async () => {
    try {
      const s = await window.api.staff.getAll({});
      setStaff(s);
    } catch (err: any) {
      toast({
        title: "Failed to load staff",
        description: err.message,
        tone: "error",
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  const remove = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    try {
      await window.api.staff.delete(id);
      toast({ title: "Staff deleted", tone: "success" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, tone: "error" });
    }
  };

  const toggleAvailability = async (s: Staff) => {
    try {
      await window.api.staff.update(s.id, {
        is_available: s.is_available ? 0 : 1,
      });
      load();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, tone: "error" });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 shrink-0 border-b border-border px-6 flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search staff…"
          className="w-80"
        />
        <div className="ml-auto">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setEditing("new")}
          >
            Add staff
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={staff.length === 0 ? "No staff yet" : "No matches"}
            description={
              staff.length === 0
                ? "Add staff (or products) that you want to offer to clients in your emails."
                : "Try a different search."
            }
            action={
              staff.length === 0 ? (
                <Button variant="primary" onClick={() => setEditing("new")}>
                  Add staff
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="max-w-5xl mx-auto grid grid-cols-2 gap-3">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="bg-bg-elevated border border-border rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
                    <Users size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {s.name}
                      </span>
                      {!s.is_available && (
                        <Badge tone="warning">Unavailable</Badge>
                      )}
                    </div>
                    <div className="text-xs text-fg-muted">
                      {[s.role, s.availability].filter(Boolean).join(" • ") ||
                        "—"}
                    </div>
                    {s.specialisms.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.specialisms.map((sp) => (
                          <Badge key={sp}>{sp}</Badge>
                        ))}
                      </div>
                    )}
                    {s.bio && (
                      <div className="mt-2 text-xs text-fg-muted line-clamp-3">
                        {s.bio}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => toggleAvailability(s)}
                      className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-bg-hover"
                      title="Toggle availability"
                    >
                      <span
                        className={
                          "block w-2 h-2 rounded-full " +
                          (s.is_available ? "bg-success" : "bg-warning")
                        }
                      />
                    </button>
                    <button
                      onClick={() => setEditing(s)}
                      className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-bg-hover"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => remove(s.id, s.name)}
                      className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-bg-hover"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StaffEditor
        open={editing !== null}
        onClose={() => {
          setEditing(null);
          load();
        }}
        initial={editing}
      />
    </div>
  );
}

function StaffEditor({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: Staff | "new" | null;
}) {
  const [form, setForm] = useState<Staff>(emptyStaff());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial && initial !== "new") {
      setForm(initial);
    } else {
      setForm(emptyStaff());
    }
  }, [open, initial]);

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", tone: "warning" });
      return;
    }
    setSaving(true);
    try {
      if (initial && initial !== "new") {
        await window.api.staff.update(form.id, form);
        toast({ title: "Staff saved", tone: "success" });
      } else {
        await window.api.staff.create({
          name: form.name,
          role: form.role ?? undefined,
          specialisms: form.specialisms,
          availability: form.availability ?? undefined,
          bio: form.bio ?? undefined,
          is_available: form.is_available,
        });
        toast({ title: "Staff added", tone: "success" });
      }
      onClose();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial === "new" || !initial ? "Add staff" : "Edit staff"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={save}
            loading={saving}
            icon={<Save size={14} />}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Role"
            value={form.role ?? ""}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="e.g. Supply Teacher"
          />
          <Input
            label="Availability"
            value={form.availability ?? ""}
            onChange={(e) =>
              setForm({ ...form, availability: e.target.value })
            }
            placeholder="e.g. Mon–Fri, Immediate start"
          />
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1.5">
              Available
            </label>
            <Checkbox
              checked={!!form.is_available}
              onChange={(e) =>
                setForm({
                  ...form,
                  is_available: (e.target as HTMLInputElement).checked ? 1 : 0,
                })
              }
              label="Show as available"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-muted mb-1.5">
            Specialisms
          </label>
          <TagInput
            value={form.specialisms}
            onChange={(v) => setForm({ ...form, specialisms: v })}
            placeholder="e.g. KS2, SEN, Maths…"
          />
        </div>
        <Textarea
          label="Short bio"
          value={form.bio ?? ""}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="A couple of sentences to describe this person's strengths, used in {{staff_list}}."
        />
      </div>
    </Modal>
  );
}

function emptyStaff(): Staff {
  return {
    id: 0,
    name: "",
    role: "",
    specialisms: [],
    availability: "",
    bio: "",
    is_available: 1,
    created_at: new Date().toISOString(),
  };
}
