import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Shield, Bell, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const complianceFrameworks = [
  { id: "iso27001", name: "ISO 27001", description: "Information Security Management" },
  { id: "cobit", name: "COBIT/ITIL", description: "IT Governance Framework" },
  { id: "skk", name: "SKK Migas", description: "Indonesian Oil & Gas Regulations" },
  { id: "gdpr", name: "GDPR", description: "Data Protection (if applicable)" },
];

const alertTypes = [
  { id: "unauthorized", label: "Unauthorized access attempts" },
  { id: "policy", label: "Policy violations" },
  { id: "transfer", label: "Transfer failures" },
  { id: "expiry", label: "Contract expiration" },
  { id: "quota", label: "Quota exceeded" },
  { id: "anomaly", label: "Anomaly detection" },
];

export const StepMonitoring = () => {
  return (
    <div className="space-y-6">
      {/* Compliance Frameworks */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Shield className="w-4 h-4" />
          Compliance Frameworks
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Select the compliance frameworks to monitor and report against
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {complianceFrameworks.map((framework) => (
            <div
              key={framework.id}
              className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Checkbox 
                id={framework.id} 
                defaultChecked={framework.id === "iso27001" || framework.id === "skk"} 
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={framework.id}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {framework.name}
                  </label>
                  {(framework.id === "iso27001" || framework.id === "cobit") && (
                    <Badge variant="outline" className="text-xs">Recommended</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{framework.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Configuration */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Bell className="w-4 h-4" />
          Alert Configuration
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Configure alerts for security and operational events
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {alertTypes.map((alert) => (
            <div key={alert.id} className="flex items-center space-x-2">
              <Checkbox 
                id={alert.id} 
                defaultChecked={alert.id !== "anomaly"} 
              />
              <label htmlFor={alert.id} className="text-sm cursor-pointer">
                {alert.label}
              </label>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="alertEmail">Alert Email Recipients</Label>
            <Input id="alertEmail" placeholder="admin@company.com, security@company.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alertSeverity">Minimum Alert Severity</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Audit Log Settings */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <FileText className="w-4 h-4" />
          Audit Log Configuration
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="retention">Log Retention Period</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90 Days</SelectItem>
                <SelectItem value="180">6 Months</SelectItem>
                <SelectItem value="365">1 Year</SelectItem>
                <SelectItem value="730">2 Years</SelectItem>
                <SelectItem value="1825">5 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logLevel">Log Detail Level</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="verbose">Verbose</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exportFormat">Export Format</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="immutableLogs" defaultChecked />
            <label htmlFor="immutableLogs" className="text-sm cursor-pointer">
              Enable immutable audit logs (tamper-proof)
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="realTimeMonitor" defaultChecked />
            <label htmlFor="realTimeMonitor" className="text-sm cursor-pointer">
              Enable real-time monitoring dashboard
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="autoReport" />
            <label htmlFor="autoReport" className="text-sm cursor-pointer">
              Generate automated compliance reports (monthly)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
