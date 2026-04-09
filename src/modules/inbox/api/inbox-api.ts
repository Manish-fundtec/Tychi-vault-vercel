import { apiClient, vaultAuthorizedFetch, ApiError } from "../../../lib/api/client";
import type { InboxFile } from "../types/inbox";

async function readVaultErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return `Request failed (${res.status})`;
  try {
    const p = JSON.parse(trimmed) as { error?: string };
    if (typeof p.error === "string" && p.error.trim()) return p.error;
  } catch {
    /* ignore */
  }
  return trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
}

/** Raw bytes from S3 via vault API (`download` sets Content-Disposition attachment). */
export async function fetchInboxFileBlob(id: string, download: boolean, signal?: AbortSignal): Promise<Blob> {
  const q = download ? "?download=1" : "";
  const res = await vaultAuthorizedFetch(`/inbox/files/${encodeURIComponent(id)}/content${q}`, { signal });
  if (!res.ok) {
    const msg = await readVaultErrorMessage(res);
    throw new ApiError(msg, res.status);
  }
  return res.blob();
}

export async function fetchInboxFileText(id: string, signal?: AbortSignal): Promise<string> {
  const blob = await fetchInboxFileBlob(id, false, signal);
  return blob.text();
}

export function downloadBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadInboxFile(id: string, fileName: string, signal?: AbortSignal) {
  const blob = await fetchInboxFileBlob(id, true, signal);
  downloadBlobAsFile(blob, fileName);
}

type InboxFilesResponse =
  | { items: Record<string, unknown>[] }
  | Record<string, unknown>[];

function mapInboxFile(raw: Record<string, unknown>): InboxFile {
  const get = (camel: string, snake: string) => (raw[camel] ?? raw[snake]) as unknown;
  const channelRaw = get("channel", "channel") ?? get("ingestionChannel", "ingestion_channel");
  const inboxEmail = get("inboxEmail", "inbox_email");
  const s3Uri = get("s3Uri", "s3_uri");
  const errorMessage = get("errorMessage", "error_message");
  return {
    id: String(get("id", "id")),
    fileName: String(get("fileName", "file_name") ?? ""),
    fileType: (get("fileType", "file_type") as string | undefined) ?? undefined,
    source: get("source", "source") as InboxFile["source"],
    channel: channelRaw as InboxFile["channel"],
    uploadedAt: String(get("uploadedAt", "uploaded_at") ?? ""),
    status: get("status", "status") as InboxFile["status"],
    recordCount: Number(get("recordCount", "record_count") ?? 0),
    s3Uri: (typeof s3Uri === "string" ? s3Uri : null) ?? null,
    inboxEmail: inboxEmail != null && inboxEmail !== "" ? String(inboxEmail) : null,
    errorMessage: errorMessage != null && errorMessage !== "" ? String(errorMessage) : null
  };
}

export function fetchInboxFiles(signal?: AbortSignal) {
  return apiClient.get<InboxFilesResponse>("/inbox/files", signal).then((res) => {
    if (res == null) return [];
    const list = Array.isArray(res) ? res : (res.items ?? []);
    return list.map((row) => mapInboxFile(row));
  });
}

/**
 * Multipart upload: only `file` is sent. Do not append `accountId` here so
 * backend can persist `account_id` as null until you need it again.
 */
export function uploadInboxFile(file: File, signal?: AbortSignal) {
  const formData = new FormData();
  // Provide explicit filename for maximum compatibility across runtimes.
  formData.append("file", file, file.name);

  // Use raw fetch so we can detect HTML "success" responses (misrouted proxy, auth gateway, etc.)
  // that would otherwise look like a successful 200 to the generic JSON client.
  return (async () => {
    const res = await vaultAuthorizedFetch("/inbox/upload", { method: "POST", body: formData, signal });
    if (!res.ok) {
      const msg = await readVaultErrorMessage(res);
      throw new ApiError(msg, res.status);
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const text = await res.text();
    const trimmed = text.trim();

    if (contentType.includes("text/html")) {
      const msg = trimmed ? `Upload failed — server returned HTML: ${trimmed.slice(0, 200)}…` : "Upload failed — server returned HTML.";
      throw new ApiError(msg, 502);
    }

    if (!trimmed) {
      // Some backends return 200/204 with empty body on success.
      return { success: true } as { success?: boolean; message?: string; id?: string };
    }

    try {
      return JSON.parse(trimmed) as { success?: boolean; message?: string; id?: string };
    } catch {
      // Non-JSON but non-HTML response; consider it ambiguous rather than silently succeeding.
      const msg = trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;
      throw new ApiError(`Upload failed — unexpected response: ${msg}`, 502);
    }
  })();
}