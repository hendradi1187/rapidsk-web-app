// Model pemenuhan data KKKS × 5 domain migas — DERIVASI dari objek BE nyata
// (dataset published + status kontrak). Tidak ada angka karangan.
import type { Dataset } from "@/api/types/data-catalog";
import type { ContractItem } from "@/api/services/policy-contract";
import type { TransferItem } from "@/api/services/connector";

// 5 domain wajib yang ditetapkan SKK Migas (= koleksi OGC node geospasial).
export const DOMAINS = [
  { key: "wilayah_kerja", label: "Wilayah Kerja", sub: "PSC Area" },
  { key: "sumur", label: "Sumur", sub: "Well" },
  { key: "lapangan", label: "Lapangan", sub: "Field" },
  { key: "fasilitas", label: "Fasilitas", sub: "Facility" },
  { key: "seismik", label: "Survei Seismik", sub: "Seismic" },
] as const;

export type DomainKey = (typeof DOMAINS)[number]["key"];

// Petakan teks (nama dataset/kontrak) → key domain.
const KEYWORDS: Array<[RegExp, DomainKey]> = [
  [/wilayah\s*kerja|psc/i, "wilayah_kerja"],
  [/sumur|well/i, "sumur"],
  [/lapangan|field/i, "lapangan"],
  [/fasilitas|facility/i, "fasilitas"],
  [/seismik|seismic/i, "seismik"],
];

export const domainFromText = (text?: string): DomainKey | undefined =>
  KEYWORDS.find(([re]) => re.test(text || ""))?.[1];

// Domain sebuah dataset: utamakan tags[0] (d.domain), fallback dari nama.
export const datasetDomain = (d: Dataset): DomainKey | undefined =>
  (DOMAINS.some((x) => x.key === d.domain) ? (d.domain as DomainKey) : undefined) ??
  domainFromText(d.dataset_name);

export const contractDomain = (c: ContractItem): DomainKey | undefined =>
  domainFromText(c.name);

export type Stage = "TERKIRIM" | "AKTIF" | "TERSEDIA" | "BELUM";

export interface CellInfo {
  stage: Stage;
  hasDataset: boolean;
  published: boolean;
  datasetCount: number;
  contractActive: boolean;
  contractPending: boolean; // REQUESTED/APPROVED
  contractStatus?: string;
  transferred: boolean; // ada transfer COMPLETED
  transferCount: number; // jumlah transfer COMPLETED
  dueDate?: string; // tenggat kepatuhan Juknis (terdekat) bila ada kewajiban
  overdue: boolean; // lewat tenggat & belum terpenuhi
  daysLeft?: number; // sisa hari (negatif = terlambat)
}

// Status pemenuhan satu (provider, domain) dari data BE.
// transfers opsional — bila BE list endpoint tersedia, sel bisa naik ke "Terkirim".
export function cellInfo(
  providerId: string,
  domain: DomainKey,
  datasets: Dataset[],
  contracts: ContractItem[],
  transfers: TransferItem[] = [],
): CellInfo {
  const ds = datasets.filter(
    (d) => d.provider_id === providerId && datasetDomain(d) === domain,
  );
  const published = ds.some((d) => String(d.status).toLowerCase() === "published");
  const cs = contracts.filter(
    (c) => c.provider_id === providerId && contractDomain(c) === domain,
  );
  const contractActive = cs.some((c) => c.status === "ACTIVE");
  const contractPending = cs.some((c) => c.status === "REQUESTED" || c.status === "APPROVED");

  // transfer COMPLETED untuk dataset di sel ini
  const dsIds = new Set(ds.map((d) => d.dataset_id));
  const completed = transfers.filter(
    (t) => dsIds.has(t.dataset_id) && String(t.status).toUpperCase() === "COMPLETED",
  );

  let stage: Stage = "BELUM";
  if (completed.length > 0) stage = "TERKIRIM";
  else if (published && contractActive) stage = "AKTIF";
  else if (published || ds.length > 0) stage = "TERSEDIA";

  const order = ["ACTIVE", "APPROVED", "REQUESTED", "REJECTED"];
  const contractStatus = cs
    .map((c) => c.status)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];

  // Tenggat & overdue (dari due_date kontrak; ambil tenggat terdekat).
  const fulfilled = stage === "AKTIF" || stage === "TERKIRIM";
  const dues = cs.map((c) => c.due_date).filter(Boolean) as string[];
  let dueDate: string | undefined;
  let overdue = false;
  let daysLeft: number | undefined;
  if (dues.length > 0) {
    dueDate = dues.slice().sort()[0];
    const diffMs = new Date(dueDate).getTime() - Date.now();
    daysLeft = Math.ceil(diffMs / 86400000);
    overdue = !fulfilled && diffMs < 0;
  }

  return {
    stage,
    hasDataset: ds.length > 0,
    published,
    datasetCount: ds.length,
    contractActive,
    contractPending,
    contractStatus,
    transferred: completed.length > 0,
    transferCount: completed.length,
    dueDate,
    overdue,
    daysLeft,
  };
}

export const STAGE_META: Record<
  Stage,
  { label: string; dot: string; cell: string; text: string }
> = {
  TERKIRIM: {
    label: "Terkirim",
    dot: "bg-emerald-600",
    cell: "bg-emerald-50 border-emerald-300",
    text: "text-emerald-700",
  },
  AKTIF: {
    label: "Aktif",
    dot: "bg-sky-500",
    cell: "bg-sky-50 border-sky-200",
    text: "text-sky-700",
  },
  TERSEDIA: {
    label: "Tersedia",
    dot: "bg-amber-500",
    cell: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
  },
  BELUM: {
    label: "Belum",
    dot: "bg-slate-300",
    cell: "bg-slate-50 border-slate-200",
    text: "text-slate-400",
  },
};
