import { useState } from "react";
import { cn } from "@/lib/cn";
import { EmailAccountSetup } from "./EmailAccountSetup";
import { SenderDefaults } from "./SenderDefaults";

type Tab = "accounts" | "defaults";

export function SettingsView() {
  const [tab, setTab] = useState<Tab>("accounts");
  return (
    <div className="h-full flex">
      <aside className="w-56 shrink-0 border-r border-border p-3 space-y-0.5">
        <TabBtn active={tab === "accounts"} onClick={() => setTab("accounts")}>
          Email accounts
        </TabBtn>
        <TabBtn active={tab === "defaults"} onClick={() => setTab("defaults")}>
          Sender defaults
        </TabBtn>
      </aside>
      <div className="flex-1 overflow-y-auto">
        {tab === "accounts" && <EmailAccountSetup />}
        {tab === "defaults" && <SenderDefaults />}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
        active
          ? "bg-accent/15 text-fg"
          : "text-fg-muted hover:text-fg hover:bg-bg-hover"
      )}
    >
      {children}
    </button>
  );
}
