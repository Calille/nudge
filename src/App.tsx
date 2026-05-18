import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { WelcomeFlow } from "@/components/onboarding/WelcomeFlow";
import { useSettingsStore } from "@/stores/settingsStore";
import { useContactStore } from "@/stores/contactStore";
import { useTemplateStore } from "@/stores/templateStore";
import { useCampaignStore } from "@/stores/campaignStore";
import { ToastContainer } from "@/components/shared/Toast";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { useUIStore } from "@/stores/uiStore";

export default function App() {
  const loadSettings = useSettingsStore((s) => s.load);
  const loadContacts = useContactStore((s) => s.load);
  const loadClients = useContactStore((s) => s.loadClients);
  const loadTags = useContactStore((s) => s.loadTags);
  const loadTemplates = useTemplateStore((s) => s.load);
  const loadCampaigns = useCampaignStore((s) => s.load);
  const isFirstRun = useSettingsStore((s) => s.isFirstRun);
  const openCommand = useUIStore((s) => s.openCommand);

  useEffect(() => {
    (async () => {
      await loadSettings();
      await Promise.all([
        loadContacts(),
        loadClients(),
        loadTags(),
        loadTemplates(),
        loadCampaigns(),
      ]);
    })();
  }, [loadSettings, loadContacts, loadClients, loadTags, loadTemplates, loadCampaigns]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openCommand();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openCommand]);

  return (
    <>
      {isFirstRun ? <WelcomeFlow /> : <AppShell />}
      <ToastContainer />
      <CommandPalette />
    </>
  );
}
