import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, UploadCloud, AlertCircle, BookOpen, ShieldAlert, Layers3, Link2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { AdapterCollectionPicker } from "@/components/datasets/AdapterCollectionPicker";
import { useSchemas } from "@/api/hooks/useSchemas";
import { useVocabularies } from "@/api/hooks/useVocabularies";
import { useDatasets, usePublishDataset } from "@/api/hooks/useDatasets";
import { useProviders } from "@/api/hooks/useProviders";
import { useAuth } from "@/context/AuthContext";
import { useRuntime } from "@/context/RuntimeContext";
import { DOMAINS } from "@/lib/fulfillment";
import { adapterServiceApi } from "@/api/services/adapter-service";

const DOMAIN_CODE_TO_KEY: Record<string, string> = {
  WK: "wilayah_kerja",
  FLD: "lapangan",
  SEI: "seismik",
  WLL: "sumur",
  FP: "fasilitas",
};

const DEFAULT_CLASS: Record<string, string> = {
  wilayah_kerja: "L1",
  lapangan: "L2",
  fasilitas: "L2",
  sumur: "L3",
  seismik: "L3",
};

const buildAdapterRuntime = (domainCode: string) => ({
  version: "1.0",
  domain_code: domainCode,
  source_type: "OGC_API_FEATURES",
  supports_bbox: true,
  supports_head: true,
  collection_path: "/api/v1/ogc/ogc/collections/{domain_code}/items",
  response_format: "GEOJSON_FEATURE_COLLECTION",
  fixed_query_params: {},
  allowed_query_params: {},
  supports_limit_offset: true,
  forward_unknown_params: false,
  include_metadata_default: false,
});

const LEVELS = ["L0", "L1", "L2", "L3", "L4"];
const PROTOCOLS = ["OGC_API_FEATURES", "REST_API"];

interface VocabularyOption {
  vocabulary_id: string;
  name: string;
}

interface SchemaOption {
  schema_id: string;
  vocabulary_id?: string;
  vocabulary_name?: string | null;
  version: string;
  status?: string;
}

export function PublishDatasetDialog({
  open,
  onOpenChange,
  presetAdapterCollectionCode = null,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  // Prefill koleksi adapter (domain_code) saat dialog dibuka dari CTA "Buat dataset dari koleksi ini".
  presetAdapterCollectionCode?: string | null;
}) {
  const navigate = useNavigate();
  const { participantId, role } = useAuth();
  const { runtimeConfig } = useRuntime();
  const adapterEndpoint = runtimeConfig?.adapterEndpoint ?? "";
  // URL dataset yang DISIMPAN harus absolut (connector fetch di sisi BE), bukan path browser
  // "/adapter-service". Pakai upstream absolut; fallback ke adapterEndpoint bila upstreams kosong.
  const adapterUpstreamUrl = runtimeConfig?.upstreams?.adapterEndpoint ?? adapterEndpoint;
  const { data: schemas } = useSchemas();
  const { data: vocabularies } = useVocabularies();
  const { data: existingDatasets } = useDatasets();
  const { data: providersData } = useProviders();
  const mutation = usePublishDataset();

  // Dataset harus punya provider (pemilik data). Operator KKKS otomatis pakai
  // participant-nya sendiri. SuperAdmin/akun tanpa participant boleh memilih provider,
  // sehingga bisa publish untuk sebuah organisasi di domain baru TANPA harus login
  // sebagai operator KKKS (binding participant↔domain tidak wajib untuk publish).
  const isSuperAdmin = role === "SUPER_ADMIN";
  const providerOptions = useMemo(
    () =>
      ((providersData ?? []) as Array<{ provider_id: string; provider_name: string; organization_type?: string }>)
        .filter((p) => (p.organization_type ?? "").toUpperCase() === "ENTERPRISE")
        .sort((a, b) => (a.provider_name ?? "").localeCompare(b.provider_name ?? "")),
    [providersData],
  );
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const effectiveProviderId = participantId ?? (selectedProviderId || null);

  const [domainKey, setDomainKey] = useState("wilayah_kerja");
  const [schemaId, setSchemaId] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  // Default REST_API: connector menarik URL apa adanya. OGC_API_FEATURES hanya
  // untuk endpoint adapter (yang mengisi runtime.collection_path) — dipilih otomatis
  // saat pakai tombol "Dari Adapter". Salah pilih = transfer isi ngawur/gagal.
  const [protocol, setProtocol] = useState("REST_API");
  const [accessType, setAccessType] = useState("PUBLIC");
  const [classification, setClassification] = useState("L1");
  const [version, setVersion] = useState("1.0.0");
  const [runtime, setRuntime] = useState<Record<string, unknown> | null>(null);
  const [touchedName, setTouchedName] = useState(false);

  const [adapterCollections, setAdapterCollections] = useState<Array<{ id: string; domain_code: string; title: string }>>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [showAdapterPicker, setShowAdapterPicker] = useState(false);
  const [pickerEmpty, setPickerEmpty] = useState(false);
  // Ringkasan koleksi yang barusan terhubung (untuk chip di dekat URL).
  const [connectedCollection, setConnectedCollection] = useState<{ domain_code: string; title: string } | null>(null);

  const applyAdapterCollection = useCallback((col: { id: string; domain_code: string; title: string }) => {
    const baseUrl = adapterUpstreamUrl.replace(/\/$/, "");
    setUrl(baseUrl);
    setRuntime(buildAdapterRuntime(col.domain_code));
    setProtocol("OGC_API_FEATURES");
    setAccessType("PUBLIC");
    const mappedKey = DOMAIN_CODE_TO_KEY[col.domain_code];
    if (mappedKey) setDomainKey(mappedKey);
    setName((prev) => (prev && prev.trim() && !/ - Data$/.test(prev) ? prev : col.title || col.domain_code));
    setConnectedCollection({ domain_code: col.domain_code, title: col.title || col.domain_code });
    setShowAdapterPicker(false);
    toast.success(`Endpoint adapter disiapkan: ${col.title || col.domain_code}`);
  }, [adapterUpstreamUrl]);

  const loadAdapterCollections = useCallback(async (opts?: { preselectCode?: string }) => {
    if (!adapterEndpoint) {
      setPickerEmpty(true);
      setShowAdapterPicker(true);
      return;
    }
    setLoadingCollections(true);
    try {
      const res = await adapterServiceApi.listCollections() as { collections?: Array<{ id: string; domain_code: string; title: string }> };
      const cols = res?.collections ?? [];
      setAdapterCollections(cols);
      setPickerEmpty(cols.length === 0);
      setShowAdapterPicker(true);
      if (opts?.preselectCode) {
        const match = cols.find((c) => c.domain_code.toUpperCase() === opts.preselectCode!.toUpperCase());
        if (match) applyAdapterCollection(match);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Gagal memuat koleksi adapter."));
    } finally {
      setLoadingCollections(false);
    }
  }, [adapterEndpoint, applyAdapterCollection]);

  const vocabMap = useMemo(() => {
    const m: Record<string, string> = {};
    (vocabularies ?? []).forEach((vocabulary) => {
      const v = vocabulary as VocabularyOption;
      m[v.vocabulary_id] = v.name;
    });
    return m;
  }, [vocabularies]);

  const schemaList = useMemo(() =>
    (schemas ?? []).map((schema) => {
      const s = schema as SchemaOption;
      return {
        schema_id: s.schema_id,
        vocabulary_id: s.vocabulary_id ?? "",
        vocabulary_name: vocabMap[s.vocabulary_id ?? ""] || s.vocabulary_name || null,
        version: s.version,
        status: s.status,
      };
    }),
  [schemas, vocabMap]);

  const domainLabel = DOMAINS.find((d) => d.key === domainKey)?.label ?? "";
  const domainSub = DOMAINS.find((d) => d.key === domainKey)?.sub ?? "";

  const selectedSchema = useMemo(
    () => schemaList.find((s) => s.schema_id === schemaId) ?? null,
    [schemaId, schemaList],
  );

  const { domainSchemas, otherSchemas } = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const dl = normalize(domainLabel);
    const primary: typeof schemaList = [];
    const secondary: typeof schemaList = [];
    schemaList.forEach((s) => {
      const vn = normalize(s.vocabulary_name ?? "");
      if (vn.includes(dl) || dl.includes(vn)) primary.push(s);
      else secondary.push(s);
    });
    return { domainSchemas: primary, otherSchemas: secondary };
  }, [schemaList, domainLabel]);

  const selectedSchemaMatchesDomain = useMemo(
    () => !selectedSchema || domainSchemas.some((schema) => schema.schema_id === selectedSchema.schema_id),
    [domainSchemas, selectedSchema],
  );

  const duplicateDataset = useMemo(() => {
    if (!schemaId || !existingDatasets) return null;
    const sel = selectedSchema;
    if (!sel) return null;
    // D5: bandingkan schema_id (identitas stabil), bukan schema_name yang tak pernah cocok.
    return (existingDatasets as Array<{ dataset_name: string; schema_id?: string; schema_name?: string }>).find(
      (d) => (d.schema_id && d.schema_id === sel.schema_id) || d.schema_name === sel.schema_id,
    ) ?? null;
  }, [schemaId, existingDatasets, selectedSchema]);

  const duplicateName = useMemo(() => {
    if (!name.trim() || !version.trim() || !existingDatasets) return false;
    return (existingDatasets as Array<{ dataset_name: string; version?: string }>).some(
      (d) => d.dataset_name?.trim().toLowerCase() === name.trim().toLowerCase()
        && (d.version ?? "") === version.trim(),
    );
  }, [name, version, existingDatasets]);

  useEffect(() => {
    if (!open) return;
    setClassification(DEFAULT_CLASS[domainKey] ?? "L2");
    if (!touchedName) setName(`${domainLabel} - Data`);
    const match = schemaList.find((s) => (s.vocabulary_name ?? "").toLowerCase().includes(domainLabel.toLowerCase()));
    setSchemaId(match?.schema_id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, domainKey, schemas]);

  useEffect(() => {
    if (open) {
      setTouchedName(false);
      setUrl("");
      setRuntime(null);
      setProtocol("REST_API");
      setAccessType("PUBLIC");
      setVersion("1.0.0");
      setSelectedProviderId("");
      setConnectedCollection(null);
      setShowAdapterPicker(false);
      setPickerEmpty(false);
      // Prefill dari CTA "Buat dataset dari koleksi ini": muat koleksi lalu auto-pilih.
      if (presetAdapterCollectionCode) {
        void loadAdapterCollections({ preselectCode: presetAdapterCollectionCode });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // D3 (soft): klasifikasi L2–L4 lazimnya tidak PUBLIC (Juknis). FE hanya menyarankan
  // default aman + warning — TIDAK memblokir, karena validator finalnya ada di BE.
  const RESTRICTED_LEVELS = ["L2", "L3", "L4"];
  useEffect(() => {
    if (RESTRICTED_LEVELS.includes(classification) && accessType === "PUBLIC") {
      setAccessType("PRIVATE");
      toast.info("Akses diubah ke PRIVATE karena klasifikasi terbatas. Boleh diubah balik ke PUBLIC kalau memang disengaja.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classification]);

  const handleSchemaChange = (id: string) => {
    setSchemaId(id);
  };

  const statusColor: Record<string, string> = {
    PUBLISHED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    DRAFT: "bg-amber-100 text-amber-700 border-amber-200",
    DEPRECATED: "bg-rose-100 text-rose-700 border-rose-200",
  };

  // Duplikat schema / nama+versi TIDAK lagi memblokir tombol — cukup peringatan.
  // 1 domain = 1 schema itu normal (dari Setup Juknis), jadi dataset ke-2 dst pasti
  // "duplikat schema"; memblokirnya cuma bikin frustrasi. BE tetap penentu akhir (409).
  const valid = !!effectiveProviderId && !!schemaId && selectedSchemaMatchesDomain && name.trim().length >= 3
    && /^https?:\/\//.test(url) && /^\d+\.\d+\.\d+$/.test(version);

  const submit = async () => {
    if (!effectiveProviderId) {
      return toast.error(isSuperAdmin ? "Pilih provider (penyedia data) dulu." : "Akun ini tak tertaut ke participant KKKS.");
    }
    if (!schemaId) return toast.error("Pilih schema (jalankan Setup Juknis bila kosong).");
    if (!selectedSchemaMatchesDomain) {
      return toast.error("Schema yang dipilih bukan milik domain aktif. Pilih schema yang sesuai dulu.");
    }
    if (!valid) return toast.error("Lengkapi nama (>=3), URL (http/https), versi X.Y.Z.");
    // Duplikat = peringatan, bukan blokir. Kirim tetap jalan; BE yang menolak kalau perlu.
    if (duplicateName) {
      toast.warning(`Sudah ada dataset "${name.trim()}" versi ${version}. Publish tetap dikirim — kalau ditolak, naikkan versinya (mis. ${version.replace(/(\d+)$/, (m) => String(Number(m) + 1))}).`, { duration: 8000 });
    } else if (duplicateDataset) {
      toast.warning(`Schema ini juga dipakai "${duplicateDataset.dataset_name}". Normal untuk 1 domain — publish tetap dikirim.`, { duration: 6000 });
    }
    // D3 (soft): warning saja — keputusan final di BE, FE tidak memblokir.
    if (classification === "L4") {
      toast.warning("Perhatian: L4 (RAHASIA) menurut Juknis tidak dipublikasikan. Publish tetap dikirim — BE yang memutuskan.", { duration: 8000 });
    } else if (RESTRICTED_LEVELS.includes(classification) && accessType === "PUBLIC") {
      toast.warning("Perhatian: klasifikasi terbatas (L2–L4) dengan akses PUBLIC. Publish tetap dikirim — BE yang memutuskan.", { duration: 8000 });
    }
    // OGC_API_FEATURES butuh runtime collection path (dari endpoint adapter). Tanpa itu,
    // connector menempel /collections/... ke URL dan merusaknya (transfer isi ngawur).
    if (protocol === "OGC_API_FEATURES" && !(runtime && (runtime as Record<string, unknown>).collection_path)) {
      return toast.error(
        "Protokol OGC_API_FEATURES butuh endpoint adapter (runtime collection path). Pakai tombol \"Dari Adapter\", atau ganti protokol ke REST_API untuk URL WFS/REST langsung.",
        { duration: 9000 },
      );
    }
    try {
      const baseUrl = url.trim().replace(/\/$/, "");
      await mutation.mutateAsync({
        provider_id: effectiveProviderId,
        schema_id: schemaId,
        name: name.trim(),
        version,
        domainKey,
        url: baseUrl,
        protocol,
        classification,
        access_type: accessType,
        auth_strategy: null,
        documentation_url: runtime ? `${baseUrl}/docs` : baseUrl,
        runtime,
      });
      toast.success("Dataset dipublikasikan (PUBLISHED).");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal publish dataset"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-accent" /> Tambah Dataset
          </DialogTitle>
          <DialogDescription>
            Lengkapi domain, schema, klasifikasi, versi, dan endpoint dataset. Setelah disimpan, dataset langsung masuk sebagai PUBLISHED.
          </DialogDescription>
        </DialogHeader>

        {!participantId && isSuperAdmin && (
          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <Label className="text-xs">Provider (penyedia data)</Label>
            <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
              <SelectTrigger><SelectValue placeholder="Pilih participant penyedia data" /></SelectTrigger>
              <SelectContent>
                {providerOptions.length === 0 ? (
                  <SelectItem value="__none" disabled>Belum ada participant penyedia</SelectItem>
                ) : providerOptions.map((p) => (
                  <SelectItem key={p.provider_id} value={p.provider_id}>{p.provider_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              SuperAdmin bisa publish atas nama provider mana pun — tidak perlu login sebagai operator KKKS, dan participant tidak harus terikat ke domain ini.
            </p>
          </div>
        )}

        {!participantId && !isSuperAdmin && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            <AlertCircle className="w-4 h-4" /> Akun tidak tertaut participant KKKS - login sebagai operator KKKS.
          </div>
        )}

        <div className="space-y-4 py-1 overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Select value={domainKey} onValueChange={setDomainKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Klasifikasi</Label>
              <Select value={classification} onValueChange={setClassification}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}{l === "L4" ? " — RAHASIA (Juknis: tidak dipublikasikan)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Schema (kamus data domain)</Label>
            <Select value={schemaId} onValueChange={handleSchemaChange}>
              <SelectTrigger>
                <SelectValue placeholder={domainSchemas.length ? "Pilih schema..." : "Belum ada schema - jalankan Setup Juknis"} />
              </SelectTrigger>
              <SelectContent>
                {domainSchemas.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" /> Tidak ada schema untuk domain <strong>{domainLabel}</strong>
                  </div>
                )}
                {domainSchemas.map((s) => (
                  <SelectItem key={s.schema_id} value={s.schema_id}>
                    <span className="flex items-center gap-2">
                      {s.vocabulary_name ?? "Schema"} � v{s.version}
                      {s.status && s.status !== "PUBLISHED" && <span className="text-[10px] text-amber-500">[{s.status}]</span>}
                    </span>
                  </SelectItem>
                ))}
                {otherSchemas.length > 0 && (
                  <>
                    <div className="px-2 py-1 mt-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide border-t pt-2">
                      Domain lain
                    </div>
                    {otherSchemas.map((s) => (
                      <SelectItem key={s.schema_id} value={s.schema_id} disabled className="text-muted-foreground">
                        {s.vocabulary_name ?? "Schema"} � v{s.version} [bukan {domainLabel}]
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            {selectedSchema && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <BookOpen className="w-4 h-4 text-accent shrink-0" />
                      {selectedSchema.vocabulary_name ?? "Schema"}
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-6">
                      Vocabulary untuk domain <strong>{domainLabel}</strong> ({domainSub}) � versi <code className="text-xs bg-muted px-1 rounded">{selectedSchema.version}</code>
                    </p>
                  </div>
                  {selectedSchema.status && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusColor[selectedSchema.status] ?? ""}`}>
                      {selectedSchema.status}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {selectedSchema && !selectedSchemaMatchesDomain && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                Schema yang sedang terpilih berasal dari domain lain. Publish ditahan sampai operator memilih schema untuk domain <strong>{domainLabel}</strong>.
              </div>
            )}

            {duplicateDataset && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                Schema ini juga dipakai <span className="font-medium">"{duplicateDataset.dataset_name}"</span>. Normal untuk 1 domain (semua dataset pakai schema Juknis yang sama) — bukan penghalang publish.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nama Dataset *</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setTouchedName(true); }} placeholder="mis. Sumur (Well) - PHE" />
            {duplicateName && (
              <p className="text-xs text-amber-700 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Sudah ada <strong>"{name.trim()}"</strong> versi <strong>{version}</strong>. Boleh tetap publish, tapi kalau ditolak BE — naikkan versinya.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Protokol</Label>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROTOCOLS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Akses</Label>
              <Select value={accessType} onValueChange={setAccessType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                  <SelectItem value="PRIVATE">PRIVATE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Versi</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sumber Endpoint *</Label>
            {/* Pilihan sumber eksplisit: adapter (rekomendasi hasil ingest) vs URL manual. */}
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-[11px] leading-5 text-muted-foreground">
                <strong className="text-foreground">Dari Adapter</strong> (rekomendasi untuk data hasil ingest) — koleksi OGC siap pakai, runtime otomatis terisi.
                Atau isi <strong className="text-foreground">URL manual</strong> di bawah untuk WFS/REST langsung.
              </p>
              {adapterEndpoint && (
                <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs text-accent gap-1" onClick={() => loadAdapterCollections()} disabled={loadingCollections}>
                  {loadingCollections ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers3 className="w-3 h-3" />}
                  Dari Adapter
                </Button>
              )}
            </div>
            <Input value={url} onChange={(e) => { setUrl(e.target.value); setRuntime(null); setConnectedCollection(null); }} placeholder="https://adapter-host:8584 atau endpoint final" />

            {showAdapterPicker && !pickerEmpty && adapterCollections.length > 0 && (
              <AdapterCollectionPicker
                collections={adapterCollections}
                onPick={applyAdapterCollection}
                onClose={() => setShowAdapterPicker(false)}
              />
            )}

            {/* Empty-state ber-CTA: adapter belum diset / tidak ada koleksi. */}
            {((showAdapterPicker && pickerEmpty) || !adapterEndpoint) && showAdapterPicker && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-xs text-amber-800">
                  {adapterEndpoint
                    ? "Belum ada koleksi di adapter. Ingest data dulu lewat Pengaturan → Adapter agar muncul sebagai koleksi siap pakai."
                    : "Adapter endpoint belum dikonfigurasi. Setup adapter dulu untuk memakai koleksi hasil ingest."}
                </p>
                <Button type="button" variant="outline" size="sm" className="h-8 w-full border-amber-300 text-amber-800 text-xs" onClick={() => navigate("/settings?tab=adapter")}>
                  <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Setup Adapter
                </Button>
              </div>
            )}

            {/* Chip ringkasan koneksi koleksi. */}
            {connectedCollection && (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                Terhubung: koleksi <strong>{connectedCollection.domain_code}</strong> — {connectedCollection.title} <span className="text-emerald-600">(adapter)</span>
              </div>
            )}

            {runtime && (
              <pre className="rounded-lg bg-muted p-3 text-[10px] font-mono overflow-auto max-h-40">{JSON.stringify(runtime, null, 2)}</pre>
            )}

            <p className="text-xs text-muted-foreground">
              Kategori (WK, FLD, …) berasal dari tag yang dipilih saat ingest di <strong>Pengaturan → Adapter</strong> — bukan deteksi otomatis.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={submit} disabled={!valid || mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}