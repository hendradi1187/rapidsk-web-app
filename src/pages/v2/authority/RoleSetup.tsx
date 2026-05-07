// src/pages/v2/authority/RoleSetup.tsx
// Backend exposes ONLY GET for /user/categories/ and /user/groups/.
// Create/Update/Delete are stubbed (localStorage) with BackendPendingBadge
// until backend exposes mutation endpoints.

import { useMemo, useState } from "react";
import { KeyRound, Users2, Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { userCategoriesService, userGroupsService } from "@/api/services/identity-provider";
import { derivePermissions } from "@/context/AuthContext";
import { BackendPendingBadge } from "@/components/dev/BackendPendingBadge";
import { toast } from "sonner";

interface StubCategory { id: string; name: string; code: string; description: string; }
interface StubGroup { id: string; category_id: string; name: string; code: string; priority: number; description: string; }

const CAT_KEY = "v2-stub-categories";
const GRP_KEY = "v2-stub-groups";
const loadStub = <T,>(key: string): T[] => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T[] : []; } catch { return []; }
};
const saveStub = <T,>(key: string, items: T[]) => localStorage.setItem(key, JSON.stringify(items));
const newId = () => `stub-${Math.random().toString(36).slice(2, 10)}`;

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

  const liveCategories = (categoriesData?.data ?? []).map((c) => ({ ...c, _source: "live" as const }));
  const liveGroups = (groupsData?.data ?? []).map((g) => ({ ...g, _source: "live" as const, category_id: g.category?.id || "" }));

  const [stubCats, setStubCats] = useState<StubCategory[]>(loadStub<StubCategory>(CAT_KEY));
  const [stubGroups, setStubGroups] = useState<StubGroup[]>(loadStub<StubGroup>(GRP_KEY));

  const allCategories = useMemo(() => [
    ...liveCategories,
    ...stubCats.map((c) => ({ ...c, _source: "stub" as const, created_at: "" })),
  ], [liveCategories, stubCats]);

  const allGroups = useMemo(() => [
    ...liveGroups,
    ...stubGroups.map((g) => ({
      ...g,
      _source: "stub" as const,
      created_at: "",
      category: { id: g.category_id, name: "", code: allCategories.find((c) => c.id === g.category_id)?.code || "" },
    })),
  ], [liveGroups, stubGroups, allCategories]);

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [editCat, setEditCat] = useState<StubCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: "", code: "", description: "" });
  const [catDelete, setCatDelete] = useState<StubCategory | null>(null);

  const openCat = (c?: any) => {
    if (c && c._source === "stub") {
      setEditCat(c);
      setCatForm({ name: c.name, code: c.code, description: c.description || "" });
    } else {
      setEditCat(null);
      setCatForm({ name: "", code: "", description: "" });
    }
    setCatDialog(true);
  };
  const saveCat = () => {
    if (!catForm.name || !catForm.code) { toast.error("Name dan code wajib"); return; }
    let next: StubCategory[];
    if (editCat) {
      next = stubCats.map((c) => c.id === editCat.id ? { ...editCat, ...catForm } : c);
    } else {
      next = [{ id: newId(), ...catForm }, ...stubCats];
    }
    setStubCats(next); saveStub(CAT_KEY, next);
    toast.success(editCat ? "Category updated (local stub)" : "Category created (local stub)");
    toast.info("Backend belum punya POST/PATCH untuk categories — tersimpan localStorage", { duration: 4000 });
    setCatDialog(false);
  };
  const removeCat = (c: StubCategory) => {
    const next = stubCats.filter((x) => x.id !== c.id);
    setStubCats(next); saveStub(CAT_KEY, next);
    toast.success("Category removed (local stub)");
    setCatDelete(null);
  };

  // Group dialog
  const [grpDialog, setGrpDialog] = useState(false);
  const [editGrp, setEditGrp] = useState<StubGroup | null>(null);
  const [grpForm, setGrpForm] = useState({ category_id: "", name: "", code: "", priority: 100, description: "" });
  const [grpDelete, setGrpDelete] = useState<StubGroup | null>(null);

  const openGrp = (g?: any) => {
    if (g && g._source === "stub") {
      setEditGrp(g);
      setGrpForm({ category_id: g.category_id, name: g.name, code: g.code, priority: g.priority, description: g.description || "" });
    } else {
      setEditGrp(null);
      setGrpForm({ category_id: allCategories[0]?.id || "", name: "", code: "", priority: 100, description: "" });
    }
    setGrpDialog(true);
  };
  const saveGrp = () => {
    if (!grpForm.category_id || !grpForm.name || !grpForm.code) { toast.error("Category, name, code wajib"); return; }
    let next: StubGroup[];
    if (editGrp) {
      next = stubGroups.map((g) => g.id === editGrp.id ? { ...editGrp, ...grpForm } : g);
    } else {
      next = [{ id: newId(), ...grpForm }, ...stubGroups];
    }
    setStubGroups(next); saveStub(GRP_KEY, next);
    toast.success(editGrp ? "Group updated (local stub)" : "Group created (local stub)");
    toast.info("Backend belum punya POST/PATCH untuk groups — tersimpan localStorage", { duration: 4000 });
    setGrpDialog(false);
  };
  const removeGrp = (g: StubGroup) => {
    const next = stubGroups.filter((x) => x.id !== g.id);
    setStubGroups(next); saveStub(GRP_KEY, next);
    toast.success("Group removed (local stub)");
    setGrpDelete(null);
  };

  return (
    <V2PageShell title="Role Setup" subtitle="User categories and groups define both AppRole and frontend permission mapping for V2." status="Preview only">
      <BackendPendingBadge variant="block" message="Backend hanya expose GET untuk /user/categories/ dan /user/groups/. POST/PATCH/DELETE belum ada → CRUD di sini disimpan ke localStorage sebagai stub. Live entries (dari backend) read-only." />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="User Categories" value={loadingCats ? "..." : allCategories.length} subtitle={`${liveCategories.length} live + ${stubCats.length} stub`} icon={Layers} trend="neutral" />
        <MetricCard title="User Groups" value={loadingGroups ? "..." : allGroups.length} subtitle={`${liveGroups.length} live + ${stubGroups.length} stub`} icon={KeyRound} trend="neutral" />
        <MetricCard title="Role Matrix" value="4 roles" subtitle="SUPER_ADMIN, CONSUMER, PROVIDER, VIEWER" icon={Users2} trend="neutral" />
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="mapping">Role Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">User Categories</CardTitle>
                <CardDescription>Live: <code className="rounded bg-muted px-1 text-xs">/user/categories/</code> · Stub: localStorage</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => openCat()}>
                <Plus className="h-4 w-4" />New Category (stub)
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Code", "Description", "Source", "Actions"]} isLoading={loadingCats}>
                {allCategories.length > 0 ? allCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{cat.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{cat.code}</Badge></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{cat.description || "—"}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${cat._source === "live" ? "border-emerald-500/40 text-emerald-500" : "border-amber-500/40 text-amber-500"}`}>{cat._source === "live" ? "Live" : "Stub 🚧"}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1" disabled={cat._source === "live"} onClick={() => openCat(cat)} title={cat._source === "live" ? "Live category — backend tidak punya PATCH" : "Edit stub"}>
                          <Pencil className="h-3 w-3" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={cat._source === "live"} onClick={() => setCatDelete(cat as StubCategory)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No categories</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">User Groups</CardTitle>
                <CardDescription>Live: <code className="rounded bg-muted px-1 text-xs">/user/groups/</code> · Stub: localStorage</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => openGrp()} disabled={allCategories.length === 0}>
                <Plus className="h-4 w-4" />New Group (stub)
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Code", "Category", "Priority", "Source", "Actions"]} isLoading={loadingGroups}>
                {allGroups.length > 0 ? allGroups.map((grp) => (
                  <tr key={grp.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{grp.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{grp.code}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{grp.category?.code || "—"}</td>
                    <td className="px-4 py-3 text-sm">{grp.priority}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${grp._source === "live" ? "border-emerald-500/40 text-emerald-500" : "border-amber-500/40 text-amber-500"}`}>{grp._source === "live" ? "Live" : "Stub 🚧"}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1" disabled={grp._source === "live"} onClick={() => openGrp(grp)}>
                          <Pencil className="h-3 w-3" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={grp._source === "live"} onClick={() => setGrpDelete(grp as StubGroup)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No groups</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Role and Permission Mapping</CardTitle>
              <CardDescription>Frontend source of truth after <code className="rounded bg-muted px-1 text-xs">auth/validate</code></CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Category Code", "Group Code", "AppRole", "Permission Set", "V2 Access"]}>
                {mappingRows.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{row.cat}</Badge></td>
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{row.grp}</Badge></td>
                    <td className="px-4 py-3"><Badge className="bg-primary/10 text-primary text-xs">{row.role}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{derivePermissions(row.cat, row.grp, row.role === "SUPER_ADMIN").join(", ")}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.access}</td>
                  </tr>
                ))}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Category (stub)" : "New Category (stub)"}</DialogTitle>
            <DialogDescription>Tersimpan ke localStorage. Backend belum punya endpoint mutation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Code *</Label>
              <Input value={catForm.code} onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })} placeholder="GOV_PROV / KKKS / SKK" />
            </div>
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Provincial Government" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button>
            <Button onClick={saveCat}>{editCat ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group dialog */}
      <Dialog open={grpDialog} onOpenChange={setGrpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editGrp ? "Edit Group (stub)" : "New Group (stub)"}</DialogTitle>
            <DialogDescription>Tersimpan ke localStorage. Backend belum punya endpoint mutation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Select value={grpForm.category_id} onValueChange={(v) => setGrpForm({ ...grpForm, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick category" /></SelectTrigger>
                <SelectContent>
                  {allCategories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name || c.code} ({c.code})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Code *</Label>
                <Input value={grpForm.code} onChange={(e) => setGrpForm({ ...grpForm, code: e.target.value.toUpperCase() })} placeholder="REVIEWER / OPERATOR / OWNER" />
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Input type="number" value={grpForm.priority} onChange={(e) => setGrpForm({ ...grpForm, priority: Number(e.target.value) })} min={1} max={1000} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={grpForm.name} onChange={(e) => setGrpForm({ ...grpForm, name: e.target.value })} placeholder="Reviewer" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={grpForm.description} onChange={(e) => setGrpForm({ ...grpForm, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrpDialog(false)}>Cancel</Button>
            <Button onClick={saveGrp}>{editGrp ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!catDelete} onOpenChange={(o) => !o && setCatDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category (stub)?</AlertDialogTitle>
            <AlertDialogDescription>Hapus <strong>{catDelete?.name}</strong> dari localStorage.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => catDelete && removeCat(catDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!grpDelete} onOpenChange={(o) => !o && setGrpDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group (stub)?</AlertDialogTitle>
            <AlertDialogDescription>Hapus <strong>{grpDelete?.name}</strong> dari localStorage.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => grpDelete && removeGrp(grpDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default RoleSetup;
