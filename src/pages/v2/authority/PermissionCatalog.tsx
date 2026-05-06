// src/pages/v2/authority/PermissionCatalog.tsx
// Phase 1 — Permission catalog: role × permission matrix.
// Backend doesn't expose a permission catalog endpoint yet — this page edits
// frontend-derived permissions stored in localStorage as overrides for demo.

import { useMemo, useState } from "react";
import { Shield, Plus, Trash2, Save } from "lucide-react";
import { V2PageShell, MetricCard } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BackendPendingBadge } from "@/components/dev/BackendPendingBadge";
import { toast } from "sonner";
import type { AppRole } from "@/context/AuthContext";

const ROLES: AppRole[] = ["SUPER_ADMIN", "CONSUMER", "PROVIDER", "VIEWER"];

const STORAGE_KEY = "v2-permission-catalog";

const DEFAULT_PERMISSIONS = [
  "catalog.view", "catalog.manage", "catalog.vocab", "catalog.publish",
  "datasets.manage",
  "contracts.view", "contracts.manage",
  "agreements.view", "agreements.approve", "agreements.manage",
  "participants.manage", "users.manage",
  "mapping.manage", "mapping.view:own",
  "monitoring.view", "monitoring.manage",
  "transfer.view", "transfer.view:own", "transfer.manage",
  "audit.view", "audit.view:own",
  "compliance.view",
  "fulfilment.manage",
  "domains.acknowledge",
  "reports.generate",
  "docs.view",
];

type Matrix = Record<string, Record<AppRole, boolean>>;

const loadMatrix = (): Matrix | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Matrix) : null;
  } catch {
    return null;
  }
};

const PermissionCatalog = () => {
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_PERMISSIONS);
  const [matrix, setMatrix] = useState<Matrix>(() => {
    const stored = loadMatrix();
    if (stored) return stored;
    const init: Matrix = {};
    DEFAULT_PERMISSIONS.forEach((p) => {
      init[p] = { SUPER_ADMIN: true, CONSUMER: false, PROVIDER: false, VIEWER: false };
    });
    return init;
  });
  const [newPermission, setNewPermission] = useState("");
  const [search, setSearch] = useState("");

  const filteredPermissions = useMemo(
    () => permissions.filter((p) => p.toLowerCase().includes(search.toLowerCase())),
    [permissions, search]
  );

  const toggleCell = (perm: string, role: AppRole) => {
    setMatrix((prev) => ({
      ...prev,
      [perm]: { ...prev[perm], [role]: !prev[perm]?.[role] },
    }));
  };

  const handleAddPermission = () => {
    const key = newPermission.trim();
    if (!key) {
      toast.error("Permission key required");
      return;
    }
    if (permissions.includes(key)) {
      toast.error("Permission already exists");
      return;
    }
    setPermissions([...permissions, key]);
    setMatrix((prev) => ({
      ...prev,
      [key]: { SUPER_ADMIN: true, CONSUMER: false, PROVIDER: false, VIEWER: false },
    }));
    setNewPermission("");
    toast.success("Permission added to catalog");
  };

  const handleDeletePermission = (perm: string) => {
    setPermissions(permissions.filter((p) => p !== perm));
    setMatrix((prev) => {
      const next = { ...prev };
      delete next[perm];
      return next;
    });
    toast.success("Permission removed");
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
    toast.success("Permission matrix saved (local only)");
    toast.info("Backend belum tersedia — perubahan tidak push ke server", { duration: 4000 });
  };

  const counts = useMemo(() => {
    const c: Record<AppRole, number> = { SUPER_ADMIN: 0, CONSUMER: 0, PROVIDER: 0, VIEWER: 0 };
    Object.values(matrix).forEach((row) => {
      ROLES.forEach((r) => { if (row[r]) c[r] += 1; });
    });
    return c;
  }, [matrix]);

  return (
    <V2PageShell title="Permission Catalog" subtitle="Manage role × permission matrix used by frontend gating." status="Preview only">
      <BackendPendingBadge variant="block" message="Endpoint /permissions/catalog dan /roles/{role}/permissions belum tersedia. Saat ini matrix dihardcode di frontend (PERMISSIONS_BY_ROLE) dan halaman ini menyimpan override di localStorage saja." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((role) => (
          <MetricCard key={role} title={role.replace("_", " ")} value={counts[role]} subtitle={`Permissions assigned`} icon={Shield} trend="neutral" />
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Add Permission</CardTitle>
          <CardDescription>Define a new permission key (e.g. <code className="rounded bg-muted px-1 text-xs">domain.scope:create</code>) and assign it per role below.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-1">
            <Label className="text-xs">Permission Key</Label>
            <Input value={newPermission} onChange={(e) => setNewPermission(e.target.value)} placeholder="resource.action[:scope]" />
          </div>
          <Button className="self-end gap-2" onClick={handleAddPermission}>
            <Plus className="h-4 w-4" />Add
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Role × Permission Matrix</CardTitle>
            <CardDescription>Click cells to toggle. Save persists to local storage.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter permissions..." className="w-60" />
            <Button className="gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />Save Matrix
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permission</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{r.replace("_", " ")}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredPermissions.map((perm) => (
                  <tr key={perm} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{perm}</td>
                    {ROLES.map((role) => (
                      <td key={role} className="px-4 py-3 text-center">
                        <Checkbox checked={Boolean(matrix[perm]?.[role])} onCheckedChange={() => toggleCell(perm, role)} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => handleDeletePermission(perm)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredPermissions.length === 0 && (
                  <tr><td colSpan={ROLES.length + 2} className="px-4 py-8 text-center text-xs text-muted-foreground">No permissions match filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Live Permission Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            Frontend currently derives permissions from <code className="rounded bg-muted px-1">PERMISSIONS_BY_ROLE</code> in <code className="rounded bg-muted px-1">src/config/rbac.ts</code> and <code className="rounded bg-muted px-1">src/context/AuthContext.tsx</code>.
          </p>
          <p>Once the backend exposes <code className="rounded bg-muted px-1">GET /permissions/catalog</code> + <code className="rounded bg-muted px-1">PUT /roles/{`{role}`}/permissions</code>, this page will switch from localStorage to API calls.</p>
          <Badge variant="outline" className="mt-2 text-[10px]">Required keys at minimum: catalog, datasets, contracts, agreements, participants, mapping, monitoring, transfer, audit, compliance, fulfilment, reports, domains</Badge>
        </CardContent>
      </Card>
    </V2PageShell>
  );
};

export default PermissionCatalog;
