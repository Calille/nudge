import { AtSign } from "lucide-react";
import { useState } from "react";
import { MERGE_FIELDS } from "@/types";
import { cn } from "@/lib/cn";

interface Props {
  onInsert: (token: string) => void;
}

export function MergeFieldPicker({ onInsert }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={cn(
          "h-8 px-2.5 rounded inline-flex items-center gap-1.5 text-xs transition-colors",
          open
            ? "bg-accent/20 text-fg"
            : "text-fg-muted hover:text-fg hover:bg-bg-hover"
        )}
      >
        <AtSign size={12} />
        Merge field
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 z-30 bg-bg-elevated border border-border rounded-lg shadow-panel overflow-hidden">
          <div className="max-h-[320px] overflow-y-auto">
            {MERGE_FIELDS.map((f) => (
              <button
                key={f.key}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onInsert(`{{${f.key}}}`);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-bg-hover transition-colors border-b border-border last:border-b-0"
              >
                <div className="text-xs font-mono text-accent">{`{{${f.key}}}`}</div>
                <div className="text-[11px] text-fg-muted mt-0.5">
                  {f.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
