import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Shield, Clock } from "lucide-react";

const policyTemplates = [
  { id: "open", name: "Open Access", description: "No restrictions, available to all participants" },
  { id: "restricted", name: "Restricted Access", description: "Requires approval from data owner" },
  { id: "bilateral", name: "Bilateral Agreement", description: "Only between specific parties" },
  { id: "custom", name: "Custom Policy", description: "Define your own access rules" },
];

const usageConditions = [
  { id: "read", label: "Read Access" },
  { id: "download", label: "Download" },
  { id: "transform", label: "Transform/Process" },
  { id: "distribute", label: "Redistribute" },
  { id: "commercial", label: "Commercial Use" },
  { id: "research", label: "Research Only" },
];

export const StepContract = () => {
  return (
    <div className="space-y-6">
      {/* Contract Template */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <FileText className="w-4 h-4" />
          Contract Template
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Select a base policy template for your data sharing agreements
        </p>
        
        <RadioGroup defaultValue="restricted" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policyTemplates.map((template) => (
            <div key={template.id} className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
              <div className="space-y-1">
                <label htmlFor={template.id} className="text-sm font-medium leading-none cursor-pointer">
                  {template.name}
                </label>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Usage Permissions */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Shield className="w-4 h-4" />
          Default Usage Permissions
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Select the default permissions for data consumers
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {usageConditions.map((condition) => (
            <div key={condition.id} className="flex items-center space-x-2">
              <Checkbox 
                id={condition.id} 
                defaultChecked={condition.id === "read" || condition.id === "research"} 
              />
              <label htmlFor={condition.id} className="text-sm cursor-pointer">
                {condition.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Time Constraints */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Clock className="w-4 h-4" />
          Time Constraints
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Default Contract Duration</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
                <SelectItem value="180">6 Months</SelectItem>
                <SelectItem value="365">1 Year</SelectItem>
                <SelectItem value="unlimited">Unlimited</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="renewalPolicy">Renewal Policy</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-renewal</SelectItem>
                <SelectItem value="manual">Manual renewal</SelectItem>
                <SelectItem value="none">No renewal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notificationDays">Expiry Notification (days)</Label>
            <Input id="notificationDays" type="number" defaultValue="14" />
          </div>
        </div>
      </div>

      {/* Approval Workflow */}
      <div className="pt-4 border-t border-border">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="requireApproval" defaultChecked />
            <label htmlFor="requireApproval" className="text-sm font-medium cursor-pointer">
              Require approval for all data access requests
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="multiLevel" />
            <label htmlFor="multiLevel" className="text-sm cursor-pointer">
              Enable multi-level approval workflow
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="auditLog" defaultChecked />
            <label htmlFor="auditLog" className="text-sm cursor-pointer">
              Log all contract negotiations and changes
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
