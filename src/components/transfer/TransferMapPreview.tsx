/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, AlertCircle, Maximize2, RefreshCw, CheckCircle2 } from "lucide-react";
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

const DOMAIN_META: Record<string, { name: string; color: string }> = {
  WK: { name: "Wilayah Kerja", color: "#f5a623" },
  FLD: { name: "Lapangan", color: "#34d399" },
  SEI: { name: "Survei Seismik", color: "#a78bfa" },
  WLL: { name: "Sumur", color: "#22d3ee" },
  FP: { name: "Fasilitas", color: "#f472b6" },
};

const FIELD_LABELS: Record<string, string> = {
  nama_wk: "Nama WK", status_wk: "Status", lokasi: "Lokasi", provinsi_1: "Provinsi",
  nama_sumur: "Nama Sumur", jenis_sumur: "Jenis", status_sumur: "Status",
  total_depth: "Total Depth (m)", kb_elevation: "KB Elevation (m)", operator: "Operator", uwi: "UWI",
  nama_lapangan: "Nama Lapangan", jenis_fluida: "Fluida", tahun_temuan: "Tahun Temuan",
  status_lapangan: "Status", field_id: "Field ID",
  nama_fasilitas: "Nama Fasilitas", jenis_fasilitas: "Jenis", status_fasilitas: "Status",
  kapasitas: "Kapasitas", satuan_kapasitas: "Satuan", facility_id: "Facility ID",
  nama_survei: "Nama Survei", dimensi: "Dimensi", metode: "Metode",
  tahun_akuisisi: "Tahun Akuisisi", survey_id: "Survey ID", sumber_navigasi: "Navigasi",
};

const labelOf = (p: any) =>
  p?.nama_wk || p?.nama_sumur || p?.nama_lapangan || p?.nama_fasilitas || p?.nama_survei || p?.uwi || "—";

const codeFromUrl = (url?: string): DomainCode | null => {
  if (!url) return null;
  const m = url.match(/\/collections\/([^/?]+)\/items/i);
  const c = m?.[1]?.toUpperCase();
  return c && DOMAIN_META[c] ? (c as DomainCode) : null;
};

const W = 900, H = 600, PAD = 48;

export function TransferMapPreview({
  open, onOpenChange, datasetName, endpointUrl, transferId,
}: TransferMapPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [vb, setVb] = useState({ x: 0, y: 0, w: W, h: H });
  const [tip, setTip] = useState<{ x: number; y: number; label: string } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const code = useMemo(() => codeFromUrl(endpointUrl), [endpointUrl]);
  const meta = code ? DOMAIN_META[code] : null;
  const color = meta?.color ?? "#38bdf8";

  const load = useCallback(() => {
    if (!code) { setError("Endpoint dataset bukan koleksi OGC adapter — tidak ada geometri untuk dipetakan."); return; }
    setLoading(true); setError(null); setSelected(null); setFeatures([]);
    adapterServiceApi.listItems(code, { limit: 500 })
      .then((res: any) => {
        const fs = Array.isArray(res?.features) ? res.features : [];
        setFeatures(fs);
        if (fs.length === 0) setError("Tidak ada fitur untuk ditampilkan.");
      })
      .catch((e: any) => setError(e?.message || "Gagal memuat data peta."))
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const projector = useMemo(() => {
    let lon0 = 180, lon1 = -180, lat0 = 90, lat1 = -90;
    const rec = (x: any) => {
      if (Array.isArray(x)) {
        if (typeof x[0] === "number") {
          lon0 = Math.min(lon0, x[0]); lon1 = Math.max(lon1, x[0]);
          lat0 = Math.min(lat0, x[1]); lat1 = Math.max(lat1, x[1]);
        } else x.forEach(rec);
      }
    };
    features.forEach((f) => f.geometry && rec(f.geometry.coordinates));
    if (lon0 > lon1) { lon0 = 0; lon1 = 1; lat0 = 0; lat1 = 1; }
    const spanLon = lon1 - lon0 || 0.01, spanLat = lat1 - lat0 || 0.01;
    const sc = Math.min((W - 2 * PAD) / spanLon, (H - 2 * PAD) / spanLat);
    const ox = (W - spanLon * sc) / 2, oy = (H - spanLat * sc) / 2;
    const proj = (lo: number, la: number): [number, number] => [ox + (lo - lon0) * sc, H - (oy + (la - lat0) * sc)];
    return { proj, lon0, lon1, lat0, lat1, spanLon, spanLat };
  }, [features]);

  const fitAll = useCallback(() => {
    const { proj, lon0, lon1, lat0, lat1 } = projector;
    const [ax, ay] = proj(lon0, lat0), [bx, by] = proj(lon1, lat1);
    let x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    const pw = (x1 - x0) * 0.16 + 30, ph = (y1 - y0) * 0.16 + 30;
    x0 -= pw; x1 += pw; y0 -= ph; y1 += ph;
    const ar = W / H; let w = x1 - x0, h = y1 - y0;
    if (w / h < ar) w = h * ar; else h = w / ar;
    setVb({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h });
  }, [projector]);

  useEffect(() => { if (features.length) fitAll(); }, [features, fitAll]);

  const grid = useMemo(() => {
    const { proj, lon0, lon1, lat0, lat1, spanLon, spanLat } = projector;
    const nice = (s: number) => {
      const raw = s / 4, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p;
      return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7 ? 5 : 10) * p;
    };
    const lines: any[] = [];
    const sLon = nice(spanLon), sLat = nice(spanLat);
    for (let lo = Math.ceil(lon0 / sLon) * sLon; lo <= lon1; lo += sLon) {
      const [x] = proj(lo, lat0);
      lines.push({ x1: x, y1: 0, x2: x, y2: H, lx: x + 3, ly: H - 8, t: lo.toFixed(1) + "°E" });
    }
    for (let la = Math.ceil(lat0 / sLat) * sLat; la <= lat1; la += sLat) {
      const [, y] = proj(lon0, la);
      lines.push({ x1: 0, y1: y, x2: W, y2: y, lx: 6, ly: y - 4, t: la.toFixed(1) + "°" });
    }
    return lines;
  }, [projector]);

  const ringPath = (ring: number[][]) =>
    ring.map((c, i) => { const [x, y] = projector.proj(c[0], c[1]); return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }).join(" ") + " Z";

  const centroidOf = (geom: any): [number, number] => {
    let a = 180, b = -180, d = 90, e = -90;
    const rec = (x: any) => {
      if (Array.isArray(x)) {
        if (typeof x[0] === "number") { a = Math.min(a, x[0]); b = Math.max(b, x[0]); d = Math.min(d, x[1]); e = Math.max(e, x[1]); }
        else x.forEach(rec);
      }
    };
    if (geom) rec(geom.coordinates);
    return projector.proj((a + b) / 2, (d + e) / 2);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current; if (!svg) return;
    const r = svg.getBoundingClientRect();
    const mx = vb.x + ((e.clientX - r.left) / r.width) * vb.w;
    const my = vb.y + ((e.clientY - r.top) / r.height) * vb.h;
    const k = e.deltaY < 0 ? 0.85 : 1.18;
    const nw = Math.min(W * 2.5, Math.max(30, vb.w * k)), nh = nw * (vb.h / vb.w);
    setVb({ x: mx - (mx - vb.x) * (nw / vb.w), y: my - (my - vb.y) * (nh / vb.h), w: nw, h: nh });
  };
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const svg = svgRef.current; if (!svg) return;
    const r = svg.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.x) / r.width) * vb.w;
    const dy = ((e.clientY - drag.current.y) / r.height) * vb.h;
    setVb((v) => ({ ...v, x: drag.current!.vx - dx, y: drag.current!.vy - dy }));
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[940px] max-h-[92vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4" style={{ color }} />
            Preview Peta — {datasetName}
            {meta && <Badge variant="outline" className="ml-1 font-mono text-[10px]">{code} · {meta.name}</Badge>}
            {!loading && !error && features.length > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> {features.length} fitur
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_280px] gap-0">
          {/* MAP */}
          <div className="relative bg-[#070b16] min-h-[380px]">
            {loading && (
              <div className="absolute inset-0 grid place-items-center z-10 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 grid place-items-center z-10 text-slate-400 text-sm px-6 text-center">
                <div>
                  <AlertCircle className="w-7 h-7 mx-auto mb-2 text-amber-500" />
                  {error}
                  {code && (
                    <div className="mt-3">
                      <Button size="sm" variant="secondary" className="h-7 text-xs gap-1 bg-slate-800 text-slate-200 hover:text-white" onClick={load}>
                        <RefreshCw className="w-3 h-3" /> Coba lagi
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <svg
              ref={svgRef}
              viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-[clamp(380px,58vh,560px)] touch-none select-none cursor-grab active:cursor-grabbing"
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              {grid.map((g, i) => (
                <g key={"g" + i}>
                  <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="rgba(56,189,248,.08)" strokeWidth={1} />
                  <text x={g.lx} y={g.ly} fill="#3b4a6b" fontSize={10} fontFamily="monospace">{g.t}</text>
                </g>
              ))}
              {features.map((f, i) => {
                const g = f.geometry; if (!g) return null;
                const common = {
                  style: { cursor: "pointer" as const },
                  onMouseEnter: (e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, label: labelOf(f.properties) }),
                  onMouseMove: (e: React.MouseEvent) => setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t)),
                  onMouseLeave: () => setTip(null),
                  onClick: () => setSelected(f),
                };
                if (g.type === "Polygon" || g.type === "MultiPolygon") {
                  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
                  const d = polys.map((p: any) => p.map(ringPath).join(" ")).join(" ");
                  const [lx, ly] = centroidOf(g);
                  return (
                    <g key={i}>
                      <path d={d} fill={color + "22"} stroke={color}
                        strokeWidth={code === "WK" ? 2.2 : 1.6}
                        strokeDasharray={code === "SEI" ? "5 4" : undefined} {...common} />
                      <text x={lx} y={ly} textAnchor="middle" fontSize={11} fontWeight={600}
                        fill="#e6edf7" paintOrder="stroke" stroke="#070b16" strokeWidth={3}
                        style={{ pointerEvents: "none" }}>{labelOf(f.properties)}</text>
                    </g>
                  );
                }
                if (g.type === "LineString") {
                  const d = g.coordinates.map((c: number[], j: number) => {
                    const [x, y] = projector.proj(c[0], c[1]); return (j ? "L" : "M") + x + " " + y;
                  }).join(" ");
                  return <path key={i} d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" {...common} />;
                }
                if (g.type === "Point") {
                  const [x, y] = projector.proj(g.coordinates[0], g.coordinates[1]);
                  return <circle key={i} cx={x} cy={y} r={6} fill={color} stroke="#070b16" strokeWidth={2} {...common} />;
                }
                return null;
              })}
              {selected?.geometry && (() => {
                const [cx, cy] = selected.geometry.type === "Point"
                  ? projector.proj(selected.geometry.coordinates[0], selected.geometry.coordinates[1])
                  : centroidOf(selected.geometry);
                return (
                  <circle cx={cx} cy={cy} r={16} fill="none" stroke={color} strokeWidth={2} opacity={0.9}>
                    <animate attributeName="r" values="13;21;13" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                );
              })()}
            </svg>

            <div className="absolute top-3 left-3 flex gap-1.5">
              <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs gap-1 bg-slate-900/80 border border-slate-700 text-slate-200 hover:text-white" onClick={fitAll}>
                <Maximize2 className="w-3 h-3" /> Fit
              </Button>
            </div>
            <div className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-600">scroll = zoom · drag = geser</div>
          </div>

          {/* SIDE PANEL */}
          <div className="border-l bg-muted/20 p-4 overflow-y-auto max-h-[58vh]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Detail Fitur</span>
              {!!features.length && <Badge variant="outline" className="font-mono text-[10px]">{features.length}</Badge>}
            </div>
            {selected ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <span className="w-3 h-3 rounded" style={{ background: color }} />
                  {labelOf(selected.properties)}
                </div>
                <div className="text-[11px] font-mono text-muted-foreground mb-3">
                  {selected.geometry?.type} · {selected.id}
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
                  {Object.entries(selected.properties ?? {})
                    .filter(([k, v]) => v !== "" && v != null && k !== "wk_id" && k !== "gx_metadata")
                    .map(([k, v]) => (
                      <div key={k} className="contents">
                        <div className="text-muted-foreground font-mono text-[11px]">{FIELD_LABELS[k] || k}</div>
                        <div className="text-right break-words">{String(v)}</div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-[12.5px] text-muted-foreground leading-relaxed space-y-3">
                <p>Klik fitur di peta untuk melihat atribut lengkapnya. Scroll untuk zoom, drag untuk geser.</p>
                <p className="text-[11px] font-mono text-muted-foreground/70">
                  Transfer ID: {transferId.slice(0, 12)}…
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {tip && (
        <div
          className="fixed z-[60] pointer-events-none rounded-lg border border-cyan-500/30 bg-[#090f1e]/95 px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: tip.x + 14, top: tip.y + 14 }}
        >
          <span className="font-semibold" style={{ color }}>{tip.label}</span>
        </div>
      )}
    </Dialog>
  );
}
