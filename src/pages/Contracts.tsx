import { useMemo, useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { DomainClusterTabs } from "@/components/common/DomainClusterTabs";
import { Pager } from "@/components/common/Pager";
import { contractDomain, DOMAINS } from "@/lib/fulfillment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, FileSignature, Eye, Inbox, Loader2, ArrowRight, Plus, CalendarCheck, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useContracts } from "@/api/hooks/useContracts";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useProviders } from "@/api/hooks/useProviders";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useDomain } from "@/context/DomainContext";
import { useAuth } from "@/context/AuthContext";
import { RequestContractDialog } from "@/components/contracts/RequestContractDialog";
import { EditContractDialog } from "@/components/contracts/EditContractDialog";
import { contractsApi, type ContractItem, type ContractDetail } from "@/api/services/policy-contract";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  REQUESTED: "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};
const STATUS_ORDER = ["REQUESTED", "APPROVED", "ACTIVE", "REJECTED"];

const Contracts = () => {
  const { domainId } = useDomain();
  const { hasRole, role, participantId } = useAuth();
  const canRequest = hasRole(["CONSUMER", "SUPER_ADMIN", "ADMIN"]);
  const [reqOpen, setReqOpen] = useState(false);
  const { data, isLoading, isError } = useContracts();
  const { data: providers } = useProviders();
  const { data: datasets } = useDatasets();
  const { data: agreements } = useAgreements();
  // Isolasi data: KKKS (PROVIDER) hanya lihat kontrak di mana ia provider. BE sudah
  // memfilter; ini lapis pertahanan kedua di FE.
  const allContracts = (data ?? []) as ContractItem[];
  const contracts =
    role === "PROVIDER" && participantId
      ? allContracts.filter((c) => c.provider_id === participantId)
      : allContracts;
  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  // peta id → nama (faithful join, bukan UUID mentah)
  const partName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of (providers ?? []) as Array<{ provider_id: string; provider_name: string }>) m[p.provider_id] = p.provider_name;
    return m;
  }, [providers]);
  const dsName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const d of (datasets ?? [])) m[d.dataset_id] = d.dataset_name;
    return m;
  }, [datasets]);
  const nameOf = (id?: string) => (id && partName[id]) || (id ? `${id.slice(0, 8)}…` : "—");

  const counts = STATUS_ORDER.map((s) => ({ s, n: contracts.filter((c) => c.status === s).length }));

  // Cluster domain + pagination
  const [filterDomain, setFilterDomain] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const domainCounts = useMemo(() => {
    const c: Record<string, number> = { all: contracts.length };
    for (const d of DOMAINS) c[d.key] = 0;
    for (const ct of contracts) {
      const k = contractDomain(ct);
      if (k) c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [contracts]);
  const filteredContracts = useMemo(
    () => (filterDomain === "all" ? contracts : contracts.filter((c) => contractDomain(c) === filterDomain)),
    [contracts, filterDomain],
  );
  const pagedContracts = useMemo(
    () => filteredContracts.slice((page - 1) * pageSize, page * pageSize),
    [filteredContracts, page, pageSize],
  );
  useEffect(() => setPage(1), [filterDomain]);
  useEffect(() => setPage(1), [pageSize]);

  // detail dialog
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const openDetail = async (c: ContractItem) => {
    setOpen(true);
    setDetail(null);
    if (!domainId) return;
    setLoadingDetail(true);
    try {
      setDetail(await contractsApi.get(domainId, c.id));
    } finally {
      setLoadingDetail(false);
    }
  };

  // Edit contract — bisa dipicu dari row tabel maupun dari dalam detail dialog,
  // terlepas dari status (REQUESTED atau ACTIVE sekalipun).
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContractDetail | null>(null);
  const [loadingEditTarget, setLoadingEditTarget] = useState(false);
  const openEdit = async (c: ContractItem) => {
    if (!domainId) return;
    setLoadingEditTarget(true);
    try {
      const full = await contractsApi.get(domainId, c.id);
      setEditTarget(full);
      setEditOpen(true);
    } catch {
      toast.error("Gagal memuat detail contract untuk diedit.");
    } finally {
      setLoadingEditTarget(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="Contracts" subtitle="Kontrak penyediaan data KKKS ↔ SKK Migas" />
      <div className="p-6 space-y-6">
        {canRequest && (
          <div className="flex justify-end">
            <Button
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => setReqOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajukan Permintaan Data
            </Button>
          </div>
        )}
        {/* Ringkasan status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {counts.map(({ s, n }) => (
            <div key={s} className="stat-card">
              <p className="text-sm font-medium text-muted-foreground">{s}</p>
              <p className="text-3xl font-bold mt-1">{isLoading ? "—" : n}</p>
              <Badge variant="outline" className={`mt-2 ${STATUS_STYLE[s] ?? ""}`}>{s}</Badge>
            </div>
          ))}
        </div>

        {/* Cluster Domain */}
        {!isLoading && !isError && (
          <DomainClusterTabs value={filterDomain} onChange={setFilterDomain} counts={domainCounts} />
        )}

        <Card className="panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSignature className="w-5 h-5 text-accent" />
              Daftar Contract ({filteredContracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
            ) : isError ? (
              <div className="flex items-center justify-center py-12 text-rose-600"><AlertCircle className="w-5 h-5 mr-2" /> Gagal memuat contracts.</div>
            ) : filteredContracts.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-muted-foreground gap-2"><Inbox className="w-8 h-8 opacity-40" /><p className="text-sm">Tidak ada contract pada cluster ini.</p></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Nama Contract</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider (KKKS)</TableHead>
                    <TableHead>Consumer (SKK Migas)</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedContracts.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(c)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="outline" className={STATUS_STYLE[c.status] ?? ""}>{c.status}</Badge></TableCell>
                      <TableCell>{nameOf(c.provider_id)}</TableCell>
                      <TableCell>{nameOf(c.consumer_id)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetail(c); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={loadingEditTarget}
                            onClick={(e) => { e.stopPropagation(); void openEdit(c); }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!isLoading && !isError && (
              <Pager
                page={page}
                total={filteredContracts.length}
                pageSize={pageSize}
                onPage={setPage}
                onPageSize={setPageSize}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detail Contract</DialogTitle></DialogHeader>
          {loadingDetail ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat...</div>
          ) : detail ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{detail.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS_STYLE[detail.status] ?? ""}>{detail.status}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditTarget(detail);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                </div>
              </div>
              {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}
              <div className="flex items-center gap-3 text-sm">
                <span className="px-2 py-1 rounded bg-accent/10 text-accent font-medium">{nameOf(detail.provider_id)}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">{nameOf(detail.consumer_id)}</span>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Dataset tertaut ({detail.datasets?.length ?? 0})</p>
                {detail.datasets && detail.datasets.length > 0 ? (
                  <ul className="space-y-1">
                    {detail.datasets.map((d) => (
                      <li key={d.dataset_id} className="text-sm flex items-center gap-2">
                        <FileSignature className="w-3.5 h-3.5 text-muted-foreground" />
                        {dsName[d.dataset_id] ?? `${d.dataset_id.slice(0, 8)}…`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada dataset tertaut.</p>
                )}
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Perjanjian (Agreement)</p>
                {(() => {
                  const ags = (agreements ?? []).filter((a) => a.contract_id === detail.id);
                  if (ags.length === 0)
                    return <p className="text-sm text-muted-foreground">Belum ada perjanjian.</p>;
                  return (
                    <ul className="space-y-1.5">
                      {ags.map((a) => (
                        <li key={a.id} className="text-sm flex items-center gap-2">
                          <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{fmtDate(a.effective_from)} — {fmtDate(a.effective_to)}</span>
                          <Badge variant="outline" className={STATUS_STYLE[a.status] ?? ""}>{a.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada detail.</p>
          )}
        </DialogContent>
      </Dialog>

      <RequestContractDialog open={reqOpen} onOpenChange={setReqOpen} />
      <EditContractDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          // Kalau detail dialog kontrak yang sama masih kebuka, refresh biar sinkron
          // tanpa harus tutup-buka manual.
          if (!o && editTarget && detail?.id === editTarget.id && domainId) {
            void contractsApi.get(domainId, editTarget.id).then(setDetail);
          }
        }}
        contract={editTarget}
      />
    </div>
  );
};

export default Contracts;
