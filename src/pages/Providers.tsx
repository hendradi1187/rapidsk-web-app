import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Pager } from "@/components/common/Pager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, AlertCircle, RefreshCw, Inbox, Building2, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProviders } from "@/api/hooks/useProviders";

interface ParticipantRow {
  provider_id: string;
  provider_name: string;
  organization_type?: string;
  address?: string;
  status?: string;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-zinc-100 text-zinc-600 border-zinc-200",
  SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING: "bg-blue-50 text-blue-700 border-blue-200",
};
const TYPE_STYLE: Record<string, string> = {
  ENTERPRISE: "bg-amber-50 text-amber-700 border-amber-200",
  GOV_CENTRAL: "bg-indigo-50 text-indigo-700 border-indigo-200",
  GOV_PROV: "bg-sky-50 text-sky-700 border-sky-200",
  GOV_LOCAL: "bg-teal-50 text-teal-700 border-teal-200",
};
// Peran berdasarkan organization_type (faithful: ENTERPRISE=KKKS, GOV_*=otoritas)
const roleOf = (t?: string): { label: string; kkks: boolean } =>
  t === "ENTERPRISE" ? { label: "KKKS (Provider)", kkks: true } : { label: "SKK Migas / Regulator", kkks: false };

const Providers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isError, error, refetch } = useProviders();
  const participants = (data ?? []) as unknown as ParticipantRow[];

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return participants.filter(
      (p) => p.provider_name?.toLowerCase().includes(q) || p.organization_type?.toLowerCase().includes(q),
    );
  }, [participants, searchQuery]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  useEffect(() => setPage(1), [searchQuery]);

  const kkksCount = participants.filter((p) => p.organization_type === "ENTERPRISE").length;
  const authorityCount = participants.filter((p) => (p.organization_type || "").startsWith("GOV")).length;

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Participants" subtitle="Peserta data space (KKKS & SKK Migas)" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat participants</p>
            <p className="text-sm text-muted-foreground mb-4">{(error as { message?: string })?.message || "Error"}</p>
            <Button onClick={() => refetch()} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Coba lagi</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Participants" subtitle="Peserta data space (KKKS & SKK Migas)" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card"><p className="text-sm text-muted-foreground">Total Participant</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : participants.length}</p></div>
          <div className="stat-card"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">KKKS</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : kkksCount}</p></div><Factory className="w-5 h-5 text-amber-500" /></div></div>
          <div className="stat-card"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Otoritas/Gov</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : authorityCount}</p></div><Building2 className="w-5 h-5 text-indigo-500" /></div></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Tampil</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : filtered.length}</p></div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari participant..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Organisasi</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{searchQuery ? "Tidak ada participant cocok" : "Belum ada participant"}</p>
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((p) => {
                  const role = roleOf(p.organization_type);
                  return (
                    <TableRow key={p.provider_id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", role.kkks ? "bg-amber-100" : "bg-indigo-100")}>
                            {role.kkks ? <Factory className="w-4 h-4 text-amber-600" /> : <Building2 className="w-4 h-4 text-indigo-600" />}
                          </div>
                          <span className="font-medium">{p.provider_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.organization_type && <Badge variant="outline" className={cn(TYPE_STYLE[p.organization_type] ?? "")}>{p.organization_type}</Badge>}
                      </TableCell>
                      <TableCell><span className="text-sm">{role.label}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.address ?? "—"}</TableCell>
                      <TableCell>
                        {p.status && <Badge variant="outline" className={cn(STATUS_STYLES[p.status?.toUpperCase()] ?? "bg-slate-50 text-slate-700 border-slate-200")}>{p.status}</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {!isLoading && <Pager page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />}
        </div>
      </div>
    </div>
  );
};

export default Providers;
