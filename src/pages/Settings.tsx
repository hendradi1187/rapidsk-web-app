import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Shield,
  Bell,
  Key,
  Database,
  Globe,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  FileJson2,
  PackageCheck,
  Link,
  Files,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AdapterFlowWizard } from "@/components/settings/AdapterFlowWizard";
import { useConnectionPools } from "@/api/hooks/useConnectionPools";
import {
  useParticipantAdapters,
  useAddParticipantAdapter,
  useUpdateParticipantAdapter,
  useDeleteParticipantAdapter,
  useParticipantDomains,
} from "@/api/hooks/useProviders";
import { useProviders } from "@/api/hooks/useProviders";
import { useOrganizations, useOrganizationDomains } from "@/api/hooks/useOrganizations";
import { useAuth } from "@/context/AuthContext";
import { useDomain } from "@/context/DomainContext";
import { useRuntime } from "@/context/RuntimeContext";
import { getApiErrorMessage } from "@/lib/api-error";
import { DOMAINS } from "@/lib/fulfillment";
import {
  getPreferredOrganizationId,
  getPreferredOrganizationName,
} from "@/lib/session-binding";
import { ROLE_LABELS } from "@/config/rbac";
import { usersService } from "@/api/services/identity-provider";
import { useDatasets } from "@/api/hooks/useDatasets";
import { canManageAdapters } from "@/lib/feature-access";
import {
  adapterRuntimeApi,
  type AdapterClassification,
} from "@/api/services/adapter-runtime";

const DOMAIN_CODE_BY_KEY = {
  wilayah_kerja: "WK",
  lapangan: "FLD",
  seismik: "SEI",
  sumur: "WLL",
  fasilitas: "FP",
} as const;

interface GeoServerEndpoint {
  id: number;
  name: string;
  url: string;
  type: string;
  status: "connected" | "disconnected";
}

interface NotificationSetting {
  id: string;
  title: string;
  desc: string;
  enabled: boolean;
}

const ADMIN_LIKE_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;
const showLegacyDataFlow = false;
const normalizeBindingKey = (value: string | null | undefined) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const Settings = () => {
  const navigate = useNavigate();
  const { participantId, role, roles, user, setAuthUser, hasPermission } = useAuth();
  const {
    domainId,
    availableDomains,
    domainSource,
    activeOrganizationName,
    participantDomainCount,
  } = useDomain();
  const { runtimeConfig } = useRuntime();
  const { data: connectionPoolsData, isLoading: isLoadingConnectionPools } = useConnectionPools();
  const { data: providersData } = useProviders();
  const { data: organizationsData } = useOrganizations();
  const { data: datasetsData } = useDatasets();
  const canManageAdapterActions = canManageAdapters({ role, roles, hasPermission });

  // Adapter — hanya PROVIDER
  const { data: adaptersData, isLoading: loadingAdapters, refetch: refetchAdapters } =
    useParticipantAdapters(participantId ?? "");
  const {
    data: participantDomainsData,
    isLoading: isLoadingParticipantDomains,
  } = useParticipantDomains(participantId ?? "");
  const addAdapterMutation = useAddParticipantAdapter();
  const updateAdapterMutation = useUpdateParticipantAdapter();
  const deleteAdapterMutation = useDeleteParticipantAdapter();

  const [adapterDialog, setAdapterDialog] = useState(false);
  const [editingAdapter, setEditingAdapter] = useState<any>(null);
  const [selectedProcessDomain, setSelectedProcessDomain] = useState("");
  const [adapterForm, setAdapterForm] = useState({
    domain_id: domainId ?? "",
    type: "GIS_STUDIO",
    url: "",
  });
  const [connTestStatus, setConnTestStatus] = useState<Record<string, "idle"|"checking"|"ok"|"error">>({});
  const [selectedAdapterId, setSelectedAdapterId] = useState("");
  const [adapterBusyAction, setAdapterBusyAction] = useState<"" | "health" | "metadata" | "geojson" | "shapefile" | "publish">("");
  const [adapterResult, setAdapterResult] = useState<{
    type: "idle" | "success" | "error";
    title: string;
    payload: unknown;
  }>({
    type: "idle",
    title: "",
    payload: null,
  });
  const [geojsonForm, setGeojsonForm] = useState<{
    domain: string;
    classification: AdapterClassification | "";
    payload: string;
  }>({
    domain: "",
    classification: "",
    payload: '{\n  "type": "FeatureCollection",\n  "features": []\n}',
  });
  const [shapefileForm, setShapefileForm] = useState<{
    domain: string;
    classification: AdapterClassification | "";
    fieldMap: string;
    constants: string;
    file: File | null;
  }>({
    domain: "",
    classification: "",
    fieldMap: "",
    constants: "",
    file: null,
  });
  const [publishForm, setPublishForm] = useState<{
    domain: string;
    name: string;
    schemaId: string;
    version: string;
    level: AdapterClassification;
    geojson: string;
  }>({
    domain: "",
    name: "",
    schemaId: "",
    version: "1.0.0",
    level: "L2",
    geojson: "",
  });

  const testAdapterConn = async (id: string, url: string) => {
    if (!canManageAdapterActions) {
      toast.error("Akun ini belum punya izin untuk mengelola jalur adapter.");
      return;
    }
    setConnTestStatus((p) => ({ ...p, [id]: "checking" }));
    try {
      await fetch(url, { method: "HEAD", mode: "no-cors" });
      setConnTestStatus((p) => ({ ...p, [id]: "ok" }));
    } catch {
      setConnTestStatus((p) => ({ ...p, [id]: "error" }));
    }
  };

  const openAddAdapter = () => {
    if (!canManageAdapterActions) return;
    setEditingAdapter(null);
    const fallbackDomain =
      resolveDomainKey(
        effectiveParticipantDomainsData.find((item) => resolveDomainKey(item) === domainId),
      ) ??
      resolveDomainKey(effectiveParticipantDomainsData[0]) ??
      domainId ??
      "";
    setAdapterForm({ domain_id: fallbackDomain, type: "GIS_STUDIO", url: "" });
    setAdapterDialog(true);
  };
  const openEditAdapter = (a: any) => {
    if (!canManageAdapterActions) return;
    setEditingAdapter(a);
    setAdapterForm({ domain_id: a.domain_id ?? "", type: a.type ?? "GIS_STUDIO", url: a.endpoint?.url ?? "" });
    setAdapterDialog(true);
  };
  const saveAdapter = async () => {
    if (!canManageAdapterActions) {
      toast.error("Akun ini belum punya izin untuk menyimpan jalur adapter.");
      return;
    }
    if (!participantId) return toast.error("Akun tidak terhubung ke participant.");
    if (!adapterForm.domain_id) return toast.error("Pilih domain terlebih dahulu.");
    const trimmedAdapterUrl = adapterForm.url.trim();
    if (!trimmedAdapterUrl) return toast.error("URL endpoint wajib diisi.");
    if (!isValidHttpUrl(trimmedAdapterUrl)) {
      return toast.error("URL endpoint adapter harus berupa http/https yang valid.");
    }
    try {
      const body = {
        domain_id: adapterForm.domain_id,
        type: "GIS_STUDIO",
        endpoint: { url: trimmedAdapterUrl },
      };
      if (editingAdapter) {
        await updateAdapterMutation.mutateAsync({ participantId, id: editingAdapter.id, body });
        toast.success("Adapter diperbarui.");
      } else {
        await addAdapterMutation.mutateAsync({ participantId, body });
        toast.success("Adapter ditambahkan.");
      }
      setAdapterDialog(false);
      refetchAdapters();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal simpan adapter"));
    }
  };
  const removeAdapter = async (id: string) => {
    if (!canManageAdapterActions) {
      toast.error("Akun ini belum punya izin untuk menghapus jalur adapter.");
      return;
    }
    if (!participantId) return;
    try {
      await deleteAdapterMutation.mutateAsync({ participantId, id });
      toast.success("Adapter dihapus.");
      refetchAdapters();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal hapus adapter"));
    }
  };

  const isAdminLike = ADMIN_LIKE_ROLES.includes(role as (typeof ADMIN_LIKE_ROLES)[number]);
  const isProvider = role === "PROVIDER";
  const defaultSettingsTab = isProvider ? "adapter" : "integrations";

  const currentParticipant = useMemo(
    () => ((providersData ?? []) as Array<any>).find((item) => item.provider_id === participantId) ?? null,
    [providersData, participantId],
  );

  const preferredOrganizationId = getPreferredOrganizationId();
  const preferredOrganizationName = getPreferredOrganizationName();

  const activeGovernanceOrganization = useMemo(() => {
    const organizations = (organizationsData ?? []) as Array<any>;
    const participantNameKey = normalizeBindingKey(
      currentParticipant?.organization_name ?? currentParticipant?.provider_name,
    );
    const preferredNameKey = normalizeBindingKey(preferredOrganizationName);

    return (
      organizations.find((item) => item.organization_id === preferredOrganizationId) ??
      organizations.find((item) => normalizeBindingKey(item.organization_name) === preferredNameKey) ??
      organizations.find((item) => normalizeBindingKey(item.organization_name) === participantNameKey) ??
      null
    );
  }, [currentParticipant, organizationsData, preferredOrganizationId, preferredOrganizationName]);

  const {
    data: governanceDomainsData,
    isLoading: isLoadingGovernanceDomains,
  } = useOrganizationDomains(activeGovernanceOrganization?.organization_id ?? null);

  // Profile settings state
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    organization: "",
    role: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Localization state
  const [localization, setLocalization] = useState({
    timezone: "Asia/Jakarta",
    language: "id",
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: true,
    sessionTimeout: true,
  });

  // Notification settings state
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: "dataset", title: "Dataset Baru", desc: "Saat ada dataset baru masuk ke katalog", enabled: true },
    { id: "contract", title: "Permintaan Kontrak", desc: "Saat consumer mengajukan akses data", enabled: true },
    { id: "transfer", title: "Transfer Gagal", desc: "Saat proses transfer data tidak selesai", enabled: true },
    { id: "compliance", title: "Peringatan Kepatuhan", desc: "Saat ada isu kepatuhan yang perlu dicek", enabled: false },
    { id: "audit", title: "Aktivitas Audit", desc: "Saat ada kejadian penting yang tercatat di audit trail", enabled: false },
  ]);

  // GeoServer endpoints state
  const [geoServerEndpoints, setGeoServerEndpoints] = useState<GeoServerEndpoint[]>([
  ]);

  // Identity Provider state
  const [idpSettings, setIdpSettings] = useState({
    provider: "keycloak",
    realmUrl: "https://auth.rapidsk.id/realms/rapidsk",
    clientId: "rapidsk-web",
    clientSecret: "••••••••••••",
  });

  // Dialog states
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isGeoServerDialogOpen, setIsGeoServerDialogOpen] = useState(false);
  const [isIdpDialogOpen, setIsIdpDialogOpen] = useState(false);
  const [isAddEndpointDialogOpen, setIsAddEndpointDialogOpen] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // New endpoint form
  const [newEndpointForm, setNewEndpointForm] = useState({
    name: "",
    url: "",
    type: "WMS",
  });
  const connectionPools = useMemo(
    () => (connectionPoolsData ?? []) as Array<{
      id: string;
      participant_id: string;
      name: string;
      type: "CONSUMER" | "PROVIDER";
      token: string;
      metadata: { url_consumer: string; url_provider: string };
    }>,
    [connectionPoolsData],
  );

  const providers = useMemo(
    () => (providersData ?? []) as Array<{ provider_id: string; provider_name: string }>,
    [providersData],
  );

  const governanceDomainFallbackActive =
    domainSource === "governance_fallback" ||
    (
      !isLoadingParticipantDomains &&
      ((participantDomainsData ?? []) as Array<any>).length === 0 &&
      ((governanceDomainsData ?? []) as Array<any>).length > 0
    );

  const effectiveParticipantDomainsData = governanceDomainFallbackActive
    ? ((governanceDomainsData ?? []) as Array<any>)
    : ((participantDomainsData ?? []) as Array<any>);

  const providerNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const provider of providers) map[provider.provider_id] = provider.provider_name;
    return map;
  }, [providers]);

  const resolveDomainKey = (item: any) =>
    String(item?.domain_id ?? item?.domain?.key ?? item?.domain?.id ?? "")
      .trim();

  const resolveDomainLabel = (item: any, domainKey: string) => {
    const matched = DOMAINS.find((domain) => domain.key === domainKey);
    if (matched?.label) {
      return matched.sub ? `${matched.label} (${matched.sub})` : matched.label;
    }

    const directLabel = String(
      item?.domain_name ??
        item?.domain?.label ??
        item?.domain?.name ??
        item?.name ??
        domainKey,
    ).trim();

    const directCode = String(item?.code ?? item?.domain?.code ?? "").trim();
    if (!directLabel) {
      return "Domain belum dikenali";
    }

    return directCode && directCode !== directLabel
      ? `${directLabel} (${directCode})`
      : directLabel;
  };

  const resolveDomainCode = (item: any, domainKey: string) => {
    const directCode = String(item?.code ?? item?.domain?.code ?? "").trim().toUpperCase();
    if (["WK", "FLD", "SEI", "WLL", "FP"].includes(directCode)) {
      return directCode as "WK" | "FLD" | "SEI" | "WLL" | "FP";
    }

    if (domainKey in DOMAIN_CODE_BY_KEY) {
      return DOMAIN_CODE_BY_KEY[domainKey as keyof typeof DOMAIN_CODE_BY_KEY];
    }

    const matchedDomain = DOMAINS.find((domain) => domain.key === domainKey);
    if (matchedDomain?.key && matchedDomain.key in DOMAIN_CODE_BY_KEY) {
      return DOMAIN_CODE_BY_KEY[matchedDomain.key as keyof typeof DOMAIN_CODE_BY_KEY];
    }

    return "";
  };

  const participantDomainOptions = useMemo(() => {
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const lookupDomainName = (uuid: string) =>
      availableDomains.find((d) => d.domain_id === uuid)?.domain_name ?? null;

    return effectiveParticipantDomainsData
      .map((item) => {
        const value = resolveDomainKey(item);
        if (!value) return null;

        const domainKey = String(item?.domain?.key ?? item?.key ?? "").trim();
        let rawLabel = resolveDomainLabel(item, value);
        let rawName = String(
          item?.domain_name ??
          item?.domain?.label ??
          item?.domain?.name ??
          item?.name ??
          rawLabel,
        ).trim();

        // If label/name resolved to a bare UUID, replace with human-readable name from DomainContext
        if (isUuid(rawLabel)) {
          rawLabel = lookupDomainName(rawLabel) ?? lookupDomainName(value) ?? rawLabel;
        }
        if (isUuid(rawName)) {
          rawName = lookupDomainName(rawName) ?? lookupDomainName(value) ?? rawName;
        }

        return {
          value,
          label: rawLabel,
          domainCode: resolveDomainCode(item, domainKey || value),
          domainName: rawName || rawLabel,
        };
      })
      .filter(Boolean) as Array<{ value: string; label: string; domainCode: "WK" | "FLD" | "SEI" | "WLL" | "FP" | ""; domainName: string }>;
  }, [effectiveParticipantDomainsData, availableDomains]);

  const processDomainOptions = participantDomainOptions;
  const canOpenParticipantDomainSetup = Boolean(participantId);

  const providerDatasets = useMemo(
    () => ((datasetsData ?? []) as Array<any>).filter((dataset) => dataset.provider_id === participantId),
    [datasetsData, participantId],
  );

  const adapterPublishedPairs = useMemo(() => {
    const adapterUrls = new Set(
      ((adaptersData ?? []) as Array<any>)
        .map((adapter) => String(adapter.endpoint?.url ?? "").trim())
        .filter(Boolean),
    );

    return providerDatasets.map((dataset) => ({
      datasetId: dataset.dataset_id,
      datasetName: dataset.dataset_name,
      domain: dataset.domain ?? "—",
      level: dataset.level ?? "—",
      endpointUrl: dataset.endpoint_url ?? "—",
      status: dataset.status ?? "—",
      isViaAdapter: adapterUrls.has(String(dataset.endpoint_url ?? "").trim()),
    }));
  }, [adaptersData, providerDatasets]);

  const registeredAdapters = useMemo(
    () => ((adaptersData ?? []) as Array<any>).filter((adapter) => String(adapter.endpoint?.url ?? "").trim()),
    [adaptersData],
  );

  const adaptersForSelectedDomain = useMemo(
    () =>
      registeredAdapters.filter(
        (adapter) => String(adapter.domain_id ?? adapter.domain?.key ?? "").trim() === selectedProcessDomain,
      ),
    [registeredAdapters, selectedProcessDomain],
  );

  const selectedAdapter = useMemo(
    () =>
      adaptersForSelectedDomain.find((adapter) => String(adapter.id) === selectedAdapterId) ??
      (adaptersForSelectedDomain.length === 1 ? adaptersForSelectedDomain[0] : null),
    [adaptersForSelectedDomain, selectedAdapterId],
  );

  const selectedAdapterUrl = String(selectedAdapter?.endpoint?.url ?? "").trim();

  useEffect(() => {
    if (!processDomainOptions.length) {
      setSelectedProcessDomain("");
      return;
    }

    if (
      !selectedProcessDomain ||
      !processDomainOptions.some((domain) => domain.value === selectedProcessDomain)
    ) {
      setSelectedProcessDomain(
        processDomainOptions.find((domain) => domain.value === domainId)?.value ??
        processDomainOptions[0]?.value ??
        "",
      );
    }
  }, [processDomainOptions, selectedProcessDomain, domainId]);

  useEffect(() => {
    if (!adaptersForSelectedDomain.length) {
      setSelectedAdapterId("");
      return;
    }

    if (adaptersForSelectedDomain.length === 1) {
      setSelectedAdapterId(String(adaptersForSelectedDomain[0].id));
      return;
    }

    if (!selectedAdapterId || !adaptersForSelectedDomain.some((adapter) => String(adapter.id) === selectedAdapterId)) {
      setSelectedAdapterId("");
    }
  }, [adaptersForSelectedDomain, selectedAdapterId]);

  useEffect(() => {
    const fallbackDomain = String(selectedProcessDomain || selectedAdapter?.domain_id || domainId || "");
    if (!fallbackDomain) return;

    setGeojsonForm((prev) => ({ ...prev, domain: fallbackDomain }));
    setShapefileForm((prev) => ({ ...prev, domain: fallbackDomain }));
    setPublishForm((prev) => ({ ...prev, domain: fallbackDomain }));
  }, [selectedProcessDomain, selectedAdapter?.domain_id, domainId]);

  const setAdapterFeedback = (type: "success" | "error", title: string, payload: unknown) => {
    setAdapterResult({ type, title, payload });
  };

  const parseJsonText = (raw: string, fieldLabel: string) => {
    if (!raw.trim()) return null;
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`${fieldLabel} harus berupa JSON yang valid.`);
    }
  };

  const requireAdapterUrl = () => {
    if (!selectedAdapterUrl) {
      throw new Error("Pilih jalur data yang sudah terdaftar terlebih dahulu.");
    }
    return selectedAdapterUrl;
  };

  const runAdapterAction = async (
    action: "" | "health" | "metadata" | "geojson" | "shapefile" | "publish",
    runner: (adapterBaseUrl: string) => Promise<any>,
    successTitle: string,
  ) => {
    try {
      setAdapterBusyAction(action);
      const adapterBaseUrl = requireAdapterUrl();
      const response = await runner(adapterBaseUrl);
      setAdapterFeedback("success", successTitle, response);
    } catch (error: unknown) {
      setAdapterFeedback("error", successTitle, {
        message: getApiErrorMessage(error, "Proses adapter gagal dijalankan"),
      });
      toast.error(getApiErrorMessage(error, "Proses adapter gagal dijalankan"));
    } finally {
      setAdapterBusyAction("");
    }
  };

  const handleAdapterHealthCheck = async () => {
    if (!canManageAdapterActions) return;
    await runAdapterAction(
      "health",
      (adapterBaseUrl) => adapterRuntimeApi.health(adapterBaseUrl),
      "Health adapter",
    );
  };

  const handleAdapterMetadataFetch = async () => {
    if (!canManageAdapterActions) return;
    await runAdapterAction(
      "metadata",
      async (adapterBaseUrl) => {
        if (publishForm.domain.trim()) {
          return adapterRuntimeApi.metadataByDomain(adapterBaseUrl, publishForm.domain.trim());
        }
        return adapterRuntimeApi.metadataAll(adapterBaseUrl);
      },
      "Metadata adapter",
    );
  };

  const handleGeojsonIngest = async () => {
    if (!canManageAdapterActions) return;
    await runAdapterAction(
      "geojson",
      async (adapterBaseUrl) => {
        if (!geojsonForm.domain.trim()) {
          throw new Error("Domain ingest wajib dipilih.");
        }

        const payload = parseJsonText(geojsonForm.payload, "Payload GeoJSON");
        if (!payload || typeof payload !== "object") {
          throw new Error("Payload GeoJSON wajib diisi.");
        }

        return adapterRuntimeApi.ingestGeoJson(
          adapterBaseUrl,
          geojsonForm.domain.trim(),
          payload as Record<string, unknown>,
          geojsonForm.classification,
        );
      },
      "Ingest GeoJSON",
    );
  };

  const handleShapefileIngest = async () => {
    if (!canManageAdapterActions) return;
    await runAdapterAction(
      "shapefile",
      async (adapterBaseUrl) => {
        if (!shapefileForm.domain.trim()) {
          throw new Error("Domain shapefile wajib dipilih.");
        }
        if (!shapefileForm.file) {
          throw new Error("File shapefile ZIP wajib dipilih.");
        }

        return adapterRuntimeApi.ingestShapefile(adapterBaseUrl, shapefileForm.domain.trim(), {
          file: shapefileForm.file,
          classification: shapefileForm.classification,
          fieldMap: shapefileForm.fieldMap,
          constants: shapefileForm.constants,
        });
      },
      "Ingest shapefile",
    );
  };

  const handleAdapterPublish = async () => {
    if (!canManageAdapterActions) return;
    await runAdapterAction(
      "publish",
      async (adapterBaseUrl) => {
        if (!publishForm.domain.trim()) {
          throw new Error("Domain publish wajib dipilih.");
        }
        if (!publishForm.name.trim()) {
          throw new Error("Nama dataset publish wajib diisi.");
        }
        if (!publishForm.schemaId.trim()) {
          throw new Error("Schema ID wajib diisi.");
        }

        const geojson = parseJsonText(publishForm.geojson, "GeoJSON publish");
        return adapterRuntimeApi.publish(adapterBaseUrl, publishForm.domain.trim(), {
          name: publishForm.name.trim(),
          schema_id: publishForm.schemaId.trim(),
          version: publishForm.version.trim() || "1.0.0",
          level: publishForm.level,
          geojson: geojson && typeof geojson === "object" ? (geojson as Record<string, unknown>) : null,
        });
      },
      "Terbitkan dataset",
    );
  };

  useEffect(() => {
    setProfileForm({
      name: user?.full_name ?? "",
      email: user?.email ?? "",
      organization:
        currentParticipant?.provider_name ??
        user?.category?.name ??
        "",
      role: ROLE_LABELS[role] ?? role,
    });
  }, [currentParticipant?.provider_name, role, user]);

  // Handle save profile
  const handleSaveProfile = async () => {
    if (!user?.id) {
      toast.error("User aktif tidak ditemukan.");
      return;
    }

    try {
      setIsSaving(true);
      await usersService.update(user.id, {
        full_name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      });

      const nextUser = {
        ...user,
        full_name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      };

      setAuthUser(nextUser);
      localStorage.setItem("user_info", JSON.stringify(nextUser));
      toast.success("Profil berhasil diperbarui.");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal memperbarui profil"));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle save localization
  const handleSaveLocalization = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Preferensi tampilan berhasil disimpan.");
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Lengkapi semua kolom kata sandi.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Konfirmasi kata sandi baru belum cocok.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Kata sandi minimal 8 karakter.");
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
    setIsPasswordDialogOpen(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    toast.success("Kata sandi berhasil diperbarui.");
  };

  // Handle toggle notification
  const handleToggleNotification = (id: string) => {
    setNotifications(
      notifications.map((n) =>
        n.id === id ? { ...n, enabled: !n.enabled } : n
      )
    );
    toast.success("Preferensi notifikasi diperbarui.");
  };

  // Handle toggle security setting
  const handleToggleSecurity = (setting: "twoFactorEnabled" | "sessionTimeout") => {
    setSecuritySettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
    toast.success(
      setting === "twoFactorEnabled"
        ? `Autentikasi dua langkah ${!securitySettings.twoFactorEnabled ? "diaktifkan" : "dimatikan"}`
        : `Batas waktu sesi ${!securitySettings.sessionTimeout ? "diaktifkan" : "dimatikan"}`
    );
  };

  // URL validator — hanya http(s) yang valid
  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Handle add GeoServer endpoint
  const handleAddEndpoint = () => {
    const trimmedName = newEndpointForm.name.trim();
    const trimmedUrl = newEndpointForm.url.trim();
    if (!trimmedName || !trimmedUrl) {
      toast.error("Lengkapi nama dan URL endpoint dulu.");
      return;
    }
    if (!isValidUrl(newEndpointForm.url)) {
      toast.error("URL tidak valid. Gunakan format https://domain.com");
      return;
    }

    const newEndpoint: GeoServerEndpoint = {
      id: Math.max(0, ...geoServerEndpoints.map((e) => e.id)) + 1,
      name: trimmedName,
      url: trimmedUrl,
      type: newEndpointForm.type,
      status: "connected",
    };

    setGeoServerEndpoints([...geoServerEndpoints, newEndpoint]);
    setNewEndpointForm({ name: "", url: "", type: "WMS" });
    setIsAddEndpointDialogOpen(false);
    toast.success("Endpoint berhasil ditambahkan.");
  };

  // Handle remove endpoint
  const handleRemoveEndpoint = (id: number) => {
    setGeoServerEndpoints(geoServerEndpoints.filter((e) => e.id !== id));
    toast.success("Endpoint berhasil dihapus.");
  };

  // Handle save IDP settings
  const handleSaveIdpSettings = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsIdpDialogOpen(false);
    toast.success("Pengaturan identity provider berhasil disimpan.");
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Pengaturan"
        subtitle="Pengaturan akun, koneksi, dan proses kerja"
      />
      <div className="p-6">
        <Tabs defaultValue={defaultSettingsTab} className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="general">Akun</TabsTrigger>
            {!isProvider ? <TabsTrigger value="integrations">Koneksi & Akses</TabsTrigger> : null}
            {(role === "PROVIDER" || role === "ADMIN" || role === "SUPER_ADMIN") && (
              <TabsTrigger value="adapter">Proses Data</TabsTrigger>
            )}
            {isAdminLike && <TabsTrigger value="security">Keamanan</TabsTrigger>}
            {isAdminLike && <TabsTrigger value="notifications">Notifikasi</TabsTrigger>}
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informasi Akun
                </CardTitle>
                <CardDescription>
                  Perbarui identitas operator yang sedang aktif dan lihat keterkaitannya dengan organisasi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org">Organisasi</Label>
                    <Input id="org" value={profileForm.organization} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Peran</Label>
                    <Input id="role" value={profileForm.role} disabled />
                  </div>
                </div>
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Simpan Perubahan
                </Button>
              </CardContent>
            </Card>

            {isAdminLike && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Preferensi Tampilan
                </CardTitle>
                <CardDescription>
                  Dipakai untuk pengaturan umum yang tidak mengubah flow bisnis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Zona Waktu</Label>
                    <Select
                      value={localization.timezone}
                      onValueChange={(v) => setLocalization({ ...localization, timezone: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                        <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                        <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bahasa</Label>
                    <Select
                      value={localization.language}
                      onValueChange={(v) => setLocalization({ ...localization, language: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSaveLocalization}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Simpan Preferensi
                </Button>
              </CardContent>
            </Card>
            )}
          </TabsContent>

          {isAdminLike && (
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Autentikasi
                </CardTitle>
                <CardDescription>
                  Kelola metode login dan pengamanan akses operator.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Autentikasi Dua Langkah</p>
                    <p className="text-sm text-muted-foreground">
                      Tambahkan lapisan verifikasi tambahan untuk akun ini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {securitySettings.twoFactorEnabled && (
                      <Badge className="badge-active">Aktif</Badge>
                    )}
                    <Switch
                      checked={securitySettings.twoFactorEnabled}
                      onCheckedChange={() => handleToggleSecurity("twoFactorEnabled")}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Batas Waktu Sesi</p>
                    <p className="text-sm text-muted-foreground">
                      Keluar otomatis setelah 30 menit tanpa aktivitas.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {securitySettings.sessionTimeout && (
                      <Badge className="badge-active">Aktif</Badge>
                    )}
                    <Switch
                      checked={securitySettings.sessionTimeout}
                      onCheckedChange={() => handleToggleSecurity("sessionTimeout")}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
                    <Key className="w-4 h-4 mr-2" />
                    Ubah Kata Sandi
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Sertifikat SSL/TLS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                    <div>
                      <p className="font-medium text-success">Sertifikat Aktif</p>
                      <p className="text-sm text-muted-foreground">
                        Berlaku sampai: 31 Desember 2026
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {isAdminLike && (
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Preferensi Notifikasi
                </CardTitle>
                <CardDescription>
                  Tentukan notifikasi apa saja yang ingin tetap tampil.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {notifications.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.enabled && (
                        <Badge variant="secondary" className="text-xs">Aktif</Badge>
                      )}
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={() => handleToggleNotification(item.id)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          <TabsContent value="integrations" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Urutan Koneksi Dasar</CardTitle>
                <CardDescription>
                  Mulai dari identitas layanan, lanjut ke sumber data, lalu pastikan jalur pertukaran sudah siap.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Tahap 1</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Identitas Layanan</p>
                  <p className="mt-2 text-sm text-slate-600">Pastikan metode login dan identitas layanan sudah sesuai dengan lingkungan yang dipakai.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Tahap 2</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Sumber Data</p>
                  <p className="mt-2 text-sm text-slate-600">Daftarkan layanan sumber yang akan diakses atau dirutekan oleh participant.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Tahap 3</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Jalur Pertukaran</p>
                  <p className="mt-2 text-sm text-slate-600">Simpan data koneksi yang dipakai saat proses pertukaran antar participant dijalankan.</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Koneksi dan Akses
                </CardTitle>
                <CardDescription>
                  Semua pengaturan teknis dasar dikumpulkan di sini dengan urutan yang lebih jelas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-info/10">
                        <Key className="w-5 h-5 text-info" />
                      </div>
                      <div>
                        <p className="font-medium">Identitas Layanan</p>
                        <p className="text-sm text-muted-foreground">
                          {idpSettings.provider === "keycloak" ? "Keycloak" : "Azure AD"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="badge-active">Terhubung</Badge>
                      <Button variant="outline" size="sm" onClick={() => setIsIdpDialogOpen(true)}>
                        Atur
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Database className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">Sumber Data</p>
                        <p className="text-sm text-muted-foreground">
                          Terhubung ke {geoServerEndpoints.length} layanan
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="badge-active">Siap</Badge>
                      <Button variant="outline" size="sm" onClick={() => setIsGeoServerDialogOpen(true)}>
                        Atur
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <Database className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">Jalur Pertukaran</p>
                        <p className="text-sm text-muted-foreground">
                          {isLoadingConnectionPools ? "Memuat registry..." : `${connectionPools.length} registry control plane tersedia`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {isLoadingConnectionPools ? "Loading" : connectionPools.length > 0 ? "Admin Managed" : "Empty"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => navigate("/connection-pools")}>
                        Buka Modul
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DS Adapter Tab ─────────────────────────────────────── */}
          <TabsContent value="adapter" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Sumber Domain Aktif
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-950">
                      {domainSource === "participant_binding"
                        ? "Binding participant"
                        : domainSource === "governance_fallback"
                          ? "Fallback organisasi governance"
                          : "Belum terbaca"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      domainSource === "participant_binding"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : domainSource === "governance_fallback"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                    }
                  >
                    {domainSource === "participant_binding"
                      ? "Bound"
                      : domainSource === "governance_fallback"
                        ? "Fallback"
                        : "Empty"}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>Organisasi aktif: {activeOrganizationName || "belum terbaca"}</p>
                  <p>Domain terpasang ke participant: {participantDomainCount}</p>
                  <p>Domain yang tampil di wizard: {participantDomainOptions.length}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 text-slate-50">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  Tindak Lanjut
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-100">
                  {domainSource === "participant_binding"
                    ? "Wizard sudah membaca domain yang benar dari participant aktif. Provider bisa lanjut set adapter, validasi, dan publish tanpa lewat tebakan nama organisasi."
                    : domainSource === "governance_fallback"
                      ? "Wizard masih menampilkan domain dari organisasi governance yang sedang dipilih. Ini belum berarti binding participant sudah tersimpan, jadi admin tetap perlu sinkronkan domain ke data participant."
                      : "Belum ada domain yang bisa dipakai. Cek pilihan organisasi saat login, lalu pastikan participant sudah dihubungkan ke organisasi governance dan punya domain aktif."}
                </p>
              </div>
            </div>
            {!runtimeConfig?.adapterEndpoint && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Service adapter belum diisi di deployment config. Bagian ini memang dipegang admin, jadi provider baru bisa jalan penuh setelah endpoint service dilengkapi.
              </div>
            )}
            {governanceDomainFallbackActive && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                Domain kerja yang tampil di halaman ini masih berasal dari organisasi governance aktif, belum dari binding participant yang tersimpan. Provider tetap bisa melihat konteks kerjanya, tetapi sinkronisasi domain participant masih perlu dibereskan dari sisi admin.
              </div>
            )}
            {!governanceDomainFallbackActive && !isLoadingParticipantDomains && !isLoadingGovernanceDomains && participantDomainOptions.length === 0 && !activeGovernanceOrganization && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                Organisasi aktif untuk participant ini belum kebaca. Login harus memakai organisasi yang benar, atau admin perlu mengikat participant ke organization governance dulu.
              </div>
            )}
            <AdapterFlowWizard
              participantId={participantId}
              adapterEndpoint={runtimeConfig?.adapterEndpoint ?? ""}
              domainOptions={participantDomainOptions}
            />
          {showLegacyDataFlow && (
            <Card className="shadow-soft border-0">
              <CardHeader>
                <CardTitle className="text-lg">Proses Data</CardTitle>
                <CardDescription>
                  Setelah jalur data siap, lanjutkan pengecekan koneksi, kirim data, lalu terbitkan dataset dari sini.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="space-y-2">
                      <Label>Domain</Label>
                      <Select
                        value={selectedProcessDomain || undefined}
                        onValueChange={(value) => setSelectedProcessDomain(value)}
                        disabled={isLoadingParticipantDomains || processDomainOptions.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingParticipantDomains
                                ? "Memuat domain..."
                                : processDomainOptions.length === 0
                                  ? "Belum ada domain"
                                  : "Pilih domain"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {processDomainOptions.length === 0 ? (
                            <SelectItem value="__no-domain__" disabled>
                              Belum ada domain yang bisa dipakai
                            </SelectItem>
                          ) : (
                            processDomainOptions.map((domain) => (
                              <SelectItem key={domain.value} value={domain.value}>
                                {domain.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Domain diambil dari participant yang sedang aktif. Setelah dipilih, jalur data akan tersaring otomatis.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Jalur yang dipakai</Label>
                      <Select
                        value={selectedAdapter ? String(selectedAdapter.id) : undefined}
                        onValueChange={(value) => setSelectedAdapterId(value)}
                        disabled={!selectedProcessDomain || adaptersForSelectedDomain.length <= 1}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedProcessDomain ? "Pilih domain dulu" : "Pilih jalur data"} />
                        </SelectTrigger>
                        <SelectContent>
                          {adaptersForSelectedDomain.length === 0 ? (
                            <SelectItem value="__none__" disabled>
                              Belum ada jalur untuk domain ini
                            </SelectItem>
                          ) : (
                            adaptersForSelectedDomain.map((adapter) => (
                              <SelectItem key={adapter.id} value={String(adapter.id)}>
                                {adapter.type} · {adapter.endpoint?.url}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {adaptersForSelectedDomain.length === 0
                          ? "Belum ada jalur data yang terdaftar untuk domain ini."
                          : adaptersForSelectedDomain.length === 1
                            ? "Jalur data dipilih otomatis karena hanya ada satu yang cocok."
                            : "Pilih salah satu jalur data yang tersedia untuk domain ini."}
                      </p>
                    </div>

                    {selectedProcessDomain && selectedAdapter ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">{selectedAdapter.domain_id} · {selectedAdapter.type}</p>
                        <p className="mt-1 break-all">{selectedAdapterUrl}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={handleAdapterHealthCheck} disabled={!canManageAdapterActions || adapterBusyAction !== ""}>
                            {adapterBusyAction === "health" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Cek Koneksi
                          </Button>
                          <Button type="button" variant="outline" onClick={handleAdapterMetadataFetch} disabled={!canManageAdapterActions || adapterBusyAction !== ""}>
                            {adapterBusyAction === "metadata" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Files className="mr-2 h-4 w-4" />}
                            Lihat Info
                          </Button>
                        </div>
                      </div>
                    ) : selectedProcessDomain ? (
                      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                        Belum ada jalur data untuk domain ini. Tambahkan dulu jalur data di bagian atas.
                      </div>
                    ) : isLoadingParticipantDomains ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
                        Domain participant sedang dimuat. Tunggu sebentar lalu pilih domain yang tersedia.
                      </div>
                    ) : participantDomainOptions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                        {isProvider
                          ? "Participant ini belum punya domain kerja. Proses data baru bisa jalan setelah admin melengkapi domain participant."
                          : "Domain belum terpasang ke participant ini. Lengkapi dulu domain di data participant, lalu kembali ke halaman ini untuk lanjut proses data."}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                        Pilih domain terlebih dahulu supaya proses di bawah bisa dijalankan.
                      </div>
                    )}

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div>
                          <p className="font-semibold text-slate-900">Kirim GeoJSON</p>
                          <p className="text-xs text-slate-500">Cocok untuk kirim data spasial langsung</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Domain</Label>
                          <Input
                            value={geojsonForm.domain}
                            readOnly
                            disabled
                            className="bg-muted"
                            placeholder="Ikuti domain yang dipilih di atas"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Classification override</Label>
                          <Select
                            value={geojsonForm.classification || "__none__"}
                            onValueChange={(value) =>
                              setGeojsonForm((prev) => ({
                                ...prev,
                                classification: value === "__none__" ? "" : (value as AdapterClassification),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Ikuti default domain</SelectItem>
                              <SelectItem value="L0">L0</SelectItem>
                              <SelectItem value="L1">L1</SelectItem>
                              <SelectItem value="L2">L2</SelectItem>
                              <SelectItem value="L3">L3</SelectItem>
                              <SelectItem value="L4">L4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Payload GeoJSON</Label>
                          <Textarea
                            className="min-h-[220px] font-mono text-xs"
                            value={geojsonForm.payload}
                            onChange={(e) => setGeojsonForm((prev) => ({ ...prev, payload: e.target.value }))}
                            placeholder='{"type":"FeatureCollection","features":[]}'
                          />
                        </div>
                        <Button type="button" onClick={handleGeojsonIngest} disabled={!canManageAdapterActions || !selectedAdapter || adapterBusyAction !== ""}>
                          {adapterBusyAction === "geojson" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson2 className="mr-2 h-4 w-4" />}
                          Kirim GeoJSON
                        </Button>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div>
                          <p className="font-semibold text-slate-900">Upload Shapefile</p>
                          <p className="text-xs text-slate-500">Cocok untuk unggah arsip shapefile</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Domain</Label>
                          <Input
                            value={shapefileForm.domain}
                            readOnly
                            disabled
                            className="bg-muted"
                            placeholder="Ikuti domain yang dipilih di atas"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Classification override</Label>
                          <Select
                            value={shapefileForm.classification || "__none__"}
                            onValueChange={(value) =>
                              setShapefileForm((prev) => ({
                                ...prev,
                                classification: value === "__none__" ? "" : (value as AdapterClassification),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Ikuti default domain</SelectItem>
                              <SelectItem value="L0">L0</SelectItem>
                              <SelectItem value="L1">L1</SelectItem>
                              <SelectItem value="L2">L2</SelectItem>
                              <SelectItem value="L3">L3</SelectItem>
                              <SelectItem value="L4">L4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Arsip Shapefile</Label>
                          <Input
                            type="file"
                            accept=".zip,application/zip"
                            onChange={(e) =>
                              setShapefileForm((prev) => ({
                                ...prev,
                                file: e.target.files?.[0] ?? null,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Field map JSON</Label>
                          <Textarea
                            className="min-h-[90px] font-mono text-xs"
                            value={shapefileForm.fieldMap}
                            onChange={(e) => setShapefileForm((prev) => ({ ...prev, fieldMap: e.target.value }))}
                            placeholder='{"well_name":"NAMA_SUMUR","operator":"OPERATOR"}'
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Constants JSON</Label>
                          <Textarea
                            className="min-h-[90px] font-mono text-xs"
                            value={shapefileForm.constants}
                            onChange={(e) => setShapefileForm((prev) => ({ ...prev, constants: e.target.value }))}
                            placeholder='{"source":"provider-upload"}'
                          />
                        </div>
                        <Button type="button" onClick={handleShapefileIngest} disabled={!canManageAdapterActions || !selectedAdapter || adapterBusyAction !== ""}>
                          {adapterBusyAction === "shapefile" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                          Upload Shapefile
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div>
                          <p className="font-semibold text-slate-900">Terbitkan Dataset</p>
                          <p className="text-xs text-slate-500">Pakai setelah data siap dipublikasikan</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                          <Label>Domain</Label>
                          <Input
                            value={publishForm.domain}
                            readOnly
                            disabled
                            className="bg-muted"
                            placeholder="Ikuti domain yang dipilih di atas"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nama dataset</Label>
                          <Input
                            value={publishForm.name}
                            onChange={(e) => setPublishForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="well-location-active"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Schema ID</Label>
                          <Input
                            value={publishForm.schemaId}
                            onChange={(e) => setPublishForm((prev) => ({ ...prev, schemaId: e.target.value }))}
                            placeholder="well-location-schema"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Version</Label>
                          <Input
                            value={publishForm.version}
                            onChange={(e) => setPublishForm((prev) => ({ ...prev, version: e.target.value }))}
                            placeholder="1.0.0"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                        <div className="space-y-2">
                          <Label>Level</Label>
                          <Select
                            value={publishForm.level}
                            onValueChange={(value) => setPublishForm((prev) => ({ ...prev, level: value as AdapterClassification }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="L0">L0</SelectItem>
                              <SelectItem value="L1">L1</SelectItem>
                              <SelectItem value="L2">L2</SelectItem>
                              <SelectItem value="L3">L3</SelectItem>
                              <SelectItem value="L4">L4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>GeoJSON opsional</Label>
                          <Textarea
                            className="min-h-[120px] font-mono text-xs"
                            value={publishForm.geojson}
                            onChange={(e) => setPublishForm((prev) => ({ ...prev, geojson: e.target.value }))}
                            placeholder="Kosongkan jika adapter sudah punya hasil validasi sendiri"
                          />
                        </div>
                      </div>
                      <Button type="button" onClick={handleAdapterPublish} disabled={!canManageAdapterActions || !selectedAdapter || adapterBusyAction !== ""}>
                        {adapterBusyAction === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link className="mr-2 h-4 w-4" />}
                        Publish Dataset
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Output</p>
                      <p className="mt-2 text-sm text-slate-300">
                        Hasil proses ditampilkan apa adanya supaya mudah dicek saat uji alur dan pencatatan defect.
                      </p>
                    </div>
                    <div
                      className={`rounded-xl border p-3 text-sm ${
                        adapterResult.type === "error"
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                          : adapterResult.type === "success"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-50"
                            : "border-slate-700 bg-slate-900 text-slate-300"
                      }`}
                    >
                      <p className="font-semibold">
                        {adapterResult.title || "Belum ada proses dijalankan"}
                      </p>
                      <pre className="mt-3 max-h-[780px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 text-xs leading-6">
                        {adapterResult.payload ? JSON.stringify(adapterResult.payload, null, 2) : "Pilih domain, pastikan jalur data tersedia, lalu jalankan proses yang dibutuhkan."}
                      </pre>
                    </div>
                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
                      Beberapa bagian lanjutan memang belum tersedia penuh, jadi tetap ditandai sebagai pekerjaan berikutnya dan tidak ditampilkan seolah sudah selesai.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" /> Jalur Data
                  </CardTitle>
                  <CardDescription>
                    Daftarkan dan kelola jalur data per domain di bagian ini.
                  </CardDescription>
                </div>
                <Button onClick={openAddAdapter} disabled={!canManageAdapterActions || !participantId || participantDomainOptions.length === 0}>
                  <Plus className="w-4 h-4 mr-2" /> Tambah Jalur
                </Button>
              </CardHeader>
              <CardContent>
                {!participantId && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <Shield className="w-4 h-4" /> Akun ini belum terhubung ke participant, jadi jalur data belum bisa diatur.
                  </div>
                )}

                {!!participantId && participantDomainOptions.length === 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="flex items-start gap-2">
                      <Shield className="mt-0.5 w-4 h-4" />
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium">Domain participant belum ada.</p>
                          <p className="mt-1">
                            {isProvider
                              ? "Jalur data belum bisa dibuat karena participant ini belum dipasangi domain. Lengkapi dulu dari sisi admin."
                              : "Jalur data belum bisa dibuat sebelum domain ditambahkan ke participant ini."}
                          </p>
                          <p className="mt-1">
                            {isProvider
                              ? "Provider cukup menunggu domain participant dipasang, lalu kembali ke sini untuk lanjut isi jalur data."
                              : "Pengaturannya ada di data participant, bagian domain."}
                          </p>
                        </div>
                        {!isProvider && canOpenParticipantDomainSetup ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                            onClick={() => navigate(`/participants/${participantId}?tab=domains`)}
                          >
                            Buka Pengaturan Domain
                          </Button>
                        ) : (
                          <p className="text-xs">Hubungi admin untuk melengkapi domain participant terlebih dahulu.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {loadingAdapters && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Memuat jalur data...
                  </div>
                )}

                {!loadingAdapters && (adaptersData ?? []).length === 0 && participantId && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">Belum ada jalur data</p>
                    <p className="text-xs mt-1">Tambahkan satu jalur untuk tiap domain yang dipakai participant.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {(adaptersData ?? []).map((a: any) => {
                    const domainLabel = DOMAINS.find((d) => d.key === a.domain_id || d.key === a.domain?.key)?.label ?? a.domain_id ?? "—";
                    const connSt = connTestStatus[a.id] ?? "idle";
                    return (
                      <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{domainLabel}</Badge>
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">{a.type ?? "GIS_STUDIO"}</Badge>
                            {connSt === "ok" && <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Online</Badge>}
                            {connSt === "error" && <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">Tidak tersambung</Badge>}
                          </div>
                          <p className="text-xs font-mono text-muted-foreground truncate">{a.endpoint?.url ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => testAdapterConn(a.id, a.endpoint?.url ?? "")}
                            disabled={!canManageAdapterActions || connSt === "checking"}
                          >
                            {connSt === "checking"
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Globe className="w-3 h-3" />}
                            <span className="ml-1">Test</span>
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditAdapter(a)} disabled={!canManageAdapterActions}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => removeAdapter(a.id)} disabled={!canManageAdapterActions}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Catatan:</p>
                    <p>Pakai satu jalur yang jelas untuk tiap domain supaya proses kirim data dan penerbitan tidak salah arah.</p>
                  </div>
                </CardContent>
              </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="w-5 h-5" />
                    Hasil
                  </CardTitle>
                  <CardDescription>
                    Cek apakah dataset yang ada sudah mengarah ke jalur data yang benar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!participantId && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      Akun ini belum punya participant aktif, jadi daftar keterhubungan dataset belum bisa ditampilkan.
                    </div>
                  )}

                  {participantId && adapterPublishedPairs.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                      Belum ada dataset yang bisa dicocokkan ke jalur data yang terdaftar.
                    </div>
                  )}

                  {participantId && adapterPublishedPairs.length > 0 && (
                    <div className="space-y-3">
                      {adapterPublishedPairs.map((row) => (
                        <div key={row.datasetId} className="rounded-xl border border-border bg-muted/30 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{row.datasetName}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{row.datasetId}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                row.isViaAdapter
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                              }
                            >
                              {row.isViaAdapter ? "Sudah terhubung" : "Belum terhubung"}
                            </Badge>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
                            <div>
                              <p className="text-muted-foreground">Domain</p>
                              <p className="mt-1 font-medium text-slate-900">{row.domain}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Level</p>
                              <p className="mt-1 font-medium text-slate-900">{row.level}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Status Dataset</p>
                              <p className="mt-1 font-medium text-slate-900">{row.status}</p>
                            </div>
                          </div>
                          <p className="mt-3 truncate rounded-lg bg-background px-3 py-2 font-mono text-[11px] text-muted-foreground">
                            {row.endpointUrl}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                    Daftar keterhubungan diambil dari dataset milik participant aktif dan dicocokkan dengan jalur data yang sudah didaftarkan.
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>
        </Tabs>

        {/* Adapter Dialog */}
        <Dialog open={adapterDialog && canManageAdapterActions} onOpenChange={setAdapterDialog}>
          <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAdapter ? "Ubah Jalur Data" : "Tambah Jalur Data"}</DialogTitle>
              <DialogDescription>
                Daftarkan jalur data untuk domain tertentu.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={adapterForm.domain_id} onValueChange={(v) => setAdapterForm((f) => ({ ...f, domain_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih domain" /></SelectTrigger>
                  <SelectContent>
                    {participantDomainOptions.map((domain) => (
                      <SelectItem key={domain.value} value={domain.value}>
                        {domain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Hanya domain yang memang sudah terikat ke participant yang bisa dipakai di sini.</p>
              </div>
              <div className="space-y-2">
                <Label>Tipe Adapter</Label>
                <Input value="GIS_STUDIO" disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Jenis jalur data dikunci mengikuti flow yang sudah dipakai saat ini.</p>
              </div>
              <div className="space-y-2">
                <Label>Endpoint URL *</Label>
                <Input
                  value={adapterForm.url}
                  onChange={(e) => setAdapterForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://adapter.kkks.co.id/api/v1"
                />
                <p className="text-xs text-muted-foreground">Masukkan alamat layanan yang akan dipakai dataset pada domain ini.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdapterDialog(false)}>Batal</Button>
              <Button onClick={saveAdapter}
                disabled={
                  !canManageAdapterActions ||
                  addAdapterMutation.isPending ||
                  updateAdapterMutation.isPending ||
                  !adapterForm.url ||
                  !adapterForm.domain_id
                }>
                {(addAdapterMutation.isPending || updateAdapterMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingAdapter ? "Simpan Perubahan" : "Tambah Jalur"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Ubah Kata Sandi
              </DialogTitle>
              <DialogDescription>
                Masukkan kata sandi saat ini lalu tentukan yang baru.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentPwd">Kata Sandi Saat Ini</Label>
                <div className="relative">
                  <Input
                    id="currentPwd"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Masukkan kata sandi saat ini"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPwd">Kata Sandi Baru</Label>
                <div className="relative">
                  <Input
                    id="newPwd"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Masukkan kata sandi baru"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPwd">Konfirmasi Kata Sandi Baru</Label>
                <div className="relative">
                  <Input
                    id="confirmPwd"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Ulangi kata sandi baru"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Kata sandi minimal 8 karakter.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleChangePassword} disabled={isSaving} className="bg-accent hover:bg-accent/90">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Simpan Kata Sandi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GeoServer Configuration Dialog */}
        <Dialog open={isGeoServerDialogOpen} onOpenChange={setIsGeoServerDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Konfigurasi GeoServer
              </DialogTitle>
              <DialogDescription>
                Kelola daftar endpoint GeoServer yang dipakai di lingkungan ini.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {geoServerEndpoints.length} endpoint tersimpan
                </p>
                <Button size="sm" variant="outline" onClick={() => setIsAddEndpointDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Endpoint
                </Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {geoServerEndpoints.map((endpoint) => (
                  <div
                    key={endpoint.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-info/10">
                        <Database className="w-4 h-4 text-info" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{endpoint.name}</p>
                        <p className="text-xs text-muted-foreground">{endpoint.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{endpoint.type}</Badge>
                      <Badge className={endpoint.status === "connected" ? "badge-active" : "badge-inactive"}>
                        {endpoint.status === "connected" ? "Terhubung" : "Terputus"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveEndpoint(endpoint.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGeoServerDialogOpen(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Endpoint Dialog */}
        <Dialog open={isAddEndpointDialogOpen} onOpenChange={setIsAddEndpointDialogOpen}>
          <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Endpoint GeoServer</DialogTitle>
              <DialogDescription>
                Tambahkan satu jalur endpoint baru untuk kebutuhan integrasi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="endpointName">Nama Endpoint</Label>
                <Input
                  id="endpointName"
                  placeholder="Contoh: PHE ONWJ GeoServer"
                  value={newEndpointForm.name}
                  onChange={(e) => setNewEndpointForm({ ...newEndpointForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpointUrl">URL Endpoint</Label>
                <Input
                  id="endpointUrl"
                  placeholder="https://geoserver.example.com"
                  value={newEndpointForm.url}
                  onChange={(e) => setNewEndpointForm({ ...newEndpointForm, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipe Layanan</Label>
                <Select
                  value={newEndpointForm.type}
                  onValueChange={(v) => setNewEndpointForm({ ...newEndpointForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WMS">WMS (Web Map Service)</SelectItem>
                    <SelectItem value="WFS">WFS (Web Feature Service)</SelectItem>
                    <SelectItem value="WCS">WCS (Web Coverage Service)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddEndpointDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddEndpoint} className="bg-accent hover:bg-accent/90">
                Tambah Endpoint
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Identity Provider Configuration Dialog */}
        <Dialog open={isIdpDialogOpen} onOpenChange={setIsIdpDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Konfigurasi Identity Provider
              </DialogTitle>
              <DialogDescription>
                Atur sumber autentikasi yang dipakai aplikasi ini.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Jenis Provider</Label>
                <Select
                  value={idpSettings.provider}
                  onValueChange={(v) => setIdpSettings({ ...idpSettings, provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keycloak">Keycloak</SelectItem>
                    <SelectItem value="azure">Azure AD</SelectItem>
                    <SelectItem value="okta">Okta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="realmUrl">URL Realm / Tenant</Label>
                <Input
                  id="realmUrl"
                  placeholder="https://auth.example.com/realms/your-realm"
                  value={idpSettings.realmUrl}
                  onChange={(e) => setIdpSettings({ ...idpSettings, realmUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  placeholder="client-id-aplikasi"
                  value={idpSettings.clientId}
                  onChange={(e) => setIdpSettings({ ...idpSettings, clientId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="client-secret-aplikasi"
                  value={idpSettings.clientSecret}
                  onChange={(e) => setIdpSettings({ ...idpSettings, clientSecret: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsIdpDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveIdpSettings} disabled={isSaving} className="bg-accent hover:bg-accent/90">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Konfigurasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Settings;
