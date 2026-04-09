import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { cn } from "../../../lib/utils";
import { Page, PageHeader, Section } from "../../../components/common/page";
import { ApiError, apiClient } from "../../../lib/api/client";

type MappingKey = string; // sourceField
type MappingValue = string; // targetField

type PairKey = "trades" | "securities" | "accounts" | "exchanges" | "assettypes";
type PairTab = {
  id: PairKey;
  title: string;
  sourceLabel: string;
  targetLabel: string;
};

const PAIRS: PairTab[] = [
  { id: "trades", title: "Trades", sourceLabel: "Vault trades columns", targetLabel: "Tychi trade buffer columns" },
  { id: "securities", title: "Securities", sourceLabel: "Vault securities columns", targetLabel: "Tychi symbols columns" },
  { id: "accounts", title: "Accounts", sourceLabel: "Vault accounts columns", targetLabel: "Tychi brokers columns" },
  { id: "exchanges", title: "Exchanges", sourceLabel: "Vault security equities columns", targetLabel: "Tychi exchanges columns" },
  { id: "assettypes", title: "Asset types", sourceLabel: "Vault securities columns", targetLabel: "Tychi asset types columns" }
];

type FieldMappingRow = { source_field: string; target_field: string };
type MappingPair = {
  unique_source_key?: string | null;
  unique_target_key?: string | null;
};

type MappingPairResponse = {
  metadata?: {
    sourceFields?: string[];
    targetFields?: string[];
    suggestedMappings?: Record<string, string> | FieldMappingRow[];
  };
  pair?: MappingPair;
  fieldMappings?: FieldMappingRow[];
};

function asText(v: unknown) {
  return typeof v === "string" ? v : String(v ?? "");
}

function normalizeSuggestedMappings(v: unknown): Record<string, string> {
  if (!v) return {};
  if (Array.isArray(v)) {
    const out: Record<string, string> = {};
    for (const row of v) {
      const r = row as Partial<FieldMappingRow & { sourceField?: string; targetField?: string }>;
      const sf = r.source_field ?? r.sourceField;
      const tf = r.target_field ?? r.targetField;
      if (typeof sf === "string" && typeof tf === "string") out[sf] = tf;
    }
    return out;
  }
  if (typeof v === "object") {
    const out: Record<string, string> = {};
    for (const [k, vv] of Object.entries(v as Record<string, unknown>)) {
      if (typeof vv === "string") out[k] = vv;
    }
    return out;
  }
  return {};
}

function normalizeFieldMappingsArray(v: unknown): FieldMappingRow[] {
  if (!Array.isArray(v)) return [];
  const out: FieldMappingRow[] = [];
  for (const row of v) {
    const r = row as Partial<FieldMappingRow & { sourceField?: string; targetField?: string }>;
    const sf = r.source_field ?? r.sourceField;
    const tf = r.target_field ?? r.targetField;
    if (typeof sf === "string" && typeof tf === "string") out.push({ source_field: sf, target_field: tf });
  }
  return out;
}

function normalizeFieldMappings(v: unknown): Record<string, string> {
  return Object.fromEntries(normalizeFieldMappingsArray(v).map((x) => [x.source_field, x.target_field]));
}

function pickStringArray(obj: Record<string, unknown>, keys: string[]): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) {
      const a = v.filter((x): x is string => typeof x === "string");
      if (a.length > 0) return a;
    }
  }
  return [];
}

/** Normalizes one API payload: root vs metadata, snake_case vs camelCase, alternate column keys. */
function normalizeMappingPairBody(raw: unknown): MappingPairResponse {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const md = o.metadata && typeof o.metadata === "object" ? (o.metadata as Record<string, unknown>) : o;

  let src = pickStringArray(md, ["sourceFields", "source_fields", "sourceColumns", "source_columns"]);
  let dst = pickStringArray(md, ["targetFields", "target_fields", "targetColumns", "target_columns"]);

  const cols = (o.columns ?? md.columns) as unknown;
  if (src.length === 0 && dst.length === 0 && cols && typeof cols === "object") {
    const c = cols as Record<string, unknown>;
    const s = c.source ?? c.sourceFields ?? c.source_fields;
    const t = c.target ?? c.targetFields ?? c.target_fields;
    if (Array.isArray(s)) src = s.filter((x): x is string => typeof x === "string");
    if (Array.isArray(t)) dst = t.filter((x): x is string => typeof x === "string");
  }

  const sugg = normalizeSuggestedMappings(md.suggestedMappings ?? md.suggested_mappings ?? o.suggestedMappings);
  const pair: MappingPair = {
    unique_source_key: (o.unique_source_key ?? md.unique_source_key ?? o.uniqueSourceKey ?? md.uniqueSourceKey) as
      | string
      | null
      | undefined,
    unique_target_key: (o.unique_target_key ?? md.unique_target_key ?? o.uniqueTargetKey ?? md.uniqueTargetKey) as
      | string
      | null
      | undefined
  };
  const fm = o.fieldMappings ?? o.field_mappings ?? md.fieldMappings ?? md.field_mappings;
  return {
    metadata: {
      sourceFields: src,
      targetFields: dst,
      suggestedMappings: sugg
    },
    pair,
    fieldMappings: normalizeFieldMappingsArray(fm)
  };
}

function mergeMappingPairResponses(a: MappingPairResponse, b: MappingPairResponse): MappingPairResponse {
  const as = a.metadata?.sourceFields ?? [];
  const bs = b.metadata?.sourceFields ?? [];
  const at = a.metadata?.targetFields ?? [];
  const bt = b.metadata?.targetFields ?? [];
  const sourceFields = bs.length > as.length ? bs : as;
  const targetFields = bt.length > at.length ? bt : at;
  const sugg = { ...normalizeSuggestedMappings(b.metadata?.suggestedMappings), ...normalizeSuggestedMappings(a.metadata?.suggestedMappings) };
  const pair: MappingPair = {
    unique_source_key: a.pair?.unique_source_key ?? b.pair?.unique_source_key,
    unique_target_key: a.pair?.unique_target_key ?? b.pair?.unique_target_key
  };
  const merged = new Map<string, string>();
  for (const r of normalizeFieldMappingsArray(a.fieldMappings)) merged.set(r.source_field, r.target_field);
  for (const r of normalizeFieldMappingsArray(b.fieldMappings)) merged.set(r.source_field, r.target_field);
  const fieldMappings = Array.from(merged.entries()).map(([source_field, target_field]) => ({ source_field, target_field }));
  return {
    metadata: { sourceFields, targetFields, suggestedMappings: sugg },
    pair,
    fieldMappings
  };
}

function matchesPairKey(p: unknown, pairKey: PairKey): boolean {
  if (!p || typeof p !== "object") return false;
  const x = p as Record<string, unknown>;
  const k = x.pair ?? x.pairKey ?? x.pair_key ?? x.key;
  if (k === pairKey) return true;
  const st = String(x.source_table ?? x.sourceTable ?? "");
  const tt = String(x.target_table ?? x.targetTable ?? "");
  if (pairKey === "trades") return st.includes("vault_trades") && tt.includes("trade_buffer");
  if (pairKey === "securities") return st.includes("vault_securities") && tt.includes("symbols");
  if (pairKey === "accounts") return st.includes("vault_accounts") && tt.includes("brokers");
  if (pairKey === "exchanges") return st.includes("vault_security_equities") && tt.includes("exchanges");
  if (pairKey === "assettypes") return st.includes("vault_securities") && tt.includes("assettype");
  return false;
}

function extractPairPayload(p: Record<string, unknown>): { pair: MappingPair; fieldMappings: FieldMappingRow[] } {
  const fm = p.fieldMappings ?? p.field_mappings ?? p.FieldMappings;
  return {
    pair: {
      unique_source_key: (p.unique_source_key ?? p.uniqueSourceKey) as string | null | undefined,
      unique_target_key: (p.unique_target_key ?? p.uniqueTargetKey) as string | null | undefined
    },
    fieldMappings: normalizeFieldMappingsArray(fm)
  };
}

function extractPairFromList(data: unknown, pairKey: PairKey): { pair: MappingPair; fieldMappings: FieldMappingRow[] } {
  const empty = { pair: {} as MappingPair, fieldMappings: [] as FieldMappingRow[] };
  if (!data || typeof data !== "object") return empty;
  const o = data as Record<string, unknown>;

  const nested = o[pairKey];
  if (nested && typeof nested === "object") {
    return extractPairPayload(nested as Record<string, unknown>);
  }

  const candidates = (o.pairs ?? o.mappingPairs ?? o.mapping_table_pairs ?? o.items) as unknown;
  if (Array.isArray(candidates)) {
    const found = candidates.find((p) => matchesPairKey(p, pairKey));
    if (found && typeof found === "object") {
      return extractPairPayload(found as Record<string, unknown>);
    }
  }

  if (matchesPairKey(o, pairKey)) {
    return extractPairPayload(o);
  }

  return empty;
}

async function fetchMappingPairFallback(pairId: PairKey, signal: AbortSignal): Promise<MappingPairResponse> {
  const qs = new URLSearchParams({ pair: pairId });
  const [metaRaw, listRaw] = await Promise.all([
    apiClient.get<Record<string, unknown>>(`/integration/mapping/field-metadata?${qs}`, signal),
    apiClient.get<Record<string, unknown>>(`/integration/mapping`, signal)
  ]);

  const metaNorm = normalizeMappingPairBody(metaRaw);
  const fromList = extractPairFromList(listRaw, pairId);

  return {
    metadata: {
      sourceFields: metaNorm.metadata?.sourceFields ?? [],
      targetFields: metaNorm.metadata?.targetFields ?? [],
      suggestedMappings: metaNorm.metadata?.suggestedMappings ?? {}
    },
    pair: fromList.pair,
    fieldMappings: fromList.fieldMappings
  };
}

async function loadMappingPair(pairId: PairKey, signal: AbortSignal): Promise<MappingPairResponse> {
  let primary: MappingPairResponse | null = null;
  try {
    const res = await apiClient.get<MappingPairResponse>(`/integration/mapping/${pairId}`, signal);
    if (res != null) primary = normalizeMappingPairBody(res);
  } catch (e) {
    if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 405)) {
      throw e;
    }
  }

  const srcLen = primary?.metadata?.sourceFields?.length ?? 0;
  const tgtLen = primary?.metadata?.targetFields?.length ?? 0;
  const needsFallback = primary == null || srcLen === 0 || tgtLen === 0;

  if (!needsFallback) {
    return primary!;
  }

  try {
    const fallbackRaw = await fetchMappingPairFallback(pairId, signal);
    const fallback = normalizeMappingPairBody(fallbackRaw);
    if (primary) return mergeMappingPairResponses(primary, fallback);
    return fallback;
  } catch (e) {
    if (isAbortError(e)) throw e;
    if (primary) return primary;
    throw e;
  }
}

function isAbortError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const name = (e as { name?: string }).name;
  if (name === "AbortError") return true;
  const msg = String((e as Error).message ?? "");
  return /aborted|AbortError/i.test(msg);
}

export function MappingIntegrationPage() {
  const [pairId, setPairId] = useState<PairKey>("trades");
  const pairTab = useMemo(() => PAIRS.find((p) => p.id === pairId)!, [pairId]);

  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [targetFields, setTargetFields] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<Record<string, string>>({});
  const [uniqueSourceKey, setUniqueSourceKey] = useState<string>("");
  const [uniqueTargetKey, setUniqueTargetKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loadedPairsRef = useRef(new Set<PairKey>());

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<MappingKey, MappingValue>>({});

  const mappedCount = Object.keys(mappings).length;
  const totalCount = sourceFields.length;

  const targetToSource = useMemo(() => {
    const inv = new Map<string, string>();
    for (const [src, dst] of Object.entries(mappings)) {
      inv.set(dst, src);
    }
    return inv;
  }, [mappings]);

  const canLink = Boolean(selectedSource && selectedTarget);
  const canUnlink = Boolean((selectedSource && mappings[selectedSource]) || (selectedTarget && targetToSource.get(selectedTarget)));

  useEffect(() => {
    let stale = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSaveError(null);

    loadMappingPair(pairId, controller.signal)
      .then((res) => {
        if (stale) return;
        const r = (res ?? {}) as MappingPairResponse;
        const src = r.metadata?.sourceFields ?? [];
        const dst = r.metadata?.targetFields ?? [];
        const sugg = normalizeSuggestedMappings(r.metadata?.suggestedMappings);

        setSourceFields(src);
        setTargetFields(dst);
        setSuggested(sugg);

        const pair = r.pair ?? {};
        setUniqueSourceKey(asText(pair.unique_source_key ?? ""));
        setUniqueTargetKey(asText(pair.unique_target_key ?? ""));

        const saved = normalizeFieldMappings(r.fieldMappings);

        // First time you open a pair: start with suggested mappings, then apply saved mappings over them.
        // Subsequent opens: keep user's current local edits for that pair.
        if (!loadedPairsRef.current.has(pairId)) {
          setMappings({ ...sugg, ...saved });
          loadedPairsRef.current.add(pairId);
        } else {
          // Still refresh saved mappings if the user hasn't edited anything yet.
          setMappings((prev) => (Object.keys(prev).length === 0 ? { ...sugg, ...saved } : prev));
        }
      })
      .catch((e: unknown) => {
        if (stale || isAbortError(e)) return;
        const msg = e instanceof Error ? e.message : "Failed to load mapping metadata";
        setError(msg);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });

    return () => {
      stale = true;
      controller.abort();
    };
  }, [pairId]);

  const link = () => {
    if (!selectedSource || !selectedTarget) return;
    if (targetToSource.get(selectedTarget)) return;
    setMappings((prev) => ({ ...prev, [selectedSource]: selectedTarget }));
    setSelectedSource(null);
    setSelectedTarget(null);
  };

  const unlink = () => {
    setMappings((prev) => {
      const next = { ...prev };
      if (selectedSource && next[selectedSource]) {
        delete next[selectedSource];
      } else if (selectedTarget) {
        const src = targetToSource.get(selectedTarget);
        if (src) delete next[src];
      }
      return next;
    });
    setSelectedSource(null);
    setSelectedTarget(null);
    setEditingSource(null);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        mappings: Object.entries(mappings).map(([source_field, target_field]) => ({ source_field, target_field })),
        unique_source_key: uniqueSourceKey.trim() ? uniqueSourceKey.trim() : undefined,
        unique_target_key: uniqueTargetKey.trim() ? uniqueTargetKey.trim() : undefined
      };
      await apiClient.put(
        `/integration/mapping/${pairId}/fields`,
        JSON.stringify(payload),
        { "Content-Type": "application/json" }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save mappings";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Mapping integration"
        description="Map Vault table fields to Tychi table fields."
        right={
          <div className="flex items-center gap-2">
            <Badge className="bg-muted text-muted-foreground">{mappedCount} / {totalCount} mapped</Badge>
            <Button size="sm" onClick={save} disabled={loading || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />

      <Section>
        <Tabs
          value={pairId}
          onValueChange={(v) => {
            setPairId(v as PairKey);
            setSelectedSource(null);
            setSelectedTarget(null);
            setEditingSource(null);
          }}
        >
          <TabsList>
            {PAIRS.map((p) => (
              <TabsTrigger key={p.id} value={p.id}>
                {p.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {error ? (
          <div className="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {error}
          </div>
        ) : null}
        {saveError ? (
          <div className="mt-3 rounded-xl border border-border bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card className="p-4">
            <div className="text-sm font-semibold">Unique keys</div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Unique source key</div>
                <Input value={uniqueSourceKey} onChange={(e) => setUniqueSourceKey(e.target.value)} placeholder="e.g. source_trade_id" />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Unique target key</div>
                <Input value={uniqueTargetKey} onChange={(e) => setUniqueTargetKey(e.target.value)} placeholder="e.g. trade_buffer_id" />
              </div>
            </div>
            {Object.keys(suggested).length > 0 ? (
              <div className="mt-3 text-xs text-muted-foreground">
                Suggested mappings are prefilled for convenience — saved mappings take precedence once you save.
              </div>
            ) : null}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_72px_1fr] lg:items-start">
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
              <div className="text-sm font-semibold">{pairTab.sourceLabel}</div>
              <div className="text-xs text-muted-foreground">{sourceFields.length} fields</div>
            </div>
            <div className="max-h-[420px] overflow-auto">
              {loading ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
              ) : (
                sourceFields.map((f) => {
                const mapped = mappings[f];
                const selected = selectedSource === f;
                return (
                  <button
                    key={f}
                    type="button"
                    className={cn(
                      "w-full border-b border-border px-4 py-2.5 text-left text-sm",
                      "hover:bg-muted/40",
                      selected && "bg-sky-50 text-sky-900",
                      mapped && !selected && "text-muted-foreground"
                    )}
                    onClick={() => setSelectedSource((prev) => (prev === f ? null : f))}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", mapped ? "bg-emerald-500" : "bg-border")} />
                      <span className="font-medium">{f}</span>
                      {mapped ? (
                        <span className="ml-auto text-xs text-muted-foreground">→ {mapped}</span>
                      ) : null}
                    </div>
                  </button>
                );
              })
              )}
            </div>
          </Card>

          <div className="flex flex-row items-center justify-center gap-2 lg:flex-col lg:pt-14">
            <Button size="sm" variant="outline" disabled={!canLink} onClick={link} className="h-10 w-10 rounded-full p-0">
              ↔
            </Button>
            <Button size="sm" variant="outline" disabled={!canUnlink} onClick={unlink} className="h-10 w-10 rounded-full p-0">
              ✕
            </Button>
          </div>

          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
              <div className="text-sm font-semibold">{pairTab.targetLabel}</div>
              <div className="text-xs text-muted-foreground">{targetFields.length} fields</div>
            </div>
            <div className="max-h-[420px] overflow-auto">
              {loading ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
              ) : (
                targetFields.map((f) => {
                const mappedBy = targetToSource.get(f);
                const selected = selectedTarget === f;
                return (
                  <button
                    key={f}
                    type="button"
                    className={cn(
                      "w-full border-b border-border px-4 py-2.5 text-left text-sm",
                      "hover:bg-muted/40",
                      selected && "bg-sky-50 text-sky-900",
                      mappedBy && !selected && "text-muted-foreground"
                    )}
                    onClick={() => setSelectedTarget((prev) => (prev === f ? null : f))}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", mappedBy ? "bg-emerald-500" : "bg-border")} />
                      <span className="font-medium">{f}</span>
                      {mappedBy ? (
                        <span className="ml-auto text-xs text-muted-foreground">← {mappedBy}</span>
                      ) : null}
                    </div>
                  </button>
                );
              })
              )}
              {!loading && targetFields.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">No matching fields.</div>
              ) : null}
            </div>
          </Card>
        </div>
      </Section>

      <Section
        title="Active mappings"
        description="Edit or remove mappings."
      >
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-sm font-semibold">Mappings</div>
            <button
              className="text-sm text-red-600 hover:underline disabled:opacity-40"
              disabled={mappedCount === 0}
              onClick={() => {
                setMappings({});
                setEditingSource(null);
                setSelectedSource(null);
                setSelectedTarget(null);
              }}
            >
              Clear all
            </button>
          </div>

          {mappedCount === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No mappings yet — select a source field and a vault field, then click ↔
            </div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(mappings).map(([src, dst]) => {
                const isEditing = editingSource === src;
                return (
                  <div key={src} className="grid grid-cols-[1fr_24px_1fr_80px] items-center gap-3 px-4 py-3">
                    <span className="truncate rounded-lg bg-sky-50 px-2 py-1 text-sm font-medium text-sky-900">{src}</span>
                    <span className="text-center text-muted-foreground">→</span>
                    {isEditing ? (
                      <select
                        className="h-9 w-full rounded-xl border border-border bg-transparent px-2 text-sm"
                        value={dst}
                        onChange={(e) =>
                          setMappings((prev) => ({
                            ...prev,
                            [src]: asText(e.target.value)
                          }))
                        }
                      >
                        {targetFields.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="truncate rounded-lg bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-900">{dst}</span>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingSource((prev) => (prev === src ? null : src))}
                      >
                        {isEditing ? "Done" : "Edit"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setMappings((prev) => {
                            const next = { ...prev };
                            delete next[src];
                            return next;
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Section>
    </Page>
  );
}

