// Pure helpers seputar resolusi endpoint dataset + guard protokol.
// Sengaja bebas dependency React/network supaya bisa dites langsung.

export interface DatasetEndpointLike {
  endpoint_url?: string | null;
  endpoint_runtime?: Record<string, unknown> | null;
}

// Gabungkan base URL + path relatif TANPA kehilangan base path.
// `new URL("/collections/x", "https://host/ogc/api/")` membuang "/ogc/api" — hindari itu:
// selalu treat path sebagai relatif terhadap base (leading slash di-strip).
export const joinEndpointUrl = (base: string, path: string): string => {
  const trimmedBase = String(base ?? "").trim();
  const trimmedPath = String(path ?? "").trim();
  if (!trimmedBase) return trimmedPath;
  if (!trimmedPath) return trimmedBase;
  const normalizedBase = trimmedBase.replace(/\/+$/, "");
  const normalizedPath = trimmedPath.replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
};

// Bentuk URL sumber final dataset dari base endpoint + runtime.collection_path.
export const resolveDatasetEndpointUrl = (ds?: DatasetEndpointLike | null): string => {
  const baseUrl = String(ds?.endpoint_url ?? "").trim();
  if (!baseUrl) return "";

  const runtime = ds?.endpoint_runtime;
  if (!runtime || typeof runtime !== "object") return baseUrl;

  const collectionPath = typeof runtime.collection_path === "string" ? runtime.collection_path.trim() : "";
  if (!collectionPath) return baseUrl;

  const domainCode = typeof runtime.domain_code === "string" ? runtime.domain_code.trim() : "";
  const resolvedPath = domainCode
    ? collectionPath.replace(/\{domain_code\}/gi, encodeURIComponent(domainCode))
    : collectionPath;

  return joinEndpointUrl(baseUrl, resolvedPath);
};

// Guard OGC_API_FEATURES: protokol ini WAJIB punya runtime.collection_path (dari endpoint
// adapter). Tanpa itu connector menempel "/collections/{code}/items" ke URL polos dan
// merusaknya. Kembalikan pesan error (Indonesia) bila tidak valid, atau null bila lolos.
export const ogcRuntimeGuardError = (
  protocol?: string | null,
  runtime?: Record<string, unknown> | null,
): string | null => {
  const normalized = String(protocol ?? "").trim().toUpperCase();
  if (normalized !== "OGC_API_FEATURES") return null;
  const hasCollectionPath =
    !!runtime &&
    typeof runtime === "object" &&
    typeof (runtime as Record<string, unknown>).collection_path === "string" &&
    String((runtime as Record<string, unknown>).collection_path).trim() !== "";
  if (hasCollectionPath) return null;
  return 'Protokol OGC_API_FEATURES butuh Runtime Context dengan collection_path (dari endpoint adapter). Pakai tombol "Dari Adapter", atau ganti protokol ke REST_API untuk URL WFS/REST langsung.';
};
