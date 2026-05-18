import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useUIStore } from "@/stores/uiStore";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ContactsView } from "@/components/contacts/ContactsView";
import { TemplatesView } from "@/components/templates/TemplatesView";
import { CampaignsView } from "@/components/campaigns/CampaignsView";
import { StaffView } from "@/components/settings/StaffManager";
import { SettingsView } from "@/components/settings/SettingsView";

export function AppShell() {
  const view = useUIStore((s) => s.activeView);
  return (
    <div className="flex h-screen w-screen bg-bg text-fg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-h-0 overflow-hidden">
          {view === "dashboard" && <Dashboard />}
          {view === "contacts" && <ContactsView />}
          {view === "templates" && <TemplatesView />}
          {view === "campaigns" && <CampaignsView />}
          {view === "staff" && <StaffView />}
          {view === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
