// Pure helper untuk riwayat transfer: resolusi timestamp, komparator urutan,
// format waktu (lokal ringkas + relatif), dan predikat filter/pencarian.
// Sengaja bebas dependency React/network supaya bisa dites langsung.

export type TransferHistoryMode = "direct" | "persistent";

// Sumber timestamp untuk sebuah baris riwayat. List /transfers connector membawa
// started_at/completed_at (BUKAN created_at/updated_at), sedangkan projeksi monitoring
// membawa last_event_at. Terima semua kandidat sebagai string mentah supaya fungsi tetap
// murni dan tidak tahu bentuk objek transfer/projeksi.
export interface HistoryTimestampSources {
  projectionLastEventAt?: string | null;
  projectionUpdatedAt?: string | null;
  transferCompletedAt?: string | null;
  transferStartedAt?: string | null;
  transferUpdatedAt?: string | null;
  transferCreatedAt?: string | null;
  projectionCreatedAt?: string | null;
}

// Timestamp terbaik (ms epoch) untuk urutan + tampilan. Prioritas: event projeksi
// (last_event_at) > updated projeksi > completed_at/started_at transfer > updated/created
// transfer > created projeksi. Kembalikan 0 bila semua kosong/invalid (jangan NaN supaya
// komparator stabil).
export const resolveHistoryTimestamp = (sources: HistoryTimestampSources): number => {
  const raw =
    sources.projectionLastEventAt ??
    sources.projectionUpdatedAt ??
    sources.transferCompletedAt ??
    sources.transferStartedAt ??
    sources.transferUpdatedAt ??
    sources.transferCreatedAt ??
    sources.projectionCreatedAt ??
    null;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

export interface HistoryComparable {
  id: string;
  timestamp: number;
}

// Urut terbaru dulu (timestamp desc). Tie-break stabil: id desc supaya urutan
// deterministik saat timestamp sama (mis. transfer beruntun di detik yang sama).
export const compareHistoryDesc = (left: HistoryComparable, right: HistoryComparable): number => {
  const diff = right.timestamp - left.timestamp;
  if (diff !== 0) return diff;
  return String(right.id).localeCompare(String(left.id));
};

// Nama bulan ringkas (id-ID) dipatok manual supaya format deterministik lintas
// environment/locale CI — tidak bergantung Intl yang bisa beda hasil per platform.
const ID_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const pad2 = (value: number): string => String(value).padStart(2, "0");

// Format lokal ringkas: "15 Jul 09:32" (jam:menit waktu lokal). "-" bila timestamp kosong.
export const formatHistoryTime = (ms: number): string => {
  if (!ms || !Number.isFinite(ms)) return "-";
  const date = new Date(ms);
  const day = date.getDate();
  const month = ID_MONTHS_SHORT[date.getMonth()] ?? "";
  return `${day} ${month} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

// Relatif ringkas: "baru saja", "5 menit lalu", "2 jam lalu", "3 hari lalu", dst.
// `now` bisa disuntik untuk test deterministik. String kosong bila timestamp kosong.
export const formatRelativeTime = (ms: number, now: number = Date.now()): string => {
  if (!ms || !Number.isFinite(ms)) return "";
  const diff = now - ms;
  if (diff < 60_000) return "baru saja";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
};

export type HistoryModeFilter = "ALL" | TransferHistoryMode;

export interface HistoryFilterCriteria {
  datasetId: string; // "ALL" atau dataset_id spesifik
  status: string; // "ALL" atau status uppercase (COMPLETED/FAILED/...)
  mode: HistoryModeFilter;
  search: string;
}

export interface HistoryFilterRecord {
  transferId: string;
  agreementId?: string | null;
  datasetId?: string | null;
  datasetName: string;
  status: string;
  mode: TransferHistoryMode | null;
}

export const DEFAULT_HISTORY_FILTER: HistoryFilterCriteria = {
  datasetId: "ALL",
  status: "ALL",
  mode: "ALL",
  search: "",
};

// Predikat filter+pencarian riwayat. Search cocokkan substring (case-insensitive) ke
// transfer id / agreement id / nama dataset. Mode "ALL"/status "ALL"/dataset "ALL" = lolos.
export const matchesHistoryFilter = (
  record: HistoryFilterRecord,
  criteria: HistoryFilterCriteria,
): boolean => {
  if (criteria.datasetId !== "ALL" && record.datasetId !== criteria.datasetId) return false;
  if (criteria.status !== "ALL" && String(record.status).toUpperCase() !== criteria.status) return false;
  if (criteria.mode !== "ALL" && record.mode !== criteria.mode) return false;

  const query = criteria.search.trim().toLowerCase();
  if (query) {
    const haystack = [record.transferId, record.agreementId, record.datasetName]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());
    if (!haystack.some((value) => value.includes(query))) return false;
  }
  return true;
};
