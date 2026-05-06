// src/pages/v2/authority/RegisterAdminConsumer.tsx
import { useState } from "react";
import { Users2, Plus, Building2, UserPlus } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useParticipants, useCreateParticipant } from "@/api/hooks/useParticipants";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const RegisterAdminConsumer = () => {
  const { hasPermission } = useAuth();
  const { data: participantsData, isLoading } = useParticipants({ limit: 50 });
  const createParticipant = useCreateParticipant();
  const [open, setOpen] = useState(false);
  const participants = participantsData?.data ?? [];

  const [form, setForm] = useState({
    organization_name: "",
    organization_type: "GOV_CENTRAL" as string,
    address: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  });

  const handleSubmit = () => {
    if (!form.organization_name || !form.contact_email) {
      toast.error("Organization name and contact email are required");
      return;
    }

    createParticipant.mutate(
      {
        organization_name: form.organization_name,
        organization_type: form.organization_type as any,
        address: form.address,
        contact_person: {
          name: form.contact_name,
          email: form.contact_email,
          phone: form.contact_phone,
        },
      },
      {
        onSuccess: () => {
          toast.success("Consumer participant registered successfully");
          setOpen(false);
          setForm({ organization_name: "", organization_type: "GOV_CENTRAL", address: "", contact_name: "", contact_email: "", contact_phone: "" });
        },
        onError: (err: any) => {
          toast.error("Registration failed", { description: err?.response?.data?.error || "Unexpected error" });
        },
      }
    );
  };

  return (
    <V2PageShell title="Register Admin Consumer" subtitle="Register SKK Migas as Admin Consumer participant" status="Live API">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Registered Participants" value={isLoading ? "..." : participants.length} subtitle="Onboarding API" icon={Users2} trend="up" />
        <MetricCard title="Consumer Orgs" value={isLoading ? "..." : participants.filter(p => p.organization_type !== "ENTERPRISE").length} subtitle="Non-enterprise participants" icon={Building2} trend="neutral" />
        <MetricCard title="Provider Orgs" value={isLoading ? "..." : participants.filter(p => p.organization_type === "ENTERPRISE").length} subtitle="Enterprise participants" icon={UserPlus} trend="neutral" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Participant Registry</CardTitle>
            <CardDescription>All registered participants from onboarding API</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={!hasPermission("participants.manage")}>
                <Plus className="h-4 w-4" />
                Register Participant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Register New Consumer Participant</DialogTitle>
                <DialogDescription>Create a new SKK Migas Admin Consumer participant via the onboarding API.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="org_name">Organization Name *</Label>
                  <Input id="org_name" placeholder="e.g. SKK Migas" value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="org_type">Organization Type</Label>
                  <Select value={form.organization_type} onValueChange={(v) => setForm({ ...form, organization_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOV_CENTRAL">Central Government</SelectItem>
                      <SelectItem value="GOV_PROV">Provincial Government</SelectItem>
                      <SelectItem value="GOV_LOCAL">Local Government</SelectItem>
                      <SelectItem value="ENTERPRISE">Enterprise (KKKS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" placeholder="Organization address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contact_name">Contact Name</Label>
                    <Input id="contact_name" placeholder="Name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contact_email">Contact Email *</Label>
                    <Input id="contact_email" type="email" placeholder="admin@skkmigas.go.id" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input id="contact_phone" placeholder="+62..." value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createParticipant.isPending}>
                  {createParticipant.isPending ? "Registering..." : "Register"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Organization", "Type", "Contact", "Email", "Status", "Created"]} isLoading={isLoading}>
            {participants.length > 0 ? (
              participants.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{p.organization_name}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{p.organization_type}</Badge></td>
                  <td className="px-4 py-3 text-sm">{p.contact_person?.name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.contact_person?.email || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-xs gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Invitation Pending
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No participants yet. Click "Register Participant" to begin.
                </td>
              </tr>
            )}
          </DataTable>
        </CardContent>
      </Card>
    </V2PageShell>
  );
};

export default RegisterAdminConsumer;
