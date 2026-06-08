import { useEffect, useState } from "react";
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
import { Loader2, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateAgreement } from "@/api/hooks/useAgreements";

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusYearsISO = (years: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
};

export function CreateAgreementDialog({
  open,
  onOpenChange,
  contract,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contract: { id: string; name: string } | null;
}) {
  const mutation = useCreateAgreement();
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(plusYearsISO(5));

  useEffect(() => {
    if (open) {
      setFrom(todayISO());
      setTo(plusYearsISO(5));
    }
  }, [open]);

  const valid = !!contract && !!from && !!to && from < to;

  const submit = async () => {
    if (!contract || !valid) {
      toast.error("Masa berlaku tidak valid (tanggal selesai harus setelah mulai).");
      return;
    }
    try {
      await mutation.mutateAsync({
        contract_id: contract.id,
        effective_from: `${from}T00:00:00Z`,
        effective_to: `${to}T00:00:00Z`,
      });
      toast.success("Perjanjian dibuat (APPROVED).");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Gagal membuat perjanjian");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-accent" />
            Buat Perjanjian
          </DialogTitle>
          <DialogDescription>
            Tetapkan masa berlaku perjanjian formal untuk kontrak ini. Perjanjian
            menjadi dasar pertukaran data (transfer).
          </DialogDescription>
        </DialogHeader>

        {contract && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{contract.name}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="eff_from">Berlaku Dari</Label>
            <Input
              id="eff_from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eff_to">Berlaku Sampai</Label>
            <Input
              id="eff_to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
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
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Buat Perjanjian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
