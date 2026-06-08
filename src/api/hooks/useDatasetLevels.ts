import type { Dataset } from "@/api/types/data-catalog";

const DOMAIN_LABELS: Record<string, string> = {
  wilayah_kerja: "Wilayah Kerja", sumur: "Sumur", lapangan: "Lapangan", fasilitas: "Fasilitas", seismik: "Seismik",
};
const DOMAIN_ORDER = Object.keys(DOMAIN_LABELS);

/** Domain geospasial dataset: dari endpoint_metadata.tags[0] (faithful), fallback nama. */
export const inferDomain = (d: Dataset): string | undefined => {
  if (d.domain) return d.domain;
  const name = (d.dataset_name || "").toLowerCase();
  return DOMAIN_ORDER.find((k) => name.includes(DOMAIN_LABELS[k].toLowerCase()));
};

/**
 * Klasifikasi L0–L4 dataset.
 * Sumber faithful: field `description` GX-Space ("… klasifikasi Lx"), di-parse di
 * service menjadi `dataset.level`. (GX-Space tidak punya field klasifikasi khusus
 * pada dataset; respons list dataset-policy tak memuat rules, dan contract.datasets
 * tak memuat dataset_policy_id — jadi join policy tidak tersedia dari respons.)
 */
export const levelOf = (d: Dataset): string | undefined => d.level;

export function useDatasetLevels() {
  return { levelOf };
}

export const LEVEL_BADGE: Record<string, string> = {
  L0: "bg-emerald-50 text-emerald-700 border-emerald-200",
  L1: "bg-teal-50 text-teal-700 border-teal-200",
  L2: "bg-sky-50 text-sky-700 border-sky-200",
  L3: "bg-amber-50 text-amber-700 border-amber-200",
  L4: "bg-rose-50 text-rose-700 border-rose-200",
};

/** Kelas kerahasiaan resmi Juknis SPEKTRUM IOG 4.0 (4 kelas) untuk tiap level L0–L4. */
export const JUKNIS_CLASS: Record<string, string> = {
  L0: "PUBLIK",
  L1: "PUBLIK",
  L2: "INTERNAL",
  L3: "TERBATAS",
  L4: "RAHASIA",
};

export const LEVEL_LABEL: Record<string, string> = {
  L0: "L0 · PUBLIK (penuh)",
  L1: "L1 · PUBLIK (terbatas)",
  L2: "L2 · INTERNAL",
  L3: "L3 · TERBATAS",
  L4: "L4 · RAHASIA (tidak dipublikasikan)",
};
