import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/cn";
import { UK_COUNTIES } from "@/lib/uk-counties";
import { useClientTypeStore } from "@/stores/clientTypeStore";
import type { CampaignFilters } from "@/types";

interface Props {
  value: CampaignFilters;
  onChange: (next: CampaignFilters) => void;
  matchCount?: number;
}

export function RecipientFilterBar({ value, onChange, matchCount }: Props) {
  const types = useClientTypeStore((s) => s.items);
  const selectedTypes = new Set(value.clientTypeIds);
  const selectedAreas = new Set(value.areas);

  const toggleType = (id: number) => {
    const next = new Set(selectedTypes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...value, clientTypeIds: Array.from(next) });
  };

  const setAreas = (areas: string[]) => onChange({ ...value, areas });

  const clear = () => onChange({ clientTypeIds: [], areas: [] });

  const hasFilters = value.clientTypeIds.length > 0 || value.areas.length > 0;

  return (
    <div className="border border-border rounded-lg bg-bg-elevated p-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
          Filters
        </span>
        {hasFilters && (
          <button
            onClick={clear}
            className="text-xs text-fg-muted hover:text-fg inline-flex items-center gap-1"
          >
            <X size={11} /> Clear
          </button>
        )}
        {matchCount !== undefined && (
          <span className="ml-auto text-xs text-fg-muted">
            <strong className="text-fg">{matchCount}</strong>{" "}
            matching contact{matchCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <div className="text-[11px] text-fg-muted mb-1">Client types</div>
          {types.length === 0 ? (
            <div className="text-xs text-fg-subtle">
              No client types yet — add some in Settings → Client types.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {types.map((t) => {
                const isSelected = selectedTypes.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs border transition-colors",
                      isSelected
                        ? "bg-accent/15 border-accent/50 text-fg"
                        : "bg-bg-subtle border-border text-fg-muted hover:text-fg hover:bg-bg-hover"
                    )}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: t.colour ?? "transparent" }}
                    />
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] text-fg-muted mb-1">Areas</div>
          <AreaMultiSelect value={Array.from(selectedAreas)} onChange={setAreas} />
        </div>
      </div>
    </div>
  );
}

function AreaMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = new Set(value);

  const toggle = (county: string) => {
    const next = new Set(selected);
    if (next.has(county)) next.delete(county);
    else next.add(county);
    onChange(Array.from(next).sort());
  };

  const matching = q
    ? UK_COUNTIES.filter((c) => c.toLowerCase().includes(q.toLowerCase()))
    : UK_COUNTIES;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-9 px-3 inline-flex items-center gap-2 bg-bg-subtle border border-border rounded-md text-sm text-fg hover:bg-bg-hover transition-colors"
      >
        <span className="flex-1 min-w-0 text-left truncate">
          {value.length === 0 ? (
            <span className="text-fg-muted">Any area</span>
          ) : (
            `${value.length} area${value.length === 1 ? "" : "s"} selected`
          )}
        </span>
        <ChevronDown size={14} className="text-fg-muted shrink-0" />
      </button>

      {value.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {value.map((a) => (
            <Badge key={a}>
              {a}
              <button
                onClick={() => toggle(a)}
                className="ml-1 text-fg-muted hover:text-fg"
                aria-label={`Remove ${a}`}
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-bg-elevated border border-border rounded-md shadow-panel max-h-72 overflow-hidden flex flex-col">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search counties…"
            className="h-9 px-3 text-sm bg-bg-subtle border-b border-border focus:outline-none"
            autoFocus
          />
          <div className="flex-1 overflow-y-auto">
            {matching.map((c) => {
              const isSelected = selected.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-sm hover:bg-bg-hover flex items-center gap-2",
                    isSelected && "text-accent"
                  )}
                >
                  <span
                    className={cn(
                      "w-3.5 h-3.5 rounded border inline-flex items-center justify-center text-[10px]",
                      isSelected
                        ? "bg-accent border-accent text-white"
                        : "border-border"
                    )}
                  >
                    {isSelected && "✓"}
                  </span>
                  {c}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border p-1 flex justify-between">
            <button
              onClick={() => onChange([])}
              className="text-xs px-2 py-1 text-fg-muted hover:text-fg"
            >
              Clear
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-xs px-2 py-1 text-fg-muted hover:text-fg"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
