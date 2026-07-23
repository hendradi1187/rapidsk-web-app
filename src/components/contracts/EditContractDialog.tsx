import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { useUpdateContract } from "@/api/hooks/useContracts";
import { useDatasets } from "@/api/hooks/useDatasets";
import type { ContractDetail } from "@/api/services/policy-contract";

export function EditContractDialog({
  open,
  onOpenChange,
  contract,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contract: ContractDetail | null;
}) {
  const { data: datasets } = useDatasets();
  const mutation = useUpdateContract();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [datasetIds, setDatasetIds] = useState<string[]>([]);

  // Prefill setiap kali dialog dibuka dengan contract yang beda — edit boleh dilakukan
  // di status apapun (REQUESTED maupun sudah ACTIVE), bukan cuma sebelum approval.
  useEffect(() => {
    if (!open || !contract) return;
    setName(contract.name ?? "");
    setDescription(contract.description ?? "");
    setDatasetIds((contract.datasets ?? []).map((d) => d.dataset_id));
  }, [open, contract]);

  const datasetsForProvider = useMemo(
    () =>
      ((datasets ?? []) as Array<{ dataset_id: string; dataset_name: string; provider_id?: string }>).filter(
        (dataset) => !contract?.provider_id || dataset.provider_id === contract.provider_id,
      ),
    [datasets, contract?.provider_id],
  );

  const toggleDataset = (id: string, checked: boolean) => {
    setDatasetIds((current) =>
      checked ? Array.from(new Set([...current, id])) : current.filter((datasetId) => datasetId !== id),
    );
  };

  const valid = !!contract && name.trim().length >= 3 && description.trim().length >= 3;

  const submit = async () => {
    if (!contract || !valid) {
      toast.error("Nama dan deskripsi minimal 3 karakter.");
      return;
    }
    try {
      await mutation.mutateAsync({
        contract: {
          id: contract.id,
          consumer_id: contract.consumer_id ?? "",
          provider_id: contract.provider_id ?? "",
        },
        body: {
          name: name.trim(),
          description: description.trim(),
          datasets: datasetIds.map((datasetId) => ({ dataset_id: datasetId })),
        },
      });
      toast.success("Contract berhasil diperbarui.");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal memperbarui contract"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Contract</DialogTitle>
          <DialogDescription>
            Ubah nama, deskripsi, atau dataset tertaut. Provider &amp; consumer tidak bisa diganti dari sini —
            kalau salah pasangan, ajukan permintaan baru.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit_contract_name">Nama Contract *</Label>
            <Input id="edit_contract_name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_contract_desc">Deskripsi *</Label>
            <Textarea
              id="edit_contract_desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Dataset tertaut</Label>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
              {datasetsForProvider.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada dataset published dari provider ini.</p>
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!valid || mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
