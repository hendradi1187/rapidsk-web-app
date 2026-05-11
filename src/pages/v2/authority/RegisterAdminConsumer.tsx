import { useEffect, useMemo, useState } from "react";
import { Users2, Plus, Building2, UserPlus, ShieldCheck, Eye, EyeOff, Pencil, Trash2, MailCheck, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
  useUserCategories,
  useUserGroups,
} from "@/api/hooks/useUsers";
import { usersService } from "@/api/services/identity-provider";
import { useParticipants } from "@/api/hooks/useParticipants";
import type { UserResponse } from "@/api/types/identity-provider";
import { useAuth, deriveRole } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/config/rbac";
import { toast } from "sonner";

type RoleChoice = "INTERNAL" | "CONSUMER" | "PROVIDER";
type Mode = "create" | "edit";

const emptyForm = {
  username: "",
  full_name: "",
  email: "",
  password: "",
  confirm_password: "",
  category_id: "",
  group_id: "",
  participant_id: "",
};

const detectRoleFromCategory = (code: string): RoleChoice => {
  const upper = (code || "").toUpperCase();
  if (upper === "PROVIDER") return "PROVIDER";
  if (upper === "CONSUMER") return "CONSUMER";
  return "INTERNAL";
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
  if (data?.errors && typeof data.errors === "object") {
    return Object.entries(data.errors)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join(" | ");
  }
  return error?.message || "Unexpected error";
};

const RegisterAdminConsumer = () => {
  const [params] = useSearchParams();
  const tokenFromUrl = (params.get("token") || "").trim();
  const { hasPermission } = useAuth();
  const { data: usersData, isLoading, refetch: refetchUsers } = useUsers({ limit: 100 });
  const { data: categoriesData } = useUserCategories({ limit: 100 });
  const { data: groupsData } = useUserGroups({ limit: 100 });
  const { data: participantsData } = useParticipants({ limit: 100 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const users = usersData?.data ?? [];
  const categories = categoriesData?.data ?? [];
  const groups = groupsData?.data ?? [];
  const allParticipants = participantsData?.data ?? [];

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null);
  const [role, setRole] = useState<RoleChoice>("INTERNAL");
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState("");

  const [confirmDialog, setConfirmDialog] = useState<UserResponse | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordRepeat, setConfirmPasswordRepeat] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmingPending, setConfirmingPending] = useState(false);
  const [resendingPending, setResendingPending] = useState(false);
  const [inlineResendEmail, setInlineResendEmail] = useState<string | null>(null);

  const roleCompatibleCategories = useMemo(
    () => categories.filter((category) => (category.code || "").toUpperCase() === role),
    [categories, role]
  );

  const filteredGroups = useMemo(() => {
    if (!form.category_id) return groups;
    const matched = groups.filter((group) => group.category?.id === form.category_id);
    return matched.length > 0 ? matched : groups;
  }, [groups, form.category_id]);

  useEffect(() => {
    if (mode !== "create") return;
    const matched = categories.find((category) => (category.code || "").toUpperCase() === role);
    setForm((prev) => ({
      ...prev,
      category_id: matched?.id || "",
      group_id: "",
    }));
  }, [role, categories, mode]);

  useEffect(() => {
    if (mode === "create" && form.email && !form.username) {
      setForm((prev) => ({ ...prev, username: prev.email.split("@")[0] }));
    }
  }, [form.email, mode]);

  useEffect(() => {
    if (form.category_id && !form.group_id && filteredGroups[0]?.id) {
      setForm((prev) => ({ ...prev, group_id: filteredGroups[0].id }));
    }
  }, [form.category_id, form.group_id, filteredGroups]);

  const resetForm = () => {
    setForm(emptyForm);
    setShowPassword(false);
    setEditingUser(null);
    setMode("create");
    setRole("INTERNAL");
  };

  const resetConfirmState = () => {
    setConfirmDialog(null);
    setConfirmPassword("");
    setConfirmPasswordRepeat("");
    setShowConfirmPassword(false);
  };

  const openCreate = () => {
    resetForm();
    setMode("create");
    setOpen(true);
  };

  const openEdit = (user: UserResponse) => {
    setMode("edit");
    setEditingUser(user);
    setRole(detectRoleFromCategory(user.category?.code || ""));
    setForm({
      username: user.username || user.email?.split("@")[0] || "",
      full_name: user.full_name || "",
      email: user.email,
      password: "",
      confirm_password: "",
      category_id: user.category?.id || "",
      group_id: user.group?.id || "",
      participant_id: "",
    });
    setOpen(true);
  };

  const validate = (): string | null => {
    if (!form.email.trim()) return "Email required";
    if (mode === "create") {
      if (!form.username.trim()) return "Username required";
      if (!form.password.trim() || form.password.length < 8) return "Password min 8 chars";
      if (form.password !== form.confirm_password) return "Password confirmation does not match";
      if ((role === "CONSUMER" || role === "PROVIDER") && !form.participant_id) {
        return "Participant linkage required for consumer/provider user";
      }
    }
    if (mode === "edit" && form.password && form.password.length < 8) {
      return "If changing password, min 8 chars";
    }
    if (mode === "edit" && form.password && form.password !== form.confirm_password) {
      return "Password confirmation does not match";
    }
    if (!form.category_id) return "Category required";
    if (!form.group_id) return "Group required";
    return null;
  };

  const previewRole = useMemo(() => {
    const categoryCode = categories.find((category) => category.id === form.category_id)?.code || "";
    const groupCode = groups.find((group) => group.id === form.group_id)?.code || "";
    if (!categoryCode && !groupCode) return null;
    return deriveRole(categoryCode, groupCode);
  }, [categories, groups, form.category_id, form.group_id]);

  const handleSubmit = async () => {
    const errorMessage = validate();
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    if (mode === "edit" && editingUser) {
      const payload: Record<string, any> = {
        email: form.email.trim() || editingUser.email,
        full_name: form.full_name.trim() || editingUser.full_name || null,
        category_id: form.category_id || editingUser.category?.id,
        group_id: form.group_id || editingUser.group?.id,
      };
      if (form.username.trim()) payload.username = form.username.trim();
      if (form.password.trim()) payload.password = form.password.trim();

      try {
        await updateUser.mutateAsync({ id: editingUser.id, data: payload });
        setOpen(false);
        resetForm();
      } catch (error: any) {
        const status = error?.response?.status;
        toast.error(`Update failed (HTTP ${status})`, {
          description: getErrorDescription(error),
          duration: 8000,
        });
      }
      return;
    }

    try {
      const created = await createUser.mutateAsync({
        username: form.username.trim(),
        full_name: form.full_name.trim() || form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        category_id: form.category_id,
        group_id: form.group_id,
        participant_id: form.participant_id || null,
      });
      toast.success(`User "${created.username || form.username}" created`, {
        description: "Akun belum selesai dipakai sampai email confirmation berhasil dengan token + password.",
        duration: 7000,
      });
      setOpen(false);
      resetForm();
    } catch {
      // mutation hook already toasts
    }
  };

  const submitConfirm = async () => {
    if (!tokenFromUrl) {
      toast.error("Token URL wajib tersedia");
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

    setConfirmingPending(true);
    try {
      await usersService.confirmEmail({
        token: tokenFromUrl,
        password: confirmPassword,
      });
      toast.success(`${confirmDialog?.username || confirmDialog?.email} email confirmed`);
      resetConfirmState();
      await refetchUsers();
    } catch (error: any) {
      const status = error?.response?.status;
      toast.error(`Confirm failed (HTTP ${status})`, {
        description: getErrorDescription(error),
        duration: 8000,
      });
    } finally {
      setConfirmingPending(false);
    }
  };

  const resendConfirmation = async (email?: string | null, fromDialog = false) => {
    if (!email) {
      toast.error("Email user tidak tersedia");
      return;
    }

    if (fromDialog) {
      setResendingPending(true);
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
        duration: 8000,
      });
    } finally {
      if (fromDialog) {
        setResendingPending(false);
      } else {
        setInlineResendEmail(null);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // mutation hook already toasts
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        if (!search) return true;
        const haystack = `${user.username || ""} ${user.email || ""} ${user.full_name || ""} ${user.category?.code || ""} ${user.group?.code || ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [users, search]
  );

  const consumerUsers = users.filter((user) => deriveRole(user.category?.code || "", user.group?.code || "") === "CONSUMER").length;
  const providerUsers = users.filter((user) => deriveRole(user.category?.code || "", user.group?.code || "") === "PROVIDER").length;
  const superAdminUsers = users.filter((user) => deriveRole(user.category?.code || "", user.group?.code || "", user.group?.code === "SUPERADMIN") === "SUPER_ADMIN").length;

  return (
    <V2PageShell
      title="Register Admin Login (Consumer / Provider)"
      subtitle="Manual user registry untuk Identity Provider. Onboarding participant utama sekarang ada di authority onboarding."
      status="Live API"
    >
      <Card className="border-border/50 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <div className="text-sm">
            <p className="font-medium">Halaman ini bikin login account manual, bukan pintu daftar participant utama.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Participant baru sekarang daftarnya lewat <code className="rounded bg-muted px-1">/v2/authority/participant-registration</code>,
              lalu linked user dibuat memakai <code className="rounded bg-muted px-1">participant_id</code>. Halaman ini tetap dipakai
              untuk koreksi account, resend activation email, dan operasi user manual yang tidak lewat onboarding wizard.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Login Accounts" value={isLoading ? "..." : users.length} subtitle="Identity-provider users" icon={Users2} trend="up" />
        <MetricCard title="Super Admin" value={isLoading ? "..." : superAdminUsers} subtitle="Platform admins" icon={ShieldCheck} trend="neutral" />
        <MetricCard title="Consumer Admin" value={isLoading ? "..." : consumerUsers} subtitle="Government / SKK" icon={Building2} trend="neutral" />
        <MetricCard title="Provider Admin" value={isLoading ? "..." : providerUsers} subtitle="KKKS / Enterprise" icon={UserPlus} trend="neutral" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Login Accounts</CardTitle>
            <CardDescription>Semua akun dari /identity-provider/users. Create, edit, delete, confirm email, dan resend activation ada di sini.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username/email/role..." className="w-60" />
            <Button size="sm" className="gap-2" disabled={!hasPermission("users.manage")} onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Register Admin Login
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Username", "Full Name", "Email", "Derived Role", "Active", "Verified", "Created", "Updated", "Actions"]} isLoading={isLoading}>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isSuper = user.group?.code === "SUPERADMIN";
                const derived = deriveRole(user.category?.code || "", user.group?.code || "", isSuper);
                const verified = user.is_verified ?? user.is_email_confirmed ?? false;
                const active = user.is_active ?? true;

                return (
                  <tr key={user.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{user.username || "-"}</td>
                    <td className="px-4 py-3 text-sm">{user.full_name || "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{ROLE_LABELS[derived]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {active ? (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-500/30 text-red-500 text-xs">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {verified ? (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-xs">Verified</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-xs">Pending</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 gap-1 border-emerald-500/40 px-2 text-[10px] text-emerald-500"
                            disabled={!hasPermission("users.manage")}
                            title="POST /users/confirm-email { token, password }"
                            onClick={() => {
                              setConfirmDialog(user);
                              setConfirmPassword("");
                              setConfirmPasswordRepeat("");
                            }}
                          >
                            <MailCheck className="h-3 w-3" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 gap-1 px-2 text-[10px]"
                            disabled={!hasPermission("users.manage") || inlineResendEmail === user.email}
                            title="POST /users/resend-email-confirmation { email }"
                            onClick={() => resendConfirmation(user.email)}
                          >
                            <RefreshCw className="h-3 w-3" />
                            {inlineResendEmail === user.email ? "Sending..." : "Resend"}
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{user.created_at ? new Date(user.created_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{user.updated_at ? new Date(user.updated_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1" disabled={!hasPermission("users.manage")} onClick={() => openEdit(user)}>
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!hasPermission("users.manage")} onClick={() => setDeleteTarget(user)}>
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {search ? "No users match the search." : "No login accounts yet. Click \"Register Admin Login\"."}
                </td>
              </tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? `Edit User - ${editingUser?.username || editingUser?.email}` : "Register Admin Login"}</DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "PATCH /identity-provider/users/{id}. Password hanya berubah kalau diisi, dan participant linkage memang tidak tersedia di endpoint update."
                : "POST /identity-provider/users/. Untuk CONSUMER dan PROVIDER, participant linkage ditetapkan saat create dan email confirmation tetap wajib diselesaikan."}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={role} onValueChange={(value) => setRole(value as RoleChoice)} className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="INTERNAL" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Internal (Platform)
              </TabsTrigger>
              <TabsTrigger value="CONSUMER" className="gap-2">
                <Building2 className="h-4 w-4" />
                Consumer (SKK)
              </TabsTrigger>
              <TabsTrigger value="PROVIDER" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Provider (KKKS)
              </TabsTrigger>
            </TabsList>

            <TabsContent value={role} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Username {mode === "create" && "*"}</Label>
                  <Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder={mode === "create" ? "auto-derived from email" : "leave to keep"} />
                </div>
                <div className="grid gap-2">
                  <Label>Full Name</Label>
                  <Input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="Optional" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder={role === "INTERNAL" ? "admin@gxspace.com" : role === "CONSUMER" ? "admin@skkmigas.go.id" : "admin@kkks.com"} />
                </div>
                <div className="grid gap-2">
                  <Label>Password {mode === "create" ? "*" : <span className="text-muted-foreground">(leave blank to keep)</span>}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      placeholder={mode === "create" ? "Min 8 chars" : "Only if changing"}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((previous) => !previous)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Confirm Password {mode === "create" ? "*" : <span className="text-muted-foreground">(required if changing password)</span>}</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.confirm_password}
                    onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
                    placeholder={mode === "create" ? "Repeat password" : "Repeat if changing"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category *</Label>
                  <Select value={form.category_id} onValueChange={(value) => setForm({ ...form, category_id: value, group_id: "" })}>
                    <SelectTrigger><SelectValue placeholder={`Pick ${role.toLowerCase()} category`} /></SelectTrigger>
                    <SelectContent>
                      {(roleCompatibleCategories.length > 0 ? roleCompatibleCategories : categories).map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name || category.code} ({category.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Group *</Label>
                  <Select value={form.group_id} onValueChange={(value) => setForm({ ...form, group_id: value })} disabled={!form.category_id}>
                    <SelectTrigger><SelectValue placeholder={form.category_id ? "Pick group" : "Pick category first"} /></SelectTrigger>
                    <SelectContent>
                      {filteredGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>{group.name || group.code} ({group.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {mode === "create" && (role === "CONSUMER" || role === "PROVIDER") && (
                <div className="grid gap-2">
                  <Label>Link to Participant (Org) *</Label>
                  <Select value={form.participant_id} onValueChange={(value) => setForm({ ...form, participant_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={role === "PROVIDER" ? "Pilih KKKS yang user ini admin-nya" : "Pilih organisasi consumer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {allParticipants
                        .filter((participant) => role === "PROVIDER" ? participant.organization_type === "ENTERPRISE" : participant.organization_type !== "ENTERPRISE")
                        .map((participant) => (
                          <SelectItem key={participant.id} value={participant.id}>
                            {participant.organization_name} ({participant.organization_type})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Endpoint create user sekarang menerima <code className="rounded bg-muted px-1">participant_id</code>. Link ini hanya dipasang saat create karena endpoint PATCH user memang tidak expose participant linkage.
                  </p>
                </div>
              )}

              {previewRole && (
                <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs">
                  <p>
                    Login akan derive ke role: <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[previewRole]}</Badge>
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createUser.isPending || updateUser.isPending}>
              {createUser.isPending || updateUser.isPending
                ? mode === "edit" ? "Saving..." : "Creating..."
                : mode === "edit" ? "Save Changes" : `Register ${role} Admin`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmDialog}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) resetConfirmState();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Email - {confirmDialog?.username || confirmDialog?.email}</DialogTitle>
            <DialogDescription>
              POST <code className="rounded bg-muted px-1 text-xs">/api/v1/identity-provider/users/confirm-email</code> dengan body <code className="rounded bg-muted px-1 text-xs">{`{ token, password }`}</code>. Token diambil dari URL query, bukan input manual.
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
              <Label>Password Baru *</Label>
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
              <Label>Confirm Password *</Label>
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
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs space-y-1.5">
              <p className="font-medium">Backend sekarang butuh token dan password sekaligus.</p>
              <p>Kalau email aktivasi belum masuk atau token expired, pakai tombol resend di bawah untuk hit endpoint <code className="rounded bg-muted px-1">/users/resend-email-confirmation</code>.</p>
            </div>
            {!tokenFromUrl && (
              <p className="text-xs text-red-500">Token URL tidak ada. Ambil token dari activation link email user, lalu buka halaman ini memakai query token itu.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resendConfirmation(confirmDialog?.email, true)} disabled={resendingPending || !confirmDialog?.email}>
              {resendingPending ? "Resending..." : "Resend Email"}
            </Button>
            <Button variant="outline" onClick={resetConfirmState}>Cancel</Button>
            <Button onClick={submitConfirm} disabled={confirmingPending || !tokenFromUrl || !confirmPassword.trim() || !confirmPasswordRepeat.trim()}>
              {confirmingPending ? "Confirming..." : "Confirm Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Login Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong>{deleteTarget?.username || deleteTarget?.email}</strong> akan dihapus dari identity-provider. User ini tidak akan bisa login lagi. Aksi ini tidak bisa di-undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive" disabled={deleteUser.isPending}>
              {deleteUser.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default RegisterAdminConsumer;
