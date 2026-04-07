import { Badge } from "../../../components/ui/badge";
import type { AccountStatus, AccountType, SourceSystem } from "../types/accounts";

const statusClasses: Record<AccountStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-slate-100 text-slate-700",
  SETUP: "bg-amber-100 text-amber-700"
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <Badge className={statusClasses[status]}>{status}</Badge>;
}

const typeClasses: Record<AccountType, string> = {
  BROKER: "bg-blue-100 text-blue-700",
  BANK: "bg-indigo-100 text-indigo-700",
  CUSTODIAN: "bg-violet-100 text-violet-700"
};

export function AccountTypeBadge({ accountType }: { accountType: AccountType }) {
  return <Badge className={typeClasses[accountType]}>{accountType}</Badge>;
}

const sourceClasses: Record<SourceSystem, string> = {
  IBKR: "bg-slate-100 text-slate-700",
  DBS: "bg-slate-100 text-slate-700",
  MANUAL: "bg-slate-100 text-slate-700",
  FRANKFURTER: "bg-slate-100 text-slate-700"
};

export function SourceSystemBadge({ sourceSystem }: { sourceSystem: SourceSystem }) {
  return <Badge className={sourceClasses[sourceSystem]}>{sourceSystem}</Badge>;
}

