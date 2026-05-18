import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

export function TagInput({ value, onChange, placeholder, suggestions = [], className }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const add = (tag: string) => {
    const clean = tag.trim();
    if (!clean) return;
    if (value.includes(clean)) return;
    onChange([...value, clean]);
    setDraft("");
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const filtered = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase())
  );

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "min-h-[36px] w-full bg-bg-subtle border border-border rounded-md px-2 py-1 flex flex-wrap gap-1.5 items-center focus-within:border-accent/60 focus-within:shadow-focus"
        )}
      >
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium rounded bg-accent/15 text-[#93C5FD] border border-accent/30"
          >
            {t}
            <button
              onClick={() => remove(t)}
              className="hover:text-white"
              aria-label={`Remove ${t}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={value.length ? "" : placeholder ?? "Add tag…"}
          className="flex-1 bg-transparent outline-none text-sm text-fg placeholder:text-fg-subtle min-w-[80px]"
        />
      </div>
      {focused && filtered.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-bg-elevated border border-border rounded-md shadow-panel max-h-48 overflow-y-auto">
          {filtered.slice(0, 10).map((s) => (
            <button
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                add(s);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-fg hover:bg-bg-hover"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
