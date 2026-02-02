import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ExternalLink,
  RefreshCw,
  Calendar,
} from "lucide-react";

const frameworks = [
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
  },
];

const recentFindings = [
  {
    id: 1,
    title: "Access control gap identified",
    framework: "ISO 27001",
    severity: "medium",
    status: "in_progress",
    dueDate: "2026-01-15",
  },
  {
    id: 2,
    title: "Data retention policy update needed",
    framework: "SKK Migas",
    severity: "high",
    status: "open",
    dueDate: "2026-01-10",
  },
  {
    id: 3,
    title: "Incident response procedure review",
    framework: "ISO 27001",
    severity: "low",
    status: "resolved",
    dueDate: "2025-12-20",
  },
];

const Compliance = () => {
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
                  <p className="text-3xl font-bold">3</p>
                  <p className="text-sm text-muted-foreground">Compliant</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-amber" />
                <div>
                  <p className="text-3xl font-bold">1</p>
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
                  <p className="text-3xl font-bold">18</p>
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
                  <p className="text-3xl font-bold">Jan 15</p>
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
                  <Button variant="outline" size="sm" className="flex-1">
                    View Report
                  </Button>
                  <Button variant="outline" size="sm">
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
            <CardTitle>Recent Findings</CardTitle>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        finding.severity === "high"
                          ? "bg-destructive"
                          : finding.severity === "medium"
                          ? "bg-amber"
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
                  <Badge
                    className={
                      finding.status === "resolved"
                        ? "badge-active"
                        : finding.status === "in_progress"
                        ? "badge-pending"
                        : "bg-destructive/10 text-destructive"
                    }
                  >
                    {finding.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Compliance;
