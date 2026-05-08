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
import type {
  CashBalance,
  CashTransaction,
  CorporateAction,
  FxRate,
  InboxRawFileSummary,
  Position,
  Price,
  SecurityBatchSummary,
  SecurityMaster,
  Trade,
  Transfer
} from "../types/filing";

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

const POSITION_COLUMNS: DataTableColumn<Position>[] = [
  { id: "positionDate", header: "Date", sortValue: (r) => new Date(r.positionDate).getTime(), cell: (r) => formatDate(r.positionDate) },
  { id: "security", header: "Security", sortValue: (r) => r.securityName ?? r.securityId, cell: (r) => <span className="font-medium">{r.securityName ?? r.securityId}</span> },
  { id: "quantity", header: "Quantity", align: "right", sortValue: (r) => r.quantity, cell: (r) => <span className="tabular-nums">{formatNumber(r.quantity)}</span> },
  { id: "costBasis", header: "Cost Basis", align: "right", sortValue: (r) => r.costBasis, cell: (r) => <span className="tabular-nums">{formatNumber(r.costBasis)}</span> },
  { id: "marketValue", header: "Market Value", align: "right", sortValue: (r) => r.marketValue, cell: (r) => <span className="tabular-nums">{formatNumber(r.marketValue)}</span> },
  {
    id: "unrealisedPnl",
    header: "Unrealised PnL",
    align: "right",
    sortValue: (r) => r.unrealisedPnl,
    cell: (r) => (
      <span className={r.unrealisedPnl >= 0 ? "tabular-nums text-emerald-700" : "tabular-nums text-red-700"}>{formatNumber(r.unrealisedPnl)}</span>
    )
  },
  { id: "currency", header: "CCY", sortValue: (r) => r.currency ?? "", accessor: (r) => r.currency ?? "-" }
];

const TRANSFER_COLUMNS: DataTableColumn<Transfer>[] = [
  { id: "transferDate", header: "Date", sortValue: (r) => new Date(r.transferDate).getTime(), cell: (r) => formatDate(r.transferDate) },
  { id: "security", header: "Security", sortValue: (r) => r.securityName ?? r.securityId, cell: (r) => <span className="font-medium">{r.securityName ?? r.securityId}</span> },
  {
    id: "direction",
    header: "Direction",
    sortValue: (r) => r.direction,
    cell: (r) => <Badge className={r.direction === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>{r.direction}</Badge>
  },
  { id: "quantity", header: "Quantity", align: "right", sortValue: (r) => r.quantity, cell: (r) => <span className="tabular-nums">{formatNumber(r.quantity)}</span> },
  { id: "currency", header: "CCY", sortValue: (r) => r.currency ?? "", accessor: (r) => r.currency ?? "-" },
  { id: "transferType", header: "Type", sortValue: (r) => r.transferType ?? "", accessor: (r) => r.transferType ?? "-" },
  { id: "xferCompany", header: "Xfer Company", sortValue: (r) => r.xferCompany ?? "", accessor: (r) => r.xferCompany ?? "-" },
  { id: "xferAccount", header: "Xfer Account", sortValue: (r) => r.xferAccount ?? "", accessor: (r) => r.xferAccount ?? "-" },
  {
    id: "marketValue",
    header: "Mkt Value",
    align: "right",
    sortValue: (r) => r.marketValue ?? 0,
    cell: (r) => <span className="tabular-nums">{r.marketValue == null ? "-" : formatNumber(r.marketValue)}</span>
  },
  {
    id: "cashAmount",
    header: "Cash",
    align: "right",
    sortValue: (r) => r.cashAmount ?? 0,
    cell: (r) => <span className="tabular-nums">{r.cashAmount == null ? "-" : formatNumber(r.cashAmount)}</span>
  },
  {
    id: "realizedPl",
    header: "Realized P/L",
    align: "right",
    sortValue: (r) => r.realizedPl ?? 0,
    cell: (r) =>
      r.realizedPl == null ? (
        "-"
      ) : (
        <span className={r.realizedPl >= 0 ? "tabular-nums text-emerald-700" : "tabular-nums text-red-700"}>{formatNumber(r.realizedPl)}</span>
      )
  },
  { id: "status", header: "Status", sortValue: (r) => r.status ?? "", accessor: (r) => r.status ?? "-" }
];

const CASH_TXN_COLUMNS: DataTableColumn<CashTransaction>[] = [
  { id: "transactionDate", header: "Date", sortValue: (r) => new Date(r.transactionDate).getTime(), cell: (r) => formatDate(r.transactionDate) },
  { id: "transactionType", header: "Type", sortValue: (r) => r.transactionType ?? "", accessor: (r) => r.transactionType ?? "-" },
  {
    id: "amount",
    header: "Amount",
    align: "right",
    sortValue: (r) => r.amount,
    cell: (r) => (
      <span className={r.amount >= 0 ? "tabular-nums text-emerald-700" : "tabular-nums text-red-700"}>{formatCurrency(r.amount, r.currency)}</span>
    )
  },
  { id: "currency", header: "CCY", sortValue: (r) => r.currency ?? "", accessor: (r) => r.currency ?? "-" },
  { id: "description", header: "Description", sortValue: (r) => r.description ?? "", accessor: (r) => r.description ?? "-" }
];

const CASH_BALANCE_COLUMNS: DataTableColumn<CashBalance>[] = [
  { id: "balanceDate", header: "As Of", sortValue: (r) => new Date(r.balanceDate).getTime(), cell: (r) => formatDate(r.balanceDate) },
  { id: "account", header: "Account", sortValue: (r) => r.accountName ?? r.accountId, cell: (r) => <span className="font-medium">{r.accountName ?? r.accountId}</span> },
  { id: "sourceSystem", header: "Source", sortValue: (r) => r.accountSourceSystem ?? "", cell: (r) => (r.accountSourceSystem ? <Badge className="bg-slate-100 text-slate-800">{r.accountSourceSystem}</Badge> : "-") },
  { id: "currency", header: "CCY", sortValue: (r) => r.currency ?? "", accessor: (r) => r.currency ?? "-" },
  { id: "balance", header: "Balance", align: "right", sortValue: (r) => r.balance, cell: (r) => <span className="tabular-nums">{formatNumber(r.balance)}</span> }
];

const PRICE_COLUMNS: DataTableColumn<Price>[] = [
  { id: "priceDate", header: "Date", sortValue: (r) => new Date(r.priceDate).getTime(), cell: (r) => formatDate(r.priceDate) },
  { id: "security", header: "Security", sortValue: (r) => r.securityName ?? r.securityId, cell: (r) => <span className="font-medium">{r.securityName ?? r.securityId}</span> },
  { id: "closePrice", header: "Price", align: "right", sortValue: (r) => r.closePrice, cell: (r) => <span className="tabular-nums">{formatNumber(r.closePrice)}</span> },
  { id: "currency", header: "CCY", sortValue: (r) => r.currency ?? "", accessor: (r) => r.currency ?? "-" },
  { id: "priceType", header: "Type", sortValue: (r) => r.priceType ?? "", accessor: (r) => r.priceType ?? "-" }
];

const FX_COLUMNS: DataTableColumn<FxRate>[] = [
  { id: "rateDate", header: "Date", sortValue: (r) => new Date(r.rateDate).getTime(), cell: (r) => formatDate(r.rateDate) },
  { id: "baseCurrency", header: "Base", sortValue: (r) => r.baseCurrency ?? "", cell: (r) => <span className="font-medium">{r.baseCurrency}</span> },
  { id: "quoteCurrency", header: "Quote", sortValue: (r) => r.quoteCurrency ?? "", cell: (r) => <span className="font-medium">{r.quoteCurrency}</span> },
  { id: "rate", header: "Rate", align: "right", sortValue: (r) => r.rate, cell: (r) => <span className="tabular-nums">{formatNumber(r.rate)}</span> },
  { id: "source", header: "Source", sortValue: (r) => r.source ?? "", accessor: (r) => r.source ?? "-" }
];

const CORP_ACTION_COLUMNS: DataTableColumn<CorporateAction>[] = [
  { id: "exDate", header: "Ex Date", sortValue: (r) => new Date(r.exDate).getTime(), cell: (r) => formatDate(r.exDate) },
  { id: "security", header: "Security", sortValue: (r) => r.securityName ?? r.securityId, cell: (r) => <span className="font-medium">{r.securityName ?? r.securityId}</span> },
  { id: "actionType", header: "Action Type", sortValue: (r) => r.actionType ?? "", accessor: (r) => r.actionType ?? "-" },
  { id: "status", header: "Status", sortValue: (r) => r.status ?? "", accessor: (r) => r.status ?? "-" }
];

export function FilingCabinetPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [globalSecurityId, setGlobalSecurityId] = useState("");
  const [fxBase, setFxBase] = useState("");
  const [fxQuote, setFxQuote] = useState("");
  const [tab, setTab] = useState("trades");
  const {
    trades,
    positions,
    cashTransactions,
    cashBalances,
    prices,
    fxRates,
    corporateActions,
    securities,
    securityBatches,
    inboxRawFiles,
    positionBatches,
    transferBatches,
    cashTransactionBatches,
    cashBalanceBatches,
    priceBatches,
    fxRateBatches,
    corporateActionBatches,
    loading,
    error,
    warnings
  } = useFilingData({
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

  type RawKind = "positions" | "transfers" | "cash" | "cashBalances" | "prices" | "fxRates" | "corporateActions";
  const [rawOpen, setRawOpen] = useState(false);
  const [rawKind, setRawKind] = useState<RawKind>("positions");
  const [rawFile, setRawFile] = useState<InboxRawFileSummary | null>(null);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<unknown[]>([]);
  const rawAbortRef = useRef<AbortController | null>(null);

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
      rawAbortRef.current?.abort();
      rawAbortRef.current = null;
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

  const batchFiltered = useMemo(() => {
    const inRange = (dateInput: string) => {
      const date = new Date(dateInput);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    };

    const safe = (v: string | undefined | null) => (v ? v : "");

    return {
      positions: positionBatches.filter((r) => inRange(safe(r.createdAt))),
      transfers: transferBatches.filter((r) => inRange(safe(r.createdAt))),
      cash: cashTransactionBatches.filter((r) => inRange(safe(r.createdAt))),
      cashBalances: cashBalanceBatches.filter((r) => inRange(safe(r.createdAt))),
      prices: priceBatches.filter((r) => inRange(safe(r.createdAt))),
      fxRates: fxRateBatches.filter((r) => inRange(safe(r.createdAt))),
      corporateActions: corporateActionBatches.filter((r) => inRange(safe(r.createdAt)))
    };
  }, [fromDate, toDate, positionBatches, transferBatches, cashTransactionBatches, cashBalanceBatches, priceBatches, fxRateBatches, corporateActionBatches]);

  const openRawFile = async (kind: RawKind, file: InboxRawFileSummary) => {
    // Ensure only one viewer modal is open at a time.
    rawTradesAbortRef.current?.abort();
    rawTradesAbortRef.current = null;
    setRawTradesOpen(false);

    setRawKind(kind);
    setRawFile(file);
    setRawOpen(true);
    setRawRows([]);
    setRawError(null);
    setRawLoading(true);

    rawAbortRef.current?.abort();
    const controller = new AbortController();
    rawAbortRef.current = controller;

    try {
      if (kind === "positions") {
        const res = await filingApi.getPositions({ accountId: accountId.trim() || undefined, rawFileId: file.rawFileId, limit: 500, offset: 0 }, controller.signal);
        setRawRows(res.items);
      } else if (kind === "transfers") {
        const res = await filingApi.getTransfers({ accountId: accountId.trim() || undefined, rawFileId: file.rawFileId, limit: 500, offset: 0 }, controller.signal);
        setRawRows(res.items);
      } else if (kind === "cash") {
        const res = await filingApi.getCashTransactions({ accountId: accountId.trim() || undefined, rawFileId: file.rawFileId, limit: 500, offset: 0 }, controller.signal);
        setRawRows(res.items);
      } else if (kind === "cashBalances") {
        const res = await filingApi.getCashBalances({ accountId: accountId.trim() || undefined, rawFileId: file.rawFileId, limit: 500, offset: 0 }, controller.signal);
        setRawRows(res.items);
      } else if (kind === "prices") {
        const res = await filingApi.getPrices({ securityId: globalSecurityId.trim() || undefined, rawFileId: file.rawFileId, limit: 500, offset: 0 }, controller.signal);
        setRawRows(res.items);
      } else if (kind === "fxRates") {
        const res = await filingApi.getFxRates({ base: fxBase.trim().toUpperCase() || undefined, quote: fxQuote.trim().toUpperCase() || undefined, rawFileId: file.rawFileId, limit: 500, offset: 0 }, controller.signal);
        setRawRows(res.items);
      } else if (kind === "corporateActions") {
        const res = await filingApi.getCorporateActions({ accountId: accountId.trim() || undefined, securityId: globalSecurityId.trim() || undefined, rawFileId: file.rawFileId, limit: 500, offset: 0 }, controller.signal);
        setRawRows(res.items);
      }
    } catch {
      setRawError("Unable to load records for this file.");
    } finally {
      setRawLoading(false);
    }
  };

  const openTradesFile = async (file: InboxRawFileSummary) => {
    // Ensure only one viewer modal is open at a time.
    rawAbortRef.current?.abort();
    rawAbortRef.current = null;
    setRawOpen(false);

    setRawTradesFile(file);
    setRawTradesOpen(true);
    setRawTrades([]);
    setRawTradesError(null);
    setRawTradesLoading(true);

    rawTradesAbortRef.current?.abort();
    const controller = new AbortController();
    rawTradesAbortRef.current = controller;

    try {
      const next = await filingApi.getTrades(
        { accountId: accountId.trim() || undefined, from: fromDate || undefined, to: toDate || undefined, rawFileId: file.rawFileId, limit: 200, offset: 0 },
        controller.signal
      );
      setRawTrades(next);
    } catch {
      setRawTradesError("Unable to load trades for this file.");
    } finally {
      setRawTradesLoading(false);
    }
  };

  const kindForTab = (t: string): RawKind | null => {
    if (t === "positions") return "positions";
    if (t === "transfers") return "transfers";
    if (t === "cash") return "cash";
    if (t === "cashBalances") return "cashBalances";
    if (t === "prices") return "prices";
    if (t === "fxRates") return "fxRates";
    if (t === "corporateActions") return "corporateActions";
    return null;
  };

  const tradeFileColumns: DataTableColumn<InboxRawFileSummary>[] = useMemo(
    () => [
      {
        id: "account",
        header: "Account",
        sortValue: (r) => r.accountName ?? r.accountId ?? "",
        cell: (r) => <span className="font-medium">{r.accountName ?? r.accountId ?? "-"}</span>,
        filterValue: (r) => `${r.accountName ?? ""} ${r.accountId ?? ""}`
      },
      {
        id: "sourceSystem",
        header: "Source System",
        sortValue: (r) => r.sourceSystem ?? "",
        cell: (r) => (r.sourceSystem ? <Badge className="bg-violet-100 text-violet-800">{r.sourceSystem}</Badge> : "-"),
        filterValue: (r) => r.sourceSystem ?? ""
      },
      {
        id: "channel",
        header: "Channel",
        sortValue: (r) => r.ingestionChannel ?? "",
        cell: (r) => (r.ingestionChannel ? <Badge className="bg-indigo-100 text-indigo-800">{r.ingestionChannel}</Badge> : "-"),
        filterValue: (r) => r.ingestionChannel ?? ""
      },
      {
        id: "source",
        header: "Source",
        sortValue: (r) => r.source ?? "",
        cell: (r) => (r.source ? <Badge className="bg-sky-100 text-sky-800">{r.source}</Badge> : "-"),
        filterValue: (r) => r.source ?? ""
      },
      {
        id: "status",
        header: "Status",
        sortValue: (r) => r.rawFileStatus ?? r.status ?? "",
        cell: (r) =>
          (r.rawFileStatus ?? r.status) ? (
            <Badge
              className={
                (r.rawFileStatus ?? r.status) === "PROCESSED"
                  ? "bg-emerald-100 text-emerald-800"
                  : (r.rawFileStatus ?? r.status) === "FAILED"
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-100 text-slate-800"
              }
            >
              {r.rawFileStatus ?? r.status}
            </Badge>
          ) : (
            "-"
          ),
        filterValue: (r) => r.rawFileStatus ?? r.status ?? ""
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
              if (tab === "trades") {
                void openTradesFile(row);
                return;
              }
              const k = kindForTab(tab);
              if (k) void openRawFile(k, row);
            }}
          >
            View
          </Button>
        )
      }
    ],
    [openRawFile, openTradesFile, tab]
  );

  const batchFileColumns: DataTableColumn<InboxRawFileSummary>[] = useMemo(
    () => [
      {
        id: "account",
        header: "Account",
        sortValue: (r) => r.accountName ?? r.accountId ?? "",
        cell: (r) => <span className="font-medium">{r.accountName ?? r.accountId ?? "-"}</span>,
        filterValue: (r) => `${r.accountName ?? ""} ${r.accountId ?? ""}`
      },
      {
        id: "sourceSystem",
        header: "Source System",
        sortValue: (r) => r.sourceSystem ?? "",
        cell: (r) => (r.sourceSystem ? <Badge className="bg-violet-100 text-violet-800">{r.sourceSystem}</Badge> : "-"),
        filterValue: (r) => r.sourceSystem ?? ""
      },
      {
        id: "channel",
        header: "Channel",
        sortValue: (r) => r.ingestionChannel ?? "",
        cell: (r) => (r.ingestionChannel ? <Badge className="bg-indigo-100 text-indigo-800">{r.ingestionChannel}</Badge> : "-"),
        filterValue: (r) => r.ingestionChannel ?? ""
      },
      {
        id: "fileSource",
        header: "File Source",
        sortValue: (r) => r.fileSource ?? "",
        cell: (r) => (r.fileSource ? <Badge className="bg-slate-100 text-slate-800">{r.fileSource}</Badge> : "-"),
        filterValue: (r) => r.fileSource ?? ""
      },
      {
        id: "status",
        header: "Status",
        sortValue: (r) => r.rawFileStatus ?? r.status ?? "",
        cell: (r) =>
          (r.rawFileStatus ?? r.status) ? (
            <Badge
              className={
                (r.rawFileStatus ?? r.status) === "PROCESSED"
                  ? "bg-emerald-100 text-emerald-800"
                  : (r.rawFileStatus ?? r.status) === "FAILED"
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-100 text-slate-800"
              }
            >
              {r.rawFileStatus ?? r.status}
            </Badge>
          ) : (
            "-"
          ),
        filterValue: (r) => r.rawFileStatus ?? r.status ?? ""
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
        id: "effectiveDate",
        header: "Effective Date",
        sortValue: (r) => (r.toDate ? new Date(r.toDate).getTime() : 0),
        cell: (r) => (r.toDate ? formatDate(r.toDate) : "-")
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
              const k = kindForTab(tab);
              if (k) void openRawFile(k, row);
            }}
          >
            View
          </Button>
        )
      }
    ],
    [kindForTab, openRawFile, tab]
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
          }}
        >
          <TabsList>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="securities">Securities</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
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
                columns={tradeFileColumns}
                getRowId={(r) => r.rawFileId}
                onRowClick={async (row) => {
                  await openTradesFile(row);
                }}
                emptyTitle="No inbox files returned"
                emptyDescription="Try adjusting the date range."
              />
            </Section>
          </TabsContent>

          <TabsContent value="positions">
            <Section title="Position batches" description="One row per raw file. Click a row to view only that file's positions.">
              <DataTable
                data={batchFiltered.positions}
                columns={batchFileColumns}
                getRowId={(r) => r.rawFileId}
                onRowClick={(row) => void openRawFile("positions", row)}
                emptyTitle="No position batches"
                emptyDescription="Try adjusting the date range."
              />
            </Section>
          </TabsContent>

          <TabsContent value="transfers">
            <Section title="Transfer batches" description="One row per raw file. Click a row to view only that file's transfers.">
              <DataTable
                data={batchFiltered.transfers}
                columns={batchFileColumns}
                getRowId={(r) => r.rawFileId}
                onRowClick={(row) => void openRawFile("transfers", row)}
                emptyTitle="No transfer batches"
                emptyDescription="Try adjusting the date range."
              />
            </Section>
          </TabsContent>

          <TabsContent value="cash">
            <Section title="Cash transaction batches" description="One row per raw file. Click a row to view only that file's cash transactions.">
              <DataTable
                data={batchFiltered.cash}
                columns={batchFileColumns}
                getRowId={(r) => r.rawFileId}
                onRowClick={(row) => void openRawFile("cash", row)}
                emptyTitle="No cash transaction batches"
                emptyDescription="Try adjusting the date range."
              />
            </Section>
          </TabsContent>

          <TabsContent value="cashBalances">
            <Section title="Cash balance batches" description="One row per raw file. Click a row to view only that file's cash balances.">
              <DataTable
                data={batchFiltered.cashBalances}
                columns={batchFileColumns}
                getRowId={(r) => r.rawFileId}
                onRowClick={(row) => void openRawFile("cashBalances", row)}
                emptyTitle="No cash balance batches"
                emptyDescription="Try adjusting the date range."
              />
            </Section>
          </TabsContent>

          <TabsContent value="prices">
            <Section title="Price batches" description="One row per raw file. Click a row to view only that file's prices.">
              <DataTable
                data={batchFiltered.prices}
                columns={batchFileColumns}
                getRowId={(r) => r.rawFileId}
                onRowClick={(row) => void openRawFile("prices", row)}
                emptyTitle="No price batches"
                emptyDescription="Try adjusting the date range."
              />
            </Section>
          </TabsContent>

          <TabsContent value="fxRates">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input value={fxBase} onChange={(e) => setFxBase(e.target.value)} placeholder="Base (e.g. USD)" className="w-full sm:w-[180px]" />
              <Input value={fxQuote} onChange={(e) => setFxQuote(e.target.value)} placeholder="Quote (e.g. EUR)" className="w-full sm:w-[180px]" />
              <div className="text-xs text-muted-foreground">Optional: set base/quote to filter pairs.</div>
            </div>
            <Section title="FX rate batches" description="One row per raw file. Click a row to view only that file's FX rates.">
              <DataTable
                data={batchFiltered.fxRates}
                columns={batchFileColumns}
                getRowId={(r) => r.rawFileId}
                onRowClick={(row) => void openRawFile("fxRates", row)}
                emptyTitle="No FX rate batches"
                emptyDescription="Try adjusting the date range."
              />
            </Section>
          </TabsContent>

          <TabsContent value="corporateActions">
            <Section title="Corporate action batches" description="One row per raw file. Click a row to view only that file's corporate actions.">
              <DataTable
                data={batchFiltered.corporateActions}
                columns={batchFileColumns}
                getRowId={(r) => r.rawFileId}
                onRowClick={(row) => void openRawFile("corporateActions", row)}
                emptyTitle="No corporate action batches"
                emptyDescription="Try adjusting the date range."
              />
            </Section>
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

      <RawFileRecordsModal
        open={rawOpen}
        kind={rawKind}
        file={rawFile}
        loading={rawLoading}
        error={rawError}
        rows={rawRows}
        onClose={() => {
          rawAbortRef.current?.abort();
          rawAbortRef.current = null;
          setRawOpen(false);
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

function RawFileRecordsModal({
  open,
  kind,
  file,
  loading,
  error,
  rows,
  onClose
}: {
  open: boolean;
  kind: "positions" | "transfers" | "cash" | "cashBalances" | "prices" | "fxRates" | "corporateActions";
  file: InboxRawFileSummary | null;
  loading: boolean;
  error: string | null;
  rows: unknown[];
  onClose: () => void;
}) {
  if (!open || !file) return null;

  const title =
    kind === "positions"
      ? "Positions"
      : kind === "transfers"
        ? "Transfers"
      : kind === "cash"
        ? "Cash transactions"
        : kind === "cashBalances"
          ? "Cash balances"
          : kind === "prices"
            ? "Prices"
            : kind === "fxRates"
              ? "FX rates"
              : "Corporate actions";

  const columns =
    kind === "positions"
      ? (POSITION_COLUMNS as DataTableColumn<unknown>[])
      : kind === "transfers"
        ? (TRANSFER_COLUMNS as DataTableColumn<unknown>[])
      : kind === "cash"
        ? (CASH_TXN_COLUMNS as DataTableColumn<unknown>[])
        : kind === "cashBalances"
          ? (CASH_BALANCE_COLUMNS as DataTableColumn<unknown>[])
          : kind === "prices"
            ? (PRICE_COLUMNS as DataTableColumn<unknown>[])
            : kind === "fxRates"
              ? (FX_COLUMNS as DataTableColumn<unknown>[])
              : (CORP_ACTION_COLUMNS as DataTableColumn<unknown>[]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
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
      {!loading && rows.length === 0 && !error ? (
        <EmptyState title="No records for this file" description="This raw file has no linked records for the selected type." />
      ) : null}
      {!loading && rows.length > 0 ? (
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(r) => String((r as { id?: unknown }).id ?? Math.random())}
          initialPageSize={20}
        />
      ) : null}
    </Drawer>
  );
}
