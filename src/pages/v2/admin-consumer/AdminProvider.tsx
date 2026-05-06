import { useState } from "react";
import { Users2, Plus, Building2, Pencil, Trash2 } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  useParticipants,
  useCreateParticipant,
  useDeleteParticipant,
  useUpdateParticipant,
} from "@/api/hooks/useParticipants";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const emptyForm = {
  organization_name: "",
  address: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
};

const AdminProvider = () => {
  const { hasPermission } = useAuth();
  const { data: participantsData, isLoading } = useParticipants({ limit: 50 });
  const createParticipant = useCreateParticipant();
  const updateParticipant = useUpdateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const [open, setOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const participants = participantsData?.data ?? [];
  const providers = participants.filter((participant) => participant.organization_type === "ENTERPRISE");

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProvider(null);
  };

  const handleSubmit = () => {
    if (!form.organization_name || !form.contact_email) {
      toast.error("Organization name and contact email are required");
      return;
    }

    const payload = {
      organization_name: form.organization_name,
      organization_type: "ENTERPRISE" as const,
      address: form.address,
      contact_person: {
        name: form.contact_name,
        email: form.contact_email,
        phone: form.contact_phone,
      },
    };

    if (editingProvider) {
      updateParticipant.mutate(
        { id: editingProvider.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Provider KKKS updated successfully");
            setOpen(false);
            resetForm();
          },
        }
      );
      return;
    }

    createParticipant.mutate(payload, {
      onSuccess: () => {
        toast.success("Provider KKKS registered successfully");
        setOpen(false);
        resetForm();
      },
    });
  };

  const handleEdit = (provider: any) => {
    setEditingProvider(provider);
    setForm({
      organization_name: provider.organization_name || "",
      address: provider.address || "",
      contact_name: provider.contact_person?.name || "",
      contact_email: provider.contact_person?.email || "",
      contact_phone: provider.contact_person?.phone || "",
    });
    setOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteParticipant.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Provider removed successfully");
        setDeleteTarget(null);
      },
    });
  };

  return (
    <V2PageShell title="Admin Provider" subtitle="Register, update, and remove enterprise provider participants for provider-side fulfilment flows." status="Live API">
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-sm">
        <p className="font-medium">Who fills this form?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This page is operated by the <strong>Admin Consumer (SKK Migas)</strong>. Each entry here registers an
          <strong> external KKKS provider organization</strong> — not your own organization. The KKKS itself does
          not self-register on this page; their own admin only logs in <em>after</em> the consumer creates them and
          assigns domains in <code className="rounded bg-muted px-1">Domain Mapping</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title="Total Providers" value={isLoading ? "..." : providers.length} subtitle="Enterprise-type participants" icon={Building2} trend="up" />
        <MetricCard title="All Participants" value={isLoading ? "..." : participants.length} subtitle="Including consumer-side organizations" icon={Users2} trend="neutral" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Provider Registry (KKKS)</CardTitle>
            <CardDescription>Enterprise participants used as data providers</CardDescription>
          </div>
          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={!hasPermission("participants.manage")}>
                <Plus className="h-4 w-4" />
                Register Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProvider ? "Edit KKKS Provider" : "Register KKKS Provider"}</DialogTitle>
                <DialogDescription>Create or update an enterprise participant that will operate as provider in V2.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Organization Name *</Label>
                  <Input placeholder="e.g. PT Pertamina Hulu Energi" value={form.organization_name} onChange={(event) => setForm({ ...form, organization_name: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Address</Label>
                  <Input placeholder="Organization address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Contact Name</Label>
                    <Input value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Contact Email *</Label>
                    <Input type="email" value={form.contact_email} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Contact Phone</Label>
                  <Input value={form.contact_phone} onChange={(event) => setForm({ ...form, contact_phone: event.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={(createParticipant.isPending || updateParticipant.isPending) || !hasPermission("participants.manage")}>
                  {createParticipant.isPending || updateParticipant.isPending ? "Saving..." : editingProvider ? "Save Changes" : "Register"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Organization", "Contact", "Email", "Created", "Actions"]} isLoading={isLoading}>
            {providers.length > 0 ? providers.map((provider) => (
              <tr key={provider.id} className="transition-colors hover:bg-muted/20">
                <td className="px-4 py-3 text-sm font-medium">{provider.organization_name}</td>
                <td className="px-4 py-3 text-sm">{provider.contact_person?.name || "-"}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{provider.contact_person?.email || "-"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(provider.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-2" disabled={!hasPermission("participants.manage")} onClick={() => handleEdit(provider)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 border-destructive/40 text-destructive" disabled={!hasPermission("participants.manage")} onClick={() => setDeleteTarget(provider)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No provider participants registered yet</td></tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{deleteTarget?.organization_name || "the selected provider"}</strong> from onboarding. Any downstream domain mapping or provider-side testing linked to it can stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default AdminProvider;
