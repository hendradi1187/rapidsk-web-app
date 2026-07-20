import { describe, it, expect } from "vitest";
import {
  resolveHistoryTimestamp,
  compareHistoryDesc,
  formatHistoryTime,
  formatRelativeTime,
  matchesHistoryFilter,
  DEFAULT_HISTORY_FILTER,
  type HistoryFilterRecord,
} from "@/lib/transfer-history";

describe("resolveHistoryTimestamp — projeksi dulu, fallback field transfer", () => {
  it("pakai last_event_at projeksi kalau ada", () => {
    const ms = resolveHistoryTimestamp({
      projectionLastEventAt: "2026-07-15T09:32:26Z",
      transferCompletedAt: "2026-07-14T00:00:00Z",
    });
    expect(ms).toBe(new Date("2026-07-15T09:32:26Z").getTime());
  });

  it("fallback ke completed_at transfer saat projeksi kosong (list connector tanpa created/updated)", () => {
    const ms = resolveHistoryTimestamp({
      transferCompletedAt: "2026-07-14T11:19:47Z",
      transferStartedAt: "2026-07-14T11:19:46Z",
    });
    expect(ms).toBe(new Date("2026-07-14T11:19:47Z").getTime());
  });

  it("fallback ke started_at bila completed_at kosong", () => {
    const ms = resolveHistoryTimestamp({ transferStartedAt: "2026-07-14T11:19:46Z" });
    expect(ms).toBe(new Date("2026-07-14T11:19:46Z").getTime());
  });

  it("kembalikan 0 bila semua kosong", () => {
    expect(resolveHistoryTimestamp({})).toBe(0);
  });

  it("kembalikan 0 untuk tanggal invalid (bukan NaN)", () => {
    expect(resolveHistoryTimestamp({ projectionLastEventAt: "bukan-tanggal" })).toBe(0);
  });
});

describe("compareHistoryDesc — terbaru dulu, tie-break id desc", () => {
  it("mengurutkan timestamp desc", () => {
    const rows = [
      { id: "a", timestamp: 100 },
      { id: "b", timestamp: 300 },
      { id: "c", timestamp: 200 },
    ].sort(compareHistoryDesc);
    expect(rows.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("tie → id desc saat timestamp sama", () => {
    const rows = [
      { id: "aaa", timestamp: 100 },
      { id: "ccc", timestamp: 100 },
      { id: "bbb", timestamp: 100 },
    ].sort(compareHistoryDesc);
    expect(rows.map((r) => r.id)).toEqual(["ccc", "bbb", "aaa"]);
  });

  it("timestamp 0 tenggelam ke bawah", () => {
    const rows = [
      { id: "a", timestamp: 0 },
      { id: "b", timestamp: 500 },
    ].sort(compareHistoryDesc);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("formatHistoryTime — lokal ringkas", () => {
  it("format '15 Jul 09:32' dari komponen lokal", () => {
    // Dibangun & diformat dari komponen lokal → deterministik lintas timezone.
    const local = new Date(2026, 6, 15, 9, 32).getTime();
    expect(formatHistoryTime(local)).toBe("15 Jul 09:32");
  });

  it("pad jam/menit satu digit", () => {
    const local = new Date(2026, 0, 5, 3, 7).getTime();
    expect(formatHistoryTime(local)).toBe("5 Jan 03:07");
  });

  it("'-' untuk 0/invalid", () => {
    expect(formatHistoryTime(0)).toBe("-");
    expect(formatHistoryTime(Number.NaN)).toBe("-");
  });
});

describe("formatRelativeTime — relatif ringkas (now disuntik)", () => {
  const now = new Date("2026-07-15T12:00:00Z").getTime();
  it("baru saja (<1 menit)", () => {
    expect(formatRelativeTime(now - 30_000, now)).toBe("baru saja");
  });
  it("menit", () => {
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5 menit lalu");
  });
  it("jam", () => {
    expect(formatRelativeTime(now - 2 * 3_600_000, now)).toBe("2 jam lalu");
  });
  it("hari", () => {
    expect(formatRelativeTime(now - 3 * 86_400_000, now)).toBe("3 hari lalu");
  });
  it("kosong bila timestamp 0", () => {
    expect(formatRelativeTime(0, now)).toBe("");
  });
});

describe("matchesHistoryFilter — filter + search", () => {
  const record: HistoryFilterRecord = {
    transferId: "7acd8954-187d-4cea-bc8c-fd7c5269f12a",
    agreementId: "e0d0f024-5345-4100-ade2-293c9a2d4d2a",
    datasetId: "66ced008-0956-4b25-93b5-2f6373bbae8f",
    datasetName: "Peta Wilayah Kerja",
    status: "COMPLETED",
    mode: "persistent",
  };

  it("lolos dengan filter default (ALL semua)", () => {
    expect(matchesHistoryFilter(record, DEFAULT_HISTORY_FILTER)).toBe(true);
  });

  it("filter dataset tak cocok → gugur", () => {
    expect(matchesHistoryFilter(record, { ...DEFAULT_HISTORY_FILTER, datasetId: "lain" })).toBe(false);
  });

  it("filter status cocok/ tak cocok", () => {
    expect(matchesHistoryFilter(record, { ...DEFAULT_HISTORY_FILTER, status: "COMPLETED" })).toBe(true);
    expect(matchesHistoryFilter(record, { ...DEFAULT_HISTORY_FILTER, status: "FAILED" })).toBe(false);
  });

  it("filter mode", () => {
    expect(matchesHistoryFilter(record, { ...DEFAULT_HISTORY_FILTER, mode: "persistent" })).toBe(true);
    expect(matchesHistoryFilter(record, { ...DEFAULT_HISTORY_FILTER, mode: "direct" })).toBe(false);
  });

  it("search cocok substring nama dataset (case-insensitive)", () => {
    expect(matchesHistoryFilter(record, { ...DEFAULT_HISTORY_FILTER, search: "wilayah" })).toBe(true);
  });

  it("search cocok potongan transfer id", () => {
    expect(matchesHistoryFilter(record, { ...DEFAULT_HISTORY_FILTER, search: "7acd8954" })).toBe(true);
  });

  it("search cocok agreement id", () => {
    expect(matchesHistoryFilter(record, { ...DEFAULT_HISTORY_FILTER, search: "e0d0f024" })).toBe(true);
  });

  it("search tak cocok → gugur", () => {
    expect(matchesHistoryFilter(record, { ...DEFAULT_HISTORY_FILTER, search: "zzz" })).toBe(false);
  });
});
