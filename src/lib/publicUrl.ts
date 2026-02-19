const DEFAULT_PUBLIC_APP_URL = "https://kmohamed-dz.github.io/hop-share-and-send";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getPublicUrl(): string {
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return stripTrailingSlash(envUrl);
  }

  if (typeof window !== "undefined") {
    const { origin, hostname, pathname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return stripTrailingSlash(origin);
    }

    if (hostname.endsWith("github.io")) {
      const segments = pathname.split("/").filter(Boolean);
      const repoSegment = segments[0] ?? "hop-share-and-send";
      return stripTrailingSlash(`${origin}/${repoSegment}`);
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

export function getHashUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicUrl()}${normalizedPath}`;
}

// Backward-compatible aliases used in existing files.
export const getPublicAppUrl = getPublicUrl;
export const getHashRouteUrl = getHashUrl;
