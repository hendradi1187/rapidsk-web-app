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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
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
  const [datasetIds, setDatasetIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [touchedName, setTouchedName] = useState(false);

  // Reset & prefill saat dibuka.
  useEffect(() => {
    if (!open) return;
    setConsumerId(defaultConsumer);
    setProviderId("");
    setDatasetIds([]);
    setName("");
    setDescription("");
    setTouchedName(false);
  }, [open, defaultConsumer]);

  const consumerName =
    participants.find((p) => p.provider_id === consumerId)?.provider_name ?? "";
  const providerName =
    participants.find((p) => p.provider_id === providerId)?.provider_name ?? "";

  const datasetsForProvider = useMemo(
    () =>
      ((datasets ?? []) as Array<{ dataset_id: string; dataset_name: string; provider_id?: string }>)
        .filter((dataset) => !providerId || dataset.provider_id === providerId),
    [datasets, providerId],
  );

  // Saat pilih dataset: set provider dari dataset + sugesti nama/description.
  const toggleDataset = (id: string, checked: boolean) => {
    const ds = (datasets ?? []).find((d) => d.dataset_id === id);
    if (ds?.provider_id) setProviderId(ds.provider_id);
    setDatasetIds((current) =>
      checked ? Array.from(new Set([...current, id])) : current.filter((datasetId) => datasetId !== id),
    );
    if (!touchedName && ds && checked) setName(`Permintaan Data: ${ds.dataset_name}`);
  };

  const selectedDatasets = useMemo(
    () =>
      ((datasets ?? []) as Array<{ dataset_id: string; dataset_name: string; provider_id?: string }>)
        .filter((dataset) => datasetIds.includes(dataset.dataset_id)),
    [datasets, datasetIds],
  );

  // Provider yang bisa dipilih = participant selain consumer.
  const providerOptions = useMemo(
    () => participants.filter((p) => p.provider_id !== consumerId),
    [participants, consumerId],
  );

  const finalDescription =
    description.trim() ||
    (selectedDatasets.length > 0
      ? `Permintaan akses ${selectedDatasets.length} dataset oleh ${consumerName || "consumer"} dari ${providerName || "provider"}: ${selectedDatasets.map((dataset) => dataset.dataset_name).join(", ")}.`
      : "");

  const valid =
    !!consumerId &&
    !!providerId &&
    consumerId !== providerId &&
    name.trim().length >= 3 &&
    finalDescription.trim().length >= 3;

  const submit = async () => {
    if (!valid) {
      toast.error("Lengkapi pemohon, penyedia, pilih minimal satu dataset, nama (>=3), dan deskripsi.");
      return;
    }
    try {
      await mutation.mutateAsync({
        consumer_id: consumerId,
        provider_id: providerId,
        name: name.trim(),
        description: finalDescription.trim(),
        ...(datasetIds.length > 0
          ? { datasets: datasetIds.map((datasetId) => ({ dataset_id: datasetId })) }
          : {}),
      });
      toast.success("Permintaan terkirim — menunggu persetujuan KKKS (REQUESTED).");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal mengirim permintaan"));
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
            <Label>Dataset yang diminta (opsional, bisa lebih dari satu)</Label>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
              {datasetsForProvider.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {providerId
                    ? "Belum ada dataset published dari provider ini."
                    : "Pilih provider dulu, atau centang dataset untuk mengisi provider otomatis."}
                </p>
              ) : (
                datasetsForProvider.map((dataset) => (
                  <label
                    key={dataset.dataset_id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent px-2 py-2 hover:border-border hover:bg-background"
                  >
                    <Checkbox
                      checked={datasetIds.includes(dataset.dataset_id)}
                      onCheckedChange={(checked) => toggleDataset(dataset.dataset_id, checked === true)}
                    />
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium">{dataset.dataset_name}</span>
                      <span className="block text-[11px] text-muted-foreground">{dataset.dataset_id}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Dataset yang dicentang akan dilampirkan ke kontrak. Provider ikut terkunci ke pemilik dataset yang dipilih.
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
