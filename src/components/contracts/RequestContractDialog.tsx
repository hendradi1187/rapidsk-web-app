import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useCreateContract } from "@/api/hooks/useContracts";
import { useProviders } from "@/api/hooks/useProviders";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useAuth } from "@/context/AuthContext";

interface Participant {
  provider_id: string;
  provider_name: string;
  organization_type?: string;
}

export function RequestContractDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { participantId } = useAuth();
  const { data: providers } = useProviders();
  const { data: datasets } = useDatasets();
  const mutation = useCreateContract();

  const participants = (providers ?? []) as Participant[];
  // Heuristik faithful: GOV_* = pihak regulator (consumer), ENTERPRISE = KKKS (provider).
  const isRegulator = (t?: string) => (t ?? "").toUpperCase().startsWith("GOV");
  const defaultConsumer =
    participantId ??
    participants.find((p) => isRegulator(p.organization_type))?.provider_id ??
    "";

  const [consumerId, setConsumerId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [touchedName, setTouchedName] = useState(false);

  // Reset & prefill saat dibuka.
  useEffect(() => {
    if (!open) return;
    setConsumerId(defaultConsumer);
    setProviderId("");
    setDatasetId("");
    setName("");
    setDescription("");
    setTouchedName(false);
  }, [open, defaultConsumer]);

  const consumerName =
    participants.find((p) => p.provider_id === consumerId)?.provider_name ?? "";
  const providerName =
    participants.find((p) => p.provider_id === providerId)?.provider_name ?? "";

  // Saat pilih dataset: set provider dari dataset + sugesti nama/description.
  const onSelectDataset = (id: string) => {
    setDatasetId(id);
    const ds = (datasets ?? []).find((d) => d.dataset_id === id);
    if (ds?.provider_id) setProviderId(ds.provider_id);
    if (!touchedName && ds) setName(`Permintaan Data: ${ds.dataset_name}`);
  };

  const dsName = (datasets ?? []).find((d) => d.dataset_id === datasetId)?.dataset_name;

  // Provider yang bisa dipilih = participant selain consumer.
  const providerOptions = useMemo(
    () => participants.filter((p) => p.provider_id !== consumerId),
    [participants, consumerId],
  );

  const finalDescription =
    description.trim() ||
    (dsName
      ? `Permintaan akses dataset '${dsName}' oleh ${consumerName || "consumer"} dari ${providerName || "provider"}.`
      : "");

  const valid =
    !!consumerId &&
    !!providerId &&
    consumerId !== providerId &&
    name.trim().length >= 3 &&
    finalDescription.trim().length >= 3;

  const submit = async () => {
    if (!valid) {
      toast.error("Lengkapi pemohon, penyedia, nama (≥3), dan deskripsi.");
      return;
    }
    try {
      await mutation.mutateAsync({
        consumer_id: consumerId,
        provider_id: providerId,
        name: name.trim(),
        description: finalDescription.trim(),
      });
      toast.success("Permintaan terkirim — menunggu persetujuan KKKS (REQUESTED).");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Gagal mengirim permintaan");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Ajukan Permintaan Data</DialogTitle>
          <DialogDescription>
            Buat permintaan kontrak ke penyedia (KKKS). Lahir berstatus
            REQUESTED dan menunggu persetujuan penyedia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Pemohon (consumer) */}
          <div className="space-y-2">
            <Label>Pemohon (Consumer)</Label>
            {participantId ? (
              <Input value={consumerName || "Organisasi saya"} disabled />
            ) : (
              <Select value={consumerId} onValueChange={setConsumerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pemohon" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.provider_id} value={p.provider_id}>
                      {p.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Dataset (opsional, untuk sugesti) */}
          <div className="space-y-2">
            <Label>Dataset yang diminta (opsional)</Label>
            <Select value={datasetId} onValueChange={onSelectDataset}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih dataset" />
              </SelectTrigger>
              <SelectContent>
                {(datasets ?? []).map((d) => (
                  <SelectItem key={d.dataset_id} value={d.dataset_id}>
                    {d.dataset_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Memilih dataset mengisi penyedia & menyusun nama/deskripsi otomatis.
            </p>
          </div>

          {/* Penyedia (provider) */}
          <div className="space-y-2">
            <Label>Penyedia (Provider / KKKS)</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih penyedia" />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((p) => (
                  <SelectItem key={p.provider_id} value={p.provider_id}>
                    {p.provider_name}
                    {p.organization_type ? ` · ${p.organization_type}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nama */}
          <div className="space-y-2">
            <Label htmlFor="contract_name">Nama Permintaan *</Label>
            <Input
              id="contract_name"
              placeholder="mis. Permintaan Data Wilayah Kerja"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setTouchedName(true);
              }}
            />
          </div>

          {/* Deskripsi */}
          <div className="space-y-2">
            <Label htmlFor="contract_desc">Deskripsi</Label>
            <Textarea
              id="contract_desc"
              rows={3}
              placeholder={finalDescription || "Tujuan & cakupan permintaan data…"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {!description.trim() && finalDescription && (
              <p className="text-xs text-muted-foreground">
                Akan terkirim: “{finalDescription}”
              </p>
            )}
          </div>

          {/* Ringkas alur */}
          {consumerName && providerName && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm flex items-center gap-1.5">
              <span className="font-medium">{consumerName}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">{providerName}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={submit}
            disabled={!valid || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Kirim Permintaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
