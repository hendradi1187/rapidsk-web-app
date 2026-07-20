// Pure helpers untuk melacak keterkaitan dataset ↔ koleksi adapter (OGC).
// Sengaja bebas dependency React/network supaya bisa dites langsung.
//
// Patokan "dataset ini berasal dari adapter" (viaAdapter) ditentukan dari RUNTIME
// (endpoint_metadata.runtime di BE / endpoint_runtime di FE), BUKAN dari host URL —
// karena base URL adapter bisa berganti tanpa mengubah asal koleksinya:
//   - runtime.source_type === "OGC_API_FEATURES", DAN
//   - runtime.collection_path memuat "/ogc/collections/"
// (lihat FASE 0: collection_path live = "/api/v1/ogc/ogc/collections/{domain_code}/items").

export interface DatasetLinkLike {
  // Bentuk FE (Dataset) memakai `endpoint_runtime`; sebagian pemanggil mungkin
  // membawa bentuk mentah BE (`endpoint_metadata.runtime`) atau `runtime` lepas.
  endpoint_runtime?: Record<string, unknown> | null;
  endpoint_metadata?: { runtime?: Record<string, unknown> | null } | null;
  runtime?: Record<string, unknown> | null;
}

export interface DatasetAdapterLink {
  viaAdapter: boolean;
  domainCode: string | null;
}

// Ambil objek runtime dari berbagai bentuk input, aman terhadap null/string rusak.
const extractRuntime = (dataset?: DatasetLinkLike | null): Record<string, unknown> | null => {
  if (!dataset || typeof dataset !== "object") return null;
  const candidate =
    dataset.endpoint_runtime ??
    dataset.endpoint_metadata?.runtime ??
    dataset.runtime ??
    null;
  return candidate && typeof candidate === "object" && !Array.isArray(candidate)
    ? (candidate as Record<string, unknown>)
    : null;
};

export const datasetAdapterLink = (dataset?: DatasetLinkLike | null): DatasetAdapterLink => {
  const runtime = extractRuntime(dataset);
  if (!runtime) return { viaAdapter: false, domainCode: null };

  const sourceType = String(runtime.source_type ?? "").trim().toUpperCase();
  const collectionPath = typeof runtime.collection_path === "string" ? runtime.collection_path : "";
  const viaAdapter = sourceType === "OGC_API_FEATURES" && /\/ogc\/collections\//i.test(collectionPath);

  if (!viaAdapter) return { viaAdapter: false, domainCode: null };

  const rawCode = typeof runtime.domain_code === "string" ? runtime.domain_code.trim() : "";
  return { viaAdapter: true, domainCode: rawCode ? rawCode.toUpperCase() : null };
};

// Kelompokkan dataset per domain_code koleksi adapter. Hanya dataset yang viaAdapter
// dengan domainCode yang diketahui yang dimasukkan; dataset manual/tanpa kode diabaikan.
export const groupDatasetsByCollection = <T extends DatasetLinkLike>(
  datasets?: readonly T[] | null,
): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  if (!Array.isArray(datasets)) return map;
  for (const dataset of datasets) {
    const { viaAdapter, domainCode } = datasetAdapterLink(dataset);
    if (!viaAdapter || !domainCode) continue;
    const bucket = map.get(domainCode);
    if (bucket) bucket.push(dataset);
    else map.set(domainCode, [dataset]);
  }
  return map;
};
