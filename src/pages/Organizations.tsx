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
} from "@/api/hooks/useOrganizations";
import type { Organization } from "@/api/types/governance";

const Organizations = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);

  // Form state — schema rapiDSK Enterprise: organization_name (required) + organization_type
  const [formData, setFormData] = useState({
    organization_name: "",
    organization_type: "",
  });

  // API hooks
  const {
    data: organizations,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrganizations();

  const createMutation = useCreateOrganization();

  // Filter organizations based on search (client-side — spec belum support filter param)
  const filteredOrganizations = useMemo(() => {
    if (!organizations) return [];
    const q = searchQuery.toLowerCase();
    return organizations.filter(
      (org) =>
        org.organization_name.toLowerCase().includes(q) ||
        (org.organization_type ?? "").toLowerCase().includes(q),
    );
  }, [organizations, searchQuery]);

  // Generate avatar from name
  const getAvatar = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      organization_name: "",
      organization_type: "",
    });
  };

  // Handle add organization
  const handleAddOrganization = async () => {
    if (!formData.organization_name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        organization_name: formData.organization_name.trim(),
        organization_type: formData.organization_type.trim() || undefined,
      });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Organization created successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create organization");
    }
  };

  // Open view dialog
  const openViewDialog = (org: Organization) => {
    setSelectedOrganization(org);
    setIsViewDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header
          title="Organizations"
          subtitle="Manage governance organizations"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
            <p className="mt-2 text-muted-foreground">Loading organizations...</p>
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
          title="Organizations"
          subtitle="Manage governance organizations"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Failed to load organizations</p>
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

  const totalCount = organizations?.length ?? 0;

  return (
    <div className="min-h-screen">
      <Header
        title="Organizations"
        subtitle="Manage governance organizations"
      />
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
                <p className="text-sm text-muted-foreground">Total Organizations</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Building2 className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredOrganizations.length}</p>
                <p className="text-sm text-muted-foreground">Showing Results</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Building2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Set(organizations?.map((o) => o.organization_type).filter(Boolean)).size}
                </p>
                <p className="text-sm text-muted-foreground">Organization Types</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
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
              Add Organization
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No organizations found</p>
                    <p className="text-sm">
                      {searchQuery ? "Try adjusting your search" : "Create your first organization"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrganizations.map((org) => (
                  <TableRow key={org.organization_id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                            {getAvatar(org.organization_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{org.organization_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.organization_type ? (
                        <Badge variant="outline" className="font-mono">
                          {org.organization_type}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">unspecified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {org.organization_id}
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
                          <DropdownMenuItem onClick={() => openViewDialog(org)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
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
      </div>

      {/* Add Organization Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Organization</DialogTitle>
            <DialogDescription>
              Create a new governance organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="organization_name">Organization Name *</Label>
              <Input
                id="organization_name"
                placeholder="Enter organization name"
                value={formData.organization_name}
                onChange={(e) =>
                  setFormData({ ...formData, organization_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization_type">Organization Type</Label>
              <Input
                id="organization_type"
                placeholder="e.g. KKKS, REGULATOR, PLATFORM"
                value={formData.organization_type}
                onChange={(e) =>
                  setFormData({ ...formData, organization_type: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Optional. Backend may later restrict to a fixed enum.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddOrganization}
              className="bg-accent hover:bg-accent/90"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Organization Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Organization Details</DialogTitle>
          </DialogHeader>
          {selectedOrganization && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                    {getAvatar(selectedOrganization.organization_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedOrganization.organization_name}
                  </h3>
                  {selectedOrganization.organization_type && (
                    <Badge variant="outline" className="font-mono mt-1">
                      {selectedOrganization.organization_type}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Organization ID</p>
                  <p className="font-mono text-xs break-all">
                    {selectedOrganization.organization_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {selectedOrganization.organization_type ?? (
                      <span className="text-xs text-muted-foreground italic">unspecified</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Organizations;
