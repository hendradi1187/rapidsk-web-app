import { useState } from "react";
import { Users2, Plus, Building2, Pencil, Trash2, MailCheck, Badge as BadgeIcon, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  useParticipants,
  useCreateParticipant,
  useDeleteParticipant,
  useUpdateParticipant,
} from "@/api/hooks/useParticipants";
import { formatParticipantDeleteConflict } from "@/api/hooks/useParticipantDeleteGuard";
import { useUsers } from "@/api/hooks/useUsers";
import { usersService } from "@/api/services/identity-provider";
import { ParticipantDeleteDialog } from "@/components/participants/ParticipantDeleteDialog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const emptyForm = {
  organization_name: "",
  address: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
};

const getErrorDescription = (error: any) => {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item: any) => `${item.loc?.join(".") || item.field || "field"}: ${item.msg || item.message || "Invalid value"}`)
      .join(" | ");
  }
  return error?.message || "Unexpected error";
};

const AdminProvider = () => {
  const [params] = useSearchParams();
  const tokenFromUrl = (params.get("token") || "").trim();
  const { hasPermission } = useAuth();
  const { data: participantsData, isLoading } = useParticipants({ limit: 50 });
  const { data: usersData, refetch: refetchUsers } = useUsers({ limit: 100 });
  const createParticipant = useCreateParticipant();
  const updateParticipant = useUpdateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const [open, setOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteConflict, setDeleteConflict] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const participants = participantsData?.data ?? [];
  const users = usersData?.data ?? [];
  const providers = participants.filter((participant) => participant.organization_type === "ENTERPRISE");

  const userByParticipantEmail = (email?: string) => {
    if (!email) return undefined;
    return users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  };

  const [confirmTarget, setConfirmTarget] = useState<{ user_email: string; org_name: string } | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordRepeat, setConfirmPasswordRepeat] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resending, setResending] = useState(false);
  const [inlineResendEmail, setInlineResendEmail] = useState<string | null>(null);

  const resetConfirmState = () => {
    setConfirmTarget(null);
    setConfirmPassword("");
    setConfirmPasswordRepeat("");
    setShowConfirmPassword(false);
  };

  const submitConfirm = async () => {
    if (!tokenFromUrl) {
      toast.error("Token URL wajib");
      return;
    }
    if (!confirmPassword.trim() || confirmPassword.length < 8) {
      toast.error("Password aktivasi minimal 8 karakter");
      return;
    }
    if (confirmPassword !== confirmPasswordRepeat) {
      toast.error("Confirm password tidak sama");
      return;
    }

    setConfirming(true);
    try {
      await usersService.confirmEmail({
        token: tokenFromUrl,
        password: confirmPassword,
      });
      toast.success(`Email ${confirmTarget?.user_email} confirmed`);
      resetConfirmState();
      refetchUsers();
    } catch (error: any) {
      const status = error?.response?.status;
      toast.error(`Confirm failed (HTTP ${status})`, {
        description: getErrorDescription(error),
        duration: 7000,
      });
    } finally {
      setConfirming(false);
    }
  };

  const resendConfirmation = async (email?: string | null, fromDialog = false) => {
    if (!email) {
      toast.error("Email user tidak tersedia");
      return;
    }

    if (fromDialog) {
      setResending(true);
    } else {
      setInlineResendEmail(email);
    }

    try {
      await usersService.resendEmailConfirmation({ email });
      toast.success(`Activation email dikirim ulang ke ${email}`);
    } catch (error: any) {
      const status = error?.response?.status;
      toast.error(`Resend failed (HTTP ${status})`, {
        description: getErrorDescription(error),
        duration: 7000,
      });
    } finally {
      if (fromDialog) {
        setResending(false);
      } else {
        setInlineResendEmail(null);
      }
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProvider(null);
  };

  const handleSubmit = () => {
    if (!form.organization_name || !form.contact_email) {
      toast.error("Organization name and contact email are required");
      return;
    }
    if (!form.address || form.address.length < 3) {
      toast.error("Address is required (min 3 chars)");
      return;
    }
    if (!form.contact_name || !form.contact_phone) {
      toast.error("Contact person name and phone are required");
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
        setDeleteConflict(null);
      },
      onError: (error: any) => {
        const message = formatParticipantDeleteConflict(error, []);
        setDeleteConflict(message);
        toast.error("Failed to delete provider participant", {
          description: message,
          duration: 9000,
        });
      },
    });
  };

  return (
    <V2PageShell title="Admin Provider" subtitle="Register, update, and remove enterprise provider participants for provider-side fulfilment flows." status="Live API">
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-sm">
        <p className="font-medium">Who fills this form?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This page is operated by the <strong>Admin Consumer (SKK Migas)</strong>. It registers an <strong>external KKKS provider participant</strong>.
          After participant creation, linked login creation and activation should continue through onboarding and identity-provider user flows.
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
          <DataTable headers={["Organization", "Contact", "Email", "Login Status", "Created", "Updated", "Actions"]} isLoading={isLoading}>
            {providers.length > 0 ? providers.map((provider) => {
              const matchedUser = userByParticipantEmail(provider.contact_person?.email);
              const verified = matchedUser ? ((matchedUser as any).is_verified ?? matchedUser.is_email_confirmed) : false;

              return (
                <tr key={provider.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{provider.organization_name}</td>
                  <td className="px-4 py-3 text-sm">{provider.contact_person?.name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{provider.contact_person?.email || "-"}</td>
                  <td className="px-4 py-3">
                    {!matchedUser ? (
                      <Badge variant="outline" className="border-slate-400/40 text-[10px] text-slate-400">No login account</Badge>
                    ) : verified ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-500">Active ({matchedUser.username})</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-500">Pending</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 gap-1 border-emerald-500/40 px-2 text-[10px] text-emerald-500"
                          title="Activate provider via POST /confirm-email { token, password }"
                          onClick={() => {
                            setConfirmTarget({ user_email: matchedUser.email, org_name: provider.organization_name });
                            setConfirmPassword("");
                            setConfirmPasswordRepeat("");
                          }}
                        >
                          <MailCheck className="h-3 w-3" />
                          Activate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 gap-1 px-2 text-[10px]"
                          disabled={inlineResendEmail === matchedUser.email}
                          title="Resend activation email"
                          onClick={() => resendConfirmation(matchedUser.email)}
                        >
                          <RefreshCw className="h-3 w-3" />
                          {inlineResendEmail === matchedUser.email ? "Sending..." : "Resend"}
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{provider.created_at ? new Date(provider.created_at).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{provider.updated_at ? new Date(provider.updated_at).toLocaleString() : "-"}</td>
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
              );
            }) : (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No provider participants registered yet</td></tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      <Dialog
        open={!!confirmTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) resetConfirmState();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate {confirmTarget?.org_name}</DialogTitle>
            <DialogDescription>
              Provider <strong>{confirmTarget?.user_email}</strong> belum activate. Backend sekarang minta <code className="rounded bg-muted px-1 text-xs">{`{ token, password }`}</code> saat confirm email, dan token diambil dari URL query.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Activation Token Source</Label>
              <Input
                value={tokenFromUrl ? `Token loaded from URL: ${tokenFromUrl.slice(0, 4)}••••${tokenFromUrl.slice(-4)}` : "Token missing in URL query"}
                readOnly
                className="text-xs"
              />
            </div>
            <div className="grid gap-2">
              <Label>Password Baru</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Minimal 8 karakter"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Confirm Password</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPasswordRepeat}
                  onChange={(event) => setConfirmPasswordRepeat(event.target.value)}
                  placeholder="Ulangi password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs space-y-1">
              <p className="font-medium">Kalau token expired atau email belum masuk:</p>
              <p>Pakai tombol resend untuk hit endpoint <code className="rounded bg-muted px-1">/users/resend-email-confirmation</code> dengan email provider ini.</p>
            </div>
            {!tokenFromUrl && (
              <p className="text-xs text-red-500">Token URL tidak ada. Buka halaman ini pakai activation link user, atau resend email dulu.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resendConfirmation(confirmTarget?.user_email, true)} disabled={resending || !confirmTarget?.user_email}>
              {resending ? "Resending..." : "Resend Email"}
            </Button>
            <Button variant="outline" onClick={resetConfirmState}>Cancel</Button>
            <Button onClick={submitConfirm} disabled={confirming || !tokenFromUrl || !confirmPassword.trim() || !confirmPasswordRepeat.trim()}>
              {confirming ? "Activating..." : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ParticipantDeleteDialog
        participant={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
            setDeleteConflict(null);
          }
        }}
        onConfirm={handleDelete}
        isDeleting={deleteParticipant.isPending}
        serverConflict={deleteConflict}
      />
    </V2PageShell>
  );
};

export default AdminProvider;
