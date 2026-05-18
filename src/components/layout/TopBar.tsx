import { Command } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  contacts: "Contacts",
  templates: "Templates",
  campaigns: "Campaigns",
  staff: "Staff",
  settings: "Settings",
};

const SUBTITLES: Record<string, string> = {
  dashboard: "An overview of your outreach",
  contacts: "Manage clients and contacts",
  templates: "Build reusable marketing emails",
  campaigns: "Send and track outreach",
  staff: "Manage staff profiles to offer to clients",
  settings: "Email accounts and defaults",
};

export function TopBar() {
  const view = useUIStore((s) => s.activeView);
  const openCommand = useUIStore((s) => s.openCommand);
  return (
    <header className="h-14 shrink-0 border-b border-border flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-fg truncate">
          {TITLES[view]}
        </div>
        <div className="text-xs text-fg-muted truncate">{SUBTITLES[view]}</div>
      </div>
      <button
        onClick={openCommand}
        className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md border border-border text-fg-muted hover:text-fg hover:bg-bg-hover text-xs transition-colors"
      >
        <Command size={12} />
        <span>Search</span>
        <span className="ml-2 flex items-center gap-0.5 text-[10px] text-fg-subtle">
          <kbd className="px-1 py-0.5 rounded border border-border bg-bg-subtle">⌘</kbd>
          <kbd className="px-1 py-0.5 rounded border border-border bg-bg-subtle">K</kbd>
        </span>
      </button>
    </header>
  );
}
