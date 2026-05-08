import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2, Users2 } from "lucide-react";
import { V2PageShell, MetricCard } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useUserCategories,
  useUserGroups,
  useUsers,
} from "@/api/hooks/useUsers";
import type { UserResponse } from "@/api/types/identity-provider";
import { UserForm, type UserCategoryOption, type UserGroupOption } from "@/components/users/UserForm";
import { deriveRole, useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/config/rbac";
import { toast } from "sonner";

const UserProvisioning = () => {
  const { user, hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const { data: usersData, isLoading: loadingUsers, refetch } = useUsers({ limit: 100 });
  const { data: categoriesData, isLoading: loadingCategories } = useUserCategories({ limit: 100 });
  const { data: groupsData, isLoading: loadingGroups } = useUserGroups({ limit: 100 });
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const users = usersData?.data ?? [];
  const categories = categoriesData?.data ?? [];
  const groups = groupsData?.data ?? [];

  const categoryOptions = useMemo<UserCategoryOption[]>(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name || category.code,
        code: category.code,
      })),
    [categories]
  );

  const groupOptions = useMemo<UserGroupOption[]>(
    () =>
      groups.map((group) => ({
        id: group.id,
        category_id: group.category?.id || "",
        name: group.name || group.code,
        code: group.code,
      })),
    [groups]
  );

  const filteredUsers = users.filter((entry) => {
    const haystack = [
      entry.full_name || "",
      entry.email || "",
      entry.category?.code || "",
      entry.group?.code || "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  });

  const handleAdd = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (entry: UserResponse) => {
    setSelectedUser(entry);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: {
    username?: string | null;
    full_name?: string | null;
    email: string;
    password?: string | null;
    category_id: string;
    group_id: string;
  }) => {
    try {
      if (selectedUser) {
        const updatePayload: Record<string, string | null> = {
          full_name: values.full_name ?? null,
          email: values.email,
          category_id: values.category_id,
          group_id: values.group_id,
        };

        if (values.username?.trim()) {
          updatePayload.username = values.username.trim();
        }

        if (values.password?.trim()) {
          updatePayload.password = values.password.trim();
        }

        await updateMutation.mutateAsync({
          id: selectedUser.id,
          data: updatePayload,
        });
      } else {
        if (!values.password || values.password.length < 3) {
          toast.error("Password is required (min 3 chars — backend rule)");
          return;
        }
        await createMutation.mutateAsync({
          username: values.username?.trim() || values.email.split("@")[0],
          full_name: values.full_name,
          email: values.email,
          password: values.password,
          category_id: values.category_id,
          group_id: values.group_id,
        });
      }

      setDialogOpen(false);
      setSelectedUser(null);
      refetch();
    } catch {
      // Toast handled in hook
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await deleteMutation.mutateAsync(selectedUser.id);
      setDeleteOpen(false);
      setSelectedUser(null);
      refetch();
    } catch {
      // Toast handled in hook
    }
  };

  return (
    <V2PageShell
      title="Authority User Provisioning"
      subtitle="Create live identity-provider users for consumer, provider, and viewer testing directly from V2."
      status="Live API"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Registered Users" value={loadingUsers ? "..." : users.length} subtitle="Identity Provider API" icon={Users2} trend="up" />
        <MetricCard title="User Categories" value={loadingCategories ? "..." : categories.length} subtitle="Available role source" icon={ShieldCheck} trend="neutral" />
        <MetricCard title="User Groups" value={loadingGroups ? "..." : groups.length} subtitle="Operational assignment" icon={ShieldCheck} trend="neutral" />
        <MetricCard title="Provisioning Mode" value="Live" subtitle="JWT-protected backend endpoints" icon={ShieldCheck} trend="neutral" />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">How To Test Roles In V2</CardTitle>
          <CardDescription>
            Create one user per target role from live category and group dictionaries, then log in with that account. The frontend will derive the V2 role from <code className="rounded bg-muted px-1 text-xs">is_superadmin</code>, <code className="rounded bg-muted px-1 text-xs">category.code</code>, and <code className="rounded bg-muted px-1 text-xs">group.code</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-muted/25 p-4">
            <p className="font-medium text-sm">Consumer Test User</p>
            <p className="mt-1 text-sm text-muted-foreground">Pick a government or SKK-style category code, then choose the matching group.</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/25 p-4">
            <p className="font-medium text-sm">Provider Test User</p>
            <p className="mt-1 text-sm text-muted-foreground">Pick an enterprise or KKKS-style category code, then choose the matching group.</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/25 p-4">
            <p className="font-medium text-sm">Viewer Test User</p>
            <p className="mt-1 text-sm text-muted-foreground">Pick any category/group combination that does not map to consumer, provider, or super admin.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Identity Provider Users</CardTitle>
            <CardDescription>Live-backed user accounts available for V2 role testing.</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search users, category code, group code..."
              className="md:w-80"
            />
            <Button onClick={handleAdd} disabled={!hasPermission("users.manage")} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Test User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border/40">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Derived Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category / Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Confirmed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((entry) => {
                    const appRole = deriveRole(entry.category?.code || "", entry.group?.code || "");
                    return (
                      <tr key={entry.id} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{entry.full_name || "-"}</p>
                            <p className="text-xs text-muted-foreground">{entry.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="border-accent/30 bg-accent/5 text-accent">
                            {ROLE_LABELS[appRole]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {(entry.category?.code || "-") + " / " + (entry.group?.code || "-")}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const verified = (entry as any).is_verified ?? entry.is_email_confirmed ?? false;
                            const active = (entry as any).is_active ?? true;
                            return (
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className={active ? "border-emerald-500/40 text-emerald-600 text-[10px] w-fit" : "border-red-500/40 text-red-600 text-[10px] w-fit"}>
                                  {active ? "✓ Active" : "✗ Inactive"}
                                </Badge>
                                <Badge variant="outline" className={verified ? "border-emerald-500/40 text-emerald-600 text-[10px] w-fit" : "border-amber-500/40 text-amber-600 text-[10px] w-fit"}>
                                  {verified ? "✓ Verified" : "⚠ Not verified"}
                                </Badge>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(entry)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              {!((entry as any).is_verified ?? entry.is_email_confirmed) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const url = `/v2/authority/activation-email`;
                                    window.open(url, "_blank");
                                    toast.info(`Buka /activation-email tab baru — pilih user "${entry.username || entry.email}", paste activation token, submit.`, { duration: 7000 });
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Confirm Email (open helper)
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    const { authService } = await import("@/api/services/identity-provider");
                                    await authService.revokeUserToken(entry.id);
                                    toast.success(`Revoked all tokens for ${entry.username || entry.email}`);
                                  } catch (err: any) {
                                    toast.error("Revoke failed", { description: err?.response?.data?.detail || err?.message });
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Revoke All Tokens (force logout)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedUser(entry);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No users found for the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Edit Authority Test User" : "Create Authority Test User"}</DialogTitle>
            <DialogDescription>
              Pick a live category and group from the backend. The form will preview the V2 role that login will derive from that combination.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            initialData={selectedUser}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setDialogOpen(false)}
            categoryOptions={categoryOptions}
            groupOptions={groupOptions}
            preferredCategoryId={user?.category?.id}
            preferredGroupId={user?.group?.id}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{selectedUser?.email || "the selected user"}</strong> from the identity-provider backend.
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

export default UserProvisioning;
