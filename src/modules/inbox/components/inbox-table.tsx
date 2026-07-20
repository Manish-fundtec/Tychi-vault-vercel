import { useState } from "react";
import { Eye, Loader2, Trash2 } from "lucide-react";
import type { InboxFile } from "../types/inbox";
import { formatDate } from "../../../lib/utils";
import { Button } from "../../../components/ui/button";
import { InboxStatusBadge } from "./inbox-status-badge";
import { InboxFileViewerDrawer } from "./inbox-file-viewer";
import { DataTable, type DataTableColumn } from "../../../components/common/data-table";

type InboxTableProps = {
  data: InboxFile[];
  onDelete?: (file: InboxFile) => Promise<void>;
};

export function InboxTable({ data, onDelete }: InboxTableProps) {
  const [viewFile, setViewFile] = useState<InboxFile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const columns: DataTableColumn<InboxFile>[] = [
    {
      id: "fileName",
      header: "File Name",
      accessor: (r) => r.fileName,
      sortValue: (r) => r.fileName,
      cell: (r) => <span className="font-medium">{r.fileName || r.id}</span>,
      filterValue: (r) => `${r.fileName ?? ""} ${r.id}`
    },
    {
      id: "fileType",
      header: "Type",
      accessor: (r) => r.fileType ?? "",
      sortValue: (r) => r.fileType ?? "",
      cell: (r) => r.fileType || "-"
    },
    { id: "source", header: "Source", accessor: (r) => r.source, sortValue: (r) => r.source },
    { id: "channel", header: "From", accessor: (r) => r.channel, sortValue: (r) => r.channel },
    {
      id: "uploadedAt",
      header: "Uploaded",
      accessor: (r) => formatDate(r.uploadedAt),
      sortValue: (r) => new Date(r.uploadedAt).getTime()
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => r.status,
      sortValue: (r) => r.status,
      cell: (r) => <InboxStatusBadge status={r.status} />
    },
    {
      id: "recordCount",
      header: "Records",
      align: "right",
      accessor: (r) => r.recordCount,
      sortValue: (r) => r.recordCount,
      cell: (r) => <span className="tabular-nums">{r.recordCount.toLocaleString()}</span>
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            title="View file"
            aria-label={`View ${item.fileName}`}
            onClick={() => setViewFile(item)}
          >
            <Eye className="h-4 w-4" aria-hidden />
          </Button>
          {onDelete ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 border-red-200 p-0 text-red-700 hover:bg-red-50 hover:text-red-800"
              title="Delete file"
              aria-label={`Delete ${item.fileName}`}
              disabled={deletingId === item.id}
              onClick={async () => {
                const ok = window.confirm(
                  `Delete "${item.fileName}"?\n\nThis removes the inbox file and all related vault records (trades, positions, cash, buffers, etc.). This cannot be undone.`
                );
                if (!ok) return;
                setDeletingId(item.id);
                try {
                  await onDelete(item);
                  if (viewFile?.id === item.id) setViewFile(null);
                } finally {
                  setDeletingId(null);
                }
              }}
            >
              {deletingId === item.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
            </Button>
          ) : null}
          {item.status === "FAILED" ? <Button size="sm">Retry</Button> : null}
          {item.status === "PENDING_CONFIRMATION" ? <Button size="sm">Review</Button> : null}
        </div>
      )
    }
  ];

  return (
    <>
      <DataTable data={data} columns={columns} getRowId={(r) => r.id} />
      <InboxFileViewerDrawer open={viewFile != null} file={viewFile} onClose={() => setViewFile(null)} />
    </>
  );
}
