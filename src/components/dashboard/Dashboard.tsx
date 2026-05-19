import { useMemo } from "react";
import {
  Briefcase,
  Mail,
  Send,
  UploadCloud,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useCampaignStore } from "@/stores/campaignStore";
import { useContactStore } from "@/stores/contactStore";
import { useTemplateStore } from "@/stores/templateStore";
import { useUIStore } from "@/stores/uiStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/shared/Badge";

export function Dashboard() {
  const contactsTotal = useContactStore((s) => s.total);
  const clients = useContactStore((s) => s.clients);
  const templates = useTemplateStore((s) => s.templates);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const setActive = useUIStore((s) => s.setActiveView);
  const openImport = useUIStore((s) => s.setImportOpen);
  const openTemplateEditor = useUIStore((s) => s.openTemplateEditor);
  const openCampaignBuilder = useUIStore((s) => s.setCampaignBuilderOpen);

  const stats = useMemo(() => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const emailsThisMonth = campaigns
      .filter((c) => c.started_at && new Date(c.started_at) >= thisMonth)
      .reduce((acc, c) => acc + c.sent_count, 0);
    return {
      contacts: contactsTotal,
      clients: clients.length,
      templates: templates.length,
      campaigns: campaigns.length,
      emailsThisMonth,
    };
  }, [contactsTotal, clients, templates, campaigns]);

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-fg-muted mt-1">
            Here's a snapshot of your outreach activity.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Contacts" value={stats.contacts} icon={Users} onClick={() => setActive("contacts")} />
          <StatCard
            label="Clients"
            value={stats.clients}
            icon={Briefcase}
            onClick={() => setActive("contacts")}
          />
          <StatCard
            label="Templates"
            value={stats.templates}
            icon={Mail}
            onClick={() => setActive("templates")}
          />
          <StatCard
            label="Emails this month"
            value={stats.emailsThisMonth}
            icon={Send}
            onClick={() => setActive("campaigns")}
          />
        </div>

        <section className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-bg-elevated border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Recent campaigns</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActive("campaigns")}
              >
                View all
              </Button>
            </div>
            {campaigns.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No campaigns yet"
                description="Create your first campaign to send a merge-field email to a list of contacts."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openCampaignBuilder(true)}
                  >
                    Create campaign
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border -mx-2">
                {campaigns.slice(0, 6).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 px-2 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-fg-muted">
                        {c.template_name ?? "No template"} • {c.total_recipients} recipients
                      </div>
                    </div>
                    <Badge tone={toneForStatus(c.status)}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-bg-elevated border border-border rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold">Quick actions</h2>
            <QuickAction
              icon={UploadCloud}
              label="Import contacts"
              description="From Excel, CSV or Google Sheets export"
              onClick={() => openImport(true)}
            />
            <QuickAction
              icon={Mail}
              label="New template"
              description="Design a merge-field email"
              onClick={() => {
                setActive("templates");
                openTemplateEditor("new");
              }}
            />
            <QuickAction
              icon={Send}
              label="New campaign"
              description="Pick contacts and send"
              onClick={() => {
                setActive("campaigns");
                openCampaignBuilder(true);
              }}
            />
            <QuickAction
              icon={UserPlus}
              label="Manage staff"
              description="Staff & products offered to clients"
              onClick={() => setActive("staff")}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function toneForStatus(
  status: string
): "default" | "accent" | "success" | "warning" | "danger" | "muted" {
  if (status === "completed") return "success";
  if (status === "sending" || status === "scheduled") return "accent";
  if (status === "failed") return "danger";
  if (status === "paused" || status === "cancelled") return "warning";
  return "muted";
}

function StatCard({
  label,
  value,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-bg-elevated border border-border rounded-lg p-4 hover:border-accent/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-fg-muted">{label}</div>
        <Icon size={14} className="text-fg-subtle" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </button>
  );
}

function QuickAction({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 p-3 rounded-md border border-border hover:border-accent/40 hover:bg-bg-hover transition-colors"
    >
      <span className="w-8 h-8 rounded-md bg-accent/15 text-accent flex items-center justify-center shrink-0">
        <Icon size={14} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        <span className="block text-xs text-fg-muted">{description}</span>
      </span>
    </button>
  );
}
