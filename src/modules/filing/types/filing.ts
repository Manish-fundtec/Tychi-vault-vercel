export interface Trade {
  id: string;
  tradeDate: string;
  security: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  netAmount: number;
  currency: string;
  glStatus: string;
}

export interface Position {
  id: string;
  tenantId: string;
  accountId: string;
  securityId: string;
  securityName?: string | null;
  positionDate: string;
  quantity: number;
  costBasis: number;
  costBasisPerUnit?: number | null;
  marketValue: number;
  unrealisedPnl: number;
  currency: string;
  source?: string | null;
  rawRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashTransaction {
  id: string;
  tenantId: string;
  accountId: string;
  securityId?: string | null;
  securityName?: string | null;
  transactionDate: string;
  settlementDate?: string | null;
  transactionType: string;
  amount: number;
  currency: string;
  description: string;
  sourceTransactionId?: string | null;
  source?: string | null;
  rawRecordId?: string | null;
  pushedToGl?: boolean | null;
  pushedToGlAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashBalance {
  id: string;
  tenantId: string;
  accountId: string;
  accountName?: string | null;
  accountSourceSystem?: string | null;
  balanceDate: string;
  currency: string;
  balance: number;
  source?: string | null;
  rawRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Price {
  id: string;
  tenantId: string;
  securityId: string;
  securityName?: string | null;
  priceDate: string;
  closePrice: number;
  currency: string;
  priceType: string;
  source?: string | null;
  rawRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FxRate {
  id: string;
  tenantId: string;
  rateDate: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateAction {
  id: string;
  tenantId: string;
  accountId: string;
  securityId: string;
  securityName?: string | null;
  actionType: string;
  exDate: string;
  recordDate?: string | null;
  payDate?: string | null;
  details: Record<string, unknown>;
  status: string;
  source?: string | null;
  rawRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityMaster {
  id: string;
  vaultId?: string | null;
  securityName: string;
  exchange?: string | null;
  idType?: string | null;
  idValue?: string | null;
  underlyingSecurityId?: string | null;
  contractMultiplier?: number | null;
  assetClass?: string | null;
  instrumentType?: string | null;
  currency?: string | null;
  country?: string | null;
  issuerId?: string | null;
  effectiveDate?: string | null;
  source?: string | null;
}

export interface InboxRawFileSummary {
  rawFileId: string;
  accountId?: string | null;
  accountName?: string | null;
  sourceSystem?: string | null;
  source?: string | null;
  ingestionChannel?: string | null;
  status?: string | null;
  recordCount: number;
  createdAt: string;
  fileName: string;
  recordTypes: string[];
}

export interface SecurityBatchSummary {
  accountId: string;
  accountName?: string | null;
  sourceSystem?: string | null;
  source?: string | null;
  ingestionChannel?: string | null;
  status?: string | null;
  rawFileStatus?: string | null;
  effectiveDate: string;
  securityCount: number;
}

export interface SecurityEquityRow {
  id: string;
  tenantId?: string | null;
  vaultId?: string | null;
  securityName?: string | null;
  assetClass?: string | null;
  instrumentType?: string | null;
  currency?: string | null;
  source?: string | null;
  effectiveDate?: string | null;
  knowledgeDate?: string | null;
  details: Record<string, unknown>;
}

export interface SecurityIdentifierRow {
  id: string;
  vaultId?: string | null;
  securityName?: string | null;
  assetClass?: string | null;
  instrumentType?: string | null;
  currency?: string | null;
  securitySource?: string | null;
  effectiveDate?: string | null;
  details: Record<string, unknown>;
}

export interface SecurityOptionRow {
  id: string;
  tenantId?: string | null;
  vaultId?: string | null;
  securityName?: string | null;
  assetClass?: string | null;
  instrumentType?: string | null;
  currency?: string | null;
  source?: string | null;
  effectiveDate?: string | null;
  knowledgeDate?: string | null;
  details: Record<string, unknown>;
}