import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  MoreHorizontal,
  Users,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useUserCategories,
  useUserGroups,
} from "@/api/hooks/useUsers";
import { UserResponse } from "@/api/types/identity-provider";
import { ROLE_LABELS } from "@/config/rbac";
import { deriveRole, useAuth } from "@/context/AuthContext";

import {
  UserForm,
  type UserCategoryOption,
  type UserGroupOption,
} from "@/components/users/UserForm";

const UsersPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const {
    data: usersData,
    isLoading,
    refetch,
  } = useUsers({ limit: pageSize, offset: page * pageSize });
  const { data: categoriesData, isLoading: loadingCategories } = useUserCategories({ limit: 100 });
  const { data: groupsData, isLoading: loadingGroups } = useUserGroups({ limit: 100 });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const categoryOptions = useMemo<UserCategoryOption[]>(() => {
    const liveOptions = (categoriesData?.data ?? []).map((category) => ({
      id: category.id,
      name: category.name || category.code,
      code: category.code,
    }));

    if (liveOptions.length > 0) {
      return liveOptions;
    }

    const categoryMap = new Map<string, UserCategoryOption>();
    if (user?.category?.id) {
      categoryMap.set(user.category.id, {
        id: user.category.id,
        name: user.category.name || user.category.code,
        code: user.category.code,
      });
    }

    usersData?.data?.forEach((existingUser) => {
      if (!existingUser.category?.id) return;
      categoryMap.set(existingUser.category.id, {
        id: existingUser.category.id,
        name: existingUser.category.name || existingUser.category.code,
        code: existingUser.category.code,
      });
    });

    return Array.from(categoryMap.values());
  }, [categoriesData, user, usersData]);

  const groupOptions = useMemo<UserGroupOption[]>(() => {
    const liveOptions = (groupsData?.data ?? []).map((group) => ({
      id: group.id,
      category_id: group.category?.id || "",
      name: group.name || group.code,
      code: group.code,
    }));

    if (liveOptions.length > 0) {
      return liveOptions;
    }

    const groupMap = new Map<string, UserGroupOption>();
    if (user?.group?.id && user?.category?.id) {
      groupMap.set(user.group.id, {
        id: user.group.id,
        category_id: user.group.category_id || user.category.id,
        name: user.group.name || user.group.code,
        code: user.group.code,
      });
    }

    usersData?.data?.forEach((existingUser) => {
      if (!existingUser.group?.id) return;
      const categoryId =
        existingUser.group.category_id ||
        existingUser.group.category?.id ||
        existingUser.category?.id;

      if (!categoryId) return;

      groupMap.set(existingUser.group.id, {
        id: existingUser.group.id,
        category_id: categoryId,
        name: existingUser.group.name || existingUser.group.code,
        code: existingUser.group.code,
      });
    });

    return Array.from(groupMap.values());
  }, [groupsData, user, usersData]);

  const handleAdd = () => {
    setSelectedUser(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (user: UserResponse) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const onFormSubmit = async (values: {
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
        // Create
        await createMutation.mutateAsync({
            username: values.username?.trim() || values.email.split("@")[0],
            full_name: values.full_name,
            email: values.email,
            password: values.password || "",
            category_id: values.category_id,
            group_id: values.group_id,
        });
      }
      setIsDialogOpen(false);
      refetch();
    } catch (err) {
      // toast is handled in hook
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await deleteMutation.mutateAsync(selectedUser.id);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {}
  };

  if (isLoading || loadingCategories || loadingGroups) {
    return (
      <div className="min-h-screen">
        <Header title="Users Management" subtitle="Manage system access and roles" />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Users Management" subtitle="Create backend-backed test users with live category and group IDs." />
      <div className="p-6 space-y-6">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">Recommended testing flow</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one user per target role from the live identity-provider dictionaries, then log in with that account so V2 derives the role from <code>is_superadmin</code>, <code>category.code</code>, and <code>group.code</code>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{categoryOptions.length} categories loaded</Badge>
            <Badge variant="outline">{groupOptions.length} groups loaded</Badge>
            <Badge variant="outline">{usersData?.total ?? usersData?.data?.length ?? 0} users visible</Badge>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" /> Add User
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersData?.data?.filter(u => 
                (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                u.email.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((u) => {
                const appRole = deriveRole(u.category?.code || "", u.group?.code || "");
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                            {u.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.full_name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" /> {u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-accent/30 text-accent bg-accent/5">
                        {ROLE_LABELS[appRole] || "Viewer"}
                      </Badge>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {u.category?.code || "-"} / {u.group?.code || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{u.category?.name || "N/A"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(u)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsDeleteDialogOpen(true); }} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Real Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              Create or update an identity-provider user and assign their category and access group.
            </DialogDescription>
          </DialogHeader>
          <UserForm 
            initialData={selectedUser}
            onSubmit={onFormSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setIsDialogOpen(false)}
            categoryOptions={categoryOptions}
            groupOptions={groupOptions}
            preferredCategoryId={user?.category?.id}
            preferredGroupId={user?.group?.id}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>This will revoke access for "{selectedUser?.full_name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;
