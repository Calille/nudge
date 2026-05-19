import { useEffect, useState } from "react";
import { CheckCircle2, Mail, Plug, Server, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/shared/Input";
import { Checkbox } from "@/components/shared/Checkbox";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "@/stores/uiStore";

export function EmailAccountSetup() {
  const accounts = useSettingsStore((s) => s.accounts);
  const reload = useSettingsStore((s) => s.load);
  const [connecting, setConnecting] = useState<"outlook" | null>(null);
  const [smtpOpen, setSmtpOpen] = useState(false);

  useEffect(() => {
    reload();
  }, [reload]);

  const connectOutlook = async () => {
    setConnecting("outlook");
    try {
      await window.api.settings.connectOutlook();
      toast({ title: "Outlook connected", tone: "success" });
      reload();
    } catch (err: any) {
      toast({ title: "Outlook connect failed", description: err.message, tone: "error" });
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = async (id: number) => {
    if (!confirm("Disconnect this account?")) return;
    try {
      await window.api.settings.disconnectAccount(id);
      reload();
    } catch (err: any) {
      toast({ title: "Disconnect failed", description: err.message, tone: "error" });
    }
  };

  const setDefault = async (id: number) => {
    try {
      await window.api.settings.setDefaultAccount(id);
      reload();
    } catch (err: any) {
      toast({ title: "Set default failed", description: err.message, tone: "error" });
    }
  };

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold">Connect an email account</h2>
        <p className="text-sm text-fg-muted mt-1">
          NudgeMail sends all campaigns through an account you connect.
          Outlook OAuth is preferred; SMTP is available as a fallback.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ProviderCard
          title="Outlook"
          description="Microsoft Graph · Mail.Send"
          onClick={connectOutlook}
          loading={connecting === "outlook"}
          icon={<Mail size={18} className="text-accent" />}
        />
        <ProviderCard
          title="SMTP"
          description="Any IMAP/SMTP provider"
          onClick={() => setSmtpOpen(true)}
          icon={<Server size={18} className="text-accent" />}
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
          Connected accounts
        </h3>
        {accounts.length === 0 ? (
          <div className="text-sm text-fg-muted border border-dashed border-border rounded-lg p-6 text-center">
            No accounts connected yet.
          </div>
        ) : (
          <ul className="border border-border rounded-lg divide-y divide-border bg-bg-elevated">
            {accounts.map((a) => (
              <li key={a.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-bg-hover flex items-center justify-center">
                  <Mail size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.email}</div>
                  <div className="text-xs text-fg-muted capitalize">
                    {a.provider}
                  </div>
                </div>
                {a.is_default ? (
                  <Badge tone="success">
                    <CheckCircle2 size={10} /> Default
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Star size={12} />}
                    onClick={() => setDefault(a.id)}
                  >
                    Make default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={12} />}
                  onClick={() => disconnect(a.id)}
                >
                  Disconnect
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SmtpModal open={smtpOpen} onClose={() => setSmtpOpen(false)} />
    </div>
  );
}

function ProviderCard({
  title,
  description,
  icon,
  onClick,
  loading,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-lg border border-border bg-bg-elevated hover:border-accent/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-md bg-bg-hover flex items-center justify-center">
          {icon}
        </div>
        {loading ? (
          <span className="inline-block w-3 h-3 rounded-full border-2 border-fg-muted border-t-transparent animate-spin" />
        ) : (
          <Plug size={12} className="text-fg-subtle" />
        )}
      </div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <div className="text-xs text-fg-muted">{description}</div>
    </button>
  );
}

function SmtpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const reload = useSettingsStore((s) => s.load);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const test = async () => {
    setTesting(true);
    try {
      const res = await window.api.settings.testSmtp({
        host,
        port,
        username,
        password,
        secure,
      });
      toast({
        title: res.ok ? "Connection ok" : "Connection failed",
        description: res.message,
        tone: res.ok ? "success" : "error",
      });
    } catch (err: any) {
      toast({ title: "Test failed", description: err.message, tone: "error" });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await window.api.settings.connectSmtp({
        email,
        display_name: displayName,
        host,
        port,
        username,
        password,
        secure,
      });
      toast({ title: "SMTP account added", tone: "success" });
      reload();
      onClose();
    } catch (err: any) {
      toast({ title: "Add failed", description: err.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="SMTP configuration"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={test} loading={testing}>
            Test connection
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            Add account
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="you@yourdomain.com"
        />
        <Input
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your Name"
        />
        <Input
          label="Host"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="smtp.yourdomain.com"
        />
        <Input
          label="Port"
          value={String(port)}
          onChange={(e) => setPort(Number(e.target.value))}
          type="number"
        />
        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
      </div>
      <div className="mt-3">
        <Checkbox
          checked={secure}
          onChange={(e) => setSecure((e.target as HTMLInputElement).checked)}
          label="Use SSL/TLS (port 465). Leave unchecked for STARTTLS (port 587)."
        />
      </div>
    </Modal>
  );
}
