import { useEffect, useMemo, useState } from "react";
import { BookOpen, Database, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useVocabularies } from "@/api/hooks/useVocabularies";
import {
  metadataSchemasApi,
  schemasApi,
  vocabulariesApi,
  vocabularyTermsApi,
} from "@/api/services/data-catalog";
import type {
  MetadataSchema,
  MetadataSchemaCardinality,
  Schema as SchemaResource,
  SchemaStatus,
  VocabularyStatus,
  VocabularyTermResponse,
  VocabularyWithoutTerms,
} from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type WizardMode = "vocabulary" | "term" | "schema" | "metadata";
type EnrichedVocabularyTerm = VocabularyTermResponse & { vocabulary_id: string; vocabulary_name: string };

type EditTarget =
  | { kind: "vocabulary"; data: VocabularyWithoutTerms }
  | { kind: "term"; data: EnrichedVocabularyTerm }
  | { kind: "schema"; data: SchemaResource }
  | { kind: "metadata"; data: MetadataSchema };

const errorDetail = (error: unknown): string => {
  const err = error as { response?: { data?: { detail?: unknown; error?: unknown } } };
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d?.msg || JSON.stringify(d)).join("; ");
  if (typeof detail === "string") return detail;
  if (typeof err?.response?.data?.error === "string") return err.response!.data!.error as string;
  return "Unexpected error";
};

const MasterData = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: domainsData, isLoading: loadingDomains } = useAllDomains({ limit: 1000 });
  const domains = useMemo(() => {
    const list = domainsData?.data ?? [];
    // Defensive dedupe by id (in case caller mounted twice).
    const seen = new Set<string>();
    return list
      .filter((d) => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      })
      .sort((a, b) => {
        const orgA = a.organization_name || "";
        const orgB = b.organization_name || "";
        if (orgA !== orgB) return orgA.localeCompare(orgB);
        return a.name.localeCompare(b.name);
      });
  }, [domainsData]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [wizardMode, setWizardMode] = useState<WizardMode>("vocabulary");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "vocabulary" | "term" | "schema" | "metadata"; id: string; label: string } | null>(null);
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: vocabData, isLoading: loadingVocabularies } = useVocabularies(domainId, { limit: 100 });
  const { data: schemaData, isLoading: loadingSchemas } = useQuery({
    queryKey: ["v2-master-data-schemas", domainId],
    queryFn: () => schemasApi.list(domainId, { limit: 100 }),
    enabled: !!domainId,
  });
  const { data: metadataSchemaData, isLoading: loadingMetadataSchemas } = useQuery({
    queryKey: ["v2-master-data-metadata-schemas", domainId],
    queryFn: () => metadataSchemasApi.list(domainId, { limit: 100 }),
    enabled: !!domainId,
  });

  const vocabularies = vocabData?.data ?? [];
  const { data: vocabularyTermsByVocabulary = [], isLoading: loadingTerms } = useQuery({
    queryKey: ["v2-master-data-terms-by-vocabulary", domainId, vocabularies.map((entry) => entry.id).join(",")],
    queryFn: async () => {
      const grouped = await Promise.all(
        vocabularies.map(async (vocabulary) => {
          const items = await vocabularyTermsApi.getByVocabularyId(domainId, vocabulary.id);
          return items.map((item) => ({
            ...item,
            vocabulary_id: vocabulary.id,
            vocabulary_name: vocabulary.name,
          }));
        })
      );
      return grouped.flat();
    },
    enabled: !!domainId && vocabularies.length > 0,
  });
  const schemas = schemaData?.data ?? [];
  const metadataSchemas = metadataSchemaData?.data ?? [];
  const terms = vocabularyTermsByVocabulary as EnrichedVocabularyTerm[];

  const [vocabularyForm, setVocabularyForm] = useState({
    name: "",
    version: "0.0.1",
    description: "",
    term: "",
    datatype: "string",
    unit: "",
    term_description: "",
  });
  const [termForm, setTermForm] = useState({
    vocabulary_id: "",
    term: "",
    datatype: "string",
    unit: "",
    description: "",
  });
  const [schemaForm, setSchemaForm] = useState({
    vocabulary_id: "",
    version: "0.0.1",
    selectedTerms: [] as string[],
  });
  const [metadataForm, setMetadataForm] = useState({
    schema_id: "",
    vocabulary_term_id: "",
    required: false,
    cardinality: "SINGLE" as MetadataSchemaCardinality,
  });

  const [editVocabularyForm, setEditVocabularyForm] = useState({ name: "", version: "", description: "", status: "DRAFT" as VocabularyStatus });
  const [editTermForm, setEditTermForm] = useState({ term: "", datatype: "", unit: "", description: "" });
  const [editSchemaForm, setEditSchemaForm] = useState({ version: "", status: "DRAFT" as SchemaStatus });
  const [editMetadataForm, setEditMetadataForm] = useState({ required: false, cardinality: "SINGLE" as MetadataSchemaCardinality, vocabulary_term_id: "" });

  useEffect(() => {
    if (!editTarget) return;
    if (editTarget.kind === "vocabulary") {
      const v = editTarget.data;
      setEditVocabularyForm({ name: v.name, version: v.version, description: v.description ?? "", status: v.status });
    } else if (editTarget.kind === "term") {
      const t = editTarget.data;
      setEditTermForm({ term: t.term, datatype: t.datatype, unit: t.unit ?? "", description: t.description ?? "" });
    } else if (editTarget.kind === "schema") {
      const s = editTarget.data;
      setEditSchemaForm({ version: s.version, status: s.status });
    } else {
      const m = editTarget.data;
      setEditMetadataForm({ required: m.required, cardinality: m.cardinality, vocabulary_term_id: m.vocabulary_term_id });
    }
  }, [editTarget]);

  const availableTermsForSelectedVocabulary = useMemo(() => {
    if (!schemaForm.vocabulary_id) return [] as VocabularyTermResponse[];
    return terms.filter((term) => term.vocabulary_id === schemaForm.vocabulary_id);
  }, [schemaForm.vocabulary_id, terms]);

  const invalidateMasterData = () => {
    queryClient.invalidateQueries({ queryKey: ["vocabularies", domainId] });
    queryClient.invalidateQueries({ queryKey: ["v2-master-data-terms-by-vocabulary", domainId] });
    queryClient.invalidateQueries({ queryKey: ["v2-master-data-schemas", domainId] });
    queryClient.invalidateQueries({ queryKey: ["v2-master-data-metadata-schemas", domainId] });
  };

  const createVocabulary = useMutation({
    mutationFn: () =>
      vocabulariesApi.create(domainId, {
        name: vocabularyForm.name,
        version: vocabularyForm.version,
        description: vocabularyForm.description || null,
        terms: [
          {
            term: vocabularyForm.term,
            datatype: vocabularyForm.datatype,
            unit: vocabularyForm.unit || null,
            description: vocabularyForm.term_description || null,
          },
        ],
      }),
    onSuccess: () => {
      toast.success("Vocabulary created");
      invalidateMasterData();
      setDialogOpen(false);
      setVocabularyForm({ name: "", version: "0.0.1", description: "", term: "", datatype: "string", unit: "", term_description: "" });
    },
    onError: (error) => toast.error("Failed to create vocabulary", { description: errorDetail(error) }),
  });

  const createTerm = useMutation({
    mutationFn: () =>
      vocabularyTermsApi.create(domainId, {
        vocabulary_id: termForm.vocabulary_id,
        term: termForm.term,
        datatype: termForm.datatype,
        unit: termForm.unit || null,
        description: termForm.description || null,
      }),
    onSuccess: () => {
      toast.success("Vocabulary term created");
      invalidateMasterData();
      setDialogOpen(false);
      setTermForm({ vocabulary_id: "", term: "", datatype: "string", unit: "", description: "" });
    },
    onError: (error) => toast.error("Failed to create term", { description: errorDetail(error) }),
  });

  const createSchema = useMutation({
    mutationFn: () =>
      schemasApi.create(domainId, {
        vocabulary_id: schemaForm.vocabulary_id,
        version: schemaForm.version,
        metadata_schemas: schemaForm.selectedTerms.map((termId) => ({
          vocabulary_term_id: termId,
          required: false,
          cardinality: "SINGLE",
        })),
      }),
    onSuccess: () => {
      toast.success("Schema created");
      invalidateMasterData();
      setDialogOpen(false);
      setSchemaForm({ vocabulary_id: "", version: "0.0.1", selectedTerms: [] });
    },
    onError: (error) => toast.error("Failed to create schema", { description: errorDetail(error) }),
  });

  const createMetadataSchema = useMutation({
    mutationFn: () =>
      metadataSchemasApi.create(domainId, {
        schema_id: metadataForm.schema_id,
        vocabulary_term_id: metadataForm.vocabulary_term_id,
        required: metadataForm.required,
        cardinality: metadataForm.cardinality,
      }),
    onSuccess: () => {
      toast.success("Metadata schema created");
      invalidateMasterData();
      setDialogOpen(false);
      setMetadataForm({ schema_id: "", vocabulary_term_id: "", required: false, cardinality: "SINGLE" });
    },
    onError: (error) => toast.error("Failed to create metadata schema", { description: errorDetail(error) }),
  });

  const updateVocabulary = useMutation({
    mutationFn: () => {
      if (editTarget?.kind !== "vocabulary") throw new Error("invalid target");
      return vocabulariesApi.update(domainId, editTarget.data.id, {
        name: editVocabularyForm.name,
        version: editVocabularyForm.version,
        description: editVocabularyForm.description || null,
        status: editVocabularyForm.status,
      });
    },
    onSuccess: () => { toast.success("Vocabulary updated"); invalidateMasterData(); setEditTarget(null); },
    onError: (error) => toast.error("Failed to update vocabulary", { description: errorDetail(error) }),
  });

  const updateTerm = useMutation({
    mutationFn: () => {
      if (editTarget?.kind !== "term") throw new Error("invalid target");
      return vocabularyTermsApi.update(domainId, editTarget.data.id, {
        term: editTermForm.term,
        datatype: editTermForm.datatype,
        unit: editTermForm.unit || null,
        description: editTermForm.description || null,
      });
    },
    onSuccess: () => { toast.success("Term updated"); invalidateMasterData(); setEditTarget(null); },
    onError: (error) => toast.error("Failed to update term", { description: errorDetail(error) }),
  });

  const updateSchema = useMutation({
    mutationFn: () => {
      if (editTarget?.kind !== "schema") throw new Error("invalid target");
      return schemasApi.update(domainId, editTarget.data.id, {
        version: editSchemaForm.version,
        status: editSchemaForm.status,
      });
    },
    onSuccess: () => { toast.success("Schema updated"); invalidateMasterData(); setEditTarget(null); },
    onError: (error) => toast.error("Failed to update schema", { description: errorDetail(error) }),
  });

  const updateMetadataSchema = useMutation({
    mutationFn: () => {
      if (editTarget?.kind !== "metadata") throw new Error("invalid target");
      return metadataSchemasApi.update(domainId, editTarget.data.id, {
        schema_id: editTarget.data.schema_id, // backend requires this on PATCH
        required: editMetadataForm.required,
        cardinality: editMetadataForm.cardinality,
        vocabulary_term_id: editMetadataForm.vocabulary_term_id,
      });
    },
    onSuccess: () => { toast.success("Metadata schema updated"); invalidateMasterData(); setEditTarget(null); },
    onError: (error) => toast.error("Failed to update metadata schema", { description: errorDetail(error) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      if (deleteTarget.type === "vocabulary") await vocabulariesApi.delete(domainId, deleteTarget.id);
      if (deleteTarget.type === "term") await vocabularyTermsApi.delete(domainId, deleteTarget.id);
      if (deleteTarget.type === "schema") await schemasApi.delete(domainId, deleteTarget.id);
      if (deleteTarget.type === "metadata") await metadataSchemasApi.delete(domainId, deleteTarget.id);
    },
    onSuccess: () => { toast.success("Item deleted"); invalidateMasterData(); setDeleteTarget(null); },
    onError: (error) => toast.error("Failed to delete item", { description: errorDetail(error) }),
  });

  const openWizard = (mode: WizardMode) => {
    setWizardMode(mode);
    if (mode === "schema" && vocabularies.length > 0 && !schemaForm.vocabulary_id) {
      setSchemaForm((prev) => ({ ...prev, vocabulary_id: vocabularies[0].id }));
    }
    if (mode === "metadata") {
      if (schemas.length > 0 && !metadataForm.schema_id) {
        setMetadataForm((prev) => ({ ...prev, schema_id: schemas[0].id }));
      }
      if (terms.length > 0 && !metadataForm.vocabulary_term_id) {
        setMetadataForm((prev) => ({ ...prev, vocabulary_term_id: terms[0].id }));
      }
    }
    if (mode === "term" && vocabularies.length > 0 && !termForm.vocabulary_id) {
      setTermForm((prev) => ({ ...prev, vocabulary_id: vocabularies[0].id }));
    }
    setDialogOpen(true);
  };

  const submitWizard = async () => {
    if (!domainId) { toast.error("Select a domain first"); return; }

    if (wizardMode === "vocabulary") {
      if (!vocabularyForm.name || !vocabularyForm.version || !vocabularyForm.term) {
        toast.error("Complete vocabulary name, version, and the first term"); return;
      }
      await createVocabulary.mutateAsync(); return;
    }

    if (wizardMode === "term") {
      if (!termForm.vocabulary_id || !termForm.term) { toast.error("Select a vocabulary and provide a term"); return; }
      await createTerm.mutateAsync(); return;
    }

    if (wizardMode === "schema") {
      if (!schemaForm.vocabulary_id || !schemaForm.version || schemaForm.selectedTerms.length === 0) {
        toast.error("Choose a vocabulary, version, and at least one term"); return;
      }
      await createSchema.mutateAsync(); return;
    }

    if (!metadataForm.schema_id || !metadataForm.vocabulary_term_id) { toast.error("Choose a schema and a term"); return; }
    await createMetadataSchema.mutateAsync();
  };

  const isSubmitting =
    createVocabulary.isPending || createTerm.isPending || createSchema.isPending || createMetadataSchema.isPending;
  const isUpdating =
    updateVocabulary.isPending || updateTerm.isPending || updateSchema.isPending || updateMetadataSchema.isPending;

  const submitEdit = () => {
    if (!editTarget) return;
    if (editTarget.kind === "vocabulary") updateVocabulary.mutate();
    else if (editTarget.kind === "term") updateTerm.mutate();
    else if (editTarget.kind === "schema") updateSchema.mutate();
    else updateMetadataSchema.mutate();
  };

  const canManageCatalog = hasPermission("catalog.manage");
  const canManageVocab = hasPermission("catalog.vocab");

  return (
    <V2PageShell title="Master Data" subtitle="Consumer builds reusable vocabulary, term, schema, and metadata structure here before provider dataset registration happens." status="Live API">
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Active Domain</p>
          <p className="text-xs text-muted-foreground">Pick a domain first, then build master data from existing choices where available.</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder={loadingDomains ? "Loading..." : "Select domain"} /></SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (
              <SelectItem key={domain.id} value={domain.id}>
                {domain.organization_name ? `${domain.organization_name} — ` : ""}{domain.name} ({domain.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard title="Vocabularies" value={loadingVocabularies ? "..." : vocabularies.length} subtitle="Domain glossary" icon={BookOpen} trend="neutral" />
        <MetricCard title="Terms" value={loadingTerms ? "..." : terms.length} subtitle="Vocabulary term registry" icon={BookOpen} trend="neutral" />
        <MetricCard title="Schemas" value={loadingSchemas ? "..." : schemas.length} subtitle="Live schema contracts" icon={Database} trend="neutral" />
        <MetricCard title="Metadata Schemas" value={loadingMetadataSchemas ? "..." : metadataSchemas.length} subtitle="Schema field rows" icon={Layers} trend="neutral" />
      </div>

      <Tabs defaultValue="vocabularies">
        <TabsList>
          <TabsTrigger value="vocabularies">Vocabularies</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
          <TabsTrigger value="metadata">Metadata Schemas</TabsTrigger>
        </TabsList>

        <TabsContent value="vocabularies">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Vocabularies</CardTitle>
                <CardDescription>Create vocabulary first, with at least one starter term.</CardDescription>
              </div>
              <Button onClick={() => openWizard("vocabulary")} disabled={!canManageVocab || !domainId} className="gap-2">
                <Plus className="h-4 w-4" />Create Vocabulary
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Status", "Version", "Created", "Actions"]} isLoading={!domainId || loadingVocabularies}>
                {vocabularies.length > 0 ? vocabularies.map((vocabulary) => (
                  <tr key={vocabulary.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{vocabulary.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${vocabulary.status === "PUBLISHED" ? "border-emerald-500/30 text-emerald-500" : ""}`}>{vocabulary.status}</Badge></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{vocabulary.version}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(vocabulary.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1" disabled={!canManageVocab} onClick={() => setEditTarget({ kind: "vocabulary", data: vocabulary })}>
                          <Pencil className="h-3.5 w-3.5" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive" disabled={!canManageVocab} onClick={() => setDeleteTarget({ type: "vocabulary", id: vocabulary.id, label: vocabulary.name })}>
                          <Trash2 className="h-3.5 w-3.5" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No vocabularies found" : "Select a domain first"}</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Vocabulary Terms</CardTitle>
                <CardDescription>Add terms into an existing vocabulary so schema builder can reuse them.</CardDescription>
              </div>
              <Button onClick={() => openWizard("term")} disabled={!canManageVocab || !domainId} className="gap-2">
                <Plus className="h-4 w-4" />Add Term
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Term", "Datatype", "Unit", "Vocabulary", "Description", "Actions"]} isLoading={!domainId || loadingTerms}>
                {terms.length > 0 ? terms.map((term) => (
                  <tr key={term.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{term.term}</td>
                    <td className="px-4 py-3 text-sm">{term.datatype}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{term.unit || "-"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{term.vocabulary_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{term.description || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1" disabled={!canManageVocab} onClick={() => setEditTarget({ kind: "term", data: term })}>
                          <Pencil className="h-3.5 w-3.5" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive" disabled={!canManageVocab} onClick={() => setDeleteTarget({ type: "term", id: term.id, label: term.term })}>
                          <Trash2 className="h-3.5 w-3.5" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No vocabulary terms found" : "Select a domain first"}</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schemas">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Schemas</CardTitle>
                <CardDescription>Pick an existing vocabulary, then choose which terms should become schema fields.</CardDescription>
              </div>
              <Button onClick={() => openWizard("schema")} disabled={!canManageCatalog || !domainId} className="gap-2">
                <Plus className="h-4 w-4" />Create Schema
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Vocabulary", "Version", "Status", "Created", "Actions"]} isLoading={!domainId || loadingSchemas}>
                {schemas.length > 0 ? schemas.map((schema) => (
                  <tr key={schema.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{schema.vocabulary_name || schema.vocabulary_id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{schema.version}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${schema.status === "PUBLISHED" ? "border-emerald-500/30 text-emerald-500" : ""}`}>{schema.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(schema.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1" disabled={!canManageCatalog} onClick={() => setEditTarget({ kind: "schema", data: schema })}>
                          <Pencil className="h-3.5 w-3.5" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive" disabled={!canManageCatalog} onClick={() => setDeleteTarget({ type: "schema", id: schema.id, label: schema.vocabulary_name || schema.id })}>
                          <Trash2 className="h-3.5 w-3.5" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No schemas found" : "Select a domain first"}</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Metadata Schemas</CardTitle>
                <CardDescription>Add or refine field rows for an existing schema using live term choices.</CardDescription>
              </div>
              <Button onClick={() => openWizard("metadata")} disabled={!canManageCatalog || !domainId} className="gap-2">
                <Plus className="h-4 w-4" />Add Metadata Row
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Schema", "Vocabulary Term", "Required", "Cardinality", "Actions"]} isLoading={!domainId || loadingMetadataSchemas}>
                {metadataSchemas.length > 0 ? metadataSchemas.map((metadataSchema) => {
                  const schema = schemas.find((s) => s.id === metadataSchema.schema_id);
                  const term = terms.find((t) => t.id === metadataSchema.vocabulary_term_id);
                  return (
                    <tr key={metadataSchema.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm">{schema ? `${schema.vocabulary_name || schema.vocabulary_id.slice(0, 8)} (${schema.version})` : metadataSchema.schema_id.slice(0, 8) + "..."}</td>
                      <td className="px-4 py-3 text-sm">{term ? `${term.term} (${term.datatype})` : metadataSchema.vocabulary_term_id.slice(0, 8) + "..."}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${metadataSchema.required ? "border-red-500/30 text-red-500" : ""}`}>{metadataSchema.required ? "Yes" : "No"}</Badge></td>
                      <td className="px-4 py-3 text-sm">{metadataSchema.cardinality}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="gap-1" disabled={!canManageCatalog} onClick={() => setEditTarget({ kind: "metadata", data: metadataSchema })}>
                            <Pencil className="h-3.5 w-3.5" />Edit
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive" disabled={!canManageCatalog} onClick={() => setDeleteTarget({ type: "metadata", id: metadataSchema.id, label: term?.term || metadataSchema.id })}>
                            <Trash2 className="h-3.5 w-3.5" />Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No metadata schemas found" : "Select a domain first"}</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Wizard */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {wizardMode === "vocabulary" && "Create Vocabulary"}
              {wizardMode === "term" && "Add Vocabulary Term"}
              {wizardMode === "schema" && "Create Schema"}
              {wizardMode === "metadata" && "Add Metadata Schema Row"}
            </DialogTitle>
            <DialogDescription>
              {wizardMode === "vocabulary" && "Start from the top: define one vocabulary and at least one starter term."}
              {wizardMode === "term" && "Choose an existing vocabulary first, then append the next available term."}
              {wizardMode === "schema" && "Choose an existing vocabulary, then select which terms should become schema fields."}
              {wizardMode === "metadata" && "Choose an existing schema, then map one more term into it with required/cardinality flags."}
            </DialogDescription>
          </DialogHeader>

          {wizardMode === "vocabulary" && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Vocabulary Name</p>
                  <Input value={vocabularyForm.name} onChange={(event) => setVocabularyForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Well header vocabulary" />
                </div>
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Version</p>
                  <Input value={vocabularyForm.version} onChange={(event) => setVocabularyForm((prev) => ({ ...prev, version: event.target.value }))} placeholder="0.0.1" />
                </div>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Description</p>
                <Input value={vocabularyForm.description} onChange={(event) => setVocabularyForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Vocabulary purpose" />
              </div>
              <div className="rounded-xl border border-border/70 p-4">
                <p className="mb-3 text-sm font-medium">Starter Term</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input value={vocabularyForm.term} onChange={(event) => setVocabularyForm((prev) => ({ ...prev, term: event.target.value }))} placeholder="Term name" />
                  <Input value={vocabularyForm.datatype} onChange={(event) => setVocabularyForm((prev) => ({ ...prev, datatype: event.target.value }))} placeholder="string" />
                  <Input value={vocabularyForm.unit} onChange={(event) => setVocabularyForm((prev) => ({ ...prev, unit: event.target.value }))} placeholder="Unit (optional)" />
                  <Input value={vocabularyForm.term_description} onChange={(event) => setVocabularyForm((prev) => ({ ...prev, term_description: event.target.value }))} placeholder="Term description" />
                </div>
              </div>
            </div>
          )}

          {wizardMode === "term" && (
            <div className="grid gap-4 py-2">
              {vocabularies.length === 0 ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">No vocabularies yet — create one in the Vocabularies tab first.</p>
              ) : (
                <>
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Vocabulary</p>
                    <Select value={termForm.vocabulary_id} onValueChange={(value) => setTermForm((prev) => ({ ...prev, vocabulary_id: value }))}>
                      <SelectTrigger><SelectValue placeholder="Choose existing vocabulary" /></SelectTrigger>
                      <SelectContent>
                        {vocabularies.map((vocabulary) => (
                          <SelectItem key={vocabulary.id} value={vocabulary.id}>{vocabulary.name} ({vocabulary.version})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input value={termForm.term} onChange={(event) => setTermForm((prev) => ({ ...prev, term: event.target.value }))} placeholder="Term name" />
                    <Input value={termForm.datatype} onChange={(event) => setTermForm((prev) => ({ ...prev, datatype: event.target.value }))} placeholder="string" />
                    <Input value={termForm.unit} onChange={(event) => setTermForm((prev) => ({ ...prev, unit: event.target.value }))} placeholder="Unit (optional)" />
                    <Input value={termForm.description} onChange={(event) => setTermForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" />
                  </div>
                </>
              )}
            </div>
          )}

          {wizardMode === "schema" && (
            <div className="grid gap-4 py-2">
              {vocabularies.length === 0 ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">No vocabularies yet — create one in the Vocabularies tab first.</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">Vocabulary</p>
                      <Select value={schemaForm.vocabulary_id} onValueChange={(value) => setSchemaForm((prev) => ({ ...prev, vocabulary_id: value, selectedTerms: [] }))}>
                        <SelectTrigger><SelectValue placeholder="Choose vocabulary" /></SelectTrigger>
                        <SelectContent>
                          {vocabularies.map((vocabulary) => (
                            <SelectItem key={vocabulary.id} value={vocabulary.id}>{vocabulary.name} ({vocabulary.version})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">Schema Version</p>
                      <Input value={schemaForm.version} onChange={(event) => setSchemaForm((prev) => ({ ...prev, version: event.target.value }))} placeholder="0.0.1" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 p-4">
                    <p className="mb-3 text-sm font-medium">Choose Existing Terms</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableTermsForSelectedVocabulary.length > 0 ? availableTermsForSelectedVocabulary.map((term) => {
                        const checked = schemaForm.selectedTerms.includes(term.id);
                        return (
                          <label key={term.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                            <Checkbox checked={checked} onCheckedChange={(next) => setSchemaForm((prev) => ({ ...prev, selectedTerms: next ? [...prev.selectedTerms, term.id] : prev.selectedTerms.filter((id) => id !== term.id) }))} />
                            <div>
                              <p className="font-medium">{term.term}</p>
                              <p className="text-xs text-muted-foreground">{term.datatype}{term.unit ? ` | ${term.unit}` : ""}</p>
                            </div>
                          </label>
                        );
                      }) : (
                        <p className="text-sm text-muted-foreground sm:col-span-2">
                          {schemaForm.vocabulary_id ? "No terms found for this vocabulary yet. Add terms first." : "Choose a vocabulary first."}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {wizardMode === "metadata" && (
            <div className="grid gap-4 py-2">
              {schemas.length === 0 ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">No schemas yet — create one in the Schemas tab first.</p>
              ) : terms.length === 0 ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">No vocabulary terms available — add terms in the Terms tab first.</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">Schema</p>
                      <Select value={metadataForm.schema_id} onValueChange={(value) => setMetadataForm((prev) => ({ ...prev, schema_id: value }))}>
                        <SelectTrigger><SelectValue placeholder="Choose existing schema" /></SelectTrigger>
                        <SelectContent>
                          {schemas.map((schema) => (
                            <SelectItem key={schema.id} value={schema.id}>{schema.vocabulary_name || schema.vocabulary_id} ({schema.version})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">Term</p>
                      <Select value={metadataForm.vocabulary_term_id} onValueChange={(value) => setMetadataForm((prev) => ({ ...prev, vocabulary_term_id: value }))}>
                        <SelectTrigger><SelectValue placeholder="Choose existing term" /></SelectTrigger>
                        <SelectContent>
                          {terms.map((term) => (
                            <SelectItem key={term.id} value={term.id}>{term.term} ({term.datatype})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">Cardinality</p>
                      <Select value={metadataForm.cardinality} onValueChange={(value) => setMetadataForm((prev) => ({ ...prev, cardinality: value as MetadataSchemaCardinality }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SINGLE">SINGLE</SelectItem>
                          <SelectItem value="MULTIPLE">MULTIPLE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3 mt-6 sm:mt-0">
                      <Checkbox checked={metadataForm.required} onCheckedChange={(checked) => setMetadataForm((prev) => ({ ...prev, required: Boolean(checked) }))} />
                      <span className="text-sm font-medium">Required field</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitWizard} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editTarget?.kind === "vocabulary" && "Edit Vocabulary"}
              {editTarget?.kind === "term" && "Edit Vocabulary Term"}
              {editTarget?.kind === "schema" && "Edit Schema"}
              {editTarget?.kind === "metadata" && "Edit Metadata Schema"}
            </DialogTitle>
            <DialogDescription>Changes apply via PATCH to the live backend.</DialogDescription>
          </DialogHeader>

          {editTarget?.kind === "vocabulary" && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Name</p>
                  <Input value={editVocabularyForm.name} onChange={(e) => setEditVocabularyForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Version</p>
                  <Input value={editVocabularyForm.version} onChange={(e) => setEditVocabularyForm((p) => ({ ...p, version: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Description</p>
                <Input value={editVocabularyForm.description} onChange={(e) => setEditVocabularyForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Status</p>
                <Select value={editVocabularyForm.status} onValueChange={(v) => setEditVocabularyForm((p) => ({ ...p, status: v as VocabularyStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {editTarget?.kind === "term" && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><p className="text-sm font-medium">Term</p><Input value={editTermForm.term} onChange={(e) => setEditTermForm((p) => ({ ...p, term: e.target.value }))} /></div>
                <div className="grid gap-2"><p className="text-sm font-medium">Datatype</p><Input value={editTermForm.datatype} onChange={(e) => setEditTermForm((p) => ({ ...p, datatype: e.target.value }))} /></div>
                <div className="grid gap-2"><p className="text-sm font-medium">Unit</p><Input value={editTermForm.unit} onChange={(e) => setEditTermForm((p) => ({ ...p, unit: e.target.value }))} /></div>
                <div className="grid gap-2"><p className="text-sm font-medium">Description</p><Input value={editTermForm.description} onChange={(e) => setEditTermForm((p) => ({ ...p, description: e.target.value }))} /></div>
              </div>
            </div>
          )}

          {editTarget?.kind === "schema" && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Version</p>
                  <Input value={editSchemaForm.version} onChange={(e) => setEditSchemaForm((p) => ({ ...p, version: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Status</p>
                  <Select value={editSchemaForm.status} onValueChange={(v) => setEditSchemaForm((p) => ({ ...p, status: v as SchemaStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                      <SelectItem value="DEPRECATED">DEPRECATED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {editTarget?.kind === "metadata" && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <p className="text-sm font-medium">Vocabulary Term</p>
                <Select value={editMetadataForm.vocabulary_term_id} onValueChange={(v) => setEditMetadataForm((p) => ({ ...p, vocabulary_term_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>{term.term} ({term.datatype})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Cardinality</p>
                  <Select value={editMetadataForm.cardinality} onValueChange={(v) => setEditMetadataForm((p) => ({ ...p, cardinality: v as MetadataSchemaCardinality }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">SINGLE</SelectItem>
                      <SelectItem value="MULTIPLE">MULTIPLE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3 mt-6 sm:mt-0">
                  <Checkbox checked={editMetadataForm.required} onCheckedChange={(checked) => setEditMetadataForm((p) => ({ ...p, required: Boolean(checked) }))} />
                  <span className="text-sm font-medium">Required field</span>
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{deleteTarget?.label || "the selected item"}</strong> from master data. Downstream schema or dataset references can break if they still depend on it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default MasterData;
