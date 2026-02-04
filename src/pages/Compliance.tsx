import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ExternalLink,
  RefreshCw,
  Calendar,
  Download,
  Loader2,
  Eye,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Framework {
  id: number;
  name: string;
  description: string;
  status: string;
  score: number;
  lastAudit: string;
  nextAudit: string;
  findings: number;
  controls: number;
  documentationUrl: string;
  controlDetails: ControlDetail[];
}

interface ControlDetail {
  id: string;
  name: string;
  status: "passed" | "failed" | "not_applicable";
  lastChecked: string;
}

interface Finding {
  id: number;
  title: string;
  framework: string;
  severity: string;
  status: string;
  dueDate: string;
  description?: string;
  assignee?: string;
}

const initialFrameworks: Framework[] = [
  {
    id: 1,
    name: "ISO 27001:2022",
    description: "Information Security Management System",
    status: "compliant",
    score: 94,
    lastAudit: "2025-11-15",
    nextAudit: "2026-05-15",
    findings: 2,
    controls: 114,
    documentationUrl: "https://www.iso.org/standard/27001",
    controlDetails: [
      { id: "A.5.1", name: "Policies for information security", status: "passed", lastChecked: "2025-11-15" },
      { id: "A.6.1", name: "Internal organization", status: "passed", lastChecked: "2025-11-15" },
      { id: "A.7.1", name: "Human resource security", status: "passed", lastChecked: "2025-11-15" },
      { id: "A.8.1", name: "Asset management", status: "failed", lastChecked: "2025-11-15" },
      { id: "A.9.1", name: "Access control", status: "passed", lastChecked: "2025-11-15" },
    ],
  },
  {
    id: 2,
    name: "COBIT 2019",
    description: "IT Governance and Management Framework",
    status: "compliant",
    score: 88,
    lastAudit: "2025-10-20",
    nextAudit: "2026-04-20",
    findings: 5,
    controls: 40,
    documentationUrl: "https://www.isaca.org/resources/cobit",
    controlDetails: [
      { id: "EDM01", name: "Ensured Governance Framework", status: "passed", lastChecked: "2025-10-20" },
      { id: "EDM02", name: "Ensured Benefits Delivery", status: "passed", lastChecked: "2025-10-20" },
      { id: "APO01", name: "Managed IT Management Framework", status: "failed", lastChecked: "2025-10-20" },
      { id: "APO02", name: "Managed Strategy", status: "passed", lastChecked: "2025-10-20" },
      { id: "BAI01", name: "Managed Programs", status: "passed", lastChecked: "2025-10-20" },
    ],
  },
  {
    id: 3,
    name: "ITIL 4",
    description: "IT Service Management Best Practices",
    status: "compliant",
    score: 91,
    lastAudit: "2025-09-30",
    nextAudit: "2026-03-30",
    findings: 3,
    controls: 34,
    documentationUrl: "https://www.axelos.com/best-practice-solutions/itil",
    controlDetails: [
      { id: "SVS01", name: "Service Value System", status: "passed", lastChecked: "2025-09-30" },
      { id: "SVC01", name: "Service Value Chain", status: "passed", lastChecked: "2025-09-30" },
      { id: "PRC01", name: "Incident Management", status: "passed", lastChecked: "2025-09-30" },
      { id: "PRC02", name: "Problem Management", status: "failed", lastChecked: "2025-09-30" },
      { id: "PRC03", name: "Change Enablement", status: "passed", lastChecked: "2025-09-30" },
    ],
  },
  {
    id: 4,
    name: "SKK Migas Data Guidelines",
    description: "Oil & Gas Data Sharing Regulations",
    status: "review",
    score: 78,
    lastAudit: "2025-12-01",
    nextAudit: "2026-01-15",
    findings: 8,
    controls: 25,
    documentationUrl: "https://www.skkmigas.go.id/regulasi",
    controlDetails: [
      { id: "DG01", name: "Data Classification", status: "passed", lastChecked: "2025-12-01" },
      { id: "DG02", name: "Data Retention", status: "failed", lastChecked: "2025-12-01" },
      { id: "DG03", name: "Data Sharing Protocols", status: "passed", lastChecked: "2025-12-01" },
      { id: "DG04", name: "Access Control Requirements", status: "failed", lastChecked: "2025-12-01" },
      { id: "DG05", name: "Audit Trail Requirements", status: "passed", lastChecked: "2025-12-01" },
    ],
  },
];

const initialFindings: Finding[] = [
  {
    id: 1,
    title: "Access control gap identified",
    framework: "ISO 27001",
    severity: "medium",
    status: "in_progress",
    dueDate: "2026-01-15",
    description: "Gap identified in access control matrix for contractor accounts. Need to implement proper role-based access control.",
    assignee: "Security Team",
  },
  {
    id: 2,
    title: "Data retention policy update needed",
    framework: "SKK Migas",
    severity: "high",
    status: "open",
    dueDate: "2026-01-10",
    description: "Current data retention policy does not meet new SKK Migas guidelines. Policy document needs revision.",
    assignee: "Compliance Team",
  },
  {
    id: 3,
    title: "Incident response procedure review",
    framework: "ISO 27001",
    severity: "low",
    status: "resolved",
    dueDate: "2025-12-20",
    description: "Annual review of incident response procedures completed. Minor updates applied to escalation matrix.",
    assignee: "IT Operations",
  },
  {
    id: 4,
    title: "Third-party risk assessment pending",
    framework: "COBIT 2019",
    severity: "medium",
    status: "open",
    dueDate: "2026-01-20",
    description: "Annual third-party vendor risk assessment required for all critical vendors.",
    assignee: "Vendor Management",
  },
  {
    id: 5,
    title: "Service catalog documentation incomplete",
    framework: "ITIL 4",
    severity: "low",
    status: "in_progress",
    dueDate: "2026-02-01",
    description: "Service catalog missing SLA definitions for 3 new services launched in Q4.",
    assignee: "Service Desk",
  },
];

const Compliance = () => {
  // State management
  const [frameworks] = useState<Framework[]>(initialFrameworks);
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Dialog states
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isFindingDialogOpen, setIsFindingDialogOpen] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  // Calculate stats dynamically
  const stats = useMemo(() => {
    const compliant = frameworks.filter((f) => f.status === "compliant").length;
    const underReview = frameworks.filter((f) => f.status === "review").length;
    const openFindings = findings.filter((f) => f.status !== "resolved").length;
    const nextAuditDate = frameworks
      .map((f) => f.nextAudit)
      .sort()[0];
    return { compliant, underReview, openFindings, nextAuditDate };
  }, [frameworks, findings]);

  // Handle view report
  const handleViewReport = (framework: Framework) => {
    setSelectedFramework(framework);
    setIsReportDialogOpen(true);
  };

  // Handle external link
  const handleExternalLink = (url: string, name: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`Opening ${name} documentation`);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLastRefreshed(new Date());
    setIsRefreshing(false);
    toast.success("Data refreshed successfully");
  };

  // Handle view finding
  const handleViewFinding = (finding: Finding) => {
    setSelectedFinding(finding);
    setIsFindingDialogOpen(true);
  };

  // Handle download report
  const handleDownloadReport = (framework: Framework) => {
    const reportData = {
      framework: framework.name,
      score: framework.score,
      status: framework.status,
      lastAudit: framework.lastAudit,
      nextAudit: framework.nextAudit,
      controls: framework.controlDetails,
      generatedAt: new Date().toISOString(),
    };

    const content = JSON.stringify(reportData, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${framework.name.replace(/[^a-z0-9]/gi, "_")}_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded ${framework.name} report`);
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "review":
        return <AlertTriangle className="w-5 h-5 text-amber" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 75) return "text-amber";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Governance & Compliance"
        subtitle="Framework compliance status and audit management"
      />
      <div className="p-6 space-y-6">
        {/* Overall Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
                <div>
                  <p className="text-3xl font-bold">{stats.compliant}</p>
                  <p className="text-sm text-muted-foreground">Compliant</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-3xl font-bold">{stats.underReview}</p>
                  <p className="text-sm text-muted-foreground">Under Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-info" />
                <div>
                  <p className="text-3xl font-bold">{stats.openFindings}</p>
                  <p className="text-sm text-muted-foreground">Open Findings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <Calendar className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-3xl font-bold">
                    {new Date(stats.nextAuditDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-sm text-muted-foreground">Next Audit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Framework Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {frameworks.map((framework, index) => (
            <Card
              key={framework.id}
              className="hover:shadow-lg transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        framework.status === "compliant"
                          ? "bg-success/10"
                          : "bg-amber-100"
                      }`}
                    >
                      <Shield
                        className={`w-6 h-6 ${
                          framework.status === "compliant"
                            ? "text-success"
                            : "text-amber"
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{framework.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {framework.description}
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(framework.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Compliance Score
                  </span>
                  <span className={`text-2xl font-bold ${getScoreColor(framework.score)}`}>
                    {framework.score}%
                  </span>
                </div>
                <Progress value={framework.score} className="h-2" />

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Last Audit</p>
                    <p className="text-sm font-medium">{framework.lastAudit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Audit</p>
                    <p className="text-sm font-medium">{framework.nextAudit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Controls</p>
                    <p className="text-sm font-medium">{framework.controls}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Open Findings</p>
                    <p className="text-sm font-medium text-amber">{framework.findings}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewReport(framework)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExternalLink(framework.documentationUrl, framework.name)}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Findings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Findings</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {findings.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handleViewFinding(finding)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        finding.severity === "high"
                          ? "bg-destructive"
                          : finding.severity === "medium"
                          ? "bg-amber-500"
                          : "bg-info"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{finding.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {finding.framework} • Due: {finding.dueDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        finding.status === "resolved"
                          ? "badge-active"
                          : finding.status === "in_progress"
                          ? "badge-pending"
                          : "bg-destructive/10 text-destructive border-destructive/30"
                      }
                    >
                      {finding.status.replace("_", " ")}
                    </Badge>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* View Report Dialog */}
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {selectedFramework?.name} - Compliance Report
              </DialogTitle>
              <DialogDescription>
                {selectedFramework?.description}
              </DialogDescription>
            </DialogHeader>
            {selectedFramework && (
              <div className="space-y-6 py-4">
                {/* Score Overview */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Compliance Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(selectedFramework.score)}`}>
                      {selectedFramework.score}%
                    </span>
                  </div>
                  <Progress value={selectedFramework.score} className="h-3" />
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{selectedFramework.controls}</p>
                    <p className="text-xs text-muted-foreground">Total Controls</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-success/10">
                    <p className="text-2xl font-bold text-success">
                      {selectedFramework.controlDetails.filter((c) => c.status === "passed").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-destructive/10">
                    <p className="text-2xl font-bold text-destructive">
                      {selectedFramework.controlDetails.filter((c) => c.status === "failed").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{selectedFramework.findings}</p>
                    <p className="text-xs text-muted-foreground">Findings</p>
                  </div>
                </div>

                {/* Audit Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Last Audit</p>
                    <p className="font-medium">{selectedFramework.lastAudit}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Next Audit</p>
                    <p className="font-medium">{selectedFramework.nextAudit}</p>
                  </div>
                </div>

                {/* Control Details Table */}
                <div>
                  <h4 className="font-medium mb-3">Control Assessment (Sample)</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Control ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Checked</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedFramework.controlDetails.map((control) => (
                          <TableRow key={control.id}>
                            <TableCell className="font-mono">{control.id}</TableCell>
                            <TableCell>{control.name}</TableCell>
                            <TableCell>
                              {control.status === "passed" ? (
                                <Badge className="badge-active">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Passed
                                </Badge>
                              ) : control.status === "failed" ? (
                                <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </Badge>
                              ) : (
                                <Badge variant="secondary">N/A</Badge>
                              )}
                            </TableCell>
                            <TableCell>{control.lastChecked}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => selectedFramework && handleDownloadReport(selectedFramework)}
                className="bg-accent hover:bg-accent/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Finding Dialog */}
        <Dialog open={isFindingDialogOpen} onOpenChange={setIsFindingDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Finding Details
              </DialogTitle>
            </DialogHeader>
            {selectedFinding && (
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-3 h-3 rounded-full mt-1.5 ${
                      selectedFinding.severity === "high"
                        ? "bg-destructive"
                        : selectedFinding.severity === "medium"
                        ? "bg-amber-500"
                        : "bg-info"
                    }`}
                  />
                  <div>
                    <h3 className="font-semibold">{selectedFinding.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{selectedFinding.framework}</Badge>
                      <Badge
                        className={
                          selectedFinding.severity === "high"
                            ? "bg-destructive/10 text-destructive border-destructive/30"
                            : selectedFinding.severity === "medium"
                            ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-info/10 text-info border-info/30"
                        }
                      >
                        {selectedFinding.severity}
                      </Badge>
                      <Badge
                        className={
                          selectedFinding.status === "resolved"
                            ? "badge-active"
                            : selectedFinding.status === "in_progress"
                            ? "badge-pending"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        }
                      >
                        {selectedFinding.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="font-medium">{selectedFinding.dueDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assignee</p>
                    <p className="font-medium">{selectedFinding.assignee || "Unassigned"}</p>
                  </div>
                </div>

                {selectedFinding.description && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Description</p>
                    <p className="text-sm bg-muted/50 p-3 rounded">{selectedFinding.description}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFindingDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Compliance;
