import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Mail,
  Send,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUIStore, type ViewId } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";

interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "templates", label: "Templates", icon: Mail },
  { id: "campaigns", label: "Campaigns", icon: Send },
  { id: "staff", label: "Staff", icon: Briefcase },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const active = useUIStore((s) => s.activeView);
  const setActive = useUIStore((s) => s.setActiveView);
  const accounts = useSettingsStore((s) => s.accounts);
  const defaultAccount = accounts.find((a) => a.is_default);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="shrink-0 h-full bg-bg-elevated border-r border-border flex flex-col"
    >
      <div className={cn("h-14 px-4 flex items-center", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-2 select-none">
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-indigo-500 shadow-ring" />
            <span className="font-semibold tracking-tight">NudgeMail</span>
          </div>
        )}
        <button
          onClick={toggle}
          className="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-bg-hover"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 h-9 rounded-md px-2.5 text-sm transition-colors",
                isActive
                  ? "bg-accent/15 text-fg"
                  : "text-fg-muted hover:text-fg hover:bg-bg-hover",
                collapsed && "justify-center"
              )}
            >
              <Icon
                size={16}
                className={cn(isActive ? "text-accent" : "text-current")}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div
        className={cn(
          "border-t border-border p-3 text-xs",
          collapsed && "flex justify-center"
        )}
      >
        {collapsed ? (
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              defaultAccount ? "bg-success" : "bg-warning"
            )}
            title={defaultAccount ? defaultAccount.email : "No account connected"}
          />
        ) : (
          <div className="flex items-center gap-2 text-fg-muted">
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                defaultAccount ? "bg-success" : "bg-warning"
              )}
            />
            <span className="truncate">
              {defaultAccount ? defaultAccount.email : "Not connected"}
            </span>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
