import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, FileLock2, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { getApiErrorMessage } from "@/lib/api-error";
import { useDomain } from "@/context/DomainContext";
import {
  contractPoliciesApi,
  type ContractPolicyItem,
} from "@/api/services/policy-contract";

const CLASSIFICATIONS = [
  { value: "PUBLIC", label: "Publik" },
  { value: "INTERNAL", label: "Internal" },
  { value: "CONFIDENTIAL", label: "Rahasia" },
  { value: "RESTRICTED", label: "Terbatas" },
];

const classTone = (value: string) => {
  switch (String(value).toUpperCase()) {
    case "PUBLIC":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "INTERNAL":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "CONFIDENTIAL":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "RESTRICTED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

const ContractPolicies = () => {
  const { domainId, domainName } = useDomain();
  const [busyAction, setBusyAction] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContractPolicyItem | null>(null);
  const [deleting, setDeleting] = useState<ContractPolicyItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    data_clasification: "INTERNAL",
    effective_from: "",
    effective_to: "",
    description: "",
  });

  const policiesQ = useQuery({
    queryKey: ["contract-policies", domainId],
    queryFn: () => contractPoliciesApi.list(domainId!),
    enabled: !!domainId,
  });
  const policies = policiesQ.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", data_clasification: "INTERNAL", effective_from: "", effective_to: "", description: "" });
    setDialogOpen(true);
  };
  const openEdit = (p: ContractPolicyItem) => {
    setEditing(p);
    setForm({
      name: p.name,
      data_clasification: String(p.data_clasification).toUpperCase(),
      effective_from: toDateInput(p.effective_from),
      effective_to: toDateInput(p.effective_to),
      description: p.description ?? "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!domainId) return;
    if (!form.name.trim()) {
      toast.error("Nama kebijakan wajib diisi.");
      return;
    }
    if (!form.effective_from || !form.effective_to) {
      toast.error("Masa berlaku (mulai dan sampai) wajib diisi.");
      return;
    }
    try {
      setBusyAction("save");
      const body = {
        name: form.name.trim(),
        data_clasification: form.data_clasification,
        effective_from: new Date(form.effective_from).toISOString(),
        effective_to: new Date(form.effective_to).toISOString(),
        description: form.description.trim() || null,
      };
      if (editing) {
        await contractPoliciesApi.update(domainId, editing.id, body);
        toast.success("Kebijakan kontrak diperbarui.");
      } else {
        await contractPoliciesApi.create(domainId, body);
        toast.success("Kebijakan kontrak ditambahkan.");
      }
      setDialogOpen(false);
      await policiesQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan kebijakan kontrak."));
    } finally {
      setBusyAction("");
    }
  };

  const remove = async () => {
    if (!domainId || !deleting) return;
    try {
      setBusyAction("delete");
      await contractPoliciesApi.remove(domainId, deleting.id);
      toast.success("Kebijakan kontrak dihapus.");
      setDeleting(null);
      await policiesQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus kebijakan kontrak."));
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Kebijakan Kontrak"
        subtitle="Atur klasifikasi data dan masa berlaku kebijakan di tingkat kontrak, per domain aktif."
      />
      <div className="space-y-6 p-6">
        {!domainId ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">
            Pilih domain aktif dulu lewat pemilih domain di kanan atas.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Domain aktif: <span className="font-medium text-slate-700">{domainName ?? domainId}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void policiesQ.refetch()} disabled={policiesQ.isFetching}>
                  {policiesQ.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Muat Ulang
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Tambah Kebijakan
                </Button>
              </div>
            </div>

            <Card className="panel">
              <CardHeader>
                <CardTitle>Daftar Kebijakan Kontrak</CardTitle>
                <CardDescription>
                  Setiap kebijakan mengikat klasifikasi data dan jendela waktu berlakunya untuk kontrak di domain ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {policiesQ.isLoading ? (
                  <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat kebijakan...
                  </div>
                ) : policies.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                    Belum ada kebijakan kontrak untuk domain ini.
                  </div>
                ) : (
                  policies.map((p) => (
                    <div key={p.id} className="flex flex-col gap-3 rounded-2xl border p-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          <Badge className={classTone(p.data_clasification)}>
                            {CLASSIFICATIONS.find((c) => c.value === String(p.data_clasification).toUpperCase())?.label ?? p.data_clasification}
                          </Badge>
                        </div>
                        {p.description ? <p className="text-sm text-slate-600">{p.description}</p> : null}
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {p.effective_from ? new Date(p.effective_from).toLocaleDateString() : "-"} — {p.effective_to ? new Date(p.effective_to).toLocaleDateString() : "-"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="mr-2 h-4 w-4" /> Ubah
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleting(p)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Hapus
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Kebijakan Kontrak" : "Tambah Kebijakan Kontrak"}</DialogTitle>
            <DialogDescription>Tentukan klasifikasi data dan rentang waktu kebijakan ini berlaku.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Nama Kebijakan</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="mis. Kebijakan Data Sumur Rahasia" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Klasifikasi Data</Label>
              <Select value={form.data_clasification} onValueChange={(v) => setForm((p) => ({ ...p, data_clasification: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSIFICATIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Berlaku Dari</Label>
              <Input type="date" value={form.effective_from} onChange={(e) => setForm((p) => ({ ...p, effective_from: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Berlaku Sampai</Label>
              <Input type="date" value={form.effective_to} onChange={(e) => setForm((p) => ({ ...p, effective_to: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Deskripsi (opsional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => void save()} disabled={busyAction === "save"}>
              {busyAction === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileLock2 className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hapus Kebijakan Kontrak</DialogTitle>
            <DialogDescription>Kebijakan "{deleting?.name}" akan dihapus permanen.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => void remove()} disabled={busyAction === "delete"}>
              {busyAction === "delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractPolicies;
