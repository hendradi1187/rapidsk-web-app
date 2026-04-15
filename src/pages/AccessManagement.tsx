import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Users, Layers3, KeyRound, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type Category = { id: string; name: string; code: string; description: string; audience: string; userCount: number };
type Group = { id: string; name: string; code: string; categoryId: string; priority: number; description: string; userCount: number };
type RoleProfile = {
  id: string;
  name: string;
  code: string;
  level: string;
  scope: string;
  description: string;
  categoryIds: string[];
  groupIds: string[];
  permissions: string[];
};
type PermissionModule = { id: string; label: string; hint: string; permissions: { id: string; label: string }[] };

const permissionModules: PermissionModule[] = [
  {
    id: "catalog",
    label: "Data Catalog",
    hint: "Dataset registration and metadata governance.",
    permissions: [
      { id: "catalog.view", label: "View catalog" },
      { id: "catalog.manage", label: "Manage datasets" },
      { id: "catalog.publish", label: "Publish metadata" },
      { id: "catalog.vocab", label: "Manage vocabularies" },
    ],
  },
  {
    id: "contracts",
    label: "Contracts & Agreements",
    hint: "Commercial access lifecycle and approvals.",
    permissions: [
      { id: "contracts.view", label: "View contracts" },
      { id: "contracts.manage", label: "Manage contracts" },
      { id: "agreements.approve", label: "Approve agreements" },
      { id: "agreements.revoke", label: "Revoke agreements" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    hint: "Transfer orchestration and runtime access.",
    permissions: [
      { id: "transfer.view", label: "View transfers" },
      { id: "transfer.manage", label: "Manage transfers" },
      { id: "pools.manage", label: "Manage connection pools" },
      { id: "audit.view", label: "View audit trail" },
    ],
  },
  {
    id: "platform",
    label: "Platform Governance",
    hint: "Organizations, users, and compliance operations.",
    permissions: [
      { id: "governance.manage", label: "Manage orgs & domains" },
      { id: "participants.manage", label: "Manage participants" },
      { id: "users.manage", label: "Manage users" },
      { id: "compliance.manage", label: "Manage compliance" },
    ],
  },
];

const initialCategories: Category[] = [
  { id: "cat-platform", name: "Platform Operations", code: "PLATFORM", description: "Internal operating team that governs the shared dataspace platform.", audience: "Internal", userCount: 6 },
  { id: "cat-provider", name: "Data Provider", code: "KKKS", description: "Organizations that publish and govern datasets as data owners.", audience: "Enterprise", userCount: 14 },
  { id: "cat-regulator", name: "Regulator", code: "REGULATOR", description: "Government and regulator teams that request, review, and supervise access.", audience: "External", userCount: 9 },
];

const initialGroups: Group[] = [
  { id: "grp-platform-admin", name: "Platform Admin", code: "ADMIN", categoryId: "cat-platform", priority: 100, description: "Full platform operators with configuration and governance powers.", userCount: 3 },
  { id: "grp-platform-ops", name: "Operations Desk", code: "OPS", categoryId: "cat-platform", priority: 80, description: "Supports incidents, onboarding, and transfer operations.", userCount: 3 },
  { id: "grp-provider-owner", name: "Provider Owner", code: "OWNER", categoryId: "cat-provider", priority: 70, description: "Owns provider-side datasets, policies, and contracts.", userCount: 6 },
  { id: "grp-provider-operator", name: "Provider Operator", code: "OPERATOR", categoryId: "cat-provider", priority: 50, description: "Runs operational publishing and connection pool maintenance.", userCount: 8 },
  { id: "grp-reg-reviewer", name: "Regulatory Reviewer", code: "REVIEWER", categoryId: "cat-regulator", priority: 60, description: "Reviews contracts, approvals, and compliance posture.", userCount: 5 },
  { id: "grp-reg-observer", name: "Regulatory Observer", code: "VIEWER", categoryId: "cat-regulator", priority: 30, description: "Read-only oversight into catalog, agreements, and audit outputs.", userCount: 4 },
];

const initialRoles: RoleProfile[] = [
  { id: "role-super-admin", name: "Super Admin", code: "SUPER_ADMIN", level: "Enterprise", scope: "Global", description: "Owns full platform governance, users, organizations, and security configuration.", categoryIds: ["cat-platform"], groupIds: ["grp-platform-admin"], permissions: permissionModules.flatMap((m) => m.permissions.map((p) => p.id)) },
  { id: "role-provider", name: "Provider Manager", code: "PROVIDER", level: "Business", scope: "Provider Organization", description: "Manages provider datasets, contracts, vocabularies, and connection operations.", categoryIds: ["cat-provider"], groupIds: ["grp-provider-owner", "grp-provider-operator"], permissions: ["catalog.view", "catalog.manage", "catalog.publish", "catalog.vocab", "contracts.view", "contracts.manage", "transfer.view", "transfer.manage", "pools.manage", "audit.view"] },
  { id: "role-consumer", name: "Consumer Reviewer", code: "CONSUMER", level: "Business", scope: "Regulator", description: "Reviews available datasets, agreements, and compliance outcomes for regulated usage.", categoryIds: ["cat-regulator"], groupIds: ["grp-reg-reviewer"], permissions: ["catalog.view", "contracts.view", "agreements.approve", "audit.view", "compliance.manage"] },
  { id: "role-viewer", name: "Read Only Viewer", code: "VIEWER", level: "Read Only", scope: "Cross-domain", description: "Sees catalog and documentation without operational write actions.", categoryIds: ["cat-provider", "cat-regulator"], groupIds: ["grp-reg-observer"], permissions: ["catalog.view", "contracts.view", "audit.view"] },
];

const emptyCategoryForm = { name: "", code: "", description: "", audience: "Internal" };
const emptyGroupForm = { name: "", code: "", categoryId: "", priority: "50", description: "" };
const emptyRoleForm = { name: "", code: "", level: "Business", scope: "Global", description: "", categoryIds: [] as string[], groupIds: [] as string[], permissions: [] as string[] };
const buildPermissionGridStyle = (roleCount: number) => ({
  gridTemplateColumns: `220px repeat(${roleCount}, minmax(120px, 1fr))`,
});

const AccessManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [roles, setRoles] = useState<RoleProfile[]>(initialRoles);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [groupForm, setGroupForm] = useState({ ...emptyGroupForm, categoryId: initialCategories[0].id });
  const [roleForm, setRoleForm] = useState({ ...emptyRoleForm, categoryIds: [initialCategories[0].id], groupIds: [initialGroups[0].id], permissions: initialRoles[1].permissions });

  const categoryMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const groupMap = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g])), [groups]);
  const visibleCategories = categories.filter((c) => [c.name, c.code, c.audience].some((v) => v.toLowerCase().includes(searchQuery.toLowerCase())));
  const visibleGroups = groups.filter((g) => [g.name, g.code, categoryMap[g.categoryId]?.name || ""].some((v) => v.toLowerCase().includes(searchQuery.toLowerCase())));
  const visibleRoles = roles.filter((r) => [r.name, r.code, r.level, r.scope].some((v) => v.toLowerCase().includes(searchQuery.toLowerCase())));
  const availableGroupsForRole = groups.filter((group) => roleForm.categoryIds.includes(group.categoryId));
  const permissionGridStyle = buildPermissionGridStyle(roles.length);

  const handleCreateCategory = () => {
    if (!categoryForm.name || !categoryForm.code) return toast.error("Category name and code are required");
    setCategories((prev) => [...prev, { id: `cat-${categoryForm.code.toLowerCase()}`, name: categoryForm.name, code: categoryForm.code.toUpperCase(), description: categoryForm.description, audience: categoryForm.audience, userCount: 0 }]);
    setIsCategoryDialogOpen(false);
    setCategoryForm(emptyCategoryForm);
    toast.success("Category blueprint added");
  };

  const handleCreateGroup = () => {
    if (!groupForm.name || !groupForm.code || !groupForm.categoryId) return toast.error("Group name, code, and category are required");
    setGroups((prev) => [...prev, { id: `grp-${groupForm.code.toLowerCase()}`, name: groupForm.name, code: groupForm.code.toUpperCase(), categoryId: groupForm.categoryId, priority: Number(groupForm.priority || 0), description: groupForm.description, userCount: 0 }]);
    setIsGroupDialogOpen(false);
    setGroupForm({ ...emptyGroupForm, categoryId: categories[0]?.id || "" });
    toast.success("Group template added");
  };

  const handleCreateRole = () => {
    if (!roleForm.name || !roleForm.code) return toast.error("Role name and code are required");
    setRoles((prev) => [...prev, { id: `role-${roleForm.code.toLowerCase()}`, name: roleForm.name, code: roleForm.code.toUpperCase(), level: roleForm.level, scope: roleForm.scope, description: roleForm.description, categoryIds: roleForm.categoryIds, groupIds: roleForm.groupIds, permissions: roleForm.permissions }]);
    setIsRoleDialogOpen(false);
    setRoleForm({ ...emptyRoleForm, categoryIds: categories[0] ? [categories[0].id] : [], groupIds: groups[0] ? [groups[0].id] : [], permissions: [] });
    toast.success("Role profile added");
  };

  const toggleRolePermission = (permissionId: string) => setRoleForm((prev) => ({ ...prev, permissions: prev.permissions.includes(permissionId) ? prev.permissions.filter((id) => id !== permissionId) : [...prev.permissions, permissionId] }));
  const toggleRoleCategory = (categoryId: string) => setRoleForm((prev) => {
    const categoryIds = prev.categoryIds.includes(categoryId) ? prev.categoryIds.filter((id) => id !== categoryId) : [...prev.categoryIds, categoryId];
    const allowedGroups = groups.filter((group) => categoryIds.includes(group.categoryId)).map((group) => group.id);
    return { ...prev, categoryIds, groupIds: prev.groupIds.filter((groupId) => allowedGroups.includes(groupId)) };
  });
  const toggleRoleGroup = (groupId: string) => setRoleForm((prev) => ({ ...prev, groupIds: prev.groupIds.includes(groupId) ? prev.groupIds.filter((id) => id !== groupId) : [...prev.groupIds, groupId] }));

  return (
    <div className="min-h-screen">
      <Header title="Access Management" subtitle="Design categories, groups, and permissioned roles with an enterprise-friendly flow." />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-gradient-to-br from-card to-muted/40"><CardHeader className="pb-3"><CardDescription>Role blueprints</CardDescription><CardTitle className="flex items-center justify-between text-lg">{roles.length}<ShieldCheck className="h-5 w-5 text-accent" /></CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Enterprise-ready access profiles aligned to business scope.</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-card to-muted/40"><CardHeader className="pb-3"><CardDescription>User categories</CardDescription><CardTitle className="flex items-center justify-between text-lg">{categories.length}<Layers3 className="h-5 w-5 text-info" /></CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">High-level audience segments such as platform, provider, and regulator.</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-card to-muted/40"><CardHeader className="pb-3"><CardDescription>Access groups</CardDescription><CardTitle className="flex items-center justify-between text-lg">{groups.length}<Users className="h-5 w-5 text-emerald-500" /></CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Operational teams inside each category, prioritized by control depth.</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-card to-muted/40"><CardHeader className="pb-3"><CardDescription>Permission units</CardDescription><CardTitle className="flex items-center justify-between text-lg">{permissionModules.reduce((sum, module) => sum + module.permissions.length, 0)}<KeyRound className="h-5 w-5 text-primary" /></CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Action-based switches ready for future backend enforcement.</p></CardContent></Card>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search categories, groups, roles..." className="pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Category</Button>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Group</Button>
            <Button className="bg-accent hover:bg-accent/90" onClick={() => setIsRoleDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Role</Button>
          </div>
        </div>

        <Card className="border-accent/20 bg-gradient-to-r from-accent/10 via-card to-info/10">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Friendly Setup Flow</p>
              <h2 className="text-xl font-semibold">Start simple: category, then group, then role.</h2>
              <p className="max-w-3xl text-sm text-muted-foreground">
                This screen is arranged for demo use first. Admins can define business segments, create the teams
                inside them, then bundle access into reusable role profiles without touching raw IDs.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <p className="font-medium text-foreground">Category</p>
                <p>Who the user belongs to</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <p className="font-medium text-foreground">Group</p>
                <p>What operational team they join</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <p className="font-medium text-foreground">Role</p>
                <p>What actions they can perform</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList className="h-auto flex-wrap justify-start gap-2 bg-muted/50 p-1">
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
          </TabsList>
          <TabsContent value="roles" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Role Profiles</CardTitle>
                  <CardDescription>Business-ready roles that bundle scope, audience, and allowed actions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {visibleRoles.map((role) => (
                    <div key={role.id} className="rounded-xl border border-border/70 bg-card/80 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold">{role.name}</h3>
                            <Badge variant="outline">{role.code}</Badge>
                            <Badge className="border-accent/20 bg-accent/10 text-accent">{role.level}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                          <p className="font-medium text-foreground">{role.scope}</p>
                          <p className="text-xs text-muted-foreground">Scope</p>
                        </div>
                      </div>
                      <Separator className="my-4" />
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categories</p>
                          <div className="flex flex-wrap gap-2">
                            {role.categoryIds.map((categoryId) => (
                              <Badge key={categoryId} variant="secondary">
                                {categoryMap[categoryId]?.name || categoryId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Groups</p>
                          <div className="flex flex-wrap gap-2">
                            {role.groupIds.map((groupId) => (
                              <Badge key={groupId} variant="secondary">
                                {groupMap[groupId]?.name || groupId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</p>
                          <Badge variant="outline">{role.permissions.length} actions</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">UX Flow</CardTitle>
                  <CardDescription>Simple progression so admins do not get lost in enterprise setup.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-border/70 p-4">
                    <p className="font-medium">1. Create Categories</p>
                    <p className="text-sm text-muted-foreground">Define the audience first: platform, provider, regulator, or any future business segment.</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-4">
                    <p className="font-medium">2. Add Groups</p>
                    <p className="text-sm text-muted-foreground">Create operational teams under each category, with simple priority and ownership meaning.</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-4">
                    <p className="font-medium">3. Bundle Roles</p>
                    <p className="text-sm text-muted-foreground">Compose a role from categories, groups, and permissions that make sense together.</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-4">
                    <p className="font-medium">4. Wire Backend Later</p>
                    <p className="text-sm text-muted-foreground">This screen is already enterprise-ready for demo and can map cleanly to future backend endpoints.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">User Categories</CardTitle>
                <CardDescription>Top-level audience segments that future groups and roles inherit from.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleCategories.map((category) => (
                  <div key={category.id} className="rounded-xl border border-border/70 bg-card/80 p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.code}</p>
                      </div>
                      <Badge variant="outline">{category.audience}</Badge>
                    </div>
                    <p className="min-h-[60px] text-sm text-muted-foreground">{category.description}</p>
                    <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-sm font-medium">Users in segment</span>
                      <span className="text-sm text-muted-foreground">{category.userCount}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="groups" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Access Groups</CardTitle>
                <CardDescription>Operational teams under each category, ranked by priority and trust level.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {visibleGroups.map((group) => (
                  <div key={group.id} className="rounded-xl border border-border/70 bg-card/80 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{group.name}</h3>
                          <Badge variant="outline">{group.code}</Badge>
                          <Badge className="border-info/20 bg-info/10 text-info">{categoryMap[group.categoryId]?.name || "Unmapped"}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      </div>
                      <div className="grid min-w-[140px] gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Priority</span>
                          <span className="font-medium">{group.priority}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Users</span>
                          <span className="font-medium">{group.userCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Permission Matrix</CardTitle>
                <CardDescription>Readable permission matrix for demo and future backend mapping.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {permissionModules.map((module) => (
                  <div key={module.id} className="rounded-xl border border-border/70 bg-card/80 p-4">
                    <div className="mb-4">
                      <h3 className="font-semibold">{module.label}</h3>
                      <p className="text-sm text-muted-foreground">{module.hint}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="grid gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={permissionGridStyle}>
                          <div>Permission</div>
                          {roles.map((role) => (
                            <div key={role.id}>{role.code}</div>
                          ))}
                        </div>
                        {module.permissions.map((permission) => (
                          <div key={permission.id} className="grid items-center gap-2 rounded-lg px-3 py-3 odd:bg-muted/30" style={permissionGridStyle}>
                            <div>
                              <p className="font-medium">{permission.label}</p>
                              <p className="text-xs text-muted-foreground">{permission.id}</p>
                            </div>
                            {roles.map((role) => (
                              <div key={`${permission.id}-${role.id}`}>
                                <Checkbox checked={role.permissions.includes(permission.id)} disabled />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Create Category</DialogTitle><DialogDescription>Start with a high-level audience segment that future users and groups will inherit from.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Category name" value={categoryForm.name} onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))} />
              <Input placeholder="Code" value={categoryForm.code} onChange={(event) => setCategoryForm((prev) => ({ ...prev, code: event.target.value }))} />
            </div>
            <Select value={categoryForm.audience} onValueChange={(value) => setCategoryForm((prev) => ({ ...prev, audience: value }))}>
              <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
              <SelectContent><SelectItem value="Internal">Internal</SelectItem><SelectItem value="Enterprise">Enterprise</SelectItem><SelectItem value="External">External</SelectItem></SelectContent>
            </Select>
            <Textarea placeholder="Describe who belongs to this category and what access shape they should have." value={categoryForm.description} onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button><Button className="bg-accent hover:bg-accent/90" onClick={handleCreateCategory}>Save Category</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Create Group</DialogTitle><DialogDescription>Groups define day-to-day operating teams inside a category.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Group name" value={groupForm.name} onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))} />
              <Input placeholder="Code" value={groupForm.code} onChange={(event) => setGroupForm((prev) => ({ ...prev, code: event.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select value={groupForm.categoryId} onValueChange={(value) => setGroupForm((prev) => ({ ...prev, categoryId: value }))}>
                <SelectTrigger><SelectValue placeholder="Parent category" /></SelectTrigger>
                <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Priority" value={groupForm.priority} onChange={(event) => setGroupForm((prev) => ({ ...prev, priority: event.target.value }))} />
            </div>
            <Textarea placeholder="Explain what this group does and how much control it should have." value={groupForm.description} onChange={(event) => setGroupForm((prev) => ({ ...prev, description: event.target.value }))} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>Cancel</Button><Button className="bg-accent hover:bg-accent/90" onClick={handleCreateGroup}>Save Group</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader><DialogTitle>Create Role</DialogTitle><DialogDescription>Bundle enterprise permissions into a role users can understand and administrators can maintain.</DialogDescription></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Role name" value={roleForm.name} onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))} />
              <Input placeholder="Code" value={roleForm.code} onChange={(event) => setRoleForm((prev) => ({ ...prev, code: event.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select value={roleForm.level} onValueChange={(value) => setRoleForm((prev) => ({ ...prev, level: value }))}>
                <SelectTrigger><SelectValue placeholder="Role level" /></SelectTrigger>
                <SelectContent><SelectItem value="Enterprise">Enterprise</SelectItem><SelectItem value="Business">Business</SelectItem><SelectItem value="Operational">Operational</SelectItem><SelectItem value="Read Only">Read Only</SelectItem></SelectContent>
              </Select>
              <Input placeholder="Scope" value={roleForm.scope} onChange={(event) => setRoleForm((prev) => ({ ...prev, scope: event.target.value }))} />
            </div>
            <Textarea placeholder="Describe when this role should be granted." value={roleForm.description} onChange={(event) => setRoleForm((prev) => ({ ...prev, description: event.target.value }))} />
            <div className="rounded-xl border border-border/70 p-4">
              <p className="mb-3 font-medium">Allowed Categories</p>
              <div className="grid gap-3 md:grid-cols-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                    <Checkbox checked={roleForm.categoryIds.includes(category.id)} onCheckedChange={() => toggleRoleCategory(category.id)} />
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-muted-foreground">{category.code}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <p className="mb-3 font-medium">Allowed Groups</p>
              <div className="grid gap-3 md:grid-cols-2">
                {availableGroupsForRole.map((group) => (
                  <label key={group.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                    <Checkbox checked={roleForm.groupIds.includes(group.id)} onCheckedChange={() => toggleRoleGroup(group.id)} />
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">{categoryMap[group.categoryId]?.name} | Priority {group.priority}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 p-4">
              <p className="mb-3 font-medium">Permission Bundle</p>
              <div className="space-y-4">
                {permissionModules.map((module) => (
                  <div key={module.id} className="rounded-lg border border-border/60 p-4">
                    <div className="mb-3">
                      <p className="font-medium">{module.label}</p>
                      <p className="text-sm text-muted-foreground">{module.hint}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {module.permissions.map((permission) => (
                        <label key={permission.id} className="flex items-start gap-3 rounded-lg bg-muted/35 p-3">
                          <Checkbox checked={roleForm.permissions.includes(permission.id)} onCheckedChange={() => toggleRolePermission(permission.id)} />
                          <div>
                            <p className="font-medium">{permission.label}</p>
                            <p className="text-xs text-muted-foreground">{permission.id}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button><Button className="bg-accent hover:bg-accent/90" onClick={handleCreateRole}>Save Role</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessManagementPage;
