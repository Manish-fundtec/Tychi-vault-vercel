import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export function formatCurrency(value: number, currency?: string | null) {
  const code = (currency ?? "").trim().toUpperCase();
  if (!code) {
    return formatNumber(value);
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    // If backend returns an invalid/empty code, avoid crashing the UI.
    return `${formatNumber(value)} ${code}`;
  }
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString();
}