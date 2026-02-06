import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Layers,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building2,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useAllDomains,
  useCreateDomain,
  useUpdateDomain,
  useDeleteDomain,
} from "@/api/hooks/useDomains";
import { useOrganizations } from "@/api/hooks/useOrganizations";
import { Domain, DomainStatus } from "@/api/types";

const Domains = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    organization_id: "",
    name: "",
    code: "",
    description: "",
    status: "ACTIVE" as DomainStatus,
  });

  // API hooks
  const {
    data: domainsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAllDomains({ limit: pageSize, offset: page * pageSize });

  const { data: organizationsData } = useOrganizations({ limit: 100 });

  const createMutation = useCreateDomain();
  const updateMutation = useUpdateDomain();
  const deleteMutation = useDeleteDomain();

  // Filter domains based on search
  const filteredDomains = useMemo(() => {
    if (!domainsData?.data) return [];
    return domainsData.data.filter((domain) =>
      domain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      domain.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      domain.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [domainsData?.data, searchQuery]);

  // Get organization name by ID
  const getOrganizationName = (orgId: string) => {
    const org = organizationsData?.data?.find((o) => o.id === orgId);
    return org?.name || "Unknown";
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      organization_id: "",
      name: "",
      code: "",
      description: "",
      status: "ACTIVE",
    });
  };

  // Handle add domain
  const handleAddDomain = async () => {
    if (!formData.organization_id) {
      toast.error("Organization is required");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Domain name is required");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Domain code is required");
      return;
    }
    if (formData.code.length < 2 || formData.code.length > 20) {
      toast.error("Code must be between 2-20 characters");
      return;
    }
    if (!formData.description.trim() || formData.description.length < 10) {
      toast.error("Description must be at least 10 characters");
      return;
    }

    try {
      await createMutation.mutateAsync({
        organizationId: formData.organization_id,
        data: {
          name: formData.name,
          code: formData.code.toUpperCase(),
          description: formData.description,
          status: formData.status,
        },
      });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Domain created successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create domain");
    }
  };

  // Handle edit domain
  const handleEditDomain = async () => {
    if (!selectedDomain) return;

    if (!formData.name.trim()) {
      toast.error("Domain name is required");
      return;
    }
    if (!formData.description.trim() || formData.description.length < 10) {
      toast.error("Description must be at least 10 characters");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        organizationId: selectedDomain.organization_id,
        id: selectedDomain.id,
        data: {
          name: formData.name,
          description: formData.description,
        },
      });
      setIsEditDialogOpen(false);
      setSelectedDomain(null);
      resetForm();
      toast.success("Domain updated successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update domain");
    }
  };

  // Handle delete domain
  const handleDeleteDomain = async () => {
    if (!selectedDomain) return;

    try {
      await deleteMutation.mutateAsync({
        organizationId: selectedDomain.organization_id,
        id: selectedDomain.id,
      });
      setIsDeleteDialogOpen(false);
      setSelectedDomain(null);
      toast.success("Domain deleted successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete domain");
    }
  };

  // Open edit dialog
  const openEditDialog = (domain: Domain) => {
    setSelectedDomain(domain);
    setFormData({
      organization_id: domain.organization_id,
      name: domain.name,
      code: domain.code,
      description: domain.description,
      status: domain.status,
    });
    setIsEditDialogOpen(true);
  };

  // Open view dialog
  const openViewDialog = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsViewDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsDeleteDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header
          title="Domains"
          subtitle="Manage data domains within organizations"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
            <p className="mt-2 text-muted-foreground">Loading domains...</p>
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
          title="Domains"
          subtitle="Manage data domains within organizations"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Failed to load domains</p>
            <p className="text-sm text-muted-foreground mb-4">
              {(error as any)?.message || "An error occurred"}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Domains"
        subtitle="Manage data domains within organizations"
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Layers className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{domainsData?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Domains</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Layers className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {domainsData?.data?.filter((d) => d.status === "ACTIVE").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Active Domains</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Layers className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {domainsData?.data?.filter((d) => d.status === "INACTIVE").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Inactive Domains</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search domains..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
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
              Add Domain
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Domain</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No domains found</p>
                    <p className="text-sm">
                      {searchQuery ? "Try adjusting your search" : "Create your first domain"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDomains.map((domain) => (
                  <TableRow key={domain.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <Layers className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <span className="font-medium">{domain.name}</span>
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                            {domain.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {domain.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{getOrganizationName(domain.organization_id)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          domain.status === "ACTIVE"
                            ? "badge-active"
                            : "badge-inactive"
                        }
                      >
                        {domain.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(domain.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewDialog(domain)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(domain)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Domain
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(domain)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Domain
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

        {/* Pagination Info */}
        {domainsData && domainsData.total > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {page * pageSize + 1} to{" "}
              {Math.min((page + 1) * pageSize, domainsData.total)} of{" "}
              {domainsData.total} domains
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= domainsData.total}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Domain</DialogTitle>
            <DialogDescription>
              Create a new data domain within an organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization *</Label>
              <Select
                value={formData.organization_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, organization_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizationsData?.data?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Domain Name *</Label>
              <Input
                id="name"
                placeholder="Enter domain name (min 3 characters)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Domain Code *</Label>
              <Input
                id="code"
                placeholder="Unique code (2-20 characters)"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                This code must be unique within the organization
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Enter description (min 10 characters)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: DomainStatus) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDomain}
              className="bg-accent hover:bg-accent/90"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Domain Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Domain</DialogTitle>
            <DialogDescription>
              Update domain details. Organization and code cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-org">Organization</Label>
              <Input
                id="edit-org"
                value={getOrganizationName(formData.organization_id)}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Domain Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter domain name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Domain Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Code cannot be changed after creation
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter description (min 10 characters)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditDomain}
              className="bg-accent hover:bg-accent/90"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Domain Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Domain Details</DialogTitle>
          </DialogHeader>
          {selectedDomain && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Layers className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedDomain.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="font-mono">
                      {selectedDomain.code}
                    </Badge>
                    <Badge
                      className={
                        selectedDomain.status === "ACTIVE"
                          ? "badge-active"
                          : "badge-inactive"
                      }
                    >
                      {selectedDomain.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{selectedDomain.description}</p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Organization</p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">{getOrganizationName(selectedDomain.organization_id)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">{formatDate(selectedDomain.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Updated At</p>
                  <p className="font-medium">{formatDate(selectedDomain.updated_at)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">{selectedDomain.created_by || "System"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono text-xs text-muted-foreground">{selectedDomain.id}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false);
                if (selectedDomain) openEditDialog(selectedDomain);
              }}
              className="bg-accent hover:bg-accent/90"
            >
              Edit Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDomain?.name}"? This action cannot be undone.
              All datasets, vocabularies, and schemas within this domain will also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDomain}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Domains;
