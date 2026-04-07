import { Badge } from "../../../components/ui/badge";
import type { InboxStatus } from "../types/inbox";

const statusClassNames: Record<InboxStatus, string> = {
  RECEIVED: "bg-slate-100 text-slate-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  PROCESSED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  PENDING_CONFIRMATION: "bg-amber-100 text-amber-700"
};

export function InboxStatusBadge({ status }: { status: InboxStatus }) {
  return <Badge className={statusClassNames[status]}>{status}</Badge>;
}