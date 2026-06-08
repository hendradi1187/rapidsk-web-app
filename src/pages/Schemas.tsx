import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, FileJson, AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { useSchemas } from "@/api/hooks/useSchemas";
import { useVocabularies } from "@/api/hooks/useVocabularies";
import type { SchemaItem } from "@/api/types/schemas";

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  DEPRECATED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const Schemas = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isError, error, refetch } = useSchemas();
  const { data: vocabs } = useVocabularies();
  const schemas = (data ?? []) as unknown as SchemaItem[];

  // resolve vocabulary_id → nama (faithful join)
  const vocabName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of (vocabs ?? []) as Array<{ vocabulary_id: string; name: string }>) m[v.vocabulary_id] = v.name;
    return m;
  }, [vocabs]);
  const vocabularyOf = (s: SchemaItem) => s.vocabulary_name || (s.vocabulary_id && vocabName[s.vocabulary_id]) || "—";

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return schemas.filter((s) => `v${s.version}`.toLowerCase().includes(q) || vocabularyOf(s).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemas, searchQuery, vocabName]);

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Schemas" subtitle="Katalog skema metadata" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat schemas</p>
            <p className="text-sm text-muted-foreground mb-4">{(error as { message?: string })?.message || "Error"}</p>
            <Button onClick={() => refetch()} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Coba lagi</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Schemas" subtitle="Katalog skema metadata (berbasis vocabulary)" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="stat-card"><p className="text-sm text-muted-foreground">Total Schema</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : schemas.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Tampil</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : filtered.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Published</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : schemas.filter((s) => s.status === "PUBLISHED").length}</p></div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari schema / vocabulary..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Schema</TableHead>
                <TableHead>Vocabulary</TableHead>
                <TableHead>Versi</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{searchQuery ? "Tidak ada schema cocok" : "Belum ada schema"}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.schema_id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10"><FileJson className="w-4 h-4 text-accent" /></div>
                        <span className="font-medium">Schema v{String(s.version).replace(/^v/i, "")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{vocabularyOf(s)}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">v{String(s.version).replace(/^v/i, "")}</Badge></TableCell>
                    <TableCell>{s.status && <Badge variant="outline" className={STATUS_STYLE[s.status] ?? ""}>{s.status}</Badge>}</TableCell>
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

export default Schemas;
