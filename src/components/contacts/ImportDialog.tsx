import { useState } from "react";
import { AlertCircle, FileSpreadsheet, FolderOpen } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { useContactStore } from "@/stores/contactStore";
import { toast } from "@/stores/uiStore";
import type { StrictImportResult } from "@/types";

type Stage = "pick" | "validating" | "done";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SPREADSHEET_FILTERS = [
  { name: "Spreadsheet", extensions: ["xlsx", "xls", "csv"] },
];

export function ImportDialog({ open, onClose }: Props) {
  const importContacts = useContactStore((s) => s.importContacts);
  const [stage, setStage] = useState<Stage>("pick");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [result, setResult] = useState<StrictImportResult | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const reset = () => {
    setStage("pick");
    setFilePath(null);
    setResult(null);
    setFatalError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickFile = async () => {
    const picked = await window.api.utils.openFileDialog(SPREADSHEET_FILTERS);
    if (!picked) return;
    setFilePath(picked);
  };

  const run = async () => {
    if (!filePath) return;
    setStage("validating");
    setFatalError(null);
    try {
      const res = await importContacts(filePath);
      setResult(res);
      setStage("done");
      if (res.imported > 0) {
        toast({
          title: `Imported ${res.imported} ${res.imported === 1 ? "contact" : "contacts"}`,
          tone: "success",
        });
      }
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : String(err));
      setStage("pick");
    }
  };

  const fileName = filePath ? filePath.split(/[\\/]/).pop() : null;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import contacts"
      description="Strict mode — every row is validated before any contact is created."
      size="lg"
      footer={
        stage === "done" ? (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={run}
              loading={stage === "validating"}
              disabled={!filePath || stage === "validating"}
            >
              Import
            </Button>
          </>
        )
      }
    >
      {stage !== "done" && (
        <div className="space-y-4">
          <RequirementsBlock />

          <div className="flex items-center gap-3 p-3 border border-border rounded-md bg-bg-subtle">
            <FileSpreadsheet size={18} className="text-fg-muted shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              {fileName ? (
                <>
                  <div className="font-medium text-fg truncate">{fileName}</div>
                  <div className="text-xs text-fg-muted truncate">
                    {filePath}
                  </div>
                </>
              ) : (
                <span className="text-fg-muted">No file selected</span>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon={<FolderOpen size={14} />}
              onClick={pickFile}
            >
              {fileName ? "Change" : "Pick file"}
            </Button>
          </div>

          {stage === "validating" && (
            <div className="text-sm text-fg-muted">Validating…</div>
          )}

          {fatalError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-danger/10 border border-danger/30 text-sm text-fg">
              <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-danger">
                  Couldn't import this file
                </div>
                <div className="text-fg-muted mt-0.5">{fatalError}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === "done" && result && <ResultBlock result={result} />}
    </Modal>
  );
}

function RequirementsBlock() {
  return (
    <div className="text-xs text-fg-muted space-y-2 border border-border rounded-md p-3 bg-bg-subtle">
      <div>
        <span className="text-fg font-medium">Required columns:</span>{" "}
        <code className="text-accent">email</code>,{" "}
        <code className="text-accent">first_name</code>,{" "}
        <code className="text-accent">last_name</code>
      </div>
      <div>
        <span className="text-fg font-medium">Optional:</span>{" "}
        <code>company</code>, <code>phone</code>, <code>area</code>,{" "}
        <code>client_types</code>, <code>tags</code>
      </div>
      <div className="text-fg-subtle">
        Column headers are case-insensitive.{" "}
        <code>client_types</code> and <code>tags</code> accept
        semicolon-separated lists. <code>area</code> must be a recognised UK
        county; client types must already exist in Settings.
      </div>
    </div>
  );
}

function ResultBlock({ result }: { result: StrictImportResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Imported" value={result.imported} tone="success" />
        <Stat label="Skipped" value={result.skipped} tone="muted" />
      </div>

      {result.errors.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-fg-muted mb-1.5">
            Row errors ({result.errors.length})
          </div>
          <ul className="border border-border rounded-md bg-bg-subtle divide-y divide-border max-h-72 overflow-y-auto">
            {result.errors.map((e) => (
              <li
                key={e.row}
                className="flex items-baseline gap-3 px-3 py-2 text-sm"
              >
                <span className="text-fg-muted text-xs tabular-nums shrink-0 w-12">
                  row {e.row}
                </span>
                <span className="text-fg">{e.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-sm text-fg-muted">Every row imported cleanly.</div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "muted";
}) {
  return (
    <div className="border border-border rounded-md p-3 bg-bg-elevated">
      <div className="text-xs text-fg-muted">{label}</div>
      <div
        className={`mt-0.5 text-2xl font-semibold ${
          tone === "success" ? "text-success" : "text-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
