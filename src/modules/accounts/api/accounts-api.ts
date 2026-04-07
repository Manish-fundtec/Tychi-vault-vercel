import { apiClient } from "../../../lib/api/client";
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

