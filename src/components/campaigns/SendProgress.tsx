import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Pause, Play, X, XCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useCampaignStore } from "@/stores/campaignStore";
import type { SendProgressEvent } from "@/types";
import { cn } from "@/lib/cn";

interface LogItem {
  key: number;
  email: string;
  status: "sent" | "failed";
  error?: string;
}

export function SendProgress() {
  const [state, setState] = useState<SendProgressEvent | null>(null);
  const [log, setLog] = useState<LogItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const keyRef = useRef(0);
  const reloadCampaigns = useCampaignStore((s) => s.load);

  useEffect(() => {
    const unsub = window.api.campaigns.onProgress((progress) => {
      setState(progress);
      setDismissed(false);
      if (progress.current) {
        setLog((prev) => [
          {
            key: keyRef.current++,
            email: progress.current!.to_email,
            status: progress.current!.status,
            error: progress.current!.error,
          },
          ...prev,
        ].slice(0, 200));
      }
      if (progress.done) {
        setPaused(false);
        reloadCampaigns();
      }
    });
    return () => unsub();
  }, [reloadCampaigns]);

  const visible = state && !dismissed;
  if (!visible || !state) return null;

  const pct = state.total ? Math.round(((state.sent + state.failed) / state.total) * 100) : 0;

  const pause = async () => {
    await window.api.campaigns.pause(state.campaign_id);
    setPaused(true);
  };
  const resume = async () => {
    await window.api.campaigns.resume(state.campaign_id);
    setPaused(false);
  };
  const cancel = async () => {
    if (!confirm("Cancel this send? Remaining emails will not be sent.")) return;
    await window.api.campaigns.cancel(state.campaign_id);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 right-4 z-50 w-[480px] max-w-[95vw] bg-bg-elevated border border-border rounded-lg shadow-panel overflow-hidden"
      >
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">
              {state.done ? "Send complete" : paused ? "Paused" : "Sending emails"}
            </div>
            <div className="text-xs text-fg-muted">
              {state.sent + state.failed} of {state.total} • {state.sent} sent, {state.failed} failed
            </div>
          </div>
          {!state.done && (
            <>
              {paused ? (
                <Button size="sm" variant="secondary" icon={<Play size={12} />} onClick={resume}>
                  Resume
                </Button>
              ) : (
                <Button size="sm" variant="secondary" icon={<Pause size={12} />} onClick={pause}>
                  Pause
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={cancel}>
                Cancel
              </Button>
            </>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-bg-hover"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 pt-2 pb-3">
          <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                state.done ? "bg-success" : "bg-accent"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-fg-subtle text-right">
            {pct}%
          </div>
        </div>

        {log.length > 0 && (
          <div className="max-h-52 overflow-y-auto border-t border-border">
            {log.map((l) => (
              <div
                key={l.key}
                className="px-4 py-1.5 flex items-center gap-2 text-xs border-b border-border/50"
              >
                {l.status === "sent" ? (
                  <CheckCircle2 size={12} className="text-success shrink-0" />
                ) : (
                  <XCircle size={12} className="text-danger shrink-0" />
                )}
                <span className="font-mono truncate flex-1">{l.email}</span>
                {l.error && (
                  <span className="text-danger truncate max-w-[200px]" title={l.error}>
                    {l.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
