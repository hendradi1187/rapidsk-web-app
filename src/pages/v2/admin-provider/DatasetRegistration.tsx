import { useMemo, useState } from "react";
import { Database, Plus, Layers, Pencil, Trash2, Activity, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { useAllDomains } from "@/api/hooks/useDomains";
import { useDatasets, useCreateDataset, useDeleteDataset, useUpdateDataset } from "@/api/hooks/useDatasets";
import { useCurrentSessionParticipant, useParticipants } from "@/api/hooks/useParticipants";
import { schemasApi } from "@/api/services/data-catalog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { countDatasetIssues, getApiErrorSummary } from "@/lib/provider-flow-diagnostics";

const emptyForm = {
  name: "",
  description: "",
  schema_id: "",
  version: "0.0.1",
  endpoint_url: "",
  access_type: "PRIVATE",
  protocol: "REST_API",
  documentation_url: "",
  data_format: "JSON",
  tags: "contract-fulfilment",
  sla: "Best effort",
  rate_limit_json: "{\"requests_per_minute\":60}",
};

const DatasetRegistration = () => {
  const { hasPermission, user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { data: domainsData, isLoading: loadingDomains, error: domainsError } = useAllDomains({ limit: 1000 });
  const domains = domainsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";
  const { participant: sessionProvider } = useCurrentSessionParticipant({ limit: 50 }, "forceProvider");
  const { data: allParticipantsData } = useParticipants({ limit: 100 });
  const enterpriseParticipants = (allParticipantsData?.data ?? []).filter((participant) => participant.organization_type === "ENTERPRISE");
  const [actAsProviderId, setActAsProviderId] = useState<string>("");
  const providerParticipant = isSuperAdmin
    ? enterpriseParticipants.find((participant) => participant.id === actAsProviderId) || enterpriseParticipants[0]
    : sessionProvider;

  const { data: datasetsData, isLoading: loadingDatasets, error: datasetsError } = useDatasets(domainId, { limit: 50 });
  const { data: schemasData, isLoading: loadingSchemas, error: schemasError } = useQuery({
    queryKey: ["dataset-registration-schemas", domainId],
    queryFn: () => schemasApi.list(domainId, { limit: 50 }),
    enabled: !!domainId,
  });

  const createDataset = useCreateDataset();
  const updateDataset = useUpdateDataset();
  const deleteDataset = useDeleteDataset();
  const [open, setOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const datasets = datasetsData?.data ?? [];
  const schemas = schemasData?.data ?? [];
  const selectedSchemaId = form.schema_id || schemas[0]?.id || "";
  const canManageDatasets = hasPermission("datasets.manage") || hasPermission("fulfilment.manage");
  const datasetStatusCounts = useMemo(
    () => ({
      published: datasets.filter((dataset) => dataset.status === "PUBLISHED").length,
      draft: datasets.filter((dataset) => dataset.status === "DRAFT").length,
    }),
    [datasets]
  );
  const datasetIssues = countDatasetIssues(datasets);
  const datasetIssueTotal = Object.values(datasetIssues).reduce((sum, count) => sum + count, 0);
  const activeError = domainsError || datasetsError || schemasError;
  const errorSummary = activeError ? getApiErrorSummary(activeError, "Dataset registration backend error") : null;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingDataset(null);
  };

  const handleEdit = (dataset: any) => {
    setEditingDataset(dataset);
    setForm({
      name: dataset.name || "",
      description: dataset.description || "",
      schema_id: dataset.schema_id || "",
      version: dataset.version || "0.0.1",
      endpoint_url: dataset.endpoint?.url || "",
      access_type: dataset.endpoint?.access_type || "PRIVATE",
      protocol: dataset.endpoint?.protocol || "REST_API",
      documentation_url: dataset.endpoint_metadata?.documentation_url || "",
      data_format: dataset.endpoint_metadata?.data_format || "JSON",
      tags: Array.isArray(dataset.endpoint_metadata?.tags) ? dataset.endpoint_metadata.tags.join(",") : "contract-fulfilment",
      sla: dataset.endpoint_metadata?.sla || "Best effort",
      rate_limit_json: JSON.stringify(dataset.endpoint_metadata?.rate_limit || { requests_per_minute: 60 }),
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!domainId || !providerParticipant?.id || !selectedSchemaId || !form.name || !form.endpoint_url) {
      toast.error("Provider, domain, schema, dataset name, and endpoint URL are required");
      return;
    }

    let rateLimit: Record<string, unknown> = {};
    try {
      rateLimit = JSON.parse(form.rate_limit_json);
    } catch {
      toast.error("Rate limit metadata must be valid JSON");
      return;
    }

    const payload = {
      provider_id: providerParticipant.id,
      schema_id: selectedSchemaId,
      name: form.name,
      description: form.description || null,
      version: form.version,
      endpoint: {
        url: form.endpoint_url,
        access_type: form.access_type as "PUBLIC" | "PRIVATE",
        auth_strategy: null,
        protocol: form.protocol as "REST_API" | "GRPC" | "ODATA" | "GRAPHQL",
      },
      endpoint_metadata: {
        rate_limit: rateLimit,
        documentation_url: form.documentation_url,
        data_format: form.data_format,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        sla: form.sla,
      },
      metadata:
        editingDataset?.metadata?.map((item: any) => ({
          vocabulary_term_id: item.vocabulary_term_id,
          source: item.source,
          source_ref: item.source_ref,
        })) || [],
    };

    if (editingDataset) {
      updateDataset.mutate(
        {
          domainId,
          id: editingDataset.id,
          data: {
            name: payload.name,
            description: payload.description,
            schema_id: payload.schema_id,
            version: payload.version,
            endpoint: payload.endpoint,
            endpoint_metadata: payload.endpoint_metadata,
            metadata: payload.metadata,
          },
        },
        {
          onSuccess: () => {
            toast.success("Dataset updated successfully");
            setOpen(false);
            resetForm();
          },
          onError: (error: any) => {
            const summary = getApiErrorSummary(error, "Failed to update dataset");
            toast.error(summary.title, { description: summary.detail });
          },
        }
      );
      return;
    }

    createDataset.mutate(
      { domainId, data: payload },
      {
        onSuccess: () => {
          toast.success("Dataset registered successfully");
          setOpen(false);
          resetForm();
        },
        onError: (error: any) => {
          const summary = getApiErrorSummary(error, "Failed to register dataset");
          toast.error(summary.title, { description: summary.detail });
        },
      }
    );
  };

  return (
    <V2PageShell
      title="Dataset Registration"
      subtitle="Register, update, and remove provider datasets with backend-valid endpoint and metadata payloads."
      status="Live API"
    >
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">
        CRUD dataset di modul ini memakai endpoint live yang ada sekarang:
        <code className="mx-1 rounded bg-emerald-500/10 px-1">GET/POST/PATCH/DELETE /data-catalog/{"{domain_id}"}/datasets</code>.
        Dependensi yang wajib ada sebelum create adalah provider participant dan schema domain. Kalau schema belum ada, action create memang sengaja ditahan.
      </div>
      {errorSummary && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{errorSummary.title}</AlertTitle>
          <AlertDescription>{errorSummary.detail}</AlertDescription>
        </Alert>
      )}
      {!errorSummary && datasetIssueTotal > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dataset payload backend partially invalid</AlertTitle>
          <AlertDescription>
            {datasetIssueTotal} issue(s) detected. Missing endpoint URL: {datasetIssues.missingEndpointUrl}, missing protocol: {datasetIssues.missingProtocol}, missing access type: {datasetIssues.missingAccessType}, missing schema_id: {datasetIssues.missingSchema}.
          </AlertDescription>
        </Alert>
      )}

      {isSuperAdmin && (
        <div className="flex items-center gap-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <Database className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Acting As Provider (SUPER_ADMIN view)</p>
            <p className="text-xs text-muted-foreground">Pick which KKKS provider you are registering datasets for. PROVIDER users see only their own organization.</p>
          </div>
          <Select value={providerParticipant?.id || ""} onValueChange={setActAsProviderId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder={enterpriseParticipants.length ? "Select provider" : "No ENTERPRISE participants registered"} />
            </SelectTrigger>
            <SelectContent>
              {enterpriseParticipants.map((participant) => (
                <SelectItem key={participant.id} value={participant.id}>
                  {participant.organization_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">Datasets are registered under a specific domain and schema.</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={loadingDomains ? "Loading..." : "Select domain"} />
          </SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (
              <SelectItem key={domain.id} value={domain.id}>
                {domain.name} ({domain.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard title="Registered Datasets" value={loadingDatasets ? "..." : datasets.length} subtitle="In current domain" icon={Database} trend="up" />
        <MetricCard title="Published" value={loadingDatasets ? "..." : datasetStatusCounts.published} subtitle="Ready for transfer" icon={Database} trend="up" />
        <MetricCard title="Draft" value={loadingDatasets ? "..." : datasetStatusCounts.draft} subtitle="Not yet published" icon={Database} trend="neutral" />
        <MetricCard title="Schemas" value={loadingSchemas ? "..." : schemas.length} subtitle="Available for registration" icon={Layers} trend="neutral" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Datasets</CardTitle>
            <CardDescription>Provider dataset registry from the data-catalog API</CardDescription>
          </div>
          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-2"
                disabled={!domainId || !providerParticipant || !canManageDatasets || schemas.length === 0}
                title={
                  !domainId
                    ? "Select a domain first"
                    : !providerParticipant
                    ? "No provider participant resolved - register a KKKS in Admin Consumer first"
                    : schemas.length === 0
                    ? "No schemas in this domain - create one in Master Data first"
                    : !canManageDatasets
                    ? "Missing permission datasets.manage / fulfilment.manage"
                    : "Register a new dataset"
                }
              >
                <Plus className="h-4 w-4" />
                Register Dataset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingDataset ? "Edit Dataset" : "Register New Dataset"}</DialogTitle>
                <DialogDescription>Creates or updates a backend-valid dataset payload using provider, schema, endpoint, and endpoint metadata.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Provider</Label>
                    <Input value={providerParticipant?.organization_name || "No provider resolved"} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label>Schema *</Label>
                    <Select value={selectedSchemaId} onValueChange={(value) => setForm({ ...form, schema_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingSchemas ? "Loading schemas..." : "Select schema"} />
                      </SelectTrigger>
                      <SelectContent>
                        {schemas.map((schema) => (
                          <SelectItem key={schema.id} value={schema.id}>
                            {schema.version} - {schema.vocabulary_name || schema.id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Dataset Name *</Label>
                    <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Well Production Data Q1" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Version * (semver: e.g. 0.0.1)</Label>
                    <Input value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} placeholder="0.0.1" pattern="^\\d+\\.\\d+\\.\\d+$" />
                    {form.version && !/^\d+\.\d+\.\d+$/.test(form.version) && <p className="text-xs text-red-500">Must match d+.d+.d+ backend semver regex</p>}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Contract fulfilment dataset for exchange." />
                </div>

                <div className="grid gap-2">
                  <Label>Endpoint URL *</Label>
                  <Input value={form.endpoint_url} onChange={(event) => setForm({ ...form, endpoint_url: event.target.value })} placeholder="https://provider.example.com/api/datasets/production" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Access Type *</Label>
                    <Select value={form.access_type} onValueChange={(value) => setForm({ ...form, access_type: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRIVATE">PRIVATE</SelectItem>
                        <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Protocol *</Label>
                    <Select value={form.protocol} onValueChange={(value) => setForm({ ...form, protocol: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REST_API">REST_API</SelectItem>
                        <SelectItem value="GRPC">GRPC</SelectItem>
                        <SelectItem value="ODATA">ODATA</SelectItem>
                        <SelectItem value="GRAPHQL">GRAPHQL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Documentation URL</Label>
                    <Input value={form.documentation_url} onChange={(event) => setForm({ ...form, documentation_url: event.target.value })} placeholder="https://provider.example.com/docs" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Data Format</Label>
                    <Input value={form.data_format} onChange={(event) => setForm({ ...form, data_format: event.target.value })} placeholder="JSON" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Tags</Label>
                    <Input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="contract-fulfilment,production" />
                  </div>
                  <div className="grid gap-2">
                    <Label>SLA</Label>
                    <Input value={form.sla} onChange={(event) => setForm({ ...form, sla: event.target.value })} placeholder="Best effort" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Rate Limit Metadata (JSON)</Label>
                  <Textarea value={form.rate_limit_json} onChange={(event) => setForm({ ...form, rate_limit_json: event.target.value })} placeholder='{"requests_per_minute":60}' />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={(createDataset.isPending || updateDataset.isPending) || !canManageDatasets}>
                  {createDataset.isPending || updateDataset.isPending ? "Saving..." : editingDataset ? "Save Changes" : "Register"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Name", "Protocol", "Access", "Version", "Status", "Actions"]} isLoading={!domainId || loadingDatasets}>
            {datasets.length > 0 ? (
              datasets.map((dataset) => (
                <tr key={dataset.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{dataset.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{dataset.endpoint?.protocol || "-"}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{dataset.endpoint?.access_type || "-"}</Badge></td>
                  <td className="px-4 py-3 text-sm font-mono">{dataset.version || "-"}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${dataset.status === "PUBLISHED" ? "border-emerald-500/30 text-emerald-500" : ""}`}>{dataset.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-2" disabled title="Backend health-check endpoint (/datasets/{id}/health) belum tersedia">
                        <Activity className="h-4 w-4" />
                        Health API Belum Disediakan
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" disabled={!canManageDatasets} onClick={() => handleEdit(dataset)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2 border-destructive/40 text-destructive" disabled={!canManageDatasets} onClick={() => setDeleteTarget(dataset)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {domainId ? "No datasets registered" : "Select a domain"}
                </td>
              </tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{deleteTarget?.name || "the selected dataset"}</strong> from the provider catalog in the current domain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteDataset.mutate(
                  { domainId, id: deleteTarget.id },
                  {
                    onSuccess: () => {
                      toast.success("Dataset deleted successfully");
                      setDeleteTarget(null);
                    },
                    onError: (error: any) => {
                      const summary = getApiErrorSummary(error, "Failed to delete dataset");
                      toast.error(summary.title, { description: summary.detail });
                    },
                  }
                )
              }
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default DatasetRegistration;
