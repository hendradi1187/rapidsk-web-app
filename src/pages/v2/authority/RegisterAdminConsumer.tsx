// src/pages/v2/authority/RegisterAdminConsumer.tsx
// Full CRUD on Identity Provider users. Login = /identity-provider/auth/login
// validates against /identity-provider/users/. Participant is a separate org
// concept (managed elsewhere).

import { useEffect, useMemo, useState } from "react";
import { Users2, Plus, Building2, UserPlus, ShieldCheck, Eye, EyeOff, Pencil, Trash2, MailCheck, Link as LinkIcon } from "lucide-react";
import { apiClient } from "@/api/client";
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
import type { UserResponse } from "@/api/types/identity-provider";
import { useAuth, deriveRole } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/config/rbac";
import { toast } from "sonner";

type RoleChoice = "CONSUMER" | "PROVIDER";
type Mode = "create" | "edit";

const emptyForm = {
  username: "",
  full_name: "",
  email: "",
  password: "",
  category_id: "",
  group_id: "",
};

const detectRoleFromCategory = (code: string): RoleChoice => {
  const c = (code || "").toUpperCase();
  if (/KKKS|ENTERPRISE/.test(c)) return "PROVIDER";
  return "CONSUMER";
};

const RegisterAdminConsumer = () => {
  const { hasPermission } = useAuth();
  const { data: usersData, isLoading } = useUsers({ limit: 100 });
  const { data: categoriesData } = useUserCategories({ limit: 100 });
  const { data: groupsData } = useUserGroups({ limit: 100 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const users = usersData?.data ?? [];
  const categories = categoriesData?.data ?? [];
  const groups = groupsData?.data ?? [];

  // Confirm via POST /users/confirm-email { token }. Admin paste token
  // dari email user atau dari backend log/DB. Pakai dialog inline.
  const [confirmDialog, setConfirmDialog] = useState<UserResponse | null>(null);
  const [confirmToken, setConfirmToken] = useState("");
  const [confirmingPending, setConfirmingPending] = useState(false);

  const submitConfirm = async () => {
    if (!confirmToken.trim()) {
      toast.error("Token wajib diisi");
      return;
    }
    setConfirmingPending(true);
    try {
      await apiClient.post(`/api/v1/identity-provider/users/confirm-email`, {
        token: confirmToken.trim(),
      });
      toast.success(`${confirmDialog?.username || confirmDialog?.email} email confirmed`);
      setConfirmDialog(null);
      setConfirmToken("");
      setTimeout(() => window.location.reload(), 600);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message;
      toast.error(`Confirm failed (HTTP ${status})`, {
        description: status === 400 || status === 422
          ? "Token invalid atau expired. Cek token di email user atau di backend DB (table users → activation_token)."
          : `${detail || "Unknown error"}`,
        duration: 8000,
      });
    } finally {
      setConfirmingPending(false);
    }
  };

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null);
  const [role, setRole] = useState<RoleChoice>("CONSUMER");
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState("");

  // Filter categories whose code derives to chosen role
  const roleCompatibleCategories = useMemo(() => {
    return categories.filter((c) => {
      const code = (c.code || "").toUpperCase();
      if (role === "PROVIDER") return /KKKS|ENTERPRISE/.test(code);
      if (role === "CONSUMER") return /GOV|SKK|REGULATOR/.test(code);
      return true;
    });
  }, [categories, role]);

  const filteredGroups = useMemo(() => {
    if (!form.category_id) return groups;
    const matched = groups.filter((g) => g.category?.id === form.category_id);
    return matched.length > 0 ? matched : groups;
  }, [groups, form.category_id]);

  // Reset cat/group when role flips (only in create mode)
  useEffect(() => {
    if (mode === "create") {
      setForm((prev) => ({ ...prev, category_id: "", group_id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Auto-derive username from email (only create)
  useEffect(() => {
    if (mode === "create" && form.email && !form.username) {
      setForm((prev) => ({ ...prev, username: prev.email.split("@")[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.email]);

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
      password: "", // never preload; leave blank to keep current
      category_id: user.category?.id || "",
      group_id: user.group?.id || "",
    });
    setOpen(true);
  };

  const validate = (): string | null => {
    if (!form.email) return "Email required";
    if (mode === "create") {
      if (!form.username) return "Username required";
      if (!form.password || form.password.length < 8) return "Password min 8 chars";
    } else if (form.password && form.password.length < 8) {
      return "If changing password, min 8 chars";
    }
    if (!form.category_id) return "Category required";
    if (!form.group_id) return "Group required";
    return null;
  };

  const previewRole = useMemo(() => {
    const cat = categories.find((c) => c.id === form.category_id)?.code || "";
    const grp = groups.find((g) => g.id === form.group_id)?.code || "";
    if (!cat && !grp) return null;
    return deriveRole(cat, grp);
  }, [categories, groups, form.category_id, form.group_id]);

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }

    if (mode === "edit" && editingUser) {
      const payload: Record<string, any> = {
        email: form.email || editingUser.email,
        full_name: form.full_name || editingUser.full_name || null,
        category_id: form.category_id || editingUser.category?.id,
        group_id: form.group_id || editingUser.group?.id,
      };
      if (form.username?.trim()) payload.username = form.username.trim();
      if (form.password?.trim()) payload.password = form.password.trim();

      try {
        await updateUser.mutateAsync({ id: editingUser.id, data: payload });
        setOpen(false);
        resetForm();
      } catch (err: any) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message;
        if (status === 500) {
          toast.error("Backend crash (500) on PATCH user", {
            description: `Backend handler-nya error. Payload yg dikirim: ${JSON.stringify(payload)}. Cek log backend untuk traceback.`,
            duration: 10000,
          });
        } else {
          toast.error(`Update failed (HTTP ${status})`, { description: detail });
        }
      }
      return;
    }

    try {
      const created = await createUser.mutateAsync({
        username: form.username,
        full_name: form.full_name || form.username,
        email: form.email,
        password: form.password,
        category_id: form.category_id,
        group_id: form.group_id,
      });
      toast.info(`User "${created.username || form.username}" can login now`, { duration: 6000 });
      setOpen(false);
      resetForm();
    } catch { /* hook toasts */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch { /* hook toasts */ }
  };

  const filteredUsers = useMemo(() => users.filter((u) => {
    if (!search) return true;
    const hay = `${u.username || ""} ${u.email || ""} ${u.full_name || ""} ${u.category?.code || ""} ${u.group?.code || ""}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  }), [users, search]);

  const consumerUsers = users.filter((u) => deriveRole(u.category?.code || "", u.group?.code || "") === "CONSUMER").length;
  const providerUsers = users.filter((u) => deriveRole(u.category?.code || "", u.group?.code || "") === "PROVIDER").length;
  const superAdminUsers = users.filter((u) => deriveRole(u.category?.code || "", u.group?.code || "", u.is_superadmin) === "SUPER_ADMIN").length;

  return (
    <V2PageShell title="Register Admin Login (Consumer / Provider)" subtitle="Full CRUD untuk akun login admin via Identity Provider." status="Live API">
      <Card className="border-border/50 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <div className="text-sm">
            <p className="font-medium">Halaman ini bikin LOGIN ACCOUNT, bukan organization.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              User di sini langsung bisa login. Role di-derive dari category + group.
              Mau bikin organization (KKKS/SKK)? Halaman terpisah:{" "}
              <code className="rounded bg-muted px-1">/v2/admin-consumer/admin-provider</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Login Accounts" value={isLoading ? "..." : users.length} subtitle="Identity-provider users" icon={Users2} trend="up" />
        <MetricCard title="Super Admin" value={isLoading ? "..." : superAdminUsers} subtitle="Platform admins" icon={ShieldCheck} trend="neutral" />
        <MetricCard title="Consumer Admin" value={isLoading ? "..." : consumerUsers} subtitle="GOV / SKK / Regulator" icon={Building2} trend="neutral" />
        <MetricCard title="Provider Admin" value={isLoading ? "..." : providerUsers} subtitle="KKKS / Enterprise" icon={UserPlus} trend="neutral" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Login Accounts</CardTitle>
            <CardDescription>Semua akun dari /identity-provider/users — Edit / Delete tersedia.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search username/email/role..." className="w-60" />
            <Button size="sm" className="gap-2" disabled={!hasPermission("users.manage")} onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Register Admin Login
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Username", "Full Name", "Email", "Derived Role", "Email Confirmed", "Created", "Actions"]} isLoading={isLoading}>
            {filteredUsers.length > 0 ? filteredUsers.map((u) => {
              const derived = deriveRole(u.category?.code || "", u.group?.code || "", u.is_superadmin);
              return (
                <tr key={u.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{u.username || "—"}</td>
                  <td className="px-4 py-3 text-sm">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{ROLE_LABELS[derived]}</Badge></td>
                  <td className="px-4 py-3">
                    {u.is_email_confirmed ? (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-xs">Confirmed</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-xs">Pending</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 gap-1 border-emerald-500/40 text-emerald-500 text-[10px] px-2"
                          disabled={!hasPermission("users.manage")}
                          title="POST /users/confirm-email { token } — paste token dari email atau backend DB"
                          onClick={() => { setConfirmDialog(u); setConfirmToken(""); }}
                        >
                          <MailCheck className="h-3 w-3" />Confirm Email
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1" disabled={!hasPermission("users.manage")} onClick={() => openEdit(u)}>
                        <Pencil className="h-3 w-3" />Edit
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!hasPermission("users.manage")} onClick={() => setDeleteTarget(u)}>
                        <Trash2 className="h-3 w-3" />Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {search ? "No users match the search." : "No login accounts yet. Click \"Register Admin Login\"."}
                </td>
              </tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? `Edit User — ${editingUser?.username || editingUser?.email}` : "Register Admin Login"}</DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "PATCH /identity-provider/users/{id}. Password hanya diubah kalau diisi."
                : "POST /identity-provider/users/. Akun langsung aktif setelah create."}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={role} onValueChange={(v) => setRole(v as RoleChoice)} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="CONSUMER" className="gap-2">
                <Building2 className="h-4 w-4" />Consumer (SKK/Gov)
              </TabsTrigger>
              <TabsTrigger value="PROVIDER" className="gap-2">
                <UserPlus className="h-4 w-4" />Provider (KKKS)
              </TabsTrigger>
            </TabsList>

            <TabsContent value={role} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Username {mode === "create" && "*"}</Label>
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder={mode === "create" ? "auto-derived from email" : "(leave to keep)"} />
                </div>
                <div className="grid gap-2">
                  <Label>Full Name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={role === "CONSUMER" ? "admin@skkmigas.go.id" : "admin@kkks.com"} />
                </div>
                <div className="grid gap-2">
                  <Label>Password {mode === "create" ? "*" : <span className="text-muted-foreground">(leave blank to keep)</span>}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={mode === "create" ? "Min 8 chars" : "Only if changing"}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category * <span className="text-muted-foreground">(filter by role)</span></Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v, group_id: "" })}>
                    <SelectTrigger><SelectValue placeholder={`Pick ${role.toLowerCase()} category`} /></SelectTrigger>
                    <SelectContent>
                      {(roleCompatibleCategories.length > 0 ? roleCompatibleCategories : categories).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name || c.code} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Group *</Label>
                  <Select value={form.group_id} onValueChange={(v) => setForm({ ...form, group_id: v })} disabled={!form.category_id}>
                    <SelectTrigger><SelectValue placeholder={form.category_id ? "Pick group" : "Pick category first"} /></SelectTrigger>
                    <SelectContent>
                      {filteredGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name || g.code} ({g.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {previewRole && (
                <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs">
                  <p>
                    Login akan derive ke role:{" "}
                    <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[previewRole]}</Badge>
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createUser.isPending || updateUser.isPending}>
              {(createUser.isPending || updateUser.isPending)
                ? (mode === "edit" ? "Saving..." : "Creating...")
                : (mode === "edit" ? "Save Changes" : `Register ${role} Admin`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Email dialog — POST /users/confirm-email { token } */}
      <Dialog open={!!confirmDialog} onOpenChange={(o) => { if (!o) { setConfirmDialog(null); setConfirmToken(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Email — {confirmDialog?.username || confirmDialog?.email}</DialogTitle>
            <DialogDescription>
              POST <code className="rounded bg-muted px-1 text-xs">/api/v1/identity-provider/users/confirm-email</code>
              {" "}dengan body <code className="rounded bg-muted px-1 text-xs">{`{token}`}</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Activation Token *</Label>
              <Input
                value={confirmToken}
                onChange={(e) => setConfirmToken(e.target.value)}
                placeholder="paste token dari email user atau dari backend DB"
                autoFocus
              />
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs space-y-1.5">
              <p className="font-medium">Cara dapatin token:</p>
              <p>1. <strong>Dari email user</strong> — link aktivasi formatnya <code className="rounded bg-muted px-1">/confirm-email?token=XXX</code>, copy nilai <code>token</code>.</p>
              <p>2. <strong>Dari backend log</strong> — saat create user, backend log generate token. Cek <code className="rounded bg-muted px-1">docker logs &lt;backend&gt;</code>.</p>
              <p>3. <strong>Dari backend DB</strong> — biasanya di table <code className="rounded bg-muted px-1">users.activation_token</code> atau separate table <code className="rounded bg-muted px-1">activation_tokens</code>.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmDialog(null); setConfirmToken(""); }}>Cancel</Button>
            <Button onClick={submitConfirm} disabled={confirmingPending || !confirmToken.trim()}>
              {confirmingPending ? "Confirming..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
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
