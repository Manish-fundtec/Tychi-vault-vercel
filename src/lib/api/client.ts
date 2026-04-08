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

/** Raw `fetch` to vault routes with auth + tenant headers (use for non-JSON bodies). */
export async function vaultAuthorizedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("jwt_token") ?? localStorage.getItem("accessToken");
  const tenantId = localStorage.getItem("tenantId") ?? localStorage.getItem("tenant_id");
  const url = `${BASE_URL}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...init?.headers
    }
  });
}

type HttpMethod = "GET" | "POST" | "PUT";

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

  const url = `${BASE_URL}${path}`;
  if (import.meta.env.DEV) {
    console.log("[api] request", {
      method: options.method ?? "GET",
      url,
      hasBody: Boolean(options.body),
      hasToken: Boolean(token),
      hasTenantId: Boolean(tenantId)
    });
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    body: options.body,
    signal: options.signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
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
    request<T>(path, { method: "PUT", body, headers, signal }) as Promise<T | null>
};
