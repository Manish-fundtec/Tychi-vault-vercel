function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;

  // If explicitly provided, respect it.
  if (raw && raw.trim()) {
    const cleaned = stripTrailingSlash(raw.trim());
    // Allow relative base like "/".
    if (cleaned.startsWith("/")) {
      const combined = `${cleaned}/api/vault`;
      return combined.replace(/\/\/api\/vault$/, "/api/vault");
    }
    return `${cleaned}/api/vault`;
  }

  // If not provided:
  // - in dev, default to local backend
  // - in prod, use same-origin "/api/vault" (works with Vercel rewrite/proxy)
  return import.meta.env.DEV ? "http://localhost:3000/api/vault" : "/api/vault";
}

const BASE_URL = resolveBaseUrl();

/** Base URL for vault API (same host/path as `apiClient`). */
export const VAULT_API_BASE = BASE_URL;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const parts = document.cookie.split(";").map((x) => x.trim());
  const hit = parts.find((p) => p.startsWith(prefix));
  if (!hit) return null;
  return hit.slice(prefix.length) || null;
}

function getUrlParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const u = new URL(window.location.href);
    const v = u.searchParams.get(name);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

function parseJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = String(jwt || "").split(".");
  if (parts.length !== 3) return null;
  const payload = parts[1];
  if (!payload) return null;
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveDashboardContext(): { dashboardToken: string | null; fundId: string | null } {
  const storedToken = localStorage.getItem("dashboardToken") ?? localStorage.getItem("dashboard_token");
  const storedFund = localStorage.getItem("fundId") ?? localStorage.getItem("fund_id");

  const urlToken = getUrlParam("dashboardToken");
  const urlFund = getUrlParam("fundId");

  // If the app was opened with tokens in URL, persist them for API calls.
  // Prefer cookie (shared .tychi.co) over localStorage to avoid "sticky" stale tokens.
  const cookieToken = getCookie("dashboardToken") ?? getCookie("dashboard_token");
  const dashboardToken = (urlToken ?? cookieToken ?? storedToken) || null;
  if (dashboardToken && dashboardToken !== storedToken) {
    try {
      localStorage.setItem("dashboardToken", dashboardToken);
    } catch {
      // ignore (private mode / quota)
    }
  }

  // Source of truth: fund_id inside dashboardToken. Only fall back to explicit URL param or storage
  // when there is no token available.
  let fundId: string | null = null;
  if (dashboardToken) {
    const p = parseJwtPayload(dashboardToken);
    const v = p && p["fund_id"];
    if (typeof v === "string" && v.trim()) fundId = v.trim();
  }
  if (!fundId) {
    fundId = (urlFund ?? storedFund) || null;
  }

  if (fundId && fundId !== storedFund) {
    try {
      localStorage.setItem("fundId", fundId);
    } catch {
      // ignore
    }
  }

  return { dashboardToken, fundId };
}

/** Raw `fetch` to vault routes with auth + tenant headers (use for non-JSON bodies). */
export async function vaultAuthorizedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("jwt_token") ?? localStorage.getItem("accessToken");
  const tenantId = localStorage.getItem("tenantId") ?? localStorage.getItem("tenant_id");
  const dash = resolveDashboardContext();
  const url = `${BASE_URL}${path}`;
  return fetch(url, {
    ...init,
    // IMPORTANT: allow browser to send cookies (dashboardToken on .tychi.co)
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...(dash.dashboardToken ? { "x-dashboard-token": dash.dashboardToken } : {}),
      ...(dash.fundId ? { "x-fund-id": dash.fundId } : {}),
      ...init?.headers
    }
  });
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH";

interface RequestOptions {
  method?: HttpMethod;
  body?: BodyInit | null;
  signal?: AbortSignal;
  headers?: HeadersInit;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function shortenHtmlError(text: string, status: number): string {
  const pre = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (pre?.[1]?.trim()) {
    const inner = pre[1].trim().replace(/\s+/g, " ");
    return inner.length > 200 ? `${inner.slice(0, 200)}…` : inner;
  }
  if (text.includes("<!DOCTYPE") || text.includes("<html")) {
    return `Request failed (${status}) — server returned HTML instead of JSON (route may be missing or wrong URL).`;
  }
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text.trim()) {
    return `Request failed (${response.status})`;
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const err = parsed.error ?? parsed.message;
    if (typeof err === "string" && err.trim()) {
      return err;
    }
  } catch {
    // not JSON — often Express HTML error page
  }
  return shortenHtmlError(text, response.status);
}

/** Parse success body: supports empty, JSON, or non-JSON 200 without throwing. */
async function readSuccessBody<T>(response: Response): Promise<T | null> {
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  const token = localStorage.getItem("jwt_token") ?? localStorage.getItem("accessToken");
  const tenantId = localStorage.getItem("tenantId") ?? localStorage.getItem("tenant_id");
  const dash = resolveDashboardContext();

  const url = `${BASE_URL}${path}`;
  if (import.meta.env.DEV) {
    console.log("[api] request", {
      method: options.method ?? "GET",
      url,
      hasBody: Boolean(options.body),
      hasToken: Boolean(token),
      hasTenantId: Boolean(tenantId),
      hasDashboardToken: Boolean(dash.dashboardToken),
      hasFundId: Boolean(dash.fundId)
    });
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    body: options.body,
    signal: options.signal,
    // IMPORTANT: allow browser to send cookies (dashboardToken on .tychi.co)
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...(dash.dashboardToken ? { "x-dashboard-token": dash.dashboardToken } : {}),
      ...(dash.fundId ? { "x-fund-id": dash.fundId } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    if (import.meta.env.DEV) {
      console.log("[api] error", { url, status: response.status, message });
    }
    throw new ApiError(message, response.status);
  }

  if (import.meta.env.DEV) {
    console.log("[api] success", { url, status: response.status });
  }

  return readSuccessBody<T>(response);
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "GET", signal }) as Promise<T | null>,
  post: <T>(path: string, body: BodyInit | null, headers?: HeadersInit, signal?: AbortSignal) =>
    request<T>(path, { method: "POST", body, headers, signal }) as Promise<T | null>,
  put: <T>(path: string, body: BodyInit | null, headers?: HeadersInit, signal?: AbortSignal) =>
    request<T>(path, { method: "PUT", body, headers, signal }) as Promise<T | null>,
  patch: <T>(path: string, body: BodyInit | null, headers?: HeadersInit, signal?: AbortSignal) =>
    request<T>(path, { method: "PATCH", body, headers, signal }) as Promise<T | null>
};
