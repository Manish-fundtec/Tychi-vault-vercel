import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";
import type { AccountStatus, AccountType, CreateVaultAccountInput, IngestionSchedule, SourceSystem } from "../types/accounts";

const accountTypes: AccountType[] = ["BROKER", "BANK", "CUSTODIAN"];
const sourceSystems: SourceSystem[] = ["IBKR", "DBS", "MANUAL", "FRANKFURTER"];
const ingestionSchedules: IngestionSchedule[] = ["DAILY_EOD", "WEEKLY", "MONTHLY", "ON_DEMAND"];
const statuses: AccountStatus[] = ["SETUP", "ACTIVE", "INACTIVE"];

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <select
        className={cn(
          "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AddAccountModal({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateVaultAccountInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [masterFundId, setMasterFundId] = useState("FUND-001");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("BROKER");
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>("IBKR");
  const [externalAccountId, setExternalAccountId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [queryId, setQueryId] = useState("");
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [ingestionSchedule, setIngestionSchedule] = useState<IngestionSchedule>("MONTHLY");
  const [ingestionDayOfMonth, setIngestionDayOfMonth] = useState("1");
  const [emailInboxAddress, setEmailInboxAddress] = useState("");
  const [status, setStatus] = useState<AccountStatus>("SETUP");

  const canSubmit = useMemo(
    () =>
      accountName.trim().length > 0 &&
      masterFundId.trim().length > 0 &&
      baseCurrency.trim().length === 3 &&
      accountId.trim().length <= 100 &&
      queryId.trim().length <= 100,
    [accountName, masterFundId, baseCurrency, accountId, queryId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold">Add account</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create a new vault account configuration.</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Close
          </Button>
        </div>

        <div className="px-6 pb-6">
          {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Master Fund ID</span>
            <Input value={masterFundId} onChange={(e) => setMasterFundId(e.target.value)} />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Account ID</span>
            <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Optional" maxLength={100} />
            <span className="text-xs text-muted-foreground">This ID is matched against parsed file account_id.</span>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Account Name</span>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. IBKR Main Brokerage" />
          </label>

          <Select
            label="Account Type"
            value={accountType}
            onChange={(v) => setAccountType(v as AccountType)}
            options={accountTypes.map((t) => ({ value: t, label: t }))}
          />
          <Select
            label="Source System"
            value={sourceSystem}
            onChange={(v) => setSourceSystem(v as SourceSystem)}
            options={sourceSystems.map((t) => ({ value: t, label: t }))}
          />

          <label className="grid gap-2 text-sm">
            <span className="font-medium">External Account ID</span>
            <Input value={externalAccountId} onChange={(e) => setExternalAccountId(e.target.value)} placeholder="Optional" />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium">Auth Token</span>
            <div className="flex gap-2">
              <Input
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Optional"
                type={showAuthToken ? "text" : "password"}
              />
              <Button type="button" variant="outline" onClick={() => setShowAuthToken((v) => !v)}>
                {showAuthToken ? "Hide" : "Show"}
              </Button>
            </div>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Query ID</span>
            <Input value={queryId} onChange={(e) => setQueryId(e.target.value)} placeholder="Optional" maxLength={100} />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Base Currency</span>
            <Input value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value.toUpperCase())} placeholder="USD" />
          </label>

          <Select
            label="Ingestion Schedule"
            value={ingestionSchedule}
            onChange={(v) => setIngestionSchedule(v as IngestionSchedule)}
            options={ingestionSchedules.map((t) => ({ value: t, label: t }))}
          />
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Ingestion Day (1-28)</span>
            <Input
              value={ingestionDayOfMonth}
              onChange={(e) => setIngestionDayOfMonth(e.target.value)}
              placeholder="1"
              disabled={ingestionSchedule !== "MONTHLY"}
            />
          </label>

          <label className="grid gap-2 text-sm md:col-span-2">
            <span className="font-medium">Email Inbox Address</span>
            <Input value={emailInboxAddress} onChange={(e) => setEmailInboxAddress(e.target.value)} placeholder="Optional" />
          </label>

          <Select
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as AccountStatus)}
            options={statuses.map((t) => ({ value: t, label: t }))}
          />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!canSubmit) {
                setError("Please fill required fields and ensure Account ID / Query ID are at most 100 characters.");
                return;
              }
              setSaving(true);
              setError(null);
              try {
                await onCreate({
                  masterFundId: masterFundId.trim(),
                  accountName: accountName.trim(),
                  accountType,
                  sourceSystem,
                  externalAccountId: externalAccountId.trim() || undefined,
                  accountId: accountId.trim() || null,
                  authToken: authToken.trim() || null,
                  queryId: queryId.trim() || null,
                  baseCurrency: baseCurrency.trim().toUpperCase(),
                  ingestionSchedule,
                  ingestionDayOfMonth: ingestionSchedule === "MONTHLY" ? ingestionDayOfMonth.trim() : undefined,
                  emailInboxAddress: emailInboxAddress.trim() || undefined,
                  status
                });
                onClose();
              } catch {
                setError("Unable to create account.");
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Add account"}
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

