import { useState } from "react";
import type { InboxFile } from "../types/inbox";
import { formatDate } from "../../../lib/utils";
import { Button } from "../../../components/ui/button";
import { InboxStatusBadge } from "./inbox-status-badge";
import { InboxFileViewerDrawer } from "./inbox-file-viewer";
import { DataTable, type DataTableColumn } from "../../../components/common/data-table";

export function InboxTable({ data }: { data: InboxFile[] }) {
  const [viewFile, setViewFile] = useState<InboxFile | null>(null);

  const columns: DataTableColumn<InboxFile>[] = [
    {
      id: "fileName",
      header: "File",
      accessor: (r) => r.fileName,
      sortValue: (r) => r.fileName,
      cell: (r) => <span className="font-medium">{r.fileName}</span>
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
          <Button variant="outline" size="sm" onClick={() => setViewFile(item)}>
            View
          </Button>
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