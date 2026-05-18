import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Tone = "default" | "accent" | "success" | "warning" | "danger" | "muted";

const toneClass: Record<Tone, string> = {
  default: "bg-bg-hover text-fg border border-border",
  accent: "bg-accent/15 text-[#93C5FD] border border-accent/30",
  success: "bg-success/15 text-[#86EFAC] border border-success/30",
  warning: "bg-warning/15 text-[#FCD34D] border border-warning/30",
  danger: "bg-danger/15 text-[#FCA5A5] border border-danger/30",
  muted: "bg-bg-subtle text-fg-muted border border-border",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 h-5 text-[11px] font-medium rounded leading-none",
        toneClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
