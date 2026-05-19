import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { WelcomeFlow } from "@/components/onboarding/WelcomeFlow";
import { useSettingsStore } from "@/stores/settingsStore";
import { useContactStore } from "@/stores/contactStore";
import { useTemplateStore } from "@/stores/templateStore";
import { useCampaignStore } from "@/stores/campaignStore";
import { useClientTypeStore } from "@/stores/clientTypeStore";
import { useThemeStore } from "@/stores/themeStore";
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
  const loadClientTypes = useClientTypeStore((s) => s.load);
  const initThemeListener = useThemeStore((s) => s.initSystemListener);
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
        loadClientTypes(),
      ]);
    })();
  }, [
    loadSettings,
    loadContacts,
    loadClients,
    loadTags,
    loadTemplates,
    loadCampaigns,
    loadClientTypes,
  ]);

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

  // Subscribe to OS dark/light changes so theme="system" stays in sync.
  useEffect(() => initThemeListener(), [initThemeListener]);

  // The scheduler runs in the main process; refresh visible state when it
  // kicks off or finishes a recurring/one-off run so the user sees it.
  useEffect(() => {
    const offStart = window.api.campaigns.onScheduledRunStarted(() => {
      loadCampaigns();
    });
    const offEnd = window.api.campaigns.onScheduledRunCompleted(() => {
      loadCampaigns();
      loadContacts();
    });
    return () => {
      offStart();
      offEnd();
    };
  }, [loadCampaigns, loadContacts]);

  return (
    <>
      {isFirstRun ? <WelcomeFlow /> : <AppShell />}
      <ToastContainer />
      <CommandPalette />
    </>
  );
}
