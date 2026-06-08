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
import { Loader2, UploadCloud, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSchemas } from "@/api/hooks/useSchemas";
import { usePublishDataset } from "@/api/hooks/useDatasets";
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
  const mutation = usePublishDataset();

  const [domainKey, setDomainKey] = useState("wilayah_kerja");
  const [schemaId, setSchemaId] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [protocol, setProtocol] = useState("OGC_API_FEATURES");
  const [classification, setClassification] = useState("L1");
  const [version, setVersion] = useState("1.0.0");
  const [touchedName, setTouchedName] = useState(false);

  const schemaList = (schemas ?? []) as Array<{ schema_id: string; vocabulary_name?: string | null; version: string }>;
  const domainLabel = DOMAINS.find((d) => d.key === domainKey)?.label ?? "";

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

  const valid = !!participantId && !!schemaId && name.trim().length >= 3 && /^https?:\/\//.test(url) && /^\d+\.\d+\.\d+$/.test(version);

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
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Gagal publish dataset");
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
            <Select value={schemaId} onValueChange={setSchemaId}>
              <SelectTrigger><SelectValue placeholder={schemaOptions.length ? "Pilih schema" : "Belum ada schema — jalankan Setup Juknis"} /></SelectTrigger>
              <SelectContent>
                {schemaOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
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
