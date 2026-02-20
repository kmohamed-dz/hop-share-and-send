function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getPublicUrl(): string {
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (!envUrl) {
    throw new Error("Missing VITE_PUBLIC_APP_URL env var");
  }
  return stripTrailingSlash(envUrl);
}

export function getHashUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicUrl()}/#${normalizedPath}`;
}

// Backward-compatible aliases used in existing files.
export const getPublicAppUrl = getPublicUrl;
export const getHashRouteUrl = getHashUrl;
