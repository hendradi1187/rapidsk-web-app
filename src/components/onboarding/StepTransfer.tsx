import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRightLeft, Lock, Gauge } from "lucide-react";

const transferModes = [
  { id: "pull", name: "Pull Mode", description: "Consumer requests data from provider" },
  { id: "push", name: "Push Mode", description: "Provider sends data to consumer" },
  { id: "stream", name: "Streaming", description: "Real-time continuous data flow" },
];

export const StepTransfer = () => {
  return (
    <div className="space-y-6">
      {/* Transfer Mode */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <ArrowRightLeft className="w-4 h-4" />
          Transfer Mode Configuration
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Select the default data transfer mode for your dataspace
        </p>
        
        <RadioGroup defaultValue="pull" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {transferModes.map((mode) => (
            <div key={mode.id} className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value={mode.id} id={mode.id} className="mt-1" />
              <div className="space-y-1">
                <label htmlFor={mode.id} className="text-sm font-medium leading-none cursor-pointer">
                  {mode.name}
                </label>
                <p className="text-xs text-muted-foreground">{mode.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Security Configuration */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Lock className="w-4 h-4" />
          Security Configuration
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="encryption">Encryption Protocol *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls13">TLS 1.3 (Recommended)</SelectItem>
                  <SelectItem value="tls12">TLS 1.2</SelectItem>
                  <SelectItem value="mtls">Mutual TLS (mTLS)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authMethod">Authentication Method *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                  <SelectItem value="jwt">JWT Token</SelectItem>
                  <SelectItem value="apikey">API Key</SelectItem>
                  <SelectItem value="certificate">Client Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="encryptAtRest" defaultChecked />
              <label htmlFor="encryptAtRest" className="text-sm cursor-pointer">
                Encrypt data at rest
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="encryptInTransit" defaultChecked />
              <label htmlFor="encryptInTransit" className="text-sm cursor-pointer">
                Encrypt data in transit
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="verifyIntegrity" defaultChecked />
              <label htmlFor="verifyIntegrity" className="text-sm cursor-pointer">
                Verify data integrity (checksum)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="auditTransfers" defaultChecked />
              <label htmlFor="auditTransfers" className="text-sm cursor-pointer">
                Audit all data transfers
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Gauge className="w-4 h-4" />
          Performance Settings
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxConcurrent">Max Concurrent Transfers</Label>
            <Input id="maxConcurrent" type="number" defaultValue="10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chunkSize">Chunk Size (MB)</Label>
            <Input id="chunkSize" type="number" defaultValue="64" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeout">Transfer Timeout (seconds)</Label>
            <Input id="timeout" type="number" defaultValue="300" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="retryPolicy">Retry Policy</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exponential">Exponential Backoff</SelectItem>
                <SelectItem value="linear">Linear Retry</SelectItem>
                <SelectItem value="none">No Retry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxRetries">Max Retries</Label>
            <Input id="maxRetries" type="number" defaultValue="3" />
          </div>
        </div>
      </div>
    </div>
  );
};
