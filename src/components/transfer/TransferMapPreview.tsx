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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  MapPin,
  Maximize2,
  Mountain,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { adapterServiceApi } from "@/api/services/adapter-service";
import { transfersApi } from "@/api/services/connector";
import { buildRasterStyle, type BasemapMode } from "@/lib/map-style";
import { FIELD_LABELS, labelOf, summarizeValue, previewKeysFromFeatures } from "@/lib/feature-labels";

interface AdapterInfo {
  url: string;
  domain_id?: string;
  type?: string;
}

interface TransferContext {
  domain_id: string;
  agreement_id: string;
  dataset_id: string;
  mode?: string | null;
}

interface TransferMapPreviewProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  datasetName: string;
  endpointUrl?: string;
  adapterInfo?: AdapterInfo | null;
  transferId: string;
  transferContext?: TransferContext | null;
}

type DomainCode = "WK" | "FLD" | "SEI" | "WLL" | "FP";
type ViewMode = "2d" | "tilt";

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

// Ambil array fitur dari payload GeoJSON apa pun bentuknya (FeatureCollection / Feature / array).
const featuresFromPayload = (payload: any): any[] | null => {
  if (!payload || typeof payload !== "object") return null;
  if (payload.type === "FeatureCollection" && Array.isArray(payload.features)) return payload.features;
  if (payload.type === "Feature" && payload.geometry) return [payload];
  if (Array.isArray(payload)) {
    const geo = payload.filter((f) => f?.geometry);
    return geo.length ? geo : null;
  }
  if (Array.isArray(payload.features)) return payload.features;
  return null;
};

const MAX_RENDER_FEATURES = 500;

const MAP_SOURCE_ID = "transfer-preview-source";
const POLYGON_FILL_LAYER_ID = "transfer-preview-polygon-fill";
const POLYGON_LINE_LAYER_ID = "transfer-preview-polygon-line";
const LINE_LAYER_ID = "transfer-preview-line";
const POINT_LAYER_ID = "transfer-preview-point";
const ADAPTER_ITEMS_LIMIT = 100;
const EMPTY_COLLECTION: PreviewFeatureCollection = { type: "FeatureCollection", features: [] };

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

const describeLoadError = (message: string, endpointUrl?: string) => {
  const text = String(message || "Gagal memuat data peta.").trim();
  if (/401|403|bearer|authorization|audience/i.test(text)) {
    return `Akses ke adapter/source ditolak. FE sudah membawa bearer token; cek audience token service, auth adapter 8584, atau akses source. Detail: ${text}`;
  }
  if (/404/i.test(text)) {
    return `Endpoint preview tidak ditemukan${endpointUrl ? `: ${endpointUrl}` : ""}.`;
  }
  return text;
};

export function TransferMapPreview({
  open,
  onOpenChange,
  datasetName,
  endpointUrl,
  adapterInfo,
  transferId,
  transferContext,
}: TransferMapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const featuresRef = useRef<any[]>([]);
  // Flag "masih ngutang fit-bounds": diset true tiap map dibuat / data dimuat ulang,
  // di-reset false setelah fit benar-benar jalan (lihat syncMapData).
  const pendingFitRef = useRef(false);
  // Mirror ref: supaya effect init (deps [open]) bisa baca versi TERBARU dari helper &
  // data tanpa perlu memasukkannya ke deps (yang bikin map dibongkar-pasang tiap render).
  const applyDataLayersRef = useRef<(map: maplibregl.Map) => void>(() => {});
  const syncMapDataRef = useRef<(items: PreviewFeatureCollection) => void>(() => {});
  const featureCollectionRef = useRef<PreviewFeatureCollection>(EMPTY_COLLECTION);
  const viewModeRef = useRef<ViewMode>("2d");
  const basemapModeRef = useRef<BasemapMode>("map");
  const colorRef = useRef<string>("#38bdf8");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [totalFeatureCount, setTotalFeatureCount] = useState(0);
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

  useEffect(() => {
    featuresRef.current = features;
  }, [features]);

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

      // Fit-bounds sekali saja: dipicu begitu style DAN fitur sama-sama siap, apa pun
      // urutan datangnya. Selama fitur belum ada, pendingFit tetap true supaya fit tetap
      // jalan saat data menyusul (data mis. WK USA — tanpa fit, view default Indonesia
      // cuma menampilkan laut kosong).
      if (pendingFitRef.current) {
        const bounds = computeBounds(items.features);
        if (bounds) {
          map.fitBounds(bounds, {
            padding: { top: 48, bottom: 48, left: 48, right: 48 },
            duration: 700,
            maxZoom: 13,
          });
          pendingFitRef.current = false;
        }
      }
    },
    [],
  );

  // Jaga mirror ref selalu sinkron dengan render terbaru.
  useEffect(() => {
    applyDataLayersRef.current = applyDataLayers;
    syncMapDataRef.current = syncMapData;
    featureCollectionRef.current = featureCollection;
    viewModeRef.current = viewMode;
    basemapModeRef.current = basemapMode;
    colorRef.current = color;
  }, [applyDataLayers, syncMapData, featureCollection, viewMode, basemapMode, color]);

  // Fallback berlapis: (1) koleksi adapter (dataset OGC), (2) hasil transfer persistent
  // dari connector (data yang BENERAN ditransfer), (3) fetch endpoint source langsung.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected(null);
    // Data baru → utang fit-bounds sekali lagi supaya view nemplok ke data terbaru.
    pendingFitRef.current = true;
    popupRef.current?.remove();

    const failures: string[] = [];

    const applyFeatures = (rawFeatures: any[], source: string): boolean => {
      const geoFeatures = rawFeatures.filter((f) => f?.geometry);
      if (geoFeatures.length === 0) return false;
      setFeatures(geoFeatures.slice(0, MAX_RENDER_FEATURES).map(normalizeFeature));
      setTotalFeatureCount(geoFeatures.length);
      setDataSource(source);
      return true;
    };

    // 1) Dataset OGC: baca dari koleksi adapter.
    if (code) {
      try {
        const response: any = await adapterServiceApi.listItems(code, { limit: ADAPTER_ITEMS_LIMIT });
        const items = Array.isArray(response?.features) ? response.features : [];
        if (items.length > 0 && applyFeatures(items, `adapter (koleksi ${code})`)) {
          setLoading(false);
          return;
        }
        failures.push(`Koleksi adapter ${code} belum berisi fitur.`);
      } catch (loadError: any) {
        failures.push(describeLoadError(loadError?.message || "Adapter gagal dimuat.", endpointUrl));
      }
    }

    // 2) Transfer persistent: preview salinan data yang tersimpan di connector.
    const isPersistent = String(transferContext?.mode ?? "").toLowerCase().includes("persistent");
    if (transferContext && isPersistent && transferContext.domain_id && transferContext.agreement_id && transferContext.dataset_id) {
      try {
        const { blob } = await transfersApi.downloadPersistent(transferId, {
          domain_id: transferContext.domain_id,
          agreement_id: transferContext.agreement_id,
          dataset_id: transferContext.dataset_id,
        });
        const parsed = JSON.parse(await blob.text());
        const items = featuresFromPayload(parsed);
        if (items && applyFeatures(items, "hasil transfer persistent (connector)")) {
          setLoading(false);
          return;
        }
        failures.push("Hasil transfer bukan GeoJSON ber-geometri (mungkin GML/CSV) — peta tidak bisa render, tapi tombol Download tetap jalan.");
      } catch (loadError: any) {
        failures.push(
          loadError instanceof SyntaxError
            ? "Hasil transfer bukan JSON valid — cek isinya lewat tombol Download."
            : `Gagal ambil hasil transfer dari connector: ${describeLoadError(loadError?.message || "unknown", endpointUrl)}`,
        );
      }
    }

    // 3) Fallback terakhir: fetch endpoint source langsung dari browser (butuh CORS di source).
    if (endpointUrl && /^https?:\/\//i.test(endpointUrl)) {
      try {
        const res = await fetch(endpointUrl, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = featuresFromPayload(await res.json());
        if (items && applyFeatures(items, "endpoint source langsung")) {
          setLoading(false);
          return;
        }
        failures.push("Endpoint source tidak mengembalikan GeoJSON ber-geometri.");
      } catch {
        failures.push("Endpoint source tidak bisa diakses langsung dari browser (CORS/format) — bukan berarti transfernya gagal.");
      }
    }

    setFeatures([]);
    setTotalFeatureCount(0);
    setDataSource(null);
    setError(
      failures.length
        ? failures.join(" ")
        : "Tidak ada sumber preview untuk dataset ini. Transfer tetap valid — cek datanya lewat tombol Download.",
    );
    setLoading(false);
  }, [code, endpointUrl, transferContext, transferId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Init map HANYA saat dialog dibuka (deps [open]). Data/basemap/view TIDAK jadi dep:
  // perubahannya ditangani effect terpisah (syncMapData / setStyle / easeTo) supaya map
  // tidak dibongkar-pasang tiap render. Kontainer peta hidup di portal Radix Dialog yang
  // bisa belum ter-mount saat effect jalan → retry via requestAnimationFrame (loop pendek,
  // di-stop saat unmount/close).
  useEffect(() => {
    if (!open) return;

    let rafId = 0;
    let cancelled = false;

    const buildMap = () => {
      if (cancelled) return;
      const container = mapContainerRef.current;
      if (!container) {
        rafId = requestAnimationFrame(buildMap);
        return;
      }
      if (mapRef.current) return;

      // Map baru → utang fit-bounds sekali begitu style + fitur siap.
      pendingFitRef.current = true;

      const map = new maplibregl.Map({
        container,
        style: buildRasterStyle(basemapModeRef.current) as any,
        center: [118, -2.5],
        zoom: 4.2,
        pitch: viewModeRef.current === "tilt" ? 55 : 0,
        bearing: viewModeRef.current === "tilt" ? -18 : 0,
      });

      mapRef.current = map;
      map.addControl(new NavigationControl({ showCompass: true }), "top-right");

      map.on("load", () => {
        applyDataLayersRef.current(map);

        const interactiveLayerIds = [
          POLYGON_FILL_LAYER_ID,
          POLYGON_LINE_LAYER_ID,
          LINE_LAYER_ID,
          POINT_LAYER_ID,
        ];

        map.on("click", interactiveLayerIds, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;

          const matched = featuresRef.current.find(
            (item) =>
              String(item?.id) === String(feature.properties?.__featureId) ||
              labelOf(item?.properties) === feature.properties?.__featureLabel,
          );

          setSelected(matched ?? normalizeFeature(feature));

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
                <div style="font-weight:600;color:${colorRef.current};margin-bottom:4px">${feature.properties?.__featureLabel ?? "Fitur"}</div>
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

        syncMapDataRef.current(featureCollectionRef.current);
      });

      map.on("style.load", () => {
        applyDataLayersRef.current(map);
        syncMapDataRef.current(featureCollectionRef.current);
      });

      // R3: tangkap pesan asli error MapLibre (style/tile gagal) supaya kelihatan jujur.
      map.on("error", (event: any) => {
        const detail = event?.error?.message ? String(event.error.message) : "";
        setMapError(detail || "Basemap/style peta gagal dimuat.");
      });
    };

    buildMap();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      popupRef.current?.remove();
      popupRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapError(null);
    };
  }, [open]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Ganti basemap → reset error style lama, biar banner tidak nyangkut.
    setMapError(null);
    map.setStyle(buildRasterStyle(basemapMode) as any);
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
            Preview Data - {datasetName}
            {meta && (
              <Badge variant="outline" className="ml-1 font-mono text-[10px]">
                {code} - {meta.name}
              </Badge>
            )}
            {!loading && !error && features.length > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {totalFeatureCount > features.length
                  ? `${features.length} dari ${totalFeatureCount} fitur`
                  : `${features.length} fitur`}
                {dataSource ? ` · ${dataSource}` : ""}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Viewer ini menampilkan preview data transfer dalam bentuk peta, GeoJSON, dan diagnostics. Kalau peta 2D atau source lagi bermasalah, data mentahnya tetap bisa dicek dari tab lain.
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
                    Klik record untuk fokus ke item yang sama di panel peta.
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {features.length} item
                </Badge>
              </div>
            </div>

            {!features.length ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Belum ada item hasil transfer yang bisa ditampilkan.
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
                          Item {index + 1} - {feature.geometry?.type ?? "Geometry"}
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
                onClick={() => void load()}
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
                  Memuat preview data...
                </div>
              </div>
            )}

            {(error || mapError) && !loading && (
              <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl border border-amber-500/30 bg-[#120f0b]/95 p-4 text-sm text-amber-100 shadow-2xl backdrop-blur">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  <div className="space-y-3">
                    {error && <p>{error}</p>}
                    {mapError && (
                      <p className="text-amber-200/90">
                        Basemap/style peta gagal dimuat: {mapError}. Data mentahnya tetap bisa dicek dari tab GeoJSON atau Diagnostics.
                      </p>
                    )}
                    <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => void load()}>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Coba lagi
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="max-h-[64vh] overflow-y-auto border-l bg-muted/20 p-4">
            <Tabs defaultValue="detail" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="detail">Detail</TabsTrigger>
                  <TabsTrigger value="geojson">GeoJSON</TabsTrigger>
                  <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
                </TabsList>
                {!!features.length && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {features.length}
                  </Badge>
                )}
              </div>

              <TabsContent value="detail" className="mt-0">
                {selected ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="h-3 w-3 rounded" style={{ background: color }} />
                      {labelOf(selected.properties)}
                    </div>
                    <div className="mb-3 font-mono text-[11px] text-muted-foreground">
                      {selected.geometry?.type} - {selected.id}
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
                      Transfer ID: {transferId.slice(0, 12)}...
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="geojson" className="mt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Payload fitur yang berhasil dipreview dari adapter/source.</p>
                    <button
                      type="button"
                      onClick={() => {
                        const json = JSON.stringify(featureCollection, null, 2);
                        navigator.clipboard.writeText(json).then(() => {
                          toast.success("GeoJSON disalin ke clipboard");
                        }).catch(() => {
                          toast.error("Gagal menyalin GeoJSON");
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 h-8 text-[11px] font-medium rounded-md border border-slate-400 hover:bg-slate-800 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                  <pre className="max-h-[54vh] overflow-auto rounded-xl border bg-slate-950 p-3 text-[11px] text-slate-100">{JSON.stringify(featureCollection, null, 2)}</pre>
                </div>
              </TabsContent>

              <TabsContent value="diagnostics" className="mt-0">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Context request preview untuk bantu cek kenapa stream atau download tidak kebaca.</p>
                  <pre className="max-h-[54vh] overflow-auto rounded-xl border bg-slate-950 p-3 text-[11px] text-slate-100">{JSON.stringify({ transfer_id: transferId, endpoint_url: endpointUrl ?? null, adapter_url: adapterInfo?.url ?? null, domain_code: code, data_source: dataSource, transfer_mode: transferContext?.mode ?? null, feature_count: totalFeatureCount, rendered_features: features.length, render_cap: MAX_RENDER_FEATURES, error: error ?? null, map_error: mapError ?? null }, null, 2)}</pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}






