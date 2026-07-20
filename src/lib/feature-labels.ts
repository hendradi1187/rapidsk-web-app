/* eslint-disable @typescript-eslint/no-explicit-any */
// Label & ringkasan atribut fitur koleksi adapter (OGC). Diekstrak dari TransferMapPreview
// supaya bisa dipakai ulang di peek "Contoh data" pada dialog dataset tanpa menyeret peta.

export const FIELD_LABELS: Record<string, string> = {
  nama_wk: "Nama WK",
  status_wk: "Status",
  lokasi: "Lokasi",
  provinsi_1: "Provinsi",
  nama_sumur: "Nama Sumur",
  jenis_sumur: "Jenis",
  status_sumur: "Status",
  total_depth: "Total Depth (m)",
  kb_elevation: "KB Elevation (m)",
  operator: "Operator",
  uwi: "UWI",
  nama_lapangan: "Nama Lapangan",
  jenis_fluida: "Fluida",
  tahun_temuan: "Tahun Temuan",
  status_lapangan: "Status",
  field_id: "Field ID",
  nama_fasilitas: "Nama Fasilitas",
  jenis_fasilitas: "Jenis",
  status_fasilitas: "Status",
  kapasitas: "Kapasitas",
  satuan_kapasitas: "Satuan",
  facility_id: "Facility ID",
  nama_survei: "Nama Survei",
  dimensi: "Dimensi",
  metode: "Metode",
  tahun_akuisisi: "Tahun Akuisisi",
  survey_id: "Survey ID",
  sumber_navigasi: "Navigasi",
};

// Label utama satu fitur: pakai field nama yang paling relevan per domain.
export const labelOf = (properties: any): string =>
  properties?.nama_wk ||
  properties?.nama_sumur ||
  properties?.nama_lapangan ||
  properties?.nama_fasilitas ||
  properties?.nama_survei ||
  properties?.uwi ||
  "Tanpa label";

export const summarizeValue = (value: unknown): string => {
  if (value == null || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

// Pilih hingga `max` key atribut paling informatif yang benar-benar ada isinya.
export const previewKeysFromFeatures = (items: any[], max = 4): string[] => {
  const ordered = [
    "nama_wk",
    "nama_sumur",
    "nama_lapangan",
    "nama_fasilitas",
    "nama_survei",
    "operator",
    "status_wk",
    "status_sumur",
    "status_lapangan",
    "status_fasilitas",
    "uwi",
    "field_id",
    "facility_id",
    "survey_id",
  ];
  const found = ordered.filter((key) =>
    items.some((feature) => {
      const value = feature?.properties?.[key];
      return value !== "" && value != null;
    }),
  );
  return found.slice(0, max);
};
