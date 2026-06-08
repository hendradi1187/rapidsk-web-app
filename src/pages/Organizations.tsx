import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  MoreHorizontal,
  Building2,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
  Layers,
  Network,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useOrganizations,
  useCreateOrganization,
  useOrganizationDomains,
} from "@/api/hooks/useOrganizations";
import type { Organization } from "@/api/types/governance";

const ROLE_BY_CODE: Record<string, string> = {
  REGULATOR: "SKK Migas (Regulator)",
  SKKMIGAS: "SKK Migas (Regulator)",
  PLATFORM: "Platform",
  KKKS: "KKKS (Provider)",
  PROVIDER: "KKKS (Provider)",
};

const getAvatar = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Daftar governance domain milik satu organisasi (dipakai di dialog detail). */
const OrganizationDomains = ({ orgId }: { orgId: string }) => {
  const { data: domains, isLoading, isError } = useOrganizationDomains(orgId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="skeleton h-10" />
        <div className="skeleton h-10" />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">Gagal memuat governance domain.</p>
    );
  }
  if (!domains || domains.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Belum ada governance domain pada organisasi ini.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {domains.map((d) => (
        <div
          key={d.domain_id}
          className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{d.domain_name}</p>
              {d.code && (
                <p className="font-mono text-xs text-muted-foreground truncate">
                  {d.code}
                </p>
              )}
            </div>
          </div>
          {d.status && (
            <Badge variant="outline" className="text-xs shrink-0">
              {d.status}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
};

const Organizations = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);

  const [formData, setFormData] = useState({
    organization_name: "",
    organization_type: "",
  });

  const {
    data: organizations,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrganizations();

  const createMutation = useCreateOrganization();

  const filteredOrganizations = useMemo(() => {
    if (!organizations) return [];
    const q = searchQuery.toLowerCase();
    return organizations.filter(
      (org) =>
        org.organization_name.toLowerCase().includes(q) ||
        (org.organization_type ?? "").toLowerCase().includes(q) ||
        (org.description ?? "").toLowerCase().includes(q),
    );
  }, [organizations, searchQuery]);

  const resetForm = () =>
    setFormData({ organization_name: "", organization_type: "" });

  const handleAddOrganization = async () => {
    if (!formData.organization_name.trim()) {
      toast.error("Nama organisasi wajib diisi");
      return;
    }
    if (formData.organization_name.trim().length < 3) {
      toast.error("Nama organisasi minimal 3 karakter");
      return;
    }
    try {
      await createMutation.mutateAsync({
        organization_name: formData.organization_name.trim(),
        organization_type: formData.organization_type.trim() || undefined,
      });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Organisasi berhasil dibuat");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Gagal membuat organisasi");
    }
  };

  const openViewDialog = (org: Organization) => {
    setSelectedOrganization(org);
    setIsViewDialogOpen(true);
  };

  // ── Loading (skeleton, konsisten dgn halaman lain) ──
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Organizations" subtitle="Organisasi & governance domain" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="stat-card">
                <div className="skeleton h-14" />
              </div>
            ))}
          </div>
          <div className="panel p-4 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Organizations" subtitle="Organisasi & governance domain" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat organisasi</p>
            <p className="text-sm text-muted-foreground mb-4">
              {(error as any)?.message || "Terjadi kesalahan"}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalCount = organizations?.length ?? 0;
  const typeCount = new Set(
    organizations?.map((o) => o.organization_type).filter(Boolean),
  ).size;

  return (
    <div className="min-h-screen">
      <Header title="Organizations" subtitle="Organisasi & governance domain" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Building2 className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total Organisasi</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Network className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{typeCount}</p>
                <p className="text-sm text-muted-foreground">Tipe Organisasi</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Search className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {filteredOrganizations.length}
                </p>
                <p className="text-sm text-muted-foreground">Hasil Tampil</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari organisasi..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => {
                resetForm();
                setIsAddDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Organisasi
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Organisasi</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Tidak ada organisasi</p>
                    <p className="text-sm">
                      {searchQuery
                        ? "Coba ubah kata kunci pencarian"
                        : "Buat organisasi pertama Anda"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrganizations.map((org) => {
                  const code = (org.organization_type ?? "").toUpperCase();
                  const role = ROLE_BY_CODE[code];
                  return (
                    <TableRow
                      key={org.organization_id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => openViewDialog(org)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                              {getAvatar(org.organization_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {org.organization_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {org.organization_type ? (
                          <Badge variant="outline" className="font-mono">
                            {org.organization_type}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {role ? (
                          <span className="text-sm">{role}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {org.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openViewDialog(org)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Lihat Detail
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
        </div>
      </div>

      {/* Add Organization Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Organisasi</DialogTitle>
            <DialogDescription>
              Buat organisasi governance baru.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="organization_name">Nama Organisasi *</Label>
              <Input
                id="organization_name"
                placeholder="Masukkan nama organisasi"
                value={formData.organization_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    organization_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization_type">Code / Tipe</Label>
              <Input
                id="organization_type"
                placeholder="mis. KKKS, REGULATOR, PLATFORM"
                value={formData.organization_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    organization_type: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Opsional. Dipakai sebagai <code>code</code> organisasi di
                GX-Space.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleAddOrganization}
              className="bg-accent hover:bg-accent/90"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Organization Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Detail Organisasi</DialogTitle>
          </DialogHeader>
          {selectedOrganization && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                    {getAvatar(selectedOrganization.organization_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold truncate">
                    {selectedOrganization.organization_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedOrganization.organization_type && (
                      <Badge variant="outline" className="font-mono">
                        {selectedOrganization.organization_type}
                      </Badge>
                    )}
                    {ROLE_BY_CODE[
                      (
                        selectedOrganization.organization_type ?? ""
                      ).toUpperCase()
                    ] && (
                      <span className="text-sm text-muted-foreground">
                        {
                          ROLE_BY_CODE[
                            (
                              selectedOrganization.organization_type ?? ""
                            ).toUpperCase()
                          ]
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedOrganization.description && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm">{selectedOrganization.description}</p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Governance Domains</p>
                </div>
                <OrganizationDomains
                  orgId={selectedOrganization.organization_id}
                />
              </div>
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
