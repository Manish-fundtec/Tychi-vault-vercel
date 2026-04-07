import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Drawer } from "../../../components/ui/drawer";
import { ApiError } from "../../../lib/api/client";
import { downloadInboxFile, fetchInboxFileBlob, fetchInboxFileText } from "../api/inbox-api";
import type { InboxFile } from "../types/inbox";

function isPdf(f: InboxFile) {
  const t = (f.fileType || "").toUpperCase();
  if (t === "PDF") return true;
  return f.fileName.toLowerCase().endsWith(".pdf");
}

function isTextPreview(f: InboxFile) {
  const t = (f.fileType || "").toUpperCase();
  if (["XML", "CSV", "JSON"].includes(t)) return true;
  const n = f.fileName.toLowerCase();
  return [".xml", ".csv", ".json", ".txt"].some((ext) => n.endsWith(ext));
}

function isXlsx(f: InboxFile) {
  const t = (f.fileType || "").toUpperCase();
  return t === "XLSX" || f.fileName.toLowerCase().endsWith(".xlsx");
}

type Props = {
  open: boolean;
  file: InboxFile | null;
  onClose: () => void;
};

export function InboxFileViewerDrawer({ open, file, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const pdfUrlRef = useRef<string | null>(null);

  const revokePdf = () => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    setPdfUrl(null);
  };

  useEffect(() => {
    if (!open || !file) {
      setText(null);
      setError(null);
      revokePdf();
      return;
    }

    const f = file;
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      setText(null);
      revokePdf();

      if (isXlsx(f)) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        if (isPdf(f)) {
          const blob = await fetchInboxFileBlob(f.id, false, ac.signal);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          pdfUrlRef.current = url;
          setPdfUrl(url);
        } else if (isTextPreview(f)) {
          const t = await fetchInboxFileText(f.id, ac.signal);
          if (cancelled) return;
          setText(t);
        } else {
          const blob = await fetchInboxFileBlob(f.id, false, ac.signal);
          if (cancelled) return;
          if (blob.size <= 3 * 1024 * 1024) {
            const t = await blob.text();
            if (cancelled) return;
            setText(t);
          }
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Could not load file";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [open, file?.id, file?.fileName, file?.fileType]);

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
    };
  }, []);

  const handleDownload = async () => {
    if (!file) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadInboxFile(file.id, file.fileName);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Download failed";
      setError(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Drawer
      open={open && !!file}
      placement="center"
      widthClassName="w-[min(960px,calc(100vw-24px))]"
      title={file?.fileName ?? "File"}
      description={file ? `${file.fileType ?? "?"} · ${file.source}` : undefined}
      headerRight={
        <Button size="sm" disabled={downloading || !file} onClick={() => void handleDownload()}>
          {downloading ? "Downloading…" : "Download"}
        </Button>
      }
      onClose={onClose}
    >
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {pdfUrl && !error ? (
        <iframe title="PDF preview" className="h-[min(70vh,720px)] w-full rounded border border-border" src={pdfUrl} />
      ) : null}
      {text != null && !pdfUrl && !error ? (
        <pre className="max-h-[min(70vh,720px)] overflow-auto rounded border border-border bg-muted/30 p-3 text-xs leading-relaxed">
          {text}
        </pre>
      ) : null}
      {file && isXlsx(file) && !loading && !error ? (
        <p className="text-sm text-muted-foreground">
          Excel files are binary. Use Download to open the file locally.
        </p>
      ) : null}
      {file &&
      !isPdf(file) &&
      !isTextPreview(file) &&
      !isXlsx(file) &&
      text == null &&
      !loading &&
      !error &&
      !pdfUrl ? (
        <p className="text-sm text-muted-foreground">No preview available. Use Download.</p>
      ) : null}
    </Drawer>
  );
}
