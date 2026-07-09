import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCcw, Save, Search, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { EndpointPicker } from "@/components/access-control/EndpointPicker";
import { IdentityCatalogPanel } from "@/components/access-control/IdentityCatalogPanel";
import { BindingAuditPanel } from "@/components/access-control/BindingAuditPanel";
import { UserDirectoryPanel } from "@/components/access-control/UserDirectoryPanel";
import { userCategoriesApi, userGroupsApi, usersApi } from "@/api/services/identity";
import { registrationsApi } from "@/api/services/onboarding";
import { organizationsApi } from "@/api/services/governance";
import { providersApi } from "@/api/services/providers";
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
import { iamApi } from "@/api/services/iam";

type EditorMode = "create" | "edit";
type AccessTab = "applications" | "resources" | "permissions" | "groups" | "catalog" | "bindings" | "users";

type IdentityCategory = {
  id: string;
  code: string;
  name?: string;
};

type IdentityGroup = {
  id: string;
  code: string;
  name?: string;
  category?: { code?: string; name?: string };
};

type IdentityUser = {
  email?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
};

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
  const [identityCategories, setIdentityCategories] = useState<IdentityCategory[]>([]);
  const [identityGroups, setIdentityGroups] = useState<IdentityGroup[]>([]);
  const [identityUsers, setIdentityUsers] = useState<IdentityUser[]>([]);
  const [userDirectoryIssue, setUserDirectoryIssue] = useState<string | null>(null);
  const [bindingProviders, setBindingProviders] = useState<any[]>([]);
  const [bindingRegistrations, setBindingRegistrations] = useState<any[]>([]);
  const [bindingOrganizations, setBindingOrganizations] = useState<any[]>([]);
  const [organizationDomainsById, setOrganizationDomainsById] = useState<Record<string, any[]>>({});
  const [participantDomainsById, setParticipantDomainsById] = useState<Record<string, any[]>>({});

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
  const [resourceManualMode, setResourceManualMode] = useState(false);
  const [permissionForm, setPermissionForm] = useState(emptyPermissionForm);
  const [groupPermissionForm, setGroupPermissionForm] = useState({
    permission_id: "",
    constraints: "",
  });
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState("");
  const [bundleApp, setBundleApp] = useState<IamApplication | null>(null);
  const [bundleData, setBundleData] = useState<{
    application: string;
    audience: string;
    version: number;
    resources: unknown[];
  } | null>(null);

  const openPolicyBundle = async (application: IamApplication) => {
    setBundleApp(application);
    setBundleData(null);
    try {
      setBusyAction(`bundle-${application.id}`);
      const bundle = await iamApi.getPolicyBundle(application.code);
      setBundleData(bundle);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal memuat policy bundle."));
      setBundleApp(null);
    } finally {
      setBusyAction("");
    }
  };

  const loadBindingAuditData = async () => {
    const [categoriesRes, groupsRes, providersRes, registrationsRes, organizationsRes] = await Promise.all([
      userCategoriesApi.list(),
      userGroupsApi.list(),
      providersApi.list(),
      registrationsApi.list(),
      organizationsApi.list(),
    ]);

    let nextUsers: IdentityUser[] = [];
    try {
      nextUsers = await usersApi.list();
      setUserDirectoryIssue(null);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Daftar user IAM belum bisa dimuat karena backend masih punya data email dummy/reserved.",
      );
      setUserDirectoryIssue(message);
      toast.warning(message, {
        description: "Tab dan fitur access control lain tetap bisa dipakai sambil menunggu data user dibersihkan di backend.",
        duration: 9000,
      });
    }

    setIdentityCategories(categoriesRes);
    setIdentityGroups(groupsRes);
    setIdentityUsers(nextUsers);
    setBindingProviders(providersRes as any[]);
    setBindingRegistrations(registrationsRes as any[]);
    setBindingOrganizations(organizationsRes as any[]);

    const orgDomainMap = await organizationsApi.listDomainsMap(
      (organizationsRes as any[]).map((item) => item.organization_id),
    );
    setOrganizationDomainsById(orgDomainMap);

    const participantDomainResults = await Promise.allSettled(
      (providersRes as any[]).map(async (provider) => ({
        participantId: provider.provider_id,
        domains: await providersApi.listDomains(provider.provider_id),
      })),
    );

    const nextParticipantDomainsById = participantDomainResults.reduce((acc, result) => {
      if (result.status === "fulfilled") {
        acc[result.value.participantId] = result.value.domains;
      }
      return acc;
    }, {} as Record<string, any[]>);

    setParticipantDomainsById(nextParticipantDomainsById);
  };

  const loadBaseData = async (showToast = false) => {
    try {
      setRefreshing(true);
      const [appsRes, resourcesRes, permissionsRes, groupsRes] = await Promise.all([
        iamAdminApi.listApplications(),
        iamAdminApi.listApiResources(),
        iamAdminApi.listPermissions(),
        iamAdminApi.listGroups(),
      ]);
      await loadBindingAuditData();
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

  // Matrix: permission dikelompokkan per aplikasi (kategori endpoint) → tiap grup
  // punya hitungan aktif/total supaya gampang dibaca sekilas.
  const matrixGroupedByApp = useMemo(() => {
    const byApp = new Map<string, IamPermission[]>();
    for (const perm of filteredGroupPermissions) {
      const key = perm.application_id;
      if (!byApp.has(key)) byApp.set(key, []);
      byApp.get(key)!.push(perm);
    }
    return Array.from(byApp.entries())
      .map(([applicationId, perms]) => ({
        applicationId,
        applicationName: applicationNameById[applicationId] || applicationId,
        perms: [...perms].sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code)),
        activeCount: perms.filter((p) => assignedGroupPermissionByPermissionId[p.id]).length,
      }))
      .sort((a, b) => a.applicationName.localeCompare(b.applicationName));
  }, [filteredGroupPermissions, applicationNameById, assignedGroupPermissionByPermissionId]);

  // Resource API dikelompokkan per garis besar path endpoint (2 segmen statis
  // pertama). Mis. /api/v1/connector/consumer/... -> grup "/connector/consumer".
  const resourcesGroupedByPrefix = useMemo(() => {
    const groupKey = (path: string) => {
      const clean = (path || "").replace(/^\/api\/v1/, "").replace(/^\//, "");
      const segs = clean.split("/").filter((s) => s && !s.startsWith("{"));
      return "/" + segs.slice(0, 2).join("/");
    };
    const byPrefix = new Map<string, IamApiResource[]>();
    for (const r of filteredResources) {
      const key = groupKey(r.path_template);
      if (!byPrefix.has(key)) byPrefix.set(key, []);
      byPrefix.get(key)!.push(r);
    }
    return Array.from(byPrefix.entries())
      .map(([prefix, items]) => ({
        prefix,
        items: items.sort((a, b) => a.path_template.localeCompare(b.path_template)),
      }))
      .sort((a, b) => a.prefix.localeCompare(b.prefix));
  }, [filteredResources]);

  const permissionsGroupedByApp = useMemo(() => {
    const byApp = new Map<string, IamPermission[]>();
    for (const p of filteredPermissions) {
      if (!byApp.has(p.application_id)) byApp.set(p.application_id, []);
      byApp.get(p.application_id)!.push(p);
    }
    return Array.from(byApp.entries())
      .map(([applicationId, items]) => ({
        applicationId,
        applicationName: applicationNameById[applicationId] || applicationId,
        items,
      }))
      .sort((a, b) => a.applicationName.localeCompare(b.applicationName));
  }, [filteredPermissions, applicationNameById]);

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

  // Nyalakan/matikan satu permission untuk group terpilih dalam sekali klik.
  // ON  → POST { permission_id } (constraints opsional, dikosongkan di sini).
  // OFF → DELETE group_permission_id. Tidak ada dialog; simpan langsung.
  const toggleGroupPermission = async (permission: IamPermission) => {
    if (!selectedGroupId) {
      toast.error("Pilih group dulu di atas.");
      return;
    }
    const assignment = assignedGroupPermissionByPermissionId[permission.id];
    try {
      setBusyAction(`toggle-perm-${permission.id}`);
      if (assignment) {
        await iamAdminApi.deleteGroupPermission(selectedGroupId, assignment.id);
      } else {
        await iamAdminApi.grantGroupPermission(selectedGroupId, {
          permission_id: permission.id,
          constraints: {},
        });
      }
      await loadGroupPermissions(selectedGroupId);
    } catch (error: unknown) {
      // 409 = sudah ter-assign / sudah lepas (state di server beda dari layar).
      // Cukup sinkronkan ulang tanpa error menakutkan.
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409 || status === 404) {
        await loadGroupPermissions(selectedGroupId);
        toast.info("Status akses disinkronkan ulang dari server.");
      } else {
        toast.error(getApiErrorMessage(error, "Gagal mengubah akses group."));
      }
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
        title="Hak Akses (IAM)"
        subtitle="Atur siapa boleh akses apa: daftar endpoint → bungkus jadi permission → nyalakan per group. Ikuti urutan tab 1 → 2 → 3."
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

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Category</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{identityCategories.length}</p>
                <p className="mt-1 text-sm text-slate-600">Katalog klasifikasi user dari CTS.</p>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Group IAM</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{identityGroups.length}</p>
                <p className="mt-1 text-sm text-slate-600">Daftar group yang bisa dibaca saat ini.</p>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">User IAM</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{identityUsers.length}</p>
                <p className="mt-1 text-sm text-slate-600">User yang bisa dipetakan ke category, group, dan participant.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AccessTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
            <TabsTrigger value="resources">1 · Endpoint API</TabsTrigger>
            <TabsTrigger value="permissions">2 · Permission</TabsTrigger>
            <TabsTrigger value="groups">3 · Matrix Akses</TabsTrigger>
            <TabsTrigger value="applications">Aplikasi</TabsTrigger>
            <TabsTrigger value="users">User</TabsTrigger>
            <TabsTrigger value="catalog">Category & Group</TabsTrigger>
            <TabsTrigger value="bindings">Audit Binding</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-4">
            <IdentityCatalogPanel categories={identityCategories} groups={identityGroups} />
          </TabsContent>

          <TabsContent value="bindings" className="space-y-4">
            <BindingAuditPanel
              providers={bindingProviders}
              registrations={bindingRegistrations}
              users={identityUsers}
              organizations={bindingOrganizations}
              organizationDomainsById={organizationDomainsById}
              participantDomainsById={participantDomainsById}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {userDirectoryIssue ? (
              <Card className="panel border-amber-200 bg-amber-50/60">
                <CardHeader>
                  <CardTitle>Directory User Sementara Ditahan</CardTitle>
                  <CardDescription>
                    Endpoint daftar user dari backend sedang membawa data email dummy atau reserved, jadi FE sengaja tidak memaksa render daftar user agar tab access control lain tetap jalan.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-900">{userDirectoryIssue}</p>
                </CardContent>
              </Card>
            ) : (
              <UserDirectoryPanel
                users={identityUsers}
                categories={identityCategories}
                groups={identityGroups}
                participants={bindingProviders}
                onChanged={() => loadBaseData()}
              />
            )}
          </TabsContent>

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
                          <Button
                            variant="outline"
                            onClick={() => void openPolicyBundle(item)}
                            disabled={busyAction === `bundle-${item.id}`}
                          >
                            {busyAction === `bundle-${item.id}` ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Policy Bundle
                          </Button>
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
                    <CardTitle>Endpoint API</CardTitle>
                    <CardDescription>
                      Daftar endpoint yang dikenal sistem, dikelompokkan per jalur (mis. /connector/consumer). Buka satu grup untuk lihat detailnya.
                    </CardDescription>
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
                  <Accordion type="multiple" className="space-y-2">
                    {resourcesGroupedByPrefix.map((group) => (
                      <AccordionItem key={group.prefix} value={group.prefix} className="rounded-2xl border px-4">
                        <AccordionTrigger className="gap-2 hover:no-underline">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <code className="break-all font-mono text-sm font-semibold text-slate-900">{group.prefix}</code>
                            <Badge variant="secondary" className="shrink-0">{group.items.length} endpoint</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 pb-3">
                          {group.items.map((item) => (
                            <div key={item.id} className="flex flex-col gap-2 rounded-xl border bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="shrink-0 text-[10px]">{item.method}</Badge>
                                  <code className="break-all font-mono text-xs text-slate-700">{item.path_template}</code>
                                  {!item.is_active && <Badge variant="secondary" className="text-[10px]">Nonaktif</Badge>}
                                  {item.is_sensitive && <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">Sensitif</Badge>}
                                </div>
                                <p className="text-xs text-slate-500">
                                  {item.resource_code}
                                  {item.description ? ` · ${item.description}` : ""}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditResource(item)}>Edit</Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => void removeResource(item)}
                                  disabled={busyAction === `delete-resource-${item.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card className="panel">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle>Permission (Paket Akses)</CardTitle>
                    <CardDescription>
                      Satu permission = satu paket berisi beberapa endpoint. Klik "Isi endpoint" untuk menentukan endpoint apa saja yang masuk paket ini, lalu pasang ke group lewat Matrix.
                    </CardDescription>
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
                  <Accordion type="multiple" className="space-y-2">
                    {permissionsGroupedByApp.map((group) => (
                      <AccordionItem key={group.applicationId} value={group.applicationId} className="rounded-2xl border px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-slate-500" />
                            <span className="font-semibold text-slate-900">{group.applicationName}</span>
                            <Badge variant="secondary">{group.items.length} permission</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 pb-3">
                          {group.items.map((item) => (
                            <div key={item.id} className="flex flex-col gap-2 rounded-xl border bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-slate-900">{item.name}</span>
                                  <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{item.code}</code>
                                  {!item.is_active && <Badge variant="secondary" className="text-[10px]">Nonaktif</Badge>}
                                </div>
                                {item.description ? <p className="text-xs text-slate-500">{item.description}</p> : null}
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openPermissionResources(item)} title="Pilih endpoint yang termasuk permission ini">
                                  Isi endpoint
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openEditPermission(item)}>Edit</Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => void removePermission(item)}
                                  disabled={busyAction === `delete-permission-${item.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <Card className="panel">
              <CardHeader>
                <CardTitle>Matrix Akses Group</CardTitle>
                <CardDescription>
                  Pilih group, lalu nyalakan/matikan akses per endpoint cukup dengan klik. Perubahan langsung tersimpan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-col gap-4 rounded-2xl border bg-slate-50/60 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs uppercase tracking-wider text-slate-500">Group</Label>
                      <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                        <SelectTrigger className="w-full sm:w-72">
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
                    {selectedGroupId ? (
                      <div className="flex items-center gap-3 pt-1 sm:pt-5">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {assignedCount} aktif
                        </Badge>
                        <Badge variant="secondary">{unassignedCount} tersedia</Badge>
                        <span className="text-sm text-slate-500">dari {permissions.length} endpoint</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={groupMatrixQuery}
                      onChange={(e) => setGroupMatrixQuery(e.target.value)}
                      placeholder="Cari endpoint atau permission..."
                      className="pl-9"
                      disabled={!selectedGroupId}
                    />
                  </div>
                </div>

                {!selectedGroupId ? (
                  <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">
                    Pilih group di atas untuk mulai mengatur aksesnya.
                  </div>
                ) : matrixGroupedByApp.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">
                    Tidak ada endpoint yang cocok dengan pencarian ini.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matrixGroupedByApp.map((group) => (
                      <div key={group.applicationId} className="overflow-hidden rounded-2xl border">
                        <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-slate-500" />
                            <p className="font-semibold text-slate-900">{group.applicationName}</p>
                          </div>
                          <Badge variant="outline">
                            {group.activeCount}/{group.perms.length} aktif
                          </Badge>
                        </div>
                        <div className="divide-y">
                          {group.perms.map((permission) => {
                            const assignment = assignedGroupPermissionByPermissionId[permission.id];
                            const busy = busyAction === `toggle-perm-${permission.id}`;
                            return (
                              <div
                                key={permission.id}
                                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-slate-50/70"
                              >
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-slate-900">{permission.name}</p>
                                    <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                                      {permission.code}
                                    </code>
                                    {assignment && assignment.constraints && Object.keys(assignment.constraints).length > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => openEditGroupPermission(assignment)}
                                        className="text-xs text-indigo-600 underline-offset-2 hover:underline"
                                      >
                                        + batas
                                      </button>
                                    ) : null}
                                  </div>
                                  {permission.description ? (
                                    <p className="text-xs text-slate-500">{permission.description}</p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  {assignment ? (
                                    <button
                                      type="button"
                                      onClick={() => openEditGroupPermission(assignment)}
                                      className="hidden text-xs text-slate-400 hover:text-indigo-600 sm:inline"
                                      title="Atur batas tambahan (opsional)"
                                    >
                                      atur batas
                                    </button>
                                  ) : null}
                                  {busy ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                  ) : (
                                    <Switch
                                      checked={!!assignment}
                                      onCheckedChange={() => void toggleGroupPermission(permission)}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Endpoint API</Label>
                <button
                  type="button"
                  onClick={() => setResourceManualMode((v) => !v)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {resourceManualMode ? "← pilih dari daftar" : "isi manual"}
                </button>
              </div>
              {resourceManualMode ? (
                <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                  <Input
                    value={resourceForm.method}
                    placeholder="GET"
                    onChange={(e) => setResourceForm((prev) => ({ ...prev, method: e.target.value.toUpperCase() }))}
                  />
                  <Input
                    value={resourceForm.path_template}
                    placeholder="/data-catalog/{id}/datasets"
                    onChange={(e) => setResourceForm((prev) => ({ ...prev, path_template: e.target.value }))}
                  />
                </div>
              ) : (
                <EndpointPicker
                  method={resourceForm.method}
                  path={resourceForm.path_template}
                  onSelect={(ep) =>
                    setResourceForm((prev) => ({
                      ...prev,
                      method: ep.method,
                      path_template: ep.path,
                      // Auto-isi kode resource kalau masih kosong: METHOD + max 2
                      // segmen statis terakhir (ringkas, biar tidak kepanjangan).
                      resource_code:
                        prev.resource_code.trim() ||
                        `${ep.method}_${ep.path
                          .replace(/^\/api\/v1/, "")
                          .split("/")
                          .filter((s) => s && !s.startsWith("{"))
                          .slice(-2)
                          .join("_")}`.toLowerCase(),
                    }))
                  }
                />
              )}
              <p className="text-xs text-muted-foreground">
                Dipilih dari katalog API live supaya tidak salah ketik. Pakai "isi manual" hanya kalau endpoint belum ada di katalog.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Kode resource</Label>
              <Input
                value={resourceForm.resource_code}
                onChange={(e) => setResourceForm((prev) => ({ ...prev, resource_code: e.target.value }))}
                placeholder="mis. get_datasets"
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
                      <Badge variant="outline" className="shrink-0">{item.method}</Badge>
                      <span className="break-all font-medium text-slate-900">{item.resource_code}</span>
                    </div>
                    <p className="break-all font-mono text-xs text-slate-700">{item.path_template}</p>
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
            <DialogTitle>Atur batas tambahan</DialogTitle>
            <DialogDescription>
              Opsional. Isi kalau akses ini perlu dibatasi ke domain, participant, atau aturan tertentu. Kosongkan kalau akses berlaku penuh.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Permission:{" "}
              <span className="font-medium">
                {permissions.find((p) => p.id === groupPermissionForm.permission_id)?.name ?? groupPermissionForm.permission_id}
              </span>
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

      <Dialog
        open={!!bundleApp}
        onOpenChange={(open) => {
          if (!open) {
            setBundleApp(null);
            setBundleData(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Policy Bundle — {bundleApp?.name}</DialogTitle>
            <DialogDescription>
              Bundle policy terkompilasi yang dipakai runtime untuk mengevaluasi akses aplikasi ini.
            </DialogDescription>
          </DialogHeader>
          {!bundleData ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat bundle...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Audience: {bundleData.audience}</Badge>
                <Badge variant="secondary">Versi {bundleData.version}</Badge>
                <Badge variant="secondary">{bundleData.resources?.length ?? 0} resource</Badge>
              </div>
              <div className="max-h-[50vh] overflow-auto rounded-xl border bg-slate-50 p-3">
                <pre className="whitespace-pre-wrap text-xs text-slate-700">
                  {JSON.stringify(bundleData.resources, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBundleApp(null);
                setBundleData(null);
              }}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessControl;
