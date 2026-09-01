import { apiClient, ibkrAuthorizedFetch, IBKR_API_BASE, VAULT_API_BASE } from "../../../lib/api/client";
import type { CreateVaultAccountInput, UpdateVaultAccountInput, VaultAccount } from "../types/accounts";

type VaultAccountsResponse =
  | { items: Record<string, unknown>[] }
  | Record<string, unknown>[];

function mapAccount(raw: Record<string, unknown>): VaultAccount {
  // Supports both snake_case and camelCase payloads
  const get = (camel: string, snake: string) => (raw[camel] ?? raw[snake]) as unknown;

  return {
    id: String(get("id", "id")),
    tenantId: String(get("tenantId", "tenant_id") ?? ""),
    masterFundId: String(get("masterFundId", "master_fund_id") ?? ""),
    accountName: String(get("accountName", "account_name") ?? ""),
    accountType: get("accountType", "account_type") as VaultAccount["accountType"],
    sourceSystem: get("sourceSystem", "source_system") as VaultAccount["sourceSystem"],
    externalAccountId: (get("externalAccountId", "external_account_id") as string | null | undefined) ?? null,
    accountId: (get("accountId", "account_id") as string | null | undefined) ?? null,
    authToken: (get("authToken", "auth_token") as string | null | undefined) ?? null,
    queryId: (get("queryId", "query_id") as string | null | undefined) ?? null,
    serviceModel: String(get("serviceModel", "service_model") ?? "FULL_SERVICE"),
    baseCurrency: String(get("baseCurrency", "base_currency") ?? ""),
    assetClassesActive: get("assetClassesActive", "asset_classes_active"),
    ingestionConfig: (get("ingestionConfig", "ingestion_config") as string | null | undefined) ?? null,
    ingestionSchedule: get("ingestionSchedule", "ingestion_schedule") as VaultAccount["ingestionSchedule"],
    ingestionDayOfMonth: (get("ingestionDayOfMonth", "ingestion_day_of_month") as number | null | undefined) ?? null,
    emailInboxAddress: (get("emailInboxAddress", "email_inbox_address") as string | null | undefined) ?? null,
    status: get("status", "status") as VaultAccount["status"],
    lastIngestionAt: (get("lastIngestionAt", "last_ingestion_at") as string | null | undefined) ?? null,
    createdAt: String(get("createdAt", "created_at") ?? ""),
    updatedAt: String(get("updatedAt", "updated_at") ?? "")
  };
}

export function fetchVaultAccounts(signal?: AbortSignal) {
  return apiClient.get<VaultAccountsResponse>("/accounts", signal).then((res) => {
    if (res == null) {
      return [];
    }
    const list = Array.isArray(res) ? res : (res.items ?? []);
    return list.map((row) => mapAccount(row));
  });
}

export function createVaultAccount(input: CreateVaultAccountInput, signal?: AbortSignal) {
  return apiClient.post<VaultAccount>(
    "/accounts",
    JSON.stringify(input),
    {
      "Content-Type": "application/json"
    },
    signal
  );
}

export function updateVaultAccount(id: string, input: UpdateVaultAccountInput, signal?: AbortSignal) {
  return apiClient.put<VaultAccount>(
    `/accounts/${id}`,
    JSON.stringify(input),
    {
      "Content-Type": "application/json"
    },
    signal
  );
}

export type RefreshVaultAccountResult = {
  ok: boolean;
  action?: string;
  message?: string;
  accountId?: string;
  sourceSystem?: string;
  accountType?: string;
  result?: {
    tradesParsed?: number;
    positionsParsed?: number;
    cashParsed?: number;
    parsedRowsInserted?: number;
    rawFileId?: string | null;
    referenceCode?: string;
    symbolsParsed?: number;
    message?: string;
  };
};

/** Direct IBKR Flex sync (same backend handler as account refresh for IBKR broker accounts). */
export async function syncIbkrAccount(accountId: string, signal?: AbortSignal): Promise<RefreshVaultAccountResult> {
  console.info("[accounts] IBKR sync fallback", { url: `${IBKR_API_BASE}/sync`, accountId });
  const response = await ibkrAuthorizedFetch("/sync", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ accountId })
  });

  const text = await response.text();
  if (!response.ok) {
    let message = `IBKR sync failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (typeof parsed.error === "string") message = parsed.error;
      if (typeof parsed.message === "string") message = parsed.message;
    } catch {
      if (text.trim()) message = text.slice(0, 300);
    }
    throw new Error(message);
  }

  let payload: Record<string, unknown> = {};
  if (text.trim()) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }

  const results = Array.isArray(payload.results) ? payload.results : [];
  const first = (results[0] ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(first.ok ?? payload.ok ?? true),
    action: "IBKR_FLEX_SYNC",
    accountId,
    result: {
      tradesParsed: Number(first.tradesParsed ?? 0),
      positionsParsed: Number(first.positionsParsed ?? 0),
      cashParsed: Number(first.cashParsed ?? 0),
      parsedRowsInserted: Number(first.parsedRowsInserted ?? 0),
      rawFileId: (first.rawFileId as string | null | undefined) ?? null,
      referenceCode: (first.referenceCode as string | undefined) ?? undefined,
      symbolsParsed: Number(first.symbolsParsed ?? 0),
      message: typeof first.message === "string" ? first.message : undefined
    }
  };
}

/** Fetch IBKR Flex XML for this vault account (requires authToken + queryId). */
export async function refreshVaultAccount(id: string, signal?: AbortSignal): Promise<RefreshVaultAccountResult> {
  const refreshUrl = `${VAULT_API_BASE}/accounts/${id}/refresh`;
  console.info("[accounts] refresh request", { url: refreshUrl, accountId: id });
  try {
    const res = await apiClient.post<RefreshVaultAccountResult>(
      `/accounts/${id}/refresh`,
      JSON.stringify({}),
      {
        "Content-Type": "application/json"
      },
      signal
    );
    if (res && typeof res.ok === "boolean") {
      return res;
    }
    return { ok: true, accountId: id, action: "IBKR_FLEX_SYNC", result: res ?? undefined };
  } catch (err) {
    // Backward compatibility: older backends without /refresh — fall back to /api/v1/ibkr/sync.
    if (err instanceof Error && /cannot post|404|route may be missing/i.test(err.message)) {
      return syncIbkrAccount(id, signal);
    }
    throw err;
  }
}

