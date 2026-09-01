import { useState } from "react";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { EmptyState } from "../../../components/common/empty-state";
import { ErrorState } from "../../../components/common/error-state";
import { createVaultAccount, refreshVaultAccount, updateVaultAccount } from "../api/accounts-api";
import { AddAccountModal } from "../components/add-account-modal";
import { EditAccountModal } from "../components/edit-account-modal";
import { AccountsTable } from "../components/accounts-table";
import { useVaultAccounts } from "../hooks/use-vault-accounts";
import type { CreateVaultAccountInput, UpdateVaultAccountInput, VaultAccount } from "../types/accounts";

export function SetupAccountsPage() {
  const { data, loading, error, reload } = useVaultAccounts();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<VaultAccount | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const onCreate = async (input: CreateVaultAccountInput) => {
    setCreating(true);
    setCreateError(null);
    try {
      await createVaultAccount(input);
      await reload();
    } catch {
      setCreateError("Unable to create vault account.");
      throw new Error("create failed");
    } finally {
      setCreating(false);
    }
  };

  const onEdit = (account: VaultAccount) => {
    setEditingAccount(account);
    setEditOpen(true);
  };

  const onUpdate = async (id: string, input: UpdateVaultAccountInput) => {
    setUpdating(true);
    setCreateError(null);
    try {
      await updateVaultAccount(id, input);
      await reload();
    } catch {
      setCreateError("Unable to update vault account.");
      throw new Error("update failed");
    } finally {
      setUpdating(false);
    }
  };

  const onGetData = async (account: VaultAccount) => {
    setSyncError(null);
    setSyncMessage(null);

    const token = String(account.authToken || "").trim();
    const queryId = String(account.queryId || "").trim();
    if (!token || !queryId) {
      setSyncError("Query ID or Auth Token is missing. Please add them in Edit account before syncing.");
      return;
    }

    setSyncingId(account.id);
    try {
      const res = await refreshVaultAccount(account.id);
      const trades = res?.result?.tradesParsed ?? 0;
      const positions = res?.result?.positionsParsed ?? 0;
      const cash = res?.result?.cashParsed ?? 0;
      const inserted = res?.result?.parsedRowsInserted ?? 0;
      const ref = res?.result?.referenceCode;
      const action = res?.action ?? "IBKR_FLEX_SYNC";
      setSyncMessage(
        res?.result?.message
          ? `${res.result.message} (trades: ${trades}, positions: ${positions}, cash: ${cash}, rows: ${inserted})`
          : `${action} complete${ref ? ` · ref ${ref}` : ""} — trades: ${trades}, positions: ${positions}, cash: ${cash}, rows: ${inserted}`
      );
      await reload();
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Unable to fetch IBKR data.";
      setSyncError(msg);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Setup Accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage `vault_accounts` for ingestion and routing.</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={creating}>
          Add account
        </Button>
      </header>

      {createError ? <ErrorState message={createError} onRetry={() => setOpen(true)} /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {syncError ? <ErrorState message={syncError} onRetry={() => setSyncError(null)} /> : null}
      {syncMessage ? (
        <Card className="border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {syncMessage}
        </Card>
      ) : null}

      {loading ? (
        <Card className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : null}

      {!loading && !error && data.length === 0 ? (
        <EmptyState title="No accounts yet" description="Add your first vault account to enable ingestion and filing." />
      ) : null}

      {!loading && data.length > 0 ? (
        <AccountsTable data={data} onEdit={onEdit} onGetData={onGetData} syncingId={syncingId} />
      ) : null}

      <AddAccountModal open={open} onClose={() => setOpen(false)} onCreate={onCreate} />
      <EditAccountModal
        open={editOpen}
        account={editingAccount}
        onClose={() => {
          if (updating) return;
          setEditOpen(false);
          setEditingAccount(null);
        }}
        onUpdate={onUpdate}
      />
    </div>
  );
}
