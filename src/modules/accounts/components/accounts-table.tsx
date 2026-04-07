import { formatDate } from "../../../lib/utils";
import { Button } from "../../../components/ui/button";
import type { VaultAccount } from "../types/accounts";
import { AccountStatusBadge, AccountTypeBadge, SourceSystemBadge } from "./account-badges";
import { DataTable, type DataTableColumn } from "../../../components/common/data-table";

export function AccountsTable({ data, onEdit }: { data: VaultAccount[]; onEdit: (account: VaultAccount) => void }) {
  const columns: DataTableColumn<VaultAccount>[] = [
    {
      id: "accountName",
      header: "Account",
      accessor: (r) => r.accountName,
      sortValue: (r) => r.accountName,
      cell: (r) => <span className="font-medium">{r.accountName}</span>
    },
    { id: "masterFundId", header: "Master Fund", accessor: (r) => r.masterFundId, sortValue: (r) => r.masterFundId ?? "" },
    { id: "accountType", header: "Type", accessor: (r) => r.accountType, sortValue: (r) => r.accountType, cell: (r) => <AccountTypeBadge accountType={r.accountType} /> },
    {
      id: "sourceSystem",
      header: "Source",
      accessor: (r) => r.sourceSystem,
      sortValue: (r) => r.sourceSystem,
      cell: (r) => <SourceSystemBadge sourceSystem={r.sourceSystem} />
    },
    { id: "baseCurrency", header: "Base CCY", accessor: (r) => r.baseCurrency, sortValue: (r) => r.baseCurrency },
    {
      id: "ingestion",
      header: "Ingestion",
      accessor: (r) =>
        `${r.ingestionSchedule}${r.ingestionSchedule === "MONTHLY" && r.ingestionDayOfMonth ? ` (day ${r.ingestionDayOfMonth})` : ""}`,
      sortValue: (r) => `${r.ingestionSchedule}-${r.ingestionDayOfMonth ?? ""}`
    },
    { id: "accountId", header: "Account ID", accessor: (r) => r.accountId ?? "-", sortValue: (r) => r.accountId ?? "" },
    { id: "queryId", header: "Query ID", accessor: (r) => r.queryId ?? "-", sortValue: (r) => r.queryId ?? "" },
    {
      id: "authToken",
      header: "Auth Token",
      accessor: (r) => (r.authToken ? "********" : "-"),
      sortValue: (r) => (r.authToken ? 1 : 0)
    },
    { id: "email", header: "Email Inbox", accessor: (r) => r.emailInboxAddress ?? "-", sortValue: (r) => r.emailInboxAddress ?? "" },
    { id: "status", header: "Status", accessor: (r) => r.status, sortValue: (r) => r.status, cell: (r) => <AccountStatusBadge status={r.status} /> },
    {
      id: "lastIngestionAt",
      header: "Last Ingestion",
      accessor: (r) => (r.lastIngestionAt ? formatDate(r.lastIngestionAt) : "-"),
      sortValue: (r) => (r.lastIngestionAt ? new Date(r.lastIngestionAt).getTime() : 0)
    },
    {
      id: "createdAt",
      header: "Created",
      accessor: (r) => formatDate(r.createdAt),
      sortValue: (r) => new Date(r.createdAt).getTime()
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(r);
            }}
          >
            Edit
          </Button>
        </div>
      )
    }
  ];

  return (
    <DataTable data={data} columns={columns} getRowId={(r) => r.id} />
  );
}

