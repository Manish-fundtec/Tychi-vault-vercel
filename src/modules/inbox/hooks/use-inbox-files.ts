import { useCallback, useEffect, useState } from "react";
import { fetchInboxFiles } from "../api/inbox-api";
import type { InboxFile } from "../types/inbox";

export function useInboxFiles() {
  const [data, setData] = useState<InboxFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const next = await fetchInboxFiles(signal);
      setData(next);
    } catch {
      setError("Unable to fetch inbox files.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    const intervalId = window.setInterval(() => {
      void load();
    }, 8000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [load]);

  return { data, loading, error, reload: () => load() };
}