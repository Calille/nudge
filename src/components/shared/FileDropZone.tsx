import { UploadCloud } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface FileDropZoneProps {
  onFilePicked: (filePath: string) => void;
  accept?: string;
  label?: string;
  hint?: string;
  className?: string;
}

/**
 * Drop zone that gets a real file path via Electron's dialog API
 * (Electron hides the file path on drag events for security).
 */
export function FileDropZone({
  onFilePicked,
  accept = ".xlsx,.xls,.csv",
  label = "Drop a spreadsheet here",
  hint = "or click to browse — .xlsx, .xls, .csv",
  className,
}: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowse = useCallback(async () => {
    const path = await window.api.utils.openFileDialog([
      { name: "Spreadsheets", extensions: ["xlsx", "xls", "csv"] },
    ]);
    if (path) onFilePicked(path);
  }, [onFilePicked]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0] as (File & { path?: string }) | undefined;
    if (file && file.path) {
      onFilePicked(file.path);
    } else {
      void handleBrowse();
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={handleBrowse}
      className={cn(
        "cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors",
        dragging
          ? "border-accent bg-accent/5"
          : "border-border hover:border-accent/40 hover:bg-bg-hover/30",
        className
      )}
    >
      <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
        <UploadCloud size={22} className="text-accent" />
      </div>
      <div className="text-sm font-medium text-fg">{label}</div>
      <div className="text-xs text-fg-muted mt-1">{hint}</div>
      <div className="mt-4">
        <Button size="sm" variant="secondary">
          Browse files
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        hidden
        onChange={() => {
          /* unused; dialog flow handles paths */
        }}
      />
    </div>
  );
}
