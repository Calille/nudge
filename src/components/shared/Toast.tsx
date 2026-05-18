import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => dismiss(t.id), 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[360px] max-w-[95vw]">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = iconFor(t.tone ?? "info");
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60 }}
              className={cn(
                "pointer-events-auto flex gap-3 items-start p-3.5 pr-2 rounded-lg border shadow-panel bg-bg-elevated",
                toneBorder[t.tone ?? "info"]
              )}
            >
              <Icon size={18} className={cn("mt-0.5 shrink-0", toneColor[t.tone ?? "info"])} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-fg">{t.title}</div>
                {t.description && (
                  <div className="text-xs text-fg-muted mt-0.5">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="p-1 rounded-md text-fg-subtle hover:text-fg hover:bg-bg-hover"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function iconFor(tone: "success" | "error" | "info" | "warning") {
  if (tone === "success") return CheckCircle2;
  if (tone === "error") return XCircle;
  if (tone === "warning") return AlertTriangle;
  return Info;
}

const toneColor = {
  success: "text-success",
  error: "text-danger",
  warning: "text-warning",
  info: "text-accent",
};

const toneBorder = {
  success: "border-success/30",
  error: "border-danger/30",
  warning: "border-warning/30",
  info: "border-border",
};
