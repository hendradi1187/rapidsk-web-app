import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Search,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Inbox,
  List,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreateVocabulary,
  useDeleteVocabulary,
  useUpdateVocabulary,
  useVocabularies,
} from "@/api/hooks/useVocabularies";
import { useDomain } from "@/context/DomainContext";
import { vocabulariesApi } from "@/api/services/vocabularies";
import type {
  Vocabulary,
  VocabularyTerm,
  VocabularyTermRequest,
} from "@/api/types/vocabularies";
import { getApiErrorMessage } from "@/lib/api-error";

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  DEPRECATED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const STATUSES = ["DRAFT", "PUBLISHED", "DEPRECATED"] as const;

function VocabularyEditorDialog({
  open,
  onOpenChange,
  mode,
  vocabulary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  vocabulary?: Vocabulary | null;
}) {
  const createMutation = useCreateVocabulary();
  const updateMutation = useUpdateVocabulary();
  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("DRAFT");
  const [terms, setTerms] = useState<VocabularyTermRequest[]>([{ term: "", datatype: "", unit: "", description: "" }]);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && vocabulary) {
      setName(vocabulary.name);
      setVersion(vocabulary.version ?? "1.0.0");
      setDescription(vocabulary.description ?? "");
      setStatus(((vocabulary.status as (typeof STATUSES)[number]) ?? "DRAFT"));
      setTerms([{ term: "", datatype: "", unit: "", description: "" }]);
      return;
    }
    setName("");
    setVersion("1.0.0");
    setDescription("");
    setStatus("DRAFT");
    setTerms([{ term: "", datatype: "", unit: "", description: "" }]);
  }, [open, mode, vocabulary]);

  const validTerms = terms.filter((term) => term.term.trim() && term.datatype.trim());
  const valid =
    name.trim().length >= 3 &&
    /^\d+\.\d+\.\d+$/.test(version) &&
    (mode === "edit" || validTerms.length > 0);

  const updateTerm = (index: number, patch: Partial<VocabularyTermRequest>) => {
    setTerms((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addTerm = () => {
    setTerms((prev) => [...prev, { term: "", datatype: "", unit: "", description: "" }]);
  };

  const removeTerm = (index: number) => {
    setTerms((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const submit = async () => {
    if (!valid) {
      toast.error(
        mode === "create"
          ? "Isi nama, versi X.Y.Z, dan minimal satu term dengan datatype."
          : "Isi nama dan versi dengan format X.Y.Z.",
      );
      return;
    }

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          name: name.trim(),
          version,
          description: description.trim() || undefined,
          terms: validTerms.map((term) => ({
            term: term.term.trim(),
            datatype: term.datatype.trim(),
            unit: term.unit?.trim() || undefined,
            description: term.description?.trim() || undefined,
          })),
        });
        toast.success("Vocabulary berhasil dibuat.");
      } else if (vocabulary) {
        await updateMutation.mutateAsync({
          id: vocabulary.vocabulary_id,
          body: {
            name: name.trim(),
            version,
            description: description.trim() || undefined,
            status,
          },
        });
        toast.success("Vocabulary berhasil diperbarui.");
      }
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan vocabulary"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Vocabulary" : "Edit Vocabulary"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Tambah vocabulary baru beserta term-term awalnya."
              : "Ubah metadata vocabulary tanpa mengganggu flow existing."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Wilayah Kerja" />
            </div>
            <div className="space-y-2">
              <Label>Versi</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          {mode === "edit" && (
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Terms awal</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTerm}>
                  <Plus className="mr-2 h-4 w-4" /> Tambah term
                </Button>
              </div>
              <div className="space-y-3">
                {terms.map((term, index) => (
                  <div key={index} className="rounded-lg border border-border p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Term</Label>
                        <Input value={term.term} onChange={(e) => updateTerm(index, { term: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Datatype</Label>
                        <Input value={term.datatype} onChange={(e) => updateTerm(index, { datatype: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input value={term.unit ?? ""} onChange={(e) => updateTerm(index, { unit: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Deskripsi</Label>
                        <Input value={term.description ?? ""} onChange={(e) => updateTerm(index, { description: e.target.value })} />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeTerm(index)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Hapus term
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={!valid || createMutation.isPending || updateMutation.isPending}>
            {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Buat Vocabulary" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Vocabularies() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openTermsDialog, setOpenTermsDialog] = useState(false);
  const [active, setActive] = useState<Vocabulary | null>(null);
  const [terms, setTerms] = useState<VocabularyTerm[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Vocabulary | null>(null);
  const [deleting, setDeleting] = useState<Vocabulary | null>(null);
  const { domainId } = useDomain();
  const { data, isLoading, isError, error, refetch } = useVocabularies();
  const deleteMutation = useDeleteVocabulary();
  const vocabularies = useMemo(() => (data ?? []) as Vocabulary[], [data]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return vocabularies.filter((v) => v.name?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q));
  }, [vocabularies, searchQuery]);

  const openTerms = async (v: Vocabulary) => {
    setActive(v);
    setOpenTermsDialog(true);
    setTerms([]);
    if (!domainId) return;
    setLoadingTerms(true);
    try {
      setTerms(await vocabulariesApi.terms(domainId, v.vocabulary_id));
    } finally {
      setLoadingTerms(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.vocabulary_id);
      toast.success("Vocabulary berhasil dihapus.");
      setDeleting(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus vocabulary"));
    }
  };

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Vocabularies" subtitle="Kosakata semantik domain" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat vocabularies</p>
            <p className="text-sm text-muted-foreground mb-4">{getApiErrorMessage(error, "Error")}</p>
            <Button onClick={() => refetch()} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Coba lagi</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Vocabularies" subtitle="Kosakata semantik domain (term, datatype, unit)" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="stat-card"><p className="text-sm text-muted-foreground">Total Vocabulary</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : vocabularies.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Tampil</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : filtered.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Published</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : vocabularies.filter((v) => v.status === "PUBLISHED").length}</p></div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari vocabulary..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Vocabulary
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="panel py-12 flex flex-col items-center text-muted-foreground gap-2"><Inbox className="w-8 h-8 opacity-40" /><p className="text-sm">Belum ada vocabulary.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((v) => (
              <Card key={v.vocabulary_id} className="panel">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-accent" /> {v.name}</CardTitle>
                    <div className="flex gap-1.5">
                      {v.version && <Badge variant="outline" className="font-mono text-xs">v{String(v.version).replace(/^v/i, "")}</Badge>}
                      {v.status && <Badge variant="outline" className={STATUS_STYLE[v.status] ?? ""}>{v.status}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{v.description || "—"}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openTerms(v)}><List className="w-4 h-4 mr-2" /> Lihat Terms</Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(v)}><Pencil className="w-4 h-4 mr-2" /> Edit</Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(v)}><Trash2 className="w-4 h-4 mr-2" /> Hapus</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <VocabularyEditorDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <VocabularyEditorDialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)} mode="edit" vocabulary={editing} />

      <Dialog open={openTermsDialog} onOpenChange={setOpenTermsDialog}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Terms · {active?.name}</DialogTitle></DialogHeader>
          {loadingTerms ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat terms...</div>
          ) : terms.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada term.</p>
          ) : (
            <Table>
              <TableHeader><TableRow className="table-header"><TableHead>Term</TableHead><TableHead>Datatype</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
              <TableBody>
                {terms.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.term}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{t.datatype ?? "—"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.unit ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus vocabulary?</AlertDialogTitle>
            <AlertDialogDescription>
              Vocabulary {deleting?.name ?? ""} akan dihapus. Ini tidak mengubah flow lama, tapi vocabulary ini tidak akan bisa dipakai lagi untuk schema baru.
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
