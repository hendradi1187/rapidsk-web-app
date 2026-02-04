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

interface Contract {
  id: number;
  title: string;
  provider: string;
  consumer: string;
  domain: string;
  policy: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface Policy {
  id: number;
  name: string;
  description: string;
  datasets: number;
  active: boolean;
}

interface Agreement {
  id: number;
  contractId: number;
  contractTitle: string;
  provider: string;
  consumer: string;
  signedDate: string;
  documentUrl: string;
  status: string;
}

const initialContracts: Contract[] = [
  {
    id: 1,
    title: "Lifting Data Access Agreement",
    provider: "PHE ONWJ",
    consumer: "SKK Migas",
    domain: "Lifting Data",
    policy: "Internal monitoring only",
    status: "active",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
  },
  {
    id: 2,
    title: "Reservoir Data Sharing Contract",
    provider: "Pertamina Hulu Energi",
    consumer: "SKK Migas",
    domain: "Reservoir Data",
    policy: "Analysis and reporting",
    status: "active",
    startDate: "2025-03-15",
    endDate: "2026-03-14",
  },
  {
    id: 3,
    title: "Daily Production Stream",
    provider: "Chevron Indonesia",
    consumer: "SKK Migas",
    domain: "Production Data",
    policy: "Real-time monitoring",
    status: "pending",
    startDate: "2025-02-01",
    endDate: "2026-01-31",
  },
  {
    id: 4,
    title: "Well Test Data Exchange",
    provider: "Medco E&P",
    consumer: "SKK Migas",
    domain: "Well Test",
    policy: "Quarterly reports only",
    status: "draft",
    startDate: "-",
    endDate: "-",
  },
  {
    id: 5,
    title: "Seismic Data Access Agreement",
    provider: "PHE ONWJ",
    consumer: "Kementerian ESDM",
    domain: "Exploration",
    policy: "Analysis and reporting",
    status: "active",
    startDate: "2025-06-01",
    endDate: "2026-05-31",
  },
  {
    id: 6,
    title: "Field Development Data Sharing",
    provider: "ExxonMobil Indonesia",
    consumer: "SKK Migas",
    domain: "Production Data",
    policy: "Internal monitoring only",
    status: "expired",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
  },
];

const initialPolicies: Policy[] = [
  {
    id: 1,
    name: "Internal Monitoring Only",
    description: "Data used exclusively for SKK Migas internal monitoring purposes",
    datasets: 24,
    active: true,
  },
  {
    id: 2,
    name: "Analysis and Reporting",
    description: "Data can be used for analysis and official reports",
    datasets: 18,
    active: true,
  },
  {
    id: 3,
    name: "Real-time Access",
    description: "Streaming data access with <1 hour latency requirement",
    datasets: 8,
    active: true,
  },
  {
    id: 4,
    name: "Quarterly Reports Only",
    description: "Data access limited to quarterly reporting cycles",
    datasets: 5,
    active: true,
  },
];

const initialAgreements: Agreement[] = [
  {
    id: 1,
    contractId: 1,
    contractTitle: "Lifting Data Access Agreement",
    provider: "PHE ONWJ",
    consumer: "SKK Migas",
    signedDate: "2025-01-01",
    documentUrl: "/agreements/agreement-001.pdf",
    status: "signed",
  },
  {
    id: 2,
    contractId: 2,
    contractTitle: "Reservoir Data Sharing Contract",
    provider: "Pertamina Hulu Energi",
    consumer: "SKK Migas",
    signedDate: "2025-03-15",
    documentUrl: "/agreements/agreement-002.pdf",
    status: "signed",
  },
  {
    id: 3,
    contractId: 5,
    contractTitle: "Seismic Data Access Agreement",
    provider: "PHE ONWJ",
    consumer: "Kementerian ESDM",
    signedDate: "2025-06-01",
    documentUrl: "/agreements/agreement-003.pdf",
    status: "signed",
  },
];

const providers = [
  "PHE ONWJ",
  "Pertamina Hulu Energi",
  "Chevron Indonesia",
  "Medco E&P",
  "ExxonMobil Indonesia",
  "ConocoPhillips",
];

const consumers = ["SKK Migas", "Kementerian ESDM"];

const domains = [
  "Lifting Data",
  "Reservoir Data",
  "Production Data",
  "Well Test",
  "Exploration",
];

const Contracts = () => {
  // State management
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [agreements] = useState<Agreement[]>(initialAgreements);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("contracts");

  // Dialog states
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form states
  const [contractForm, setContractForm] = useState({
    title: "",
    provider: "",
    consumer: "",
    domain: "",
    policy: "",
    status: "draft",
    startDate: "",
    endDate: "",
  });

  const [policyForm, setPolicyForm] = useState({
    name: "",
    description: "",
    active: true,
  });

  // Filter contracts based on search
  const filteredContracts = useMemo(() => {
    return contracts.filter(
      (contract) =>
        contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.consumer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.domain.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contracts, searchQuery]);

  // Filter policies based on search
  const filteredPolicies = useMemo(() => {
    return policies.filter(
      (policy) =>
        policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [policies, searchQuery]);

  // Filter agreements based on search
  const filteredAgreements = useMemo(() => {
    return agreements.filter(
      (agreement) =>
        agreement.contractTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agreement.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agreement.consumer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [agreements, searchQuery]);

  // Calculate stats dynamically
  const stats = useMemo(() => {
    return {
      active: contracts.filter((c) => c.status === "active").length,
      pending: contracts.filter((c) => c.status === "pending").length,
      draft: contracts.filter((c) => c.status === "draft").length,
      expired: contracts.filter((c) => c.status === "expired").length,
    };
  }, [contracts]);

  // Reset contract form
  const resetContractForm = () => {
    setContractForm({
      title: "",
      provider: "",
      consumer: "",
      domain: "",
      policy: "",
      status: "draft",
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
      active: true,
    });
    setIsEditMode(false);
    setSelectedPolicy(null);
  };

  // Handle add/edit contract
  const handleSaveContract = () => {
    if (!contractForm.title.trim()) {
      toast.error("Contract title is required");
      return;
    }

    if (isEditMode && selectedContract) {
      setContracts(
        contracts.map((c) =>
          c.id === selectedContract.id
            ? { ...c, ...contractForm }
            : c
        )
      );
      toast.success("Contract updated successfully");
    } else {
      const newContract: Contract = {
        id: Math.max(...contracts.map((c) => c.id)) + 1,
        ...contractForm,
      };
      setContracts([...contracts, newContract]);
      toast.success("Contract created successfully");
    }
    setIsContractDialogOpen(false);
    resetContractForm();
  };

  // Handle add/edit policy
  const handleSavePolicy = () => {
    if (!policyForm.name.trim()) {
      toast.error("Policy name is required");
      return;
    }

    if (isEditMode && selectedPolicy) {
      setPolicies(
        policies.map((p) =>
          p.id === selectedPolicy.id
            ? { ...p, ...policyForm }
            : p
        )
      );
      toast.success("Policy updated successfully");
    } else {
      const newPolicy: Policy = {
        id: Math.max(...policies.map((p) => p.id)) + 1,
        ...policyForm,
        datasets: 0,
      };
      setPolicies([...policies, newPolicy]);
      toast.success("Policy created successfully");
    }
    setIsPolicyDialogOpen(false);
    resetPolicyForm();
  };

  // Handle delete contract
  const handleDeleteContract = () => {
    if (!selectedContract) return;
    setContracts(contracts.filter((c) => c.id !== selectedContract.id));
    setIsDeleteDialogOpen(false);
    setSelectedContract(null);
    toast.success("Contract deleted successfully");
  };

  // Handle view contract
  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setIsViewDialogOpen(true);
  };

  // Handle edit contract
  const handleEditContract = (contract: Contract) => {
    setSelectedContract(contract);
    setContractForm({
      title: contract.title,
      provider: contract.provider,
      consumer: contract.consumer,
      domain: contract.domain,
      policy: contract.policy,
      status: contract.status,
      startDate: contract.startDate,
      endDate: contract.endDate,
    });
    setIsEditMode(true);
    setIsContractDialogOpen(true);
  };

  // Handle edit policy
  const handleEditPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setPolicyForm({
      name: policy.name,
      description: policy.description,
      active: policy.active,
    });
    setIsEditMode(true);
    setIsPolicyDialogOpen(true);
  };

  // Handle download agreement
  const handleDownloadAgreement = (agreement: Agreement) => {
    toast.success(`Downloading ${agreement.contractTitle}...`);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Contracts & Policies"
        subtitle="Manage data sharing agreements and access policies"
      />
      <div className="p-6 space-y-6">
        <Tabs defaultValue="contracts" className="space-y-6" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <TabsList className="bg-muted">
              <TabsTrigger value="contracts">
                Contracts
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {contracts.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="policies">
                Policies
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {policies.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="agreements">
                Agreements
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {agreements.length}
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
                  onClick={() => {
                    resetContractForm();
                    setIsContractDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Contract
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
                  <p className="text-sm">Try adjusting your search criteria</p>
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
                            <h3 className="font-semibold">{contract.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span>{contract.provider}</span>
                              <ArrowRight className="w-4 h-4" />
                              <span>{contract.consumer}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{contract.domain}</Badge>
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                {contract.policy}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>{contract.startDate}</span>
                              <span>→</span>
                              <span>{contract.endDate}</span>
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
                              <DropdownMenuItem onClick={() => handleEditContract(contract)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Contract
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
                  <p className="text-sm">Try adjusting your search criteria</p>
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
                          <Badge className={policy.active ? "badge-active" : "badge-inactive"}>
                            {policy.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {policy.description}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <span className="text-sm text-muted-foreground">
                            {policy.datasets} datasets using this policy
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPolicy(policy)}
                          >
                            Edit
                          </Button>
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
                            <h3 className="font-semibold">{agreement.contractTitle}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Building2 className="w-4 h-4" />
                              <span>{agreement.provider}</span>
                              <ArrowRight className="w-4 h-4" />
                              <span>{agreement.consumer}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>Signed on {agreement.signedDate}</span>
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
                            Download PDF
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

        {/* New/Edit Contract Dialog */}
        <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit Contract" : "New Contract"}</DialogTitle>
              <DialogDescription>
                {isEditMode ? "Update contract details" : "Create a new data sharing contract"}
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
                  <Label>Provider (KKKS) *</Label>
                  <Select
                    value={contractForm.provider}
                    onValueChange={(v) => setContractForm({ ...contractForm, provider: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Consumer *</Label>
                  <Select
                    value={contractForm.consumer}
                    onValueChange={(v) => setContractForm({ ...contractForm, consumer: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select consumer" />
                    </SelectTrigger>
                    <SelectContent>
                      {consumers.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Domain *</Label>
                  <Select
                    value={contractForm.domain}
                    onValueChange={(v) => setContractForm({ ...contractForm, domain: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Policy *</Label>
                  <Select
                    value={contractForm.policy}
                    onValueChange={(v) => setContractForm({ ...contractForm, policy: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select policy" />
                    </SelectTrigger>
                    <SelectContent>
                      {policies.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={contractForm.status}
                  onValueChange={(v) => setContractForm({ ...contractForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsContractDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveContract} className="bg-accent hover:bg-accent/90">
                {isEditMode ? "Save Changes" : "Create Contract"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New/Edit Policy Dialog */}
        <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit Policy" : "New Policy"}</DialogTitle>
              <DialogDescription>
                {isEditMode ? "Update policy details" : "Create a new data access policy"}
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
                <Label>Status</Label>
                <Select
                  value={policyForm.active ? "active" : "inactive"}
                  onValueChange={(v) => setPolicyForm({ ...policyForm, active: v === "active" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPolicyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePolicy} className="bg-accent hover:bg-accent/90">
                {isEditMode ? "Save Changes" : "Create Policy"}
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
                    <h3 className="text-lg font-semibold">{selectedContract.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{selectedContract.domain}</Badge>
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
                      {selectedContract.policy}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Period</p>
                    <p className="font-medium">
                      {selectedContract.startDate} → {selectedContract.endDate}
                    </p>
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
                  if (selectedContract) handleEditContract(selectedContract);
                }}
                className="bg-accent hover:bg-accent/90"
              >
                Edit Contract
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
              >
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
