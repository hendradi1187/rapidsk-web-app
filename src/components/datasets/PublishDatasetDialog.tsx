import { useEffect, useMemo, useState } from "react";
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
import { Loader2, UploadCloud, AlertCircle, BookOpen, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { useSchemas } from "@/api/hooks/useSchemas";
import { useDatasets, usePublishDataset } from "@/api/hooks/useDatasets";
import { useAuth } from "@/context/AuthContext";
import { DOMAINS } from "@/lib/fulfillment";

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
  const { data: schemas } = useSchemas();
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

  const schemaList = (schemas ?? []) as Array<{
    schema_id: string;
    vocabulary_name?: string | null;
    version: string;
    status?: string;
  }>;
  const domainLabel = DOMAINS.find((d) => d.key === domainKey)?.label ?? "";

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
    && !blockedByDuplicate;

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

  const schemaOptions = useMemo(
    () => schemaList.map((s) => ({ id: s.schema_id, label: `${s.vocabulary_name ?? "Schema"} · v${s.version}` })),
    [schemaList],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-accent" /> Publish Dataset
          </DialogTitle>
          <DialogDescription>
            Daftarkan produk data Anda untuk salah satu domain wajib. Status langsung PUBLISHED.
          </DialogDescription>
        </DialogHeader>

        {!participantId && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            <AlertCircle className="w-4 h-4" /> Akun tidak tertaut participant KKKS — login sebagai operator KKKS.
          </div>
        )}

        <div className="space-y-4 py-1">
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
                {schemaOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Info card schema terpilih */}
            {selectedSchema && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <BookOpen className="w-4 h-4 text-accent" />
                    {selectedSchema.vocabulary_name ?? "Schema"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">v{selectedSchema.version}</span>
                    {selectedSchema.status && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor[selectedSchema.status] ?? ""}`}>
                        {selectedSchema.status}
                      </Badge>
                    )}
                  </div>
                </div>
                {selectedSchema.status === "DRAFT" && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Schema masih DRAFT — belum PUBLISHED, mungkin belum final.
                  </p>
                )}
                {selectedSchema.status === "DEPRECATED" && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Schema DEPRECATED — pertimbangkan pakai versi terbaru.
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
            <Label>Endpoint URL *</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (OGC API Features / REST)" />
            <p className="text-xs text-muted-foreground">
              URL sumber data Anda (mis. layanan OGC API Features). Untuk transfer internal, gunakan host yang terjangkau fabric.
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
