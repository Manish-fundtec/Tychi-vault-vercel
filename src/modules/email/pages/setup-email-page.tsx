import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Drawer } from "../../../components/ui/drawer";
import { Skeleton } from "../../../components/ui/skeleton";
import { EmptyState } from "../../../components/common/empty-state";
import { ErrorState } from "../../../components/common/error-state";
import { Page, PageHeader, Section } from "../../../components/common/page";
import { DataTable, type DataTableColumn } from "../../../components/common/data-table";
import { ApiError } from "../../../lib/api/client";
import { deleteInboxFile } from "../../inbox/api/inbox-api";
import { InboxTable } from "../../inbox/components/inbox-table";
import { useInboxFiles } from "../../inbox/hooks/use-inbox-files";
import {
  createEmailInbox,
  fetchEmailInboxes,
  updateEmailInbox,
  type EmailInboxRow
} from "../api/email-inboxes-api";

type EmailInbox = EmailInboxRow;

function shortenId(id: string | null | undefined, len = 8): string {
  if (!id) return "—";
  const s = String(id).trim();
  if (s.length <= len + 4) return s;
  return `${s.slice(0, len)}…`;
}

/** Same source as api client: dashboard JWT → localStorage fundId */
function resolveFundHint(): string | null {
  try {
    const dash = localStorage.getItem("dashboardToken") ?? localStorage.getItem("dashboard_token");
    if (dash) {
      const parts = dash.split(".");
      const payload = parts[1];
      if (payload) {
        const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
        const v = json?.fund_id;
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
  } catch {
    /* ignore */
  }
  const raw = localStorage.getItem("fundId") ?? localStorage.getItem("fund_id");
  return raw?.trim() || null;
}

export function SetupEmailPage() {
  const fundHint = useMemo(() => resolveFundHint(), []);

  const [inboxes, setInboxes] = useState<EmailInbox[]>([]);
  const [inboxesLoading, setInboxesLoading] = useState(true);
  const [inboxesError, setInboxesError] = useState<string | null>(null);

  const {
    data: rawFiles,
    loading: rawFilesLoading,
    error: rawFilesError,
    reload: reloadRawFiles
  } = useInboxFiles();

  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EmailInbox | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "PAUSED">("ACTIVE");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadInboxes = useCallback(async () => {
    setInboxesLoading(true);
    setInboxesError(null);
    try {
      const rows = await fetchEmailInboxes();
      setInboxes(rows);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not load inboxes";
      setInboxesError(msg);
      setInboxes([]);
    } finally {
      setInboxesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInboxes();
  }, [loadInboxes]);

  const inboxColumns: DataTableColumn<EmailInbox>[] = useMemo(
    () => [
      {
        id: "email",
        header: "Sender email",
        sortValue: (r) => r.email,
        cell: (r) => <span className="font-medium">{r.email}</span>
      },
      {
        id: "fundId",
        header: "Fund ID",
        sortValue: (r) => r.fundId ?? "",
        cell: (r) => (
          <span className="font-mono text-xs text-muted-foreground" title={r.fundId ?? ""}>
            {shortenId(r.fundId, 12)}
          </span>
        )
      },
      { id: "label", header: "Label", sortValue: (r) => r.label, accessor: (r) => r.label },
      {
        id: "status",
        header: "Status",
        sortValue: (r) => r.status,
        cell: (r) => (
          <Badge className={r.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}>
            {r.status}
          </Badge>
        )
      },
      {
        id: "createdAt",
        header: "Created",
        sortValue: (r) => new Date(r.createdAt).getTime(),
        cell: (r) => new Date(r.createdAt).toLocaleString()
      },
      {
        id: "actions",
        header: "",
        sortValue: () => "",
        cell: (r) => (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setEditing(r);
              setEditLabel(r.label);
              setEditStatus(r.status);
              setEditError(null);
              setEditOpen(true);
            }}
          >
            Edit
          </Button>
        )
      }
    ],
    []
  );

  return (
    <Page>
      <PageHeader
        title="Setup Email"
        description="Register trusted sender addresses per fund. New rows use the current dashboard fund (x-fund-id)."
        right={
          <Button onClick={() => setAddOpen(true)}>
            Add email
          </Button>
        }
      />

      {!fundHint ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No fund in session — open this app from the dashboard or set <code className="rounded bg-amber-100 px-1">fundId</code> / dashboard token so API calls include <strong>x-fund-id</strong>.
        </p>
      ) : null}

      <Section title="Inboxes">
        {inboxesError ? (
          <p className="text-sm text-destructive">{inboxesError}</p>
        ) : null}
        {inboxesLoading ? (
          <p className="text-sm text-muted-foreground">Loading inboxes…</p>
        ) : inboxes.length === 0 && !inboxesError ? (
          <EmptyState title="No inboxes for this fund" description="Add a sender email linked to the current fund." />
        ) : (
          <DataTable data={inboxes} columns={inboxColumns} getRowId={(r) => r.id} initialPageSize={10} />
        )}
      </Section>

      <Section
        title="Incoming reports"
        description="Same list as Inbox — file name, source, channel, upload time, status, and record count (inbox_raw_files)."
      >
        {rawFilesError ? (
          <ErrorState message={rawFilesError} onRetry={() => void reloadRawFiles()} />
        ) : null}
        {rawFilesLoading ? (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}
        {!rawFilesLoading && !rawFilesError && rawFiles.length === 0 ? (
          <EmptyState title="No files yet" description="Uploads and ingested files appear here, same as the Inbox page." />
        ) : null}
        {!rawFilesLoading && rawFiles.length > 0 ? (
          <InboxTable
            data={rawFiles}
            onDelete={async (file) => {
              await deleteInboxFile(file.id);
              await reloadRawFiles();
            }}
          />
        ) : null}
      </Section>

      <Drawer
        open={addOpen}
        placement="center"
        widthClassName="w-[min(680px,calc(100vw-24px))]"
        title="Add email inbox"
        description={
          fundHint
            ? `Stored under fund ${shortenId(fundHint, 12)} (from your dashboard session).`
            : "Requires a fund context (dashboard token / x-fund-id)."
        }
        onClose={() => {
          setAddOpen(false);
          setAddError(null);
        }}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false);
                setAddError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={addSubmitting}
              onClick={async () => {
                const nextEmail = email.trim();
                const nextLabel = label.trim() || "Inbox";
                if (!nextEmail) return;
                setAddSubmitting(true);
                setAddError(null);
                try {
                  await createEmailInbox({
                    emailAddress: nextEmail,
                    label: nextLabel,
                    ...(fundHint ? { fundId: fundHint } : {})
                  });
                  setEmail("");
                  setLabel("");
                  setAddOpen(false);
                  await loadInboxes();
                } catch (e) {
                  const msg = e instanceof ApiError ? e.message : "Could not add inbox";
                  setAddError(msg);
                } finally {
                  setAddSubmitting(false);
                }
              }}
            >
              {addSubmitting ? "Adding…" : "Add"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          {addError ? <p className="text-sm text-destructive">{addError}</p> : null}
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Sender email (whitelist)</span>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sender@company.com" />
            <span className="text-xs text-muted-foreground">
              Must match the <strong>From</strong> address on inbound mail for routing to this fund.
            </span>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Label</span>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="IBKR reports" />
          </label>
        </div>
      </Drawer>

      <Drawer
        open={editOpen}
        placement="center"
        widthClassName="w-[min(680px,calc(100vw-24px))]"
        title="Edit email inbox"
        description={editing ? `Sender: ${editing.email}` : undefined}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
          setEditError(null);
        }}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
                setEditError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={editSubmitting || !editing}
              onClick={async () => {
                if (!editing) return;
                setEditSubmitting(true);
                setEditError(null);
                try {
                  await updateEmailInbox(editing.id, {
                    label: editLabel.trim() || "Inbox",
                    status: editStatus
                  });
                  setEditOpen(false);
                  setEditing(null);
                  await loadInboxes();
                } catch (e) {
                  const msg = e instanceof ApiError ? e.message : "Could not update inbox";
                  setEditError(msg);
                } finally {
                  setEditSubmitting(false);
                }
              }}
            >
              {editSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
          <div className="grid gap-1 text-sm">
            <span className="font-medium">Fund ID</span>
            <p className="font-mono text-xs text-muted-foreground break-all">{editing?.fundId ?? "—"}</p>
            <span className="text-xs text-muted-foreground">Tied to this row at creation; change fund via backend if needed.</span>
          </div>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Label</span>
            <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Status</span>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value === "PAUSED" ? "PAUSED" : "ACTIVE")}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
            </select>
          </label>
        </div>
      </Drawer>
    </Page>
  );
}
