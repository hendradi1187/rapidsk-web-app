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
} from "lucide-react";
import { Input } from "@/components/ui/input";

const contracts = [
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
];

const policies = [
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
];

const Contracts = () => {
  return (
    <div className="min-h-screen">
      <Header
        title="Contracts & Policies"
        subtitle="Manage data sharing agreements and access policies"
      />
      <div className="p-6 space-y-6">
        <Tabs defaultValue="contracts" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <TabsList className="bg-muted">
              <TabsTrigger value="contracts">Contracts</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
              <TabsTrigger value="agreements">Agreements</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-10 w-64" />
              </div>
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Contract
              </Button>
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
                      <p className="text-2xl font-bold">32</p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber" />
                    <div>
                      <p className="text-2xl font-bold">8</p>
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
                      <p className="text-2xl font-bold">5</p>
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
                      <p className="text-2xl font-bold">3</p>
                      <p className="text-sm text-muted-foreground">Expired</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contract List */}
            <div className="grid gap-4">
              {contracts.map((contract, index) => (
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
                              : "badge-inactive"
                          }
                        >
                          {contract.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {policies.map((policy, index) => (
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
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-dashed flex items-center justify-center min-h-[200px] cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="text-center">
                  <Plus className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Add New Policy</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="agreements">
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No agreements to display</p>
              <p className="text-sm">Agreements are automatically generated when contracts are finalized</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Contracts;
