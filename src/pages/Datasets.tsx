import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { DomainClusterTabs } from "@/components/common/DomainClusterTabs";
import { Pager } from "@/components/common/Pager";
import { datasetDomain, DOMAINS } from "@/lib/fulfillment";
import { ogcRuntimeGuardError } from "@/lib/dataset-endpoint";
import { useAuth } from "@/context/AuthContext";
import { useDomain } from "@/context/DomainContext";
import { PublishDatasetDialog } from "@/components/datasets/PublishDatasetDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Database,
  Eye,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  Layers3,
  Link2,
  Settings2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useDatasets,
  useDeleteDataset,
  useUpdateDataset,
} from "@/api/hooks/useDatasets";
import { useDatasetLevels, LEVEL_BADGE, LEVEL_LABEL } from "@/api/hooks/useDatasetLevels";
import { useProviders } from "@/api/hooks/useProviders";
import { useRuntime } from "@/context/RuntimeContext";
import { adapterServiceApi } from "@/api/services/adapter-service";
import { AdapterCollectionPicker } from "@/components/datasets/AdapterCollectionPicker";
import { datasetAdapterLink } from "@/lib/adapter-dataset-link";
import type { Dataset, DatasetUpdateRequest } from "@/api/types/data-catalog";

const DOMAIN_CODE_TO_KEY: Record<string, string> = {
  WK: "wilayah_kerja", FLD: "lapangan", SEI: "seismik", WLL: "sumur", FP: "fasilitas",
};

const buildAdapterRuntime = (domainCode: string) => ({
  version: "1.0",
  domain_code: domainCode,
  source_type: "OGC_API_FEATURES",
  supports_bbox: true,
  supports_head: true,
  collection_path: "/api/v1/ogc/ogc/collections/{domain_code}/items",
  response_format: "GEOJSON_FEATURE_COLLECTION",
  fixed_query_params: {},
  allowed_query_params: {},
  supports_limit_offset: true,
  forward_unknown_params: false,
  include_metadata_default: false,
});

const stringifyRuntime = (runtime?: Record<string, unknown> | null) =>
  runtime ? JSON.stringify(runtime, null, 2) : "";

// ─── Helpers untuk badge style ────────────────────────────────────────
// Classification & status sementara free string per spec — UI memberi style
// default + fallback netral untuk value yang tidak dikenali.

const CLASSIFICATION_STYLES: Record<string, string> = {
  public: "bg-emerald-50 text-emerald-700 border-emerald-200",
  internal: "bg-blue-50 text-blue-700 border-blue-200",
  restricted: "bg-amber-50 text-amber-700 border-amber-200",
  confidential: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_STYLES: Record<string, string> = {
  active: "badge-active",
  published: "badge-active",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  archived: "bg-zinc-100 text-zinc-600 border-zinc-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

const classificationClass = (value: string) =>
  CLASSIFICATION_STYLES[value?.toLowerCase()] ?? "bg-slate-50 text-slate-700 border-slate-200";

const statusClass = (value: string) =>
  STATUS_STYLES[value?.toLowerCase()] ?? "bg-slate-50 text-slate-700 border-slate-200";

type DatasetEditForm = {
  name: string;
  version: string;
  description: string;
  status: string;
  endpoint_url: string;
  protocol: string;
  access_type: string;
  auth_strategy_type: string;
  documentation_url: string;
  data_format: string;
  sla: string;
  tags: string;
  runtime_json: string;
};

const toEditForm = (dataset: Dataset): DatasetEditForm => ({
  name: dataset.dataset_name ?? "",
  version: dataset.version ?? "0.0.1",
  description: dataset.description ?? "",
  status: (dataset.status ?? "").toUpperCase() || "PUBLISHED",
  endpoint_url: dataset.endpoint_url ?? "",
  protocol: dataset.protocol ?? "OGC_API_FEATURES",
  access_type: dataset.access_type ?? "PRIVATE",
  auth_strategy_type: (dataset.endpoint_auth_strategy as { type?: string } | null)?.type ?? "NONE",
  documentation_url: dataset.endpoint_documentation_url ?? "",
  data_format: dataset.endpoint_data_format ?? "application/geo+json",
  sla: dataset.endpoint_sla ?? "best-effort",
  // D6: tags[0] = domain key (menentukan domain dataset) → dikunci, tidak ikut field editable.
  // Field tags hanya mengelola tags[1..]; domain key selalu di-prepend saat build payload.
  tags: Array.isArray(dataset.endpoint_tags) ? dataset.endpoint_tags.slice(1).join(", ") : "",
  runtime_json: stringifyRuntime(dataset.endpoint_runtime),
});

const Datasets = () => {
  // State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassification, setFilterClassification] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDomain, setFilterDomain] = useState<string>("all"); // cluster domain
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const { hasRole, role, participantId } = useAuth();
  const { domainId } = useDomain();
  const { runtimeConfig } = useRuntime();
  const adapterEndpoint = runtimeConfig?.adapterEndpoint ?? "";
  const canPublish = hasRole(["PROVIDER", "SUPER_ADMIN", "ADMIN"]);
  const canManage = hasRole(["PROVIDER", "SUPER_ADMIN", "ADMIN"]);

  const [adapterCols, setAdapterCols] = useState<Array<{ id: string; domain_code: string; title: string }>>([]);
  const [loadingAdapterCols, setLoadingAdapterCols] = useState(false);
  const [showAdapterCols, setShowAdapterCols] = useState(false);

  const loadAdapterCols = async () => {
    if (!adapterEndpoint) return toast.error("Adapter endpoint belum dikonfigurasi.");
    setLoadingAdapterCols(true);
    try {
      const res = await adapterServiceApi.listCollections() as { collections?: typeof adapterCols };
      setAdapterCols(res?.collections ?? []);
      setShowAdapterCols(true);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Gagal memuat koleksi adapter."));
    } finally {
      setLoadingAdapterCols(false);
    }
  };

  // Ringkasan koleksi yang barusan terhubung di dialog edit (untuk chip).
  const [editConnectedCollection, setEditConnectedCollection] = useState<{ domain_code: string; title: string } | null>(null);
  const applyAdapterCol = (col: { id: string; domain_code: string; title: string }) => {
    // Dataset adapter sekarang menyimpan base URL adapter di endpoint.url.
    // Jalur koleksi final dibentuk dari endpoint_metadata.runtime agar domain_code
    // bisa diganti dinamis tanpa hardcode URL penuh per dataset.
    const baseUrl = adapterEndpoint.replace(/\/$/, "");
    const docsUrl = `${baseUrl}/docs`;
    setEditForm((f) => ({
      ...f,
      endpoint_url: baseUrl,
      documentation_url: docsUrl,
      protocol: "OGC_API_FEATURES",
      data_format: "application/geo+json",
      runtime_json: stringifyRuntime(buildAdapterRuntime(col.domain_code)),
    }));
    setEditConnectedCollection({ domain_code: col.domain_code, title: col.title || col.domain_code });
    setShowAdapterCols(false);
    toast.success(`URL diisi: ${col.title || col.domain_code}`);
  };
  const [publishOpen, setPublishOpen] = useState(false);

  // Deep-link CTA dari tab Adapter: /datasets?create=1&adapterCollection=WK
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [presetCollectionCode, setPresetCollectionCode] = useState<string | null>(null);
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setPresetCollectionCode(searchParams.get("adapterCollection"));
      setPublishOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      next.delete("adapterCollection");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Banner discoverability (bisa ditutup, disimpan di localStorage).
  const [bannerDismissed, setBannerDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("datasets_adapter_banner_dismissed") === "1",
  );
  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem("datasets_adapter_banner_dismissed", "1");
    } catch {
      // abaikan quota
    }
  };

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [editForm, setEditForm] = useState<DatasetEditForm>({
    name: "",
    version: "0.0.1",
    description: "",
    status: "PUBLISHED",
    endpoint_url: "",
    protocol: "OGC_API_FEATURES",
    access_type: "PRIVATE",
    auth_strategy_type: "NONE",
    documentation_url: "",
    data_format: "application/geo+json",
    sla: "best-effort",
    tags: "",
    runtime_json: "",
  });

  // API hooks
  const {
    data: datasets,
    isLoading,
    isError,
    error,
    refetch,
  } = useDatasets();

  const updateMutation = useUpdateDataset();
  const deleteMutation = useDeleteDataset();

  // Klasifikasi L0–L4 (dari dataset.level — field description GX-Space)
  const { levelOf } = useDatasetLevels();

  // Resolve nama provider dari participant (provider_id → organization_name)
  const { data: providersData } = useProviders();
  const providerNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of (providersData ?? []) as Array<{ provider_id: string; provider_name: string }>) m[p.provider_id] = p.provider_name;
    return m;
  }, [providersData]);
  const providerName = (d: Dataset): string => (d.provider_id && providerNameById[d.provider_id]) || d.provider_name || "—";

  // Badge sumber dataset: "Adapter · WK" bila hasil ingest (runtime OGC), atau "Manual".
  const sourceBadge = (d: Dataset) => {
    const link = datasetAdapterLink(d);
    return link.viaAdapter ? (
      <Badge variant="outline" className="text-[10px] border-sky-200 bg-sky-50 text-sky-700" title="Dataset ini memakai koleksi hasil ingest adapter">
        <Link2 className="mr-1 h-3 w-3" />
        Adapter{link.domainCode ? ` · ${link.domainCode}` : ""}
      </Badge>
    ) : (
      <Badge variant="outline" className="text-[10px] border-slate-200 bg-slate-50 text-slate-600" title="Endpoint diisi manual (WFS/REST langsung)">
        Manual
      </Badge>
    );
  };

  // Isolasi data: KKKS (PROVIDER) hanya lihat dataset miliknya. BE sudah memfilter,
  // ini lapis pertahanan kedua di FE.
  // D9: PROVIDER tanpa participantId tidak boleh melihat dataset milik semua orang.
  const providerWithoutParticipant = role === "PROVIDER" && !participantId;
  const scopedDatasets = useMemo(() => {
    if (!datasets) return [];
    if (role === "PROVIDER") {
      if (!participantId) return [];
      return datasets.filter((d) => d.provider_id === participantId);
    }
    return datasets;
  }, [datasets, role, participantId]);

  // Filter dasar (search + level + status), TANPA cluster domain.
  const baseFiltered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return scopedDatasets.filter((d) => {
      const matchesSearch =
        d.dataset_name?.toLowerCase().includes(q) ||
        d.schema_name?.toLowerCase().includes(q) ||
        providerName(d).toLowerCase().includes(q);
      const matchesLevel = filterClassification === "all" || levelOf(d) === filterClassification;
      const matchesStatus = filterStatus === "all" || d.status === filterStatus;
      return matchesSearch && matchesLevel && matchesStatus;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedDatasets, searchQuery, filterClassification, filterStatus, providerNameById]);

  // Hitungan per cluster domain (untuk chip)
  const domainCounts = useMemo(() => {
    const c: Record<string, number> = { all: baseFiltered.length };
    for (const d of DOMAINS) c[d.key] = 0;
    for (const ds of baseFiltered) {
      const k = datasetDomain(ds);
      if (k) c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [baseFiltered]);

  // Terapkan cluster domain
  const filteredDatasets = useMemo(
    () => (filterDomain === "all" ? baseFiltered : baseFiltered.filter((d) => datasetDomain(d) === filterDomain)),
    [baseFiltered, filterDomain],
  );

  // Pagination
  const pagedDatasets = useMemo(
    () => filteredDatasets.slice((page - 1) * pageSize, page * pageSize),
    [filteredDatasets, page, pageSize],
  );
  // Reset ke halaman 1 saat filter/pencarian berubah
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterClassification, filterStatus, filterDomain, pageSize]);

  const hasActiveFilters = filterClassification !== "all" || filterStatus !== "all";
  const clearFilters = () => {
    setFilterClassification("all");
    setFilterStatus("all");
  };

  // Distinct level (L0–L4) untuk filter dropdown
  const distinctClassifications = useMemo(() => {
    return Array.from(new Set(scopedDatasets.map((d) => levelOf(d)).filter(Boolean) as string[])).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedDatasets]);

  const distinctStatuses = useMemo(() => {
    return Array.from(new Set(scopedDatasets.map((d) => d.status).filter(Boolean)));
  }, [scopedDatasets]);

  const openViewDialog = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setEditForm(toEditForm(dataset));
    const link = datasetAdapterLink(dataset);
    setEditConnectedCollection(
      link.viaAdapter && link.domainCode ? { domain_code: link.domainCode, title: link.domainCode } : null,
    );
    setShowAdapterCols(false);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setIsDeleteDialogOpen(true);
  };

  const buildUpdatePayload = (dataset: Dataset, values: DatasetEditForm): DatasetUpdateRequest => {
    const trimmedName = values.name.trim();
    const trimmedVersion = values.version.trim();
    const trimmedDescription = values.description.trim();
    const trimmedUrl = values.endpoint_url.trim();
    const normalizedStatus = values.status.trim().toUpperCase();
    const normalizedProtocol = values.protocol.trim().toUpperCase();
    const normalizedAccess = values.access_type.trim().toUpperCase();
    const authType = values.auth_strategy_type.trim().toUpperCase() || "NONE";
    const docUrl = values.documentation_url.trim();
    const dataFmt = values.data_format.trim() || "application/geo+json";
    const slaVal = values.sla.trim() || "best-effort";
    // D6: kunci domain key (tags[0]) — selalu prepend nilai lama, buang bila user mengetiknya ulang.
    const domainTag = dataset.endpoint_tags?.[0];
    const userTags = values.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const tagsArr = domainTag ? [domainTag, ...userTags.filter((t) => t !== domainTag)] : userTags;
    const runtimeValue = values.runtime_json.trim() ? JSON.parse(values.runtime_json) : null;
    // BE PATCH meng-validasi endpoint.auth_strategy secara rusak (config selalu dianggap
    // OAUTH2, dan auth_strategy:null → 500). Maka endpoint HANYA dikirim bila field-nya
    // benar-benar berubah dari data asli; edit metadata saja tidak menyentuh endpoint.
    const origAuthType = (dataset.endpoint_auth_strategy as { type?: string } | null)?.type ?? "NONE";
    const endpointChanged =
      trimmedUrl !== (dataset.endpoint_url ?? "") ||
      normalizedProtocol !== String(dataset.protocol ?? "").toUpperCase() ||
      normalizedAccess !== String(dataset.access_type ?? "").toUpperCase() ||
      authType !== String(origAuthType).toUpperCase();

    const payload: DatasetUpdateRequest = {
      name: trimmedName || null,
      version: trimmedVersion || null,
      description: trimmedDescription || null,
      status: normalizedStatus || null,
      endpoint_metadata: {
        documentation_url: docUrl || trimmedUrl || "",
        data_format: dataFmt,
        sla: slaVal,
        tags: tagsArr,
        rate_limit: {},
        runtime: runtimeValue,
      },
    };

    if (endpointChanged && trimmedUrl) {
      // BE mewajibkan auth_strategy.config selalu ada dengan shape OAuth2
      // (token_url, client_id_key, scope[]) untuk SEMUA type — null/kosong → 422/500.
      // Form hanya menangkap `type`, jadi config dikirim kosong (valid untuk NONE).
      payload.endpoint = {
        url: trimmedUrl,
        protocol: normalizedProtocol || null,
        access_type: normalizedAccess || null,
        auth_strategy: {
          type: authType,
          config: { token_url: "", client_id_key: "", scope: [] },
        },
      };
    }

    return payload;
  };

  const handleUpdateDataset = async () => {
    if (!selectedDataset) return;
    // D10: mutasi dataset butuh domain aktif (endpoint API domain-scoped).
    if (!domainId) {
      toast.error("Pilih domain aktif dulu sebelum menyimpan perubahan dataset.");
      return;
    }
    // D11: samakan dengan publish — nama minimal 3 karakter.
    if (editForm.name.trim().length < 3) {
      toast.error("Nama dataset wajib diisi minimal 3 karakter");
      return;
    }
    if (!/^\d+\.\d+\.\d+$/.test(editForm.version.trim())) {
      toast.error("Versi dataset harus pakai format semantic version, misalnya 1.0.0");
      return;
    }
    if (editForm.endpoint_url.trim() && !/^https?:\/\//i.test(editForm.endpoint_url.trim())) {
      toast.error("URL endpoint harus diawali http:// atau https://");
      return;
    }
    if (editForm.documentation_url.trim() && !/^https?:\/\//i.test(editForm.documentation_url.trim())) {
      toast.error("URL dokumentasi harus diawali http:// atau https://");
      return;
    }
    if (!editForm.documentation_url.trim() && !editForm.endpoint_url.trim()) {
      toast.error("URL dokumentasi atau URL endpoint wajib diisi — connector membutuhkan minimal salah satu sebagai sumber data");
      return;
    }
    // D7: runtime JSON harus valid sebelum submit — jangan biarkan JSON.parse melempar
    // "Unexpected token" mentah ke user.
    let parsedRuntime: Record<string, unknown> | null = null;
    if (editForm.runtime_json.trim()) {
      try {
        const parsed = JSON.parse(editForm.runtime_json);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("bukan object");
        }
        parsedRuntime = parsed as Record<string, unknown>;
      } catch {
        toast.error("Runtime Context bukan JSON valid. Perbaiki isian JSON-nya atau kosongkan.");
        return;
      }
    }
    // D1: mirror guard publish — OGC_API_FEATURES wajib punya runtime.collection_path.
    const ogcError = ogcRuntimeGuardError(editForm.protocol, parsedRuntime);
    if (ogcError) {
      toast.error(ogcError, { duration: 9000 });
      return;
    }
    // D2: form edit tidak menangkap field kredensial, jadi endpoint auth non-NONE akan
    // terkirim dengan config kosong dan menimpa kredensial asli → transfer privat gagal diam.
    // Blokir bila endpoint akan berubah sekaligus memakai strategi auth selain NONE.
    const nextAuthType = editForm.auth_strategy_type.trim().toUpperCase() || "NONE";
    const origAuthType = String((selectedDataset.endpoint_auth_strategy as { type?: string } | null)?.type ?? "NONE").toUpperCase();
    const endpointWillChange =
      editForm.endpoint_url.trim() !== (selectedDataset.endpoint_url ?? "") ||
      editForm.protocol.trim().toUpperCase() !== String(selectedDataset.protocol ?? "").toUpperCase() ||
      editForm.access_type.trim().toUpperCase() !== String(selectedDataset.access_type ?? "").toUpperCase() ||
      nextAuthType !== origAuthType;
    if (endpointWillChange && editForm.endpoint_url.trim() && nextAuthType !== "NONE") {
      toast.error(
        "Form ini belum bisa mengisi kredensial untuk strategi autentikasi selain NONE. Menyimpan endpoint dengan auth non-NONE akan mengosongkan kredensial dan membuat transfer privat gagal. Set autentikasi ke NONE, atau publish ulang dataset dengan kredensial yang benar.",
        { duration: 10000 },
      );
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedDataset.dataset_id,
        body: buildUpdatePayload(selectedDataset, editForm),
      });
      setIsEditDialogOpen(false);
      toast.success("Dataset berhasil diperbarui");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal memperbarui dataset"));
    }
  };

  const handleDeleteDataset = async () => {
    if (!selectedDataset) return;
    // D10: hapus dataset butuh domain aktif (endpoint API domain-scoped).
    if (!domainId) {
      toast.error("Pilih domain aktif dulu sebelum menghapus dataset.");
      return;
    }

    try {
      await deleteMutation.mutateAsync(selectedDataset.dataset_id);
      setIsDeleteDialogOpen(false);
      setIsViewDialogOpen(false);
      toast.success("Dataset berhasil dihapus");
      setSelectedDataset(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus dataset"));
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header
          title="Katalog Dataset"
          subtitle="Lihat, rapikan, dan kelola dataset yang sudah terdaftar"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
            <p className="mt-2 text-muted-foreground">Memuat dataset...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen">
        <Header
          title="Katalog Dataset"
          subtitle="Lihat, rapikan, dan kelola dataset yang sudah terdaftar"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat dataset</p>
            <p className="text-sm text-muted-foreground mb-4">
              {getApiErrorMessage(error, "Terjadi kesalahan saat memuat dataset.")}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalCount = datasets?.length ?? 0;

  return (
    <div className="min-h-screen">
      <Header
        title="Katalog Dataset"
        subtitle="Lihat, rapikan, dan kelola dataset yang sudah terdaftar"
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Database className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Dataset</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Database className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredDatasets.length}</p>
                <p className="text-sm text-muted-foreground">Hasil Tampil</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Database className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{distinctClassifications.length}</p>
                <p className="text-sm text-muted-foreground">Level Klasifikasi</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Dataset baru sekarang dibuat lewat form <strong>Tambah Dataset</strong> supaya pemilihan domain, schema,
          klasifikasi, versi, dan endpoint konsisten dengan model dataset GX-Space yang juga dipakai saat edit.
        </div>

        {canPublish && !bannerDismissed && (
          <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <Layers3 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            <div className="flex-1">
              Punya data di GeoServer/ArcGIS? Ingest dulu lewat Adapter agar muncul sebagai koleksi siap pakai, lalu pilih via tombol "Dari Adapter" saat menambah dataset.
            </div>
            <Button variant="outline" size="sm" className="h-7 shrink-0 border-sky-300 text-sky-800 text-xs" onClick={() => navigate("/settings?tab=adapter")}>
              <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Buka Pengaturan Adapter
            </Button>
            <button type="button" onClick={dismissBanner} className="shrink-0 text-sky-500 hover:text-sky-800" aria-label="Tutup">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {providerWithoutParticipant && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Akun PROVIDER ini belum tertaut ke participant KKKS, jadi katalog dataset sengaja dikosongkan supaya data milik provider lain tidak ikut tampil. Hubungi admin untuk menautkan participant terlebih dulu.
            </span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto md:flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari dataset, schema, atau provider..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="w-4 h-4 mr-2" />
                  Saring
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Filter</h4>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Klasifikasi (L0–L4)</Label>
                    <Select value={filterClassification} onValueChange={setFilterClassification}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua level</SelectItem>
                        {distinctClassifications.map((c) => (
                          <SelectItem key={c} value={c}>
                            {LEVEL_LABEL[c] ?? c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {distinctStatuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "grid" ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
                aria-label="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "list" ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Muat ulang
            </Button>
            {canPublish && (
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => { setPresetCollectionCode(null); setPublishOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Dataset
              </Button>
            )}
          </div>
        </div>

        {/* Cluster Domain */}
        <DomainClusterTabs value={filterDomain} onChange={setFilterDomain} counts={domainCounts} />

        {/* Empty state */}
        {filteredDatasets.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-lg font-medium">Belum ada dataset</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || hasActiveFilters
                ? "Coba ubah kata kunci atau filter yang dipakai"
                : "Tambahkan dataset pertama untuk mulai mengisi katalog ini"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          // Grid view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedDatasets.map((dataset) => (
              <Card
                key={dataset.dataset_id}
                className="hover:border-accent/50 transition-colors cursor-pointer"
                onClick={() => openViewDialog(dataset)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-accent/10 flex-shrink-0">
                        <Database className="w-5 h-5 text-accent" />
                      </div>
                      <CardTitle className="text-base font-semibold truncate">
                        {dataset.dataset_name}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openViewDialog(dataset)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Lihat Detail
                        </DropdownMenuItem>
                        {canManage && (
                          <DropdownMenuItem onClick={() => openEditDialog(dataset)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Dataset
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDeleteDialog(dataset)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus Dataset
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Schema</p>
                    <p className="text-sm font-medium truncate">{dataset.schema_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Provider</p>
                    <p className="text-sm font-medium truncate">{providerName(dataset)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {levelOf(dataset) && (
                      <Badge variant="outline" className={cn(LEVEL_BADGE[levelOf(dataset)!])} title={LEVEL_LABEL[levelOf(dataset)!]}>
                        {levelOf(dataset)}
                      </Badge>
                    )}
                    {dataset.status && (
                      <Badge variant="outline" className={cn(statusClass(dataset.status))}>
                        {dataset.status}
                      </Badge>
                    )}
                    {sourceBadge(dataset)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // List view (table)
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Dataset</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Klasifikasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedDatasets.map((dataset) => (
                  <TableRow
                    key={dataset.dataset_id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => openViewDialog(dataset)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10 flex-shrink-0">
                          <Database className="w-4 h-4 text-accent" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{dataset.dataset_name}</span>
                          <span>{sourceBadge(dataset)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{dataset.schema_name}</span>
                    </TableCell>
                    <TableCell>{providerName(dataset)}</TableCell>
                    <TableCell>
                      {dataset.classification && (
                        <Badge variant="outline" className={cn(classificationClass(dataset.classification))}>
                          {dataset.classification}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {dataset.status && (
                        <Badge variant="outline" className={cn(statusClass(dataset.status))}>
                          {dataset.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewDialog(dataset)}>
                            <Eye className="w-4 h-4 mr-2" />
                          Lihat Detail
                          </DropdownMenuItem>
                          {canManage && (
                            <DropdownMenuItem onClick={() => openEditDialog(dataset)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Dataset
                            </DropdownMenuItem>
                          )}
                          {canManage && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => openDeleteDialog(dataset)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Hapus Dataset
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        <Pager
          page={page}
          total={filteredDatasets.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </div>

      <PublishDatasetDialog open={publishOpen} onOpenChange={setPublishOpen} presetAdapterCollectionCode={presetCollectionCode} />

      {/* View Dataset Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detail Dataset</DialogTitle>
          </DialogHeader>
          {selectedDataset && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-accent/10 flex-shrink-0">
                  <Database className="w-8 h-8 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold">{selectedDataset.dataset_name}</h3>
                  <p className="text-sm text-muted-foreground">{providerName(selectedDataset)}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {levelOf(selectedDataset) && (
                      <Badge
                        variant="outline"
                        className={cn(LEVEL_BADGE[levelOf(selectedDataset)!])}
                        title={LEVEL_LABEL[levelOf(selectedDataset)!]}
                      >
                        {LEVEL_LABEL[levelOf(selectedDataset)!] ?? levelOf(selectedDataset)}
                      </Badge>
                    )}
                    {selectedDataset.status && (
                      <Badge
                        variant="outline"
                        className={cn(statusClass(selectedDataset.status))}
                      >
                        {selectedDataset.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Dataset ID</p>
                  <p className="font-mono text-xs break-all">
                    {selectedDataset.dataset_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Schema</p>
                  <p className="font-mono text-sm">{selectedDataset.schema_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{providerName(selectedDataset)}</p>
                </div>
                {selectedDataset.endpoint_url && (
                  <div>
                    <p className="text-sm text-muted-foreground">URL Endpoint</p>
                    <p className="font-mono text-xs break-all">{selectedDataset.endpoint_url}</p>
                  </div>
                )}
                {selectedDataset.endpoint_documentation_url && (
                  <div>
                    <p className="text-sm text-muted-foreground">URL Dokumentasi Data</p>
                    <p className="font-mono text-xs break-all text-amber-700">{selectedDataset.endpoint_documentation_url}</p>
                  </div>
                )}
                <div className="flex gap-6 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground">Protokol</p>
                    <p className="text-sm font-medium">{selectedDataset.protocol ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Akses</p>
                    <p className="text-sm font-medium">{selectedDataset.access_type ?? "—"}</p>
                  </div>
                  {selectedDataset.endpoint_data_format && (
                    <div>
                      <p className="text-sm text-muted-foreground">Format</p>
                      <p className="text-sm font-medium">{selectedDataset.endpoint_data_format}</p>
                    </div>
                  )}
                  {selectedDataset.endpoint_sla && (
                    <div>
                      <p className="text-sm text-muted-foreground">SLA</p>
                      <p className="text-sm font-medium">{selectedDataset.endpoint_sla}</p>
                    </div>
                  )}
                </div>
                {Array.isArray(selectedDataset.endpoint_tags) && selectedDataset.endpoint_tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedDataset.endpoint_tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {canManage && selectedDataset && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    openEditDialog(selectedDataset);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    openDeleteDialog(selectedDataset);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[660px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Dataset</DialogTitle>
            <DialogDescription>
              Perbarui informasi dataset yang sudah terdaftar tanpa mengubah alur publish utama.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* ─── Info Dasar ─── */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Dataset</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-version">Versi</Label>
                <Input
                  id="edit-version"
                  placeholder="1.0.0"
                  value={editForm.version}
                  onChange={(e) => setEditForm((current) => ({ ...current, version: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm((current) => ({ ...current, status: value }))}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Deskripsi</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((current) => ({ ...current, description: e.target.value }))}
              />
            </div>

            {/* ─── Endpoint ─── */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Konfigurasi Endpoint</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-endpoint">URL Endpoint Data</Label>
                  {adapterEndpoint && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-accent gap-1"
                      onClick={loadAdapterCols}
                      disabled={loadingAdapterCols}
                    >
                      {loadingAdapterCols ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers3 className="w-3 h-3" />}
                      Dari Adapter
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <strong className="text-foreground">Dari Adapter</strong> (rekomendasi untuk data hasil ingest) mengisi URL + runtime otomatis; atau isi URL manual untuk WFS/REST langsung. Kategori (WK/FLD/…) berasal dari tag saat ingest, bukan deteksi otomatis.
                </p>
                <Input
                  id="edit-endpoint"
                  placeholder="https://service.example.com/collections/..."
                  value={editForm.endpoint_url}
                  onChange={(e) => { setEditForm((current) => ({ ...current, endpoint_url: e.target.value })); setEditConnectedCollection(null); }}
                />
                {showAdapterCols && adapterCols.length > 0 && (
                  <AdapterCollectionPicker
                    collections={adapterCols}
                    onPick={applyAdapterCol}
                    onClose={() => setShowAdapterCols(false)}
                  />
                )}
                {showAdapterCols && adapterCols.length === 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs text-amber-800">Belum ada koleksi di adapter. Ingest data dulu lewat Pengaturan → Adapter.</p>
                    <Button type="button" variant="outline" size="sm" className="h-8 w-full border-amber-300 text-amber-800 text-xs" onClick={() => navigate("/settings?tab=adapter")}>
                      <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Setup Adapter
                    </Button>
                  </div>
                )}
                {editConnectedCollection && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                    <Link2 className="w-3.5 h-3.5 shrink-0" />
                    Terhubung: koleksi <strong>{editConnectedCollection.domain_code}</strong> — {editConnectedCollection.title} <span className="text-emerald-600">(adapter)</span>
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-protocol">Protokol</Label>
                  <Select
                    value={editForm.protocol}
                    onValueChange={(value) => setEditForm((current) => ({ ...current, protocol: value }))}
                  >
                    <SelectTrigger id="edit-protocol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* D4: hanya protokol yang benar-benar didukung connector (samakan dengan publish). */}
                      <SelectItem value="OGC_API_FEATURES">OGC API Features</SelectItem>
                      <SelectItem value="REST_API">REST API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-access">Tipe Akses</Label>
                  <Select
                    value={editForm.access_type}
                    onValueChange={(value) => setEditForm((current) => ({ ...current, access_type: value }))}
                  >
                    <SelectTrigger id="edit-access">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIVATE">PRIVATE</SelectItem>
                      <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-auth">Strategi Autentikasi</Label>
                <Select
                  value={editForm.auth_strategy_type}
                  onValueChange={(value) => setEditForm((current) => ({ ...current, auth_strategy_type: value }))}
                >
                  <SelectTrigger id="edit-auth">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Tidak ada (NONE)</SelectItem>
                    <SelectItem value="API_KEY">API Key</SelectItem>
                    <SelectItem value="BEARER_TOKEN">Bearer Token</SelectItem>
                    <SelectItem value="OAUTH2">OAuth2</SelectItem>
                    <SelectItem value="BASIC">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ─── Endpoint Metadata ─── */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Metadata Endpoint</p>
              <div className="space-y-2">
                <Label htmlFor="edit-doc-url">
                  URL Dokumentasi Data
                  <span className="ml-1 text-destructive">*</span>
                </Label>
                <Input
                  id="edit-doc-url"
                  placeholder="https://adapter.example.com/api/v1/ogc/ogc/collections/WK/items"
                  value={editForm.documentation_url}
                  onChange={(e) => setEditForm((current) => ({ ...current, documentation_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  URL dokumentasi/katalog data untuk referensi. Untuk protokol OGC_API_FEATURES, sumber transfer sebenarnya dibentuk dari <strong>URL Endpoint + Runtime Context (collection_path)</strong>, bukan dari URL ini. Untuk REST_API, sumbernya adalah URL Endpoint langsung.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-format">Format Data</Label>
                  <Input
                    id="edit-format"
                    placeholder="application/geo+json"
                    value={editForm.data_format}
                    onChange={(e) => setEditForm((current) => ({ ...current, data_format: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sla">SLA</Label>
                  <Input
                    id="edit-sla"
                    placeholder="best-effort"
                    value={editForm.sla}
                    onChange={(e) => setEditForm((current) => ({ ...current, sla: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags</Label>
                {selectedDataset?.endpoint_tags?.[0] && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Domain (terkunci):</span>
                    <Badge variant="outline" className="font-mono">{selectedDataset.endpoint_tags[0]}</Badge>
                  </div>
                )}
                <Input
                  id="edit-tags"
                  placeholder="geospatial, psc (pisah koma)"
                  value={editForm.tags}
                  onChange={(e) => setEditForm((current) => ({ ...current, tags: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Pisahkan dengan koma. Tag domain pertama dikunci agar dataset tidak berpindah domain — field ini hanya mengelola tag tambahan.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-runtime">Runtime Context</Label>
                <Textarea
                  id="edit-runtime"
                  className="font-mono text-xs min-h-40"
                  placeholder='{"collection_path":"/api/v1/ogc/ogc/collections/{domain_code}/items"}'
                  value={editForm.runtime_json}
                  onChange={(e) => setEditForm((current) => ({ ...current, runtime_json: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Dipakai connector/provider untuk membentuk source URL dari base endpoint adapter. Kosongkan hanya untuk endpoint final non-runtime.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateDataset} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Hapus Dataset</DialogTitle>
            <DialogDescription>
              Dataset yang dihapus akan keluar dari katalog domain aktif ini.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="font-semibold">{selectedDataset?.dataset_name ?? "-"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{selectedDataset?.schema_name ?? "-"}</p>
            <p className="mt-2 text-xs text-muted-foreground break-all">{selectedDataset?.dataset_id ?? "-"}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteDataset} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus Dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Datasets;
