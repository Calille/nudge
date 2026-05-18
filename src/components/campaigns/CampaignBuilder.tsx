import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  Users,
} from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { SearchInput } from "@/components/shared/SearchInput";
import { Checkbox } from "@/components/shared/Checkbox";
import { Badge } from "@/components/shared/Badge";
import { Input } from "@/components/shared/Input";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTemplateStore } from "@/stores/templateStore";
import { useCampaignStore } from "@/stores/campaignStore";
import { toast } from "@/stores/uiStore";
import type {
  CampaignFilters,
  CampaignSchedule,
  Contact,
  RecipientSummary,
  Template,
} from "@/types";
import { cn } from "@/lib/cn";
import { RecipientFilterBar } from "./RecipientFilterBar";
import { ScheduleForm, type ScheduleMode } from "./ScheduleForm";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CampaignBuilder({ open, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [filters, setFilters] = useState<CampaignFilters>({
    clientTypeIds: [],
    areas: [],
  });
  const [matching, setMatching] = useState<RecipientSummary[]>([]);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("now");
  const [schedule, setSchedule] = useState<CampaignSchedule | null>(null);
  const templates = useTemplateStore((s) => s.templates);
  const reloadCampaigns = useCampaignStore((s) => s.load);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelected(new Set());
      setTemplateId(null);
      setName("");
      setSearch("");
      setFilters({ clientTypeIds: [], areas: [] });
      setMatching([]);
      setScheduleMode("now");
      setSchedule(null);
      return;
    }
    (async () => {
      const res = await window.api.contacts.getAll({ pageSize: 500 });
      setContacts(res.rows);
    })();
  }, [open]);

  // Resolve filter spec to a recipient set whenever filters change.
  useEffect(() => {
    if (!open) return;
    if (filters.clientTypeIds.length === 0 && filters.areas.length === 0) {
      setMatching([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await window.api.campaigns.resolveRecipients(filters);
        if (!cancelled) setMatching(rows);
      } catch (err) {
        console.error("[campaign] resolveRecipients failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters, open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return visibleContacts;
    const q = search.toLowerCase();
    return visibleContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.client_name ?? "").toLowerCase().includes(q)
    );
  }, [visibleContacts, search]);

  const toggleContact = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const template = templates.find((t) => t.id === templateId) ?? null;

  const hasFilters =
    filters.clientTypeIds.length > 0 || filters.areas.length > 0;

  const startSend = async (mode: "submit" | "draft") => {
    if (!templateId || selected.size === 0) return;
    setSending(true);
    try {
      const campaign = await window.api.campaigns.create({
        name: name.trim() || defaultName(template),
        template_id: templateId,
        contact_ids: Array.from(selected),
      });
      // Persist filters alongside the campaign so the editor and the
      // scheduler can re-resolve them later (recurring campaigns).
      if (hasFilters) {
        await window.api.campaigns.setFilters(campaign.id, filters);
      }

      if (mode === "draft") {
        toast({ title: "Draft saved", tone: "success" });
      } else if (scheduleMode === "now") {
        await window.api.campaigns.send(campaign.id);
        toast({ title: "Campaign started", tone: "success" });
      } else if (schedule) {
        const { next_run_at } = await window.api.campaigns.schedule(
          campaign.id,
          schedule
        );
        toast({
          title: "Campaign scheduled",
          description: next_run_at
            ? `Next run: ${new Date(next_run_at).toLocaleString()}`
            : undefined,
          tone: "success",
        });
      }
      reloadCampaigns();
      onClose();
    } catch (err: any) {
      toast({
        title: "Create failed",
        description: err.message,
        tone: "error",
      });
    } finally {
      setSending(false);
    }
  };

  // Visible contact set is either the filter-resolved list or all contacts.
  const visibleContacts = hasFilters
    ? matching.map<Contact>((m) => ({
        id: m.id,
        client_id: null,
        client_name: m.client_name ?? undefined,
        name: m.name,
        email: m.email,
        role: null,
        phone: null,
        notes: null,
        area: m.area,
        tags: [],
        is_active: 1,
        created_at: "",
        updated_at: "",
      }))
    : contacts;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      className="h-[85vh] !max-w-[92vw]"
      title="New campaign"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              icon={<ChevronLeft size={14} />}
            >
              Back
            </Button>
          )}
          {step < 3 && (
            <Button
              variant="primary"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={
                (step === 1 && selected.size === 0) ||
                (step === 2 && !templateId)
              }
            >
              Next <ChevronRight size={14} />
            </Button>
          )}
          {step === 3 && (
            <>
              <Button
                variant="secondary"
                onClick={() => startSend("draft")}
                loading={sending}
              >
                Save draft
              </Button>
              <Button
                variant="primary"
                onClick={() => startSend("submit")}
                loading={sending}
                icon={<Send size={14} />}
              >
                {scheduleMode === "now"
                  ? `Send now (${selected.size})`
                  : scheduleMode === "one_off"
                    ? "Schedule send"
                    : "Schedule recurring"}
              </Button>
            </>
          )}
        </>
      }
    >
      <BuilderStepper step={step} />

      {step === 1 && (
        <div className="mt-5 flex flex-col gap-3 h-[60vh]">
          <RecipientFilterBar
            value={filters}
            onChange={setFilters}
            matchCount={hasFilters ? matching.length : undefined}
          />
          <div className="flex items-center gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search contacts…"
              className="w-96"
            />
            <div className="ml-auto text-xs text-fg-muted">
              {selected.size} of {filtered.length} selected
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (selected.size === filtered.length) setSelected(new Set());
                else setSelected(new Set(filtered.map((c) => c.id)));
              }}
            >
              {selected.size === filtered.length ? "Deselect all" : "Select all"}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto border border-border rounded-lg">
            {filtered.length === 0 ? (
              <EmptyState icon={Users} title="No contacts" />
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {filtered.map((c) => {
                    const isSelected = selected.has(c.id);
                    const invalidEmail = !c.email;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => !invalidEmail && toggleContact(c.id)}
                        className={cn(
                          "border-b border-border cursor-pointer hover:bg-bg-hover",
                          isSelected && "bg-accent/5",
                          invalidEmail && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <td className="w-10 px-4 py-2">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => !invalidEmail && toggleContact(c.id)}
                            disabled={invalidEmail}
                          />
                        </td>
                        <td className="px-4 py-2 font-medium">{c.name}</td>
                        <td className="px-4 py-2 text-fg-muted font-mono text-[12px]">
                          {c.email || (
                            <span className="text-danger">No email</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-fg-muted">
                          {c.client_name ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-5 h-[60vh] overflow-y-auto">
          {templates.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No templates"
              description="Create a template first in the Templates tab."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {templates.map((t) => {
                const selected = templateId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={cn(
                      "text-left bg-bg-elevated border rounded-lg p-4 transition-colors",
                      selected
                        ? "border-accent"
                        : "border-border hover:border-accent/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {t.name}
                        </div>
                        <div className="text-xs text-fg-muted truncate">
                          {t.subject}
                        </div>
                      </div>
                      {t.category && <Badge>{t.category}</Badge>}
                    </div>
                    {t.merge_fields.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.merge_fields.slice(0, 5).map((f) => (
                          <Badge tone="accent" key={f}>
                            {`{{${f}}}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <CampaignReview
          template={template}
          contactIds={Array.from(selected)}
          name={name}
          setName={setName}
          scheduleMode={scheduleMode}
          schedule={schedule}
          onScheduleModeChange={setScheduleMode}
          onScheduleChange={setSchedule}
        />
      )}
    </Modal>
  );
}

function defaultName(t: Template | null) {
  const today = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  return `${t?.name ?? "Campaign"} — ${today}`;
}

function BuilderStepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Select recipients", "Choose template", "Review & send"];
  return (
    <div className="flex items-center gap-3 text-sm">
      {steps.map((label, idx) => {
        const s = idx + 1;
        const active = step === s;
        const done = step > s;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] border",
                done
                  ? "bg-success/20 text-success border-success/40"
                  : active
                    ? "bg-accent text-white border-accent"
                    : "bg-bg-subtle border-border text-fg-muted"
              )}
            >
              {done ? <CheckCircle2 size={10} /> : s}
            </span>
            <span className={active ? "text-fg font-medium" : "text-fg-muted"}>
              {label}
            </span>
            {s < steps.length && <span className="w-6 h-px bg-border mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

function CampaignReview({
  template,
  contactIds,
  name,
  setName,
  scheduleMode,
  schedule,
  onScheduleModeChange,
  onScheduleChange,
}: {
  template: Template | null;
  contactIds: number[];
  name: string;
  setName: (v: string) => void;
  scheduleMode: ScheduleMode;
  schedule: CampaignSchedule | null;
  onScheduleModeChange: (m: ScheduleMode) => void;
  onScheduleChange: (s: CampaignSchedule | null) => void;
}) {
  const [previews, setPreviews] = useState<
    Array<{
      id: number;
      to: string;
      name: string;
      subject: string;
      missing: string[];
    }>
  >([]);

  useEffect(() => {
    if (!template) return;
    (async () => {
      const limited = contactIds.slice(0, 20);
      const results = await Promise.all(
        limited.map(async (id) => {
          try {
            const p = await window.api.templates.preview(template.id, id);
            const c = await window.api.contacts.getById(id);
            return {
              id,
              to: c.email,
              name: c.name,
              subject: p.subject,
              missing: p.missingFields,
            };
          } catch {
            return { id, to: "", name: "", subject: "", missing: [] };
          }
        })
      );
      setPreviews(results);
    })();
  }, [template, contactIds]);

  if (!template) return null;
  return (
    <div className="mt-5 grid grid-cols-2 gap-5 h-[60vh]">
      <div>
        <Input
          label="Campaign name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultName(template)}
        />
        <div className="mt-4 border border-border rounded-lg p-4 text-sm space-y-2 bg-bg-elevated">
          <Row label="Recipients" value={`${contactIds.length}`} />
          <Row label="Template" value={template.name} />
          <Row label="Category" value={template.category ?? "—"} />
          <Row
            label="Merge fields"
            value={
              template.merge_fields.length
                ? template.merge_fields.map((f) => `{{${f}}}`).join(", ")
                : "None"
            }
          />
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
            Delivery
          </div>
          <ScheduleForm
            mode={scheduleMode}
            onModeChange={onScheduleModeChange}
            schedule={schedule}
            onScheduleChange={onScheduleChange}
          />
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
          Per-recipient preview
          {contactIds.length > 20 && (
            <span className="ml-2 text-fg-subtle normal-case">
              (showing first 20 of {contactIds.length})
            </span>
          )}
        </h3>
        <div className="flex-1 overflow-y-auto border border-border rounded-lg divide-y divide-border">
          {previews.map((p) => (
            <div key={p.id} className="p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-fg-muted font-mono truncate">
                    {p.to}
                  </div>
                </div>
                {p.missing.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] text-warning"
                    title={p.missing.map((m) => `{{${m}}}`).join(", ")}
                  >
                    <AlertTriangle size={12} />
                    {p.missing.length} missing
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-fg truncate">
                <span className="text-fg-subtle">Subject: </span>
                {p.subject || <em>(empty)</em>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-28 text-xs text-fg-muted">{label}</div>
      <div className="flex-1 text-sm text-fg truncate">{value}</div>
    </div>
  );
}
