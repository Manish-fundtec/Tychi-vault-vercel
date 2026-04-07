import { apiClient } from "../../../lib/api/client";

export type EmailInboxRow = {
  id: string;
  email: string;
  label: string;
  status: "ACTIVE" | "PAUSED";
  createdAt: string;
};

type ListResponse = { items: Record<string, unknown>[] } | Record<string, unknown>[] | null;

function mapInbox(raw: Record<string, unknown>): EmailInboxRow {
  const get = (camel: string, snake: string) => (raw[camel] ?? raw[snake]) as unknown;
  return {
    id: String(get("id", "id")),
    email: String(get("email", "email_address") ?? ""),
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
};

export function createEmailInbox(input: CreateEmailInboxInput, signal?: AbortSignal) {
  return apiClient.post<{ item: Record<string, unknown> }>(
    "/email-inboxes",
    JSON.stringify({
      emailAddress: input.emailAddress,
      label: input.label
    }),
    { "Content-Type": "application/json" },
    signal
  );
}
