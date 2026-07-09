import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Braces, Layers, Link2, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useDatasets } from "@/api/hooks/useDatasets";
import { useVocabularies } from "@/api/hooks/useVocabularies";
import { schemasApi } from "@/api/services/schemas";
import {
  vocabularyTermsApi,
  metadataSchemasApi,
  datasetMetadatasApi,
  type Cardinality,
  type VocabularyTermRow,
  type MetadataSchemaRow,
  type DatasetMetadataRow,
} from "@/api/services/catalog-metadata";

const NoDomain = () => (
  <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">
    Pilih domain aktif dulu lewat pemilih domain di kanan atas. Metadata katalog dikelola per domain.
  </div>
);

const CatalogMetadata = () => {
  const { domainId, domainName } = useDomain();
  const [busyAction, setBusyAction] = useState("");

  // ── Vocabulary terms ──
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<VocabularyTermRow | null>(null);
  const [termForm, setTermForm] = useState({ term: "", datatype: "", unit: "", description: "", vocabulary_id: "" });
  const [deletingTerm, setDeletingTerm] = useState<VocabularyTermRow | null>(null);

  // ── Metadata schemas ──
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<MetadataSchemaRow | null>(null);
  const [schemaForm, setSchemaForm] = useState({
    schema_id: "",
    vocabulary_term_id: "",
    required: false,
    cardinality: "SINGLE" as Cardinality,
  });
  const [deletingSchema, setDeletingSchema] = useState<MetadataSchemaRow | null>(null);

  // ── Dataset metadata ──
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<DatasetMetadataRow | null>(null);
  const [metaForm, setMetaForm] = useState({ dataset_id: "", vocabulary_term_id: "", source: "", source_ref: "" });
  const [deletingMeta, setDeletingMeta] = useState<DatasetMetadataRow | null>(null);

  const vocabulariesQ = useVocabularies();
  const datasetsQ = useDatasets();
  const schemaCatalogQ = useQuery({
    queryKey: ["catalog-metadata", "schema-catalog", domainId],
    queryFn: () => schemasApi.list(domainId!),
    enabled: !!domainId,
  });
  const termsQ = useQuery({
    queryKey: ["catalog-metadata", "terms", domainId],
    queryFn: () => vocabularyTermsApi.list(domainId!),
    enabled: !!domainId,
  });
  const schemasQ = useQuery({
    queryKey: ["catalog-metadata", "schemas", domainId],
    queryFn: () => metadataSchemasApi.list(domainId!),
    enabled: !!domainId,
  });
  const metasQ = useQuery({
    queryKey: ["catalog-metadata", "metas", domainId],
    queryFn: () => datasetMetadatasApi.list(domainId!),
    enabled: !!domainId,
  });

  const terms = termsQ.data ?? [];
  const schemas = schemasQ.data ?? [];
  const metas = metasQ.data ?? [];
  const vocabularyOptions = (vocabulariesQ.data ?? []) as Array<{ vocabulary_id: string; name: string }>;
  const schemaOptions = (schemaCatalogQ.data ?? []) as Array<{ schema_id: string; vocabulary_name?: string | null; version?: string | null }>;
  const datasetOptions = (datasetsQ.data ?? []) as Array<{ dataset_id: string; dataset_name: string }>;

  const termLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of terms) map[t.id] = `${t.term} (${t.datatype})`;
    return map;
  }, [terms]);

  // ── Vocabulary term handlers ──
  const openCreateTerm = () => {
    setEditingTerm(null);
    setTermForm({ term: "", datatype: "", unit: "", description: "", vocabulary_id: vocabularyOptions[0]?.vocabulary_id ?? "" });
    setTermDialogOpen(true);
  };
  const openEditTerm = (t: VocabularyTermRow) => {
    setEditingTerm(t);
    setTermForm({
      term: t.term,
      datatype: t.datatype,
      unit: t.unit ?? "",
      description: t.description ?? "",
      vocabulary_id: t.vocabulary_id ?? "",
    });
    setTermDialogOpen(true);
  };
  const saveTerm = async () => {
    if (!domainId) return;
    if (!termForm.term.trim() || !termForm.datatype.trim()) {
      toast.error("Istilah dan tipe data wajib diisi.");
      return;
    }
    if (!editingTerm && !termForm.vocabulary_id.trim()) {
      toast.error("Pilih vocabulary induk dulu sebelum menambah istilah.");
      return;
    }
    try {
      setBusyAction("save-term");
      if (editingTerm) {
        await vocabularyTermsApi.update(domainId, editingTerm.id, {
          term: termForm.term.trim(),
          datatype: termForm.datatype.trim(),
          unit: termForm.unit.trim() || null,
          description: termForm.description.trim() || null,
        });
        toast.success("Istilah diperbarui.");
      } else {
        await vocabularyTermsApi.create(domainId, {
          term: termForm.term.trim(),
          datatype: termForm.datatype.trim(),
          unit: termForm.unit.trim() || null,
          description: termForm.description.trim() || null,
          vocabulary_id: termForm.vocabulary_id.trim(),
        });
        toast.success("Istilah ditambahkan.");
      }
      setTermDialogOpen(false);
      await termsQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan istilah."));
    } finally {
      setBusyAction("");
    }
  };
  const deleteTerm = async () => {
    if (!domainId || !deletingTerm) return;
    try {
      setBusyAction("delete-term");
      await vocabularyTermsApi.remove(domainId, deletingTerm.id);
      toast.success("Istilah dihapus.");
      setDeletingTerm(null);
      await termsQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus istilah."));
    } finally {
      setBusyAction("");
    }
  };

  // ── Metadata schema handlers ──
  const openCreateSchema = () => {
    setEditingSchema(null);
    setSchemaForm({ schema_id: schemaOptions[0]?.schema_id ?? "", vocabulary_term_id: terms[0]?.id ?? "", required: false, cardinality: "SINGLE" });
    setSchemaDialogOpen(true);
  };
  const openEditSchema = (s: MetadataSchemaRow) => {
    setEditingSchema(s);
    setSchemaForm({
      schema_id: s.schema_id,
      vocabulary_term_id: s.vocabulary_term_id,
      required: s.required,
      cardinality: s.cardinality,
    });
    setSchemaDialogOpen(true);
  };
  const saveSchema = async () => {
    if (!domainId) return;
    if (!schemaForm.schema_id.trim()) {
      toast.error("Pilih schema yang sudah ada. Field ini harus mengacu ke schema katalog yang valid.");
      return;
    }
    if (!schemaForm.vocabulary_term_id.trim()) {
      toast.error("Pilih istilah yang akan diikat ke schema.");
      return;
    }
    try {
      setBusyAction("save-schema");
      const body = {
        schema_id: schemaForm.schema_id.trim(),
        vocabulary_term_id: schemaForm.vocabulary_term_id,
        required: schemaForm.required,
        cardinality: schemaForm.cardinality,
      };
      if (editingSchema) {
        await metadataSchemasApi.update(domainId, editingSchema.id, body);
        toast.success("Aturan metadata diperbarui.");
      } else {
        await metadataSchemasApi.create(domainId, body);
        toast.success("Aturan metadata ditambahkan.");
      }
      setSchemaDialogOpen(false);
      await schemasQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan aturan metadata."));
    } finally {
      setBusyAction("");
    }
  };
  const deleteSchema = async () => {
    if (!domainId || !deletingSchema) return;
    try {
      setBusyAction("delete-schema");
      await metadataSchemasApi.remove(domainId, deletingSchema.id);
      toast.success("Aturan metadata dihapus.");
      setDeletingSchema(null);
      await schemasQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus aturan metadata."));
    } finally {
      setBusyAction("");
    }
  };

  // ── Dataset metadata handlers ──
  const openCreateMeta = () => {
    setEditingMeta(null);
    setMetaForm({ dataset_id: datasetOptions[0]?.dataset_id ?? "", vocabulary_term_id: terms[0]?.id ?? "", source: "", source_ref: "" });
    setMetaDialogOpen(true);
  };
  const openEditMeta = (m: DatasetMetadataRow) => {
    setEditingMeta(m);
    setMetaForm({
      dataset_id: m.dataset_id,
      vocabulary_term_id: m.vocabulary_term_id,
      source: m.source,
      source_ref: m.source_ref,
    });
    setMetaDialogOpen(true);
  };
  const saveMeta = async () => {
    if (!domainId) return;
    if (!metaForm.dataset_id.trim()) {
      toast.error("Pilih dataset yang valid dulu.");
      return;
    }
    if (!metaForm.vocabulary_term_id.trim()) {
      toast.error("Pilih istilah metadata yang valid.");
      return;
    }
    if (!metaForm.source.trim() || !metaForm.source_ref.trim()) {
      toast.error("Sumber dan referensi sumber wajib diisi.");
      return;
    }
    try {
      setBusyAction("save-meta");
      const body = {
        dataset_id: metaForm.dataset_id.trim(),
        vocabulary_term_id: metaForm.vocabulary_term_id,
        source: metaForm.source.trim(),
        source_ref: metaForm.source_ref.trim(),
      };
      if (editingMeta) {
        await datasetMetadatasApi.update(domainId, editingMeta.id, body);
        toast.success("Metadata dataset diperbarui.");
      } else {
        await datasetMetadatasApi.create(domainId, body);
        toast.success("Metadata dataset ditambahkan.");
      }
      setMetaDialogOpen(false);
      await metasQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan metadata dataset."));
    } finally {
      setBusyAction("");
    }
  };
  const deleteMeta = async () => {
    if (!domainId || !deletingMeta) return;
    try {
      setBusyAction("delete-meta");
      await datasetMetadatasApi.remove(domainId, deletingMeta.id);
      toast.success("Metadata dataset dihapus.");
      setDeletingMeta(null);
      await metasQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus metadata dataset."));
    } finally {
      setBusyAction("");
    }
  };

  const TermSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
    terms.length > 0 ? (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Pilih istilah" />
        </SelectTrigger>
        <SelectContent>
          {terms.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.term} — {t.datatype}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="ID istilah" />
    );

  return (
    <div className="min-h-screen">
      <Header
        title="Metadata Katalog"
        subtitle="Kelola istilah semantik, aturan metadata, dan pemetaan metadata dataset untuk domain aktif."
      />
      <div className="space-y-6 p-6">
        {!domainId ? (
          <NoDomain />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="stat-card">
                <p className="text-sm text-muted-foreground">Istilah</p>
                <p className="mt-1 text-3xl font-bold">{terms.length}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-muted-foreground">Aturan Metadata</p>
                <p className="mt-1 text-3xl font-bold">{schemas.length}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-muted-foreground">Metadata Dataset</p>
                <p className="mt-1 text-3xl font-bold">{metas.length}</p>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              Domain aktif: <span className="font-medium text-slate-700">{domainName ?? domainId}</span>
            </p>

            <Tabs defaultValue="terms" className="space-y-6">
              <TabsList className="grid w-full max-w-2xl grid-cols-3 gap-2">
                <TabsTrigger value="terms">Istilah</TabsTrigger>
                <TabsTrigger value="schemas">Aturan Metadata</TabsTrigger>
                <TabsTrigger value="metas">Metadata Dataset</TabsTrigger>
              </TabsList>

              {/* ── Terms ── */}
              <TabsContent value="terms" className="space-y-4">
                <Card className="panel">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Istilah Semantik</CardTitle>
                        <CardDescription>
                          Kosakata yang jadi dasar penyusunan metadata — misalnya nama atribut beserta tipe datanya.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => void termsQ.refetch()} disabled={termsQ.isFetching}>
                          {termsQ.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                          Muat Ulang
                        </Button>
                        <Button onClick={openCreateTerm}>
                          <Plus className="mr-2 h-4 w-4" /> Tambah Istilah
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {termsQ.isLoading ? (
                      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Memuat istilah...
                      </div>
                    ) : terms.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                        Belum ada istilah untuk domain ini.
                      </div>
                    ) : (
                      terms.map((t) => (
                        <div key={t.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">{t.term}</p>
                              <Badge variant="outline">{t.datatype}</Badge>
                              {t.unit ? <Badge variant="secondary">{t.unit}</Badge> : null}
                            </div>
                            {t.description ? <p className="text-sm text-slate-600">{t.description}</p> : null}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditTerm(t)}>
                              <Pencil className="mr-2 h-4 w-4" /> Ubah
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeletingTerm(t)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Schemas ── */}
              <TabsContent value="schemas" className="space-y-4">
                <Card className="panel">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Aturan Metadata</CardTitle>
                        <CardDescription>
                          Menentukan istilah mana yang wajib diisi dan apakah boleh bernilai tunggal atau ganda.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => void schemasQ.refetch()} disabled={schemasQ.isFetching}>
                          {schemasQ.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                          Muat Ulang
                        </Button>
                        <Button onClick={openCreateSchema}>
                          <Plus className="mr-2 h-4 w-4" /> Tambah Aturan
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {schemasQ.isLoading ? (
                      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Memuat aturan...
                      </div>
                    ) : schemas.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                        Belum ada aturan metadata untuk domain ini.
                      </div>
                    ) : (
                      schemas.map((s) => (
                        <div key={s.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">{s.schema_id}</p>
                              <Badge variant={s.required ? "default" : "secondary"}>
                                {s.required ? "Wajib" : "Opsional"}
                              </Badge>
                              <Badge variant="outline">{s.cardinality === "SINGLE" ? "Nilai tunggal" : "Nilai ganda"}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">Istilah: {termLabel[s.vocabulary_term_id] || s.vocabulary_term_id}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditSchema(s)}>
                              <Pencil className="mr-2 h-4 w-4" /> Ubah
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeletingSchema(s)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Dataset metadata ── */}
              <TabsContent value="metas" className="space-y-4">
                <Card className="panel">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Metadata Dataset</CardTitle>
                        <CardDescription>
                          Memetakan istilah ke dataset nyata, menandai sumbernya dan referensi asal datanya.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => void metasQ.refetch()} disabled={metasQ.isFetching}>
                          {metasQ.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                          Muat Ulang
                        </Button>
                        <Button onClick={openCreateMeta}>
                          <Plus className="mr-2 h-4 w-4" /> Tambah Metadata
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {metasQ.isLoading ? (
                      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Memuat metadata...
                      </div>
                    ) : metas.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                        Belum ada metadata dataset untuk domain ini.
                      </div>
                    ) : (
                      metas.map((m) => (
                        <div key={m.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">{m.dataset_id}</p>
                              <Badge variant="outline">{m.source}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">Istilah: {termLabel[m.vocabulary_term_id] || m.vocabulary_term_id}</p>
                            <p className="text-xs text-slate-500">Ref sumber: {m.source_ref}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditMeta(m)}>
                              <Pencil className="mr-2 h-4 w-4" /> Ubah
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeletingMeta(m)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Dialog Term */}
      <Dialog open={termDialogOpen} onOpenChange={setTermDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingTerm ? "Ubah Istilah" : "Tambah Istilah"}</DialogTitle>
            <DialogDescription>Istilah dipakai ulang oleh aturan metadata dan metadata dataset.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Istilah</Label>
              <Input value={termForm.term} onChange={(e) => setTermForm((p) => ({ ...p, term: e.target.value }))} placeholder="mis. kedalaman_sumur" />
            </div>
            <div className="space-y-2">
              <Label>Tipe Data</Label>
              <Input value={termForm.datatype} onChange={(e) => setTermForm((p) => ({ ...p, datatype: e.target.value }))} placeholder="mis. number / string" />
            </div>
            <div className="space-y-2">
              <Label>Satuan (opsional)</Label>
              <Input value={termForm.unit} onChange={(e) => setTermForm((p) => ({ ...p, unit: e.target.value }))} placeholder="mis. meter" />
            </div>
            {!editingTerm ? (
              <div className="space-y-2">
                <Label>Vocabulary Induk</Label>
                {vocabularyOptions.length > 0 ? (
                  <Select value={termForm.vocabulary_id} onValueChange={(value) => setTermForm((p) => ({ ...p, vocabulary_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih vocabulary" />
                    </SelectTrigger>
                    <SelectContent>
                      {vocabularyOptions.map((vocabulary) => (
                        <SelectItem key={vocabulary.vocabulary_id} value={vocabulary.vocabulary_id}>
                          {vocabulary.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={termForm.vocabulary_id} onChange={(e) => setTermForm((p) => ({ ...p, vocabulary_id: e.target.value }))} placeholder="ID vocabulary induk" />
                )}
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <Label>Deskripsi (opsional)</Label>
              <Textarea value={termForm.description} onChange={(e) => setTermForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTermDialogOpen(false)}>Batal</Button>
            <Button onClick={() => void saveTerm()} disabled={busyAction === "save-term"}>
              {busyAction === "save-term" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Braces className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Schema */}
      <Dialog open={schemaDialogOpen} onOpenChange={setSchemaDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingSchema ? "Ubah Aturan Metadata" : "Tambah Aturan Metadata"}</DialogTitle>
            <DialogDescription>Tentukan istilah, wajib/tidaknya, dan jumlah nilai yang diperbolehkan.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Schema Katalog</Label>
              {schemaOptions.length > 0 ? (
                <Select value={schemaForm.schema_id} onValueChange={(value) => setSchemaForm((p) => ({ ...p, schema_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih schema yang sudah terdaftar" />
                  </SelectTrigger>
                  <SelectContent>
                    {schemaOptions.map((schema) => (
                      <SelectItem key={schema.schema_id} value={schema.schema_id}>
                        {(schema.vocabulary_name ?? "Schema")} · v{schema.version ?? "?"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={schemaForm.schema_id} onChange={(e) => setSchemaForm((p) => ({ ...p, schema_id: e.target.value }))} placeholder="Schema UUID" />
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Istilah</Label>
              <TermSelect value={schemaForm.vocabulary_term_id} onChange={(v) => setSchemaForm((p) => ({ ...p, vocabulary_term_id: v }))} />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label>Wajib diisi</Label>
                <p className="text-xs text-slate-500">Metadata dataset harus punya istilah ini.</p>
              </div>
              <Switch checked={schemaForm.required} onCheckedChange={(v) => setSchemaForm((p) => ({ ...p, required: v }))} />
            </div>
            <div className="space-y-2">
              <Label>Kardinalitas</Label>
              <Select value={schemaForm.cardinality} onValueChange={(v) => setSchemaForm((p) => ({ ...p, cardinality: v as Cardinality }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">Nilai tunggal</SelectItem>
                  <SelectItem value="MULTIPLE">Nilai ganda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchemaDialogOpen(false)}>Batal</Button>
            <Button onClick={() => void saveSchema()} disabled={busyAction === "save-schema"}>
              {busyAction === "save-schema" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Meta */}
      <Dialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMeta ? "Ubah Metadata Dataset" : "Tambah Metadata Dataset"}</DialogTitle>
            <DialogDescription>Kaitkan sebuah dataset dengan istilah dan tandai dari mana nilainya berasal.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Dataset</Label>
              {datasetOptions.length > 0 ? (
                <Select value={metaForm.dataset_id} onValueChange={(value) => setMetaForm((p) => ({ ...p, dataset_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasetOptions.map((dataset) => (
                      <SelectItem key={dataset.dataset_id} value={dataset.dataset_id}>
                        {dataset.dataset_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={metaForm.dataset_id} onChange={(e) => setMetaForm((p) => ({ ...p, dataset_id: e.target.value }))} placeholder="Dataset UUID" />
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Istilah</Label>
              <TermSelect value={metaForm.vocabulary_term_id} onChange={(v) => setMetaForm((p) => ({ ...p, vocabulary_term_id: v }))} />
            </div>
            <div className="space-y-2">
              <Label>Sumber</Label>
              <Input value={metaForm.source} onChange={(e) => setMetaForm((p) => ({ ...p, source: e.target.value }))} placeholder="mis. manual / adapter" />
            </div>
            <div className="space-y-2">
              <Label>Referensi Sumber</Label>
              <Input value={metaForm.source_ref} onChange={(e) => setMetaForm((p) => ({ ...p, source_ref: e.target.value }))} placeholder="mis. kolom / path" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetaDialogOpen(false)}>Batal</Button>
            <Button onClick={() => void saveMeta()} disabled={busyAction === "save-meta"}>
              {busyAction === "save-meta" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <Dialog open={!!deletingTerm} onOpenChange={(o) => !o && setDeletingTerm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hapus Istilah</DialogTitle>
            <DialogDescription>Istilah "{deletingTerm?.term}" akan dihapus permanen.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTerm(null)}>Batal</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => void deleteTerm()} disabled={busyAction === "delete-term"}>
              {busyAction === "delete-term" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSchema} onOpenChange={(o) => !o && setDeletingSchema(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hapus Aturan Metadata</DialogTitle>
            <DialogDescription>Aturan "{deletingSchema?.schema_id}" akan dihapus permanen.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSchema(null)}>Batal</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => void deleteSchema()} disabled={busyAction === "delete-schema"}>
              {busyAction === "delete-schema" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingMeta} onOpenChange={(o) => !o && setDeletingMeta(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hapus Metadata Dataset</DialogTitle>
            <DialogDescription>Metadata untuk dataset "{deletingMeta?.dataset_id}" akan dihapus permanen.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMeta(null)}>Batal</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => void deleteMeta()} disabled={busyAction === "delete-meta"}>
              {busyAction === "delete-meta" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogMetadata;
