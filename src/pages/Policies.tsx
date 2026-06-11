import { useMemo, useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Shield, AlertCircle, RefreshCw, Inbox, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useCreatePolicy,
  useDeletePolicy,
  usePolicies,
  useUpdatePolicy,
} from "@/api/hooks/usePolicies";
import { LEVEL_BADGE, LEVEL_LABEL } from "@/api/hooks/useDatasetLevels";
import type { Policy } from "@/api/types/governance";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";

const TYPE_STYLE: Record<string, string> = {
  ACCESS: "bg-blue-50 text-blue-700 border-blue-200",
  USAGE: "bg-violet-50 text-violet-700 border-violet-200",
  RETENTION: "bg-slate-100 text-slate-700 border-slate-200",
  SECURITY: "bg-rose-50 text-rose-700 border-rose-200",
};
const DOMAIN_LABELS: Record<string, string> = {
  wilayah_kerja: "Wilayah Kerja", sumur: "Sumur", lapangan: "Lapangan", fasilitas: "Fasilitas", seismik: "Seismik",
};
const POLICY_TYPES = ["ACCESS", "USAGE", "RETENTION", "SECURITY"] as const;
const POLICY_STATUSES = ["DRAFT", "PUBLISHED", "DEPRECATED"] as const;
const LEVELS = ["L0", "L1", "L2", "L3", "L4"] as const;

function PolicyEditorDialog({
  open,
  onOpenChange,
  mode,
  policy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  policy?: Policy | null;
}) {
  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [type, setType] = useState<(typeof POLICY_TYPES)[number]>("ACCESS");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("L1");
  const [status, setStatus] = useState<(typeof POLICY_STATUSES)[number]>("DRAFT");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && policy) {
      setName(policy.policy_name);
      setDescription(policy.description ?? "");
      setVersion(policy.version ?? "1.0.0");
      setType(((policy.classification as (typeof POLICY_TYPES)[number]) ?? "ACCESS"));
      setLevel(((policy.level as (typeof LEVELS)[number]) ?? "L1"));
      setStatus(((policy.status as (typeof POLICY_STATUSES)[number]) ?? "DRAFT"));
      return;
    }
    setName("");
    setDescription("");
    setVersion("1.0.0");
    setType("ACCESS");
    setLevel("L1");
    setStatus("DRAFT");
  }, [open, mode, policy]);

  const valid = name.trim().length >= 3 && description.trim().length >= 3 && /^\d+\.\d+\.\d+$/.test(version);

  const submit = async () => {
    if (!valid) {
      toast.error("Isi nama, deskripsi, dan versi dengan format X.Y.Z.");
      return;
    }
    const rules = [{ left_operand: "classification", operator: "EQUALS", right_operand: level }];

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          version,
          type,
          rules,
        });
        toast.success("Policy berhasil dibuat.");
      } else if (policy) {
        await updateMutation.mutateAsync({
          id: policy.policy_id,
          body: {
            name: name.trim(),
            description: description.trim(),
            version,
            type,
            status,
            rules,
          },
        });
        toast.success("Policy berhasil diperbarui.");
      }
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan policy"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Dataset Policy" : "Edit Dataset Policy"}</DialogTitle>
          <DialogDescription>
            Policy yang ditambah di sini hanya dataset policy, tanpa mengubah flow kontrak dan transfer yang sudah berjalan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nama</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Wilayah Kerja - ACCESS L1" />
          </div>

          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Versi</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
            </div>
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={type} onValueChange={(v) => setType(v as (typeof POLICY_TYPES)[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Klasifikasi</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as (typeof LEVELS)[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((item) => <SelectItem key={item} value={item}>{LEVEL_LABEL[item]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === "edit" && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as (typeof POLICY_STATUSES)[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POLICY_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={!valid || createMutation.isPending || updateMutation.isPending}>
            {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Buat Policy" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Policies() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [deleting, setDeleting] = useState<Policy | null>(null);

  const { data, isLoading, isError, error, refetch } = usePolicies();
  const deleteMutation = useDeletePolicy();
  const policies = useMemo(() => (data ?? []) as Policy[], [data]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return policies.filter((p) => {
      const matchesSearch = [
        p.policy_name ?? "",
        p.description ?? "",
        p.level ?? "",
      ].some((value) => value.toLowerCase().includes(q));
      const matchesType = filterType === "all" || p.classification === filterType;
      return matchesSearch && matchesType;
    });
  }, [policies, searchQuery, filterType]);

  const distinctTypes = useMemo(
    () => Array.from(new Set(policies.map((p) => p.classification).filter(Boolean))),
    [policies],
  );
  const distinctLevels = useMemo(
    () => Array.from(new Set(policies.map((p) => p.level).filter(Boolean) as string[])).sort(),
    [policies],
  );

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.policy_id);
      toast.success("Policy berhasil dihapus.");
      setDeleting(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus policy"));
    }
  };

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Policies" subtitle="Registry dataset-policy" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat policies</p>
            <p className="text-sm text-muted-foreground mb-4">{getApiErrorMessage(error, "Error")}</p>
            <Button onClick={() => refetch()} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Coba lagi</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Policies" subtitle="Dataset-policy (akses · penggunaan · retensi · keamanan)" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card"><p className="text-sm text-muted-foreground">Total Policy</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : policies.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Tipe</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : distinctTypes.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Level Klasifikasi</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : distinctLevels.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Tampil</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : filtered.length}</p></div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto md:flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari policy..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Semua tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                {distinctTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Policy
            </Button>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Policy</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Klasifikasi</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{searchQuery || filterType !== "all" ? "Tidak ada policy cocok filter" : "Belum ada policy"}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.policy_id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10"><Shield className="w-4 h-4 text-accent" /></div>
                        <div>
                          <span className="font-medium">{p.policy_name}</span>
                          {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.classification && <Badge variant="outline" className={cn(TYPE_STYLE[p.classification] ?? "")}>{p.classification}</Badge>}
                    </TableCell>
                    <TableCell>
                      {p.level ? <Badge variant="outline" className={LEVEL_BADGE[p.level] ?? ""} title={LEVEL_LABEL[p.level]}>{p.level}</Badge> : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{p.domain ? (DOMAIN_LABELS[p.domain] ?? p.domain) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PolicyEditorDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <PolicyEditorDialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)} mode="edit" policy={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus dataset policy?</AlertDialogTitle>
            <AlertDialogDescription>
              Policy {deleting?.policy_name ?? ""} akan dihapus. Ini tidak mengubah flow yang sudah berjalan, tapi policy ini tidak bisa dipakai lagi untuk dataset baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
