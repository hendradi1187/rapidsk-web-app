import { useMemo, useState } from "react";
import {
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api-error";
import { usersApi } from "@/api/services/identity";

type CategoryItem = {
  id: string;
  code: string;
  name?: string;
};

type GroupItem = {
  id: string;
  code: string;
  name?: string;
  category?: { code?: string; name?: string };
};

type UserItem = {
  id?: string;
  username?: string | null;
  email?: string | null;
  full_name?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
  participant_id?: string | null;
  category?: { id?: string; code?: string; name?: string };
  group?: { id?: string; code?: string; name?: string };
};

type ParticipantItem = {
  provider_id: string;
  provider_name: string;
};

type CreateUserForm = {
  username: string;
  email: string;
  full_name: string;
  password: string;
  category_id: string;
  group_id: string;
  participant_id: string;
};

const emptyForm: CreateUserForm = {
  username: "",
  email: "",
  full_name: "",
  password: "TempPass123!",
  category_id: "",
  group_id: "",
  participant_id: "__none__",
};

// Kontrak PATCH (UserUpdateRequest) tidak punya participant_id; password opsional
// (hanya dikirim kalau operator sengaja reset). Jadi form edit lebih sempit dari create.
type EditUserForm = {
  id: string;
  username: string;
  email: string;
  full_name: string;
  password: string;
  category_id: string;
  group_id: string;
};

const normalize = (value: string | null | undefined) =>
  String(value ?? "").trim().toLowerCase();

const statusTone = (user: UserItem) => {
  if (user.is_active && user.is_verified) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (user.is_active) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const statusLabel = (user: UserItem) => {
  if (user.is_active && user.is_verified) return "ACTIVE";
  if (user.is_active) return "PENDING_VERIFY";
  return "INVITED";
};

export interface UserDirectoryPanelProps {
  users: UserItem[];
  categories: CategoryItem[];
  groups: GroupItem[];
  participants: ParticipantItem[];
  onChanged: () => Promise<void>;
}

export const UserDirectoryPanel = ({
  users,
  categories,
  groups,
  participants,
  onChanged,
}: UserDirectoryPanelProps) => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateUserForm>(() => ({
    ...emptyForm,
    category_id: categories[0]?.id ?? "",
  }));
  const [busyAction, setBusyAction] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditUserForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "invited" | "pending" | "active">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const groupsByCategoryId = useMemo(() => {
    return categories.reduce<Record<string, GroupItem[]>>((acc, category) => {
      acc[category.id] = groups.filter((group) => {
        const groupCategoryCode = group.category?.code ?? "";
        return normalize(groupCategoryCode) === normalize(category.code);
      });
      return acc;
    }, {});
  }, [categories, groups]);

  const availableGroups = groupsByCategoryId[form.category_id] ?? groups;

  const participantNameById = useMemo(
    () =>
      participants.reduce<Record<string, string>>((acc, participant) => {
        acc[participant.provider_id] = participant.provider_name;
        return acc;
      }, {}),
    [participants],
  );

  const userStatusKey = (user: UserItem): "active" | "pending" | "invited" => {
    if (user.is_active && user.is_verified) return "active";
    if (user.is_active) return "pending";
    return "invited";
  };

  const filteredUsers = useMemo(() => {
    const q = normalize(search);
    return users.filter((user) => {
      if (statusFilter !== "all" && userStatusKey(user) !== statusFilter) return false;
      if (!q) return true;
      return [
        user.full_name,
        user.email,
        user.username,
        user.category?.name,
        user.category?.code,
        user.group?.name,
        user.group?.code,
        participantNameById[user.participant_id ?? ""],
      ].some((value) => normalize(value).includes(q));
    });
  }, [participantNameById, search, statusFilter, users]);

  const invitedCount = users.filter((user) => !user.is_active).length;
  const pendingCount = users.filter((user) => user.is_active && !user.is_verified).length;
  const activeCount = users.filter((user) => user.is_active && user.is_verified).length;

  // Seleksi hanya untuk user yang punya id.
  const selectableFilteredIds = useMemo(
    () => filteredUsers.map((u) => u.id).filter((id): id is string => Boolean(id)),
    [filteredUsers],
  );
  const allFilteredSelected =
    selectableFilteredIds.length > 0 && selectableFilteredIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      allFilteredSelected
        ? prev.filter((id) => !selectableFilteredIds.includes(id))
        : Array.from(new Set([...prev, ...selectableFilteredIds])),
    );
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBusyAction("bulk-delete");
      const results = await Promise.allSettled(selectedIds.map((id) => usersApi.remove(id)));
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      if (fail === 0) toast.success(`${ok} user berhasil dihapus.`);
      else toast.warning(`${ok} user dihapus, ${fail} gagal.`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      await onChanged();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus user terpilih."));
    } finally {
      setBusyAction("");
    }
  };

  const openCreateDialog = () => {
    const firstCategoryId = categories[0]?.id ?? "";
    const firstGroupId = (groupsByCategoryId[firstCategoryId] ?? groups)[0]?.id ?? "";
    setForm({
      ...emptyForm,
      category_id: firstCategoryId,
      group_id: firstGroupId,
    });
    setDialogOpen(true);
  };

  const updateForm = <K extends keyof CreateUserForm>(key: K, value: CreateUserForm[K]) => {
    setForm((prev) => {
      if (key === "category_id") {
        const nextCategoryId = String(value);
        const nextGroups = groupsByCategoryId[nextCategoryId] ?? groups;
        return {
          ...prev,
          category_id: nextCategoryId,
          group_id: nextGroups[0]?.id ?? "",
        };
      }
      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const createUser = async () => {
    try {
      setBusyAction("create-user");
      await usersApi.create({
        username: form.username.trim(),
        email: form.email.trim(),
        full_name: form.full_name.trim() || undefined,
        password: form.password,
        category_id: form.category_id,
        group_id: form.group_id,
        participant_id: form.participant_id === "__none__" ? undefined : form.participant_id,
      });
      toast.success("User IAM berhasil dibuat dan email aktivasi dikirim.");
      setDialogOpen(false);
      await onChanged();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal membuat user IAM."));
    } finally {
      setBusyAction("");
    }
  };

  const resendInvitation = async (email: string) => {
    try {
      setBusyAction(`resend:${email}`);
      await usersApi.resendConfirmation(email);
      toast.success(`Undangan aktivasi dikirim ulang ke ${email}.`);
      await onChanged();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal mengirim ulang aktivasi."));
    } finally {
      setBusyAction("");
    }
  };

  const editAvailableGroups = editForm
    ? groupsByCategoryId[editForm.category_id] ?? groups
    : groups;

  const openEditDialog = (user: UserItem) => {
    if (!user.id) {
      toast.error("User ini tidak punya id, tidak bisa diedit.");
      return;
    }
    setEditForm({
      id: user.id,
      username: user.username ?? "",
      email: user.email ?? "",
      full_name: user.full_name ?? "",
      password: "",
      category_id: user.category?.id ?? "",
      group_id: user.group?.id ?? "",
    });
    setEditOpen(true);
  };

  const updateEditForm = <K extends keyof EditUserForm>(key: K, value: EditUserForm[K]) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      if (key === "category_id") {
        const nextCategoryId = String(value);
        const nextGroups = groupsByCategoryId[nextCategoryId] ?? groups;
        return {
          ...prev,
          category_id: nextCategoryId,
          group_id: nextGroups[0]?.id ?? "",
        };
      }
      return { ...prev, [key]: value };
    });
  };

  const saveEdit = async () => {
    if (!editForm) return;
    try {
      setBusyAction("edit-user");
      // Hanya kirim field yang terisi (semua optional di UserUpdateRequest).
      // Password hanya dikirim kalau operator sengaja mengisinya (reset).
      const body: Partial<{
        username: string;
        email: string;
        full_name: string;
        password: string;
        category_id: string;
        group_id: string;
      }> = {};
      if (editForm.username.trim()) body.username = editForm.username.trim();
      if (editForm.email.trim()) body.email = editForm.email.trim();
      body.full_name = editForm.full_name.trim();
      if (editForm.password.trim()) body.password = editForm.password.trim();
      if (editForm.category_id) body.category_id = editForm.category_id;
      if (editForm.group_id) body.group_id = editForm.group_id;

      await usersApi.update(editForm.id, body);
      toast.success("Mapping user berhasil diperbarui.");
      setEditOpen(false);
      setEditForm(null);
      await onChanged();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal memperbarui user."));
    } finally {
      setBusyAction("");
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget?.id) return;
    try {
      setBusyAction("delete-user");
      await usersApi.remove(deleteTarget.id);
      toast.success("User berhasil dihapus.");
      setDeleteTarget(null);
      await onChanged();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus user."));
    } finally {
      setBusyAction("");
    }
  };


  return (
    <div className="space-y-4">
      <Card className="panel border-slate-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40">
        <CardHeader>
          <CardTitle>User IAM dan Mapping Kategori</CardTitle>
          <CardDescription>
            Mapping user ke category dan group bisa dipasang saat create maupun diedit untuk user existing lewat <span className="font-medium">PATCH /identity-provider/users/&#123;id&#125;</span>. Catatan: endpoint baca user (<span className="font-medium">GET /users</span>) belum mengembalikan participant, jadi keterkaitan participant tidak bisa ditampilkan di sini — dan hanya bisa ditetapkan saat pembuatan user.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Total user</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{users.length}</p>
            <p className="mt-1 text-sm text-slate-600">User IAM yang terbaca dari CTS.</p>
          </div>
          <div className="rounded-2xl border bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Invited</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{invitedCount}</p>
            <p className="mt-1 text-sm text-slate-600">Akun sudah dibuat, belum aktif.</p>
          </div>
          <div className="rounded-2xl border bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Pending verify</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{pendingCount}</p>
            <p className="mt-1 text-sm text-slate-600">Sudah aktif sebagian, belum verified penuh.</p>
          </div>
          <div className="rounded-2xl border bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Active</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{activeCount}</p>
            <p className="mt-1 text-sm text-slate-600">Sudah siap dipakai login.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="panel">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Directory User</CardTitle>
              <CardDescription>
                Buat user baru dengan category dan group yang tepat, lalu pantau status aktivasinya dari sini.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari user, group, category, atau participant..."
                className="sm:w-80"
              />
              <Button onClick={openCreateDialog}>
                <UserPlus className="mr-2 h-4 w-4" />
                Buat User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filter status */}
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: "all", label: `Semua (${users.length})` },
              { key: "invited", label: `Belum aktif (${invitedCount})` },
              { key: "pending", label: `Pending verify (${pendingCount})` },
              { key: "active", label: `Aktif (${activeCount})` },
            ] as const).map((opt) => (
              <Button
                key={opt.key}
                variant={statusFilter === opt.key ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(opt.key)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Bulk action bar */}
          {filteredUsers.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-slate-50/60 px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAll} />
                Pilih semua ({selectableFilteredIds.length})
              </label>
              {selectedIds.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">{selectedIds.length} dipilih</span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                    Batal pilih
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus terpilih
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
              Belum ada user yang cocok dengan filter ini.
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <div key={user.id ?? `${user.email ?? "user"}-${index}`} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex gap-3">
                    {user.id ? (
                      <Checkbox
                        className="mt-1"
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={() => toggleSelectOne(user.id!)}
                      />
                    ) : null}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {user.full_name || user.username || user.email || "User tanpa nama"}
                      </p>
                      <Badge className={statusTone(user)}>{statusLabel(user)}</Badge>
                      {user.group?.code ? <Badge variant="outline">{user.group.code}</Badge> : null}
                      {user.category?.code ? <Badge variant="secondary">{user.category.code}</Badge> : null}
                    </div>
                    <p className="text-sm text-slate-600">{user.email || "Email belum ada"}</p>
                    {user.participant_id ? (
                      <p className="text-sm text-slate-600">
                        Participant: {participantNameById[user.participant_id] || user.participant_id}
                      </p>
                    ) : null}
                  </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => openEditDialog(user)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Mapping
                    </Button>
                    {user.email ? (
                      <Button
                        variant="outline"
                        onClick={() => void resendInvitation(user.email || "")}
                        disabled={busyAction === `resend:${user.email}`}
                      >
                        {busyAction === `resend:${user.email}` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        Kirim Ulang Aktivasi
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget(user)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Hapus
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Username</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{user.username || "-"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {user.category?.name || user.category?.code || "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Group</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {user.group?.name || user.group?.code || "-"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Buat User IAM</DialogTitle>
            <DialogDescription>
              Category dan group dipasang saat user dibuat. Ini jalur aman yang memang sudah tersedia dari API aktif sekarang.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama lengkap</Label>
              <Input
                value={form.full_name}
                onChange={(event) => updateForm("full_name", event.target.value)}
                placeholder="Nama operator atau admin"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={form.username}
                onChange={(event) => updateForm("username", event.target.value)}
                placeholder="username.login"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                placeholder="operator@company.co.id"
              />
            </div>
            <div className="space-y-2">
              <Label>Password awal</Label>
              <Input
                value={form.password}
                onChange={(event) => updateForm("password", event.target.value)}
                placeholder="TempPass123!"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={(value) => updateForm("category_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name || category.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Select value={form.group_id} onValueChange={(value) => updateForm("group_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih group" />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name || group.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Participant opsional</Label>
              <Select value={form.participant_id} onValueChange={(value) => updateForm("participant_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih participant bila user ini operator participant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tidak diikat ke participant</SelectItem>
                  {participants.map((participant) => (
                    <SelectItem key={participant.provider_id} value={participant.provider_id}>
                      {participant.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => void onChanged()} disabled={busyAction === "reload"}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Muat Ulang
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void createUser()} disabled={busyAction === "create-user"}>
              {busyAction === "create-user" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Simpan User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditForm(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Mapping User</DialogTitle>
            <DialogDescription>
              Ubah profil dan mapping category/group user existing lewat PATCH /identity-provider/users/&#123;id&#125;. Kosongkan password bila tidak ingin mengubahnya. Ikatan participant tidak bisa diubah di sini.
            </DialogDescription>
          </DialogHeader>
          {editForm ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nama lengkap</Label>
                <Input
                  value={editForm.full_name}
                  onChange={(event) => updateEditForm("full_name", event.target.value)}
                  placeholder="Nama operator atau admin"
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={editForm.username}
                  onChange={(event) => updateEditForm("username", event.target.value)}
                  placeholder="username.login"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editForm.email}
                  onChange={(event) => updateEditForm("email", event.target.value)}
                  placeholder="operator@company.co.id"
                />
              </div>
              <div className="space-y-2">
                <Label>Password baru (opsional)</Label>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(event) => updateEditForm("password", event.target.value)}
                  placeholder="Kosongkan bila tidak diubah"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editForm.category_id}
                  onValueChange={(value) => updateEditForm("category_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name || category.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select
                  value={editForm.group_id}
                  onValueChange={(value) => updateEditForm("group_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih group" />
                  </SelectTrigger>
                  <SelectContent>
                    {editAvailableGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name || group.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditForm(null);
              }}
            >
              Batal
            </Button>
            <Button onClick={() => void saveEdit()} disabled={busyAction === "edit-user"}>
              {busyAction === "edit-user" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hapus User</DialogTitle>
            <DialogDescription>
              Tindakan ini menghapus user dari IAM lewat DELETE /identity-provider/users/&#123;id&#125; dan tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <div className="rounded-2xl border bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">
                {deleteTarget.full_name || deleteTarget.username || deleteTarget.email || "User tanpa nama"}
              </p>
              <p className="text-slate-600">{deleteTarget.email || "Email tidak ada"}</p>
              {deleteTarget.group?.code ? (
                <p className="mt-1 text-slate-600">Group: {deleteTarget.group.code}</p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void deleteUser()}
              disabled={busyAction === "delete-user"}
            >
              {busyAction === "delete-user" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hapus {selectedIds.length} User</DialogTitle>
            <DialogDescription>
              {selectedIds.length} user terpilih akan dihapus permanen lewat DELETE /identity-provider/users/&#123;id&#125;. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void bulkDelete()}
              disabled={busyAction === "bulk-delete"}
            >
              {busyAction === "bulk-delete" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Hapus {selectedIds.length} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
