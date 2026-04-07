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
import { InboxTable } from "../../inbox/components/inbox-table";
import { useInboxFiles } from "../../inbox/hooks/use-inbox-files";
import { createEmailInbox, fetchEmailInboxes, type EmailInboxRow } from "../api/email-inboxes-api";

type EmailInbox = EmailInboxRow;

export function SetupEmailPage() {
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
      { id: "email", header: "Email", sortValue: (r) => r.email, cell: (r) => <span className="font-medium">{r.email}</span> },
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
      { id: "createdAt", header: "Created", sortValue: (r) => new Date(r.createdAt).getTime(), cell: (r) => new Date(r.createdAt).toLocaleString() }
    ],
    []
  );

  return (
    <Page>
      <PageHeader
        title="Setup Email"
        description="Configure inboxes and view incoming report files saved to S3."
        right={
          <Button onClick={() => setAddOpen(true)}>
            Add email
          </Button>
        }
      />

      <Section title="Inboxes">
        {inboxesError ? (
          <p className="text-sm text-destructive">{inboxesError}</p>
        ) : null}
        {inboxesLoading ? (
          <p className="text-sm text-muted-foreground">Loading inboxes…</p>
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
        {!rawFilesLoading && rawFiles.length > 0 ? <InboxTable data={rawFiles} /> : null}
      </Section>

      <Drawer
        open={addOpen}
        placement="center"
        widthClassName="w-[min(680px,calc(100vw-24px))]"
        title="Add email inbox"
        description="Add an inbox address that will receive reports."
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
                  await createEmailInbox({ emailAddress: nextEmail, label: nextLabel });
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
            <span className="font-medium">Email address</span>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="reports+ibkr@tychi.ai" />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Label</span>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="IBKR reports" />
          </label>
        </div>
      </Drawer>
    </Page>
  );
}

