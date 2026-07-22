import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Pager } from "@/components/common/Pager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Building2,
  Eye,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useCreateOrganization,
  useCreateOrganizationDomain,
  useDeleteOrganization,
  useDeleteOrganizationDomain,
  useOrganizationDomains,
  useOrganizations,
  useUpdateOrganization,
  useUpdateOrganizationDomain,
} from "@/api/hooks/useOrganizations";
import type { Organization, OrganizationDomain } from "@/api/types/governance";
import { useAuth } from "@/context/AuthContext";
import { canManageOrganizations } from "@/lib/feature-access";
import { isValidGovernanceCode, sanitizeGovernanceCode } from "@/lib/governance-code";
import { setPublicOrganizationsCache } from "@/lib/public-organization-cache";

const ROLE_BY_CODE: Record<string, string> = {
  REGULATOR: "SKK Migas (Regulator)",
  SKKMIGAS: "SKK Migas (Regulator)",
  PLATFORM: "Platform",
  KKKS: "KKKS (Provider)",
  PROVIDER: "KKKS (Provider)",
};

const emptyOrganizationForm = {
  organization_name: "",
  code: "",
  description: "",
};

const autoCode = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) return words.map((w) => w[0]).join("").toUpperCase().slice(0, 20);
  return sanitizeGovernanceCode(words.join(""));
};

const emptyDomainForm = {
  name: "",
  code: "",
  description: "",
};

const getAvatar = (name: string) =>
  name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const validateOrganizationForm = (formData: typeof emptyOrganizationForm) => {
  if (!formData.organization_name.trim()) {
    return "Nama organisasi wajib diisi";
  }
  if (formData.organization_name.trim().length < 3) {
    return "Nama organisasi minimal 3 karakter";
  }
  if (!formData.code.trim()) {
    return "Code organisasi wajib diisi";
  }
  if (formData.code.trim().length < 2 || formData.code.trim().length > 20) {
    return "Code organisasi harus 2-20 karakter";
  }
  if (!formData.description.trim()) {
    return "Deskripsi organisasi wajib diisi";
  }
  if (formData.description.trim().length < 10) {
    return "Deskripsi organisasi minimal 10 karakter";
  }
  return null;
};

const validateDomainForm = (formData: typeof emptyDomainForm) => {
  if (!formData.name.trim()) {
    return "Nama domain wajib diisi";
  }
  if (formData.name.trim().length < 3) {
    return "Nama domain minimal 3 karakter";
  }
  if (!formData.code.trim()) {
    return "Code domain wajib diisi";
  }
  if (formData.code.trim().length < 2 || formData.code.trim().length > 20) {
    return "Code domain harus 2-20 karakter";
  }
  if (!formData.description.trim()) {
    return "Deskripsi domain wajib diisi";
  }
  if (formData.description.trim().length < 10) {
    return "Deskripsi domain minimal 10 karakter";
  }
  return null;
};

const OrganizationDomainsManager = ({ organization }: { organization: Organization }) => {
  const [isDomainDialogOpen, setIsDomainDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<OrganizationDomain | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<OrganizationDomain | null>(null);
  const [domainForm, setDomainForm] = useState(emptyDomainForm);

  const { data: domains, isLoading, isError, refetch } = useOrganizationDomains(
    organization.organization_id,
  );
  const createDomainMutation = useCreateOrganizationDomain();
  const updateDomainMutation = useUpdateOrganizationDomain();
  const deleteDomainMutation = useDeleteOrganizationDomain();

  const openCreateDialog = () => {
    setEditingDomain(null);
    setDomainForm(emptyDomainForm);
    setIsDomainDialogOpen(true);
  };

  const openEditDialog = (domain: OrganizationDomain) => {
    setEditingDomain(domain);
    setDomainForm({
      name: domain.domain_name,
      code: domain.code ?? "",
      description: domain.description ?? "",
    });
    setIsDomainDialogOpen(true);
  };

  const handleSaveDomain = async () => {
    const validationError = validateDomainForm(domainForm);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = {
      name: domainForm.name.trim(),
      code: sanitizeGovernanceCode(domainForm.code),
      description: domainForm.description.trim(),
    };

    try {
      if (editingDomain) {
        await updateDomainMutation.mutateAsync({
          orgId: organization.organization_id,
          domainId: editingDomain.domain_id,
          data: payload,
        });
        toast.success("Consent berhasil diperbarui");
      } else {
        await createDomainMutation.mutateAsync({
          orgId: organization.organization_id,
          data: payload,
        });
        toast.success("Consent berhasil dibuat");
      }
      setIsDomainDialogOpen(false);
      setEditingDomain(null);
      setDomainForm(emptyDomainForm);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan consent"));
    }
  };

  const handleDeleteDomain = async () => {
    if (!selectedDomain) return;

    try {
      await deleteDomainMutation.mutateAsync({
        orgId: organization.organization_id,
        domainId: selectedDomain.domain_id,
      });
      setIsDeleteDialogOpen(false);
      setSelectedDomain(null);
      toast.success("Consent berhasil dihapus");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus consent"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Consents</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Consent milik organisasi ini yang nanti bisa dipakai participant.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Domain
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead>Nama Domain</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="w-[70px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <div className="skeleton h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-destructive">
                  Gagal memuat consent.
                </TableCell>
              </TableRow>
            ) : !domains || domains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada consent pada organisasi ini.
                </TableCell>
              </TableRow>
            ) : (
              domains.map((domain) => (
                <TableRow key={domain.domain_id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{domain.domain_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {domain.code ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{domain.status ?? "ACTIVE"}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                    {domain.description ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(domain)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setSelectedDomain(domain);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDomainDialogOpen} onOpenChange={setIsDomainDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDomain ? "Edit Consent" : "Tambah Consent"}</DialogTitle>
            <DialogDescription>
              {editingDomain
                ? "Perbarui consent untuk organisasi ini."
                : "Daftarkan consent baru di bawah organisasi ini."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="domain-name">Nama Domain</Label>
              <Input
                id="domain-name"
                value={domainForm.name}
                onChange={(e) => setDomainForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Wilayah Kerja"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain-code">Code</Label>
              <Input
                id="domain-code"
                value={domainForm.code}
                onChange={(e) => setDomainForm((prev) => ({ ...prev, code: sanitizeGovernanceCode(e.target.value) }))}
                placeholder="Contoh: WK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain-description">Deskripsi</Label>
              <Textarea
                id="domain-description"
                value={domainForm.description}
                onChange={(e) =>
                  setDomainForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Deskripsikan cakupan consent ini"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDomainDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSaveDomain}
              disabled={createDomainMutation.isPending || updateDomainMutation.isPending}
            >
              {(createDomainMutation.isPending || updateDomainMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hapus Consent</DialogTitle>
            <DialogDescription>
              Consent yang dihapus tidak lagi bisa di-assign ke participant.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
            {selectedDomain?.domain_name ?? "-"}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDomain}
              disabled={deleteDomainMutation.isPending}
            >
              {deleteDomainMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Organizations = () => {
  const { role, roles, hasPermission } = useAuth();
  const canManage = canManageOrganizations({ role, roles, hasPermission });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyOrganizationForm);
  const [codeAutoFilled, setCodeAutoFilled] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const { data: organizations, isLoading, isError, error, refetch } = useOrganizations();
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();
  const deleteMutation = useDeleteOrganization();

  const filteredOrganizations = useMemo(() => {
    const rows = organizations ?? [];
    const query = searchQuery.toLowerCase().trim();

    if (!query) return rows;

    return rows.filter((org) =>
      [org.organization_name, org.organization_type, org.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [organizations, searchQuery]);
  const pagedOrganizations = useMemo(
    () => filteredOrganizations.slice((page - 1) * pageSize, page * pageSize),
    [filteredOrganizations, page, pageSize],
  );

  const regulatorCount = useMemo(
    () =>
      (organizations ?? []).filter((org) =>
        ["REGULATOR", "SKKMIGAS", "PLATFORM"].includes((org.organization_type ?? "").toUpperCase()),
      ).length,
    [organizations],
  );

  const providerCount = useMemo(
    () =>
      (organizations ?? []).filter((org) =>
        ["KKKS", "PROVIDER"].includes((org.organization_type ?? "").toUpperCase()),
      ).length,
    [organizations],
  );

  useEffect(() => {
    if (!organizations || organizations.length === 0) return;
    setPublicOrganizationsCache(
      organizations.map((org) => ({
        id: org.organization_id,
        name: org.organization_name,
      })),
    );
  }, [organizations]);
  useEffect(() => setPage(1), [searchQuery, pageSize]);

  const resetForm = () => {
    setFormData(emptyOrganizationForm);
    setCodeAutoFilled(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setSelectedOrganization(null);
    setIsCreateDialogOpen(true);
  };

  const openViewDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    setFormData({
      organization_name: organization.organization_name,
      code: organization.organization_type ?? "",
      description: organization.description ?? "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (organization: Organization) => {
    setSelectedOrganization(organization);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateOrganization = async () => {
    const validationError = validateOrganizationForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await createMutation.mutateAsync({
        organization_name: formData.organization_name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
      });
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success("Organisasi berhasil dibuat");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal membuat organisasi"));
    }
  };

  const handleUpdateOrganization = async () => {
    if (!selectedOrganization) return;

    const validationError = validateOrganizationForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedOrganization.organization_id,
        data: {
          name: formData.organization_name.trim(),
          description: formData.description.trim(),
        },
      });
      setIsEditDialogOpen(false);
      resetForm();
      toast.success("Organisasi berhasil diperbarui");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal memperbarui organisasi"));
    }
  };

  const handleDeleteOrganization = async () => {
    if (!selectedOrganization) return;

    try {
      await deleteMutation.mutateAsync(selectedOrganization.organization_id);
      setIsDeleteDialogOpen(false);
      setSelectedOrganization(null);
      toast.success("Organisasi berhasil dihapus");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus organisasi"));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Organizations" subtitle="Organisasi governance & domain operasional" />
        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="stat-card">
                <div className="skeleton h-16 w-full" />
              </div>
            ))}
          </div>
          <div className="panel space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Organizations" subtitle="Organisasi governance & domain operasional" />
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat organisasi</p>
            <p className="mb-4 text-sm text-muted-foreground">
              {getApiErrorMessage(error, "Terjadi kesalahan saat mengambil data organisasi")}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Coba lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Organizations"
        subtitle="Kelola master organisasi governance beserta consent yang bisa dipakai participant"
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Total Organisasi</p>
            <p className="mt-1 text-3xl font-bold">{organizations?.length ?? 0}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Regulator / Platform</p>
            <p className="mt-1 text-3xl font-bold">{regulatorCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Provider / KKKS</p>
            <p className="mt-1 text-3xl font-bold">{providerCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Tampil Sekarang</p>
            <p className="mt-1 text-3xl font-bold">{filteredOrganizations.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              Organization di sini adalah master governance. Participant operasional tetap dikelola di menu
              <strong> Participants</strong>, lalu dihubungkan ke consent yang berasal dari organisasi ini.
            </span>
          </div>
          {!canManage && (
            <p className="mt-2">Akun ini sedang berada di mode read-only untuk master governance.</p>
          )}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Cari organisasi, code, atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreateDialog} disabled={!canManage}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Organisasi
            </Button>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Organisasi</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-[70px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Belum ada organisasi yang cocok dengan pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                pagedOrganizations.map((organization) => {
                  const code = organization.organization_type ?? "-";
                  const roleLabel = ROLE_BY_CODE[(organization.organization_type ?? "").toUpperCase()];

                  return (
                    <TableRow key={organization.organization_id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getAvatar(organization.organization_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{organization.organization_name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {organization.organization_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {roleLabel ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {organization.description ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(organization)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(organization)} disabled={!canManage}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => openDeleteDialog(organization)}
                              disabled={!canManage}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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
          <Pager
            page={page}
            total={filteredOrganizations.length}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        </div>
      </div>

      <Dialog open={isCreateDialogOpen && canManage} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Organisasi</DialogTitle>
            <DialogDescription>
              Buat master organisasi governance sebelum domain dan participant dihubungkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="organization-name">Nama Organisasi</Label>
              <Input
                id="organization-name"
                value={formData.organization_name}
                onChange={(e) => {
                  const name = e.target.value;
                  const shouldFill = !formData.code || codeAutoFilled;
                  setFormData((prev) => ({
                    ...prev,
                    organization_name: name,
                    ...(shouldFill ? { code: autoCode(name) } : {}),
                  }));
                  if (shouldFill) setCodeAutoFilled(true);
                }}
                placeholder="Contoh: SKK Migas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization-code">
                Code Unik
                {codeAutoFilled && formData.code && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">auto-generated — bisa diubah</span>
                )}
              </Label>
              <Input
                id="organization-code"
                value={formData.code}
                onChange={(e) => {
                  setCodeAutoFilled(false);
                  setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }));
                }}
                placeholder="Contoh: SKKMIGAS (unik, 2–20 karakter)"
              />
              <p className="text-xs text-muted-foreground">Code harus unik di seluruh data space — tidak bisa duplikat.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization-description">Deskripsi</Label>
              <Textarea
                id="organization-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Jelaskan fungsi organisasi ini di dalam data space (minimal 10 karakter)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateOrganization} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen && canManage} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organisasi</DialogTitle>
            <DialogDescription>
              Ubah data organisasi governance. Code tetap ditampilkan untuk referensi backend.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-organization-name">Nama Organisasi</Label>
              <Input
                id="edit-organization-name"
                value={formData.organization_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, organization_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-organization-code">Code</Label>
              <Input id="edit-organization-code" value={formData.code} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-organization-description">Deskripsi</Label>
              <Textarea
                id="edit-organization-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateOrganization} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hapus Organisasi</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Pastikan domain terkait sudah tidak dipakai participant.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">{selectedOrganization?.organization_name ?? "-"}</p>
                <p className="text-xs text-muted-foreground">{selectedOrganization?.organization_type ?? "-"}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrganization}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Organisasi</DialogTitle>
            <DialogDescription>
              Tinjau metadata organisasi governance dan kelola domain yang nantinya dipakai participant.
            </DialogDescription>
          </DialogHeader>

          {selectedOrganization && (
            <div className="space-y-6 py-2">
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4 md:flex-row md:items-start">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-xl text-primary-foreground">
                    {getAvatar(selectedOrganization.organization_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{selectedOrganization.organization_name}</h3>
                    {selectedOrganization.organization_type && (
                      <Badge variant="outline" className="font-mono">
                        {selectedOrganization.organization_type}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedOrganization.description ?? "Belum ada deskripsi organisasi."}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    ID: {selectedOrganization.organization_id}
                  </p>
                </div>
              </div>

              <OrganizationDomainsManager organization={selectedOrganization} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Organizations;
