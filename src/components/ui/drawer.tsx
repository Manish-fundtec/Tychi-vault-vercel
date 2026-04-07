import { useEffect } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

export function Drawer({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  headerRight,
  widthClassName = "w-[min(720px,calc(100vw-24px))]",
  placement = "right"
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Extra actions in the header row (e.g. Download next to Close). */
  headerRight?: React.ReactNode;
  onClose: () => void;
  widthClassName?: string;
  placement?: "right" | "center";
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const panelClassName =
    placement === "center"
      ? cn(
          "absolute left-1/2 top-1/2 flex max-h-[calc(100vh-24px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft",
          widthClassName
        )
      : cn(
          "absolute inset-y-3 right-3 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft",
          widthClassName
        );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={panelClassName}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{title}</h3>
            {description ? <p className="mt-1 truncate text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerRight}
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="space-y-4">{children}</div>
          {footer ? <div className="mt-5 border-t border-border pt-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

