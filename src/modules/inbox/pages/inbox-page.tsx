import { useEffect, useRef, useState } from "react";
import { Card } from "../../../components/ui/card";
import { EmptyState } from "../../../components/common/empty-state";
import { ErrorState } from "../../../components/common/error-state";
import { Skeleton } from "../../../components/ui/skeleton";
import { ApiError } from "../../../lib/api/client";
import { uploadInboxFile } from "../api/inbox-api";
import { UploadDropzone } from "../components/upload-dropzone";
import { InboxTable } from "../components/inbox-table";
import { useInboxFiles } from "../hooks/use-inbox-files";

export function InboxPage() {
  const { data, loading, error, reload } = useInboxFiles();
  const [uploadNotice, setUploadNotice] = useState<{ variant: "success" | "error"; text: string } | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">Upload and monitor inbound financial files.</p>
      </header>

      <Card>
        <UploadDropzone
          notice={uploadNotice}
          onUpload={async (file) => {
            setUploadNotice(null);
            if (clearTimerRef.current) {
              clearTimeout(clearTimerRef.current);
              clearTimerRef.current = null;
            }
            try {
              const result = await uploadInboxFile(file);
              // Prevent false-positive UI if backend returned 200 but not a real stored upload.
              if (result && typeof result === "object" && "success" in result && result.success === false) {
                throw new Error(result.message ?? "Upload request accepted but file was not persisted.");
              }
              await reload();
              setUploadNotice({ variant: "success", text: "File uploaded successfully." });
              clearTimerRef.current = setTimeout(() => {
                setUploadNotice(null);
                clearTimerRef.current = null;
              }, 5000);
            } catch (e) {
              const msg =
                e instanceof ApiError
                  ? e.message
                  : e instanceof Error
                    ? e.message
                    : "Upload failed. Check network, CORS, auth, and tenant headers.";
              setUploadNotice({ variant: "error", text: msg });
            }
          }}
        />
      </Card>

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {loading ? (
        <Card className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : null}

      {!loading && !error && data.length === 0 ? (
        <EmptyState title="No files yet" description="New uploads will appear here automatically." />
      ) : null}

      {!loading && data.length > 0 ? <InboxTable data={data} /> : null}
    </div>
  );
}
