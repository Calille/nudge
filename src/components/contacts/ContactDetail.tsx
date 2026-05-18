import { useEffect, useState } from "react";
import { Mail, Phone, Briefcase, Building2, Trash2, Save } from "lucide-react";
import { SlideOver } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { Input, Textarea } from "@/components/shared/Input";
import { Badge } from "@/components/shared/Badge";
import { TagInput } from "@/components/shared/TagInput";
import { StaffAssignment } from "./StaffAssignment";
import { useContactStore } from "@/stores/contactStore";
import { toast } from "@/stores/uiStore";
import type { ContactWithRelations } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  contactId: number | null;
}

export function ContactDetail({ open, onClose, contactId }: Props) {
  const [contact, setContact] = useState<ContactWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const allTags = useContactStore((s) => s.allTags);
  const loadTags = useContactStore((s) => s.loadTags);
  const reloadList = useContactStore((s) => s.load);

  const load = async () => {
    if (contactId === null) return;
    setLoading(true);
    try {
      const c = await window.api.contacts.getById(contactId);
      setContact(c);
    } catch (err: any) {
      toast({ title: "Failed to load contact", description: err.message, tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && contactId !== null) {
      load();
    } else {
      setContact(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contactId]);

  const save = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      await window.api.contacts.update(contact.id, {
        name: contact.name,
        email: contact.email,
        role: contact.role,
        phone: contact.phone,
        notes: contact.notes,
        tags: contact.tags,
        is_active: contact.is_active,
      });
      toast({ title: "Contact saved", tone: "success" });
      reloadList();
      loadTags();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!contact) return;
    if (!confirm(`Delete ${contact.name}? This can't be undone.`)) return;
    try {
      await window.api.contacts.delete([contact.id]);
      toast({ title: "Contact deleted", tone: "success" });
      reloadList();
      onClose();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, tone: "error" });
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={contact?.name ?? "Contact"}
      width={560}
      footer={
        contact && (
          <>
            <Button variant="ghost" onClick={remove} icon={<Trash2 size={14} />}>
              Delete
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
        )
      }
    >
      {loading || !contact ? (
        <div className="p-6 text-sm text-fg-muted">Loading…</div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Name"
              value={contact.name}
              onChange={(e) =>
                setContact({ ...contact, name: e.target.value })
              }
              leftIcon={<Briefcase size={12} />}
            />
            <Input
              label="Email"
              type="email"
              value={contact.email}
              onChange={(e) =>
                setContact({ ...contact, email: e.target.value })
              }
              leftIcon={<Mail size={12} />}
            />
            <Input
              label="Role"
              value={contact.role ?? ""}
              onChange={(e) =>
                setContact({ ...contact, role: e.target.value })
              }
            />
            <Input
              label="Phone"
              value={contact.phone ?? ""}
              onChange={(e) =>
                setContact({ ...contact, phone: e.target.value })
              }
              leftIcon={<Phone size={12} />}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1.5">
              Client
            </label>
            <div className="flex items-center gap-2 h-9 px-3 bg-bg-subtle border border-border rounded-md text-sm text-fg">
              <Building2 size={12} className="text-fg-subtle" />
              <span className="truncate">
                {contact.client?.name ?? "No client assigned"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1.5">
              Tags
            </label>
            <TagInput
              value={contact.tags}
              onChange={(tags) => setContact({ ...contact, tags })}
              suggestions={allTags}
            />
          </div>

          <Textarea
            label="Notes"
            value={contact.notes ?? ""}
            onChange={(e) =>
              setContact({ ...contact, notes: e.target.value })
            }
            placeholder="Private notes about this contact…"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-fg-muted">
                Assigned staff
              </label>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStaffModalOpen(true)}
              >
                Manage
              </Button>
            </div>
            {contact.staff.length === 0 ? (
              <div className="text-xs text-fg-muted">
                No staff assigned. Assign staff to populate{" "}
                <code className="text-accent">{"{{staff_list}}"}</code> in
                emails to this contact.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {contact.staff.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start gap-2 p-2.5 rounded border border-border bg-bg-subtle"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-fg">
                        {s.name}
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {contact.last_emailed_at && (
            <div className="text-xs text-fg-muted">
              Last emailed {new Date(contact.last_emailed_at).toLocaleString()}
            </div>
          )}

          <StaffAssignment
            open={staffModalOpen}
            onClose={() => {
              setStaffModalOpen(false);
              load();
            }}
            contactIds={[contact.id]}
            initialAssigned={contact.staff.map((s) => s.id)}
          />
        </div>
      )}
    </SlideOver>
  );
}
