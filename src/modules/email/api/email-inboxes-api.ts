import { apiClient } from "../../../lib/api/client";

export type EmailInboxRow = {
  id: string;
  email: string;
  /** Vault fund UUID (same as dashboard fund / x-fund-id). */
  fundId: string | null;
  label: string;
  status: "ACTIVE" | "PAUSED";
  createdAt: string;
};

type ListResponse = { items: Record<string, unknown>[] } | Record<string, unknown>[] | null;

function mapInbox(raw: Record<string, unknown>): EmailInboxRow {
  const get = (camel: string, snake: string) => (raw[camel] ?? raw[snake]) as unknown;
  const fid = get("fundId", "fund_id");
  return {
    id: String(get("id", "id")),
    email: String(get("email", "email_address") ?? ""),
    fundId: fid != null && String(fid).trim() ? String(fid) : null,
    label: String(get("label", "label") ?? ""),
    status: (get("status", "status") as EmailInboxRow["status"]) ?? "ACTIVE",
    createdAt: String(get("createdAt", "created_at") ?? "")
  };
}

export function fetchEmailInboxes(signal?: AbortSignal) {
  return apiClient.get<ListResponse>("/email-inboxes", signal).then((res) => {
    if (res == null) return [];
    const list = Array.isArray(res) ? res : (res.items ?? []);
    return list.map((row) => mapInbox(row));
  });
}

export type CreateEmailInboxInput = {
  emailAddress: string;
  label: string;
  /** Optional; backend prefers x-fund-id / dashboard token. */
  fundId?: string;
};

export function createEmailInbox(input: CreateEmailInboxInput, signal?: AbortSignal) {
  const body: Record<string, unknown> = {
    emailAddress: input.emailAddress,
    label: input.label
  };
  if (input.fundId?.trim()) {
    body.fundId = input.fundId.trim();
  }
  return apiClient.post<{ item: Record<string, unknown> }>(
    "/email-inboxes",
    JSON.stringify(body),
    { "Content-Type": "application/json" },
    signal
  );
}

export type UpdateEmailInboxInput = {
  label?: string;
  status?: "ACTIVE" | "PAUSED";
  fundId?: string;
};

export function updateEmailInbox(id: string, input: UpdateEmailInboxInput, signal?: AbortSignal) {
  const body: Record<string, unknown> = {};
  if (input.label !== undefined) body.label = input.label;
  if (input.status !== undefined) body.status = input.status;
  if (input.fundId !== undefined) body.fundId = input.fundId;
  return apiClient.patch<{ item: Record<string, unknown> }>(
    `/email-inboxes/${encodeURIComponent(id)}`,
    JSON.stringify(body),
    { "Content-Type": "application/json" },
    signal
  );
}
