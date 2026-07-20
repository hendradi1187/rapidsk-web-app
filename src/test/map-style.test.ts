import { describe, it, expect } from "vitest";
import { buildRasterStyle } from "@/lib/map-style";

describe("buildRasterStyle — R1: tidak ada key undefined di style", () => {
  it("mode 'map' hanya punya source basemap, TIDAK ada key labels", () => {
    const style = buildRasterStyle("map");
    expect(Object.keys(style.sources)).toEqual(["basemap"]);
    expect("labels" in style.sources).toBe(false);
    expect(style.sources.labels).toBeUndefined();
    // hanya satu layer basemap, tidak ada layer labels
    expect(style.layers.map((l) => l.id)).toEqual(["basemap-layer"]);
    expect(style.sources.basemap.tiles[0]).toContain("tile.openstreetmap.org");
  });

  it("mode 'satellite' punya source basemap + labels dan layer labels", () => {
    const style = buildRasterStyle("satellite");
    expect(Object.keys(style.sources).sort()).toEqual(["basemap", "labels"]);
    expect(style.sources.labels).toBeDefined();
    expect(style.sources.labels.type).toBe("raster");
    expect(style.layers.map((l) => l.id)).toEqual(["basemap-layer", "labels-layer"]);
    expect(style.sources.basemap.tiles[0]).toContain("World_Imagery");
  });

  it("JSON round-trip tidak menghilangkan key apa pun (bukti tidak ada undefined)", () => {
    (["map", "satellite"] as const).forEach((mode) => {
      const style = buildRasterStyle(mode);
      const roundTripped = JSON.parse(JSON.stringify(style));
      // Kalau ada value undefined, JSON.stringify akan membuang key-nya → jumlah key beda.
      expect(Object.keys(roundTripped.sources)).toEqual(Object.keys(style.sources));
      expect(roundTripped).toEqual(style);
      // Tidak ada value undefined di sources maupun layers.
      expect(Object.values(roundTripped.sources).some((s) => s === undefined)).toBe(false);
    });
  });

  it("selalu menyertakan version 8 dan glyphs", () => {
    const style = buildRasterStyle("map");
    expect(style.version).toBe(8);
    expect(style.glyphs).toContain("{fontstack}");
  });
});
