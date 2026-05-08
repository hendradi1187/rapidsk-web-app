import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Shield,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  Download,
  Building2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Layers,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAllDomains } from "@/api/hooks/useDomains";
import {
  useContracts,
  useDeleteContract,
  useContractPolicies,
  useCreateContractPolicy,
  useAgreements,
} from "@/api/hooks/useContracts";
import { Contract, ContractPolicy, Agreement } from "@/api/types";

const Contracts = () => {
  // Domain selection
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("contracts");

  // Dialog states
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form states
  const [contractForm, setContractForm] = useState({
    title: "",
    provider: "",
    consumer: "",
    policy: "",
    startDate: "",
    endDate: "",
  });

  const [policyForm, setPolicyForm] = useState({
    name: "",
    description: "",
    data_clasification: "INTERNAL",
    effective_from: "",
    effective_to: "",
  });

  // API hooks
  const { data: domainsData, isLoading: isLoadingDomains } = useAllDomains({ limit: 100 });
  const {
    data: contractsData,
    isLoading: isLoadingContracts,
    isError: isContractsError,
    refetch: refetchContracts,
  } = useContracts(selectedDomainId, { limit: 100 });
  const {
    data: policiesData,
    isLoading: isLoadingPolicies,
    refetch: refetchPolicies,
  } = useContractPolicies(selectedDomainId, { limit: 100 });
  const {
    data: agreementsData,
    isLoading: isLoadingAgreements,
    refetch: refetchAgreements,
  } = useAgreements(selectedDomainId, { limit: 100 });

  const deleteContractMutation = useDeleteContract();
  const createPolicyMutation = useCreateContractPolicy();

  // Filter contracts based on search
  const filteredContracts = useMemo(() => {
    if (!contractsData?.data) return [];
    return contractsData.data.filter(
      (contract) =>
        contract.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.consumer?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contractsData?.data, searchQuery]);

  // Filter policies based on search
  const filteredPolicies = useMemo(() => {
    if (!policiesData?.data) return [];
    return policiesData.data.filter(
      (policy) =>
        policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [policiesData?.data, searchQuery]);

  // Filter agreements based on search
  const filteredAgreements = useMemo(() => {
    if (!agreementsData?.data) return [];
    return agreementsData.data;
  }, [agreementsData?.data]);

  // Calculate stats dynamically
  const stats = useMemo(() => {
    const contracts = contractsData?.data || [];
    return {
      active: contracts.filter((c) => c.status === "active").length,
      pending: contracts.filter((c) => c.status === "pending").length,
      draft: contracts.filter((c) => c.status === "draft").length,
      expired: contracts.filter((c) => c.status === "expired").length,
    };
  }, [contractsData?.data]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Reset contract form
  const resetContractForm = () => {
    setContractForm({
      title: "",
      provider: "",
      consumer: "",
      policy: "",
      startDate: "",
      endDate: "",
    });
    setIsEditMode(false);
    setSelectedContract(null);
  };

  // Reset policy form
  const resetPolicyForm = () => {
    setPolicyForm({
      name: "",
      description: "",
      data_clasification: "INTERNAL",
      effective_from: "",
      effective_to: "",
    });
  };

  // Handle add contract
  const handleSaveContract = async () => {
    toast.error("Legacy contract form dinonaktifkan", {
      description: "Gunakan menu V2 Consumer Policy & Contract agar payload contract tetap sesuai API live.",
    });
  };

  // Handle add policy
  const handleSavePolicy = async () => {
    if (!policyForm.name.trim()) {
      toast.error("Policy name is required");
      return;
    }

    try {
      await createPolicyMutation.mutateAsync({
        domainId: selectedDomainId,
        data: {
          name: policyForm.name,
          description: policyForm.description || null,
          data_clasification: policyForm.data_clasification,
          effective_from: policyForm.effective_from,
          effective_to: policyForm.effective_to,
        },
      });
      toast.success("Policy created successfully");
      setIsPolicyDialogOpen(false);
      resetPolicyForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create policy");
    }
  };

  // Handle delete contract
  const handleDeleteContract = async () => {
    if (!selectedContract) return;
    try {
      await deleteContractMutation.mutateAsync({
        domainId: selectedDomainId,
        id: String(selectedContract.id),
      });
      setIsDeleteDialogOpen(false);
      setSelectedContract(null);
      toast.success("Contract deleted successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete contract");
    }
  };

  // Handle view contract
  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setIsViewDialogOpen(true);
  };

  // Handle download agreement
  const handleDownloadAgreement = (agreement: Agreement) => {
    toast.success(`Downloading agreement...`);
  };

  // Refresh data
  const handleRefresh = () => {
    refetchContracts();
    refetchPolicies();
    refetchAgreements();
  };

  const selectedDomain = domainsData?.data?.find((d) => d.id === selectedDomainId);

  // No domain selected state
  if (!selectedDomainId) {
    return (
      <div className="min-h-screen">
        <Header
          title="Contracts & Policies"
          subtitle="Manage data sharing agreements and access policies"
        />
        <div className="p-6 space-y-6">
          {/* Domain Selector */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="w-5 h-5 text-accent" />
              <h3 className="font-semibold">Select Domain</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Please select a domain to view and manage contracts.
            </p>
            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Select a domain..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingDomains ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading domains...
                  </div>
                ) : domainsData?.data?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No domains available. Please create a domain first.
                  </div>
                ) : (
                  domainsData?.data?.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      <div className="flex items-center gap-2">
                        <span>{domain.name}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {domain.code}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Empty State */}
          <div className="flex items-center justify-center h-[40vh]">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">Select a domain to view contracts</p>
              <p className="text-sm text-muted-foreground mt-1">
                Contracts are organized by domain
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingContracts || isLoadingPolicies || isLoadingAgreements) {
    return (
      <div className="min-h-screen">
        <Header
          title="Contracts & Policies"
          subtitle="Manage data sharing agreements and access policies"
        />
        <div className="p-6">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
              <p className="mt-2 text-muted-foreground">Loading contracts...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isContractsError) {
    return (
      <div className="min-h-screen">
        <Header
          title="Contracts & Policies"
          subtitle="Manage data sharing agreements and access policies"
        />
        <div className="p-6">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <p className="mt-2 text-lg font-medium">Failed to load contracts</p>
              <Button onClick={handleRefresh} variant="outline" className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Contracts & Policies"
        subtitle="Manage data sharing agreements and access policies"
      />
      <div className="p-6 space-y-6">
        {/* Domain Selector */}
        <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium">Domain:</span>
          </div>
          <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {domainsData?.data?.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  <div className="flex items-center gap-2">
                    <span>{domain.name}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {domain.code}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDomain && (
            <Badge className={selectedDomain.status === "ACTIVE" ? "badge-active" : "badge-inactive"}>
              {selectedDomain.status}
            </Badge>
          )}
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="contracts" className="space-y-6" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <TabsList className="bg-muted">
              <TabsTrigger value="contracts">
                Contracts
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {contractsData?.total || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="policies">
                Policies
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {policiesData?.total || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="agreements">
                Agreements
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {agreementsData?.total || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {activeTab === "contracts" && (
                <Button
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  disabled
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Use V2 Contract Flow
                </Button>
              )}
              {activeTab === "policies" && (
                <Button
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => {
                    resetPolicyForm();
                    setIsPolicyDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Policy
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="contracts" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-success/5 border-success/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-2xl font-bold">{stats.active}</p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.pending}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{stats.draft}</p>
                      <p className="text-sm text-muted-foreground">Draft</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="text-2xl font-bold">{stats.expired}</p>
                      <p className="text-sm text-muted-foreground">Expired</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contract List */}
            <div className="grid gap-4">
              {filteredContracts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No contracts found</p>
                  <p className="text-sm">Create your first contract to get started</p>
                </div>
              ) : (
                filteredContracts.map((contract, index) => (
                  <Card
                    key={contract.id}
                    className="hover:shadow-md transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl bg-accent/10">
                            <FileText className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{contract.title || contract.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span>{contract.provider}</span>
                              <ArrowRight className="w-4 h-4" />
                              <span>{contract.consumer}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {contract.policy && (
                                <Badge variant="secondary" className="text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  {contract.policy}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>{contract.startDate || "-"}</span>
                              <span>→</span>
                              <span>{contract.endDate || "-"}</span>
                            </div>
                          </div>
                          <Badge
                            className={
                              contract.status === "active"
                                ? "badge-active"
                                : contract.status === "pending"
                                ? "badge-pending"
                                : contract.status === "expired"
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : "badge-inactive"
                            }
                          >
                            {contract.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewContract(contract)}
                          >
                            View Details
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewContract(contract)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedContract(contract);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Contract
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPolicies.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No policies found</p>
                  <p className="text-sm">Create your first policy to get started</p>
                </div>
              ) : (
                <>
                  {filteredPolicies.map((policy, index) => (
                    <Card
                      key={policy.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{policy.name}</CardTitle>
                          <Badge variant="outline">{policy.data_clasification}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {policy.description || "No description"}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-border text-sm text-muted-foreground">
                          <span>
                            {policy.effective_from && formatDate(policy.effective_from)} -{" "}
                            {policy.effective_to && formatDate(policy.effective_to)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Card
                    className="border-dashed flex items-center justify-center min-h-[200px] cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      resetPolicyForm();
                      setIsPolicyDialogOpen(true);
                    }}
                  >
                    <div className="text-center">
                      <Plus className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Add New Policy</p>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="agreements" className="space-y-4">
            {filteredAgreements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No agreements found</p>
                <p className="text-sm">Agreements are automatically generated when contracts are finalized</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredAgreements.map((agreement, index) => (
                  <Card
                    key={agreement.id}
                    className="hover:shadow-md transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl bg-success/10">
                            <CheckCircle2 className="w-6 h-6 text-success" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Agreement #{agreement.id.slice(0, 8)}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {formatDate(agreement.effective_from)} - {formatDate(agreement.effective_to)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className="badge-active">{agreement.status}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadAgreement(agreement)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* New Contract Dialog */}
        <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>New Contract</DialogTitle>
              <DialogDescription>
                Legacy form ini sudah dinonaktifkan. Gunakan flow V2 Consumer Policy & Contract untuk payload yang sesuai API live.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Contract Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter contract title"
                  value={contractForm.title}
                  onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider *</Label>
                  <Input
                    placeholder="Provider name"
                    value={contractForm.provider}
                    onChange={(e) => setContractForm({ ...contractForm, provider: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Consumer *</Label>
                  <Input
                    placeholder="Consumer name"
                    value={contractForm.consumer}
                    onChange={(e) => setContractForm({ ...contractForm, consumer: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Policy</Label>
                <Input
                  placeholder="Policy name"
                  value={contractForm.policy}
                  onChange={(e) => setContractForm({ ...contractForm, policy: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsContractDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveContract}
                className="bg-accent hover:bg-accent/90"
                disabled
              >
                Use V2 Flow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Policy Dialog */}
        <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>New Policy</DialogTitle>
              <DialogDescription>
                Create a new contract policy
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="policyName">Policy Name *</Label>
                <Input
                  id="policyName"
                  placeholder="Enter policy name"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policyDesc">Description</Label>
                <Textarea
                  id="policyDesc"
                  placeholder="Describe the policy..."
                  rows={3}
                  value={policyForm.description}
                  onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Classification</Label>
                <Select
                  value={policyForm.data_clasification}
                  onValueChange={(v) => setPolicyForm({ ...policyForm, data_clasification: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                    <SelectItem value="RESTRICTED">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={policyForm.effective_from}
                    onChange={(e) => setPolicyForm({ ...policyForm, effective_from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective To</Label>
                  <Input
                    type="date"
                    value={policyForm.effective_to}
                    onChange={(e) => setPolicyForm({ ...policyForm, effective_to: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPolicyDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSavePolicy}
                className="bg-accent hover:bg-accent/90"
                disabled={createPolicyMutation.isPending}
              >
                {createPolicyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Contract Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Contract Details</DialogTitle>
            </DialogHeader>
            {selectedContract && (
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{selectedContract.title || selectedContract.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        className={
                          selectedContract.status === "active"
                            ? "badge-active"
                            : selectedContract.status === "pending"
                            ? "badge-pending"
                            : selectedContract.status === "expired"
                            ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "badge-inactive"
                        }
                      >
                        {selectedContract.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p className="font-medium">{selectedContract.provider}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Consumer</p>
                    <p className="font-medium">{selectedContract.consumer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Policy</p>
                    <Badge variant="secondary" className="mt-1">
                      <Shield className="w-3 h-3 mr-1" />
                      {selectedContract.policy || "N/A"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Period</p>
                    <p className="font-medium">
                      {selectedContract.startDate || "-"} → {selectedContract.endDate || "-"}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contract</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedContract?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteContract}
                className="bg-destructive hover:bg-destructive/90"
                disabled={deleteContractMutation.isPending}
              >
                {deleteContractMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Contracts;
