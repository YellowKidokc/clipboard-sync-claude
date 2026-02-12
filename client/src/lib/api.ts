const API_BASE_KEY = "clipsync.apiBase";

export function getApiBase() {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(API_BASE_KEY);
    if (stored) return stored.replace(/\/$/, "");
  }
  const envBase = import.meta.env.VITE_API_URL as string | undefined;
  return envBase ? envBase.replace(/\/$/, "") : "";
}

export function setApiBase(base: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(API_BASE_KEY, base.replace(/\/$/, ""));
  }
}

export function apiUrl(path: string) {
  const base = getApiBase();
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}
