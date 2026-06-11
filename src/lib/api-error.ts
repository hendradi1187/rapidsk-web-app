import axios from "axios";

type Primitive = string | number | boolean | null | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toMessage = (value: Primitive): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
};

const formatLoc = (loc: unknown): string | null => {
  if (!Array.isArray(loc)) return null;
  const path = loc
    .map((item) => String(item))
    .filter((item) => item && item !== "body" && item !== "query" && item !== "path")
    .join(".");
  return path || null;
};

const flattenErrorsObject = (value: Record<string, unknown>): string[] =>
  Object.entries(value).flatMap(([field, detail]) => {
    if (Array.isArray(detail)) {
      return detail
        .map((item) => toMessage(item as Primitive))
        .filter((item): item is string => Boolean(item))
        .map((item) => `${field}: ${item}`);
    }

    const single = toMessage(detail as Primitive);
    return single ? [`${field}: ${single}`] : [];
  });

const extractMessages = (payload: unknown): string[] => {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => extractMessages(item));
  }

  const single = toMessage(payload as Primitive);
  if (single) return [single];

  if (!isRecord(payload)) return [];

  const directKeys = ["detail", "error", "message"] as const;
  const directMessages = directKeys
    .flatMap((key) => {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value.flatMap((item) => {
          if (isRecord(item) && ("msg" in item || "loc" in item)) {
            const msg = toMessage(item.msg as Primitive);
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

  if (isRecord(payload.errors)) {
    return flattenErrorsObject(payload.errors);
  }

  if (Array.isArray(payload.errors)) {
    return payload.errors.flatMap((item) => extractMessages(item));
  }

  return [];
};

const dedupeMessages = (messages: string[]): string[] =>
  Array.from(new Set(messages.map((item) => item.trim()).filter(Boolean)));

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
    return error.message.trim();
  }

  return fallback || "Terjadi kesalahan yang belum diketahui.";
};
