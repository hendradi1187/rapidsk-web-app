import { useEffect, useMemo, useState, useCallback } from "react";
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
import { Loader2, UploadCloud, AlertCircle, BookOpen, ShieldAlert, CheckCircle2, Layers3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { useSchemas } from "@/api/hooks/useSchemas";
import { useVocabularies } from "@/api/hooks/useVocabularies";
import { useDatasets, usePublishDataset } from "@/api/hooks/useDatasets";
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
  wilayah_kerja: "L1", lapangan: "L2", fasilitas: "L2", sumur: "L3", seismik: "L3",
};
const LEVELS = ["L0", "L1", "L2", "L3", "L4"];
const PROTOCOLS = ["OGC_API_FEATURES", "REST_API"];

export function PublishDatasetDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { participantId } = useAuth();
  const { runtimeConfig } = useRuntime();
  const adapterEndpoint = runtimeConfig?.adapterEndpoint ?? "";
  const { data: schemas } = useSchemas();
  const { data: vocabularies } = useVocabularies();
  const { data: existingDatasets } = useDatasets();
  const mutation = usePublishDataset();

  const [domainKey, setDomainKey] = useState("wilayah_kerja");
  const [schemaId, setSchemaId] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [protocol, setProtocol] = useState("OGC_API_FEATURES");
  const [classification, setClassification] = useState("L1");
  const [version, setVersion] = useState("1.0.0");
  const [touchedName, setTouchedName] = useState(false);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);

  // Adapter picker
  const [adapterCollections, setAdapterCollections] = useState<Array<{ id: string; domain_code: string; title: string }>>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [showAdapterPicker, setShowAdapterPicker] = useState(false);

  const loadAdapterCollections = useCallback(async () => {
    if (!adapterEndpoint) return toast.error("Adapter endpoint belum dikonfigurasi di Setup.");
    setLoadingCollections(true);
    try {
      const res = await adapterServiceApi.listCollections() as { collections?: Array<{ id: string; domain_code: string; title: string }> };
      const cols = res?.collections ?? [];
      setAdapterCollections(cols);
      setShowAdapterPicker(true);
      if (cols.length === 0) toast.info("Tidak ada koleksi di adapter. Ingest data dulu di Settings → Adapter.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Gagal memuat koleksi adapter."));
    } finally {
      setLoadingCollections(false);
    }
  }, [adapterEndpoint]);

  const applyAdapterCollection = (col: { id: string; domain_code: string; title: string }) => {
    const ogcUrl = `${adapterEndpoint}/api/v1/ogc/collections/${col.domain_code}/items`;
    setUrl(ogcUrl);
    setProtocol("OGC_API_FEATURES");
    const mappedKey = DOMAIN_CODE_TO_KEY[col.domain_code];
    if (mappedKey) setDomainKey(mappedKey);
    if (!touchedName) setName(col.title || col.domain_code);
    setShowAdapterPicker(false);
    toast.success(`URL diisi dari adapter: ${col.title || col.domain_code}`);
  };

  // vocab lookup: vocabulary_id → name
  const vocabMap = useMemo(() => {
    const m: Record<string, string> = {};
    (vocabularies ?? []).forEach((v: any) => { m[v.vocabulary_id] = v.name; });
    return m;
  }, [vocabularies]);

  // enrich schema list — pakai vocab name dari join, fallback ke field vocabulary_name BE
  const schemaList = useMemo(() =>
    (schemas ?? []).map((s: any) => ({
      schema_id: s.schema_id,
      vocabulary_id: s.vocabulary_id ?? "",
      vocabulary_name: vocabMap[s.vocabulary_id ?? ""] || s.vocabulary_name || null,
      version: s.version,
      status: s.status,
    })),
  [schemas, vocabMap]);

  const domainLabel = DOMAINS.find((d) => d.key === domainKey)?.label ?? "";
  const domainSub   = DOMAINS.find((d) => d.key === domainKey)?.sub ?? "";

  const selectedSchema = useMemo(
    () => schemaList.find((s) => s.schema_id === schemaId) ?? null,
    [schemaId, schemaList],
  );

  const duplicateDataset = useMemo(() => {
    if (!schemaId || !existingDatasets) return null;
    const sel = selectedSchema;
    if (!sel) return null;
    const schemaLabel = `${sel.vocabulary_name ?? ""} · v${sel.version}`;
    return (existingDatasets as Array<{ dataset_name: string; schema_name: string }>).find(
      (d) => d.schema_name === schemaLabel || d.schema_name === sel.schema_id,
    ) ?? null;
  }, [schemaId, existingDatasets, selectedSchema]);

  const duplicateName = useMemo(() => {
    if (!name.trim() || !version.trim() || !existingDatasets) return false;
    return (existingDatasets as Array<{ dataset_name: string; version?: string }>).some(
      (d) => d.dataset_name?.trim().toLowerCase() === name.trim().toLowerCase()
        && (d.version ?? "") === version.trim(),
    );
  }, [name, version, existingDatasets]);

  // auto-pilih schema yang vocab-nya cocok domain; prefill nama & klasifikasi
  useEffect(() => {
    if (!open) return;
    setClassification(DEFAULT_CLASS[domainKey] ?? "L2");
    if (!touchedName) setName(`${domainLabel} — Data`);
    const match = schemaList.find((s) => (s.vocabulary_name ?? "").toLowerCase().includes(domainLabel.toLowerCase()));
    setSchemaId((match ?? schemaList[0])?.schema_id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, domainKey, schemas]);

  useEffect(() => {
    if (open) {
      setTouchedName(false);
      setUrl("");
      setVersion("1.0.0");
    }
  }, [open]);

  const handleSchemaChange = (id: string) => {
    setSchemaId(id);
    setConfirmedDuplicate(false);
  };

  const statusColor: Record<string, string> = {
    PUBLISHED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    DRAFT: "bg-amber-100 text-amber-700 border-amber-200",
    DEPRECATED: "bg-rose-100 text-rose-700 border-rose-200",
  };

  const blockedByDuplicate = !!duplicateDataset && !confirmedDuplicate;
  const valid = !!participantId && !!schemaId && name.trim().length >= 3
    && /^https?:\/\//.test(url) && /^\d+\.\d+\.\d+$/.test(version)
    && !blockedByDuplicate && !duplicateName;

  const submit = async () => {
    if (!participantId) return toast.error("Akun ini tak tertaut ke participant KKKS.");
    if (!schemaId) return toast.error("Pilih schema (jalankan Setup Juknis bila kosong).");
    if (!valid) return toast.error("Lengkapi nama (≥3), URL (http/https), versi X.Y.Z.");
    try {
      await mutation.mutateAsync({
        provider_id: participantId,
        schema_id: schemaId,
        name: name.trim(),
        version,
        domainKey,
        url: url.trim(),
        protocol,
        classification,
      });
      toast.success("Dataset dipublikasikan (PUBLISHED).");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal publish dataset"));
    }
  };

  // Schema dikategorikan: cocok domain aktif (primary) vs domain lain (secondary)
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

  const schemaOptions = useMemo(() => [
    ...domainSchemas.map((s) => ({
      id: s.schema_id,
      label: `${s.vocabulary_name ?? "Schema"} · v${s.version}`,
      status: s.status,
      forDomain: true,
    })),
    ...otherSchemas.map((s) => ({
      id: s.schema_id,
      label: `${s.vocabulary_name ?? "Schema"} · v${s.version}`,
      status: s.status,
      forDomain: false,
    })),
  ], [domainSchemas, otherSchemas]);

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

        {!participantId && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            <AlertCircle className="w-4 h-4" /> Akun tidak tertaut participant KKKS — login sebagai operator KKKS.
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
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Schema (kamus data domain)</Label>
            <Select value={schemaId} onValueChange={handleSchemaChange}>
              <SelectTrigger>
                <SelectValue placeholder={schemaOptions.length ? "Pilih schema…" : "Belum ada schema — jalankan Setup Juknis"} />
              </SelectTrigger>
              <SelectContent>
                {domainSchemas.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Tidak ada schema untuk domain <strong>{domainLabel}</strong>
                  </div>
                )}
                {domainSchemas.length > 0 && (
                  <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                    ✓ Untuk domain {domainLabel}
                  </div>
                )}
                {domainSchemas.map((s) => (
                  <SelectItem key={s.schema_id} value={s.schema_id}>
                    <span className="flex items-center gap-2">
                      {s.vocabulary_name ?? "Schema"} · v{s.version}
                      {s.status && s.status !== "PUBLISHED" && (
                        <span className="text-[10px] text-amber-500">[{s.status}]</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
                {otherSchemas.length > 0 && (
                  <>
                    <div className="px-2 py-1 mt-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide border-t pt-2">
                      Domain lain
                    </div>
                    {otherSchemas.map((s) => (
                      <SelectItem key={s.schema_id} value={s.schema_id} className="text-muted-foreground">
                        <span className="flex items-center gap-2">
                          {s.vocabulary_name ?? "Schema"} · v{s.version}
                          <span className="text-[10px] text-rose-400">[bukan {domainLabel}]</span>
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Info card schema terpilih */}
            {selectedSchema && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <BookOpen className="w-4 h-4 text-accent shrink-0" />
                      {selectedSchema.vocabulary_name
                        ? <span>{selectedSchema.vocabulary_name}</span>
                        : <span className="text-muted-foreground italic">Nama vocab tidak tersedia</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-6">
                      Vocabulary untuk domain <strong>{domainLabel}</strong> ({domainSub}) · versi <code className="text-xs bg-muted px-1 rounded">{selectedSchema.version}</code>
                    </p>
                  </div>
                  {selectedSchema.status && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusColor[selectedSchema.status] ?? ""}`}>
                      {selectedSchema.status}
                    </Badge>
                  )}
                </div>
                {!selectedSchema.vocabulary_name && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Nama vocab kosong — schema ini mungkin belum punya vocabulary terdaftar. Cek di menu Schemas.
                  </p>
                )}
                {selectedSchema.status === "DRAFT" && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Schema masih DRAFT — belum PUBLISHED, mungkin belum final.
                  </p>
                )}
                {selectedSchema.status === "DEPRECATED" && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Schema DEPRECATED — gunakan versi terbaru.
                  </p>
                )}
              </div>
            )}

            {/* Duplicate blocker */}
            {duplicateDataset && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Schema sudah dipakai</p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      Dataset <span className="font-semibold">"{duplicateDataset.dataset_name}"</span> sudah
                      menggunakan schema ini. Setiap schema seharusnya unik per domain.
                    </p>
                  </div>
                </div>
                {!confirmedDuplicate ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 text-xs h-8"
                    onClick={() => setConfirmedDuplicate(true)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Saya mengerti — tetap gunakan schema ini
                  </Button>
                ) : (
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Dikonfirmasi — Anda bisa lanjut publish.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nama Dataset *</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setTouchedName(true); }} placeholder="mis. Sumur (Well) — PHE" />
            {duplicateName && (
              <p className="text-xs text-rose-600 flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Dataset dengan nama <strong>"{name.trim()}"</strong> versi <strong>{version}</strong> sudah ada. Ganti nama atau naikkan versi.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Protokol</Label>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROTOCOLS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Versi</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Endpoint URL *</Label>
              {adapterEndpoint && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-accent gap-1"
                  onClick={loadAdapterCollections}
                  disabled={loadingCollections}
                >
                  {loadingCollections
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Layers3 className="w-3 h-3" />}
                  Dari Adapter
                </Button>
              )}
            </div>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (OGC API Features / REST)" />

            {/* Adapter collection picker */}
            {showAdapterPicker && adapterCollections.length > 0 && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-accent flex items-center gap-1.5">
                    <Layers3 className="w-3.5 h-3.5" /> Koleksi tersedia di adapter
                  </p>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAdapterPicker(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1">
                  {adapterCollections.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => applyAdapterCollection(col)}
                      className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-accent/10 border border-transparent hover:border-accent/20 transition-colors flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-medium">{col.title || col.domain_code}</span>
                        <span className="ml-2 text-xs text-muted-foreground font-mono">{col.domain_code}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-accent/40 text-accent">OGC</Badge>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  URL endpoint akan diisi otomatis dari koleksi OGC adapter Anda.
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              URL sumber data (OGC API Features / REST). Gunakan tombol <strong>Dari Adapter</strong> jika data sudah diingest lewat adapter.
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
