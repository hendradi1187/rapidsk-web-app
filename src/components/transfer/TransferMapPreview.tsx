import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle, CheckCircle2, Loader2, MapPin, RefreshCw, Wifi, WifiOff, ExternalLink,
} from "lucide-react";

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

type ConnStatus = "idle" | "checking" | "ok" | "error";

declare global {
  interface Window { L: any }
}

const loadLeaflet = (): Promise<void> =>
  new Promise((resolve) => {
    if (window.L) return resolve();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve();
    document.body.appendChild(script);
  });

export function TransferMapPreview({
  open,
  onOpenChange,
  datasetName,
  endpointUrl,
  adapterInfo,
  transferId,
}: TransferMapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "empty" | "error">("idle");
  const [featureCount, setFeatureCount] = useState(0);
  const [geoType, setGeoType] = useState("");
  const [adapterStatus, setAdapterStatus] = useState<ConnStatus>("idle");
  const [adapterMsg, setAdapterMsg] = useState("");
  const [endpointStatus, setEndpointStatus] = useState<ConnStatus>("idle");

  const viaAdapter = !!adapterInfo;

  const checkEndpoint = async (url: string, target: "adapter" | "endpoint") => {
    const setter = target === "adapter" ? setAdapterStatus : setEndpointStatus;
    const msgSetter = target === "adapter" ? setAdapterMsg : () => {};
    setter("checking");
    try {
      const res = await fetch(url, { method: "HEAD", mode: "no-cors" });
      setter("ok");
      if (target === "adapter") msgSetter(`Reachable`);
    } catch {
      setter("error");
      if (target === "adapter") msgSetter("Unreachable — adapter mungkin mati atau CORS block");
    }
  };

  const loadMap = async () => {
    if (!endpointUrl || !mapRef.current) return;
    setGeoStatus("loading");
    try {
      await loadLeaflet();
      const L = window.L;

      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      const map = L.map(mapRef.current, { zoomControl: true });
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      // Fetch GeoJSON dari endpoint
      const ogcUrl = endpointUrl.replace(/\/?$/, "") + "/items?limit=200&f=json";
      const res = await fetch(ogcUrl);
      const geojson = await res.json();

      const features = geojson.features ?? [];
      if (features.length === 0) {
        map.setView([-2.5, 117.5], 5);
        setGeoStatus("empty");
        return;
      }

      setFeatureCount(features.length);
      setGeoType(features[0]?.geometry?.type ?? "");

      const layer = L.geoJSON(geojson, {
        style: () => ({ color: "#f59e0b", weight: 2, fillOpacity: 0.3 }),
        pointToLayer: (_: any, latlng: any) =>
          L.circleMarker(latlng, {
            radius: 6,
            fillColor: "#f59e0b",
            color: "#92400e",
            weight: 1,
            fillOpacity: 0.8,
          }),
        onEachFeature: (feature: any, lyr: any) => {
          if (feature.properties) {
            const props = Object.entries(feature.properties)
              .slice(0, 6)
              .map(([k, v]) => `<tr><td class="pr-2 text-slate-500 text-xs">${k}</td><td class="text-xs font-mono">${v}</td></tr>`)
              .join("");
            lyr.bindPopup(`<table>${props}</table>`);
          }
        },
      }).addTo(map);

      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      setGeoStatus("ok");
    } catch {
      setGeoStatus("error");
    }
  };

  useEffect(() => {
    if (!open) {
      mapInstance.current?.remove();
      mapInstance.current = null;
      setGeoStatus("idle");
      setAdapterStatus("idle");
      setEndpointStatus("idle");
      return;
    }
    loadMap();
    if (viaAdapter && adapterInfo?.url) checkEndpoint(adapterInfo.url, "adapter");
    if (endpointUrl) checkEndpoint(endpointUrl, "endpoint");
  }, [open]);

  const StatusIcon = ({ s }: { s: ConnStatus }) => {
    if (s === "checking") return <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />;
    if (s === "ok") return <Wifi className="w-3.5 h-3.5 text-emerald-500" />;
    if (s === "error") return <WifiOff className="w-3.5 h-3.5 text-rose-500" />;
    return <Wifi className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-amber-500" />
            Preview Data — {datasetName}
          </DialogTitle>
        </DialogHeader>

        {/* Connection status bar */}
        <div className="px-5 py-2.5 bg-muted/40 border-b flex flex-wrap gap-4 text-xs">
          {/* Endpoint check */}
          <div className="flex items-center gap-1.5">
            <StatusIcon s={endpointStatus} />
            <span className="text-muted-foreground">Endpoint sumber data</span>
            {endpointUrl && (
              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded max-w-[200px] truncate">
                {endpointUrl}
              </code>
            )}
          </div>

          {/* Adapter check */}
          {viaAdapter && (
            <div className="flex items-center gap-1.5">
              <StatusIcon s={adapterStatus} />
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                Via Adapter · {adapterInfo?.type ?? "GIS_STUDIO"}
              </Badge>
              {adapterStatus === "error" && (
                <span className="text-rose-500 text-[10px]">{adapterMsg}</span>
              )}
              {adapterStatus === "ok" && (
                <span className="text-emerald-600 text-[10px]">Adapter online</span>
              )}
            </div>
          )}

          {!viaAdapter && endpointStatus === "idle" && (
            <span className="text-muted-foreground text-[10px]">Source: Direct endpoint (tidak via adapter)</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={loadMap}>
              <RefreshCw className="w-3 h-3 mr-1" /> Reload
            </Button>
            {endpointUrl && (
              <a href={endpointUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" /> Buka API
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Map area */}
        <div className="flex-1 relative min-h-0" style={{ height: "420px" }}>
          <div ref={mapRef} className="w-full h-full" />

          {/* Overlay states */}
          {geoStatus === "loading" && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2 z-[500]">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">Memuat data GeoJSON dari endpoint…</p>
            </div>
          )}
          {geoStatus === "error" && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2 z-[500]">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <p className="text-sm font-medium">Gagal memuat data</p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Endpoint tidak merespons atau bukan format GeoJSON.<br />
                {viaAdapter && adapterStatus === "error" && "Adapter tidak dapat dijangkau."}
              </p>
              <Button size="sm" variant="outline" onClick={loadMap}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Coba Lagi
              </Button>
            </div>
          )}
          {geoStatus === "empty" && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2 z-[500]">
              <MapPin className="w-8 h-8 text-slate-400" />
              <p className="text-sm text-muted-foreground">Endpoint reachable tapi tidak ada feature GeoJSON</p>
            </div>
          )}
        </div>

        {/* Footer stats */}
        {geoStatus === "ok" && (
          <div className="px-5 py-2.5 border-t bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {featureCount} features dimuat
            </span>
            {geoType && <span>Geometry: <code className="bg-muted px-1 rounded">{geoType}</code></span>}
            <span className="ml-auto text-[10px]">Transfer ID: <code className="bg-muted px-1 rounded">{transferId.slice(0, 12)}…</code></span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
