import { Copy, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCampaignStore } from "@/stores/campaignStore";
import { useUIStore, toast } from "@/stores/uiStore";
import type { CampaignStatus } from "@/types";

export function CampaignHistory() {
  const campaigns = useCampaignStore((s) => s.campaigns);
  const reload = useCampaignStore((s) => s.load);
  const openDetail = useUIStore((s) => s.openCampaignDetail);
  const openBuilder = useUIStore((s) => s.setCampaignBuilderOpen);

  if (campaigns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={Send}
          title="No campaigns yet"
          description="Send your first merge-field email to a list of contacts."
          action={
            <Button variant="primary" onClick={() => openBuilder(true)}>
              New campaign
            </Button>
          }
        />
      </div>
    );
  }

  const clone = async (id: number) => {
    try {
      await window.api.campaigns.clone(id);
      toast({ title: "Campaign cloned", tone: "success" });
      reload();
    } catch (err: any) {
      toast({ title: "Clone failed", description: err.message, tone: "error" });
    }
  };
  const remove = async (id: number, name: string) => {
    if (!confirm(`Delete campaign "${name}"?`)) return;
    try {
      await window.api.campaigns.delete(id);
      toast({ title: "Campaign deleted", tone: "success" });
      reload();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, tone: "error" });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="border border-border rounded-lg overflow-hidden bg-bg-elevated">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="px-4 py-2 text-left text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                  Template
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openDetail(c.id)}
                  className="border-b border-border hover:bg-bg-hover/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-fg">{c.name}</td>
                  <td className="px-4 py-3 text-fg-muted">
                    {c.template_name ?? (
                      <span className="text-fg-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg tabular-nums">
                    {c.total_recipients}
                    {c.sent_count > 0 && (
                      <span className="ml-2 text-xs text-fg-muted">
                        ({c.sent_count} sent{c.failed_count ? `, ${c.failed_count} failed` : ""})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={toneForStatus(c.status)}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted">
                    {new Date(c.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-bg-hover"
                      title="Clone"
                      onClick={() => clone(c.id)}
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-bg-hover"
                      title="Delete"
                      onClick={() => remove(c.id, c.name)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function toneForStatus(
  status: CampaignStatus
): "default" | "accent" | "success" | "warning" | "danger" | "muted" {
  if (status === "completed") return "success";
  if (status === "sending" || status === "scheduled") return "accent";
  if (status === "failed") return "danger";
  if (status === "paused" || status === "cancelled") return "warning";
  return "muted";
}
