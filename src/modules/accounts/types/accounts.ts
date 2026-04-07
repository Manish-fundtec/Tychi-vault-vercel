export type AccountType = "BROKER" | "BANK" | "CUSTODIAN";
export type SourceSystem = "IBKR" | "DBS" | "MANUAL" | "FRANKFURTER";
export type IngestionSchedule = "DAILY_EOD" | "WEEKLY" | "MONTHLY" | "ON_DEMAND";
export type AccountStatus = "ACTIVE" | "INACTIVE" | "SETUP";

export interface VaultAccount {
  id: string;
  tenantId: string;
  masterFundId: string;
  accountName: string;
  accountType: AccountType;
  sourceSystem: SourceSystem;
  externalAccountId?: string | null;
  accountId?: string | null;
  authToken?: string | null;
  queryId?: string | null;
  serviceModel: string;
  baseCurrency: string;
  assetClassesActive?: unknown;
  ingestionConfig?: string | null;
  ingestionSchedule: IngestionSchedule;
  ingestionDayOfMonth?: number | null;
  emailInboxAddress?: string | null;
  status: AccountStatus;
  lastIngestionAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVaultAccountInput {
  masterFundId: string;
  accountName: string;
  accountType: AccountType;
  sourceSystem: SourceSystem;
  externalAccountId?: string;
  accountId?: string | null;
  authToken?: string | null;
  queryId?: string | null;
  baseCurrency: string;
  ingestionSchedule: IngestionSchedule;
  ingestionDayOfMonth?: string;
  emailInboxAddress?: string;
  status: AccountStatus;
}

export interface UpdateVaultAccountInput extends CreateVaultAccountInput {}

