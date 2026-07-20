import { describe, it, expect } from "vitest";
import {
  computeAdapterStepStatuses,
  nextStepLabel,
  type AdapterStepStatusInput,
} from "@/lib/adapter-step-status";

const base: AdapterStepStatusInput = {
  mode: "remote",
  hasConnection: false,
  hasLayer: false,
  geojsonFilled: false,
  shapefileFilled: false,
  hasSuccessTaskForCategory: false,
};

describe("computeAdapterStepStatuses — remote", () => {
  it("kosong semua → langkah berikutnya ①", () => {
    const s = computeAdapterStepStatuses(base);
    expect(s.step1).toBe("next");
    expect(s.step2).toBe("todo");
    expect(s.step3).toBe("todo");
    expect(s.step4).toBe("todo");
    expect(s.nextStep).toBe(1);
  });

  it("koneksi terpilih → ① selesai, berikutnya ②", () => {
    const s = computeAdapterStepStatuses({ ...base, hasConnection: true });
    expect(s.step1).toBe("done");
    expect(s.step2).toBe("next");
    expect(s.step3).toBe("todo");
    expect(s.nextStep).toBe(2);
  });

  it("koneksi + layer → ①② selesai, berikutnya ③", () => {
    const s = computeAdapterStepStatuses({ ...base, hasConnection: true, hasLayer: true });
    expect(s.step1).toBe("done");
    expect(s.step2).toBe("done");
    expect(s.step3).toBe("next");
    expect(s.nextStep).toBe(3);
  });

  it("koneksi + layer + task sukses → semua selesai, nextStep null", () => {
    const s = computeAdapterStepStatuses({
      ...base,
      hasConnection: true,
      hasLayer: true,
      hasSuccessTaskForCategory: true,
    });
    expect(s.step1).toBe("done");
    expect(s.step2).toBe("done");
    expect(s.step3).toBe("done");
    expect(s.step4).toBe("done");
    expect(s.nextStep).toBeNull();
  });

  it("layer terpilih tanpa koneksi → ① tetap next, ② tidak lompat jadi done sebelum ①", () => {
    // hasLayer true tapi hasConnection false: step2 done secara aturan, tapi step1 belum,
    // jadi nextStep tetap ① (langkah pertama yang belum selesai).
    const s = computeAdapterStepStatuses({ ...base, hasLayer: true });
    expect(s.step1).toBe("next");
    expect(s.step2).toBe("done");
    expect(s.nextStep).toBe(1);
  });
});

describe("computeAdapterStepStatuses — geojson & shapefile", () => {
  it("geojson terisi → ①② selesai, berikutnya ③", () => {
    const s = computeAdapterStepStatuses({ ...base, mode: "geojson", geojsonFilled: true });
    expect(s.step1).toBe("done");
    expect(s.step2).toBe("done");
    expect(s.step3).toBe("next");
    expect(s.nextStep).toBe(3);
  });

  it("geojson kosong → berikutnya ①", () => {
    const s = computeAdapterStepStatuses({ ...base, mode: "geojson" });
    expect(s.step1).toBe("next");
    expect(s.nextStep).toBe(1);
  });

  it("shapefile terisi → ①② selesai, berikutnya ③", () => {
    const s = computeAdapterStepStatuses({ ...base, mode: "shapefile", shapefileFilled: true });
    expect(s.step1).toBe("done");
    expect(s.step2).toBe("done");
    expect(s.nextStep).toBe(3);
  });

  it("mode remote mengabaikan geojsonFilled untuk step1", () => {
    const s = computeAdapterStepStatuses({ ...base, geojsonFilled: true });
    expect(s.step1).toBe("next");
    expect(s.nextStep).toBe(1);
  });
});

describe("nextStepLabel", () => {
  it("memetakan tiap langkah + selesai", () => {
    expect(nextStepLabel(1)).toContain("Hubungkan");
    expect(nextStepLabel(2)).toContain("layer");
    expect(nextStepLabel(3)).toContain("Ingest");
    expect(nextStepLabel(null)).toContain("selesai");
  });
});
