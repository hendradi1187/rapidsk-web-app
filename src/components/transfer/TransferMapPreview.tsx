/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, NavigationControl, Popup } from "maplibre-gl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Maximize2,
  Mountain,
  RefreshCw,
} from "lucide-react";
import { adapterServiceApi } from "@/api/services/adapter-service";

interface AdapterInfo {
  url: string;
  domain_id?: string;
  type?: string;
}

interface TransferMapPreviewProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  datasetName: string;
  endpointUrl?: string;
  adapterInfo?: AdapterInfo | null;
  transferId: string;
}

type DomainCode = "WK" | "FLD" | "SEI" | "WLL" | "FP";
type ViewMode = "2d" | "tilt";
type BasemapMode = "map" | "satellite";

type PreviewFeatureCollection = {
  type: "FeatureCollection";
  features: any[];
};

const DOMAIN_META: Record<string, { name: string; color: string }> = {
  WK: { name: "Wilayah Kerja", color: "#f5a623" },
  FLD: { name: "Lapangan", color: "#34d399" },
  SEI: { name: "Survei Seismik", color: "#a78bfa" },
  WLL: { name: "Sumur", color: "#22d3ee" },
  FP: { name: "Fasilitas", color: "#f472b6" },
};

const FIELD_LABELS: Record<string, string> = {
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

const MAP_SOURCE_ID = "transfer-preview-source";
const POLYGON_FILL_LAYER_ID = "transfer-preview-polygon-fill";
const POLYGON_LINE_LAYER_ID = "transfer-preview-polygon-line";
const LINE_LAYER_ID = "transfer-preview-line";
const POINT_LAYER_ID = "transfer-preview-point";
const ADAPTER_ITEMS_LIMIT = 100;
const EMPTY_COLLECTION: PreviewFeatureCollection = { type: "FeatureCollection", features: [] };

const createRasterStyle = (basemapMode: BasemapMode) => ({
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    basemap: {
      type: "raster",
      tiles:
        basemapMode === "satellite"
          ? [
              "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ]
          : [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
      tileSize: 256,
      attribution:
        basemapMode === "satellite"
          ? "Tiles © Esri"
          : "© OpenStreetMap contributors",
    },
    labels: basemapMode === "satellite"
      ? {
          type: "raster",
          tiles: [
            "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "Labels © Esri",
        }
      : undefined,
  },
  layers: [
    {
      id: "basemap-layer",
      type: "raster",
      source: "basemap",
      minzoom: 0,
      maxzoom: 19,
    },
    ...(basemapMode === "satellite"
      ? [
          {
            id: "labels-layer",
            type: "raster",
            source: "labels",
            minzoom: 0,
            maxzoom: 19,
          },
        ]
      : []),
  ],
});

const labelOf = (properties: any) =>
  properties?.nama_wk ||
  properties?.nama_sumur ||
  properties?.nama_lapangan ||
  properties?.nama_fasilitas ||
  properties?.nama_survei ||
  properties?.uwi ||
  "Tanpa label";

const codeFromUrl = (url?: string): DomainCode | null => {
  if (!url) return null;
  const match = url.match(/\/collections\/([^/?]+)\/items/i);
  const code = match?.[1]?.toUpperCase();
  return code && DOMAIN_META[code] ? (code as DomainCode) : null;
};

const collectCoordinates = (node: any, bucket: Array<[number, number]>) => {
  if (!Array.isArray(node)) return;
  if (typeof node[0] === "number" && typeof node[1] === "number") {
    bucket.push([node[0], node[1]]);
    return;
  }
  node.forEach((child) => collectCoordinates(child, bucket));
};

const computeBounds = (features: any[]): [[number, number], [number, number]] | null => {
  const coords: Array<[number, number]> = [];
  features.forEach((feature) => collectCoordinates(feature?.geometry?.coordinates, coords));
  if (coords.length === 0) return null;

  let minLng = coords[0][0];
  let maxLng = coords[0][0];
  let minLat = coords[0][1];
  let maxLat = coords[0][1];

  coords.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
};

const featureCollectionFrom = (features: any[]): PreviewFeatureCollection => ({
  type: "FeatureCollection",
  features: features.filter((feature) => feature?.geometry),
});

const normalizeFeature = (feature: any) => {
  const id = feature?.id ?? crypto.randomUUID();
  return {
    ...feature,
    id,
    properties: {
      ...feature?.properties,
      __featureId: String(id),
      __featureLabel: labelOf(feature?.properties),
    },
  };
};

const summarizeValue = (value: unknown) => {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const previewKeysFromFeatures = (items: any[]) => {
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

  return found.slice(0, 4);
};

export function TransferMapPreview({
  open,
  onOpenChange,
  datasetName,
  endpointUrl,
  transferId,
}: TransferMapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<Popup | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [basemapMode, setBasemapMode] = useState<BasemapMode>("map");

  const code = useMemo(() => codeFromUrl(endpointUrl), [endpointUrl]);
  const meta = code ? DOMAIN_META[code] : null;
  const color = meta?.color ?? "#38bdf8";
  const previewKeys = useMemo(() => previewKeysFromFeatures(features), [features]);

  const featureCollection = useMemo(
    () => featureCollectionFrom(features),
    [features],
  );

  const applyDataLayers = useCallback(
    (map: maplibregl.Map) => {
      if (map.getSource(MAP_SOURCE_ID)) {
        const source = map.getSource(MAP_SOURCE_ID) as GeoJSONSource;
        source.setData(featureCollection as any);
        return;
      }

      map.addSource(MAP_SOURCE_ID, {
        type: "geojson",
        data: featureCollection as any,
      });

      map.addLayer({
        id: POLYGON_FILL_LAYER_ID,
        type: "fill",
        source: MAP_SOURCE_ID,
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: {
          "fill-color": color,
          "fill-opacity": 0.24,
        },
      });

      map.addLayer({
        id: POLYGON_LINE_LAYER_ID,
        type: "line",
        source: MAP_SOURCE_ID,
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: {
          "line-color": color,
          "line-width": 2,
          "line-opacity": 0.95,
        },
      });

      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: MAP_SOURCE_ID,
        filter: ["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]],
        paint: {
          "line-color": color,
          "line-width": 3,
          "line-opacity": 0.95,
        },
      });

      map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: MAP_SOURCE_ID,
        filter: ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]],
        paint: {
          "circle-color": color,
          "circle-radius": 7,
          "circle-stroke-color": "#04101f",
          "circle-stroke-width": 2,
        },
      });
    },
    [color, featureCollection],
  );

  const syncMapData = useCallback(
    (items: PreviewFeatureCollection) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      const source = map.getSource(MAP_SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) return;

      source.setData(items as any);

      const bounds = computeBounds(items.features);
      if (bounds) {
        map.fitBounds(bounds, {
          padding: { top: 48, bottom: 48, left: 48, right: 48 },
          duration: 700,
          maxZoom: 13,
        });
      }
    },
    [],
  );

  const load = useCallback(() => {
    if (!code) {
      setError("Endpoint dataset belum mengarah ke koleksi domain yang bisa dipetakan.");
      return;
    }

    setLoading(true);
    setError(null);
    setSelected(null);
    popupRef.current?.remove();

    adapterServiceApi
      .listItems(code, { limit: ADAPTER_ITEMS_LIMIT })
      .then((response: any) => {
        const items = Array.isArray(response?.features)
          ? response.features.map(normalizeFeature)
          : [];

        setFeatures(items);

        if (items.length === 0) {
          setError("Belum ada fitur yang bisa dipreview.");
        }
      })
      .catch((loadError: any) => {
        setFeatures([]);
        setError(loadError?.message || "Gagal memuat data peta.");
      })
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open || !mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createRasterStyle(basemapMode) as any,
      center: [118, -2.5],
      zoom: 4.2,
      pitch: viewMode === "tilt" ? 55 : 0,
      bearing: viewMode === "tilt" ? -18 : 0,
      antialias: true,
      attributionControl: true,
    });

    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: true }), "top-right");

    map.on("load", () => {
      applyDataLayers(map);

      const interactiveLayerIds = [
        POLYGON_FILL_LAYER_ID,
        POLYGON_LINE_LAYER_ID,
        LINE_LAYER_ID,
        POINT_LAYER_ID,
      ];

      map.on("click", interactiveLayerIds, (event) => {
        const feature = event.features?.[0];
        if (!feature) return;

        const matched = features.find(
          (item) =>
            String(item?.id) === String(feature.properties?.__featureId) ||
            labelOf(item?.properties) === feature.properties?.__featureLabel,
        );

        setSelected(matched ?? feature);

        popupRef.current?.remove();
        popupRef.current = new Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
          className: "transfer-preview-popup",
        })
          .setLngLat(event.lngLat)
          .setHTML(
            `<div style="padding:6px 8px;min-width:120px">
              <div style="font-weight:600;color:${color};margin-bottom:4px">${feature.properties?.__featureLabel ?? "Fitur"}</div>
              <div style="font-size:11px;color:#94a3b8">${feature.geometry?.type ?? ""}</div>
            </div>`,
          )
          .addTo(map);
      });

      interactiveLayerIds.forEach((layerId) => {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      });

      syncMapData(featureCollection);
    });

    map.on("style.load", () => {
      applyDataLayers(map);
      syncMapData(featureCollection);
    });

    map.on("error", () => {
      setError((current) => current ?? "Basemap gagal dimuat. Cek koneksi internet atau style peta.");
    });

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [applyDataLayers, basemapMode, featureCollection, features, open, syncMapData, viewMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(createRasterStyle(basemapMode) as any);
  }, [basemapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.easeTo({
      pitch: viewMode === "tilt" ? 55 : 0,
      bearing: viewMode === "tilt" ? -18 : 0,
      duration: 500,
    });
  }, [viewMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    [
      POLYGON_FILL_LAYER_ID,
      POLYGON_LINE_LAYER_ID,
      LINE_LAYER_ID,
      POINT_LAYER_ID,
    ].forEach((layerId) => {
      if (!map.getLayer(layerId)) return;

      if (layerId === POLYGON_FILL_LAYER_ID) {
        map.setPaintProperty(layerId, "fill-color", color);
      } else if (layerId === POINT_LAYER_ID) {
        map.setPaintProperty(layerId, "circle-color", color);
      } else {
        map.setPaintProperty(layerId, "line-color", color);
      }
    });
  }, [color]);

  useEffect(() => {
    syncMapData(featureCollection);
  }, [featureCollection, syncMapData]);

  const fitAll = useCallback(() => {
    const map = mapRef.current;
    const bounds = computeBounds(features);
    if (!map || !bounds) return;

    map.fitBounds(bounds, {
      padding: { top: 48, bottom: 48, left: 48, right: 48 },
      duration: 700,
      maxZoom: 13,
    });
  }, [features]);

  const focusFeature = useCallback((feature: any) => {
    setSelected(feature);

    const map = mapRef.current;
    const bounds = computeBounds([feature]);
    if (!map || !bounds) return;

    map.fitBounds(bounds, {
      padding: { top: 56, bottom: 56, left: 56, right: 56 },
      duration: 700,
      maxZoom: 15,
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-hidden p-0 gap-0 sm:max-w-[1380px]">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" style={{ color }} />
            Preview Peta — {datasetName}
            {meta && (
              <Badge variant="outline" className="ml-1 font-mono text-[10px]">
                {code} · {meta.name}
              </Badge>
            )}
            {!loading && !error && features.length > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {features.length} fitur
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Viewer ini memakai engine map interaktif supaya data transfer lebih gampang dicek dalam mode 2D atau tilt.
          </DialogDescription>
        </DialogHeader>

        <div className="grid xl:grid-cols-[360px_minmax(0,1fr)_320px] gap-0">
          <div className="max-h-[64vh] overflow-y-auto border-r bg-white">
            <div className="border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Data Hasil Transfer
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Klik record untuk fokus ke item yang sama di peta.
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {features.length} item
                </Badge>
              </div>
            </div>

            {!features.length ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Belum ada item hasil validasi yang bisa ditampilkan.
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {features.map((feature, index) => (
                  <button
                    key={String(feature.id)}
                    type="button"
                    onClick={() => focusFeature(feature)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      selected?.id === feature.id
                        ? "border-accent bg-accent/5 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {labelOf(feature.properties)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Item {index + 1} · {feature.geometry?.type ?? "Geometry"}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-1.5">
                      {previewKeys.map((key) => (
                        <div key={key} className="flex items-start justify-between gap-3 text-[12px]">
                          <span className="text-slate-500">{FIELD_LABELS[key] || key}</span>
                          <span className="max-w-[180px] text-right text-slate-900">
                            {summarizeValue(feature.properties?.[key])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative min-h-[420px] bg-[#06111f]">
            <div ref={mapContainerRef} className="h-[clamp(420px,64vh,720px)] w-full" />

            <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 gap-1 bg-slate-950/85 text-slate-100 backdrop-blur hover:bg-slate-900"
                onClick={fitAll}
                disabled={!features.length}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Fit
              </Button>
              <Button
                size="sm"
                variant={viewMode === "2d" ? "default" : "secondary"}
                className={viewMode === "2d" ? "h-8 gap-1" : "h-8 gap-1 bg-slate-950/85 text-slate-100 backdrop-blur hover:bg-slate-900"}
                onClick={() => setViewMode("2d")}
              >
                2D
              </Button>
              <Button
                size="sm"
                variant={viewMode === "tilt" ? "default" : "secondary"}
                className={viewMode === "tilt" ? "h-8 gap-1" : "h-8 gap-1 bg-slate-950/85 text-slate-100 backdrop-blur hover:bg-slate-900"}
                onClick={() => setViewMode("tilt")}
              >
                <Mountain className="h-3.5 w-3.5" />
                Tilt
              </Button>
              <Button
                size="sm"
                variant={basemapMode === "map" ? "default" : "secondary"}
                className={basemapMode === "map" ? "h-8 gap-1" : "h-8 gap-1 bg-slate-950/85 text-slate-100 backdrop-blur hover:bg-slate-900"}
                onClick={() => setBasemapMode("map")}
              >
                Peta
              </Button>
              <Button
                size="sm"
                variant={basemapMode === "satellite" ? "default" : "secondary"}
                className={basemapMode === "satellite" ? "h-8 gap-1" : "h-8 gap-1 bg-slate-950/85 text-slate-100 backdrop-blur hover:bg-slate-900"}
                onClick={() => setBasemapMode("satellite")}
              >
                Satelit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 gap-1 bg-slate-950/85 text-slate-100 backdrop-blur hover:bg-slate-900"
                onClick={load}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Muat ulang
              </Button>
            </div>

            {loading && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-[#03111dcc]/70 text-slate-100 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm shadow-xl">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat data peta...
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl border border-amber-500/30 bg-[#120f0b]/95 p-4 text-sm text-amber-100 shadow-2xl backdrop-blur">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  <div className="space-y-3">
                    <p>{error}</p>
                    {code && (
                      <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={load}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Coba lagi
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="max-h-[64vh] overflow-y-auto border-l bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Detail Fitur
              </span>
              {!!features.length && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {features.length}
                </Badge>
              )}
            </div>

            {selected ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-3 w-3 rounded" style={{ background: color }} />
                  {labelOf(selected.properties)}
                </div>
                <div className="mb-3 font-mono text-[11px] text-muted-foreground">
                  {selected.geometry?.type} · {selected.id}
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
                  {Object.entries(selected.properties ?? {})
                    .filter(([key, value]) =>
                      value !== "" &&
                      value != null &&
                      key !== "wk_id" &&
                      key !== "gx_metadata" &&
                      !key.startsWith("__"),
                    )
                    .map(([key, value]) => (
                      <div key={key} className="contents">
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {FIELD_LABELS[key] || key}
                        </div>
                        <div className="break-words text-right">{String(value)}</div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-[12.5px] leading-relaxed text-muted-foreground">
                <p>
                  Klik fitur di peta untuk melihat atribut lengkapnya. Gunakan tombol <strong>2D</strong> atau{" "}
                  <strong>Tilt</strong> buat ganti sudut pandang.
                </p>
                <p>
                  Panel kiri menampilkan daftar item hasil transfer supaya operator bisa cek isi datanya tanpa
                  pindah halaman.
                </p>
                <p className="font-mono text-[11px] text-muted-foreground/70">
                  Transfer ID: {transferId.slice(0, 12)}…
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
