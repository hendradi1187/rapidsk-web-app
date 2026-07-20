// Pure builder untuk style raster MapLibre di preview transfer.
// Sengaja bebas dependency React/MapLibre supaya bisa dites langsung.
//
// PENTING (R1): MapLibre memvalidasi SELURUH objek style. Kalau ada key di `sources`
// yang bernilai `undefined` (mis. `labels: undefined` saat mode "map"), style ditolak
// diam-diam → NOL layer ter-render → kanvas peta gelap. Karena itu builder ini memakai
// conditional spread supaya TIDAK PERNAH ada key yang menyimpan `undefined`.

export type BasemapMode = "map" | "satellite";

export interface RasterSourceSpec {
  type: "raster";
  tiles: string[];
  tileSize: number;
  attribution: string;
}

export interface RasterLayerSpec {
  id: string;
  type: "raster";
  source: string;
  minzoom: number;
  maxzoom: number;
}

export interface RasterStyleSpec {
  version: 8;
  glyphs: string;
  sources: Record<string, RasterSourceSpec>;
  layers: RasterLayerSpec[];
}

const OSM_TILES = ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"];
const ESRI_IMAGERY_TILES = [
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
];
const ESRI_LABEL_TILES = [
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
];

// Bangun style raster berdasarkan basemap. Mode "satellite" menambah source+layer label,
// mode "map" TIDAK memuat key `labels` sama sekali (bukan undefined).
export const buildRasterStyle = (basemapMode: BasemapMode): RasterStyleSpec => {
  const isSatellite = basemapMode === "satellite";

  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      basemap: {
        type: "raster",
        tiles: isSatellite ? ESRI_IMAGERY_TILES : OSM_TILES,
        tileSize: 256,
        attribution: isSatellite ? "Tiles (c) Esri" : "(c) OpenStreetMap contributors",
      },
      ...(isSatellite
        ? {
            labels: {
              type: "raster" as const,
              tiles: ESRI_LABEL_TILES,
              tileSize: 256,
              attribution: "Labels (c) Esri",
            },
          }
        : {}),
    },
    layers: [
      {
        id: "basemap-layer",
        type: "raster",
        source: "basemap",
        minzoom: 0,
        maxzoom: 19,
      },
      ...(isSatellite
        ? [
            {
              id: "labels-layer",
              type: "raster" as const,
              source: "labels",
              minzoom: 0,
              maxzoom: 19,
            },
          ]
        : []),
    ],
  };
};
