import { useState } from "react";
import { ArrowRight, CheckCircle2, Mail, Sparkles, UploadCloud, User } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { FileDropZone } from "@/components/shared/FileDropZone";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "@/stores/uiStore";
import { cn } from "@/lib/cn";

type Step = "accounts" | "defaults" | "import" | "done";

export function WelcomeFlow() {
  const [step, setStep] = useState<Step>("accounts");
  const reload = useSettingsStore((s) => s.load);

  const finish = async () => {
    await window.api.settings.completeFirstRun();
    await reload();
  };

  return (
    <div className="h-screen w-screen bg-bg text-fg flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-bg-elevated border border-border rounded-xl shadow-panel overflow-hidden">
        <header className="px-8 pt-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-indigo-500 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </span>
            <span className="text-lg font-semibold">Welcome to NudgeMail</span>
          </div>
          <p className="text-sm text-fg-muted">
            Let's get you set up in three quick steps.
          </p>

          <ol className="mt-6 flex items-center gap-3 text-xs">
            <StepDot active={step === "accounts"} done={step !== "accounts"}>
              Connect
            </StepDot>
            <Divider />
            <StepDot
              active={step === "defaults"}
              done={step === "import" || step === "done"}
            >
              Defaults
            </StepDot>
            <Divider />
            <StepDot
              active={step === "import"}
              done={step === "done"}
            >
              Import
            </StepDot>
          </ol>
        </header>

        <div className="p-8">
          {step === "accounts" && (
            <AccountsStep onNext={() => setStep("defaults")} />
          )}
          {step === "defaults" && (
            <DefaultsStep onNext={() => setStep("import")} />
          )}
          {step === "import" && (
            <ImportStep
              onNext={async () => {
                setStep("done");
                await finish();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({
  active,
  done,
  children,
}: {
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className={cn(
          "w-5 h-5 rounded-full border flex items-center justify-center",
          done
            ? "bg-success/20 border-success/40 text-success"
            : active
              ? "bg-accent text-white border-accent"
              : "bg-bg-subtle border-border text-fg-muted"
        )}
      >
        {done ? <CheckCircle2 size={10} /> : ""}
      </span>
      <span className={active ? "text-fg" : "text-fg-muted"}>{children}</span>
    </li>
  );
}

function Divider() {
  return <span className="w-6 h-px bg-border" />;
}

function AccountsStep({ onNext }: { onNext: () => void }) {
  const [connecting, setConnecting] = useState<"outlook" | null>(null);
  const reload = useSettingsStore((s) => s.load);

  const connectOutlook = async () => {
    setConnecting("outlook");
    try {
      await window.api.settings.connectOutlook();
      toast({ title: "Connected", tone: "success" });
      reload();
      onNext();
    } catch (err: any) {
      toast({ title: "Connect failed", description: err.message, tone: "error" });
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Mail size={16} className="text-accent" /> Connect your email
        </h2>
        <p className="text-sm text-fg-muted mt-1">
          NudgeMail sends all campaigns through your account. You can always
          connect later in Settings.
        </p>
      </div>
      <div>
        <Button
          size="lg"
          variant="secondary"
          loading={connecting === "outlook"}
          onClick={connectOutlook}
        >
          Connect Outlook
        </Button>
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" onClick={onNext}>
          Skip for now <ArrowRight size={12} />
        </Button>
      </div>
    </div>
  );
}

function DefaultsStep({ onNext }: { onNext: () => void }) {
  const [fromName, setFromName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [saving, setSaving] = useState(false);
  const reload = useSettingsStore((s) => s.load);

  const save = async () => {
    setSaving(true);
    try {
      await window.api.settings.updateSenderDefaults({
        from_name: fromName,
        reply_to: replyTo,
        signature_html: `<p>${fromName}${company ? ` — ${company}` : ""}</p>`,
        company_name: company,
        phone,
        website: "",
      });
      reload();
      onNext();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <User size={16} className="text-accent" /> Sender defaults
        </h2>
        <p className="text-sm text-fg-muted mt-1">
          These populate merge fields and sign off your emails.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Display name"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
        />
        <Input
          label="Company name"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          label="Reply-to (optional)"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          type="email"
        />
      </div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onNext}>
          Skip
        </Button>
        <Button variant="primary" onClick={save} loading={saving}>
          Continue <ArrowRight size={12} />
        </Button>
      </div>
    </div>
  );
}

function ImportStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <UploadCloud size={16} className="text-accent" /> Import contacts
        </h2>
        <p className="text-sm text-fg-muted mt-1">
          Drop a spreadsheet to get started, or skip and import later.
        </p>
      </div>
      <FileDropZone
        onFilePicked={async () => {
          // We could handle auto-import here, but the main import wizard
          // gives the user full control; we simply advance and let them
          // open it from the main UI.
          await onNext();
        }}
      />
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onNext}>
          I'll do this later <ArrowRight size={12} />
        </Button>
      </div>
    </div>
  );
}
