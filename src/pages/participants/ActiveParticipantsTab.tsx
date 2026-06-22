import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Building2,
  Eye,
  Factory,
  HardDriveDownload,
  Inbox,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ServerCog,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Pager } from "@/components/common/Pager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useCreateProvider,
  useDeleteProvider,
  useParticipantAdapters,
  useParticipantDomains,
  useProviders,
  useUpdateProvider,
} from "@/api/hooks/useProviders";
import { useOrganizations, useOrganizationDomains } from "@/api/hooks/useOrganizations";
import { providersApi } from "@/api/services/providers";
import { getApiErrorMessage } from "@/lib/api-error";
import type { Provider } from "@/api/types/providers";
import type { OrganizationDomain } from "@/api/types/governance";

type ParticipantForm = {
  organization_name: string;
  organization_type: string;
  address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
};

const emptyForm: ParticipantForm = {
  organization_name: "",
  organization_type: "ENTERPRISE",
  address: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-zinc-100 text-zinc-600 border-zinc-200",
  SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING: "bg-blue-50 text-blue-700 border-blue-200",
};

const TYPE_STYLE: Record<string, string> = {
  ENTERPRISE: "bg-amber-50 text-amber-700 border-amber-200",
  GOV_CENTRAL: "bg-indigo-50 text-indigo-700 border-indigo-200",
  GOV_PROV: "bg-sky-50 text-sky-700 border-sky-200",
  GOV_LOCAL: "bg-teal-50 text-teal-700 border-teal-200",
};

const TYPE_LABELS: Record<string, string> = {
  ENTERPRISE: "KKKS / Provider",
  GOV_CENTRAL: "Government Central",
  GOV_PROV: "Government Province",
  GOV_LOCAL: "Government Local",
};

const roleOf = (type?: string): { label: string; kkks: boolean } =>
  type === "ENTERPRISE"
    ? { label: "KKKS (Provider)", kkks: true }
    : { label: "SKK Migas / Regulator", kkks: false };

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const toForm = (provider: Provider): ParticipantForm => ({
  organization_name: provider.provider_name ?? "",
  organization_type: provider.organization_type ?? "ENTERPRISE",
  address: provider.address ?? "",
  contact_name: provider.contact_person?.name ?? "",
  contact_email: provider.contact_person?.email ?? "",
  contact_phone: provider.contact_person?.phone ?? "",
});

const ActiveParticipantsTab = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDataplaneDialogOpen, setIsDataplaneDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<ParticipantForm>(emptyForm);

  const [bindOrgId, setBindOrgId] = useState("");
  const [bindDomainIds, setBindDomainIds] = useState<string[]>([]);

  const { data, isLoading, isError, error, refetch } = useProviders();
  const { data: orgsData } = useOrganizations();
  const { data: orgDomainsData, isLoading: orgDomainsLoading } = useOrganizationDomains(bindOrgId || null);
  const orgs = (orgsData ?? []) as Array<{ organization_id: string; organization_name: string }>;
  const orgDomains = (orgDomainsData ?? []) as OrganizationDomain[];

  const createProviderMutation = useCreateProvider();
  const updateProviderMutation = useUpdateProvider();
  const deleteProviderMutation = useDeleteProvider();
  const participants = (data ?? []) as Provider[];
  const selectedParticipantId = selectedParticipant?.provider_id ?? "";
  const dataplaneDomainsQ = useParticipantDomains(selectedParticipantId);
  const dataplaneAdaptersQ = useParticipantAdapters(selectedParticipantId);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return participants.filter(
      (p) =>
        p.provider_name?.toLowerCase().includes(q) ||
        p.organization_type?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q),
    );
  }, [participants, searchQuery]);

  const PAGE_SIZE = 12;
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  useEffect(() => setPage(1), [searchQuery]);

  const kkksCount = participants.filter((p) => p.organization_type === "ENTERPRISE").length;
  const authorityCount = participants.filter((p) => (p.organization_type || "").startsWith("GOV")).length;

  const validateForm = () => {
    if (!formData.organization_name.trim()) return "Nama organisasi wajib diisi";
    if (formData.organization_name.trim().length < 3) return "Nama organisasi minimal 3 karakter";
    if (!formData.address.trim()) return "Alamat wajib diisi";
    if (formData.address.trim().length < 3) return "Alamat minimal 3 karakter";
    if (!formData.contact_name.trim()) return "Nama contact person wajib diisi";
    if (!formData.contact_email.trim()) return "Email contact person wajib diisi";
    if (!isValidEmail(formData.contact_email.trim())) return "Format email contact person tidak valid";
    if (!formData.contact_phone.trim()) return "Nomor telepon contact person wajib diisi";
    return null;
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setBindOrgId("");
    setBindDomainIds([]);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (participant: Provider) => {
    setSelectedParticipant(participant);
    setFormData(toForm(participant));
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (participant: Provider) => {
    setSelectedParticipant(participant);
    setIsDeleteDialogOpen(true);
  };

  const openDataplaneDialog = (participant: Provider) => {
    setSelectedParticipant(participant);
    setIsDataplaneDialogOpen(true);
  };

  const handleCreateParticipant = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const created = await createProviderMutation.mutateAsync({
        organization_name: formData.organization_name.trim(),
        organization_type: formData.organization_type,
        address: formData.address.trim(),
        contact_person: {
          name: formData.contact_name.trim(),
          email: formData.contact_email.trim(),
          phone: formData.contact_phone.trim(),
        },
      });

      // Bind selected governance domains to the new participant.
      if (bindDomainIds.length > 0 && created?.id) {
        const results = await Promise.allSettled(
          bindDomainIds.map((domainId) =>
            providersApi.addDomain(created.id, { domain_id: domainId }),
          ),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          toast.warning(`Participant dibuat, tapi ${failed} domain gagal di-binding. Coba bind manual via detail participant.`);
        } else {
          toast.success(`Participant berhasil dibuat dan ${bindDomainIds.length} domain ter-binding.`);
        }
      } else {
        toast.success("Participant berhasil dibuat");
      }

      setIsCreateDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal membuat participant"));
    }
  };

  const handleUpdateParticipant = async () => {
    if (!selectedParticipant) return;

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await updateProviderMutation.mutateAsync({
        id: selectedParticipant.provider_id,
        data: {
          organization_name: formData.organization_name.trim(),
          organization_type: formData.organization_type,
          address: formData.address.trim(),
          contact_person: {
            name: formData.contact_name.trim(),
            email: formData.contact_email.trim(),
            phone: formData.contact_phone.trim(),
          },
        },
      });
      setIsEditDialogOpen(false);
      setSelectedParticipant(null);
      resetForm();
      toast.success("Participant berhasil diperbarui");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal memperbarui participant"));
    }
  };

  const handleDeleteParticipant = async () => {
    if (!selectedParticipant) return;

    try {
      await deleteProviderMutation.mutateAsync(selectedParticipant.provider_id);
      setIsDeleteDialogOpen(false);
      setSelectedParticipant(null);
      toast.success("Participant berhasil dihapus");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus participant"));
    }
  };

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <p className="mt-2 text-lg font-medium">Gagal memuat participants</p>
          <p className="text-sm text-muted-foreground mb-4">{getApiErrorMessage(error, "Error")}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Coba lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total Participant</p>
          <p className="text-3xl font-bold mt-1">{isLoading ? "—" : participants.length}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">KKKS</p>
              <p className="text-3xl font-bold mt-1">{isLoading ? "—" : kkksCount}</p>
            </div>
            <Factory className="w-5 h-5 text-amber-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Otoritas/Gov</p>
              <p className="text-3xl font-bold mt-1">{isLoading ? "—" : authorityCount}</p>
            </div>
            <Building2 className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Tampil</p>
          <p className="text-3xl font-bold mt-1">{isLoading ? "—" : filtered.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
          <span>
            CRUD participant sekarang langsung dari list. Tombol <strong>Dataplane</strong> juga sudah buka
            panel live untuk cek readiness domain dan adapter participant itu, bukan sekadar pindah halaman.
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari participant..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Participant
          </Button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead>Organisasi</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dataplane</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{searchQuery ? "Tidak ada participant cocok" : "Belum ada participant"}</p>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((participant) => {
                const role = roleOf(participant.organization_type);
                return (
                  <TableRow key={participant.provider_id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", role.kkks ? "bg-amber-100" : "bg-indigo-100")}>
                          {role.kkks ? (
                            <Factory className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Building2 className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{participant.provider_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {participant.contact_person?.email || "Belum ada email operator"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {participant.organization_type && (
                        <Badge variant="outline" className={cn(TYPE_STYLE[participant.organization_type] ?? "")}>
                          {participant.organization_type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{role.label}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {participant.address ?? "—"}
                    </TableCell>
                    <TableCell>
                      {participant.status && (
                        <Badge
                          variant="outline"
                          className={cn(
                            STATUS_STYLES[participant.status.toUpperCase()] ??
                              "bg-slate-50 text-slate-700 border-slate-200",
                          )}
                        >
                          {participant.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDataplaneDialog(participant)}
                      >
                        <HardDriveDownload className="w-4 h-4 mr-2" />
                        Dataplane
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/participants/${participant.provider_id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/participants/${participant.provider_id}?tab=domains`)}>
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Kelola Domain
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/participants/${participant.provider_id}?tab=adapters`)}>
                            <ServerCog className="w-4 h-4 mr-2" />
                            Kelola Jalur Data
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDataplaneDialog(participant)}>
                            <HardDriveDownload className="w-4 h-4 mr-2" />
                            Dataplane
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(participant)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDeleteDialog(participant)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {!isLoading && <Pager page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Participant</DialogTitle>
            <DialogDescription>
              Participant aktif bisa dibuat langsung dari sini tanpa lewat queue registration.
            </DialogDescription>
          </DialogHeader>
          <ParticipantFormContent formData={formData} setFormData={setFormData} />

          {/* Domain binding section */}
          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Hubungkan ke Domain Governance</p>
              <p className="text-xs text-muted-foreground mt-0.5">Opsional — binding domain bisa dilakukan setelah participant dibuat via halaman detail.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bind-org">Pilih Organisasi</Label>
              <select
                id="bind-org"
                value={bindOrgId}
                onChange={(e) => {
                  setBindOrgId(e.target.value);
                  setBindDomainIds([]);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- Tidak dipilih --</option>
                {orgs.map((org) => (
                  <option key={org.organization_id} value={org.organization_id}>
                    {org.organization_name}
                  </option>
                ))}
              </select>
            </div>
            {bindOrgId && (
              <div className="space-y-2">
                <Label>Domain yang akan di-binding</Label>
                {orgDomainsLoading ? (
                  <p className="text-xs text-muted-foreground">Memuat domain...</p>
                ) : orgDomains.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Organisasi ini belum punya domain governance.</p>
                ) : (
                  <div className="space-y-1.5 rounded-lg border border-border p-3">
                    {orgDomains.map((domain) => (
                      <label
                        key={domain.domain_id}
                        className="flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          checked={bindDomainIds.includes(domain.domain_id)}
                          onChange={(e) =>
                            setBindDomainIds((prev) =>
                              e.target.checked
                                ? [...prev, domain.domain_id]
                                : prev.filter((id) => id !== domain.domain_id),
                            )
                          }
                        />
                        <span className="text-sm font-medium">{domain.domain_name}</span>
                        {domain.code && (
                          <span className="text-xs text-muted-foreground font-mono">({domain.code})</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateParticipant} disabled={createProviderMutation.isPending}>
              {createProviderMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {bindDomainIds.length > 0 ? `Simpan & Binding ${bindDomainIds.length} Domain` : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Participant</DialogTitle>
            <DialogDescription>
              Perbarui data operasional participant langsung dari daftar aktif.
            </DialogDescription>
          </DialogHeader>
          <ParticipantFormContent formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateParticipant} disabled={updateProviderMutation.isPending}>
              {updateProviderMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Participant</DialogTitle>
            <DialogDescription>
              Participant yang dihapus akan keluar dari daftar operasional dan tidak bisa lanjut ke flow dataplane.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="font-medium">{selectedParticipant?.provider_name ?? "-"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {TYPE_LABELS[selectedParticipant?.organization_type ?? ""] ?? selectedParticipant?.organization_type ?? "-"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteParticipant} disabled={deleteProviderMutation.isPending}>
              {deleteProviderMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDataplaneDialogOpen} onOpenChange={setIsDataplaneDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Kesiapan Participant</DialogTitle>
            <DialogDescription>
              Ringkasan domain kerja dan jalur data yang dipakai participant ini saat proses transfer dijalankan.
            </DialogDescription>
          </DialogHeader>
          {selectedParticipant && (
            <div className="space-y-5 py-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold">{selectedParticipant.provider_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedParticipant.organization_type ?? "-"} • {selectedParticipant.address ?? "Alamat belum ada"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      (dataplaneDomainsQ.data?.length ?? 0) > 0 && (dataplaneAdaptersQ.data?.length ?? 0) > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }
                  >
                    {(dataplaneDomainsQ.data?.length ?? 0) > 0 && (dataplaneAdaptersQ.data?.length ?? 0) > 0
                      ? "Siap dipakai"
                      : "Perlu dilengkapi"}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Domain Terpasang</p>
                  <p className="mt-2 text-3xl font-bold">
                    {dataplaneDomainsQ.isLoading ? "…" : dataplaneDomainsQ.data?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Jalur Data</p>
                  <p className="mt-2 text-3xl font-bold">
                    {dataplaneAdaptersQ.isLoading ? "…" : dataplaneAdaptersQ.data?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Status Pengiriman</p>
                  <div className="mt-3 flex items-start gap-2 text-sm">
                    {(dataplaneDomainsQ.data?.length ?? 0) > 0 && (dataplaneAdaptersQ.data?.length ?? 0) > 0 ? (
                      <>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                        <span>Domain kerja dan jalur data dasar sudah tercatat.</span>
                      </>
                    ) : (
                      <>
                        <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                        <span>Masih ada bagian dasar yang belum tercatat, jadi transfer belum sebaiknya dijalankan.</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Domain Kerja</p>
                  </div>
                  {dataplaneDomainsQ.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : !dataplaneDomainsQ.data || dataplaneDomainsQ.data.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Belum ada domain kerja yang tercatat langsung di data participant ini.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Kalau di dashboard cakupan datanya sudah terlihat, berarti data operasionalnya ada, tapi binding domain participant di modul onboarding belum ikut tersimpan.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dataplaneDomainsQ.data.map((domain: any) => (
                        <div key={domain.id} className="rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-sm font-medium">
                            {domain.domain_name ?? domain.domain?.label ?? domain.domain?.name ?? domain.domain_id}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {domain.code ?? domain.domain?.code ?? domain.domain_id}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ServerCog className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Jalur Data</p>
                  </div>
                  {dataplaneAdaptersQ.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : !dataplaneAdaptersQ.data || dataplaneAdaptersQ.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada jalur data yang tercatat untuk participant ini.</p>
                  ) : (
                    <div className="space-y-2">
                      {dataplaneAdaptersQ.data.map((adapter: any) => (
                        <div key={adapter.id} className="rounded-lg border border-border bg-muted/30 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{adapter.type ?? "ADAPTER"}</p>
                            <Badge variant="outline">{adapter.domain_id}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground break-all">
                            {adapter.endpoint?.url || JSON.stringify(adapter.endpoint)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                dataplaneDomainsQ.refetch();
                dataplaneAdaptersQ.refetch();
              }}
              disabled={dataplaneDomainsQ.isFetching || dataplaneAdaptersQ.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  dataplaneDomainsQ.isFetching || dataplaneAdaptersQ.isFetching ? "animate-spin" : ""
                }`}
              />
              Refresh Dataplane
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedParticipant) {
                  navigate(`/participants/${selectedParticipant.provider_id}?tab=domains`);
                }
              }}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Buka Domain
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedParticipant) {
                  navigate(`/participants/${selectedParticipant.provider_id}?tab=adapters`);
                }
              }}
            >
              <ServerCog className="mr-2 h-4 w-4" />
              Buka Jalur Data
            </Button>
            <Button
              onClick={() => {
                if (selectedParticipant) {
                  navigate(`/participants/${selectedParticipant.provider_id}?tab=adapters`);
                }
              }}
            >
              <HardDriveDownload className="mr-2 h-4 w-4" />
              Buka Detail Participant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ParticipantFormContent = ({
  formData,
  setFormData,
}: {
  formData: ParticipantForm;
  setFormData: Dispatch<SetStateAction<ParticipantForm>>;
}) => (
  <div className="space-y-4 py-2">
    <div className="space-y-2">
      <Label htmlFor="participant-name">Nama Organisasi</Label>
      <Input
        id="participant-name"
        value={formData.organization_name}
        onChange={(e) => setFormData((prev) => ({ ...prev, organization_name: e.target.value }))}
        placeholder="Contoh: Pertamina Hulu Energi"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="participant-type">Tipe Participant</Label>
      <select
        id="participant-type"
        value={formData.organization_type}
        onChange={(e) => setFormData((prev) => ({ ...prev, organization_type: e.target.value }))}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="ENTERPRISE">ENTERPRISE</option>
        <option value="GOV_CENTRAL">GOV_CENTRAL</option>
        <option value="GOV_PROV">GOV_PROV</option>
        <option value="GOV_LOCAL">GOV_LOCAL</option>
      </select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="participant-address">Alamat</Label>
      <Textarea
        id="participant-address"
        value={formData.address}
        onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
        placeholder="Alamat atau lokasi operasional participant"
      />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="contact-name">Contact Person</Label>
        <Input
          id="contact-name"
          value={formData.contact_name}
          onChange={(e) => setFormData((prev) => ({ ...prev, contact_name: e.target.value }))}
          placeholder="Nama PIC"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-phone">Nomor Telepon</Label>
        <Input
          id="contact-phone"
          value={formData.contact_phone}
          onChange={(e) => setFormData((prev) => ({ ...prev, contact_phone: e.target.value }))}
          placeholder="+62812..."
        />
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="contact-email">Email Operator</Label>
      <Input
        id="contact-email"
        value={formData.contact_email}
        onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value }))}
        placeholder="operator@company.co.id"
      />
    </div>
  </div>
);

export default ActiveParticipantsTab;
