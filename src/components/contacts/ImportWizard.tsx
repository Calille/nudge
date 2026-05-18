import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, FileSpreadsheet, RefreshCw } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { FileDropZone } from "@/components/shared/FileDropZone";
import { Badge } from "@/components/shared/Badge";
import { Checkbox } from "@/components/shared/Checkbox";
import { toast } from "@/stores/uiStore";
import { useContactStore } from "@/stores/contactStore";
import { cn } from "@/lib/cn";
import type { ColumnMapping, ImportResult } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TARGET_FIELDS: Array<{
  key: keyof ColumnMapping;
  label: string;
  required?: boolean;
}> = [
  { key: "client_name", label: "Client Name" },
  { key: "name", label: "Contact Name", required: true },
  { key: "email", label: "Contact Email", required: true },
  { key: "role", label: "Role / Title" },
  { key: "phone", label: "Phone" },
  { key: "notes", label: "Notes" },
  { key: "tags", label: "Tags" },
];

const EMAIL_RE = /^[^\s@<>"']+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function ImportWizard({ open, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ name: "", email: "" });
  const [skipRows, setSkipRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const reloadList = useContactStore((s) => s.load);
  const reloadClients = useContactStore((s) => s.loadClients);
  const reloadTags = useContactStore((s) => s.loadTags);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setFilePath(null);
      setFileName(null);
      setHeaders([]);
      setRows([]);
      setMapping({ name: "", email: "" });
      setSkipRows(new Set());
      setResult(null);
    }
  }, [open]);

  const handleFile = async (path: string) => {
    setFilePath(path);
    setFileName(path.split(/[\\/]/).pop() ?? path);
    try {
      const preview = await window.api.contacts.previewSpreadsheet(path);
      setHeaders(preview.headers);
      setRows(preview.rows);
      setMapping(autoMap(preview.headers));
      setStep(2);
    } catch (err: any) {
      toast({ title: "Preview failed", description: err.message, tone: "error" });
    }
  };

  const { valid, warning, errorRows } = useMemo(() => {
    let v = 0,
      w = 0;
    const errs: number[] = [];
    rows.forEach((row, i) => {
      const email = mapping.email ? row[mapping.email]?.trim() : "";
      const name = mapping.name ? row[mapping.name]?.trim() : "";
      if (!name || !email || !EMAIL_RE.test(email)) {
        errs.push(i);
        return;
      }
      v++;
      if (!mapping.client_name || !row[mapping.client_name]) w++;
    });
    return { valid: v, warning: w, errorRows: errs };
  }, [rows, mapping]);

  const runImport = async () => {
    if (!filePath) return;
    setImporting(true);
    try {
      const res = await window.api.contacts.importSpreadsheet(
        filePath,
        mapping,
        { skipRows: Array.from(skipRows) }
      );
      setResult(res);
      setStep(4);
      reloadList();
      reloadClients();
      reloadTags();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, tone: "error" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Import contacts"
      description="Drag in a spreadsheet to map and load contacts into NudgeMail"
      footer={
        <FooterButtons
          step={step}
          onBack={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
          onNext={() => setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
          onClose={onClose}
          onImport={runImport}
          importing={importing}
          canAdvance={canAdvance(step, { filePath, mapping, valid })}
        />
      }
    >
      <Stepper step={step} />

      {step === 1 && (
        <div className="mt-6">
          <FileDropZone onFilePicked={handleFile} />
          {fileName && (
            <div className="mt-3 text-xs text-fg-muted flex items-center gap-2">
              <FileSpreadsheet size={14} /> {fileName}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <MappingStep
          headers={headers}
          rows={rows}
          mapping={mapping}
          setMapping={setMapping}
        />
      )}

      {step === 3 && (
        <ReviewStep
          rows={rows}
          mapping={mapping}
          skipRows={skipRows}
          setSkipRows={setSkipRows}
          valid={valid}
          warning={warning}
          errorRows={errorRows}
        />
      )}

      {step === 4 && result && <ResultStep result={result} />}
    </Modal>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const steps = ["Upload", "Map columns", "Review", "Done"];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, idx) => {
        const s = idx + 1;
        const active = step === s;
        const done = step > s;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold border",
                done
                  ? "bg-success/20 text-success border-success/40"
                  : active
                    ? "bg-accent text-white border-accent"
                    : "bg-bg-subtle border-border text-fg-muted"
              )}
            >
              {done ? <CheckCircle2 size={12} /> : s}
            </div>
            <span
              className={cn(
                "text-sm",
                active ? "text-fg font-medium" : "text-fg-muted"
              )}
            >
              {label}
            </span>
            {s < steps.length && (
              <div className="w-8 h-px bg-border mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MappingStep({
  headers,
  rows,
  mapping,
  setMapping,
}: {
  headers: string[];
  rows: Record<string, string>[];
  mapping: ColumnMapping;
  setMapping: (m: ColumnMapping) => void;
}) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
          Map your columns
        </h3>
        <div className="space-y-2">
          {TARGET_FIELDS.map((f) => {
            const value = mapping[f.key];
            const mapped = !!value && headers.includes(value);
            return (
              <div key={f.key} className="flex items-center gap-3">
                <div className="w-36 text-sm flex items-center gap-1.5">
                  {f.label}
                  {f.required && <span className="text-danger">*</span>}
                </div>
                <select
                  value={value ?? ""}
                  onChange={(e) =>
                    setMapping({ ...mapping, [f.key]: e.target.value || undefined })
                  }
                  className="flex-1 h-9 bg-bg-subtle border border-border rounded-md text-sm px-2 focus:outline-none focus:border-accent/60"
                >
                  <option value="">— Not mapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                {mapped ? (
                  <CheckCircle2 size={14} className="text-success" />
                ) : f.required ? (
                  <AlertCircle size={14} className="text-danger" />
                ) : (
                  <AlertCircle size={14} className="text-warning" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
          Preview
        </h3>
        <div className="overflow-auto max-h-[320px] border border-border rounded-md">
          <table className="text-xs w-full">
            <thead className="bg-bg-subtle">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-2.5 py-1.5 text-left font-medium text-fg-muted border-b border-border whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r, i) => (
                <tr key={i} className="border-b border-border">
                  {headers.map((h) => (
                    <td
                      key={h}
                      className="px-2.5 py-1.5 text-fg-muted whitespace-nowrap max-w-[180px] truncate"
                    >
                      {r[h] || <span className="text-fg-subtle">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-fg-muted">
          Showing first 10 of {rows.length} rows
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  rows,
  mapping,
  skipRows,
  setSkipRows,
  valid,
  warning,
  errorRows,
}: {
  rows: Record<string, string>[];
  mapping: ColumnMapping;
  skipRows: Set<number>;
  setSkipRows: (s: Set<number>) => void;
  valid: number;
  warning: number;
  errorRows: number[];
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-3">
        <Badge tone="success">{valid} valid</Badge>
        {warning > 0 && <Badge tone="warning">{warning} missing client</Badge>}
        {errorRows.length > 0 && (
          <Badge tone="danger">{errorRows.length} invalid</Badge>
        )}
      </div>
      <div className="overflow-auto max-h-[440px] border border-border rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-bg-subtle sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left w-10">Skip</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Client</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const email = mapping.email ? row[mapping.email] : "";
              const name = mapping.name ? row[mapping.name] : "";
              const client = mapping.client_name
                ? row[mapping.client_name]
                : "";
              const isError = errorRows.includes(i);
              const skipped = skipRows.has(i);
              return (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-border",
                    skipped && "opacity-40"
                  )}
                >
                  <td className="px-3 py-1.5">
                    <Checkbox
                      checked={skipped}
                      onChange={() => {
                        const next = new Set(skipRows);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        setSkipRows(next);
                      }}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    {isError ? (
                      <Badge tone="danger">Error</Badge>
                    ) : client ? (
                      <Badge tone="success">Valid</Badge>
                    ) : (
                      <Badge tone="warning">Warning</Badge>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-fg">{name}</td>
                  <td className="px-3 py-1.5 text-fg-muted font-mono">
                    {email}
                  </td>
                  <td className="px-3 py-1.5 text-fg-muted">
                    {client || <span className="text-fg-subtle">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultStep({ result }: { result: ImportResult }) {
  return (
    <div className="py-6 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-success/20 text-success flex items-center justify-center mb-4">
        <CheckCircle2 size={28} />
      </div>
      <h3 className="text-lg font-semibold">Import complete</h3>
      <p className="text-sm text-fg-muted mt-1">
        {result.imported} new • {result.updated} updated • {result.skipped} skipped
      </p>
      {result.errors.length > 0 && (
        <div className="mt-4 text-left mx-auto max-w-lg border border-border rounded-md overflow-hidden">
          <div className="px-3 py-2 text-xs font-medium bg-bg-subtle border-b border-border">
            {result.errors.length} row(s) had problems
          </div>
          <ul className="max-h-40 overflow-y-auto text-xs">
            {result.errors.map((e, i) => (
              <li
                key={i}
                className="px-3 py-1.5 border-b border-border flex gap-2 text-fg-muted"
              >
                <span className="text-fg-subtle">Row {e.row}</span>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FooterButtons({
  step,
  onBack,
  onNext,
  onClose,
  onImport,
  importing,
  canAdvance,
}: {
  step: 1 | 2 | 3 | 4;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  onImport: () => void;
  importing: boolean;
  canAdvance: boolean;
}) {
  return (
    <>
      {step > 1 && step < 4 && (
        <Button
          variant="ghost"
          onClick={onBack}
          icon={<ChevronLeft size={14} />}
        >
          Back
        </Button>
      )}
      <Button variant="ghost" onClick={onClose}>
        {step === 4 ? "Close" : "Cancel"}
      </Button>
      {step < 3 && (
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!canAdvance}
          icon={undefined}
        >
          Next <ChevronRight size={14} />
        </Button>
      )}
      {step === 3 && (
        <Button
          variant="primary"
          onClick={onImport}
          loading={importing}
          icon={<RefreshCw size={14} />}
        >
          Import
        </Button>
      )}
    </>
  );
}

function canAdvance(
  step: 1 | 2 | 3 | 4,
  state: { filePath: string | null; mapping: ColumnMapping; valid: number }
): boolean {
  if (step === 1) return !!state.filePath;
  if (step === 2)
    return !!state.mapping.name && !!state.mapping.email && state.valid > 0;
  return true;
}

function autoMap(headers: string[]): ColumnMapping {
  const lower = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hs = headers.map((h) => ({ raw: h, k: lower(h) }));
  const pick = (cands: string[]) => {
    for (const c of cands) {
      const m = hs.find((h) => h.k === c || h.k.includes(c));
      if (m) return m.raw;
    }
    return undefined;
  };
  return {
    client_name: pick([
      "clientname",
      "company",
      "companyname",
      "organisation",
      "organization",
      "school",
      "client",
    ]),
    name: pick(["contactname", "fullname", "name"]) ?? headers[0] ?? "",
    email: pick(["email", "emailaddress", "contactemail", "mail"]) ?? headers[1] ?? "",
    role: pick(["role", "title", "jobtitle", "position"]),
    phone: pick(["phone", "mobile", "tel", "telephone", "contactnumber"]),
    notes: pick(["notes", "comments", "description"]),
    tags: pick(["tags", "labels"]),
  };
}
