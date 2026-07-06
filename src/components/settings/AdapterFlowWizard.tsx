import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Database,
  ExternalLink,
  FileJson2,
  Layers3,
  Loader2,
  Map,
  RefreshCw,
  Save,
  ScanSearch,
  Upload,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export interface AdapterWizardDomainOption {
  value: string;
  label: string;
  domainCode: AdapterDomainCode | "";
  domainName: string;
}

interface Props {
  participantId?: string | null;
  adapterEndpoint?: string;
  domainOptions: AdapterWizardDomainOption[];
}

interface LayerOption {
  value: string;
  label: string;
  raw: unknown;
}

const CLASSIFICATION_OPTIONS: AdapterClassification[] = ["L0", "L1", "L2", "L3", "L4"];

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
      const layer = item as Record<string, unknown> | string;
      if (typeof item === "string") {
        return { value: item, label: item, raw: item };
      }

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
      return { value, label, raw: layer };
    })
    .filter(Boolean) as LayerOption[];
};

const resolveGeoServerLayerName = (layer: LayerOption | null) =>
  String(layer?.raw?.name ?? layer?.raw?.layer_name ?? layer?.value ?? "").trim();

const resolveArcGisLayerId = (layer: LayerOption | null) => {
  const rawId = layer?.raw?.id ?? layer?.raw?.layer_id ?? layer?.value;
  const layerId = Number(rawId);
  return Number.isInteger(layerId) && layerId >= 0 ? layerId : null;
};

const prettyJson = (payload: unknown) =>
  payload ? JSON.stringify(payload, null, 2) : "Belum ada proses dijalankan.";

export function AdapterFlowWizard({ participantId, adapterEndpoint, domainOptions }: Props) {
  const [selectedDomainValue, setSelectedDomainValue] = useState("");
  const [activeMode, setActiveMode] = useState<"remote" | "geojson" | "shapefile">("remote");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [selectedLayerValue, setSelectedLayerValue] = useState("");
  const [layerOptions, setLayerOptions] = useState<LayerOption[]>([]);
  const [busyAction, setBusyAction] = useState("");
  const [outputTitle, setOutputTitle] = useState("Belum ada proses dijalankan");
  const [outputPayload, setOutputPayload] = useState<unknown>(null);
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
    refetchInterval: 15000,
  });

  const {
    data: validatedItems,
    isLoading: loadingItems,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["adapter-service", "items", adapterEndpoint, selectedDomain?.domainCode],
    queryFn: () => adapterServiceApi.listItems(selectedDomain!.domainCode as AdapterDomainCode, { limit: 20, offset: 0 }),
    enabled: adapterReady && Boolean(selectedDomain?.domainCode),
  });

  const selectedConnection = useMemo(
    () => connections.find((item) => item.id === selectedConnectionId) ?? null,
    [connections, selectedConnectionId],
  );

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
    toast.success(mode === "create" ? "Remote source tersimpan." : "Remote source diperbarui.");
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
      const token = localStorage.getItem("auth_token");
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
        return item;
      }

      const arcGisId = resolveArcGisLayerId(item);
      return {
        ...item,
        value: arcGisId !== null ? String(arcGisId) : item.value,
        label: item.label,
      };
    });
    setLayerOptions(options);
    setSelectedLayerValue(options[0]?.value ?? "");
    if (options.length === 0) {
      toast.warning("Layer belum terbaca. Cek ulang credential atau base URL.");
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
    if (!selectedDomain.domainCode) {
      toast.error("Kode domain belum terbaca. Sinkronkan domain participant dulu.");
      return;
    }

    const basePayload = {
      domain_id: selectedDomain.value,
      domain_name: selectedDomain.domainName,
      domain_code: selectedDomain.domainCode,
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
            layer_name: selectedLayer.label,
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
    toast.success("Task validasi berhasil dibuat.");
  };

  const refreshTask = async () => {
    if (!activeTaskId) {
      toast.error("Pilih task dulu.");
      return;
    }
    await runAction("Status task", () => adapterServiceApi.getTask(activeTaskId));
    await refetchTasks();
    await refetchItems();
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Wizard Proses Data</CardTitle>
            <CardDescription>
              Atur sumber data, jalankan validasi, lalu pantau hasil yang sudah lolos tanpa keluar dari halaman ini.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={adapterReady ? "outline" : "secondary"}>
              {adapterReady ? "Service siap" : "Service belum diisi"}
            </Badge>
            {!!participantId && <Badge variant="outline">Participant aktif</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!adapterReady && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Adapter endpoint belum diisi di deployment config. Jalur ini sengaja tidak diblok total, tapi task validasi belum bisa dijalankan sampai alamat servicenya lengkap.
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { icon: Map, title: "1. Domain", text: "Tentukan domain kerja yang sedang ditangani." },
                { icon: Database, title: "2. Sumber", text: "Pilih remote source, GeoJSON, atau shapefile." },
                { icon: Activity, title: "3. Validasi", text: "Buat task dan cek status prosesnya." },
                { icon: Layers3, title: "4. Hasil", text: "Lihat item yang lolos validasi per domain." },
              ].map((step) => (
                <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <step.icon className="h-5 w-5 text-sky-700" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">{step.text}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-2">
                  <Label>Domain aktif</Label>
                  <Select
                    value={selectedDomainValue || undefined}
                    onValueChange={setSelectedDomainValue}
                    disabled={domainOptions.length === 0}
                  >
                      <SelectTrigger>
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
                  <p className="text-xs text-muted-foreground">
                    Domain di sini dibaca dari binding participant. Kalau dashboard sudah punya data tapi dropdown ini kosong, berarti binding-nya belum ikut tersimpan di modul onboarding.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-950 px-4 py-3 text-slate-100">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Ringkasan</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Nama domain</span>
                      <span className="font-medium">{selectedDomain?.domainName || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Kode OGC</span>
                      <span className="font-medium">{selectedDomain?.domainCode || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Task terbaru</span>
                      <span className="font-medium">{tasks.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as "remote" | "geojson" | "shapefile")} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="remote">Remote Source</TabsTrigger>
                <TabsTrigger value="geojson">GeoJSON</TabsTrigger>
                <TabsTrigger value="shapefile">Shapefile</TabsTrigger>
              </TabsList>

              <TabsContent value="remote" className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">Remote source</p>
                      <p className="text-sm text-slate-500">Daftarkan koneksi, ambil layer, lalu jadikan layer itu sebagai task validasi.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => refetchConnections()} disabled={loadingConnections}>
                      {loadingConnections ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Muat ulang
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Nama koneksi</Label>
                          <Input value={remoteForm.name} onChange={(e) => setRemoteForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Contoh: GeoServer PHE" />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipe sumber</Label>
                          <Select value={remoteForm.provider} onValueChange={(value) => setRemoteForm((prev) => ({ ...prev, provider: value as AdapterProvider }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="geoserver">GeoServer</SelectItem>
                              <SelectItem value="arcgis">ArcGIS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
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
                        <div className="space-y-2">
                          <Label>Base URL</Label>
                          <Input value={remoteForm.baseUrl} onChange={(e) => setRemoteForm((prev) => ({ ...prev, baseUrl: e.target.value }))} placeholder="https://service.example.com/..." />
                        </div>
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
                          <p className="text-xs text-muted-foreground">
                            Isi object JSON sesuai kebutuhan koneksi yang dipakai.
                          </p>
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
                        <Button type="button" variant="outline" onClick={() => saveConnection("update")} disabled={!adapterReady || !selectedConnectionId || busyAction !== ""}>
                          {busyAction === "Perbarui remote source" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                          Perbarui koneksi terpilih
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="space-y-2">
                        <Label>Koneksi tersimpan</Label>
                        <Select value={selectedConnectionId || undefined} onValueChange={setSelectedConnectionId} disabled={connections.length === 0}>
                          <SelectTrigger>
                            <SelectValue placeholder={connections.length === 0 ? "Belum ada koneksi" : "Pilih koneksi"} />
                          </SelectTrigger>
                          <SelectContent>
                            {connections.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} · {item.provider}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Provider</span>
                          <span className="font-medium text-slate-900">{selectedConnection?.provider || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Base URL</span>
                          <span className="max-w-[260px] truncate text-right font-medium text-slate-900">{selectedConnection?.base_url || "-"}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={loadLayers} disabled={!selectedConnectionId || busyAction !== ""}>
                          {busyAction === "Ambil daftar layer" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
                          Ambil layer
                        </Button>
                        <Button type="button" variant="outline" onClick={describeLayer} disabled={!selectedLayer || busyAction !== ""}>
                          <Layers3 className="mr-2 h-4 w-4" />
                          Struktur
                        </Button>
                        <Button type="button" variant="outline" onClick={previewLayer} disabled={!selectedLayer || busyAction !== ""}>
                          <Waypoints className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                      </div>

                      <div className="mt-4 space-y-2">
                        <Label>Layer terpilih</Label>
                        <Select value={selectedLayerValue || undefined} onValueChange={setSelectedLayerValue} disabled={layerOptions.length === 0}>
                          <SelectTrigger>
                            <SelectValue placeholder={layerOptions.length === 0 ? "Belum ada layer" : "Pilih layer"} />
                          </SelectTrigger>
                          <SelectContent>
                            {layerOptions.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {selectedConnection?.provider === "geoserver" ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>CQL filter</Label>
                        <Input value={remoteQuery.cqlFilter} onChange={(e) => setRemoteQuery((prev) => ({ ...prev, cqlFilter: e.target.value }))} placeholder="Kosongkan jika tidak perlu filter" />
                      </div>
                      <div className="space-y-2">
                        <Label>SRS</Label>
                        <Input value={remoteQuery.srsName} onChange={(e) => setRemoteQuery((prev) => ({ ...prev, srsName: e.target.value }))} placeholder="EPSG:4326" />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Where</Label>
                        <Input value={remoteQuery.where} onChange={(e) => setRemoteQuery((prev) => ({ ...prev, where: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Out fields</Label>
                        <Input value={remoteQuery.outFields} onChange={(e) => setRemoteQuery((prev) => ({ ...prev, outFields: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Out SR</Label>
                        <Input value={remoteQuery.outSr} onChange={(e) => setRemoteQuery((prev) => ({ ...prev, outSr: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Geometry</Label>
                        <Select value={remoteQuery.returnGeometry ? "yes" : "no"} onValueChange={(value) => setRemoteQuery((prev) => ({ ...prev, returnGeometry: value === "yes" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Kirim geometry</SelectItem>
                            <SelectItem value="no">Tanpa geometry</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="geojson" className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-sky-50 p-3">
                      <FileJson2 className="h-5 w-5 text-sky-700" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">Validasi GeoJSON langsung</p>
                      <p className="text-sm text-slate-500">Pakai jalur ini kalau sumber data sudah siap dalam bentuk GeoJSON.</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    <Label>Payload GeoJSON</Label>
                    <Textarea value={geojsonText} onChange={(e) => setGeojsonText(e.target.value)} className="min-h-[280px] font-mono text-xs" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="shapefile" className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-amber-50 p-3">
                      <Upload className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">Validasi shapefile</p>
                      <p className="text-sm text-slate-500">Unggah arsip ZIP shapefile, lalu kirim mapping field bila perlu.</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-2">
                      <Label>Arsip shapefile</Label>
                      <Input type="file" accept=".zip,application/zip" onChange={(e) => setShapefileFile(e.target.files?.[0] ?? null)} />
                      <p className="text-xs text-muted-foreground">
                        {shapefileFile ? `File terpilih: ${shapefileFile.name}` : "Pilih arsip ZIP yang berisi SHP, SHX, DBF, dan PRJ."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Field map</Label>
                      <Textarea value={fieldMapText} onChange={(e) => setFieldMapText(e.target.value)} className="min-h-[180px] font-mono text-xs" />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-2">
                  <Label>Klasifikasi</Label>
                  <Select value={classification} onValueChange={(value) => setClassification(value as AdapterClassification)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLASSIFICATION_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {activeMode === "remote"
                    ? "Flow ini cocok untuk GeoServer atau ArcGIS yang mau diambil layer-nya lebih dulu sebelum dibuat task validasi."
                    : activeMode === "geojson"
                      ? "Flow ini langsung membuat task dari payload GeoJSON tanpa perlu mendaftarkan remote source."
                      : "Flow ini langsung membuat task dari arsip shapefile dan mapping field yang diunggah."}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button type="button" onClick={submitTask} disabled={!adapterReady || !selectedDomain || busyAction !== ""}>
                  {busyAction.startsWith("Buat task") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Jalankan validasi
                </Button>
                <Button type="button" variant="outline" onClick={() => refetchTasks()} disabled={loadingTasks}>
                  {loadingTasks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Muat task terbaru
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">Task dan hasil validasi</p>
                  <p className="text-sm text-slate-500">Bagian ini dipakai buat cek proses background sampai item hasilnya muncul.</p>
                </div>
                <Button type="button" variant="outline" onClick={refreshTask} disabled={!activeTaskId || busyAction !== ""}>
                  {busyAction === "Status task" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                  Cek status task
                </Button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
                    Riwayat task
                  </div>
                  <div className="max-h-[320px] overflow-auto">
                    {tasks.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">Belum ada task yang tercatat.</div>
                    ) : (
                      tasks.map((task) => {
                        const active = String(task.id) === activeTaskId;
                        return (
                          <button
                            key={String(task.id)}
                            type="button"
                            onClick={() => setActiveTaskId(String(task.id))}
                            className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition ${active ? "bg-sky-50" : "bg-white hover:bg-slate-50"}`}
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-900">{task.domain_name || task.domain_code || "Task"}</p>
                              <p className="mt-1 text-xs text-slate-500">{String(task.id)}</p>
                            </div>
                            <Badge variant="outline">{task.status || "queued"}</Badge>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Detail task aktif</p>
                    {activeTask?.status && <Badge variant="outline">{activeTask.status}</Badge>}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Klasifikasi</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">{activeTask?.classification || "-"}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Update terakhir</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">{activeTask?.updated_at || "-"}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Error log</p>
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-700">
                      {activeTask?.error_log ? prettyJson(activeTask.error_log) : "Belum ada error log."}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">Item hasil validasi</p>
                      <p className="text-xs text-emerald-800">Daftar ini mengambil koleksi OGC berdasarkan domain yang sedang dipilih.</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => refetchItems()} disabled={!selectedDomain?.domainCode || loadingItems}>
                    {loadingItems ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Muat item
                  </Button>
                </div>
                <pre className="mt-4 max-h-[260px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white/80 p-3 text-xs leading-6 text-slate-700">
                  {prettyJson(validatedItems)}
                </pre>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-slate-950 p-5 text-slate-100 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Output</p>
              <p className="mt-3 text-lg font-semibold">{outputTitle}</p>
              <pre className="mt-4 max-h-[980px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-200">
                {prettyJson(outputPayload)}
              </pre>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Catatan lanjutannya</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>Remote source perlu diregister dulu hanya untuk jalur GeoServer dan ArcGIS.</p>
                <p>GeoJSON dan shapefile bisa langsung bikin task tanpa langkah koneksi awal.</p>
                <p>Bagian publish ke connector belum saya paksakan tampil sebagai selesai kalau endpoint pasangannya belum dibuka di kontrak adapter yang sekarang.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
