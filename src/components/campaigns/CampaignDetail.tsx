import { useEffect, useState } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { Modal, SlideOver } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { useCampaignStore } from "@/stores/campaignStore";
import { toast } from "@/stores/uiStore";
import type { CampaignWithEmails } from "@/types";
import { CampaignPreview } from "./CampaignPreview";

interface Props {
  open: boolean;
  onClose: () => void;
  campaignId: number | null;
}

export function CampaignDetail({ open, onClose, campaignId }: Props) {
  const [campaign, setCampaign] = useState<CampaignWithEmails | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const reloadList = useCampaignStore((s) => s.load);

  const load = async () => {
    if (!campaignId) return;
    try {
      const c = await window.api.campaigns.getById(campaignId);
      setCampaign(c);
    } catch (err: any) {
      toast({
        title: "Failed to load campaign",
        description: err.message,
        tone: "error",
      });
    }
  };

  useEffect(() => {
    if (open && campaignId) {
      load();
    } else {
      setCampaign(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId]);

  useEffect(() => {
    if (!open || !campaignId) return;
    const unsub = window.api.campaigns.onProgress((progress) => {
      if (progress.campaign_id === campaignId) load();
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId]);

  const retry = async () => {
    if (!campaign) return;
    setBusy(true);
    try {
      await window.api.campaigns.retryFailed(campaign.id);
      toast({ title: "Retry started", tone: "success" });
      reloadList();
      load();
    } catch (err: any) {
      toast({ title: "Retry failed", description: err.message, tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const sendNow = async () => {
    if (!campaign) return;
    setBusy(true);
    try {
      await window.api.campaigns.send(campaign.id);
      toast({ title: "Send started", tone: "success" });
      reloadList();
      load();
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const failedCount =
    campaign?.emails.filter((e) => e.status === "failed").length ?? 0;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={campaign?.name ?? "Campaign"}
      width={640}
      footer={
        campaign && (
          <>
            <Button
              variant="ghost"
              onClick={() => setPreviewOpen(true)}
              icon={<Eye size={14} />}
            >
              Preview
            </Button>
            {campaign.status === "draft" && (
              <Button
                variant="primary"
                onClick={sendNow}
                loading={busy}
              >
                Send now
              </Button>
            )}
            {failedCount > 0 && (
              <Button
                variant="secondary"
                onClick={retry}
                loading={busy}
                icon={<RefreshCw size={14} />}
              >
                Retry {failedCount} failed
              </Button>
            )}
          </>
        )
      }
    >
      {!campaign ? (
        <div className="p-6 text-sm text-fg-muted">Loading…</div>
      ) : (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Recipients" value={campaign.total_recipients} />
            <Stat label="Sent" value={campaign.sent_count} tone="success" />
            <Stat label="Failed" value={campaign.failed_count} tone="danger" />
          </div>

          <div className="border border-border rounded-lg p-4 text-sm space-y-2 bg-bg-elevated">
            <Row label="Template" value={campaign.template_name ?? "—"} />
            <Row label="Status" value={campaign.status} />
            <Row
              label="Created"
              value={new Date(campaign.created_at).toLocaleString()}
            />
            {campaign.started_at && (
              <Row
                label="Started"
                value={new Date(campaign.started_at).toLocaleString()}
              />
            )}
            {campaign.completed_at && (
              <Row
                label="Completed"
                value={new Date(campaign.completed_at).toLocaleString()}
              />
            )}
            {campaign.schedule_type && (
              <Row
                label="Schedule"
                value={describeSchedule(campaign)}
              />
            )}
            {campaign.next_run_at && (
              <Row
                label="Next run"
                value={new Date(campaign.next_run_at).toLocaleString()}
              />
            )}
            {campaign.last_run_at && (
              <Row
                label="Last run"
                value={new Date(campaign.last_run_at).toLocaleString()}
              />
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
              Emails
            </h3>
            <ul className="border border-border rounded-lg divide-y divide-border max-h-[400px] overflow-y-auto">
              {campaign.emails.map((e) => (
                <li key={e.id} className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{e.to_name}</div>
                      <div className="text-xs text-fg-muted font-mono truncate">
                        {e.to_email}
                      </div>
                      {e.subject && (
                        <div className="text-xs text-fg mt-1 truncate">
                          {e.subject}
                        </div>
                      )}
                      {e.error_message && (
                        <div className="text-xs text-danger mt-1">
                          {e.error_message}
                        </div>
                      )}
                    </div>
                    <Badge
                      tone={
                        e.status === "sent"
                          ? "success"
                          : e.status === "failed"
                            ? "danger"
                            : e.status === "skipped"
                              ? "warning"
                              : "muted"
                      }
                    >
                      {e.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {campaignId !== null && (
        <Modal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title="Preview"
          size="xl"
          className="h-[80vh]"
        >
          <div className="-mx-5 -my-4 h-full">
            <CampaignPreview campaignId={campaignId} />
          </div>
        </Modal>
      )}
    </SlideOver>
  );
}

function describeSchedule(c: CampaignWithEmails): string {
  if (c.schedule_type === "one_off") {
    return c.scheduled_at
      ? `One-off — ${new Date(c.scheduled_at).toLocaleString()}`
      : "One-off";
  }
  if (c.schedule_type === "recurring" && c.recurrence_pattern) {
    const p = c.recurrence_pattern;
    if (p.frequency === "weekly") {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      return `Weekly — ${days[p.day_of_week]} at ${p.time}`;
    }
    if (p.frequency === "monthly") {
      return `Monthly — day ${p.day_of_month} at ${p.time}`;
    }
  }
  return c.schedule_type ?? "—";
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-fg";
  return (
    <div className="bg-bg-elevated border border-border rounded-md p-3">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${toneCls}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-24 text-xs text-fg-muted">{label}</div>
      <div className="flex-1 text-sm text-fg truncate">{value}</div>
    </div>
  );
}
