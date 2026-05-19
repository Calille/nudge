import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useThemeStore, type ThemeChoice } from "@/stores/themeStore";

interface Option {
  value: ThemeChoice;
  label: string;
  description: string;
  icon: LucideIcon;
}

const OPTIONS: Option[] = [
  {
    value: "system",
    label: "Match system",
    description: "Follow your operating system's light or dark setting.",
    icon: Monitor,
  },
  {
    value: "light",
    label: "Light",
    description: "Bright surfaces. Best in well-lit rooms.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low-light interface. Easier on the eyes after hours.",
    icon: Moon,
  },
];

export function AppearanceSettings() {
  const choice = useThemeStore((s) => s.choice);
  const setChoice = useThemeStore((s) => s.setChoice);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="text-sm text-fg-muted mt-1">
          Choose how NudgeMail looks. The choice is saved on this device.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = choice === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setChoice(opt.value)}
              className={cn(
                "text-left p-4 rounded-lg border transition-colors",
                active
                  ? "border-accent bg-accent/10"
                  : "border-border bg-bg-elevated hover:border-accent/40"
              )}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-fg">
                <Icon size={14} />
                {opt.label}
              </div>
              <div className="mt-1 text-xs text-fg-muted">
                {opt.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
