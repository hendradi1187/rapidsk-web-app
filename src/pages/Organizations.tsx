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
  Filter,
  MoreHorizontal,
  Building2,
  Users,
  Database,
  Eye,
  Pencil,
  Trash2,
  X,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Organization {
  id: number;
  name: string;
  type: string;
  role: string;
  units: string[];
  datasets: number;
  contracts: number;
  status: string;
  avatar: string;
}

const initialOrganizations: Organization[] = [
  {
    id: 1,
    name: "PHE ONWJ",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi", "Reservoir", "Keuangan"],
    datasets: 24,
    contracts: 8,
    status: "active",
    avatar: "PO",
  },
  {
    id: 2,
    name: "Pertamina Hulu Energi",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi", "Eksplorasi"],
    datasets: 18,
    contracts: 6,
    status: "active",
    avatar: "PE",
  },
  {
    id: 3,
    name: "SKK Migas",
    type: "Regulator",
    role: "Consumer",
    units: ["Monitoring", "Compliance", "Data Analytics"],
    datasets: 0,
    contracts: 14,
    status: "active",
    avatar: "SK",
  },
  {
    id: 4,
    name: "Medco E&P Indonesia",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi"],
    datasets: 12,
    contracts: 4,
    status: "pending",
    avatar: "ME",
  },
  {
    id: 5,
    name: "Chevron Indonesia",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi", "Reservoir", "HSE"],
    datasets: 32,
    contracts: 10,
    status: "active",
    avatar: "CI",
  },
  {
    id: 6,
    name: "ExxonMobil Cepu",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi", "Drilling"],
    datasets: 15,
    contracts: 5,
    status: "active",
    avatar: "EM",
  },
  {
    id: 7,
    name: "CNOOC SES Ltd",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi", "Reservoir"],
    datasets: 10,
    contracts: 3,
    status: "active",
    avatar: "CN",
  },
  {
    id: 8,
    name: "ConocoPhillips Indonesia",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi", "Eksplorasi", "HSE"],
    datasets: 22,
    contracts: 7,
    status: "active",
    avatar: "CP",
  },
  {
    id: 9,
    name: "Santos (Madura Offshore)",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi"],
    datasets: 8,
    contracts: 2,
    status: "pending",
    avatar: "SM",
  },
  {
    id: 10,
    name: "Petronas Carigali",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi", "Reservoir"],
    datasets: 14,
    contracts: 4,
    status: "active",
    avatar: "PC",
  },
  {
    id: 11,
    name: "INPEX Masela",
    type: "KKKS",
    role: "Provider",
    units: ["Eksplorasi", "Development"],
    datasets: 6,
    contracts: 2,
    status: "pending",
    avatar: "IM",
  },
  {
    id: 12,
    name: "Kementerian ESDM",
    type: "Regulator",
    role: "Consumer",
    units: ["Policy", "Data Analytics"],
    datasets: 0,
    contracts: 8,
    status: "active",
    avatar: "KE",
  },
];

const Organizations = () => {
  // State management
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "KKKS",
    role: "Provider",
    units: "",
    status: "active",
  });

  // Filter organizations
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || org.type === filterType;
      const matchesRole = filterRole === "all" || org.role === filterRole;
      const matchesStatus = filterStatus === "all" || org.status === filterStatus;
      return matchesSearch && matchesType && matchesRole && matchesStatus;
    });
  }, [organizations, searchQuery, filterType, filterRole, filterStatus]);

  // Calculate stats dynamically
  const stats = useMemo(() => {
    const totalOrgs = organizations.length;
    const totalUnits = organizations.reduce((sum, org) => sum + org.units.length, 0);
    const totalDatasets = organizations.reduce((sum, org) => sum + org.datasets, 0);
    return { totalOrgs, totalUnits, totalDatasets };
  }, [organizations]);

  // Check if any filter is active
  const hasActiveFilters = filterType !== "all" || filterRole !== "all" || filterStatus !== "all";

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      type: "KKKS",
      role: "Provider",
      units: "",
      status: "active",
    });
  };

  // Handle add organization
  const handleAddOrganization = () => {
    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    const newOrg: Organization = {
      id: Math.max(...organizations.map(o => o.id)) + 1,
      name: formData.name,
      type: formData.type,
      role: formData.role,
      units: formData.units.split(",").map(u => u.trim()).filter(u => u),
      datasets: 0,
      contracts: 0,
      status: formData.status,
      avatar: formData.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    };

    setOrganizations([...organizations, newOrg]);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success("Organization added successfully");
  };

  // Handle edit organization
  const handleEditOrganization = () => {
    if (!selectedOrganization || !formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setOrganizations(organizations.map(org =>
      org.id === selectedOrganization.id
        ? {
            ...org,
            name: formData.name,
            type: formData.type,
            role: formData.role,
            units: formData.units.split(",").map(u => u.trim()).filter(u => u),
            status: formData.status,
            avatar: formData.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
          }
        : org
    ));
    setIsEditDialogOpen(false);
    setSelectedOrganization(null);
    resetForm();
    toast.success("Organization updated successfully");
  };

  // Handle delete organization
  const handleDeleteOrganization = () => {
    if (!selectedOrganization) return;

    setOrganizations(organizations.filter(org => org.id !== selectedOrganization.id));
    setIsDeleteDialogOpen(false);
    setSelectedOrganization(null);
    toast.success("Organization deleted successfully");
  };

  // Open edit dialog
  const openEditDialog = (org: Organization) => {
    setSelectedOrganization(org);
    setFormData({
      name: org.name,
      type: org.type,
      role: org.role,
      units: org.units.join(", "),
      status: org.status,
    });
    setIsEditDialogOpen(true);
  };

  // Open view dialog
  const openViewDialog = (org: Organization) => {
    setSelectedOrganization(org);
    setIsViewDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (org: Organization) => {
    setSelectedOrganization(org);
    setIsDeleteDialogOpen(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterType("all");
    setFilterRole("all");
    setFilterStatus("all");
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Organizations"
        subtitle="Manage KKKS and SKK Migas participants"
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
                <p className="text-2xl font-bold">{stats.totalOrgs}</p>
                <p className="text-sm text-muted-foreground">Total Organizations</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUnits}</p>
                <p className="text-sm text-muted-foreground">Total Units</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Database className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalDatasets}</p>
                <p className="text-sm text-muted-foreground">Registered Datasets</p>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={hasActiveFilters ? "border-accent" : ""}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {[filterType !== "all", filterRole !== "all", filterStatus !== "all"].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
                        <X className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="KKKS">KKKS</SelectItem>
                        <SelectItem value="Regulator">Regulator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="Provider">Provider</SelectItem>
                        <SelectItem value="Consumer">Consumer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
                <TableHead>Role</TableHead>
                <TableHead>Units</TableHead>
                <TableHead className="text-center">Datasets</TableHead>
                <TableHead className="text-center">Contracts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No organizations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrganizations.map((org) => (
                  <TableRow key={org.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                            {org.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{org.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          org.role === "Provider"
                            ? "bg-info/10 text-info border-info/30"
                            : "bg-accent/10 text-accent border-accent/30"
                        }
                      >
                        {org.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {org.units.slice(0, 2).map((unit) => (
                          <Badge key={unit} variant="secondary" className="text-xs">
                            {unit}
                          </Badge>
                        ))}
                        {org.units.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{org.units.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{org.datasets}</TableCell>
                    <TableCell className="text-center font-medium">{org.contracts}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          org.status === "active" ? "badge-active" : "badge-pending"
                        }
                      >
                        {org.status}
                      </Badge>
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
                          <DropdownMenuItem onClick={() => openEditDialog(org)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Organization
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(org)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Organization
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
              Create a new organization in the dataspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                placeholder="Enter organization name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KKKS">KKKS</SelectItem>
                    <SelectItem value="Regulator">Regulator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Provider">Provider</SelectItem>
                    <SelectItem value="Consumer">Consumer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="units">Units (comma-separated)</Label>
              <Input
                id="units"
                placeholder="e.g., Produksi, Reservoir, HSE"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOrganization} className="bg-accent hover:bg-accent/90">
              Add Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Organization Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter organization name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KKKS">KKKS</SelectItem>
                    <SelectItem value="Regulator">Regulator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Provider">Provider</SelectItem>
                    <SelectItem value="Consumer">Consumer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-units">Units (comma-separated)</Label>
              <Input
                id="edit-units"
                placeholder="e.g., Produksi, Reservoir, HSE"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditOrganization} className="bg-accent hover:bg-accent/90">
              Save Changes
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
                    {selectedOrganization.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedOrganization.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{selectedOrganization.type}</Badge>
                    <Badge
                      className={
                        selectedOrganization.role === "Provider"
                          ? "bg-info/10 text-info border-info/30"
                          : "bg-accent/10 text-accent border-accent/30"
                      }
                    >
                      {selectedOrganization.role}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    className={
                      selectedOrganization.status === "active" ? "badge-active" : "badge-pending"
                    }
                  >
                    {selectedOrganization.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Units</p>
                  <p className="font-medium">{selectedOrganization.units.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Datasets</p>
                  <p className="font-medium">{selectedOrganization.datasets}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contracts</p>
                  <p className="font-medium">{selectedOrganization.contracts}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Units</p>
                <div className="flex flex-wrap gap-2">
                  {selectedOrganization.units.map((unit) => (
                    <Badge key={unit} variant="secondary">
                      {unit}
                    </Badge>
                  ))}
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
                if (selectedOrganization) openEditDialog(selectedOrganization);
              }}
              className="bg-accent hover:bg-accent/90"
            >
              Edit Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedOrganization?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Organizations;
