import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import {
  useProvider,
  useUpdateProvider,
  useDeleteProvider,
  useParticipantDomains,
  useAddParticipantDomain,
  useDeleteParticipantDomain,
  useParticipantAdapters,
  useAddParticipantAdapter,
  useUpdateParticipantAdapter,
  useDeleteParticipantAdapter,
} from "@/api/hooks/useProviders";
import { useConnectionPools } from "@/api/hooks/useConnectionPools";
import { useOrganizations, useOrganizationDomains } from "@/api/hooks/useOrganizations";
import { useProviders } from "@/api/hooks/useProviders";
import { usersApi } from "@/api/services/identity";
import { registrationsApi, type RegistrationItem } from "@/api/services/onboarding";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Plus,
  Info,
  Globe,
  Cpu,
  RefreshCw,
  Mail,
  Link2,
  UserCheck,
  UserRoundX,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { findParticipantPool, isPoolReady, resolvePoolMeta } from "@/lib/connection-pool";
import { useDomain } from "@/context/DomainContext";
import { useAuth } from "@/context/AuthContext";
import {
  issueAutoObligationContracts,
  selectConsumerParticipant,
} from "@/lib/onboarding-obligations";

interface UserAccountRow {
  id: string;
  email?: string;
  username?: string;
  full_name?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
}

type BindingState = "VERIFIED" | "INFERRED" | "MISSING";

const normalize = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const getParticipantOrganizationBindingKey = (participantId: string) =>
  `participant_org_binding:${participantId}`;

const ParticipantDetail = () => {
  const { availableDomains } = useDomain();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const participantId = id || "";
  const activeTab = searchParams.get("tab") === "adapters" || searchParams.get("tab") === "domains"
    ? searchParams.get("tab")!
    : "info";
  const storedOrganizationBinding = participantId
    ? localStorage.getItem(getParticipantOrganizationBindingKey(participantId))
    : null;

  // Participant Detail Info
  const { data: provider, isLoading, isError, refetch: refetchProvider } = useProvider(participantId);
  const updateMutation = useUpdateProvider();
  const deleteMutation = useDeleteProvider();

  // Matched Organization & Domains
  const { data: orgs } = useOrganizations();
  const { data: providers } = useProviders();
  const preferredConsumerName = user?.category?.name ?? null;
  const matchedOrg = useMemo(() => {
    if (!provider || !orgs) return null;
    const byName = orgs.find(
      (o: any) => normalize(o.organization_name) === normalize(provider.organization_name),
    );
    if (!byName) return null;
    return { data: byName, source: "name" as const };
  }, [provider, orgs]);

  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("");
  const [isSyncingDomains, setIsSyncingDomains] = useState(false);

  useEffect(() => {
    const fallbackId = storedOrganizationBinding || matchedOrg?.data.organization_id || "";
    setSelectedOrganizationId((current) => current || fallbackId);
  }, [storedOrganizationBinding, matchedOrg?.data.organization_id]);

  const effectiveOrganization = useMemo(() => {
    if (!orgs || !selectedOrganizationId) return null;
    return orgs.find((item: any) => item.organization_id === selectedOrganizationId) ?? null;
  }, [orgs, selectedOrganizationId]);

  const { data: orgDomains, isLoading: loadingOrgDomains } = useOrganizationDomains(
    selectedOrganizationId || matchedOrg?.data.organization_id || null
  );

  // Participant Domains
  const {
    data: participantDomains,
    isLoading: loadingDomains,
    refetch: refetchDomains,
  } = useParticipantDomains(participantId);
  const addDomainMutation = useAddParticipantDomain();
  const deleteDomainMutation = useDeleteParticipantDomain();

  // Participant Adapters
  const {
    data: participantAdapters,
    isLoading: loadingAdapters,
    refetch: refetchAdapters,
  } = useParticipantAdapters(participantId);
  const addAdapterMutation = useAddParticipantAdapter();
  const updateAdapterMutation = useUpdateParticipantAdapter();
  const deleteAdapterMutation = useDeleteParticipantAdapter();
  const poolsQ = useConnectionPools();
  const usersQ = useQuery({
    queryKey: ["users", "list", "participant-detail"],
    queryFn: () => usersApi.list(),
  });
  const registrationsQ = useQuery({
    queryKey: ["registrations", "list", "participant-detail"],
    queryFn: () => registrationsApi.list(),
  });

  // Dialog & Form States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isAddDomainOpen, setIsAddDomainOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [isResendingInvitation, setIsResendingInvitation] = useState(false);

  const [isAdapterDialogOpen, setIsAdapterDialogOpen] = useState(false);
  const [editingAdapter, setEditingAdapter] = useState<any>(null); // null means adding
  const [adapterFormData, setAdapterFormData] = useState({
    domain_id: "",
    type: "GIS_STUDIO",
    url: "",
  });

  const [formData, setFormData] = useState({
    organization_name: "",
    address: "",
  });

  useEffect(() => {
    if (provider) {
      setFormData({
        organization_name: provider.organization_name || "",
        address: provider.address || "",
      });
    }
  }, [provider]);

  // Map domain_id to name helper
  const getDomainName = (domId: string) => {
    const found = orgDomains?.find((d) => d.domain_id === domId);
    return found ? `${found.domain_name} (${found.code})` : domId;
  };

  const relatedRegistration = useMemo(() => {
    if (!provider) return null;
    const regs = (registrationsQ.data ?? []) as RegistrationItem[];
    const byParticipant = regs.find((item) => item.participant_id === provider.id);
    if (byParticipant) return { data: byParticipant, source: "participant" as const };

    const operatorEmail = provider.contact_person?.email ?? null;
    if (operatorEmail) {
      const byEmail = regs.find((item) => normalize(item.operator_email) === normalize(operatorEmail));
      if (byEmail) return { data: byEmail, source: "operator_email" as const };
    }

    const byOrgName =
      regs.find((item) => normalize(item.organization_name) === normalize(provider.organization_name)) ?? null;
    return byOrgName ? { data: byOrgName, source: "organization_name" as const } : null;
  }, [provider, registrationsQ.data]);

  const operatorEmail =
    provider?.contact_person?.email ||
    relatedRegistration?.data.operator_email ||
    null;

  const operatorUser = useMemo(() => {
    const users = (usersQ.data ?? []) as UserAccountRow[];
    if (!operatorEmail) return null;
    return users.find((item) => normalize(item.email) === normalize(operatorEmail)) ?? null;
  }, [operatorEmail, usersQ.data]);

  const operatorStatus = useMemo(() => {
    if (!operatorUser) return "TIDAK_ADA";
    if (operatorUser.is_active && operatorUser.is_verified) return "AKTIF";
    return "BELUM_AKTIF";
  }, [operatorUser]);
  const participantPools = useMemo(
    () => ((poolsQ.data ?? []) as Array<any>).filter((item) => item.participant_id === participantId),
    [poolsQ.data, participantId],
  );
  const consumerParticipant = useMemo(
    () =>
      selectConsumerParticipant(
        ((providers ?? []) as Array<any>).map((item) => ({
          provider_id: item.provider_id,
          provider_name: item.provider_name,
          organization_type: item.organization_type,
        })),
        preferredConsumerName,
      ),
    [providers, preferredConsumerName],
  );
  const primaryPool = useMemo(() => findParticipantPool(participantPools, participantId), [participantPools, participantId]);
  const poolMeta = primaryPool ? resolvePoolMeta(primaryPool) : null;
  const poolReady = isPoolReady(primaryPool);
  const [isIssuingObligations, setIsIssuingObligations] = useState(false);

  const organizationBindingState: BindingState =
    storedOrganizationBinding && effectiveOrganization
      ? "VERIFIED"
      : matchedOrg
        ? "INFERRED"
        : "MISSING";
  const registrationBindingState: BindingState =
    relatedRegistration?.source === "participant"
      ? "VERIFIED"
      : relatedRegistration
        ? "INFERRED"
        : "MISSING";

  const handleResendInvitation = async () => {
    if (!operatorEmail) {
      toast.error("Email operator belum tersedia untuk kirim ulang undangan");
      return;
    }

    try {
      setIsResendingInvitation(true);
      await usersApi.resendConfirmation(operatorEmail);
      toast.success(`Undangan aktivasi dikirim ulang ke ${operatorEmail}`);
      await usersQ.refetch();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal mengirim ulang undangan"));
    } finally {
      setIsResendingInvitation(false);
    }
  };

  const missingOrganizationDomains = useMemo(() => {
    const assigned = new Set(((participantDomains ?? []) as Array<any>).map((item) => item.domain_id));
    return ((orgDomains ?? []) as Array<any>).filter((item) => !assigned.has(item.domain_id));
  }, [orgDomains, participantDomains]);
  const participantDomainCount = participantDomains?.length ?? 0;
  const organizationDomainCount = orgDomains?.length ?? 0;
  const domainBindingState: BindingState =
    participantDomainCount > 0
      ? missingOrganizationDomains.length === 0
        ? "VERIFIED"
        : "INFERRED"
      : organizationDomainCount > 0
        ? "INFERRED"
        : "MISSING";
  const organizationBindingNote =
    organizationBindingState === "VERIFIED"
      ? "Organisasi governance untuk participant ini sudah dipilih manual dan bisa dipakai sebagai sumber domain resmi."
      : organizationBindingState === "INFERRED"
        ? "Organisasi governance masih dibaca dari inferensi nama. Simpan pilihan organisasi bila ini memang relasi yang benar."
        : "Participant ini belum punya organisasi governance yang bisa dipastikan, jadi sinkronisasi domain dan kontrak otomatis rawan meleset.";
  const domainBindingNote =
    domainBindingState === "VERIFIED"
      ? "Semua domain dari organisasi sumber sudah tertempel ke participant ini."
      : domainBindingState === "INFERRED"
        ? "Sebagian konteks domain sudah ada, tetapi belum seluruh domain organisasi disinkronkan ke participant."
        : "Participant ini belum punya domain operasional yang tertempel walaupun organisasi sumber bisa saja sudah punya domain.";
  const connectionPoolIssues = [
    !poolMeta?.endpoint ? "endpoint connector belum ada" : null,
    !poolMeta?.wellKnownJwtUrl ? "well-known JWT URL belum ada" : null,
  ].filter(Boolean) as string[];

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Participant Detail" subtitle="Memuat data..." />
        <div className="p-6 flex justify-center mt-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div className="min-h-screen">
        <Header title="Participant Detail" subtitle="Error" />
        <div className="p-6 flex flex-col items-center mt-20">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold">Data Tidak Ditemukan</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/participants")}>
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const handleEdit = async () => {
    try {
      await updateMutation.mutateAsync({
        id: provider.id,
        data: formData,
      });
      setIsEditDialogOpen(false);
      toast.success("Participant berhasil diperbarui");
      refetchProvider();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memperbarui participant"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(provider.id);
      setIsDeleteDialogOpen(false);
      toast.success("Participant berhasil dihapus");
      navigate("/participants");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus participant"));
    }
  };

  const handleAddDomain = async () => {
    if (!selectedDomainId) return toast.error("Pilih domain terlebih dahulu");
    try {
      await addDomainMutation.mutateAsync({
        participantId,
        body: { domain_id: selectedDomainId },
      });
      setIsAddDomainOpen(false);
      setSelectedDomainId("");
      toast.success("Domain berhasil ditambahkan ke participant");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menambahkan domain"));
    }
  };

  const handleDeleteDomain = async (domainLinkId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus domain ini dari participant?")) return;
    try {
      await deleteDomainMutation.mutateAsync({
        participantId,
        id: domainLinkId,
      });
      toast.success("Domain berhasil dihapus");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus domain"));
    }
  };

  const handleSaveOrganizationBinding = () => {
    if (!selectedOrganizationId) {
      localStorage.removeItem(getParticipantOrganizationBindingKey(participantId));
      toast.success("Pilihan organisasi sumber domain dibersihkan.");
      return;
    }
    localStorage.setItem(getParticipantOrganizationBindingKey(participantId), selectedOrganizationId);
    toast.success("Organisasi sumber domain disimpan untuk participant ini.");
  };

  const handleResetOrganizationBinding = () => {
    localStorage.removeItem(getParticipantOrganizationBindingKey(participantId));
    setSelectedOrganizationId(matchedOrg?.data.organization_id || "");
    toast.success("Pilihan organisasi sumber domain dikembalikan ke hasil deteksi otomatis.");
  };

  const handleSyncOrganizationDomains = async () => {
    if (!missingOrganizationDomains.length) {
      toast.info("Semua domain organisasi sudah terpasang ke participant ini.");
      return;
    }

    try {
      setIsSyncingDomains(true);
      for (const domain of missingOrganizationDomains) {
        await addDomainMutation.mutateAsync({
          participantId,
          body: { domain_id: domain.domain_id },
        });
      }
      await refetchDomains();
      toast.success(`${missingOrganizationDomains.length} domain berhasil dipasang ke participant.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Sinkronisasi domain gagal dijalankan"));
    } finally {
      setIsSyncingDomains(false);
    }
  };

  const handleIssueObligations = async () => {
    if (!consumerParticipant?.provider_id) {
      toast.error("Participant consumer/regulator belum tersedia untuk menerbitkan permintaan kontrak.");
      return;
    }

    const targetDomainIds = ((participantDomains ?? []) as Array<any>)
      .map((item) => item.domain_id)
      .filter(Boolean);

    if (targetDomainIds.length === 0) {
      toast.error("Participant ini belum punya domain. Sinkronkan domain dari organization governance dulu.");
      return;
    }

    try {
      setIsIssuingObligations(true);
      const result = await issueAutoObligationContracts({
        domainIds: targetDomainIds,
        consumerId: consumerParticipant.provider_id,
        providerId: participantId,
        providerName: provider.organization_name || provider.contact_person?.name || participantId,
      });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      if (result.created === 0) {
        toast.info("Semua kewajiban kontrak untuk participant ini sudah pernah diterbitkan.");
      } else {
        toast.success(
          `${result.created} kontrak kewajiban berhasil diterbitkan${result.skipped ? `, ${result.skipped} dilewati karena sudah ada` : ""}.`,
        );
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menerbitkan kewajiban kontrak otomatis"));
    } finally {
      setIsIssuingObligations(false);
    }
  };

  const handleOpenAdapterDialog = (adapter?: any) => {
    if (adapter) {
      setEditingAdapter(adapter);
      setAdapterFormData({
        domain_id: adapter.domain_id,
        type: adapter.type || "GIS_STUDIO",
        url: adapter.endpoint?.url || "",
      });
    } else {
      setEditingAdapter(null);
      // Pre-fill with the first assigned domain if available
      setAdapterFormData({
        domain_id: participantDomains?.[0]?.domain_id || "",
        type: "GIS_STUDIO",
        url: "",
      });
    }
    setIsAdapterDialogOpen(true);
  };

  const handleSaveAdapter = async () => {
    if (!adapterFormData.domain_id) return toast.error("Pilih domain terlebih dahulu");
    if (!adapterFormData.url) return toast.error("Input URL endpoint adapter");

    const payload = {
      domain_id: adapterFormData.domain_id,
      type: adapterFormData.type,
      endpoint: { url: adapterFormData.url },
    };

    try {
      if (editingAdapter) {
        await updateAdapterMutation.mutateAsync({
          participantId,
          id: editingAdapter.id,
          body: payload,
        });
        toast.success("Adapter berhasil diperbarui");
      } else {
        await addAdapterMutation.mutateAsync({
          participantId,
          body: payload,
        });
        toast.success("Adapter berhasil diregistrasikan");
      }
      setIsAdapterDialogOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memproses adapter"));
    }
  };

  const handleDeleteAdapter = async (adapterId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus adapter ini?")) return;
    try {
      await deleteAdapterMutation.mutateAsync({
        participantId,
        id: adapterId,
      });
      toast.success("Adapter berhasil dihapus");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus adapter"));
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <Header
        title={provider.organization_name || "Participant Detail"}
        subtitle="Kelola informasi, domain, dan adapter (dataplane) participant"
      />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/participants")} className="-ml-4 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Daftar Participants
        </Button>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            if (value === "info") {
              next.delete("tab");
            } else {
              next.set("tab", value);
            }
            setSearchParams(next, { replace: true });
          }}
          className="w-full"
        >
          <TabsList className="mb-6 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="info" className="flex items-center gap-2 px-4 py-2">
              <Info className="w-4 h-4" />
              Detail Informasi
            </TabsTrigger>
            <TabsTrigger value="domains" className="flex items-center gap-2 px-4 py-2">
              <Globe className="w-4 h-4" />
              Domain Partisipan
            </TabsTrigger>
            <TabsTrigger value="adapters" className="flex items-center gap-2 px-4 py-2">
              <Cpu className="w-4 h-4" />
              Adapters (Dataplane)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: INFO */}
          <TabsContent value="info" className="mt-0 outline-none">
            <div className="panel p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{provider.organization_name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={provider.status === "ACTIVE" ? "default" : "secondary"}>
                      {provider.status || "UNKNOWN"}
                    </Badge>
                    {provider.organization_type && (
                      <Badge variant="outline" className="font-mono">
                        {provider.organization_type}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Hapus
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ID Participant</p>
                  <p className="font-mono text-sm bg-muted/50 p-3 rounded-lg border border-border">
                    {provider.id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Alamat</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg border border-border min-h-[46px]">
                    {provider.address || "Belum ada alamat"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Governance Organization</p>
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {effectiveOrganization?.organization_name || matchedOrg?.data.organization_name || "Belum terhubung ke organization governance"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {effectiveOrganization?.organization_id || matchedOrg?.data.organization_id || "Belum ada organisasi governance yang bisa dipastikan"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          organizationBindingState === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : organizationBindingState === "INFERRED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {organizationBindingState === "VERIFIED"
                          ? "Verified"
                          : organizationBindingState === "INFERRED"
                            ? "Inferred"
                            : "Missing"}
                      </Badge>
                    </div>
                    {storedOrganizationBinding && effectiveOrganization ? (
                      <p className="mt-2 text-xs text-emerald-700">
                        Participant ini memakai organisasi sumber domain yang disimpan manual oleh admin.
                      </p>
                    ) : null}
                    {matchedOrg?.source === "name" && (
                      <p className="mt-2 text-xs text-amber-700">
                        Relasi ini masih dibaca dari kecocokan nama organisasi, belum dari foreign key eksplisit.
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {organizationBindingNote}
                    </p>
                    <div className="mt-4 rounded-lg border border-border bg-background p-3">
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="text-sm font-medium">Atur organisasi sumber di sini</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Kalau participant ini sudah terbuat tetapi organisasi governance-nya belum kebaca, pilih organisasi yang benar lalu simpan.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Organisasi Governance</Label>
                          <select
                            value={selectedOrganizationId}
                            onChange={(e) => setSelectedOrganizationId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">-- Pilih organisasi governance --</option>
                            {(orgs ?? []).map((organization: any) => (
                              <option key={organization.organization_id} value={organization.organization_id}>
                                {organization.organization_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveOrganizationBinding}
                            disabled={!selectedOrganizationId}
                          >
                            <Link2 className="mr-1.5 h-4 w-4" />
                            Simpan Organisasi
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResetOrganizationBinding}
                            disabled={!storedOrganizationBinding && !matchedOrg?.data.organization_id}
                          >
                            Reset ke Otomatis
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const next = new URLSearchParams(searchParams);
                              next.set("tab", "domains");
                              setSearchParams(next, { replace: true });
                            }}
                          >
                            Buka Setup Domain
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Connection Pool Control Plane</p>
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {primaryPool?.name || "Belum ada registry control plane"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {primaryPool ? `${primaryPool.type} • ${primaryPool.id}` : "Endpoint connector dan JWKS belum tercatat"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          poolReady
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {poolReady ? "Ready" : "Missing"}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>Connector endpoint: {poolMeta?.endpoint || "belum ada"}</p>
                      <p>Well-known JWT URL: {poolMeta?.wellKnownJwtUrl || "belum ada"}</p>
                      <p>Total registry participant: {participantPools.length}</p>
                    </div>
                    {connectionPoolIssues.length ? (
                      <p className="mt-3 text-xs text-amber-700">
                        Transfer belum aman dijalankan karena {connectionPoolIssues.join(" dan ")}.
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-emerald-700">
                        Endpoint connector dan identitas JWT sudah terbaca untuk participant ini.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/connection-pools")}
                      >
                        <Link2 className="mr-1.5 h-4 w-4" />
                        Buka Connection Pools
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => poolsQ.refetch()}
                        disabled={poolsQ.isFetching}
                      >
                        {poolsQ.isFetching ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                        Refresh Registry
                      </Button>
                    </div>
                  </div>
                </div>
                {provider.contact_person && (
                  <div className="md:col-span-2 border-t border-border pt-4 mt-2">
                    <h3 className="font-semibold text-sm mb-3">Contact Person</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Nama</p>
                        <p className="text-sm font-medium">{provider.contact_person.name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{provider.contact_person.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Telepon</p>
                        <p className="text-sm font-medium">{provider.contact_person.phone || "—"}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="md:col-span-2 border-t border-border pt-4 mt-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Binding Status</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Registration Source</p>
                          <p className="text-sm font-medium mt-1">
                            {relatedRegistration?.data.organization_name || "Belum terdeteksi"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            registrationBindingState === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : registrationBindingState === "INFERRED"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {registrationBindingState === "VERIFIED"
                            ? "Verified"
                            : registrationBindingState === "INFERRED"
                              ? "Inferred"
                              : "Missing"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {relatedRegistration?.data.id
                          ? `Registration ID: ${relatedRegistration.data.id}`
                          : "Participant belum ketemu sumber registration yang eksplisit."}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {relatedRegistration?.source === "participant"
                          ? "Terverifikasi dari participant_id pada data registration."
                          : relatedRegistration?.source === "operator_email"
                            ? "Diinferensikan dari email operator."
                            : relatedRegistration?.source === "organization_name"
                              ? "Diinferensikan dari kecocokan nama organisasi."
                              : "Belum ada jejak registration yang bisa dipastikan."}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Domain Binding</p>
                          <p className="text-sm font-medium mt-1">
                            {participantDomainCount} participant • {organizationDomainCount} governance
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            domainBindingState === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : domainBindingState === "INFERRED"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                          }
                        >
                          {domainBindingState === "VERIFIED"
                            ? "Synced"
                            : domainBindingState === "INFERRED"
                              ? "Partial"
                              : "Empty"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {domainBindingNote}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Domain yang belum tertempel: {missingOrganizationDomains.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Operator User</p>
                          <p className="text-sm font-medium mt-1 truncate">
                            {operatorUser?.full_name || provider.contact_person?.name || relatedRegistration?.data.operator_name || "Belum ada user"}
                          </p>
                        </div>
                        {operatorStatus === "AKTIF" ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Active
                          </Badge>
                        ) : operatorStatus === "BELUM_AKTIF" ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                            Missing
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground truncate">
                        {operatorEmail || "Email operator belum ada"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-4 md:col-span-2 xl:col-span-2">
                      <p className="text-xs text-muted-foreground">Aksi Rekomendasi</p>
                      <div className="mt-2 flex items-start gap-2 text-sm">
                        {organizationBindingState === "VERIFIED" && registrationBindingState === "VERIFIED" && operatorStatus === "AKTIF" ? (
                          <>
                            <UserCheck className="w-4 h-4 mt-0.5 text-emerald-600" />
                            <span>Binding sudah terbaca rapi di FE untuk participant ini.</span>
                          </>
                        ) : organizationBindingState === "MISSING" ? (
                          <>
                            <TriangleAlert className="w-4 h-4 mt-0.5 text-amber-600" />
                            <span>Hubungkan participant ini ke governance organization supaya context domain tidak jatuh ke inferensi nama.</span>
                          </>
                        ) : registrationBindingState === "INFERRED" || organizationBindingState === "INFERRED" ? (
                          <>
                            <TriangleAlert className="w-4 h-4 mt-0.5 text-amber-600" />
                            <span>Masih ada binding yang dibaca dari email atau nama. Aman untuk dibaca, tapi belum cukup kuat untuk dianggap relasi final.</span>
                          </>
                        ) : (
                          <>
                            <UserRoundX className="w-4 h-4 mt-0.5 text-amber-600" />
                            <span>Operator user belum aktif penuh. Kirim ulang undangan bila perlu.</span>
                          </>
                        )}
                      </div>
                      {operatorStatus !== "AKTIF" && operatorEmail && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={handleResendInvitation}
                          disabled={usersQ.isFetching || isResendingInvitation}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Kirim Ulang Undangan
                        </Button>
                      )}
                    </div>
                    <div className="rounded-lg border border-border bg-background p-4 md:col-span-2 xl:col-span-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Urutan Perapihan Participant</p>
                          <p className="mt-1 text-sm text-muted-foreground">Ikuti dari atas ke bawah supaya binding, domain, kontrak, dan adapter participant ini rapi.</p>
                        </div>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                          {readinessChecklist.filter((item) => item.done).length}/{readinessChecklist.length} selesai
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {readinessChecklist.map((item, index) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              const next = new URLSearchParams(searchParams);
                              if (item.targetTab === "info") {
                                next.delete("tab");
                              } else {
                                next.set("tab", item.targetTab);
                              }
                              setSearchParams(next, { replace: true });
                            }}
                            className="rounded-xl border border-border bg-muted/20 p-4 text-left transition hover:border-primary/30 hover:bg-muted/40"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Langkah {index + 1}</p>
                                <p className="text-sm font-semibold">{item.title}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={item.done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}
                              >
                                {item.done ? "Siap" : "Tindak lanjut"}
                              </Badge>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.note}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: DOMAINS */}
          <TabsContent value="domains" className="mt-0 outline-none space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Sumber Domain Governance</p>
                  <p className="text-xs text-muted-foreground">
                    Pilih organisasi sumber jika hasil deteksi nama participant belum cocok, lalu sinkronkan domainnya ke participant ini.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetOrganizationBinding}
                    disabled={!storedOrganizationBinding && !matchedOrg?.data.organization_id}
                  >
                    Reset ke Otomatis
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveOrganizationBinding}
                    disabled={!selectedOrganizationId}
                  >
                    <Link2 className="mr-1.5 h-4 w-4" />
                    Simpan Pilihan Organisasi
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <Label>Organisasi Sumber</Label>
                  <select
                    value={selectedOrganizationId}
                    onChange={(e) => setSelectedOrganizationId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">-- Pilih organisasi governance --</option>
                    {(orgs ?? []).map((organization: any) => (
                      <option key={organization.organization_id} value={organization.organization_id}>
                        {organization.organization_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Organisasi aktif: {effectiveOrganization?.organization_name || matchedOrg?.data.organization_name || "belum dipilih"}.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3 text-sm">
                  <p className="font-medium">Ringkasan</p>
                  <p className="mt-2 text-muted-foreground">
                    Domain organisasi: {loadingOrgDomains ? "memuat..." : organizationDomainCount}
                  </p>
                  <p className="text-muted-foreground">
                    Sudah terpasang ke participant: {participantDomainCount}
                  </p>
                  <p className="text-muted-foreground">
                    Siap dipasang: {missingOrganizationDomains.length}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {domainBindingNote}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDomainOpen(true)}
                  disabled={loadingOrgDomains || !(orgDomains?.length)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Tambah Satu Domain
                </Button>
                <Button
                  type="button"
                  onClick={handleSyncOrganizationDomains}
                  disabled={isSyncingDomains || missingOrganizationDomains.length === 0}
                >
                  {isSyncingDomains ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Link2 className="mr-1.5 h-4 w-4" />}
                  Sinkronkan Semua Domain yang Belum Terpasang
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleIssueObligations}
                  disabled={isIssuingObligations || loadingDomains || !participantDomains?.length}
                >
                  {isIssuingObligations ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1.5 h-4 w-4" />
                  )}
                  Terbitkan Permintaan Kontrak Otomatis
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Setelah Juknis diterapkan, domain governance tersimpan di organization yang dipilih di setup.
                Tombol ini membaca domain yang sudah ditempel ke participant lalu menerbitkan permintaan kontrak consumer secara otomatis.
              </p>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Domain Operasional</h3>
                <p className="text-xs text-muted-foreground">
                  Daftar domain governance tempat partisipan ini diizinkan bertukar data.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchDomains()}>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAddDomainOpen(true)}
                  disabled={loadingOrgDomains || !(orgDomains?.length)}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Tambah Domain
                </Button>
              </div>
            </div>

            <div className="panel overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Nama Domain</TableHead>
                    <TableHead>ID Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDomains ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : !participantDomains || participantDomains.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        Belum ada domain terdaftar untuk participant ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    participantDomains.map((pd: any) => (
                      <TableRow key={pd.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {getDomainName(pd.domain_id)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {pd.domain_id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {pd.status || "ACTIVE"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteDomain(pd.id)}
                            disabled={deleteDomainMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 3: ADAPTERS */}
          <TabsContent value="adapters" className="mt-0 outline-none space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Dataplane Adapters</h3>
                <p className="text-xs text-muted-foreground">
                  Konfigurasi endpoint Adapter (GIS_STUDIO) untuk pengiriman data per domain.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchAdapters()}>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenAdapterDialog()}
                  disabled={!participantDomains || participantDomains.length === 0}
                  title={
                    (!participantDomains || participantDomains.length === 0)
                      ? "Tambahkan domain terlebih dahulu"
                      : ""
                  }
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Daftarkan Adapter
                </Button>
              </div>
            </div>

            <div className="panel overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Domain</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>URL Endpoint</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAdapters ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : !participantAdapters || participantAdapters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        Belum ada adapter terdaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    participantAdapters.map((ad: any) => (
                      <TableRow key={ad.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {getDomainName(ad.domain_id)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {ad.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {ad.endpoint?.url || JSON.stringify(ad.endpoint)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenAdapterDialog(ad)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteAdapter(ad.id)}
                              disabled={deleteAdapterMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* INFO EDIT DIALOG */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Participant</DialogTitle>
              <DialogDescription>Perbarui informasi participant.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Organisasi</Label>
                <Input
                  value={formData.organization_name}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* INFO DELETE DIALOG */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Hapus Participant</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus participant ini? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ADD DOMAIN DIALOG */}
        <Dialog open={isAddDomainOpen} onOpenChange={setIsAddDomainOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Domain Partisipan</DialogTitle>
              <DialogDescription>
                Hubungkan participant dengan salah satu domain governance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pilih Domain</Label>
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Pilih Domain Governance --</option>
                  {(orgDomains && orgDomains.length > 0 ? orgDomains : availableDomains).map((d: any) => {
                    const isAdded = participantDomains?.some((pd: any) => pd.domain_id === d.domain_id);
                    if (isAdded) return null;
                    return (
                      <option key={d.domain_id} value={d.domain_id}>
                        {d.domain_name}{d.code ? ` (${d.code})` : ""}
                      </option>
                    );
                  })}
                </select>
                {(!orgDomains || orgDomains.length === 0) && availableDomains.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Organisasi participant belum terhubung — menampilkan domain dari domain aktif. Pilih organisasi sumber di bagian atas untuk filter domain yang tepat.
                  </p>
                )}
                {(!orgDomains || orgDomains.length === 0) && availableDomains.length === 0 && (
                  <p className="text-xs text-rose-500 mt-1">
                    Tidak ada domain governance tersedia. Daftarkan domain dulu di menu Organizations.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDomainOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={handleAddDomain}
                disabled={addDomainMutation.isPending || !selectedDomainId}
              >
                {addDomainMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Tambah
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ADD/EDIT/REGISTRATION ADAPTER DIALOG */}
        <Dialog open={isAdapterDialogOpen} onOpenChange={setIsAdapterDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAdapter ? "Edit Adapter" : "Registrasi Adapter Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingAdapter
                  ? "Perbarui detail endpoint adapter dataplane."
                  : "Daftarkan adapter dataplane baru untuk domain partisipan."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Domain Partisipan</Label>
                <select
                  value={adapterFormData.domain_id}
                  onChange={(e) => setAdapterFormData({ ...adapterFormData, domain_id: e.target.value })}
                  disabled={!!editingAdapter}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Pilih Domain --</option>
                  {participantDomains?.map((pd: any) => (
                    <option key={pd.domain_id} value={pd.domain_id}>
                      {getDomainName(pd.domain_id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tipe Adapter</Label>
                <Input value={adapterFormData.type} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Jenis adapter dikunci pada <code>GIS_STUDIO</code> sesuai spesifikasi GX-Space.
                </p>
              </div>
              <div className="space-y-2">
                <Label>URL Endpoint</Label>
                <Input
                  placeholder="https://gis-adapter.company.com/api"
                  value={adapterFormData.url}
                  onChange={(e) => setAdapterFormData({ ...adapterFormData, url: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdapterDialogOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={handleSaveAdapter}
                disabled={addAdapterMutation.isPending || updateAdapterMutation.isPending}
              >
                {(addAdapterMutation.isPending || updateAdapterMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ParticipantDetail;
