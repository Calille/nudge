import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useClientTypeStore } from "@/stores/clientTypeStore";

interface Props {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  label?: string;
  emptyHint?: string;
}

export function ClientTypePicker({
  selectedIds,
  onChange,
  label,
  emptyHint,
}: Props) {
  const items = useClientTypeStore((s) => s.items);
  const selected = new Set(selectedIds);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  if (items.length === 0) {
    return (
      <div>
        {label && (
          <div className="text-xs font-medium text-fg-muted mb-1.5">
            {label}
          </div>
        )}
        <div className="text-xs text-fg-muted bg-bg-subtle border border-border rounded-md px-3 py-2.5">
          {emptyHint ?? "No client types yet. Add one in Settings → Client types."}
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <div className="text-xs font-medium text-fg-muted mb-1.5">{label}</div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {items.map((t) => {
          const isSelected = selected.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs border transition-colors",
                isSelected
                  ? "bg-accent/15 border-accent/50 text-fg"
                  : "bg-bg-subtle border-border text-fg-muted hover:text-fg hover:bg-bg-hover"
              )}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: t.colour ?? "var(--tw-prose-bullets)" }}
                aria-hidden
              />
              {t.name}
              {isSelected && <Check size={11} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
