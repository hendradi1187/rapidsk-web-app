import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, FileJson, AlertCircle, RefreshCw, Inbox, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateSchema,
  useDeleteSchema,
  useSchemas,
  useUpdateSchema,
} from "@/api/hooks/useSchemas";
import { useVocabularies } from "@/api/hooks/useVocabularies";
import { vocabulariesApi } from "@/api/services/vocabularies";
import { useDomain } from "@/context/DomainContext";
import type { SchemaItem } from "@/api/types/schemas";
import type { VocabularyTerm } from "@/api/types/vocabularies";
import { getApiErrorMessage } from "@/lib/api-error";

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  DEPRECATED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const STATUSES = ["DRAFT", "PUBLISHED", "DEPRECATED"] as const;

function SchemaEditorDialog({
  open,
  onOpenChange,
  mode,
  schema,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  schema?: SchemaItem | null;
}) {
  const { domainId } = useDomain();
  const { data: vocabularies } = useVocabularies();
  const createMutation = useCreateSchema();
  const updateMutation = useUpdateSchema();
  const [vocabularyId, setVocabularyId] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("DRAFT");
  const [terms, setTerms] = useState<VocabularyTerm[]>([]);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [requiredTermIds, setRequiredTermIds] = useState<string[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && schema) {
      setVocabularyId(schema.vocabulary_id ?? "");
      setVersion(schema.version ?? "1.0.0");
      setStatus(((schema.status as (typeof STATUSES)[number]) ?? "DRAFT"));
      setSelectedTermIds([]);
      setRequiredTermIds([]);
      setTerms([]);
      return;
    }
    setVocabularyId("");
    setVersion("1.0.0");
    setStatus("DRAFT");
    setTerms([]);
    setSelectedTermIds([]);
    setRequiredTermIds([]);
  }, [open, mode, schema]);

  useEffect(() => {
    if (!open || mode !== "create" || !domainId || !vocabularyId) {
      if (mode === "create") setTerms([]);
      return;
    }

    let active = true;
    setLoadingTerms(true);
    vocabulariesApi
      .terms(domainId, vocabularyId)
      .then((rows) => {
        if (!active) return;
        setTerms(rows);
      })
      .catch((err: unknown) => {
        if (!active) return;
        toast.error(getApiErrorMessage(err, "Gagal memuat terms vocabulary"));
      })
      .finally(() => {
        if (active) setLoadingTerms(false);
      });

    return () => {
      active = false;
    };
  }, [domainId, open, mode, vocabularyId]);

  const toggleSelected = (termId: string, checked: boolean) => {
    setSelectedTermIds((prev) =>
      checked ? Array.from(new Set([...prev, termId])) : prev.filter((id) => id !== termId),
    );
    if (!checked) setRequiredTermIds((prev) => prev.filter((id) => id !== termId));
  };

  const toggleRequired = (termId: string, checked: boolean) => {
    setRequiredTermIds((prev) =>
      checked ? Array.from(new Set([...prev, termId])) : prev.filter((id) => id !== termId),
    );
    if (checked) {
      setSelectedTermIds((prev) => (prev.includes(termId) ? prev : [...prev, termId]));
    }
  };

  const valid =
    mode === "edit"
      ? /^\d+\.\d+\.\d+$/.test(version)
      : !!vocabularyId && /^\d+\.\d+\.\d+$/.test(version) && selectedTermIds.length > 0;

  const submit = async () => {
    if (!valid) {
      toast.error(
        mode === "create"
          ? "Pilih vocabulary, isi versi X.Y.Z, dan pilih minimal satu term."
          : "Isi versi dengan format X.Y.Z.",
      );
      return;
    }

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          vocabulary_id: vocabularyId,
          version,
          status,
          metadata_schemas: selectedTermIds.map((termId) => ({
            vocabulary_term_id: termId,
            required: requiredTermIds.includes(termId),
            cardinality: "SINGLE",
          })),
        });
        toast.success("Schema berhasil dibuat.");
      } else if (schema) {
        await updateMutation.mutateAsync({
          id: schema.schema_id,
          body: { version, status },
        });
        toast.success("Schema berhasil diperbarui.");
      }
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan schema"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Schema" : "Edit Schema"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Buat schema baru dari vocabulary yang sudah ada."
              : "Ubah versi dan status schema tanpa mengganggu flow publish dan transfer yang sudah berjalan."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === "create" ? (
            <div className="space-y-2">
              <Label>Vocabulary</Label>
              <Select value={vocabularyId} onValueChange={setVocabularyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih vocabulary" />
                </SelectTrigger>
                <SelectContent>
                  {(vocabularies ?? []).map((v) => (
                    <SelectItem key={v.vocabulary_id} value={v.vocabulary_id}>
                      {v.name} {v.version ? `(v${v.version})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              Vocabulary: <span className="font-medium">{schema?.vocabulary_name || "—"}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Versi</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === "create" && (
            <div className="space-y-2">
              <Label>Metadata fields</Label>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                {!vocabularyId ? (
                  <p className="text-sm text-muted-foreground">Pilih vocabulary untuk memuat daftar terms.</p>
                ) : loadingTerms ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat terms...
                  </div>
                ) : terms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Vocabulary ini belum punya terms.</p>
                ) : (
                  terms.map((term) => {
                    const selected = selectedTermIds.includes(term.id);
                    const required = requiredTermIds.includes(term.id);
                    return (
                      <div key={term.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-2">
                        <div className="flex min-w-0 items-start gap-3">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => toggleSelected(term.id, checked === true)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{term.term}</p>
                            <p className="text-xs text-muted-foreground">
                              {term.datatype || "datatype tidak ada"}{term.unit ? ` · ${term.unit}` : ""}
                            </p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Checkbox
                            checked={required}
                            onCheckedChange={(checked) => toggleRequired(term.id, checked === true)}
                          />
                          required
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!valid || createMutation.isPending || updateMutation.isPending}>
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mode === "create" ? "Buat Schema" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Schemas() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SchemaItem | null>(null);
  const [deleting, setDeleting] = useState<SchemaItem | null>(null);
  const { data, isLoading, isError, error, refetch } = useSchemas();
  const { data: vocabs } = useVocabularies();
  const deleteMutation = useDeleteSchema();
  const schemas = (data ?? []) as SchemaItem[];

  const schemaRows = useMemo(() => (data ?? []) as SchemaItem[], [data]);
  const vocabName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of (vocabs ?? []) as Array<{ vocabulary_id: string; name: string }>) m[v.vocabulary_id] = v.name;
    return m;
  }, [vocabs]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return schemaRows.filter((s) =>
      [`v${s.version}`, s.vocabulary_name || (s.vocabulary_id && vocabName[s.vocabulary_id]) || "—", s.status ?? ""]
        .some((value) => value.toLowerCase().includes(q)),
    );
  }, [schemaRows, searchQuery, vocabName]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.schema_id);
      toast.success("Schema berhasil dihapus.");
      setDeleting(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus schema"));
    }
  };

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Schemas" subtitle="Katalog skema metadata" />
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat schemas</p>
            <p className="mb-4 text-sm text-muted-foreground">{getApiErrorMessage(error, "Error")}</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Coba lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Schemas" subtitle="Katalog skema metadata (berbasis vocabulary)" />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="stat-card"><p className="text-sm text-muted-foreground">Total Schema</p><p className="mt-1 text-3xl font-bold">{isLoading ? "—" : schemaRows.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Tampil</p><p className="mt-1 text-3xl font-bold">{isLoading ? "—" : filtered.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Published</p><p className="mt-1 text-3xl font-bold">{isLoading ? "—" : schemaRows.filter((s) => s.status === "PUBLISHED").length}</p></div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari schema / vocabulary..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Schema
            </Button>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Schema</TableHead>
                <TableHead>Vocabulary</TableHead>
                <TableHead>Versi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm">{searchQuery ? "Tidak ada schema cocok" : "Belum ada schema"}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.schema_id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-accent/10 p-2"><FileJson className="h-4 w-4 text-accent" /></div>
                        <span className="font-medium">Schema v{String(s.version).replace(/^v/i, "")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.vocabulary_name || (s.vocabulary_id && vocabName[s.vocabulary_id]) || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">v{String(s.version).replace(/^v/i, "")}</Badge></TableCell>
                    <TableCell>{s.status && <Badge variant="outline" className={STATUS_STYLE[s.status] ?? ""}>{s.status}</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleting(s)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <SchemaEditorDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <SchemaEditorDialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)} mode="edit" schema={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus schema?</AlertDialogTitle>
            <AlertDialogDescription>
              Schema {deleting ? `v${deleting.version}` : ""} akan dihapus. Flow publish dan transfer lama tidak diubah, tapi referensi baru ke schema ini akan hilang.
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
