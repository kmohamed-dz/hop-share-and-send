const DEFAULT_PUBLIC_APP_URL = "https://kmohamed-dz.github.io/hop-share-and-send";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getPublicAppUrl(): string {
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return stripTrailingSlash(envUrl);
  }

  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return stripTrailingSlash(origin);
    }

    const base = (import.meta.env.BASE_URL ?? "/").trim();
    if (!base || base === "/") {
      return stripTrailingSlash(origin);
    }

    const normalizedBase = base.startsWith("/") ? base : `/${base}`;
    return stripTrailingSlash(`${origin}${normalizedBase}`);
  }

  return DEFAULT_PUBLIC_APP_URL;
}

export function getHashRouteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppUrl()}/#${normalizedPath}`;
}
