import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Shield, AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePolicies } from "@/api/hooks/usePolicies";
import { LEVEL_BADGE, LEVEL_LABEL } from "@/api/hooks/useDatasetLevels";

// Tipe policy GX-Space (DatasetPolicyType)
const TYPE_STYLE: Record<string, string> = {
  ACCESS: "bg-blue-50 text-blue-700 border-blue-200",
  USAGE: "bg-violet-50 text-violet-700 border-violet-200",
  RETENTION: "bg-slate-100 text-slate-700 border-slate-200",
  SECURITY: "bg-rose-50 text-rose-700 border-rose-200",
};
const DOMAIN_LABELS: Record<string, string> = {
  wilayah_kerja: "Wilayah Kerja", sumur: "Sumur", lapangan: "Lapangan", fasilitas: "Fasilitas", seismik: "Seismik",
};

interface PolicyRow {
  policy_id: string;
  policy_name: string;
  classification: string; // type
  level?: string;
  domain?: string;
}

const Policies = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data, isLoading, isError, error, refetch } = usePolicies();
  const policies = (data ?? []) as unknown as PolicyRow[];

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return policies.filter((p) => {
      const matchesSearch = p.policy_name?.toLowerCase().includes(q);
      const matchesType = filterType === "all" || p.classification === filterType;
      return matchesSearch && matchesType;
    });
  }, [policies, searchQuery, filterType]);

  const distinctTypes = useMemo(
    () => Array.from(new Set(policies.map((p) => p.classification).filter(Boolean))),
    [policies],
  );
  const distinctLevels = useMemo(
    () => Array.from(new Set(policies.map((p) => p.level).filter(Boolean) as string[])).sort(),
    [policies],
  );

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Policies" subtitle="Registry dataset-policy" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat policies</p>
            <p className="text-sm text-muted-foreground mb-4">{(error as { message?: string })?.message || "Error"}</p>
            <Button onClick={() => refetch()} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Coba lagi</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Policies" subtitle="Dataset-policy (akses · penggunaan · retensi · keamanan)" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card"><p className="text-sm text-muted-foreground">Total Policy</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : policies.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Tipe</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : distinctTypes.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Level Klasifikasi</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : distinctLevels.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Tampil</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : filtered.length}</p></div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto md:flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari policy..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Semua tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                {distinctTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Policy</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Klasifikasi</TableHead>
                <TableHead>Domain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{searchQuery || filterType !== "all" ? "Tidak ada policy cocok filter" : "Belum ada policy"}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.policy_id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10"><Shield className="w-4 h-4 text-accent" /></div>
                        <span className="font-medium">{p.policy_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.classification && <Badge variant="outline" className={cn(TYPE_STYLE[p.classification] ?? "")}>{p.classification}</Badge>}
                    </TableCell>
                    <TableCell>
                      {p.level ? <Badge variant="outline" className={LEVEL_BADGE[p.level] ?? ""} title={LEVEL_LABEL[p.level]}>{p.level}</Badge> : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{p.domain ? (DOMAIN_LABELS[p.domain] ?? p.domain) : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Policies;
