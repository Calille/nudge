import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { Input, Textarea } from "@/components/shared/Input";
import { TagInput } from "@/components/shared/TagInput";
import { AreaSelect } from "@/components/shared/AreaSelect";
import { ClientTypePicker } from "@/components/shared/ClientTypePicker";
import { useContactStore } from "@/stores/contactStore";
import { toast } from "@/stores/uiStore";
import type { UKCounty } from "@/lib/uk-counties";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ContactCreateModal({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [clientName, setClientName] = useState("");
  const [area, setArea] = useState<UKCounty | null>(null);
  const [clientTypeIds, setClientTypeIds] = useState<number[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const loadList = useContactStore((s) => s.load);
  const loadClients = useContactStore((s) => s.loadClients);
  const allTags = useContactStore((s) => s.allTags);
  const clients = useContactStore((s) => s.clients);

  const reset = () => {
    setName("");
    setEmail("");
    setRole("");
    setPhone("");
    setNotes("");
    setClientName("");
    setArea(null);
    setClientTypeIds([]);
    setTags([]);
  };

  const save = async () => {
    if (!name.trim() || !email.trim()) {
      toast({ title: "Name and email are required", tone: "warning" });
      return;
    }
    setSaving(true);
    try {
      let clientId: number | null = null;
      if (clientName.trim()) {
        const match = clients.find(
          (c) => c.name.toLowerCase() === clientName.trim().toLowerCase()
        );
        if (match) {
          clientId = match.id;
        } else {
          // Using the contacts create endpoint which will link null client; easiest
          // path to create a client is via import. For the MVP, we simply link to
          // existing clients only.
        }
      }
      const created = await window.api.contacts.create({
        client_id: clientId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        area,
        tags,
        is_active: 1,
      });
      if (clientTypeIds.length > 0) {
        await window.api.contacts.setClientTypes(created.id, clientTypeIds);
      }
      toast({ title: "Contact created", tone: "success" });
      reset();
      onClose();
      loadList();
      loadClients();
    } catch (err: any) {
      toast({ title: "Create failed", description: err.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New contact"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-muted mb-1.5">
            Client
          </label>
          <input
            list="client-names"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full h-9 px-3 bg-bg-subtle border border-border rounded-md text-sm text-fg focus:outline-none focus:border-accent/60"
            placeholder="Type or pick an existing client"
          />
          <datalist id="client-names">
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>
        <AreaSelect value={area} onChange={setArea} />
        <ClientTypePicker
          label="Client types"
          selectedIds={clientTypeIds}
          onChange={setClientTypeIds}
        />
        <div>
          <label className="block text-xs font-medium text-fg-muted mb-1.5">
            Tags
          </label>
          <TagInput value={tags} onChange={setTags} suggestions={allTags} />
        </div>
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
