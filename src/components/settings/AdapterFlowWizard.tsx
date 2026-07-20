import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  ScanSearch,
  Trash2,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  adapterServiceApi,
  type AdapterAuthType,
  type AdapterClassification,
  type AdapterDomainCode,
  type AdapterIngestionTask,
  type AdapterProvider,
} from "@/api/services/adapter-service";
import { getApiErrorMessage } from "@/lib/api-error";
import { getServiceToken } from "@/lib/service-tokens";
import {
  computeAdapterStepStatuses,
  nextStepLabel,
  type AdapterStepStatus,
  type AdapterStepStatuses,
} from "@/lib/adapter-step-status";

export interface AdapterWizardDomainOption {
  value: string;
  label: string;
  domainCode: AdapterDomainCode | "";
  domainName: string;
}

/** Bagian stepper yang dirender: dipakai layout tab di halaman Adapter Data.
 *  "source-layer" = langkah ①②, "ingest" = langkah ③ + riwayat task, "all" = keduanya
 *  (kompat perilaku lama). SEMUA state/logika tetap di komponen ini apa pun sectionnya. */
export type AdapterWizardSection = "source-layer" | "ingest" | "all";

/** Ringkasan status wizard untuk badge tab + context strip di halaman induk. */
export interface AdapterWizardState {
  statuses: AdapterStepStatuses;
  selectedDomainLabel: string | null;
  effectiveDomainCode: string;
  adapterReady: boolean;
}

interface Props {
  participantId?: string | null;
  adapterEndpoint?: string;
  domainOptions: AdapterWizardDomainOption[];
  /** Section yang dirender (default "all" untuk kompatibilitas). */
  activeSection?: AdapterWizardSection;
  /** Callback status wizard untuk badge tab/context strip di halaman induk. */
  onStateChange?: (state: AdapterWizardState) => void;
}

// Bantuan klasifikasi: 5 kategori baku SKK + deskripsi isinya, supaya operator tahu
// layer (mis. "IUPHHKHA", "Wilayah Kerja Migas") sebaiknya masuk kategori mana.
const CATEGORY_META: Array<{ code: AdapterDomainCode; name: string; desc: string }> = [
  { code: "WK", name: "Wilayah Kerja", desc: "Batas area/blok kontrak kerja migas (PSC area)" },
  { code: "FLD", name: "Lapangan", desc: "Batas lapangan produksi migas" },
  { code: "SEI", name: "Survei Seismik", desc: "Lintasan/area akuisisi survei seismik" },
  { code: "WLL", name: "Sumur", desc: "Titik lokasi sumur (well)" },
  { code: "FP", name: "Fasilitas", desc: "Titik/area fasilitas produksi (platform, kilang, dsb)" },
];

// Saran kategori dari NAMA layer (heuristik kata kunci). Bukan penentu — cuma bantu tebak;
// nama yang tak dikenal (mis. IUPHHKHA, "Izin Lokasi Sawit") sengaja balik null biar jujur.
const suggestCategoryFromText = (text: string): AdapterDomainCode | null => {
  const t = text.toLowerCase();
  if (/wilayah kerja|\bwk\b|\bpsc\b|\bblok\b|\bblock\b/.test(t)) return "WK";
  if (/sumur|\bwell\b|\buwi\b|borehole/.test(t)) return "WLL";
  if (/seismik|seismic|lintasan|survei|survey/.test(t)) return "SEI";
  if (/lapangan|\bfield\b/.test(t)) return "FLD";
  if (/fasilitas|facility|platform|kilang|refinery|pipa|pipeline|terminal/.test(t)) return "FP";
  return null;
};

interface LayerOption {
  value: string;
  label: string;
  // Nama koleksi bersih (tanpa hiasan " — geometry"). Dikirim sebagai layer_name ke BE;
  // `label` hanya untuk ditampilkan. Mencampur keduanya mencemari nama koleksi ArcGIS.
  title: string;
  raw: unknown;
  // Hanya layer yang punya geometri (Feature Layer) bisa di-ingest. Group Layer /
  // Table (geometry_type null) ditandai tidak ingestible berdasarkan respons BE `/layers`.
  ingestible?: boolean;
}

const CLASSIFICATION_OPTIONS: AdapterClassification[] = ["L0", "L1", "L2", "L3", "L4"];

// Klasifikasi default per kategori (mengikuti pola DEFAULT_CLASS di PublishDatasetDialog):
// WK→L1, FLD/FP→L2, WLL/SEI→L3. User tetap bisa menaikkan bila datanya lebih sensitif.
const DEFAULT_CLASS_BY_CODE: Record<string, AdapterClassification> = {
  WK: "L1",
  FLD: "L2",
  FP: "L2",
  WLL: "L3",
  SEI: "L3",
};

// Status task ingestion adapter. Terminal = tidak akan berubah lagi; success = lolos validasi.
const SUCCESS_TASK_STATUSES = ["SUCCESS", "SUCCEEDED", "COMPLETED", "DONE", "VALIDATED"];
const TERMINAL_TASK_STATUSES = [...SUCCESS_TASK_STATUSES, "FAILED", "ERROR", "CANCELLED", "CANCELED"];
const isTerminalTaskStatus = (status?: string) =>
  TERMINAL_TASK_STATUSES.includes(String(status ?? "").toUpperCase());
const isSuccessTaskStatus = (status?: string) =>
  SUCCESS_TASK_STATUSES.includes(String(status ?? "").toUpperCase());
const isFailedTaskStatus = (status?: string) =>
  ["FAILED", "ERROR", "CANCELLED", "CANCELED"].includes(String(status ?? "").toUpperCase());

const CATEGORY_LABEL: Record<string, string> = {
  WK: "WK — Wilayah Kerja",
  FLD: "FLD — Lapangan",
  SEI: "SEI — Survei Seismik",
  WLL: "WLL — Sumur",
  FP: "FP — Fasilitas",
};

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const parseJsonObject = (value: string, label: string) => {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} harus berupa object JSON.`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : `${label} belum valid.`);
  }
};

const parseLayerOptions = (payload: unknown): LayerOption[] => {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { items?: unknown[] })?.items)
      ? (payload as { items?: unknown[] }).items ?? []
      : Array.isArray((payload as { layers?: unknown[] })?.layers)
        ? (payload as { layers?: unknown[] }).layers ?? []
        : Array.isArray((payload as { data?: unknown[] })?.data)
          ? (payload as { data?: unknown[] }).data ?? []
          : [];

  return items
    .map((item, index) => {
      if (typeof item === "string") {
        return { value: item, label: item, title: item, raw: item };
      }
      const layer = (item ?? {}) as Record<string, unknown>;

      const value = String(
        layer?.name ??
        layer?.layer_name ??
        layer?.id ??
        layer?.layer_id ??
        layer?.identifier ??
        index,
      ).trim();

      const label = String(
        layer?.title ??
        layer?.name ??
        layer?.layer_name ??
        layer?.label ??
        layer?.id ??
        layer?.layer_id ??
        value,
      ).trim();

      if (!value) return null;
      return { value, label, title: label, raw: layer };
    })
    .filter(Boolean) as LayerOption[];
};

const resolveGeoServerLayerName = (layer: LayerOption | null) => {
  const raw = (layer?.raw ?? {}) as Record<string, unknown>;
  return String(raw.name ?? raw.layer_name ?? layer?.value ?? "").trim();
};

const resolveArcGisLayerId = (layer: LayerOption | null) => {
  const raw = (layer?.raw ?? {}) as Record<string, unknown>;
  const rawId = raw.id ?? raw.layer_id ?? layer?.value;
  const layerId = Number(rawId);
  return Number.isInteger(layerId) && layerId >= 0 ? layerId : null;
};

const prettyJson = (payload: unknown) =>
  payload ? JSON.stringify(payload, null, 2) : "Belum ada proses dijalankan.";

const formatTaskTime = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Penanda tiap isian: WAJIB / OTOMATIS / OPSIONAL ────────────────────────
function Req({ kind, label }: { kind: "must" | "auto" | "opt"; label?: string }) {
  const text = label ?? (kind === "must" ? "WAJIB" : kind === "auto" ? "OTOMATIS" : "OPSIONAL");
  const cls =
    kind === "must"
      ? "bg-sky-700 text-white"
      : kind === "auto"
        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border border-slate-200 bg-slate-100 text-slate-500";
  return (
    <span className={`ml-1.5 inline-block rounded px-1.5 py-[1px] align-middle text-[9.5px] font-extrabold tracking-wide ${cls}`}>
      {text}
    </span>
  );
}

// ── Rail + dot langkah ─────────────────────────────────────────────────────
function StepRail({ n, status, children }: { n: number; status: AdapterStepStatus; children: React.ReactNode }) {
  const dotCls =
    status === "done"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "next"
        ? "border-sky-500 bg-sky-50 text-sky-700"
        : "border-slate-200 bg-white text-slate-400";
  return (
    <div className="relative pl-[52px]">
      <div className={`absolute left-0 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold ${dotCls}`}>
        {status === "done" ? "✓" : n}
      </div>
      {children}
    </div>
  );
}

function StepStatusPill({ status }: { status: AdapterStepStatus }) {
  if (status === "done") {
    return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">✓ Selesai</span>;
  }
  if (status === "next") {
    return <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">● Langkah berikutnya</span>;
  }
  return <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">○ Belum</span>;
}

function StepCard({
  n,
  status,
  title,
  hint,
  summary,
  showStatusPill = true,
  children,
}: {
  n: number;
  status: AdapterStepStatus;
  title: React.ReactNode;
  hint?: React.ReactNode;
  summary?: React.ReactNode;
  showStatusPill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <StepRail n={n} status={status}>
      <div className={`rounded-2xl border bg-white shadow-sm ${status === "next" ? "border-sky-200 ring-2 ring-sky-100" : "border-slate-200"}`}>
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
            {summary ? <p className="mt-0.5 text-[12.5px] text-slate-500">{summary}</p> : null}
            {hint ? <p className="mt-0.5 text-[12.5px] text-slate-500">{hint}</p> : null}
          </div>
          {showStatusPill ? <StepStatusPill status={status} /> : null}
        </div>
        <div className="border-t border-slate-200 px-4 py-4">{children}</div>
      </div>
    </StepRail>
  );
}

export function AdapterFlowWizard({
  participantId,
  adapterEndpoint,
  domainOptions,
  activeSection = "all",
  onStateChange,
}: Props) {
  const showSourceLayer = activeSection === "source-layer" || activeSection === "all";
  const showIngest = activeSection === "ingest" || activeSection === "all";
  const [selectedDomainValue, setSelectedDomainValue] = useState("");
  const [activeMode, setActiveMode] = useState<"remote" | "geojson" | "shapefile">("remote");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [selectedLayerValue, setSelectedLayerValue] = useState("");
  const [layerOptions, setLayerOptions] = useState<LayerOption[]>([]);
  const [busyAction, setBusyAction] = useState("");
  const [outputTitle, setOutputTitle] = useState("Belum ada proses dijalankan");
  const [outputPayload, setOutputPayload] = useState<unknown>(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [remoteForm, setRemoteForm] = useState({
    name: "",
    provider: "geoserver" as AdapterProvider,
    authType: "basic" as AdapterAuthType,
    baseUrl: "",
    username: "",
    password: "",
    apiKey: "",
    bearerToken: "",
    advancedCredentialJson: '{\n  "client_id": "",\n  "client_secret": ""\n}',
  });
  const [remoteQuery, setRemoteQuery] = useState({
    cqlFilter: "",
    srsName: "EPSG:4326",
    where: "1=1",
    outFields: "*",
    returnGeometry: true,
    outSr: "4326",
  });
  const [geojsonText, setGeojsonText] = useState('{\n  "type": "FeatureCollection",\n  "features": []\n}');
  const [fieldMapText, setFieldMapText] = useState('{\n  "well_name": "WELL_NAME"\n}');
  const [classification, setClassification] = useState<AdapterClassification>("L2");
  const [classificationTouched, setClassificationTouched] = useState(false);
  const [shapefileFile, setShapefileFile] = useState<File | null>(null);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [testingRemoteSource, setTestingRemoteSource] = useState(false);

  const adapterReady = Boolean(adapterEndpoint?.trim());

  useEffect(() => {
    if (!domainOptions.length) {
      setSelectedDomainValue("");
      return;
    }

    if (!selectedDomainValue || !domainOptions.some((item) => item.value === selectedDomainValue)) {
      setSelectedDomainValue(domainOptions[0].value);
    }
  }, [domainOptions, selectedDomainValue]);

  const selectedDomain = useMemo(
    () => domainOptions.find((item) => item.value === selectedDomainValue) ?? null,
    [domainOptions, selectedDomainValue],
  );

  // Adapter bekerja per KATEGORI data (WK/FLD/SEI/WLL/FP), bukan per domain governance.
  // Binding participant↔domain sering tidak membawa `code`, dan kode domain governance
  // (mis. MIGAS_GEOROTAN) bukan kode kategori — jadi domainCode bisa kosong walau domain
  // sudah ada. Sediakan pilihan kategori manual sebagai fallback agar ingest tetap jalan.
  const [manualCatalogCode, setManualCatalogCode] = useState<AdapterDomainCode | "">("");
  // A11: kategori manual tidak boleh nyangkut saat pindah domain — reset saat domain berubah.
  useEffect(() => {
    setManualCatalogCode("");
  }, [selectedDomainValue]);
  const effectiveDomainCode: AdapterDomainCode | "" = (selectedDomain?.domainCode || manualCatalogCode) as AdapterDomainCode | "";

  // Klasifikasi default mengikuti kategori aktif selama user belum mengubahnya sendiri.
  useEffect(() => {
    if (classificationTouched) return;
    if (!effectiveDomainCode) return;
    setClassification(DEFAULT_CLASS_BY_CODE[effectiveDomainCode] ?? "L2");
  }, [effectiveDomainCode, classificationTouched]);

  const {
    data: connections = [],
    isLoading: loadingConnections,
    refetch: refetchConnections,
  } = useQuery({
    queryKey: ["adapter-service", "connections", adapterEndpoint],
    queryFn: () => adapterServiceApi.listConnections(),
    enabled: adapterReady,
  });

  const {
    data: tasks = [],
    isLoading: loadingTasks,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["adapter-service", "tasks", adapterEndpoint],
    queryFn: () => adapterServiceApi.listTasks(),
    enabled: adapterReady,
    // A13: hanya polling saat masih ada task non-terminal; kalau semua sudah selesai, stop.
    refetchInterval: (query) => {
      const data = (query.state.data ?? []) as AdapterIngestionTask[];
      return data.some((task) => !isTerminalTaskStatus(task.status)) ? 15000 : false;
    },
  });

  const selectedConnection = useMemo(
    () => connections.find((item) => item.id === selectedConnectionId) ?? null,
    [connections, selectedConnectionId],
  );

  // Hydrate form dari koneksi tersimpan saat dipilih / setelah reload. Sebelumnya
  // base_url/provider/auth tidak pernah dikembalikan ke input, jadi terlihat "hilang"
  // saat reload walau koneksi tersimpan di backend. Credential sengaja TIDAK diisi
  // ulang (backend tidak mengembalikan secret) — biarkan kosong, isi lagi bila diubah.
  // remoteQuery (filter/path) tidak ikut tersimpan di koneksi backend, jadi kita
  // simpan/pulihkan per-koneksi lewat localStorage agar tak hilang saat reload.
  // A1: ganti koneksi (mis. ArcGIS → GeoServer) WAJIB reset layer terpilih. Layer basi
  // dari koneksi lama akan masuk ke branch provider yang salah dan bikin task pasti FAILED.
  useEffect(() => {
    setLayerOptions([]);
    setSelectedLayerValue("");
  }, [selectedConnectionId]);

  useEffect(() => {
    if (!selectedConnection) return;
    setRemoteForm((prev) => ({
      ...prev,
      name: selectedConnection.name ?? prev.name,
      provider: (selectedConnection.provider as AdapterProvider) ?? prev.provider,
      authType: (selectedConnection.auth_type as AdapterAuthType) ?? prev.authType,
      baseUrl: selectedConnection.base_url ?? prev.baseUrl,
    }));
    try {
      const raw = localStorage.getItem(`adapter_remote_query::${selectedConnection.id}`);
      if (raw) setRemoteQuery((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      // abaikan localStorage rusak
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnectionId]);

  // Persist remoteQuery per-koneksi (FE-only) supaya konfigurasi filter/path bertahan reload.
  useEffect(() => {
    if (!selectedConnectionId) return;
    try {
      localStorage.setItem(`adapter_remote_query::${selectedConnectionId}`, JSON.stringify(remoteQuery));
    } catch {
      // abaikan quota/serialisasi gagal
    }
  }, [remoteQuery, selectedConnectionId]);

  const selectedLayer = useMemo(
    () => layerOptions.find((item) => item.value === selectedLayerValue) ?? null,
    [layerOptions, selectedLayerValue],
  );

  useEffect(() => {
    if (connections.length === 1) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections]);

  useEffect(() => {
    if (!activeTaskId && tasks[0]?.id) {
      setActiveTaskId(String(tasks[0].id));
    }
  }, [activeTaskId, tasks]);

  const activeTask = useMemo(
    () => tasks.find((task) => String(task.id) === activeTaskId) ?? null,
    [activeTaskId, tasks],
  );

  // A6: cegah double-submit — task aktif masih berjalan (belum terminal).
  const activeTaskRunning = !!activeTask && !isTerminalTaskStatus(activeTask.status);

  const applyOutput = (title: string, payload: unknown) => {
    setOutputTitle(title);
    setOutputPayload(payload);
  };

  const runAction = async (label: string, runner: () => Promise<unknown>) => {
    try {
      setBusyAction(label);
      const payload = await runner();
      applyOutput(label, payload);
      return payload;
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, `${label} gagal dijalankan.`);
      applyOutput(label, { message });
      toast.error(message);
      throw error;
    } finally {
      setBusyAction("");
    }
  };

  const saveConnection = async (mode: "create" | "update") => {
    if (!adapterReady) {
      toast.error("Adapter endpoint belum diisi di deployment config.");
      return;
    }
    if (!remoteForm.name.trim()) {
      toast.error("Nama koneksi wajib diisi.");
      return;
    }
    if (!remoteForm.baseUrl.trim()) {
      toast.error("Base URL wajib diisi.");
      return;
    }
    if (!isValidHttpUrl(remoteForm.baseUrl.trim())) {
      toast.error("Base URL harus berupa URL http/https yang valid.");
      return;
    }
    const normalizedBase = remoteForm.baseUrl.trim().replace(/\/+$/, "").toLowerCase();
    if (normalizedBase === "string" || normalizedBase.includes("://string")) {
      toast.error("Base URL masih placeholder ('string'). Isi alamat source yang sebenarnya.");
      return;
    }
    if (adapterEndpoint && normalizedBase === adapterEndpoint.trim().replace(/\/+$/, "").toLowerCase()) {
      toast.error("Base URL menunjuk ke adapter itu sendiri. Isi alamat GeoServer/ArcGIS sumber data, bukan endpoint adapter.");
      return;
    }
    if (remoteForm.provider === "arcgis" && !/(feature|map)server/i.test(normalizedBase)) {
      toast.warning("Base URL ArcGIS biasanya berakhiran /FeatureServer atau /MapServer. Pastikan ini endpoint REST yang benar.");
    }
    if (remoteForm.provider === "geoserver" && !/(geoserver|\/wfs|\/ows|\/wms)/i.test(normalizedBase)) {
      toast.warning("Base URL GeoServer biasanya memuat /geoserver atau /wfs. Pastikan ini endpoint yang benar.");
    }

    let credential: Record<string, unknown>;
    try {
      if (remoteForm.authType === "none") {
        credential = {};
      } else if (remoteForm.authType === "basic") {
        if (!remoteForm.username.trim() || !remoteForm.password.trim()) {
          toast.error("Username dan password wajib diisi untuk basic auth.");
          return;
        }
        credential = { username: remoteForm.username.trim(), password: remoteForm.password.trim() };
      } else if (remoteForm.authType === "api_key") {
        if (!remoteForm.apiKey.trim()) {
          toast.error("API key wajib diisi.");
          return;
        }
        credential = { api_key: remoteForm.apiKey.trim() };
      } else if (remoteForm.authType === "bearer") {
        if (!remoteForm.bearerToken.trim()) {
          toast.error("Bearer token wajib diisi.");
          return;
        }
        credential = { token: remoteForm.bearerToken.trim() };
      } else {
        credential = parseJsonObject(remoteForm.advancedCredentialJson, "Credential lanjutan");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Credential remote source belum valid."));
      return;
    }

    const payload = {
      name: remoteForm.name.trim(),
      provider: remoteForm.provider,
      auth_type: remoteForm.authType,
      base_url: remoteForm.baseUrl.trim(),
      credential,
    };

    const result =
      mode === "create"
        ? await runAction("Simpan remote source", () => adapterServiceApi.createConnection(payload))
        : await runAction("Perbarui remote source", () => {
            if (!selectedConnectionId) throw new Error("Pilih koneksi yang mau diperbarui.");
            return adapterServiceApi.updateConnection(selectedConnectionId, payload);
          });

    await refetchConnections();
    const nextId = String((result as { id?: string })?.id ?? selectedConnectionId);
    if (nextId) setSelectedConnectionId(nextId);
    setShowConnectionForm(false);
    toast.success(mode === "create" ? "Remote source tersimpan." : "Remote source diperbarui.");
  };

  // A2: hapus koneksi remote source terpilih (konvensi REST adapter). Bila endpoint hapus
  // belum ada di runtime (404/405), tampilkan pesan jelas alih-alih error mentah.
  const deleteSelectedConnection = async () => {
    if (!selectedConnectionId) {
      toast.error("Pilih koneksi yang mau dihapus dulu.");
      return;
    }
    const target = selectedConnection?.name || selectedConnectionId;
    if (typeof window !== "undefined" && !confirm(`Hapus koneksi "${target}"? Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }
    try {
      setBusyAction("Hapus remote source");
      await adapterServiceApi.deleteConnection(selectedConnectionId);
      applyOutput("Hapus remote source", { message: "Koneksi dihapus." });
      setSelectedConnectionId("");
      setLayerOptions([]);
      setSelectedLayerValue("");
      await refetchConnections();
      toast.success("Koneksi dihapus.");
    } catch (error: unknown) {
      const raw = getApiErrorMessage(error, "Gagal menghapus koneksi.");
      const message = /\b(404|405)\b/.test(raw)
        ? "Endpoint hapus koneksi belum tersedia di adapter (404/405). Hapus koneksi ini langsung di sisi adapter."
        : raw;
      applyOutput("Hapus remote source", { message });
      toast.error(message);
    } finally {
      setBusyAction("");
    }
  };

  const checkRemoteSource = async () => {
    if (!remoteForm.baseUrl.trim()) {
      toast.error("Base URL wajib diisi dulu.");
      return;
    }
    if (!isValidHttpUrl(remoteForm.baseUrl.trim())) {
      toast.error("Base URL harus berupa URL http/https yang valid.");
      return;
    }

    try {
      setTestingRemoteSource(true);
      // A9: samakan jalur token dengan service adapter lain (getServiceToken("ALL")),
      // bukan baca localStorage.auth_token langsung.
      let token: string | null = null;
      try {
        token = await getServiceToken("ALL");
      } catch {
        token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      }
      const response = await fetch("/adapter-runtime/check-source", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ baseUrl: remoteForm.baseUrl.trim() }),
      });
      const payload = await response.json();
      applyOutput("Cek alamat sumber", payload);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Alamat sumber belum merespons.");
      }
      toast.success(payload?.message || "Alamat sumber merespons.");
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Alamat sumber belum bisa dijangkau.");
      toast.error(message);
      applyOutput("Cek alamat sumber", { message });
    } finally {
      setTestingRemoteSource(false);
    }
  };

  const loadLayers = async () => {
    if (!selectedConnectionId || !selectedConnection) {
      toast.error("Pilih remote source dulu.");
      return;
    }

    const payload = await runAction("Ambil daftar layer", () =>
      adapterServiceApi.listLayers(selectedConnection.provider as AdapterProvider, selectedConnectionId),
    );
    const options = parseLayerOptions(payload).map((item) => {
      if (selectedConnection.provider !== "arcgis") {
        // A3: paritas ingestible untuk GeoServer sejauh respons BE memungkinkan. WFS sering
        // tidak mengirim type/geometry, jadi default TRUE; hanya tandai tak-ingestible bila BE
        // eksplisit memberi field geometry yang kosong/null (jangan mengarang).
        const raw = (item.raw ?? {}) as Record<string, unknown>;
        const hasGeomField = "geometry_type" in raw || "geometryType" in raw;
        const geometryType = String(raw.geometry_type ?? raw.geometryType ?? "").trim();
        const ingestible = hasGeomField ? !!geometryType : true;
        return { ...item, ingestible };
      }

      const arcGisId = resolveArcGisLayerId(item);
      const raw = (item.raw ?? {}) as Record<string, unknown>;
      const geometryType = String(raw.geometry_type ?? "").trim();
      const layerType = String(raw.type ?? "").trim();
      // BE menandai Group Layer dengan geometry_type null. Hanya layer bergeometri yang
      // bisa di-ingest (Feature Layer). Group/Table → tidak ingestible.
      const ingestible = !!geometryType && layerType.toLowerCase() !== "group layer";
      const geomLabel = geometryType.replace(/^esriGeometry/i, "");
      return {
        ...item,
        value: arcGisId !== null ? String(arcGisId) : item.value,
        label: ingestible
          ? (geomLabel ? `${item.label} — ${geomLabel}` : item.label)
          : `${item.label} — ${layerType || "grup/tanpa geometri"} (tak bisa di-ingest)`,
        ingestible,
      };
    });
    setLayerOptions(options);
    // Auto-pilih layer pertama yang BISA di-ingest, bukan sekadar yang pertama (bisa Group Layer).
    const firstIngestible = options.find((item) => item.ingestible) ?? null;
    setSelectedLayerValue(firstIngestible?.value ?? "");
    if (options.length === 0) {
      toast.warning("Layer belum terbaca. Cek ulang credential atau base URL.");
    } else if (!firstIngestible) {
      toast.warning("Semua layer di source ini grup/tanpa geometri — tidak ada yang bisa di-ingest.");
    }
  };

  const previewLayer = async () => {
    if (!selectedConnection || !selectedLayer) {
      toast.error("Pilih koneksi dan layer dulu.");
      return;
    }

    if (selectedConnection.provider === "geoserver") {
      const layerName = resolveGeoServerLayerName(selectedLayer);
      if (!layerName) {
        toast.error("Nama layer GeoServer belum kebaca.");
        return;
      }
      await runAction("Preview layer", () =>
        adapterServiceApi.previewGeoServerLayer(selectedConnection.id, layerName),
      );
      return;
    }

    const layerId = resolveArcGisLayerId(selectedLayer);
    if (layerId === null) {
      toast.error("Layer ArcGIS belum punya layer_id yang valid.");
      return;
    }
    await runAction("Preview layer", () =>
      adapterServiceApi.previewArcGisLayer(selectedConnection.id, layerId),
    );
  };

  const describeLayer = async () => {
    if (!selectedConnection || !selectedLayer) {
      toast.error("Pilih koneksi dan layer dulu.");
      return;
    }

    if (selectedConnection.provider === "geoserver") {
      const layerName = resolveGeoServerLayerName(selectedLayer);
      if (!layerName) {
        toast.error("Nama layer GeoServer belum kebaca.");
        return;
      }
      await runAction("Struktur layer", () =>
        adapterServiceApi.describeGeoServerLayer(selectedConnection.id, layerName),
      );
      return;
    }

    const layerId = resolveArcGisLayerId(selectedLayer);
    if (layerId === null) {
      toast.error("Layer ArcGIS belum punya layer_id yang valid.");
      return;
    }
    await runAction("Struktur layer", () =>
      adapterServiceApi.describeArcGisLayer(selectedConnection.id, layerId),
    );
  };

  const submitTask = async () => {
    if (!selectedDomain) {
      toast.error("Pilih domain dulu.");
      return;
    }
    if (!effectiveDomainCode) {
      toast.error("Domain ini belum terpetakan ke kategori data (WK/FLD/SEI/WLL/FP). Pilih kategori data di bawah domain.");
      return;
    }

    const basePayload = {
      domain_id: selectedDomain.value,
      domain_name: selectedDomain.domainName,
      domain_code: effectiveDomainCode,
      classification,
    };

    let result: AdapterIngestionTask;

    if (activeMode === "geojson") {
      let geojsonBody: Record<string, unknown>;
      try {
        geojsonBody = JSON.parse(geojsonText);
      } catch {
        toast.error("Payload GeoJSON belum valid.");
        return;
      }
      if (!geojsonBody?.type || typeof geojsonBody.type !== "string") {
        toast.error("Payload GeoJSON harus punya properti type.");
        return;
      }
      // A15: FeatureCollection tanpa features = "sukses hampa" — blokir supaya tidak ingest kosong.
      if (
        String(geojsonBody.type).toLowerCase() === "featurecollection" &&
        (!Array.isArray(geojsonBody.features) || geojsonBody.features.length === 0)
      ) {
        toast.error("FeatureCollection tidak punya features. Isi minimal satu feature sebelum ingest.");
        return;
      }

      result = await runAction("Buat task GeoJSON", () =>
        adapterServiceApi.ingestGeoJson({
          ...basePayload,
          geojson_body: geojsonBody,
        }),
      ) as AdapterIngestionTask;
    } else if (activeMode === "shapefile") {
      if (!shapefileFile) {
        toast.error("Arsip shapefile wajib dipilih.");
        return;
      }
      if (fieldMapText.trim()) {
        try {
          parseJsonObject(fieldMapText, "Field map");
        } catch (error) {
          toast.error(getApiErrorMessage(error, "Field map belum valid."));
          return;
        }
      }

      result = await runAction("Buat task Shapefile", () =>
        adapterServiceApi.ingestShapefile({
          ...basePayload,
          file: shapefileFile,
          field_map: fieldMapText.trim(),
        }),
      ) as AdapterIngestionTask;
    } else {
      if (!selectedConnection || !selectedLayer) {
        toast.error("Pilih remote source dan layer dulu.");
        return;
      }

      if (selectedLayer.ingestible === false) {
        toast.error("Layer ini grup/tanpa geometri, tidak bisa di-ingest. Pilih sub-layer bertipe Feature Layer (yang punya geometri).");
        return;
      }

      if (selectedConnection.provider === "geoserver") {
        const layerName = resolveGeoServerLayerName(selectedLayer);
        if (!layerName) {
          toast.error("Nama layer GeoServer wajib terisi.");
          return;
        }
        result = await runAction("Buat task GeoServer", () =>
          adapterServiceApi.ingestGeoServer({
            ...basePayload,
            connection_id: selectedConnection.id,
            layer_name: layerName,
            cql_filter: remoteQuery.cqlFilter.trim() || null,
            srs_name: remoteQuery.srsName.trim() || null,
          }),
        ) as AdapterIngestionTask;
      } else {
        const layerId = resolveArcGisLayerId(selectedLayer);
        if (layerId === null) {
          toast.error("Layer ArcGIS belum valid. Muat ulang layer lalu pilih lagi.");
          return;
        }
        const outSr = Number(remoteQuery.outSr || 4326);
        if (!Number.isFinite(outSr) || outSr <= 0) {
          toast.error("Out SR harus berupa angka positif.");
          return;
        }
        result = await runAction("Buat task ArcGIS", () =>
          adapterServiceApi.ingestArcGis({
            ...basePayload,
            connection_id: selectedConnection.id,
            layer_id: layerId,
            // A4: kirim title bersih, bukan label berhias " — geometry".
            layer_name: selectedLayer.title || selectedLayer.label,
            where: remoteQuery.where.trim() || "1=1",
            out_fields: remoteQuery.outFields.trim() || "*",
            return_geometry: remoteQuery.returnGeometry,
            out_sr: outSr,
          }),
        ) as AdapterIngestionTask;
      }
    }

    await refetchTasks();
    if (result?.id) setActiveTaskId(String(result.id));
    toast.success("Task ingest berhasil dibuat.");
  };

  const refreshTask = async () => {
    if (!activeTaskId) {
      toast.error("Pilih task dulu.");
      return;
    }
    await runAction("Status task", () => adapterServiceApi.getTask(activeTaskId));
    await refetchTasks();
  };

  // ── Status langkah otomatis (S5) ─────────────────────────────────────────
  const geojsonFilled = useMemo(() => {
    try {
      const body = JSON.parse(geojsonText);
      if (!body?.type) return false;
      if (String(body.type).toLowerCase() === "featurecollection") {
        return Array.isArray(body.features) && body.features.length > 0;
      }
      return true;
    } catch {
      return false;
    }
  }, [geojsonText]);

  const hasSuccessTaskForCategory = useMemo(
    () =>
      !!effectiveDomainCode &&
      tasks.some((task) => isSuccessTaskStatus(task.status) && String(task.domain_code) === effectiveDomainCode),
    [tasks, effectiveDomainCode],
  );

  const stepStatuses = useMemo(
    () =>
      computeAdapterStepStatuses({
        mode: activeMode,
        hasConnection: !!selectedConnectionId,
        hasLayer: !!selectedLayerValue,
        geojsonFilled,
        shapefileFilled: !!shapefileFile,
        hasSuccessTaskForCategory,
      }),
    [activeMode, selectedConnectionId, selectedLayerValue, geojsonFilled, shapefileFile, hasSuccessTaskForCategory],
  );

  // Ekspor status + konteks ke halaman induk (badge tab / context strip). onStateChange
  // idealnya berupa setter useState yang identitasnya stabil supaya tidak memicu loop.
  useEffect(() => {
    onStateChange?.({
      statuses: stepStatuses,
      selectedDomainLabel: selectedDomain?.label ?? null,
      effectiveDomainCode,
      adapterReady,
    });
  }, [onStateChange, stepStatuses, selectedDomain, effectiveDomainCode, adapterReady]);

  const connectionFormVisible = showConnectionForm || connections.length === 0;

  const sourceCards: Array<{ key: string; title: string; desc: string; active: boolean; onClick: () => void }> = [
    {
      key: "geoserver",
      title: "GeoServer",
      desc: "Server peta WFS/WMS milik KKKS",
      active: activeMode === "remote" && remoteForm.provider === "geoserver",
      onClick: () => {
        setActiveMode("remote");
        setRemoteForm((prev) => ({ ...prev, provider: "geoserver" }));
      },
    },
    {
      key: "arcgis",
      title: "ArcGIS",
      desc: "ArcGIS Server / Online REST",
      active: activeMode === "remote" && remoteForm.provider === "arcgis",
      onClick: () => {
        setActiveMode("remote");
        setRemoteForm((prev) => ({ ...prev, provider: "arcgis" }));
      },
    },
    {
      key: "geojson",
      title: "GeoJSON tempel",
      desc: "Tempel isi GeoJSON langsung",
      active: activeMode === "geojson",
      onClick: () => setActiveMode("geojson"),
    },
    {
      key: "shapefile",
      title: "Shapefile",
      desc: "Upload .zip shapefile",
      active: activeMode === "shapefile",
      onClick: () => setActiveMode("shapefile"),
    },
  ];

  const connectionSummary = selectedConnection
    ? `${selectedConnection.name} · ${selectedConnection.provider}${selectedConnection.base_url ? ` · ${selectedConnection.base_url}` : ""}`
    : null;

  const step1Summary =
    activeMode === "remote"
      ? connectionSummary ?? "Pilih atau daftarkan koneksi sumber."
      : activeMode === "geojson"
        ? "Tempel GeoJSON di kolom bawah."
        : "Unggah arsip ZIP shapefile.";

  const step2Summary =
    activeMode !== "remote"
      ? "Tahap layer tidak berlaku untuk sumber ini."
      : selectedLayer
        ? `Terpilih: ${selectedLayer.title || selectedLayer.label}`
        : "Belum ada layer terpilih.";

  return (
    <div className="space-y-5">
      {!adapterReady && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Adapter endpoint belum diisi di deployment config. Jalur ini sengaja tidak diblok total, tapi ingest belum bisa dijalankan sampai alamat servicenya lengkap.
        </div>
      )}

      {/* ── STRIP STATUS (S1) ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Domain</span>
          <Select
            value={selectedDomainValue || undefined}
            onValueChange={setSelectedDomainValue}
            disabled={domainOptions.length === 0}
          >
            <SelectTrigger className="h-8 w-auto min-w-[160px] gap-1 text-[13px] font-semibold">
              <SelectValue placeholder={domainOptions.length === 0 ? "Binding domain belum tercatat" : "Pilih domain"} />
            </SelectTrigger>
            <SelectContent>
              {domainOptions.length === 0 ? (
                <SelectItem value="__empty__" disabled>
                  Domain participant belum tercatat di modul onboarding
                </SelectItem>
              ) : (
                domainOptions.map((domain) => (
                  <SelectItem key={domain.value} value={domain.value}>
                    {domain.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Kategori</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-slate-700">
            {effectiveDomainCode || "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Service adapter</span>
          {adapterReady ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">✓ terhubung</span>
          ) : (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">✗ belum</span>
          )}
        </div>
        {!!participantId && (
          <Badge variant="outline" className="text-[11px]">Participant aktif</Badge>
        )}
        <div className="flex-1" />
        <span className="text-[12.5px] text-slate-500">
          Langkah berikutnya:{" "}
          <b className="text-sky-700">{nextStepLabel(stepStatuses.nextStep)}</b>
        </span>
      </div>

      {/* Kategori dipilih per-layer di dalam step ② (blok "Kategori data untuk layer ini"). */}

      {/* ── STRIP "WAJIB CUMA 3" (S2) ── */}
      <div className="flex flex-wrap gap-2.5">
        <div className="min-w-[180px] flex-1 rounded-xl border border-dashed border-sky-200 bg-sky-50/60 px-3.5 py-2.5 text-[12.5px] text-slate-600">
          <b className="block text-[13px] text-sky-800">Yang wajib kamu isi cuma 3:</b>
          pilih sumber → pilih layer → klik Ingest.
        </div>
        <div className="min-w-[180px] flex-1 rounded-xl border border-dashed border-sky-200 bg-sky-50/60 px-3.5 py-2.5 text-[12.5px] text-slate-600">
          <b className="block text-[13px] text-sky-800">Sisanya otomatis:</b>
          domain &amp; kategori dibaca dari akun, klasifikasi pakai default kategori, filter kosong = ambil semua data apa adanya.
        </div>
        <div className="min-w-[180px] flex-1 rounded-xl border border-dashed border-sky-200 bg-sky-50/60 px-3.5 py-2.5 text-[12.5px] text-slate-600">
          <b className="block text-[13px] text-sky-800">Penanda tiap isian:</b>
          <span className="mt-1 inline-flex flex-wrap items-center gap-1">
            <Req kind="must" /> harus kamu pilih · <Req kind="auto" /> sudah terisi, bisa diubah · <Req kind="opt" /> lewati saja kalau ragu
          </span>
        </div>
      </div>

      {/* ── STEPPER 4 LANGKAH (S3) ── */}
      <div className="relative space-y-3.5">
        <div className="pointer-events-none absolute left-[17px] top-5 bottom-5 w-0.5 bg-slate-200" />

        {showSourceLayer && (
        <>
        {/* ① Hubungkan Sumber */}
        <StepCard
          n={1}
          status={stepStatuses.step1}
          title={<>① Hubungkan Sumber <span className="font-normal text-slate-400">— dari mana datanya</span></>}
          summary={step1Summary}
        >
          <div className="flex flex-wrap gap-2">
            {sourceCards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={card.onClick}
                className={`min-w-[150px] rounded-xl border-[1.5px] px-3 py-2 text-left text-[12.5px] transition ${card.active ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <b className="block text-[12.5px] text-slate-900">{card.title}</b>
                <span className="text-[11.5px] text-slate-500">{card.desc}</span>
              </button>
            ))}
          </div>

          {activeMode === "remote" && (
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label className="text-[12px]">Koneksi tersimpan <Req kind="must" /></Label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-[240px] max-w-md flex-1">
                    <SearchableSelect
                      options={connections.map((item) => ({
                        value: item.id,
                        label: item.name,
                        hint: item.provider,
                        keywords: item.provider,
                      }))}
                      value={selectedConnectionId}
                      onChange={setSelectedConnectionId}
                      disabled={connections.length === 0}
                      placeholder={connections.length === 0 ? "Belum ada koneksi — bikin baru dulu" : "Pilih / cari koneksi"}
                      searchPlaceholder="Cari nama koneksi..."
                      emptyText="Koneksi tidak ketemu."
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => void checkRemoteSource()} disabled={testingRemoteSource}>
                    {testingRemoteSource ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                    Tes koneksi
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedConnectionId("");
                      setShowConnectionForm(true);
                    }}
                  >
                    + Koneksi baru
                  </Button>
                  {connections.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => refetchConnections()} disabled={loadingConnections}>
                      {loadingConnections ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <p className="text-[12px] text-slate-500">
                  Sudah pernah bikin koneksi? Tinggal pilih dari daftar — form isian koneksi <b>tidak muncul lagi</b>. Bikin koneksi baru cuma perlu sekali per server sumber.
                </p>
              </div>

              {connectionFormVisible && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Koneksi baru ({remoteForm.provider === "arcgis" ? "ArcGIS" : "GeoServer"})</p>
                    {connections.length > 0 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowConnectionForm(false)}>
                        Tutup
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nama koneksi</Label>
                      <Input value={remoteForm.name} onChange={(e) => setRemoteForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Contoh: GeoServer PHE" />
                    </div>
                    <div className="space-y-2">
                      <Label>Metode otorisasi</Label>
                      <Select value={remoteForm.authType} onValueChange={(value) => setRemoteForm((prev) => ({ ...prev, authType: value as AdapterAuthType }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tanpa credential</SelectItem>
                          <SelectItem value="basic">Basic auth</SelectItem>
                          <SelectItem value="api_key">API key</SelectItem>
                          <SelectItem value="bearer">Bearer token</SelectItem>
                          <SelectItem value="oauth2_client_credentials">OAuth2 client credentials</SelectItem>
                          <SelectItem value="arcgis_token">ArcGIS token</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input value={remoteForm.baseUrl} onChange={(e) => setRemoteForm((prev) => ({ ...prev, baseUrl: e.target.value }))} placeholder="https://service.example.com/..." />
                  </div>

                  {remoteForm.authType === "basic" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input value={remoteForm.username} onChange={(e) => setRemoteForm((prev) => ({ ...prev, username: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" value={remoteForm.password} onChange={(e) => setRemoteForm((prev) => ({ ...prev, password: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  {remoteForm.authType === "api_key" && (
                    <div className="space-y-2">
                      <Label>API key</Label>
                      <Input value={remoteForm.apiKey} onChange={(e) => setRemoteForm((prev) => ({ ...prev, apiKey: e.target.value }))} />
                    </div>
                  )}

                  {remoteForm.authType === "bearer" && (
                    <div className="space-y-2">
                      <Label>Bearer token</Label>
                      <Textarea value={remoteForm.bearerToken} onChange={(e) => setRemoteForm((prev) => ({ ...prev, bearerToken: e.target.value }))} className="min-h-[90px]" />
                    </div>
                  )}

                  {(remoteForm.authType === "oauth2_client_credentials" || remoteForm.authType === "arcgis_token") && (
                    <div className="space-y-2">
                      <Label>Credential lanjutan</Label>
                      <Textarea
                        value={remoteForm.advancedCredentialJson}
                        onChange={(e) => setRemoteForm((prev) => ({ ...prev, advancedCredentialJson: e.target.value }))}
                        className="min-h-[140px] font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">Isi object JSON sesuai kebutuhan koneksi yang dipakai.</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => void checkRemoteSource()} disabled={testingRemoteSource}>
                      {testingRemoteSource ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                      Cek alamat sumber
                    </Button>
                    <Button type="button" onClick={() => saveConnection("create")} disabled={!adapterReady || busyAction !== ""}>
                      {busyAction === "Simpan remote source" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Simpan koneksi baru
                    </Button>
                    {selectedConnectionId && (
                      <Button type="button" variant="outline" onClick={() => saveConnection("update")} disabled={!adapterReady || busyAction !== ""}>
                        {busyAction === "Perbarui remote source" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Perbarui koneksi terpilih
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => void deleteSelectedConnection()}
                      disabled={!adapterReady || !selectedConnectionId || busyAction !== ""}
                    >
                      {busyAction === "Hapus remote source" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Hapus koneksi
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMode === "geojson" && (
            <div className="mt-4 space-y-2">
              <Label>Payload GeoJSON <Req kind="must" /></Label>
              <Textarea value={geojsonText} onChange={(e) => setGeojsonText(e.target.value)} className="min-h-[240px] font-mono text-xs" />
              <p className="text-[12px] text-slate-500">Pakai jalur ini kalau sumber data sudah siap dalam bentuk GeoJSON. Minimal satu feature.</p>
            </div>
          )}

          {activeMode === "shapefile" && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Arsip shapefile <Req kind="must" /></Label>
                <Input type="file" accept=".zip,application/zip" onChange={(e) => setShapefileFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">
                  {shapefileFile ? `File terpilih: ${shapefileFile.name}` : "Pilih arsip ZIP berisi SHP, SHX, DBF, dan PRJ."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Field map <Req kind="opt" /></Label>
                <Textarea value={fieldMapText} onChange={(e) => setFieldMapText(e.target.value)} className="min-h-[140px] font-mono text-xs" />
                <p className="text-[12px] text-slate-500">Petakan nama kolom sumber → nama standar SKK. Kosong = nama kolom sumber dipakai apa adanya.</p>
              </div>
            </div>
          )}
        </StepCard>

        {/* ② Pilih Layer & Atur Ambilan */}
        <StepCard
          n={2}
          status={stepStatuses.step2}
          title={<>② Pilih Layer &amp; Atur Ambilan <span className="font-normal text-slate-400">— data yang mana</span></>}
          summary={step2Summary}
        >
          {activeMode !== "remote" ? (
            <p className="text-[12.5px] text-slate-500">
              Sumber <b>{activeMode === "geojson" ? "GeoJSON tempel" : "Shapefile"}</b> tidak butuh pemilihan layer — datanya diambil langsung dari yang kamu isi di langkah ①.
            </p>
          ) : (
            <>
              <p className="text-[12.5px] text-slate-600">
                ⓘ <b>Layer</b> <Req kind="must" /> = satu kumpulan data di server sumber. Layer pertama yang bisa di-ingest <b>terpilih otomatis</b> — ganti kalau bukan itu yang kamu mau. Baris yang tak bisa di-ingest (grup/tanpa geometri) dinonaktifkan.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={loadLayers} disabled={!selectedConnectionId || busyAction !== ""}>
                  {busyAction === "Ambil daftar layer" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
                  Ambil layer
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={previewLayer} disabled={!selectedLayer || busyAction !== ""}>
                  <Waypoints className="mr-2 h-4 w-4" />
                  Intip isi
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={describeLayer} disabled={!selectedLayer || busyAction !== ""}>
                  Struktur
                </Button>
              </div>
              <div className="mt-3 max-w-xl space-y-2">
                <Label className="text-[12px]">Layer terpilih <Req kind="must" /></Label>
                <SearchableSelect
                  options={layerOptions.map((item) => ({
                    value: item.value,
                    label: item.label,
                    hint: item.ingestible === false ? "tak bisa di-ingest (tanpa geometri)" : undefined,
                    disabled: item.ingestible === false,
                  }))}
                  value={selectedLayerValue}
                  onChange={setSelectedLayerValue}
                  disabled={layerOptions.length === 0}
                  placeholder={layerOptions.length === 0 ? "Belum ada layer — klik Ambil layer" : "Pilih / cari layer"}
                  searchPlaceholder="Cari nama layer..."
                  emptyText="Layer tidak ketemu."
                />
              </div>

              {/* Hasil "Intip isi" / "Struktur" tampil INLINE di tab ini. Selalu ada sesuatu:
                  loading → hasil/error, jangan pernah blank. */}
              {(busyAction === "Preview layer" || busyAction === "Struktur layer") ? (
                <div className="mt-3 flex max-w-xl items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-[12px] text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Mengambil isi layer dari sumber… (sumber publik/lambat bisa sampai puluhan detik)
                </div>
              ) : outputPayload != null && /^(Intip isi|Preview layer|Struktur)/.test(outputTitle) ? (
                <div className="mt-3 max-w-xl rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[12px] font-semibold text-slate-700">Hasil: {outputTitle}</span>
                    <button type="button" className="text-[11px] text-slate-500 hover:text-slate-800" onClick={() => setOutputPayload(null)}>Tutup</button>
                  </div>
                  <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap break-words border-t border-slate-200 bg-white/70 p-3 text-[11px] leading-6 text-slate-700">{prettyJson(outputPayload)}</pre>
                </div>
              ) : null}

              {/* KATEGORI DATA untuk layer terpilih — selalu tampil di step ② (jawab "klasifikasi gada"). */}
              {selectedLayer && (
                <div className="mt-4 max-w-xl space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3">
                  <Label className="text-[12px]">Kategori data untuk layer ini <Req kind={selectedDomain?.domainCode ? "auto" : "must"} /></Label>
                  {selectedDomain?.domainCode ? (
                    <p className="text-[12.5px]">
                      <b className="font-mono">{selectedDomain.domainCode}</b> — {CATEGORY_META.find((c) => c.code === selectedDomain.domainCode)?.name}
                      <span className="ml-1 text-[11.5px] text-slate-500">(otomatis dari domain {selectedDomain.domainName})</span>
                    </p>
                  ) : (
                    <>
                      <SearchableSelect
                        options={CATEGORY_META.map((c) => ({ value: c.code, label: `${c.name} (${c.code})`, hint: c.desc, keywords: c.code }))}
                        value={manualCatalogCode || undefined}
                        onChange={(v) => setManualCatalogCode(v as AdapterDomainCode)}
                        placeholder="Pilih / cari kategori data"
                        searchPlaceholder="Cari kategori (mis. sumur, seismik)..."
                      />
                      {(() => {
                        const suggestion = suggestCategoryFromText(selectedLayer.label);
                        if (!suggestion || suggestion === manualCatalogCode) return null;
                        const meta = CATEGORY_META.find((c) => c.code === suggestion);
                        return (
                          <button type="button" onClick={() => setManualCatalogCode(suggestion)} className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11.5px] font-medium text-sky-800 hover:bg-sky-100">
                            Saran dari nama layer: <b>{meta?.name} ({suggestion})</b> — klik untuk pakai
                          </button>
                        );
                      })()}
                      <p className="text-[11px] text-slate-500">Layer "{selectedLayer.label}" akan masuk kategori ini. Sistem tidak memaksa — kamu yang menentukan.</p>
                    </>
                  )}
                </div>
              )}

              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <summary className="cursor-pointer text-[12.5px] font-semibold text-sky-700">
                  <Req kind="opt" /> Saring &amp; pilih kolom — <b>aman dilewati</b>: kosong = ambil semua data apa adanya
                </summary>
                {selectedConnection?.provider === "geoserver" ? (
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">CQL filter <Req kind="opt" /></Label>
                      <Input value={remoteQuery.cqlFilter} onChange={(e) => setRemoteQuery((prev) => ({ ...prev, cqlFilter: e.target.value }))} placeholder="kosong = semua baris ikut (default)" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">SRS <Req kind="auto" label="OTOMATIS: EPSG:4326" /></Label>
                      <Input value={remoteQuery.srsName} onChange={(e) => setRemoteQuery((prev) => ({ ...prev, srsName: e.target.value }))} placeholder="EPSG:4326" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Where <Req kind="opt" /></Label>
                      <Input value={remoteQuery.where} onChange={(e) => setRemoteQuery((prev) => ({ ...prev, where: e.target.value }))} placeholder="1=1 = semua baris" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Out fields <Req kind="auto" label="OTOMATIS: *" /></Label>
                      <Input value={remoteQuery.outFields} onChange={(e) => setRemoteQuery((prev) => ({ ...prev, outFields: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Out SR <Req kind="auto" label="OTOMATIS: 4326" /></Label>
                      <Input value={remoteQuery.outSr} onChange={(e) => setRemoteQuery((prev) => ({ ...prev, outSr: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Geometry <Req kind="auto" /></Label>
                      <Select value={remoteQuery.returnGeometry ? "yes" : "no"} onValueChange={(value) => setRemoteQuery((prev) => ({ ...prev, returnGeometry: value === "yes" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Kirim geometry</SelectItem>
                          <SelectItem value="no">Tanpa geometry</SelectItem>
                        </SelectContent>
                      </Select>
                      {!remoteQuery.returnGeometry && (
                        <p className="text-[11px] leading-4 text-amber-700">
                          "Tanpa geometry" hampir pasti DITOLAK validasi untuk data peta
                          (error: "ArcGIS tidak menghasilkan feature valid"). Biarkan "Kirim geometry"
                          kecuali sumbernya memang tabel non-spasial.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </details>
            </>
          )}
        </StepCard>
        </>
        )}

        {showIngest && (
        <>
        {/* ③ Beri Label & Ingest */}
        <StepCard
          n={3}
          status={stepStatuses.step3}
          title={<>③ Beri Label &amp; Ingest <span className="font-normal text-slate-400">— masuk kotak mana</span></>}
          summary="Tentukan kategori & klasifikasi, lalu jalankan."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Kategori data <Req kind="auto" label="OTOMATIS dari domain" /></Label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-800">
                {effectiveDomainCode ? (CATEGORY_LABEL[effectiveDomainCode] ?? effectiveDomainCode) : "Belum terpetakan — pilih kategori di atas"}
              </div>
              <p className="text-[12px] text-slate-500">Terisi sendiri dari domain aktif. Perlu pilih manual hanya kalau domainnya belum bawa kode kategori.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">
                Klasifikasi <Req kind="auto" label={effectiveDomainCode ? `DEFAULT: ${DEFAULT_CLASS_BY_CODE[effectiveDomainCode] ?? "L2"} utk ${effectiveDomainCode}` : "DEFAULT per kategori"} />
              </Label>
              <Select
                value={classification}
                onValueChange={(value) => {
                  setClassification(value as AdapterClassification);
                  setClassificationTouched(true);
                }}
              >
                <SelectTrigger className="max-w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASSIFICATION_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[12px] text-slate-500">Default mengikuti kategori (WK→L1, FLD/FP→L2, WLL/SEI→L3). Ubah hanya kalau datamu lebih sensitif.</p>
            </div>
          </div>

          {/* Ringkasan pre-flight: jawab "data apa yang dipakai" SEBELUM tombol ditekan. */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-700">
            <span className="font-semibold">Yang akan di-ingest:</span>{" "}
            {activeMode === "remote" ? (
              <>
                koneksi <b>{selectedConnection?.name || "— belum dipilih (langkah ①)"}</b>
                {selectedConnection ? <span className="text-slate-500"> ({selectedConnection.provider})</span> : null}
                {" · "}layer <b>{selectedLayer?.title || "— belum dipilih (langkah ②)"}</b>
              </>
            ) : activeMode === "geojson" ? (
              <>GeoJSON yang kamu tempel di langkah ①</>
            ) : (
              <>arsip shapefile <b>{shapefileFile?.name || "— belum dipilih (langkah ①)"}</b></>
            )}
            {" → "}masuk koleksi <b className="font-mono">{effectiveDomainCode || "?"}</b>
            {" "}dengan klasifikasi <b>{classification}</b>.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={submitTask} disabled={!adapterReady || !selectedDomain || busyAction !== "" || activeTaskRunning}>
              {busyAction.startsWith("Buat task") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Ingest sekarang
            </Button>
            <span className="text-[12.5px] text-slate-500">
              Data diambil dari sumber → diperiksa (validasi) → disimpan jadi koleksi{" "}
              <b className="font-mono">{effectiveDomainCode || "?"}</b>.
            </span>
          </div>
          {activeTaskRunning && (
            <p className="mt-2 text-xs text-amber-600">Task aktif masih berjalan — tunggu selesai sebelum membuat task baru.</p>
          )}

          {/* Riwayat task */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Riwayat task (pekerjaan ingest)</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetchTasks()} disabled={loadingTasks}>
                {loadingTasks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Muat terbaru
              </Button>
            </div>
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-[0.06em] text-slate-500">
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">Waktu</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">Kategori</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">Sumber</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">Status</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Belum ada task yang tercatat.</td>
                    </tr>
                  ) : (
                    tasks.map((task) => {
                      const success = isSuccessTaskStatus(task.status);
                      const failed = isFailedTaskStatus(task.status);
                      const statusCls = success
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : failed
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-100 text-slate-600";
                      const source = [task.provider, (task as Record<string, unknown>).layer_name as string | undefined]
                        .filter(Boolean)
                        .join(" · ") || task.source_type || "-";
                      const keterangan = failed
                        ? getApiErrorMessage(task.error_log, "Task gagal — cek konfigurasi sumber.")
                        : success
                          ? "Berhasil masuk koleksi"
                          : "Sedang diproses…";
                      const active = String(task.id) === activeTaskId;
                      return (
                        <tr
                          key={String(task.id)}
                          onClick={() => setActiveTaskId(String(task.id))}
                          className={`cursor-pointer align-top ${active ? "bg-sky-50" : "hover:bg-slate-50"}`}
                        >
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-600">{formatTaskTime(task.created_at || task.updated_at)}</td>
                          <td className="border-b border-slate-100 px-3 py-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">{task.domain_code || "-"}</span>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-600">{source}</td>
                          <td className="border-b border-slate-100 px-3 py-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCls}`}>{task.status || "queued"}</span>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-500">{keterangan}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Log proses terakhir (preview/struktur/status/simpan) — collapsible, tidak dominan */}
          <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-[12.5px] font-semibold text-slate-700">
              <span>Log proses terakhir: {outputTitle}</span>
              <Button type="button" variant="outline" size="sm" onClick={(e) => { e.preventDefault(); void refreshTask(); }} disabled={!activeTaskId || busyAction !== ""}>
                {busyAction === "Status task" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </summary>
            <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words border-t border-slate-200 bg-white/70 p-3 text-[11px] leading-6 text-slate-700">
              {prettyJson(outputPayload)}
            </pre>
          </details>
        </StepCard>
        </>
        )}
      </div>
    </div>
  );
}
