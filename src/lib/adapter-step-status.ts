// Status langkah wizard adapter (①②③④) dihitung dari state nyata.
// Pure helper — tidak menyentuh React/DOM — supaya bisa diuji unit dan dipakai
// baik oleh stepper maupun strip header ("Langkah berikutnya").
//
// Aturan (lihat mockup): ① selesai bila sumber terhubung (remote: koneksi terpilih;
// geojson/shapefile: input terisi), ② selesai bila layer terpilih (remote) / input
// terisi (geojson/shapefile), ③ selesai bila ada task sukses untuk kategori aktif,
// ④ selalu tampil. "Langkah berikutnya" = langkah pertama (①..③) yang belum selesai.

export type AdapterStepStatus = "done" | "next" | "todo";

export interface AdapterStepStatusInput {
  mode: "remote" | "geojson" | "shapefile";
  /** Remote: koneksi tersimpan sudah dipilih. */
  hasConnection: boolean;
  /** Remote: layer sudah dipilih (auto-select ingestible pertama memenuhi ini). */
  hasLayer: boolean;
  /** GeoJSON tempel: body punya minimal satu feature / payload valid. */
  geojsonFilled: boolean;
  /** Shapefile: arsip ZIP sudah dipilih. */
  shapefileFilled: boolean;
  /** Ada task SUCCESS untuk kategori (domain_code) yang sedang aktif. */
  hasSuccessTaskForCategory: boolean;
}

export interface AdapterStepStatuses {
  step1: AdapterStepStatus;
  step2: AdapterStepStatus;
  step3: AdapterStepStatus;
  step4: AdapterStepStatus;
  /** Langkah pertama (1..3) yang belum selesai; null bila ①②③ semua selesai. */
  nextStep: 1 | 2 | 3 | null;
}

export function computeAdapterStepStatuses(input: AdapterStepStatusInput): AdapterStepStatuses {
  const sourceFilled =
    input.mode === "remote"
      ? input.hasConnection
      : input.mode === "geojson"
        ? input.geojsonFilled
        : input.shapefileFilled;

  // ① sumber terhubung. ② layer (remote) / sumber terisi (geojson/shapefile).
  const done1 = sourceFilled;
  const done2 = input.mode === "remote" ? input.hasLayer : sourceFilled;
  const done3 = input.hasSuccessTaskForCategory;

  const done: Record<1 | 2 | 3, boolean> = { 1: done1, 2: done2, 3: done3 };
  const nextStep: 1 | 2 | 3 | null =
    ([1, 2, 3] as const).find((step) => !done[step]) ?? null;

  const statusOf = (step: 1 | 2 | 3): AdapterStepStatus =>
    done[step] ? "done" : step === nextStep ? "next" : "todo";

  return {
    step1: statusOf(1),
    step2: statusOf(2),
    step3: statusOf(3),
    // ④ selalu tampil: hijau saat ③ selesai, netral bila belum — tidak pernah "next".
    step4: done3 ? "done" : "todo",
    nextStep,
  };
}

/** Label ringkas langkah berikutnya untuk strip header, mis. "③ Ingest". */
export function nextStepLabel(nextStep: 1 | 2 | 3 | null): string {
  switch (nextStep) {
    case 1:
      return "① Hubungkan sumber";
    case 2:
      return "② Pilih layer";
    case 3:
      return "③ Ingest";
    default:
      return "Semua langkah selesai";
  }
}
