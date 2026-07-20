import axios from "axios";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toMessage = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
};

export const normalizeApiErrorMessage = (message: string): string => {
  const normalized = message.trim();
  const lowered = normalized.toLowerCase();

  if (
    lowered.includes("internal.local") &&
    lowered.includes("email")
  ) {
    return "Backend IAM masih punya email dummy/reserved seperti @internal.local, jadi daftar user belum bisa dimuat sampai data itu dibersihkan di backend atau database.";
  }

  if (
    lowered.includes("special-use or reserved name") &&
    lowered.includes("email")
  ) {
    return "Backend IAM menolak email dummy/reserved, jadi daftar user belum bisa dimuat sampai data user bermasalah dibersihkan di backend atau database.";
  }

  if (
    lowered.includes("domain code must be uppercase alphanumeric") ||
    lowered.includes("uppercase alphanumeric with _ or - only")
  ) {
    return "Kode domain harus 2-20 karakter, huruf besar/angka saja, dan hanya boleh memakai underscore (_) atau dash (-).";
  }

  if (lowered.includes("agreement not found")) {
    return "Connector menolak agreement ini. Penyebab paling umum: participant PROVIDER belum punya connection pool bertipe PROVIDER (endpoint + well-known JWT), sehingga connector tidak bisa menemukan lawan transfer. Cek connection pool provider di menu Participant, atau tunggu agreement tersinkron ke connector.";
  }

  if (lowered.includes("connection pool not found")) {
    return "Connection pool untuk agreement ini tidak ditemukan. Pastikan participant consumer dan provider sudah punya connection pool aktif (endpoint connector + well-known JWT URL) sebelum transfer dimulai.";
  }

  if (/active\b.*\btransfer/.test(lowered) || lowered.includes("transfer already exists")) {
    return "Masih ada transfer aktif untuk dataset ini. Tunggu sampai selesai/gagal, atau lanjutkan lewat tombol resume, sebelum menjalankan transfer baru.";
  }

  // Connector: proses transfer tidak ada (termasuk typo backend "Tansfer").
  if (
    lowered.includes("transfer_process_not_found") ||
    lowered.includes("transfer process not found") ||
    lowered.includes("tansfer process not found")
  ) {
    return "Proses transfer tidak ditemukan (mungkin sudah dihapus atau kadaluarsa). Jalankan transfer baru.";
  }

  // Endpoint provider menolak token user (butuh service/connector principal).
  if (lowered.includes("principal_type_not_allowed") || lowered.includes("tokens are not allowed")) {
    return "Aksi ini butuh koneksi connector khusus, bukan token pengguna. Jalankan lewat proses provider/connector, bukan dari layar ini.";
  }

  // Token beraudience salah untuk service tujuan.
  if (lowered.includes("audience doesn't match") || lowered.includes("audience does not match")) {
    return "Token layanan belum cocok untuk service ini. Coba ulangi; jika tetap gagal, login ulang.";
  }

  // Endpoint belum terdaftar di IAM (konfigurasi backend).
  if (lowered.includes("api_resource_not_registered") || lowered.includes("no iam api_resource registered")) {
    return "Endpoint ini belum terdaftar di IAM backend (masalah konfigurasi server, bukan input Anda).";
  }

  // Sesi/token tidak valid.
  if (
    lowered.includes("missing_bearer_token") ||
    lowered.includes("missing authorization") ||
    lowered.includes("invalid jwt") ||
    lowered.includes("invalid_cts_token")
  ) {
    return "Sesi Anda tidak valid atau sudah berakhir. Silakan login ulang.";
  }

  if (lowered.includes("invalid username or password")) {
    return "Username atau password salah.";
  }

  if (lowered.includes("schema not found")) {
    return "Schema tidak ditemukan. Jalankan Setup Juknis pada domain ini dulu agar schema tersedia.";
  }

  if (lowered.includes("contract not found")) {
    return "Contract tidak ditemukan.";
  }

  // Validasi versi dataset (semver ketat).
  if (lowered.includes("should match pattern") && lowered.includes("version")) {
    return "Versi harus format angka X.Y.Z (contoh: 1.0.0), tanpa huruf atau teks tambahan.";
  }

  if (lowered.includes("cannot be deleted because it is in use")) {
    return "Data ini tidak bisa dihapus karena masih dipakai (ada transfer/kontrak yang merujuk).";
  }

  // Adapter menolak query sumber (mis. layer grup/tanpa geometri, filter/field salah).
  if (lowered.includes("invalid or missing input parameters")) {
    return "Parameter query sumber tidak valid. Untuk ArcGIS, pastikan layer yang dipilih Feature Layer (punya geometri), bukan Group Layer/Table; cek juga filter, field, dan base URL source.";
  }

  // Connector penyedia tidak bisa menjangkau endpoint sumber (umumnya server connector
  // tak punya egress ke internet, sedangkan URL dataset publik).
  if (lowered.includes("unable to access source endpoint")) {
    return "Connector penyedia tidak bisa menjangkau endpoint sumber dataset. Biasanya server connector tidak punya akses ke alamat itu (mis. URL internet publik, sedangkan connector hanya bisa jaringan internal). Pastikan URL dataset bisa diakses DARI server connector, atau sajikan datanya lewat adapter internal.";
  }

  if (lowered.includes("must reference an outbound consumer transfer")) {
    return "Proses transfer yang dirujuk bukan transfer consumer (OUTBOUND). Ini biasanya salah memakai ID transfer pada jalur provider — mulai transfer dari sisi consumer, bukan endpoint provider.";
  }

  if (lowered.includes("provider connector returned a non-success response")) {
    return "Connector penyedia mengembalikan respons gagal. Cek reachability & konfigurasi endpoint sumber di sisi penyedia.";
  }

  // Field wajib pada validasi (mis. "agreement_id: Field required").
  if (lowered.includes("field required")) {
    const field = normalized.split(":")[0]?.trim();
    if (field && !/field required/i.test(field)) return `${field} wajib diisi.`;
    return "Ada field wajib yang belum diisi.";
  }

  return normalized;
};

// INTEGRITY_ERROR (409) sering membawa detail asyncpg mentah (nama tabel/constraint).
// Jangan tampilkan itu ke pengguna; petakan ke pesan yang actionable.
const mapIntegrityError = (databaseError: string): string => {
  const l = databaseError.toLowerCase();
  if (l.includes("uniqueviolation") && l.includes("dataset")) {
    return "Dataset dengan kombinasi schema + versi ini sudah ada. Naikkan versi (mis. 1.0.1).";
  }
  if (l.includes("dataset_polic")) {
    return "Dataset policy yang dipilih tidak valid untuk dataset ini.";
  }
  if (l.includes("contract")) {
    return "Contract acuan tidak ditemukan atau tidak valid.";
  }
  if (l.includes("uniqueviolation")) {
    return "Data dengan kombinasi ini sudah ada.";
  }
  return "Operasi bentrok dengan data atau relasi yang sudah ada di server.";
};

// PROVIDER_RESPONSE_ERROR bisa bertingkat: errors.details.provider_detail berisi
// envelope provider lagi, sampai akhirnya string (mis. "Unable to access source endpoint").
// Gali sampai pesan terdalam supaya yang tampil adalah penyebab asli, bukan wrapper generik.
const extractProviderDetail = (errObj: Record<string, unknown>): string | null => {
  let node: unknown = errObj;
  for (let depth = 0; depth < 8 && isRecord(node); depth += 1) {
    const details = (node as Record<string, unknown>).details;
    if (!isRecord(details)) break;
    const providerDetail = details.provider_detail;
    if (typeof providerDetail === "string") {
      const text = providerDetail.trim();
      if (text) return text;
    }
    if (isRecord(providerDetail) && isRecord(providerDetail.errors)) {
      node = providerDetail.errors;
      continue;
    }
    break;
  }
  return null;
};

const formatLoc = (loc: unknown): string | null => {
  if (!Array.isArray(loc)) return null;
  const pathValue = loc
    .map((item) => String(item))
    .filter((item) => item && item !== "body" && item !== "query" && item !== "path")
    .join(".");
  return pathValue || null;
};

const flattenErrorsObject = (value: Record<string, unknown>): string[] =>
  Object.entries(value).flatMap(([field, detail]) => {
    if (Array.isArray(detail)) {
      return detail
        .map((item) => toMessage(item))
        .filter((item): item is string => Boolean(item))
        .map((item) => `${field}: ${item}`);
    }

    const single = toMessage(detail);
    return single ? [`${field}: ${single}`] : [];
  });

const extractMessages = (payload: unknown): string[] => {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => extractMessages(item));
  }

  const single = toMessage(payload);
  if (single) return [single];

  if (!isRecord(payload)) return [];

  if ("field" in payload && "message" in payload) {
    const field = toMessage(payload.field);
    const message = toMessage(payload.message);
    if (field && message) return [`${field}: ${message}`];
  }

  const directKeys = ["detail", "error", "message"];
  const directMessages = directKeys
    .flatMap((key) => {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value.flatMap((item) => {
          if (isRecord(item) && ("msg" in item || "loc" in item)) {
            const msg = toMessage(item.msg);
            const loc = formatLoc(item.loc);
            if (msg && loc) return `${loc}: ${msg}`;
            return msg ? [msg] : [];
          }
          return extractMessages(item);
        });
      }
      return extractMessages(value);
    })
    .filter((item): item is string => Boolean(item));

  if (directMessages.length > 0) return directMessages;

  // Unified backend error: { errors: { code, detail, message, details: { errors: [ { field, message } ] } } }
  // Utamakan pesan field paling dalam (mis. "dataset_id: Active outbound transfer...")
  // daripada kode/label generik seperti "VALIDATION_ERROR / Validation Failed".
  if (isRecord(payload.errors)) {
    const errObj = payload.errors;
    // Integrity/constraint: JANGAN bocorkan database_error asyncpg; petakan ke pesan bersih.
    if (String(errObj.code ?? "").toUpperCase() === "INTEGRITY_ERROR") {
      const details = errObj.details;
      const dbError = isRecord(details) ? toMessage(details.database_error) : null;
      return [mapIntegrityError(dbError ?? "")];
    }
    // Provider chain: tampilkan penyebab terdalam (mis. "Unable to access source endpoint").
    if (String(errObj.code ?? "").toUpperCase() === "PROVIDER_RESPONSE_ERROR") {
      const deepest = extractProviderDetail(errObj);
      const message = toMessage(errObj.message);
      if (deepest) return message ? [deepest, message] : [deepest];
    }
    const nested = errObj.details;
    if (isRecord(nested) && Array.isArray(nested.errors)) {
      const deep = nested.errors.flatMap((item) => extractMessages(item));
      if (deep.length > 0) return deep;
    }
    return flattenErrorsObject(errObj);
  }

  if (Array.isArray(payload.errors)) {
    return payload.errors.flatMap((item) => extractMessages(item));
  }

  if (isRecord(payload.details) && Array.isArray(payload.details.errors)) {
    return payload.details.errors.flatMap((item) => extractMessages(item));
  }

  return [];
};

const dedupeMessages = (messages: string[]): string[] =>
  Array.from(new Set(messages.map((item) => normalizeApiErrorMessage(item)).filter(Boolean)));

const statusFallback = (status?: number, fallback?: string): string => {
  switch (status) {
    case 400:
      return fallback || "Permintaan tidak valid.";
    case 401:
      return "Sesi login tidak valid atau kredensial salah.";
    case 403:
      return "Anda tidak memiliki izin untuk menjalankan aksi ini.";
    case 404:
      return "Data atau endpoint yang diminta tidak ditemukan.";
    case 409:
      return "Data bentrok atau sudah ada. Periksa kembali input yang dikirim.";
    case 422:
      return fallback || "Validasi input gagal. Periksa kembali field yang diisi.";
    case 500:
      return "Terjadi kesalahan pada server.";
    case 502:
    case 503:
    case 504:
      return "Layanan backend sedang tidak tersedia atau timeout.";
    default:
      return fallback || "Terjadi kesalahan saat memproses permintaan.";
  }
};

// Untuk field data mentah dari BE (mis. task.error_log: string | Record<string,unknown> | null)
// yang BUKAN exception — getApiErrorMessage tak cocok karena hanya mengenali AxiosError/Error,
// payload mentah selalu jatuh ke fallback generik. extractMessages/dedupeMessages tahu cara
// membongkar bentuk ini (string polos, {detail}/{error}/{message}, unified errors object, dll).
export const getRawErrorLogMessage = (errorLog: unknown, fallback?: string): string => {
  const messages = dedupeMessages(extractMessages(errorLog));
  if (messages.length > 0) return messages.join(" | ");
  return fallback || "Terjadi kesalahan yang belum diketahui.";
};

export const getApiErrorMessage = (error: unknown, fallback?: string): string => {
  if (axios.isAxiosError(error)) {
    const messages = dedupeMessages(extractMessages(error.response?.data));
    if (messages.length > 0) return messages.join(" | ");

    if (error.response?.status) {
      return statusFallback(error.response.status, fallback);
    }

    if (error.request) {
      return "Tidak dapat terhubung ke server. Periksa koneksi atau endpoint API.";
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return normalizeApiErrorMessage(error.message);
  }

  return fallback || "Terjadi kesalahan yang belum diketahui.";
};
