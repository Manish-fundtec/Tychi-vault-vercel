import { useEffect, useMemo, useState } from "react";
import { filingApi } from "../api/filing-api";
import type {
  CashBalance,
  CashTransaction,
  Conversion,
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

export function useFilingData(filters?: {
  from?: string;
  to?: string;
  accountId?: string;
  securityId?: string;
  fxBase?: string;
  fxQuote?: string;
  conversionPair?: string;
  rawFileId?: string;
}) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [cashBalances, setCashBalances] = useState<CashBalance[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [fxRates, setFxRates] = useState<FxRate[]>([]);
  const [corporateActions, setCorporateActions] = useState<CorporateAction[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [securities, setSecurities] = useState<SecurityMaster[]>([]);
  const [securityBatches, setSecurityBatches] = useState<SecurityBatchSummary[]>([]);
  const [inboxRawFiles, setInboxRawFiles] = useState<InboxRawFileSummary[]>([]);
  const [positionBatches, setPositionBatches] = useState<InboxRawFileSummary[]>([]);
  const [transferBatches, setTransferBatches] = useState<InboxRawFileSummary[]>([]);
  const [cashTransactionBatches, setCashTransactionBatches] = useState<InboxRawFileSummary[]>([]);
  const [cashBalanceBatches, setCashBalanceBatches] = useState<InboxRawFileSummary[]>([]);
  const [fxRateBatches, setFxRateBatches] = useState<InboxRawFileSummary[]>([]);
  const [corporateActionBatches, setCorporateActionBatches] = useState<InboxRawFileSummary[]>([]);
  const [conversionBatches, setConversionBatches] = useState<InboxRawFileSummary[]>([]);
  const [priceBatches, setPriceBatches] = useState<InboxRawFileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        setWarnings([]);
        setError(null);

        const safePrices =
          filters?.securityId ? filingApi.getPrices({ securityId: filters.securityId, from: filters?.from, to: filters?.to, limit: 500, offset: 0 }, controller.signal) : Promise.resolve({ items: [], limit: 0, offset: 0 });
        const safeFx = filingApi.getFxRates(
          {
            base: filters?.fxBase,
            quote: filters?.fxQuote,
            from: filters?.from,
            to: filters?.to,
            limit: 500,
            offset: 0
          },
          controller.signal
        );
        const safeCorporateActions =
          filters?.accountId || filters?.securityId
            ? filingApi.getCorporateActions({ accountId: filters?.accountId, securityId: filters?.securityId, from: filters?.from, to: filters?.to, limit: 500, offset: 0 }, controller.signal)
            : Promise.resolve({ items: [], limit: 0, offset: 0 });
        const safeConversions = filingApi.getConversions(
          {
            accountId: filters?.accountId,
            pair: filters?.conversionPair,
            from: filters?.from,
            to: filters?.to,
            limit: 500,
            offset: 0
          },
          controller.signal
        );

        const results = await Promise.allSettled([
          filters?.rawFileId
            ? filingApi.getTradesForRawFile(filters.rawFileId, { limit: 100, offset: 0 }, controller.signal)
            : filingApi.getTrades({ from: filters?.from, to: filters?.to, accountId: filters?.accountId, limit: 100, offset: 0 }, controller.signal),
          filingApi.getPositions({ accountId: filters?.accountId, from: filters?.from, to: filters?.to, limit: 500, offset: 0 }, controller.signal),
          filingApi.getTransfers({ accountId: filters?.accountId, from: filters?.from, to: filters?.to, limit: 500, offset: 0 }, controller.signal),
          filingApi.getCashTransactions({ accountId: filters?.accountId, from: filters?.from, to: filters?.to, limit: 500, offset: 0 }, controller.signal),
          filingApi.getCashBalances({ accountId: filters?.accountId, from: filters?.from, to: filters?.to, limit: 500, offset: 0 }, controller.signal),
          safePrices,
          safeFx,
          safeCorporateActions,
          filingApi.getSecurities({ accountId: filters?.accountId, limit: 100, offset: 0 }, controller.signal),
          filingApi.getSecurityBatches({ accountId: filters?.accountId, limit: 50, offset: 0 }, controller.signal),
          filingApi.getInboxRawFiles({ accountId: filters?.accountId, limit: 50, offset: 0 }, controller.signal),
          filingApi.getPositionBatches({ accountId: filters?.accountId, from: filters?.from, to: filters?.to, limit: 50, offset: 0 }, controller.signal),
          filingApi.getTransferBatches({ accountId: filters?.accountId, from: filters?.from, to: filters?.to, limit: 50, offset: 0 }, controller.signal),
          filingApi.getCashTransactionBatches({ accountId: filters?.accountId, from: filters?.from, to: filters?.to, limit: 50, offset: 0 }, controller.signal),
          filingApi.getCashBalanceBatches({ accountId: filters?.accountId, from: filters?.from, to: filters?.to, limit: 50, offset: 0 }, controller.signal),
          filingApi.getPriceBatches({ securityId: filters?.securityId, from: filters?.from, to: filters?.to, limit: 50, offset: 0 }, controller.signal),
          filingApi.getFxRateBatches({ base: filters?.fxBase, quote: filters?.fxQuote, from: filters?.from, to: filters?.to, limit: 50, offset: 0 }, controller.signal),
          filingApi.getCorporateActionBatches({ accountId: filters?.accountId, securityId: filters?.securityId, from: filters?.from, to: filters?.to, limit: 50, offset: 0 }, controller.signal),
          safeConversions,
          filingApi.getConversionBatches({ accountId: filters?.accountId, limit: 50, offset: 0 }, controller.signal)
        ]);

        const nextWarnings: string[] = [];

        const setIfOk = <T,>(r: PromiseSettledResult<T>, setter: (v: T) => void, label: string, fallback: T) => {
          if (r.status === "fulfilled") {
            setter(r.value);
          } else {
            setter(fallback);
            nextWarnings.push(`${label} failed to load.`);
          }
        };

        setIfOk(results[0] as PromiseSettledResult<Trade[]>, setTrades, "Trades", []);
        setIfOk(results[1] as PromiseSettledResult<{ items: Position[] }>, (v) => setPositions(v.items), "Positions", { items: [] });
        setIfOk(results[2] as PromiseSettledResult<{ items: Transfer[] }>, (v) => setTransfers(v.items), "Transfers", { items: [] });
        setIfOk(results[3] as PromiseSettledResult<{ items: CashTransaction[] }>, (v) => setCashTransactions(v.items), "Cash transactions", { items: [] });
        setIfOk(results[4] as PromiseSettledResult<{ items: CashBalance[] }>, (v) => setCashBalances(v.items), "Cash balances", { items: [] });
        setIfOk(results[5] as PromiseSettledResult<{ items: Price[] }>, (v) => setPrices(v.items), "Prices", { items: [] });
        setIfOk(results[6] as PromiseSettledResult<{ items: FxRate[] }>, (v) => setFxRates(v.items), "FX rates", { items: [] });
        setIfOk(results[7] as PromiseSettledResult<{ items: CorporateAction[] }>, (v) => setCorporateActions(v.items), "Corporate actions", { items: [] });
        setIfOk(results[8] as PromiseSettledResult<SecurityMaster[]>, setSecurities, "Securities", []);
        setIfOk(results[9] as PromiseSettledResult<SecurityBatchSummary[]>, setSecurityBatches, "Security batches", []);
        setIfOk(results[10] as PromiseSettledResult<InboxRawFileSummary[]>, setInboxRawFiles, "Inbox files", []);
        setIfOk(results[11] as PromiseSettledResult<InboxRawFileSummary[]>, setPositionBatches, "Position batches", []);
        setIfOk(results[12] as PromiseSettledResult<InboxRawFileSummary[]>, setTransferBatches, "Transfer batches", []);
        setIfOk(results[13] as PromiseSettledResult<InboxRawFileSummary[]>, setCashTransactionBatches, "Cash transaction batches", []);
        setIfOk(results[14] as PromiseSettledResult<InboxRawFileSummary[]>, setCashBalanceBatches, "Cash balance batches", []);
        setIfOk(results[15] as PromiseSettledResult<InboxRawFileSummary[]>, setPriceBatches, "Price batches", []);
        setIfOk(results[16] as PromiseSettledResult<InboxRawFileSummary[]>, setFxRateBatches, "FX rate batches", []);
        setIfOk(results[17] as PromiseSettledResult<InboxRawFileSummary[]>, setCorporateActionBatches, "Corporate action batches", []);
        setIfOk(results[18] as PromiseSettledResult<{ items: Conversion[] }>, (v) => setConversions(v.items), "Conversions", { items: [] });
        setIfOk(results[19] as PromiseSettledResult<InboxRawFileSummary[]>, setConversionBatches, "Conversion batches", []);

        setWarnings(nextWarnings);

        if (nextWarnings.length === results.length) {
          setError("Unable to load filing cabinet data.");
        }
      } catch {
        setError("Unable to load filing cabinet data.");
      } finally {
        setLoading(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [
    filters?.from,
    filters?.to,
    filters?.accountId,
    filters?.rawFileId,
    filters?.securityId,
    filters?.fxBase,
    filters?.fxQuote,
    filters?.conversionPair
  ]);

  return useMemo(
    () => ({
      trades,
      positions,
      transfers,
      cashTransactions,
      cashBalances,
      prices,
      fxRates,
      corporateActions,
      conversions,
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
      conversionBatches,
      loading,
      error,
      warnings
    }),
    [
      trades,
      positions,
      transfers,
      cashTransactions,
      cashBalances,
      prices,
      fxRates,
      corporateActions,
      conversions,
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
      conversionBatches,
      loading,
      error,
      warnings
    ]
  );
}