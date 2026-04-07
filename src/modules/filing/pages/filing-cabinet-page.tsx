import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "../../../components/common/empty-state";
import { ErrorState } from "../../../components/common/error-state";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Skeleton } from "../../../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { formatCurrency, formatDate, formatNumber } from "../../../lib/utils";
import { filingApi } from "../api/filing-api";
import { useFilingData } from "../hooks/use-filing-data";
import { Drawer } from "../../../components/ui/drawer";
import { DataTable, type DataTableColumn } from "../../../components/common/data-table";
import { Page, PageHeader, Section } from "../../../components/common/page";
import type { InboxRawFileSummary, SecurityBatchSummary, SecurityMaster, Trade } from "../types/filing";

const PAGE_SIZE = 10;

const TRADE_COLUMNS: DataTableColumn<Trade>[] = [
  { id: "tradeDate", header: "Trade Date", sortValue: (r) => new Date(r.tradeDate).getTime(), cell: (r) => formatDate(r.tradeDate) },
  { id: "security", header: "Security", sortValue: (r) => r.security ?? "", cell: (r) => <span className="font-medium">{r.security}</span> },
  {
    id: "type",
    header: "Type",
    sortValue: (r) => r.type,
    cell: (r) => <Badge className={r.type === "BUY" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>{r.type}</Badge>
  },
  { id: "quantity", header: "Quantity", align: "right", sortValue: (r) => r.quantity, cell: (r) => <span className="tabular-nums">{formatNumber(r.quantity)}</span> },
  { id: "price", header: "Price", align: "right", sortValue: (r) => r.price, cell: (r) => <span className="tabular-nums">{formatNumber(r.price)}</span> },
  { id: "netAmount", header: "Net Amount", align: "right", sortValue: (r) => r.netAmount, cell: (r) => <span className="tabular-nums">{formatCurrency(r.netAmount, r.currency)}</span> },
  { id: "currency", header: "CCY", sortValue: (r) => r.currency ?? "", accessor: (r) => r.currency ?? "-" },
  { id: "glStatus", header: "GL Status", sortValue: (r) => r.glStatus ?? "", accessor: (r) => r.glStatus ?? "-" }
];

export function FilingCabinetPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [globalSecurityId, setGlobalSecurityId] = useState("");
  const [fxBase, setFxBase] = useState("");
  const [fxQuote, setFxQuote] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("trades");
  const { trades, positions, cashTransactions, cashBalances, prices, fxRates, corporateActions, securities, securityBatches, inboxRawFiles, loading, error, warnings } =
    useFilingData({
    from: fromDate || undefined,
    to: toDate || undefined,
    accountId: accountId.trim() || undefined,
    securityId: globalSecurityId.trim() || undefined,
    fxBase: fxBase.trim().toUpperCase() || undefined,
    fxQuote: fxQuote.trim().toUpperCase() || undefined
  });

  const [rawTradesOpen, setRawTradesOpen] = useState(false);
  const [rawTradesFile, setRawTradesFile] = useState<InboxRawFileSummary | null>(null);
  const [rawTrades, setRawTrades] = useState<Trade[]>([]);
  const [rawTradesLoading, setRawTradesLoading] = useState(false);
  const [rawTradesError, setRawTradesError] = useState<string | null>(null);
  const rawTradesAbortRef = useRef<AbortController | null>(null);

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchModalBatch, setBatchModalBatch] = useState<SecurityBatchSummary | null>(null);
  const [batchSecurities, setBatchSecurities] = useState<SecurityMaster[]>([]);
  const [batchSecuritiesLoading, setBatchSecuritiesLoading] = useState(false);
  const [batchSecuritiesError, setBatchSecuritiesError] = useState<string | null>(null);
  const batchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      rawTradesAbortRef.current?.abort();
      rawTradesAbortRef.current = null;
      batchAbortRef.current?.abort();
      batchAbortRef.current = null;
    };
  }, []);

  const dateFiltered = useMemo(() => {
    const inRange = (dateInput: string) => {
      const date = new Date(dateInput);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    };

    return {
      trades: trades.filter((item) => inRange(item.tradeDate)),
      cash: cashTransactions.filter((item) => inRange(item.transactionDate)),
      cashBalances: cashBalances.filter((item) => inRange(item.balanceDate)),
      prices: prices.filter((item) => inRange(item.priceDate)),
      fxRates: fxRates.filter((item) => inRange(item.rateDate)),
      corporateActions: corporateActions.filter((item) => inRange(item.exDate)),
      securities,
      securityBatches,
      inboxRawFiles,
      positions
    };
  }, [
    fromDate,
    toDate,
    trades,
    cashTransactions,
    cashBalances,
    prices,
    fxRates,
    corporateActions,
    securities,
    securityBatches,
    inboxRawFiles,
    positions
  ]);

  const paginate = <T,>(list: T[]) => {
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return { items: list.slice(start, start + PAGE_SIZE), totalPages, safePage };
  };

  const rawFileColumns: DataTableColumn<InboxRawFileSummary>[] = useMemo(
    () => [
      {
        id: "account",
        header: "Account",
        sortValue: (r) => r.accountName ?? r.accountId ?? "",
        cell: (r) => <span className="font-medium">{r.accountName ?? r.accountId ?? "-"}</span>,
        filterValue: (r) => `${r.accountName ?? ""} ${r.accountId ?? ""}`
      },
      { id: "sourceSystem", header: "Source System", accessor: (r) => r.sourceSystem ?? "-", sortValue: (r) => r.sourceSystem ?? "" },
      {
        id: "source",
        header: "Source",
        sortValue: (r) => r.source ?? "",
        cell: (r) => (r.source ? <Badge className="bg-sky-100 text-sky-800">{r.source}</Badge> : "-"),
        filterValue: (r) => r.source ?? ""
      },
      {
        id: "channel",
        header: "Channel",
        sortValue: (r) => r.ingestionChannel ?? "",
        cell: (r) => (r.ingestionChannel ? <Badge className="bg-indigo-100 text-indigo-800">{r.ingestionChannel}</Badge> : "-"),
        filterValue: (r) => r.ingestionChannel ?? ""
      },
      {
        id: "status",
        header: "Status",
        sortValue: (r) => r.status ?? "",
        cell: (r) =>
          r.status ? (
            <Badge
              className={
                r.status === "PROCESSED"
                  ? "bg-emerald-100 text-emerald-800"
                  : r.status === "FAILED"
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-100 text-slate-800"
              }
            >
              {r.status}
            </Badge>
          ) : (
            "-"
          ),
        filterValue: (r) => r.status ?? ""
      },
      {
        id: "recordCount",
        header: "Records",
        align: "right",
        sortValue: (r) => r.recordCount,
        cell: (r) => <span className="tabular-nums">{formatNumber(r.recordCount)}</span>
      },
      {
        id: "recordTypes",
        header: "Types",
        sortValue: (r) => r.recordTypes.join(","),
        cell: (r) =>
          r.recordTypes.length ? (
            <div className="flex flex-wrap gap-1.5">
              {r.recordTypes.map((t) => (
                <Badge
                  key={t}
                  className={
                    t === "TRADE"
                      ? "bg-emerald-100 text-emerald-800"
                      : t === "POSITION"
                        ? "bg-violet-100 text-violet-800"
                        : t === "CASH_TRANSACTION"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-800"
                  }
                >
                  {t}
                </Badge>
              ))}
            </div>
          ) : (
            "-"
          ),
        filterValue: (r) => r.recordTypes.join(" ")
      },
      {
        id: "createdAt",
        header: "Created",
        sortValue: (r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0),
        cell: (r) => (r.createdAt ? formatDate(r.createdAt) : "-")
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              void (async () => {
                setRawTradesFile(row);
                setRawTradesOpen(true);
                setRawTrades([]);
                setRawTradesError(null);
                setRawTradesLoading(true);

                rawTradesAbortRef.current?.abort();
                const controller = new AbortController();
                rawTradesAbortRef.current = controller;

                try {
                  const next = await filingApi.getTradesForRawFile(row.rawFileId, { limit: 100, offset: 0 }, controller.signal);
                  setRawTrades(next);
                } catch {
                  setRawTradesError("Unable to load trades for this file.");
                } finally {
                  setRawTradesLoading(false);
                }
              })();
            }}
          >
            View
          </Button>
        )
      }
    ],
    []
  );

  return (
    <Page>
      <PageHeader title="Filing Cabinet" description="Explore normalized trades, positions, and cash transactions." />

      <Card className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Account ID (optional)" />
        <Input value={globalSecurityId} onChange={(e) => setGlobalSecurityId(e.target.value)} placeholder="Security ID (optional)" />
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {!error && warnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some sections could not be loaded: {warnings.join(" ")}
        </div>
      ) : null}
      {loading ? (
        <Card className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : null}

      {!loading ? (
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="securities">Securities</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="cash">Cash Txns</TabsTrigger>
            <TabsTrigger value="cashBalances">Cash Balances</TabsTrigger>
            <TabsTrigger value="prices">Prices</TabsTrigger>
            <TabsTrigger value="fxRates">FX Rates</TabsTrigger>
            <TabsTrigger value="corporateActions">Corporate Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="trades">
            <Section
              title="Inbox files (normalized)"
              description="Click a row to drill into the trades linked to that file."
            >
              <DataTable
                data={dateFiltered.inboxRawFiles}
                columns={rawFileColumns}
                getRowId={(r) => r.rawFileId}
                onRowClick={async (row) => {
                  setRawTradesFile(row);
                  setRawTradesOpen(true);
                  setRawTrades([]);
                  setRawTradesError(null);
                  setRawTradesLoading(true);

                  rawTradesAbortRef.current?.abort();
                  const controller = new AbortController();
                  rawTradesAbortRef.current = controller;

                  try {
                    const next = await filingApi.getTradesForRawFile(row.rawFileId, { limit: 100, offset: 0 }, controller.signal);
                    setRawTrades(next);
                  } catch {
                    setRawTradesError("Unable to load trades for this file.");
                  } finally {
                    setRawTradesLoading(false);
                  }
                }}
                emptyTitle="No inbox files returned"
                emptyDescription="Try adjusting the date range."
              />
            </Section>
          </TabsContent>

          <TabsContent value="positions">
            {dateFiltered.positions.length === 0 ? <EmptyState title="No positions" description="No position data returned yet." /> : null}
            {dateFiltered.positions.length > 0 ? (
              <TableContainer currentPage={page} totalPages={paginate(dateFiltered.positions).totalPages} onPageChange={setPage}>
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted-foreground"><tr>{["Security", "Quantity", "Cost Basis", "Market Value", "Unrealised PnL"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody>
                    {paginate(dateFiltered.positions).items.map((position) => (
                      <tr key={position.id} className="border-t border-border">
                        <td className="px-4 py-3">{position.securityName ?? position.securityId}</td><td className="px-4 py-3">{formatNumber(position.quantity)}</td>
                        <td className="px-4 py-3">{formatNumber(position.costBasis)}</td><td className="px-4 py-3">{formatNumber(position.marketValue)}</td>
                        <td className={position.unrealisedPnl >= 0 ? "px-4 py-3 text-emerald-700" : "px-4 py-3 text-red-700"}>{formatNumber(position.unrealisedPnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            ) : null}
          </TabsContent>

          <TabsContent value="cash">
            {dateFiltered.cash.length === 0 ? <EmptyState title="No cash movements" description="No cash transactions for selected dates." /> : null}
            {dateFiltered.cash.length > 0 ? (
              <TableContainer currentPage={page} totalPages={paginate(dateFiltered.cash).totalPages} onPageChange={setPage}>
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted-foreground"><tr>{["Date", "Type", "Amount", "Currency", "Description"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody>
                    {paginate(dateFiltered.cash).items.map((cash) => (
                      <tr key={cash.id} className="border-t border-border">
                        <td className="px-4 py-3">{formatDate(cash.transactionDate)}</td><td className="px-4 py-3">{cash.transactionType}</td>
                        <td className={cash.amount >= 0 ? "px-4 py-3 text-emerald-700" : "px-4 py-3 text-red-700"}>{formatCurrency(cash.amount, cash.currency)}</td>
                        <td className="px-4 py-3">{cash.currency}</td><td className="px-4 py-3">{cash.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            ) : null}
          </TabsContent>

          <TabsContent value="cashBalances">
            {dateFiltered.cashBalances.length === 0 ? <EmptyState title="No cash balances" description="No cash balance snapshots for selected dates." /> : null}
            {dateFiltered.cashBalances.length > 0 ? (
              <TableContainer currentPage={page} totalPages={paginate(dateFiltered.cashBalances).totalPages} onPageChange={setPage}>
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>{["As Of", "Account", "Source", "Currency", "Balance"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {paginate(dateFiltered.cashBalances).items.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-4 py-3">{formatDate(row.balanceDate)}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{row.accountName ?? row.accountId}</span>
                        </td>
                        <td className="px-4 py-3">
                          {row.accountSourceSystem ? <Badge className="bg-slate-100 text-slate-800">{row.accountSourceSystem}</Badge> : "-"}
                        </td>
                        <td className="px-4 py-3">{row.currency}</td>
                        <td className="px-4 py-3">{formatNumber(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            ) : null}
          </TabsContent>

          <TabsContent value="prices">
            {dateFiltered.prices.length === 0 ? <EmptyState title="No prices" description="No security prices for selected dates." /> : null}
            {dateFiltered.prices.length > 0 ? (
              <TableContainer currentPage={page} totalPages={paginate(dateFiltered.prices).totalPages} onPageChange={setPage}>
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>{["Date", "Security", "Price", "Currency"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {paginate(dateFiltered.prices).items.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-4 py-3">{formatDate(row.priceDate)}</td>
                        <td className="px-4 py-3">{row.securityName ?? row.securityId}</td>
                        <td className="px-4 py-3">{formatNumber(row.closePrice)}</td>
                        <td className="px-4 py-3">{row.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            ) : null}
          </TabsContent>

          <TabsContent value="fxRates">
            {dateFiltered.fxRates.length === 0 ? <EmptyState title="No FX rates" description="No FX rates for selected dates." /> : null}
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input value={fxBase} onChange={(e) => setFxBase(e.target.value)} placeholder="Base (e.g. USD)" className="w-full sm:w-[180px]" />
              <Input value={fxQuote} onChange={(e) => setFxQuote(e.target.value)} placeholder="Quote (e.g. EUR)" className="w-full sm:w-[180px]" />
              <div className="text-xs text-muted-foreground">Optional: set base/quote to filter pairs.</div>
            </div>
            {dateFiltered.fxRates.length > 0 ? (
              <TableContainer currentPage={page} totalPages={paginate(dateFiltered.fxRates).totalPages} onPageChange={setPage}>
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      {["Date", "Base Currency", "Quote Currency", "Rate", "Source"].map((h) => (
                        <th key={h} className="px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(dateFiltered.fxRates).items.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-4 py-3">{formatDate(row.rateDate)}</td>
                        <td className="px-4 py-3 font-medium">{row.baseCurrency}</td>
                        <td className="px-4 py-3 font-medium">{row.quoteCurrency}</td>
                        <td className="px-4 py-3 tabular-nums">{formatNumber(row.rate)}</td>
                        <td className="px-4 py-3">{row.source ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            ) : null}
          </TabsContent>

          <TabsContent value="corporateActions">
            {dateFiltered.corporateActions.length === 0 ? <EmptyState title="No corporate actions" description="No corporate actions for selected dates." /> : null}
            {dateFiltered.corporateActions.length > 0 ? (
              <TableContainer currentPage={page} totalPages={paginate(dateFiltered.corporateActions).totalPages} onPageChange={setPage}>
                <table className="min-w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>{["Ex Date", "Security", "Action Type", "Status"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {paginate(dateFiltered.corporateActions).items.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-4 py-3">{formatDate(row.exDate)}</td>
                        <td className="px-4 py-3">{row.securityName ?? row.securityId}</td>
                        <td className="px-4 py-3">{row.actionType}</td>
                        <td className="px-4 py-3">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            ) : null}
          </TabsContent>

          <TabsContent value="securities">
            {dateFiltered.securityBatches.length === 0 ? (
              <EmptyState title="No security batches" description="No security batch summary returned yet." />
            ) : null}

            {dateFiltered.securityBatches.length > 0 ? (
              <DataTable
                    data={dateFiltered.securityBatches}
                    getRowId={(r) => `${r.accountId ?? "na"}:${r.effectiveDate ?? "na"}:${r.source ?? "na"}`}
                    emptyTitle="No batches"
                    emptyDescription="No security batch summary returned yet."
                    initialPageSize={10}
                    columns={[
                      {
                        id: "account",
                        header: "Account",
                        sortValue: (r) => r.accountName ?? r.accountId ?? "",
                        cell: (r) => <span className="font-medium">{r.accountName ?? r.accountId ?? "-"}</span>,
                        filterValue: (r) => `${r.accountName ?? ""} ${r.accountId ?? ""}`
                      },
                      { id: "sourceSystem", header: "Source System", accessor: (r) => r.sourceSystem ?? "-", sortValue: (r) => r.sourceSystem ?? "" },
                      { id: "source", header: "Source", sortValue: (r) => r.source ?? "", cell: (r) => (r.source ? <Badge className="bg-sky-100 text-sky-800">{r.source}</Badge> : "-") },
                      {
                        id: "channel",
                        header: "Channel",
                        sortValue: (r) => r.ingestionChannel ?? "",
                        cell: (r) => (r.ingestionChannel ? <Badge className="bg-indigo-100 text-indigo-800">{r.ingestionChannel}</Badge> : "-")
                      },
                      {
                        id: "rawFileStatus",
                        header: "Raw File Status",
                        sortValue: (r) => r.rawFileStatus ?? r.status ?? "",
                        cell: (r) => {
                          const s = r.rawFileStatus ?? r.status;
                          return s ? (
                            <Badge
                              className={
                                s === "PROCESSED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : s === "FAILED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-slate-100 text-slate-800"
                              }
                            >
                              {s}
                            </Badge>
                          ) : (
                            "-"
                          );
                        }
                      },
                      {
                        id: "status",
                        header: "Status",
                        sortValue: (r) => r.status ?? "",
                        cell: (r) =>
                          r.status ? (
                            <Badge
                              className={
                                r.status === "PROCESSED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.status === "FAILED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-slate-100 text-slate-800"
                              }
                            >
                              {r.status}
                            </Badge>
                          ) : (
                            "-"
                          )
                      },
                      {
                        id: "effectiveDate",
                        header: "Effective",
                        sortValue: (r) => (r.effectiveDate ? new Date(r.effectiveDate).getTime() : 0),
                        cell: (r) => (r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : "-")
                      },
                      {
                        id: "securityCount",
                        header: "Count",
                        align: "right",
                        sortValue: (r) => r.securityCount,
                        cell: (r) => <span className="tabular-nums">{formatNumber(r.securityCount)}</span>
                      },
                      {
                        id: "actions",
                        header: "",
                        align: "right",
                        cell: (row) => (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              void (async () => {
                                setBatchModalBatch(row);
                                setBatchModalOpen(true);
                                setBatchSecurities([]);
                                setBatchSecuritiesError(null);
                                setBatchSecuritiesLoading(true);

                                batchAbortRef.current?.abort();
                                const controller = new AbortController();
                                batchAbortRef.current = controller;

                                try {
                                  if (!row.source) throw new Error("missing source");
                                  const next = await filingApi.getSecuritiesForBatch(
                                    row.source,
                                    row.effectiveDate,
                                    { limit: 200, offset: 0 },
                                    controller.signal
                                  );
                                  setBatchSecurities(next);
                                } catch {
                                  setBatchSecuritiesError("Unable to load securities for this batch.");
                                } finally {
                                  setBatchSecuritiesLoading(false);
                                }
                              })();
                            }}
                          >
                            View
                          </Button>
                        )
                      }
                    ]}
                    onRowClick={async (row) => {
                      setBatchModalBatch(row);
                      setBatchModalOpen(true);
                      setBatchSecurities([]);
                      setBatchSecuritiesError(null);
                      setBatchSecuritiesLoading(true);

                      batchAbortRef.current?.abort();
                      const controller = new AbortController();
                      batchAbortRef.current = controller;

                      try {
                        if (!row.source) throw new Error("missing source");
                        const next = await filingApi.getSecuritiesForBatch(row.source, row.effectiveDate, { limit: 200, offset: 0 }, controller.signal);
                        setBatchSecurities(next);
                      } catch {
                        setBatchSecuritiesError("Unable to load securities for this batch.");
                      } finally {
                        setBatchSecuritiesLoading(false);
                      }
                    }}
                  />
            ) : null}
          </TabsContent>
        </Tabs>
      ) : null}

      <RawFileTradesModal
        open={rawTradesOpen}
        file={rawTradesFile}
        loading={rawTradesLoading}
        error={rawTradesError}
        trades={rawTrades}
        onClose={() => {
          rawTradesAbortRef.current?.abort();
          rawTradesAbortRef.current = null;
          setRawTradesOpen(false);
        }}
      />

      <SecurityBatchSecuritiesModal
        open={batchModalOpen}
        batch={batchModalBatch}
        loading={batchSecuritiesLoading}
        error={batchSecuritiesError}
        securities={batchSecurities}
        onClose={() => {
          batchAbortRef.current?.abort();
          batchAbortRef.current = null;
          setBatchModalOpen(false);
        }}
      />
    </Page>
  );
}

function SecurityBatchSecuritiesModal({
  open,
  batch,
  loading,
  error,
  securities,
  onClose
}: {
  open: boolean;
  batch: SecurityBatchSummary | null;
  loading: boolean;
  error: string | null;
  securities: SecurityMaster[];
  onClose: () => void;
}) {
  if (!open || !batch) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Securities for batch"
      description={`${batch.accountName ?? batch.accountId}${batch.source ? ` • ${batch.source}` : ""}${batch.effectiveDate ? ` • ${new Date(batch.effectiveDate).toLocaleDateString()}` : ""}`}
      widthClassName="w-[min(980px,calc(100vw-24px))]"
      placement="center"
    >
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}
      {!loading && securities.length === 0 && !error ? (
        <EmptyState title="No securities for this batch" description="This batch has no linked security records." />
      ) : null}
      {!loading && securities.length > 0 ? (
        <DataTable
          data={securities}
          getRowId={(r) => r.id}
          columns={[
            { id: "vaultId", header: "Vault ID", accessor: (r) => r.vaultId ?? "-", sortValue: (r) => r.vaultId ?? "" },
            { id: "securityName", header: "Security", sortValue: (r) => r.securityName ?? "", cell: (r) => <span className="font-medium">{r.securityName}</span> },
            { id: "exchange", header: "Exchange", accessor: (r) => r.exchange ?? "-", sortValue: (r) => r.exchange ?? "" },
            { id: "idType", header: "ID Type", accessor: (r) => r.idType ?? "-", sortValue: (r) => r.idType ?? "" },
            { id: "idValue", header: "ID Value", accessor: (r) => r.idValue ?? "-", sortValue: (r) => r.idValue ?? "" },
            { id: "underlyingSecurityId", header: "Underlying Security ID", accessor: (r) => r.underlyingSecurityId ?? "-", sortValue: (r) => r.underlyingSecurityId ?? "" },
            {
              id: "contractMultiplier",
              header: "Contract Multiplier",
              align: "right",
              sortValue: (r) => r.contractMultiplier ?? 0,
              cell: (r) => <span className="tabular-nums">{r.contractMultiplier == null ? "-" : formatNumber(r.contractMultiplier)}</span>
            },
            { id: "assetClass", header: "Asset Class", accessor: (r) => r.assetClass ?? "-", sortValue: (r) => r.assetClass ?? "" },
            { id: "instrumentType", header: "Instrument", accessor: (r) => r.instrumentType ?? "-", sortValue: (r) => r.instrumentType ?? "" },
            { id: "currency", header: "CCY", accessor: (r) => r.currency ?? "-", sortValue: (r) => r.currency ?? "" },
            { id: "country", header: "Country", accessor: (r) => r.country ?? "-", sortValue: (r) => r.country ?? "" },
            { id: "issuerId", header: "Issuer ID", accessor: (r) => r.issuerId ?? "-", sortValue: (r) => r.issuerId ?? "" },
            { id: "effectiveDate", header: "Date", sortValue: (r) => (r.effectiveDate ? new Date(r.effectiveDate).getTime() : 0), cell: (r) => (r.effectiveDate ? formatDate(r.effectiveDate) : "-") },
            { id: "source", header: "Source", sortValue: (r) => r.source ?? "", cell: (r) => (r.source ? <Badge className="bg-sky-100 text-sky-800">{r.source}</Badge> : "-") }
          ]}
          emptyTitle="No securities"
          emptyDescription="This batch has no linked security records."
          initialPageSize={20}
        />
      ) : null}
    </Drawer>
  );
}

function RawFileTradesModal({
  open,
  file,
  loading,
  error,
  trades,
  onClose
}: {
  open: boolean;
  file: InboxRawFileSummary | null;
  loading: boolean;
  error: string | null;
  trades: Trade[];
  onClose: () => void;
}) {
  if (!open || !file) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Trades"
      description={`${file.fileName}${file.createdAt ? ` • ${formatDate(file.createdAt)}` : ""}`}
      widthClassName="w-[min(980px,calc(100vw-24px))]"
      placement="center"
    >
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}
      {!loading && trades.length === 0 && !error ? (
        <EmptyState title="No trades for this file" description="This raw file has no linked trade records." />
      ) : null}
      {!loading && trades.length > 0 ? (
        <DataTable data={trades} columns={TRADE_COLUMNS} getRowId={(r) => r.id} initialPageSize={20} />
      ) : null}
    </Drawer>
  );
}

function TableContainer({ children, currentPage, totalPages, onPageChange }: { children: React.ReactNode; currentPage: number; totalPages: number; onPageChange: (page: number) => void; }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
      {children}
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
        <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
        <div className="flex gap-2">
          <button className="rounded-lg border border-border px-3 py-1.5" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Prev</button>
          <button className="rounded-lg border border-border px-3 py-1.5" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}