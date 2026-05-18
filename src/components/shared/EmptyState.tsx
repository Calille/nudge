import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      <div className="w-14 h-14 rounded-full bg-bg-hover/70 border border-border flex items-center justify-center mb-4">
        <Icon size={24} className="text-fg-muted" />
      </div>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-fg-muted max-w-md">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
