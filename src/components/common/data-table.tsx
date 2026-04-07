import { useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  className?: string;
  headerClassName?: string;
  align?: "left" | "right" | "center";
  accessor?: (row: T) => unknown;
  cell?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  filterValue?: (row: T) => string | null | undefined;
};

type SortState = { columnId: string; direction: "asc" | "desc" } | null;

function toText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  rowClassName,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  toolbar,
  emptyTitle = "No results",
  emptyDescription = "Try adjusting your filters."
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  toolbar?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const effective = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? data
      : data.filter((row) => {
          return columns.some((col) => {
            const val = col.filterValue
              ? col.filterValue(row)
              : col.accessor
                ? toText(col.accessor(row))
                : typeof col.cell === "function"
                  ? toText(col.cell(row))
                  : "";
            return (val ?? "").toLowerCase().includes(q);
          });
        });

    const sorted =
      !sort
        ? filtered
        : [...filtered].sort((a, b) => {
            const col = columns.find((c) => c.id === sort.columnId);
            const av = col?.sortValue ? col.sortValue(a) : col?.accessor ? col.accessor(a) : null;
            const bv = col?.sortValue ? col.sortValue(b) : col?.accessor ? col.accessor(b) : null;
            const an = typeof av === "number" ? av : Number.NaN;
            const bn = typeof bv === "number" ? bv : Number.NaN;

            let cmp = 0;
            if (!Number.isNaN(an) && !Number.isNaN(bn)) {
              cmp = an < bn ? -1 : an > bn ? 1 : 0;
            } else {
              const as = toText(av).toLowerCase();
              const bs = toText(bv).toLowerCase();
              cmp = as < bs ? -1 : as > bs ? 1 : 0;
            }
            return sort.direction === "asc" ? cmp : -cmp;
          });

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);
    return { items, totalPages, safePage, total: sorted.length };
  }, [columns, data, page, pageSize, query, sort]);

  const toggleSort = (columnId: string) => {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) return { columnId, direction: "asc" };
      if (prev.direction === "asc") return { columnId, direction: "desc" };
      return null;
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search…"
            className="w-full sm:max-w-sm"
          />
          {toolbar ? <div className="hidden sm:block">{toolbar}</div> : null}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-xs text-muted-foreground">{effective.total.toLocaleString()} rows</div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Rows
            <select
              className="h-9 rounded-xl border border-border bg-transparent px-2 text-sm text-foreground"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-muted/70 text-left text-muted-foreground backdrop-blur">
            <tr>
              {columns.map((col) => {
                const isSorted = sort?.columnId === col.id;
                const indicator = !isSorted ? "" : sort?.direction === "asc" ? " ↑" : " ↓";
                const alignClass =
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                return (
                  <th
                    key={col.id}
                    className={cn("px-4 py-3 font-medium whitespace-nowrap", alignClass, col.headerClassName)}
                  >
                    <button
                      type="button"
                      className={cn("inline-flex items-center gap-1 hover:text-foreground", "select-none")}
                      onClick={() => toggleSort(col.id)}
                      title="Sort"
                    >
                      {col.header}
                      <span className="text-xs text-muted-foreground">{indicator}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {effective.items.length === 0 ? (
              <tr className="border-t border-border">
                <td className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={columns.length}>
                  <div className="font-medium text-foreground">{emptyTitle}</div>
                  <div className="mt-1">{emptyDescription}</div>
                </td>
              </tr>
            ) : (
              effective.items.map((row) => {
                const clickable = Boolean(onRowClick);
                return (
                  <tr
                    key={getRowId(row)}
                    className={cn(
                      "border-t border-border",
                      clickable && "cursor-pointer hover:bg-muted/40",
                      rowClassName?.(row)
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                      const value = col.cell ? col.cell(row) : col.accessor ? toText(col.accessor(row)) : "";
                      return (
                        <td key={col.id} className={cn("px-4 py-3 align-middle", alignClass, col.className)}>
                          {value as React.ReactNode}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Page {effective.safePage} of {effective.totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={effective.safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={effective.safePage >= effective.totalPages}
            onClick={() => setPage((p) => Math.min(effective.totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

