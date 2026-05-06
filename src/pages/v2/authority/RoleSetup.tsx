// src/pages/v2/authority/RoleSetup.tsx
import { KeyRound, Users2, Layers } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { userCategoriesService, userGroupsService } from "@/api/services/identity-provider";
import { derivePermissions } from "@/context/AuthContext";

const mappingRows = [
  { cat: "PLATFORM", grp: "ADMIN", role: "SUPER_ADMIN", access: "All V2 menus and actions" },
  { cat: "SKK / GOV_*", grp: "REVIEWER or consumer ops", role: "CONSUMER", access: "Consumer sequence menus with manage rights" },
  { cat: "KKKS / ENTERPRISE", grp: "OWNER or OPERATOR", role: "PROVIDER", access: "Provider fulfilment, dataset, and transfer rights" },
  { cat: "*", grp: "*", role: "VIEWER", access: "Read-only docs and catalog visibility" },
];

const RoleSetup = () => {
  const { data: categoriesData, isLoading: loadingCats } = useQuery({
    queryKey: ["userCategories"],
    queryFn: () => userCategoriesService.list({ limit: 100 }),
  });

  const { data: groupsData, isLoading: loadingGroups } = useQuery({
    queryKey: ["userGroups"],
    queryFn: () => userGroupsService.list({ limit: 100 }),
  });

  const categories = categoriesData?.data ?? [];
  const groups = groupsData?.data ?? [];

  return (
    <V2PageShell
      title="Role Setup"
      subtitle="User categories and groups define both AppRole and frontend permission mapping for V2."
      status="Live API"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="User Categories" value={loadingCats ? "..." : categories.length} subtitle="Identity Provider API" icon={Layers} trend="neutral" />
        <MetricCard title="User Groups" value={loadingGroups ? "..." : groups.length} subtitle="Maps to application roles" icon={KeyRound} trend="neutral" />
        <MetricCard title="Role Matrix" value="4 roles" subtitle="SUPER_ADMIN, CONSUMER, PROVIDER, VIEWER" icon={Users2} trend="neutral" />
      </div>

      <Tabs defaultValue="categories">
        <TabsList className="mb-4">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="mapping">Role Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">User Categories</CardTitle>
              <CardDescription>
                Live from <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/user/categories/</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Code", "Description", "Created"]} isLoading={loadingCats}>
                {categories.length > 0 ? categories.map((cat) => (
                  <tr key={cat.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{cat.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{cat.code}</Badge></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{cat.description || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(cat.created_at).toLocaleDateString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">No categories found in backend</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">User Groups</CardTitle>
              <CardDescription>
                Live from <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/user/groups/</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Code", "Priority", "Description", "Created"]} isLoading={loadingGroups}>
                {groups.length > 0 ? groups.map((grp) => (
                  <tr key={grp.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{grp.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{grp.code}</Badge></td>
                    <td className="px-4 py-3 text-sm">{grp.priority}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{grp.description || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(grp.created_at).toLocaleDateString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No groups found in backend</td></tr>
                )}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Role and Permission Mapping</CardTitle>
              <CardDescription>
                Frontend source of truth after <code className="rounded bg-muted px-1.5 py-0.5 text-xs">auth/validate</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Category Code", "Group Code", "AppRole", "Permission Set", "V2 Access"]}>
                {mappingRows.map((row, index) => (
                  <tr key={index} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{row.cat}</Badge></td>
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{row.grp}</Badge></td>
                    <td className="px-4 py-3"><Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">{row.role}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{derivePermissions(row.cat, row.grp, row.role === "SUPER_ADMIN").join(", ")}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.access}</td>
                  </tr>
                ))}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </V2PageShell>
  );
};

export default RoleSetup;
