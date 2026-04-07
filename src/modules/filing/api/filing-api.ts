import { apiClient } from "../../../lib/api/client";
import type {
  CashBalance,
  CashTransaction,
  CorporateAction,
  FxRate,
  InboxRawFileSummary,
  Position,
  Price,
  SecurityBatchSummary,
  SecurityEquityRow,
  SecurityIdentifierRow,
  SecurityMaster,
  SecurityOptionRow,
  Trade
} from "../types/filing";

type PagedListResponse = { items: Record<string, unknown>[]; limit?: number; offset?: number };
type ListResponse = PagedListResponse | Record<string, unknown>[];

const unwrap = (res: ListResponse | null) => (res == null ? [] : Array.isArray(res) ? res : (res.items ?? []));

type PagedResult<T> = { items: T[]; limit: number; offset: number };
function unwrapPaged(res: ListResponse | null) {
  if (res == null) return { items: [], limit: 0, offset: 0 };
  if (Array.isArray(res)) return { items: res, limit: res.length, offset: 0 };
  return { items: res.items ?? [], limit: Number(res.limit ?? 0), offset: Number(res.offset ?? 0) };
}

function get(raw: Record<string, unknown>, camel: string, snake: string) {
  return (raw[camel] ?? raw[snake]) as unknown;
}

function pickDetails(raw: Record<string, unknown>, knownKeys: string[]) {
  const known = new Set(knownKeys);
  const details: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!known.has(k)) details[k] = v;
  }
  return details;
}

function mapTrade(raw: Record<string, unknown>): Trade {
  return {
    id: String(get(raw, "id", "id")),
    tradeDate: String(get(raw, "tradeDate", "trade_date") ?? ""),
    security: String(get(raw, "security", "security") ?? get(raw, "securityName", "security_name") ?? ""),
    type: (get(raw, "type", "type") ?? get(raw, "side", "side") ?? get(raw, "tradeType", "trade_type")) as Trade["type"],
    quantity: Number(get(raw, "quantity", "quantity") ?? 0),
    price: Number(get(raw, "price", "price") ?? 0),
    netAmount: Number(get(raw, "netAmount", "net_amount") ?? 0),
    currency: String(
      get(raw, "currency", "currency") ?? get(raw, "tradeCurrency", "trade_currency") ?? get(raw, "baseCurrency", "base_currency") ?? ""
    ),
    glStatus: String(get(raw, "glStatus", "gl_status") ?? "")
  };
}

function mapPosition(raw: Record<string, unknown>): Position {
  return {
    id: String(get(raw, "id", "id")),
    tenantId: String(get(raw, "tenantId", "tenant_id") ?? ""),
    accountId: String(get(raw, "accountId", "account_id") ?? ""),
    securityId: String(get(raw, "securityId", "security_id") ?? ""),
    securityName: (get(raw, "securityName", "security_name") as string | null | undefined) ?? null,
    positionDate: String(get(raw, "positionDate", "position_date") ?? ""),
    quantity: Number(get(raw, "quantity", "quantity") ?? 0),
    costBasis: Number(get(raw, "costBasis", "cost_basis") ?? 0),
    costBasisPerUnit: (get(raw, "costBasisPerUnit", "cost_basis_per_unit") as number | null | undefined) ?? null,
    marketValue: Number(get(raw, "marketValue", "market_value") ?? 0),
    unrealisedPnl: Number(get(raw, "unrealisedPnl", "unrealised_pnl") ?? get(raw, "unrealizedPnl", "unrealized_pnl") ?? 0),
    currency: String(get(raw, "currency", "currency") ?? ""),
    source: (get(raw, "source", "source") as string | null | undefined) ?? null,
    rawRecordId: (get(raw, "rawRecordId", "raw_record_id") as string | null | undefined) ?? null,
    createdAt: String(get(raw, "createdAt", "created_at") ?? ""),
    updatedAt: String(get(raw, "updatedAt", "updated_at") ?? "")
  };
}

function mapCashTransaction(raw: Record<string, unknown>): CashTransaction {
  return {
    id: String(get(raw, "id", "id")),
    tenantId: String(get(raw, "tenantId", "tenant_id") ?? ""),
    accountId: String(get(raw, "accountId", "account_id") ?? ""),
    securityId: (get(raw, "securityId", "security_id") as string | null | undefined) ?? null,
    securityName: (get(raw, "securityName", "security_name") as string | null | undefined) ?? null,
    transactionDate: String(get(raw, "transactionDate", "transaction_date") ?? ""),
    settlementDate: (get(raw, "settlementDate", "settlement_date") as string | null | undefined) ?? null,
    transactionType: String(get(raw, "transactionType", "transaction_type") ?? ""),
    amount: Number(get(raw, "amount", "amount") ?? 0),
    currency: String(get(raw, "currency", "currency") ?? ""),
    description: String(get(raw, "description", "description") ?? ""),
    sourceTransactionId: (get(raw, "sourceTransactionId", "source_transaction_id") as string | null | undefined) ?? null,
    source: (get(raw, "source", "source") as string | null | undefined) ?? null,
    rawRecordId: (get(raw, "rawRecordId", "raw_record_id") as string | null | undefined) ?? null,
    pushedToGl: (get(raw, "pushedToGl", "pushed_to_gl") as boolean | null | undefined) ?? null,
    pushedToGlAt: (get(raw, "pushedToGlAt", "pushed_to_gl_at") as string | null | undefined) ?? null,
    createdAt: String(get(raw, "createdAt", "created_at") ?? ""),
    updatedAt: String(get(raw, "updatedAt", "updated_at") ?? "")
  };
}

function mapCashBalance(raw: Record<string, unknown>): CashBalance {
  return {
    id: String(get(raw, "id", "id")),
    tenantId: String(get(raw, "tenantId", "tenant_id") ?? ""),
    accountId: String(get(raw, "accountId", "account_id") ?? ""),
    accountName: (get(raw, "accountName", "account_name") as string | null | undefined) ?? null,
    accountSourceSystem: (get(raw, "accountSourceSystem", "account_source_system") as string | null | undefined) ?? null,
    balanceDate: String(get(raw, "balanceDate", "balance_date") ?? ""),
    currency: String(get(raw, "currency", "currency") ?? ""),
    balance: Number(get(raw, "balance", "balance") ?? get(raw, "amount", "amount") ?? 0),
    source: (get(raw, "source", "source") as string | null | undefined) ?? null,
    rawRecordId: (get(raw, "rawRecordId", "raw_record_id") as string | null | undefined) ?? null,
    createdAt: String(get(raw, "createdAt", "created_at") ?? ""),
    updatedAt: String(get(raw, "updatedAt", "updated_at") ?? "")
  };
}

function mapPrice(raw: Record<string, unknown>): Price {
  return {
    id: String(get(raw, "id", "id")),
    tenantId: String(get(raw, "tenantId", "tenant_id") ?? ""),
    securityId: String(get(raw, "securityId", "security_id") ?? ""),
    securityName: (get(raw, "securityName", "security_name") as string | null | undefined) ?? null,
    priceDate: String(get(raw, "priceDate", "price_date") ?? ""),
    closePrice: Number(get(raw, "closePrice", "close_price") ?? 0),
    currency: String(get(raw, "currency", "currency") ?? ""),
    priceType: String(get(raw, "priceType", "price_type") ?? ""),
    source: (get(raw, "source", "source") as string | null | undefined) ?? null,
    rawRecordId: (get(raw, "rawRecordId", "raw_record_id") as string | null | undefined) ?? null,
    createdAt: String(get(raw, "createdAt", "created_at") ?? ""),
    updatedAt: String(get(raw, "updatedAt", "updated_at") ?? "")
  };
}

function mapFxRate(raw: Record<string, unknown>): FxRate {
  return {
    id: String(get(raw, "id", "id")),
    tenantId: String(get(raw, "tenantId", "tenant_id") ?? ""),
    rateDate: String(get(raw, "rateDate", "rate_date") ?? ""),
    baseCurrency: String(get(raw, "baseCurrency", "base_currency") ?? ""),
    quoteCurrency: String(get(raw, "quoteCurrency", "quote_currency") ?? ""),
    rate: Number(get(raw, "rate", "rate") ?? 0),
    source: (get(raw, "source", "source") as string | null | undefined) ?? null,
    createdAt: String(get(raw, "createdAt", "created_at") ?? ""),
    updatedAt: String(get(raw, "updatedAt", "updated_at") ?? "")
  };
}

function mapCorporateAction(raw: Record<string, unknown>): CorporateAction {
  const details = (get(raw, "details", "details") as Record<string, unknown> | null | undefined) ?? {};
  return {
    id: String(get(raw, "id", "id")),
    tenantId: String(get(raw, "tenantId", "tenant_id") ?? ""),
    accountId: String(get(raw, "accountId", "account_id") ?? ""),
    securityId: String(get(raw, "securityId", "security_id") ?? ""),
    securityName: (get(raw, "securityName", "security_name") as string | null | undefined) ?? null,
    actionType: String(get(raw, "actionType", "action_type") ?? ""),
    exDate: String(get(raw, "exDate", "ex_date") ?? ""),
    recordDate: (get(raw, "recordDate", "record_date") as string | null | undefined) ?? null,
    payDate: (get(raw, "payDate", "pay_date") as string | null | undefined) ?? null,
    details,
    status: String(get(raw, "status", "status") ?? ""),
    source: (get(raw, "source", "source") as string | null | undefined) ?? null,
    rawRecordId: (get(raw, "rawRecordId", "raw_record_id") as string | null | undefined) ?? null,
    createdAt: String(get(raw, "createdAt", "created_at") ?? ""),
    updatedAt: String(get(raw, "updatedAt", "updated_at") ?? "")
  };
}

function mapSecurity(raw: Record<string, unknown>): SecurityMaster {
  const vaultId = (get(raw, "vaultId", "vault_id") as string | null | undefined) ?? null;
  return {
    // Some backends don't return `id` for securities lists; fall back to vault_id.
    id: String((get(raw, "id", "id") as string | null | undefined) ?? vaultId ?? ""),
    vaultId,
    securityName: String(get(raw, "securityName", "security_name") ?? get(raw, "name", "name") ?? ""),
    exchange: (get(raw, "exchange", "exchange") as string | null | undefined) ?? null,
    idType: (get(raw, "idType", "id_type") as string | null | undefined) ?? null,
    idValue: (get(raw, "idValue", "id_value") as string | null | undefined) ?? null,
    underlyingSecurityId: (get(raw, "underlyingSecurityId", "underlying_security_id") as string | null | undefined) ?? null,
    contractMultiplier: (get(raw, "contractMultiplier", "contract_multiplier") as number | null | undefined) ?? null,
    assetClass: (get(raw, "assetClass", "asset_class") as string | null | undefined) ?? null,
    instrumentType: (get(raw, "instrumentType", "instrument_type") as string | null | undefined) ?? null,
    currency: (get(raw, "currency", "currency") as string | null | undefined) ?? null,
    country: (get(raw, "country", "country") as string | null | undefined) ?? null,
    issuerId: (get(raw, "issuerId", "issuer_id") as string | null | undefined) ?? null,
    effectiveDate: (get(raw, "effectiveDate", "effective_date") as string | null | undefined) ?? null,
    source: (get(raw, "source", "source") as string | null | undefined) ?? null
  };
}

function mapInboxFileSummary(raw: Record<string, unknown>): InboxRawFileSummary {
  const recordTypesRaw = get(raw, "recordTypes", "record_types");
  const recordTypes = Array.isArray(recordTypesRaw)
    ? recordTypesRaw.filter((x): x is string => typeof x === "string")
    : [];

  return {
    rawFileId: String(get(raw, "rawFileId", "raw_file_id") ?? ""),
    accountId: (get(raw, "accountId", "account_id") as string | null | undefined) ?? null,
    accountName: (get(raw, "accountName", "account_name") as string | null | undefined) ?? null,
    sourceSystem: (get(raw, "sourceSystem", "source_system") as string | null | undefined) ?? null,
    source: (get(raw, "source", "source") as string | null | undefined) ?? null,
    ingestionChannel: (get(raw, "ingestionChannel", "ingestion_channel") as string | null | undefined) ?? null,
    status: (get(raw, "status", "status") as string | null | undefined) ?? null,
    recordCount: Number(get(raw, "recordCount", "record_count") ?? 0),
    createdAt: String(get(raw, "createdAt", "created_at") ?? ""),
    fileName: String(get(raw, "fileName", "file_name") ?? ""),
    recordTypes
  };
}

function mapSecurityBatchSummary(raw: Record<string, unknown>): SecurityBatchSummary {
  return {
    accountId: String(get(raw, "accountId", "account_id") ?? ""),
    accountName: (get(raw, "accountName", "account_name") as string | null | undefined) ?? null,
    sourceSystem: (get(raw, "sourceSystem", "source_system") as string | null | undefined) ?? null,
    source: (get(raw, "source", "source") as string | null | undefined) ?? null,
    ingestionChannel: (get(raw, "ingestionChannel", "ingestion_channel") as string | null | undefined) ?? null,
    status: (get(raw, "status", "status") as string | null | undefined) ?? null,
    rawFileStatus: (get(raw, "rawFileStatus", "raw_file_status") as string | null | undefined) ?? null,
    effectiveDate: String(get(raw, "effectiveDate", "effective_date") ?? ""),
    securityCount: Number(get(raw, "securityCount", "security_count") ?? 0)
  };
}

function mapSecurityEquity(raw: Record<string, unknown>): SecurityEquityRow {
  const known = [
    "id",
    "tenantId",
    "tenant_id",
    "vaultId",
    "vault_id",
    "securityName",
    "security_name",
    "assetClass",
    "asset_class",
    "instrumentType",
    "instrument_type",
    "currency",
    "source",
    "effectiveDate",
    "effective_date",
    "knowledgeDate",
    "knowledge_date"
  ];
  const vaultId = (get(raw, "vaultId", "vault_id") as string | null | undefined) ?? null;
  return {
    id: String((get(raw, "id", "id") as string | null | undefined) ?? vaultId ?? ""),
    tenantId: (get(raw, "tenantId", "tenant_id") as string | null | undefined) ?? null,
    vaultId,
    securityName: (get(raw, "securityName", "security_name") as string | null | undefined) ?? null,
    assetClass: (get(raw, "assetClass", "asset_class") as string | null | undefined) ?? null,
    instrumentType: (get(raw, "instrumentType", "instrument_type") as string | null | undefined) ?? null,
    currency: (get(raw, "currency", "currency") as string | null | undefined) ?? null,
    source: (get(raw, "source", "source") as string | null | undefined) ?? null,
    effectiveDate: (get(raw, "effectiveDate", "effective_date") as string | null | undefined) ?? null,
    knowledgeDate: (get(raw, "knowledgeDate", "knowledge_date") as string | null | undefined) ?? null,
    details: pickDetails(raw, known)
  };
}

function mapSecurityIdentifier(raw: Record<string, unknown>): SecurityIdentifierRow {
  const known = [
    "id",
    "vaultId",
    "vault_id",
    "securityName",
    "security_name",
    "assetClass",
    "asset_class",
    "instrumentType",
    "instrument_type",
    "currency",
    "securitySource",
    "security_source",
    "effectiveDate",
    "effective_date"
  ];
  const vaultId = (get(raw, "vaultId", "vault_id") as string | null | undefined) ?? null;
  return {
    id: String((get(raw, "id", "id") as string | null | undefined) ?? vaultId ?? ""),
    vaultId,
    securityName: (get(raw, "securityName", "security_name") as string | null | undefined) ?? null,
    assetClass: (get(raw, "assetClass", "asset_class") as string | null | undefined) ?? null,
    instrumentType: (get(raw, "instrumentType", "instrument_type") as string | null | undefined) ?? null,
    currency: (get(raw, "currency", "currency") as string | null | undefined) ?? null,
    securitySource: (get(raw, "securitySource", "security_source") as string | null | undefined) ?? null,
    effectiveDate: (get(raw, "effectiveDate", "effective_date") as string | null | undefined) ?? null,
    details: pickDetails(raw, known)
  };
}

function mapSecurityOption(raw: Record<string, unknown>): SecurityOptionRow {
  const known = [
    "id",
    "tenantId",
    "tenant_id",
    "vaultId",
    "vault_id",
    "securityName",
    "security_name",
    "assetClass",
    "asset_class",
    "instrumentType",
    "instrument_type",
    "currency",
    "source",
    "effectiveDate",
    "effective_date",
    "knowledgeDate",
    "knowledge_date"
  ];
  const vaultId = (get(raw, "vaultId", "vault_id") as string | null | undefined) ?? null;
  return {
    id: String((get(raw, "id", "id") as string | null | undefined) ?? vaultId ?? ""),
    tenantId: (get(raw, "tenantId", "tenant_id") as string | null | undefined) ?? null,
    vaultId,
    securityName: (get(raw, "securityName", "security_name") as string | null | undefined) ?? null,
    assetClass: (get(raw, "assetClass", "asset_class") as string | null | undefined) ?? null,
    instrumentType: (get(raw, "instrumentType", "instrument_type") as string | null | undefined) ?? null,
    currency: (get(raw, "currency", "currency") as string | null | undefined) ?? null,
    source: (get(raw, "source", "source") as string | null | undefined) ?? null,
    effectiveDate: (get(raw, "effectiveDate", "effective_date") as string | null | undefined) ?? null,
    knowledgeDate: (get(raw, "knowledgeDate", "knowledge_date") as string | null | undefined) ?? null,
    details: pickDetails(raw, known)
  };
}

export const filingApi = {
  getTrades: (
    params?: { from?: string; to?: string; accountId?: string; limit?: number; offset?: number },
    signal?: AbortSignal
  ) => {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.accountId) query.set("accountId", params.accountId);
    query.set("limit", String(params?.limit ?? 100));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient
      .get<ListResponse>(`/filing-cabinet/trades${qs ? `?${qs}` : ""}`, signal)
      .then((r) => unwrap(r).map((row) => mapTrade(row)));
  },
  getTradesForRawFile: (rawFileId: string, params?: { limit?: number; offset?: number }, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    query.set("limit", String(params?.limit ?? 100));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient
      .get<ListResponse>(`/filing-cabinet/files/${encodeURIComponent(rawFileId)}/trades?${qs}`, signal)
      .then((r) => unwrap(r).map((row) => mapTrade(row)));
  },
  getPositions: (
    params?: { accountId?: string; from?: string; to?: string; limit?: number; offset?: number },
    signal?: AbortSignal
  ): Promise<PagedResult<Position>> => {
    const query = new URLSearchParams();
    if (params?.accountId) query.set("accountId", params.accountId);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    query.set("limit", String(params?.limit ?? 100));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient.get<ListResponse>(`/filing-cabinet/positions${qs ? `?${qs}` : ""}`, signal).then((r) => {
      const u = unwrapPaged(r);
      return { limit: u.limit, offset: u.offset, items: u.items.map((row) => mapPosition(row)) };
    });
  },
  getCashTransactions: (
    params?: { accountId?: string; from?: string; to?: string; limit?: number; offset?: number },
    signal?: AbortSignal
  ): Promise<PagedResult<CashTransaction>> => {
    const query = new URLSearchParams();
    if (params?.accountId) query.set("accountId", params.accountId);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    query.set("limit", String(params?.limit ?? 100));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient.get<ListResponse>(`/filing-cabinet/cash-transactions${qs ? `?${qs}` : ""}`, signal).then((r) => {
      const u = unwrapPaged(r);
      return { limit: u.limit, offset: u.offset, items: u.items.map((row) => mapCashTransaction(row)) };
    });
  },
  getCashBalances: (
    params?: { accountId?: string; from?: string; to?: string; limit?: number; offset?: number },
    signal?: AbortSignal
  ): Promise<PagedResult<CashBalance>> => {
    const query = new URLSearchParams();
    if (params?.accountId) query.set("accountId", params.accountId);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    query.set("limit", String(params?.limit ?? 100));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient.get<ListResponse>(`/filing-cabinet/cash-balances${qs ? `?${qs}` : ""}`, signal).then((r) => {
      const u = unwrapPaged(r);
      return { limit: u.limit, offset: u.offset, items: u.items.map((row) => mapCashBalance(row)) };
    });
  },
  getPrices: (
    params?: { securityId?: string; from?: string; to?: string; limit?: number; offset?: number },
    signal?: AbortSignal
  ): Promise<PagedResult<Price>> => {
    const query = new URLSearchParams();
    if (params?.securityId) query.set("securityId", params.securityId);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    query.set("limit", String(params?.limit ?? 100));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient.get<ListResponse>(`/filing-cabinet/prices${qs ? `?${qs}` : ""}`, signal).then((r) => {
      const u = unwrapPaged(r);
      return { limit: u.limit, offset: u.offset, items: u.items.map((row) => mapPrice(row)) };
    });
  },
  getFxRates: (
    params?: { base?: string; quote?: string; from?: string; to?: string; limit?: number; offset?: number },
    signal?: AbortSignal
  ): Promise<PagedResult<FxRate>> => {
    const query = new URLSearchParams();
    if (params?.base) query.set("base", params.base);
    if (params?.quote) query.set("quote", params.quote);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    query.set("limit", String(params?.limit ?? 100));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient.get<ListResponse>(`/filing-cabinet/fx-rates${qs ? `?${qs}` : ""}`, signal).then((r) => {
      const u = unwrapPaged(r);
      return { limit: u.limit, offset: u.offset, items: u.items.map((row) => mapFxRate(row)) };
    });
  },
  getCorporateActions: (
    params?: { accountId?: string; securityId?: string; from?: string; to?: string; limit?: number; offset?: number },
    signal?: AbortSignal
  ): Promise<PagedResult<CorporateAction>> => {
    const query = new URLSearchParams();
    if (params?.accountId) query.set("accountId", params.accountId);
    if (params?.securityId) query.set("securityId", params.securityId);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    query.set("limit", String(params?.limit ?? 100));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient.get<ListResponse>(`/filing-cabinet/corporate-actions${qs ? `?${qs}` : ""}`, signal).then((r) => {
      const u = unwrapPaged(r);
      return { limit: u.limit, offset: u.offset, items: u.items.map((row) => mapCorporateAction(row)) };
    });
  },
  getSecurities: (
    params?: { accountId?: string; limit?: number; offset?: number },
    signal?: AbortSignal
  ) => {
    const query = new URLSearchParams();
    if (params?.accountId) query.set("accountId", params.accountId);
    query.set("limit", String(params?.limit ?? 100));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient
      .get<ListResponse>(`/filing-cabinet/securities${qs ? `?${qs}` : ""}`, signal)
      .then((r) => unwrap(r).map((row) => mapSecurity(row)));
  },
  getSecurityBatches: (params?: { accountId?: string; limit?: number; offset?: number }, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params?.accountId) query.set("accountId", params.accountId);
    query.set("limit", String(params?.limit ?? 50));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient
      .get<ListResponse>(`/filing-cabinet/security-batches${qs ? `?${qs}` : ""}`, signal)
      .then((r) => unwrap(r).map((row) => mapSecurityBatchSummary(row)));
  },
  getSecuritiesForBatch: (
    source: string,
    effectiveDate: string,
    params?: { limit?: number; offset?: number },
    signal?: AbortSignal
  ) => {
    const query = new URLSearchParams();
    query.set("limit", String(params?.limit ?? 200));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient
      .get<ListResponse>(
        `/filing-cabinet/security-batches/${encodeURIComponent(source)}/${encodeURIComponent(effectiveDate)}/securities?${qs}`,
        signal
      )
      .then((r) => unwrap(r).map((row) => mapSecurity(row)));
  },
  getSecurityEquities: (params?: { securityId?: string; limit?: number; offset?: number }, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params?.securityId) query.set("securityId", params.securityId);
    query.set("limit", String(params?.limit ?? 500));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient
      .get<ListResponse>(`/filing-cabinet/security-equities${qs ? `?${qs}` : ""}`, signal)
      .then((r) => unwrap(r).map((row) => mapSecurityEquity(row)));
  },
  getSecurityIdentifiers: (params?: { securityId?: string; limit?: number; offset?: number }, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params?.securityId) query.set("securityId", params.securityId);
    query.set("limit", String(params?.limit ?? 500));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient
      .get<ListResponse>(`/filing-cabinet/security-identifiers${qs ? `?${qs}` : ""}`, signal)
      .then((r) => unwrap(r).map((row) => mapSecurityIdentifier(row)));
  },
  getSecurityOptions: (params?: { securityId?: string; limit?: number; offset?: number }, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params?.securityId) query.set("securityId", params.securityId);
    query.set("limit", String(params?.limit ?? 500));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient
      .get<ListResponse>(`/filing-cabinet/security-options${qs ? `?${qs}` : ""}`, signal)
      .then((r) => unwrap(r).map((row) => mapSecurityOption(row)));
  },
  getInboxRawFiles: (
    params?: { accountId?: string; limit?: number; offset?: number },
    signal?: AbortSignal
  ) => {
    const query = new URLSearchParams();
    if (params?.accountId) query.set("accountId", params.accountId);
    query.set("limit", String(params?.limit ?? 50));
    query.set("offset", String(params?.offset ?? 0));
    const qs = query.toString();
    return apiClient
      .get<ListResponse>(`/filing-cabinet/files${qs ? `?${qs}` : ""}`, signal)
      .then((r) => unwrap(r).map((row) => mapInboxFileSummary(row)));
  }
};