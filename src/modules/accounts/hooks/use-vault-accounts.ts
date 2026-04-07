import { useCallback, useEffect, useState } from "react";
import { fetchVaultAccounts } from "../api/accounts-api";
import type { VaultAccount } from "../types/accounts";

export function useVaultAccounts() {
  const [data, setData] = useState<VaultAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const next = await fetchVaultAccounts(signal);
      setData(next);
    } catch {
      setError("Unable to load vault accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { data, loading, error, reload: () => load() };
}

