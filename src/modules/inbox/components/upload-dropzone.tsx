import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import { Button } from "../../../components/ui/button";

const acceptedTypes = ".xml,.csv,.pdf,.xlsx";
const ALLOWED_EXT = /\.(xml|csv|pdf|xlsx)$/i;

interface UploadDropzoneProps {
  onUpload: (file: File) => Promise<void>;
  /** Shown below the title (e.g. API success / ApiError message from parent) */
  notice?: { variant: "success" | "error"; text: string } | null;
}

export function UploadDropzone({ onUpload, notice }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateAndUpload = async (file: File) => {
    if (import.meta.env.DEV) {
      console.log("[upload] selected", { name: file.name, size: file.size, type: file.type });
    }
    if (!ALLOWED_EXT.test(file.name)) {
      // Do not hard-block upload; backend performs final validation.
      setValidationError("File extension is not standard (.xml/.csv/.pdf/.xlsx), uploading anyway...");
    } else {
      setValidationError(null);
    }
    setUploading(true);
    try {
      if (import.meta.env.DEV) {
        console.log("[upload] start onUpload");
      }
      await onUpload(file);
      if (import.meta.env.DEV) {
        console.log("[upload] onUpload done");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-card p-8 text-center",
        isDragOver && "border-primary"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
          void validateAndUpload(file);
        }
      }}
    >
      {notice ? (
        <div
          className={cn(
            "mb-4 rounded-xl border px-3 py-2 text-left text-sm",
            notice.variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800"
          )}
        >
          {notice.text}
        </div>
      ) : null}

      {validationError ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900">
          {validationError}
        </div>
      ) : null}

      <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-4 text-base font-medium">Drop files here or click to upload</p>
      <p className="mt-1 text-sm text-muted-foreground">Accepted: XML, CSV, PDF, XLSX</p>

      <div className="mt-5">
        <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading..." : "Select file"}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={acceptedTypes}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void validateAndUpload(file);
          }
          event.target.value = "";
        }}
      />
    </div>
  );
}
