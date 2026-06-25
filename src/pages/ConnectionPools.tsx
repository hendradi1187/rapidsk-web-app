import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Pager } from "@/components/common/Pager";
import { useAuth } from "@/context/AuthContext";
import { useProviders } from "@/api/hooks/useProviders";
import {
  useConnectionPools,
  useCreateConnectionPool,
  useUpdateConnectionPool,
  useDeleteConnectionPool,
} from "@/api/hooks/useConnectionPools";
import type {
  ConnectionPoolCreateRequest,
  ConnectionPoolItem,
  ConnectionPoolUpdateRequest,
} from "@/api/types/governance";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  Link2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

type PoolForm = {
  participant_id: string;
  name: string;
  type: "CONSUMER" | "PROVIDER";
  token: string;
  endpoint: string;
  well_known_jwt_url: string;
  url_consumer: string;
  url_provider: string;
};

const emptyForm: PoolForm = {
  participant_id: "",
  name: "",
  type: "PROVIDER",
  token: "",
  endpoint: "",
  well_known_jwt_url: "",
  url_consumer: "",
  url_provider: "",
};

type PoolInspectionResult = {
  ok: boolean;
  checks: Array<{
    key: string;
    status: "pass" | "fail";
    httpStatus?: number | null;
    message: string;
  }>;
  blockingErrors: string[];
};

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const ConnectionPools = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole(["SUPER_ADMIN", "ADMIN"]);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<ConnectionPoolItem | null>(null);
  const [selectedPool, setSelectedPool] = useState<ConnectionPoolItem | null>(null);
  const [form, setForm] = useState<PoolForm>(emptyForm);
  const [inspection, setInspection] = useState<PoolInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const { data, isLoading, isError, error, refetch } = useConnectionPools();
  const { data: providersData } = useProviders();
  const createMutation = useCreateConnectionPool();
  const updateMutation = useUpdateConnectionPool();
  const deleteMutation = useDeleteConnectionPool();

  const providers = useMemo(
    () => (providersData ?? []) as Array<{ provider_id: string; provider_name: string }>,
    [providersData],
  );

  const providerNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const provider of providers) {
      map[provider.provider_id] = provider.provider_name;
    }
    return map;
  }, [providers]);

  const pools = useMemo(() => (data ?? []) as ConnectionPoolItem[], [data]);

  const filteredPools = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pools;
    return pools.filter((pool) => {
      const participantName = providerNameById[pool.participant_id] ?? pool.participant_id;
      return [
        pool.name,
        participantName,
        pool.type,
        pool.metadata?.endpoint,
        pool.metadata?.well_known_jwt_url,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [pools, providerNameById, search]);
  const pagedPools = useMemo(
    () => filteredPools.slice((page - 1) * pageSize, page * pageSize),
    [filteredPools, page, pageSize],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingPool(null);
    setInspection(null);
  };
  useEffect(() => setPage(1), [search, pageSize]);

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (pool: ConnectionPoolItem) => {
    setEditingPool(pool);
    setForm({
      participant_id: pool.participant_id,
      name: pool.name,
      type: pool.type,
      token: pool.token,
      endpoint: pool.metadata?.endpoint ?? "",
      well_known_jwt_url: pool.metadata?.well_known_jwt_url ?? "",
      url_consumer: pool.metadata?.url_consumer ?? "",
      url_provider: pool.metadata?.url_provider ?? "",
    });
    setIsFormOpen(true);
  };

  const openDelete = (pool: ConnectionPoolItem) => {
    setSelectedPool(pool);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    if (!form.participant_id) return "Participant wajib dipilih";
    if (form.name.trim().length < 3) return "Nama registry minimal 3 karakter";
    if (!form.token.trim()) return "Token wajib diisi";
    if (form.token.trim().length < 8) return "Token terlalu pendek untuk dipakai sebagai registry";
    if (!form.endpoint.trim()) return "Connector endpoint wajib diisi";
    if (!isValidHttpUrl(form.endpoint.trim())) return "Connector endpoint harus berupa URL http/https yang valid";
    if (!form.well_known_jwt_url.trim()) return "Well-known JWT URL wajib diisi";
    if (!isValidHttpUrl(form.well_known_jwt_url.trim())) return "Well-known JWT URL harus berupa URL http/https yang valid";
    if (form.url_consumer.trim() && !isValidHttpUrl(form.url_consumer.trim())) return "Legacy URL consumer harus berupa URL valid";
    if (form.url_provider.trim() && !isValidHttpUrl(form.url_provider.trim())) return "Legacy URL provider harus berupa URL valid";

    const duplicatePool = pools.find((pool) => {
      if (editingPool && pool.id === editingPool.id) return false;
      return (
        pool.participant_id === form.participant_id &&
        pool.type === form.type &&
        String(pool.metadata?.endpoint ?? "").trim() === form.endpoint.trim()
      );
    });
    if (duplicatePool) {
      return "Participant ini sudah punya registry dengan tipe dan connector endpoint yang sama";
    }

    return null;
  };

  const buildCreatePayload = (): ConnectionPoolCreateRequest => ({
    participant_id: form.participant_id,
    name: form.name.trim(),
    type: form.type,
    token: form.token.trim(),
    metadata: {
      endpoint: form.endpoint.trim(),
      well_known_jwt_url: form.well_known_jwt_url.trim(),
      ...(form.url_consumer.trim() ? { url_consumer: form.url_consumer.trim() } : {}),
      ...(form.url_provider.trim() ? { url_provider: form.url_provider.trim() } : {}),
    },
  });

  const buildUpdatePayload = (): ConnectionPoolUpdateRequest => ({
    name: form.name.trim(),
    type: form.type,
    token: form.token.trim(),
    metadata: {
      endpoint: form.endpoint.trim(),
      well_known_jwt_url: form.well_known_jwt_url.trim(),
      ...(form.url_consumer.trim() ? { url_consumer: form.url_consumer.trim() } : {}),
      ...(form.url_provider.trim() ? { url_provider: form.url_provider.trim() } : {}),
    },
  });

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const inspectResult = await inspectTargets();
      if (!inspectResult.ok) {
        toast.error("Connection pool belum lolos pemeriksaan endpoint dan JWKS.");
        return;
      }

      if (editingPool) {
        await updateMutation.mutateAsync({ id: editingPool.id, body: buildUpdatePayload() });
        toast.success("Connection pool berhasil diperbarui");
      } else {
        await createMutation.mutateAsync(buildCreatePayload());
        toast.success("Connection pool berhasil ditambahkan");
      }
      setIsFormOpen(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan connection pool"));
    }
  };

  const inspectTargets = async () => {
    try {
      setIsInspecting(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/admin/connection-pool/inspect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          endpoint: form.endpoint.trim(),
          wellKnownJwtUrl: form.well_known_jwt_url.trim(),
        }),
      });

      const payload = (await response.json()) as PoolInspectionResult;
      setInspection(payload);
      if (!response.ok) {
        throw new Error(payload.blockingErrors?.[0] || "Pemeriksaan connection pool gagal");
      }
      toast.success("Endpoint connector dan JWKS berhasil dicek.");
      return payload;
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Pemeriksaan connection pool gagal"));
      return {
        ok: false,
        checks: [],
        blockingErrors: [getApiErrorMessage(err, "Pemeriksaan connection pool gagal")],
      } satisfies PoolInspectionResult;
    } finally {
      setIsInspecting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPool) return;

    try {
      await deleteMutation.mutateAsync(selectedPool.id);
      setIsDeleteOpen(false);
      setSelectedPool(null);
      toast.success("Connection pool berhasil dihapus");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus connection pool"));
    }
  };

  if (!canManage) {
    return (
      <div className="min-h-screen">
        <Header
          title="Connection Pools"
          subtitle="Akses dibatasi untuk admin control plane"
        />
        <div className="p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Modul ini hanya dipakai admin untuk menyiapkan metadata connector participant.
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header
          title="Connection Pools"
          subtitle="Registry metadata connector participant"
        />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat connection pool</p>
            <p className="text-sm text-muted-foreground mb-4">{getApiErrorMessage(error, "Error")}</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Connection Pools"
        subtitle="Registry control plane untuk endpoint connector dan JWKS participant"
      />
      <div className="p-6 space-y-6">
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-accent shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Siapa yang seting sekarang</p>
              <p className="text-muted-foreground">
                Connection pool diset oleh admin. Modul ini menyimpan metadata control plane per participant:
                connector endpoint dan `well_known_jwt_url`. Transfer center hanya membaca hasil registry ini.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Total Registry</p>
            <p className="text-3xl font-bold mt-1">{isLoading ? "…" : pools.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Participant Terpasang</p>
            <p className="text-3xl font-bold mt-1">
              {isLoading ? "…" : new Set(pools.map((pool) => pool.participant_id)).size}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Hasil Filter</p>
            <p className="text-3xl font-bold mt-1">{isLoading ? "…" : filteredPools.length}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari pool, participant, endpoint..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pool
            </Button>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Registry</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Connector Endpoint</TableHead>
                <TableHead>Well-known JWT</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredPools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Belum ada connection pool yang cocok.
                  </TableCell>
                </TableRow>
              ) : (
                pagedPools.map((pool) => (
                  <TableRow key={pool.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{pool.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{pool.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {providerNameById[pool.participant_id] ?? pool.participant_id}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {pool.participant_id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pool.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {pool.metadata?.endpoint || pool.metadata?.url_provider || pool.metadata?.url_consumer || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {pool.metadata?.well_known_jwt_url || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(pool)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => openDelete(pool)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pager
            page={page}
            total={filteredPools.length}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{editingPool ? "Edit Connection Pool" : "Tambah Connection Pool"}</DialogTitle>
            <DialogDescription>
              Registry ini dipakai control plane untuk menemukan connector endpoint dan JWKS participant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Participant</Label>
              <select
                value={form.participant_id}
                onChange={(e) => setForm((current) => ({ ...current, participant_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- Pilih participant --</option>
                {providers.map((provider) => (
                  <option key={provider.provider_id} value={provider.provider_id}>
                    {provider.provider_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nama Registry</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  placeholder="Contoh: PHE Connector Registry"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipe</Label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      type: e.target.value as "CONSUMER" | "PROVIDER",
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PROVIDER">PROVIDER</option>
                  <option value="CONSUMER">CONSUMER</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Token</Label>
              <Input
                value={form.token}
                onChange={(e) => setForm((current) => ({ ...current, token: e.target.value }))}
                placeholder="Connection pool token"
              />
            </div>
            <div className="space-y-2">
              <Label>Connector Endpoint</Label>
              <Input
                value={form.endpoint}
                onChange={(e) => {
                  setInspection(null);
                  setForm((current) => ({ ...current, endpoint: e.target.value }));
                }}
                placeholder="http://participant-connector.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Well-known JWT URL</Label>
              <Input
                value={form.well_known_jwt_url}
                onChange={(e) => {
                  setInspection(null);
                  setForm((current) => ({ ...current, well_known_jwt_url: e.target.value }));
                }}
                placeholder="http://participant-connector.example.com/.../.well-known/jwks.json"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Legacy URL Consumer</Label>
                <Input
                  value={form.url_consumer}
                  onChange={(e) => setForm((current) => ({ ...current, url_consumer: e.target.value }))}
                  placeholder="Opsional"
                />
              </div>
              <div className="space-y-2">
                <Label>Legacy URL Provider</Label>
                <Input
                  value={form.url_provider}
                  onChange={(e) => setForm((current) => ({ ...current, url_provider: e.target.value }))}
                  placeholder="Opsional"
                />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Link2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  `endpoint` dan `well_known_jwt_url` adalah pasangan minimal yang sekarang dibaca flow transfer B1.
                  Field legacy tetap boleh disimpan kalau masih ada participant lama.
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">Pemeriksaan koneksi</p>
                  <p className="text-xs text-slate-500">Wrapper akan mencoba menjangkau connector endpoint dan membaca JWKS dari sisi server.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => void inspectTargets()} disabled={isInspecting}>
                  {isInspecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Cek Endpoint
                </Button>
              </div>
              {inspection && (
                <div className="mt-3 space-y-2">
                  {inspection.checks.map((check) => (
                    <div key={check.key} className="flex items-start gap-2 rounded-md bg-white px-3 py-2 text-xs text-slate-600">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${check.status === "pass" ? "text-emerald-600" : "text-rose-600"}`} />
                      <div>
                        <p className="font-medium text-slate-900">{check.key === "endpoint" ? "Connector endpoint" : "JWKS"}</p>
                        <p>{check.message}</p>
                      </div>
                    </div>
                  ))}
                  {inspection.blockingErrors.length > 0 && (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {inspection.blockingErrors.join(" ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Hapus Connection Pool</DialogTitle>
            <DialogDescription>
              Registry yang dihapus tidak akan lagi terbaca oleh transfer center.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="font-semibold">{selectedPool?.name ?? "-"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedPool ? providerNameById[selectedPool.participant_id] ?? selectedPool.participant_id : "-"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground break-all">
              {selectedPool?.metadata?.endpoint ?? "Endpoint belum tercatat"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConnectionPools;
