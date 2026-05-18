import { useEffect, useState } from "react";
import { AlertTriangle, Eye } from "lucide-react";
import { Select } from "@/components/shared/Input";
import { EmptyState } from "@/components/shared/EmptyState";
import type { CampaignPreview as PreviewData } from "@/types";

interface Props {
  campaignId: number;
  // Optional refresh trigger — bump this when the campaign mutates upstream
  // (template change, filter change) and we want the preview to re-fetch.
  refreshToken?: unknown;
}

export function CampaignPreview({ campaignId, refreshToken }: Props) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleId, setSampleId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const result = await window.api.campaigns.preview(
          campaignId,
          sampleId
        );
        if (cancelled) return;
        setData(result);
        if (sampleId === null && result.resolvedFor) {
          setSampleId(result.resolvedFor.id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, sampleId, refreshToken]);

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-2 p-3 rounded-md bg-danger/10 border border-danger/30 text-sm">
          <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-danger">Preview failed</div>
            <div className="text-fg-muted mt-0.5">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data && loading) {
    return <div className="p-6 text-sm text-fg-muted">Rendering preview…</div>;
  }

  if (!data) return null;

  const noRecipients = data.candidateRecipients.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border flex items-center gap-3 bg-bg-elevated">
        <Eye size={14} className="text-fg-muted" />
        <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
          Previewing as
        </span>
        {noRecipients ? (
          <span className="text-sm text-fg-muted">
            No matching recipients — showing defaults
          </span>
        ) : (
          <Select
            value={sampleId ?? data.resolvedFor?.id ?? ""}
            onChange={(e) => setSampleId(Number(e.target.value))}
            className="!h-8 max-w-xs"
          >
            {data.candidateRecipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name || r.email}
                {r.email && r.name ? ` <${r.email}>` : ""}
              </option>
            ))}
          </Select>
        )}

        <div className="ml-auto flex items-center gap-3">
          {data.missingFields.length > 0 && (
            <span
              className="inline-flex items-center gap-1 text-xs text-warning"
              title={data.missingFields.map((f) => `{{${f}}}`).join(", ")}
            >
              <AlertTriangle size={12} />
              {data.missingFields.length} unfilled merge field
              {data.missingFields.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 px-4 py-2 border-b border-border text-sm bg-bg-subtle">
        <span className="text-fg-muted text-xs">Subject:&nbsp;</span>
        <span className="text-fg font-medium">
          {data.subject || <em className="text-fg-muted">(empty)</em>}
        </span>
      </div>

      <div className="flex-1 min-h-0 bg-white">
        {data.html ? (
          // Sandboxed iframe — srcDoc with no allow-* keeps any JS or
          // network in the compiled email markup safely isolated.
          <iframe
            title="Campaign preview"
            srcDoc={data.html}
            sandbox=""
            className="w-full h-full border-0"
          />
        ) : (
          <EmptyState icon={Eye} title="Nothing to preview yet" />
        )}
      </div>
    </div>
  );
}
