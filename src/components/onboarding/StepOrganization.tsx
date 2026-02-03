import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Users, MapPin } from "lucide-react";

export const StepOrganization = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organization Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Building2 className="w-4 h-4" />
            Organization Details
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input id="orgName" placeholder="e.g., PT Pertamina Hulu Energi" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgType">Organization Type *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kkks">KKKS (Kontraktor Kontrak Kerja Sama)</SelectItem>
                <SelectItem value="skk">SKK Migas</SelectItem>
                <SelectItem value="vendor">Vendor/Service Provider</SelectItem>
                <SelectItem value="regulator">Regulator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workArea">Working Area / Block *</Label>
            <Input id="workArea" placeholder="e.g., Cepu Block, Rokan Block" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Brief description of your organization..."
              rows={3}
            />
          </div>
        </div>

        {/* Contact & Location */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <MapPin className="w-4 h-4" />
            Contact & Location
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea 
              id="address" 
              placeholder="Full address..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="Jakarta" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input id="province" placeholder="DKI Jakarta" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input id="contactEmail" type="email" placeholder="admin@company.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input id="contactPhone" placeholder="+62 21 xxxx xxxx" />
          </div>
        </div>
      </div>

      {/* Initial Participants */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Users className="w-4 h-4" />
          Initial Admin User
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="adminName">Full Name *</Label>
            <Input id="adminName" placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email *</Label>
            <Input id="adminEmail" type="email" placeholder="john@company.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminRole">Role *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="kkks_admin">KKKS Admin</SelectItem>
                <SelectItem value="data_steward">Data Steward</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
