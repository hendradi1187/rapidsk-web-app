import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCcw, Save, Search, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api-error";
import { canManageAccessControl } from "@/lib/feature-access";
import {
  iamAdminApi,
  type CreateGroupPermissionRequest,
  type CreateIamApiResourceRequest,
  type CreateIamApplicationRequest,
  type CreateIamPermissionRequest,
  type IamApiResource,
  type IamApplication,
  type IamGroupPermission,
  type IamPermission,
  type IamUserGroup,
} from "@/api/services/iam-admin";

type EditorMode = "create" | "edit";
type AccessTab = "applications" | "resources" | "permissions" | "groups";

const emptyApplicationForm = {
  code: "",
  name: "",
  audience: "",
  description: "",
  is_active: true,
};

const emptyResourceForm = {
  application_id: "",
  resource_code: "",
  method: "GET",
  path_template: "",
  description: "",
  is_sensitive: false,
  is_active: true,
};

const emptyPermissionForm = {
  application_id: "",
  code: "",
  name: "",
  description: "",
  is_active: true,
};

const parseConstraints = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed) as Record<string, unknown>;
};

const prettyConstraints = (value: Record<string, unknown> | null | undefined) =>
  value && Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : "";

const normalizeSearch = (value: string) => value.trim().toLowerCase();

const AccessControl = () => {
  const { role, roles, hasPermission } = useAuth();
  const canManage = canManageAccessControl({ role, roles, hasPermission });

  const [activeTab, setActiveTab] = useState<AccessTab>("groups");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<IamApplication[]>([]);
  const [apiResources, setApiResources] = useState<IamApiResource[]>([]);
  const [permissions, setPermissions] = useState<IamPermission[]>([]);
  const [groups, setGroups] = useState<IamUserGroup[]>([]);
  const [groupPermissions, setGroupPermissions] = useState<IamGroupPermission[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [applicationsQuery, setApplicationsQuery] = useState("");
  const [resourcesQuery, setResourcesQuery] = useState("");
  const [permissionsQuery, setPermissionsQuery] = useState("");
  const [groupMatrixQuery, setGroupMatrixQuery] = useState("");

  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [permissionResourcesDialogOpen, setPermissionResourcesDialogOpen] = useState(false);

  const [applicationMode, setApplicationMode] = useState<EditorMode>("create");
  const [resourceMode, setResourceMode] = useState<EditorMode>("create");
  const [permissionMode, setPermissionMode] = useState<EditorMode>("create");
  const [editingApplication, setEditingApplication] = useState<IamApplication | null>(null);
  const [editingResource, setEditingResource] = useState<IamApiResource | null>(null);
  const [editingPermission, setEditingPermission] = useState<IamPermission | null>(null);
  const [editingGroupPermission, setEditingGroupPermission] = useState<IamGroupPermission | null>(null);
  const [resourceLinksPermission, setResourceLinksPermission] = useState<IamPermission | null>(null);

  const [applicationForm, setApplicationForm] = useState(emptyApplicationForm);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [permissionForm, setPermissionForm] = useState(emptyPermissionForm);
  const [groupPermissionForm, setGroupPermissionForm] = useState({
    permission_id: "",
    constraints: "",
  });
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState("");

  const loadBaseData = async (showToast = false) => {
    try {
      setRefreshing(true);
      const [appsRes, resourcesRes, permissionsRes, groupsRes] = await Promise.all([
        iamAdminApi.listApplications(),
        iamAdminApi.listApiResources(),
        iamAdminApi.listPermissions(),
        iamAdminApi.listGroups(),
      ]);
      setApplications(appsRes.data);
      setApiResources(resourcesRes.data);
      setPermissions(permissionsRes.data);
      setGroups(groupsRes.data);

      const nextGroupId =
        selectedGroupId && groupsRes.data.some((group) => group.id === selectedGroupId)
          ? selectedGroupId
          : groupsRes.data[0]?.id ?? "";
      setSelectedGroupId(nextGroupId);
      if (showToast) toast.success("Data access control dimuat ulang.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal memuat konfigurasi access control."));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const loadGroupPermissions = async (groupId: string) => {
    if (!groupId) {
      setGroupPermissions([]);
      return;
    }
    try {
      const response = await iamAdminApi.listGroupPermissions(groupId);
      setGroupPermissions(response.data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal memuat matrix permission untuk group ini."));
    }
  };

  useEffect(() => {
    void loadBaseData();
  }, []);

  useEffect(() => {
    void loadGroupPermissions(selectedGroupId);
  }, [selectedGroupId]);

  const applicationNameById = useMemo(
    () =>
      applications.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {}),
    [applications],
  );

  const resourcesCountByApplicationId = useMemo(
    () =>
      apiResources.reduce<Record<string, number>>((acc, item) => {
        acc[item.application_id] = (acc[item.application_id] ?? 0) + 1;
        return acc;
      }, {}),
    [apiResources],
  );

  const permissionsCountByApplicationId = useMemo(
    () =>
      permissions.reduce<Record<string, number>>((acc, item) => {
        acc[item.application_id] = (acc[item.application_id] ?? 0) + 1;
        return acc;
      }, {}),
    [permissions],
  );

  const assignedGroupPermissionByPermissionId = useMemo(
    () =>
      groupPermissions.reduce<Record<string, IamGroupPermission>>((acc, item) => {
        acc[item.permission_id] = item;
        return acc;
      }, {}),
    [groupPermissions],
  );

  const resourcesByApplicationId = useMemo(
    () =>
      apiResources.reduce<Record<string, IamApiResource[]>>((acc, resource) => {
        if (!acc[resource.application_id]) acc[resource.application_id] = [];
        acc[resource.application_id].push(resource);
        return acc;
      }, {}),
    [apiResources],
  );

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const assignedCount = groupPermissions.length;
  const unassignedCount = Math.max(permissions.length - assignedCount, 0);

  const filteredApplications = useMemo(() => {
    const q = normalizeSearch(applicationsQuery);
    if (!q) return applications;
    return applications.filter((item) =>
      [item.name, item.code, item.audience, item.description ?? ""].some((part) =>
        part.toLowerCase().includes(q),
      ),
    );
  }, [applications, applicationsQuery]);

  const filteredResources = useMemo(() => {
    const q = normalizeSearch(resourcesQuery);
    if (!q) return apiResources;
    return apiResources.filter((item) =>
      [
        item.resource_code,
        item.method,
        item.path_template,
        item.description ?? "",
        applicationNameById[item.application_id] ?? "",
      ].some((part) => part.toLowerCase().includes(q)),
    );
  }, [apiResources, applicationNameById, resourcesQuery]);

  const filteredPermissions = useMemo(() => {
    const q = normalizeSearch(permissionsQuery);
    if (!q) return permissions;
    return permissions.filter((item) =>
      [
        item.name,
        item.code,
        item.description ?? "",
        applicationNameById[item.application_id] ?? "",
      ].some((part) => part.toLowerCase().includes(q)),
    );
  }, [applicationNameById, permissions, permissionsQuery]);

  const filteredGroupPermissions = useMemo(() => {
    const q = normalizeSearch(groupMatrixQuery);
    if (!q) return permissions;
    return permissions.filter((item) =>
      [
        item.name,
        item.code,
        item.description ?? "",
        applicationNameById[item.application_id] ?? "",
        assignedGroupPermissionByPermissionId[item.id] ? "terhubung" : "belum",
      ].some((part) => part.toLowerCase().includes(q)),
    );
  }, [applicationNameById, assignedGroupPermissionByPermissionId, groupMatrixQuery, permissions]);

  const openCreateApplication = () => {
    setApplicationMode("create");
    setEditingApplication(null);
    setApplicationForm(emptyApplicationForm);
    setApplicationDialogOpen(true);
  };

  const openEditApplication = (item: IamApplication) => {
    setApplicationMode("edit");
    setEditingApplication(item);
    setApplicationForm({
      code: item.code,
      name: item.name,
      audience: item.audience,
      description: item.description ?? "",
      is_active: item.is_active,
    });
    setApplicationDialogOpen(true);
  };

  const saveApplication = async () => {
    try {
      setBusyAction("application");
      if (applicationMode === "create") {
        const body: CreateIamApplicationRequest = {
          code: applicationForm.code.trim(),
          name: applicationForm.name.trim(),
          audience: applicationForm.audience.trim(),
          description: applicationForm.description.trim() || null,
          is_active: applicationForm.is_active,
        };
        await iamAdminApi.createApplication(body);
        toast.success("Aplikasi berhasil dibuat.");
      } else if (editingApplication) {
        await iamAdminApi.updateApplication(editingApplication.id, {
          name: applicationForm.name.trim(),
          audience: applicationForm.audience.trim(),
          description: applicationForm.description.trim() || null,
          is_active: applicationForm.is_active,
        });
        toast.success("Aplikasi berhasil diperbarui.");
      }
      setApplicationDialogOpen(false);
      await loadBaseData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan aplikasi."));
    } finally {
      setBusyAction("");
    }
  };

  const removeApplication = async (item: IamApplication) => {
    try {
      setBusyAction(`delete-application-${item.id}`);
      await iamAdminApi.deleteApplication(item.id);
      toast.success("Aplikasi dihapus.");
      await loadBaseData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus aplikasi."));
    } finally {
      setBusyAction("");
    }
  };

  const openCreateResource = () => {
    setResourceMode("create");
    setEditingResource(null);
    setResourceForm({
      ...emptyResourceForm,
      application_id: applications[0]?.id ?? "",
    });
    setResourceDialogOpen(true);
  };

  const openEditResource = (item: IamApiResource) => {
    setResourceMode("edit");
    setEditingResource(item);
    setResourceForm({
      application_id: item.application_id,
      resource_code: item.resource_code,
      method: item.method,
      path_template: item.path_template,
      description: item.description ?? "",
      is_sensitive: item.is_sensitive,
      is_active: item.is_active,
    });
    setResourceDialogOpen(true);
  };

  const saveResource = async () => {
    try {
      setBusyAction("resource");
      if (resourceMode === "create") {
        const body: CreateIamApiResourceRequest = {
          application_id: resourceForm.application_id,
          resource_code: resourceForm.resource_code.trim(),
          method: resourceForm.method.trim().toUpperCase(),
          path_template: resourceForm.path_template.trim(),
          description: resourceForm.description.trim() || null,
          is_sensitive: resourceForm.is_sensitive,
          is_active: resourceForm.is_active,
        };
        await iamAdminApi.createApiResource(body);
        toast.success("Resource API berhasil dibuat.");
      } else if (editingResource) {
        await iamAdminApi.updateApiResource(editingResource.id, {
          resource_code: resourceForm.resource_code.trim(),
          method: resourceForm.method.trim().toUpperCase(),
          path_template: resourceForm.path_template.trim(),
          description: resourceForm.description.trim() || null,
          is_sensitive: resourceForm.is_sensitive,
          is_active: resourceForm.is_active,
        });
        toast.success("Resource API berhasil diperbarui.");
      }
      setResourceDialogOpen(false);
      await loadBaseData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan resource API."));
    } finally {
      setBusyAction("");
    }
  };

  const removeResource = async (item: IamApiResource) => {
    try {
      setBusyAction(`delete-resource-${item.id}`);
      await iamAdminApi.deleteApiResource(item.id);
      toast.success("Resource API dihapus.");
      await loadBaseData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus resource API."));
    } finally {
      setBusyAction("");
    }
  };

  const openCreatePermission = () => {
    setPermissionMode("create");
    setEditingPermission(null);
    setPermissionForm({
      ...emptyPermissionForm,
      application_id: applications[0]?.id ?? "",
    });
    setPermissionDialogOpen(true);
  };

  const openEditPermission = (item: IamPermission) => {
    setPermissionMode("edit");
    setEditingPermission(item);
    setPermissionForm({
      application_id: item.application_id,
      code: item.code,
      name: item.name,
      description: item.description ?? "",
      is_active: item.is_active,
    });
    setPermissionDialogOpen(true);
  };

  const savePermission = async () => {
    try {
      setBusyAction("permission");
      if (permissionMode === "create") {
        const body: CreateIamPermissionRequest = {
          application_id: permissionForm.application_id,
          code: permissionForm.code.trim(),
          name: permissionForm.name.trim(),
          description: permissionForm.description.trim() || null,
          is_active: permissionForm.is_active,
        };
        await iamAdminApi.createPermission(body);
        toast.success("Permission berhasil dibuat.");
      } else if (editingPermission) {
        await iamAdminApi.updatePermission(editingPermission.id, {
          name: permissionForm.name.trim(),
          description: permissionForm.description.trim() || null,
          is_active: permissionForm.is_active,
        });
        toast.success("Permission berhasil diperbarui.");
      }
      setPermissionDialogOpen(false);
      await loadBaseData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan permission."));
    } finally {
      setBusyAction("");
    }
  };

  const removePermission = async (item: IamPermission) => {
    try {
      setBusyAction(`delete-permission-${item.id}`);
      await iamAdminApi.deletePermission(item.id);
      toast.success("Permission dihapus.");
      await loadBaseData();
      await loadGroupPermissions(selectedGroupId);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus permission."));
    } finally {
      setBusyAction("");
    }
  };

  const openPermissionResources = (item: IamPermission) => {
    setResourceLinksPermission(item);
    setSelectedResourceIds([]);
    setPermissionResourcesDialogOpen(true);
  };

  const savePermissionResources = async () => {
    if (!resourceLinksPermission) return;
    try {
      setBusyAction("permission-resources");
      await iamAdminApi.linkPermissionApiResources(resourceLinksPermission.id, selectedResourceIds);
      toast.success("Keterhubungan permission ke resource berhasil disimpan.");
      setPermissionResourcesDialogOpen(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan keterhubungan permission."));
    } finally {
      setBusyAction("");
    }
  };

  const openCreateGroupPermission = () => {
    setEditingGroupPermission(null);
    setGroupPermissionForm({ permission_id: permissions[0]?.id ?? "", constraints: "" });
    setGroupDialogOpen(true);
  };

  const openEditGroupPermission = (item: IamGroupPermission) => {
    setEditingGroupPermission(item);
    setGroupPermissionForm({
      permission_id: item.permission_id,
      constraints: prettyConstraints(item.constraints),
    });
    setGroupDialogOpen(true);
  };

  const saveGroupPermission = async () => {
    if (!selectedGroupId) return;
    try {
      setBusyAction("group-permission");
      const constraints = parseConstraints(groupPermissionForm.constraints);
      if (editingGroupPermission) {
        await iamAdminApi.updateGroupPermission(selectedGroupId, editingGroupPermission.id, constraints);
        toast.success("Batas tambahan permission berhasil diperbarui.");
      } else {
        const body: CreateGroupPermissionRequest = {
          permission_id: groupPermissionForm.permission_id,
          constraints,
        };
        await iamAdminApi.grantGroupPermission(selectedGroupId, body);
        toast.success("Permission berhasil dipasang ke group.");
      }
      setGroupDialogOpen(false);
      await loadGroupPermissions(selectedGroupId);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan matrix group permission."));
    } finally {
      setBusyAction("");
    }
  };

  const removeGroupPermission = async (item: IamGroupPermission) => {
    if (!selectedGroupId) return;
    try {
      setBusyAction(`delete-group-permission-${item.id}`);
      await iamAdminApi.deleteGroupPermission(selectedGroupId, item.id);
      toast.success("Permission dilepas dari group.");
      await loadGroupPermissions(selectedGroupId);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal melepas permission dari group."));
    } finally {
      setBusyAction("");
    }
  };

  if (!canManage) {
    return (
      <div className="min-h-screen">
        <Header title="Access Control" subtitle="Admin only" />
        <div className="p-6">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Halaman ini hanya terbuka untuk admin yang mengelola matrix akses.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Access Control"
        subtitle="Atur hak akses dari satu tempat, lalu biarkan halaman dan aksi mengikuti matrix yang sudah kamu tetapkan."
      />

      <div className="space-y-6 p-6">
        <Card className="panel border-slate-200/80 bg-gradient-to-br from-white via-white to-amber-50/50">
          <CardContent className="space-y-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">Sumber akses diambil langsung dari CTS IAM</p>
                  <p className="max-w-3xl text-sm leading-6 text-slate-600">
                    Perubahan di sini memengaruhi permission efektif user. Setelah matrix diubah, user cukup login ulang
                    atau refresh sesi agar hak akses terbaru ikut terbaca.
                  </p>
                </div>
              </div>

              <Button variant="outline" onClick={() => void loadBaseData(true)} disabled={refreshing}>
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Muat ulang
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Aplikasi</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{applications.length}</p>
                <p className="mt-1 text-sm text-slate-600">Kelompok layanan atau audience yang kamu kelola.</p>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Resource API</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{apiResources.length}</p>
                <p className="mt-1 text-sm text-slate-600">Daftar endpoint yang bisa diikat ke permission.</p>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Permission</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{permissions.length}</p>
                <p className="mt-1 text-sm text-slate-600">Kode izin yang nanti dibaca halaman dan tombol.</p>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Group Aktif</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{selectedGroup?.name ?? "Belum dipilih"}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedGroup ? `${assignedCount} terpasang • ${unassignedCount} belum dipasang` : "Pilih group untuk melihat matrix."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AccessTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
            <TabsTrigger value="applications">Aplikasi</TabsTrigger>
            <TabsTrigger value="resources">Resource API</TabsTrigger>
            <TabsTrigger value="permissions">Permission</TabsTrigger>
            <TabsTrigger value="groups">Matrix Group</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4">
            <Card className="panel">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle>Daftar Aplikasi</CardTitle>
                    <CardDescription>Mulai dari sini saat kamu ingin memisahkan ruang akses per produk, layanan, atau audience.</CardDescription>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative w-full sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={applicationsQuery}
                        onChange={(e) => setApplicationsQuery(e.target.value)}
                        placeholder="Cari nama, kode, atau audience..."
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={openCreateApplication}>
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah aplikasi
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="py-10 text-center text-muted-foreground">Memuat daftar aplikasi...</div>
                ) : filteredApplications.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">Tidak ada aplikasi yang cocok dengan pencarian ini.</div>
                ) : (
                  filteredApplications.map((item) => (
                    <div key={item.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-slate-900">{item.name}</p>
                            <Badge variant="outline">{item.code}</Badge>
                            <Badge variant={item.is_active ? "outline" : "secondary"}>
                              {item.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">Audience: {item.audience}</p>
                          <p className="text-sm leading-6 text-slate-600">{item.description || "Belum ada deskripsi."}</p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Badge variant="secondary">{resourcesCountByApplicationId[item.id] ?? 0} resource</Badge>
                            <Badge variant="secondary">{permissionsCountByApplicationId[item.id] ?? 0} permission</Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => openEditApplication(item)}>Edit</Button>
                          <Button
                            variant="destructive"
                            onClick={() => void removeApplication(item)}
                            disabled={busyAction === `delete-application-${item.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <Card className="panel">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle>Resource API</CardTitle>
                    <CardDescription>Gunakan daftar ini untuk menandai endpoint mana saja yang memang ingin dibuka atau dibatasi.</CardDescription>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative w-full sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={resourcesQuery}
                        onChange={(e) => setResourcesQuery(e.target.value)}
                        placeholder="Cari method, path, atau aplikasi..."
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={openCreateResource}>
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah resource
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredResources.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">Tidak ada resource API yang cocok dengan pencarian ini.</div>
                ) : (
                  filteredResources.map((item) => (
                    <div key={item.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{item.method}</Badge>
                            <p className="font-semibold text-slate-900">{item.resource_code}</p>
                            <Badge variant={item.is_active ? "outline" : "secondary"}>
                              {item.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                            {item.is_sensitive && <Badge variant="secondary">Sensitif</Badge>}
                          </div>
                          <p className="text-sm text-slate-600">
                            Aplikasi: {applicationNameById[item.application_id] || item.application_id}
                          </p>
                          <p className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                            {item.path_template}
                          </p>
                          <p className="text-sm leading-6 text-slate-600">{item.description || "Belum ada deskripsi."}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => openEditResource(item)}>Edit</Button>
                          <Button
                            variant="destructive"
                            onClick={() => void removeResource(item)}
                            disabled={busyAction === `delete-resource-${item.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card className="panel">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle>Permission</CardTitle>
                    <CardDescription>Permission adalah bahasa yang dipakai halaman dan tombol untuk menentukan apa yang boleh dilakukan user.</CardDescription>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative w-full sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={permissionsQuery}
                        onChange={(e) => setPermissionsQuery(e.target.value)}
                        placeholder="Cari nama, kode, atau aplikasi..."
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={openCreatePermission}>
                      <Plus className="mr-2 h-4 w-4" />
                      Tambah permission
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredPermissions.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">Tidak ada permission yang cocok dengan pencarian ini.</div>
                ) : (
                  filteredPermissions.map((item) => (
                    <div key={item.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <Badge variant="outline">{item.code}</Badge>
                            <Badge variant={item.is_active ? "outline" : "secondary"}>
                              {item.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            Aplikasi: {applicationNameById[item.application_id] || item.application_id}
                          </p>
                          <p className="text-sm leading-6 text-slate-600">{item.description || "Belum ada deskripsi."}</p>
                          <p className="text-xs text-slate-500">
                            Kalau permission ini dipasang ke group, halaman atau aksi terkait akan ikut terbuka sesuai logic FE dan backend.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => openPermissionResources(item)}>Atur resource</Button>
                          <Button variant="outline" onClick={() => openEditPermission(item)}>Edit</Button>
                          <Button
                            variant="destructive"
                            onClick={() => void removePermission(item)}
                            disabled={busyAction === `delete-permission-${item.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <Card className="panel">
              <CardHeader>
                <CardTitle>Matrix Group</CardTitle>
                <CardDescription>Pilih group lebih dulu, lalu tentukan permission mana yang harus aktif untuk group tersebut.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
                  <div className="space-y-2">
                    <Label>User group</Label>
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name} ({group.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Group Dipilih</p>
                      <p className="mt-2 font-semibold text-slate-900">{selectedGroup?.name ?? "-"}</p>
                      <p className="mt-1 text-sm text-slate-600">{selectedGroup?.code ?? "Pilih group terlebih dulu."}</p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Terpasang</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{assignedCount}</p>
                      <p className="mt-1 text-sm text-slate-600">Jumlah permission yang sudah aktif untuk group ini.</p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Belum Dipasang</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{unassignedCount}</p>
                      <p className="mt-1 text-sm text-slate-600">Masih tersedia kalau nanti group ini perlu akses tambahan.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={groupMatrixQuery}
                      onChange={(e) => setGroupMatrixQuery(e.target.value)}
                      placeholder="Cari permission untuk group ini..."
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={openCreateGroupPermission} disabled={!selectedGroupId}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah ke group
                  </Button>
                </div>

                <div className="space-y-3">
                  {filteredGroupPermissions.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">Tidak ada permission yang cocok dengan pencarian ini.</div>
                  ) : (
                    filteredGroupPermissions.map((permission) => {
                      const assignment = assignedGroupPermissionByPermissionId[permission.id];
                      return (
                        <div key={permission.id} className="rounded-2xl border p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">{permission.name}</p>
                                <Badge variant="outline">{permission.code}</Badge>
                                <Badge variant={assignment ? "outline" : "secondary"}>
                                  {assignment ? "Sudah aktif" : "Belum aktif"}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600">
                                Aplikasi: {applicationNameById[permission.application_id] || permission.application_id}
                              </p>
                              <p className="text-sm leading-6 text-slate-600">{permission.description || "Belum ada deskripsi."}</p>
                              {assignment && (
                                <div className="rounded-xl bg-slate-50 px-3 py-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Batas tambahan</p>
                                  <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                                    {prettyConstraints(assignment.constraints) || "Belum ada batas tambahan."}
                                  </pre>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {assignment ? (
                                <>
                                  <Button variant="outline" onClick={() => openEditGroupPermission(assignment)}>
                                    Edit batas
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => void removeGroupPermission(assignment)}
                                    disabled={busyAction === `delete-group-permission-${assignment.id}`}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Lepas
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingGroupPermission(null);
                                    setGroupPermissionForm({
                                      permission_id: permission.id,
                                      constraints: "",
                                    });
                                    setGroupDialogOpen(true);
                                  }}
                                >
                                  Pasang
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={applicationDialogOpen} onOpenChange={setApplicationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{applicationMode === "create" ? "Tambah aplikasi IAM" : "Edit aplikasi IAM"}</DialogTitle>
            <DialogDescription>Aplikasi ini akan menjadi payung untuk resource API dan permission turunannya.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input
                value={applicationForm.code}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                disabled={applicationMode === "edit"}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={applicationForm.name}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Audience</Label>
              <Input
                value={applicationForm.audience}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, audience: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={applicationForm.description}
                onChange={(e) => setApplicationForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3 md:col-span-2">
              <div>
                <p className="font-medium">Status aktif</p>
                <p className="text-sm text-muted-foreground">Kalau dimatikan, aplikasi ini tidak dipakai dulu dalam matrix akses.</p>
              </div>
              <Switch
                checked={applicationForm.is_active}
                onCheckedChange={(checked) => setApplicationForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplicationDialogOpen(false)}>Batal</Button>
            <Button onClick={() => void saveApplication()} disabled={busyAction === "application"}>
              {busyAction === "application" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{resourceMode === "create" ? "Tambah resource API" : "Edit resource API"}</DialogTitle>
            <DialogDescription>Resource ini merepresentasikan method dan path endpoint yang nanti bisa dibuka lewat permission.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Aplikasi</Label>
              <Select
                value={resourceForm.application_id}
                onValueChange={(value) => setResourceForm((prev) => ({ ...prev, application_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih aplikasi" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Input
                value={resourceForm.method}
                onChange={(e) => setResourceForm((prev) => ({ ...prev, method: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Kode resource</Label>
              <Input
                value={resourceForm.resource_code}
                onChange={(e) => setResourceForm((prev) => ({ ...prev, resource_code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Path template</Label>
              <Input
                value={resourceForm.path_template}
                onChange={(e) => setResourceForm((prev) => ({ ...prev, path_template: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={resourceForm.description}
                onChange={(e) => setResourceForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="font-medium">Tandai sensitif</p>
                <p className="text-sm text-muted-foreground">Cocok untuk endpoint yang butuh pengawasan lebih ketat.</p>
              </div>
              <Switch
                checked={resourceForm.is_sensitive}
                onCheckedChange={(checked) => setResourceForm((prev) => ({ ...prev, is_sensitive: checked }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="font-medium">Status aktif</p>
                <p className="text-sm text-muted-foreground">Bisa dimatikan sementara tanpa menghapus datanya.</p>
              </div>
              <Switch
                checked={resourceForm.is_active}
                onCheckedChange={(checked) => setResourceForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceDialogOpen(false)}>Batal</Button>
            <Button onClick={() => void saveResource()} disabled={busyAction === "resource"}>
              {busyAction === "resource" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{permissionMode === "create" ? "Tambah permission" : "Edit permission"}</DialogTitle>
            <DialogDescription>Permission ini yang nanti dipakai halaman, tombol, dan proses backend untuk memutuskan akses.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Aplikasi</Label>
              <Select
                value={permissionForm.application_id}
                onValueChange={(value) => setPermissionForm((prev) => ({ ...prev, application_id: value }))}
                disabled={permissionMode === "edit"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih aplikasi" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Kode permission</Label>
                <Input
                  value={permissionForm.code}
                  onChange={(e) => setPermissionForm((prev) => ({ ...prev, code: e.target.value }))}
                  disabled={permissionMode === "edit"}
                />
              </div>
              <div className="space-y-2">
                <Label>Nama permission</Label>
                <Input
                  value={permissionForm.name}
                  onChange={(e) => setPermissionForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={permissionForm.description}
                onChange={(e) => setPermissionForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="font-medium">Status aktif</p>
                <p className="text-sm text-muted-foreground">Permission nonaktif tidak akan dibawa ke kalkulasi akses efektif.</p>
              </div>
              <Switch
                checked={permissionForm.is_active}
                onCheckedChange={(checked) => setPermissionForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>Batal</Button>
            <Button onClick={() => void savePermission()} disabled={busyAction === "permission"}>
              {busyAction === "permission" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionResourcesDialogOpen} onOpenChange={setPermissionResourcesDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Hubungkan permission ke resource API</DialogTitle>
            <DialogDescription>Pilih endpoint mana saja yang memang boleh dibuka oleh permission ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-900">{resourceLinksPermission?.name}</p>
              <p className="text-sm text-muted-foreground">{resourceLinksPermission?.code}</p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedResourceIds.length} resource dipilih untuk permission ini.
              </p>
            </div>
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-2">
              {(resourcesByApplicationId[resourceLinksPermission?.application_id ?? ""] ?? []).map((item) => (
                <label key={item.id} className="flex items-start gap-3 rounded-2xl border p-4">
                  <Checkbox
                    checked={selectedResourceIds.includes(item.id)}
                    onCheckedChange={(checked) => {
                      setSelectedResourceIds((prev) =>
                        checked ? [...prev, item.id] : prev.filter((id) => id !== item.id),
                      );
                    }}
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.method}</Badge>
                      <span className="font-medium text-slate-900">{item.resource_code}</span>
                    </div>
                    <p className="font-mono text-xs text-slate-700">{item.path_template}</p>
                    <p className="text-xs text-slate-500">{item.description || "Belum ada deskripsi."}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionResourcesDialogOpen(false)}>Batal</Button>
            <Button onClick={() => void savePermissionResources()} disabled={busyAction === "permission-resources"}>
              {busyAction === "permission-resources" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingGroupPermission ? "Edit batas tambahan" : "Pasang permission ke group"}</DialogTitle>
            <DialogDescription>Batas tambahan bersifat opsional. Pakai JSON kalau kamu ingin membatasi domain, participant, atau aturan khusus lain.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Permission</Label>
              <Select
                value={groupPermissionForm.permission_id}
                onValueChange={(value) => setGroupPermissionForm((prev) => ({ ...prev, permission_id: value }))}
                disabled={Boolean(editingGroupPermission)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih permission" />
                </SelectTrigger>
                <SelectContent>
                  {permissions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batas tambahan (JSON opsional)</Label>
              <Textarea
                value={groupPermissionForm.constraints}
                onChange={(e) => setGroupPermissionForm((prev) => ({ ...prev, constraints: e.target.value }))}
                placeholder='{"domain_codes":["WK","FLD"]}'
                className="min-h-[180px] font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Batal</Button>
            <Button onClick={() => void saveGroupPermission()} disabled={busyAction === "group-permission"}>
              {busyAction === "group-permission" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessControl;
