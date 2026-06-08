import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, AlertCircle, RefreshCw, Inbox, List, Loader2 } from "lucide-react";
import { useVocabularies } from "@/api/hooks/useVocabularies";
import { useDomain } from "@/context/DomainContext";
import { vocabulariesApi } from "@/api/services/vocabularies";
import type { Vocabulary, VocabularyTerm } from "@/api/types/vocabularies";

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
};

const Vocabularies = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { domainId } = useDomain();
  const { data, isLoading, isError, error, refetch } = useVocabularies();
  const vocabularies = (data ?? []) as unknown as Vocabulary[];

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return vocabularies.filter((v) => v.name?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q));
  }, [vocabularies, searchQuery]);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Vocabulary | null>(null);
  const [terms, setTerms] = useState<VocabularyTerm[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const openTerms = async (v: Vocabulary) => {
    setActive(v); setOpen(true); setTerms([]);
    if (!domainId) return;
    setLoadingTerms(true);
    try { setTerms(await vocabulariesApi.terms(domainId, v.vocabulary_id)); }
    finally { setLoadingTerms(false); }
  };

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Vocabularies" subtitle="Kosakata semantik domain" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat vocabularies</p>
            <p className="text-sm text-muted-foreground mb-4">{(error as { message?: string })?.message || "Error"}</p>
            <Button onClick={() => refetch()} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Coba lagi</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Vocabularies" subtitle="Kosakata semantik domain (term, datatype, unit)" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="stat-card"><p className="text-sm text-muted-foreground">Total Vocabulary</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : vocabularies.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Tampil</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : filtered.length}</p></div>
          <div className="stat-card"><p className="text-sm text-muted-foreground">Published</p><p className="text-3xl font-bold mt-1">{isLoading ? "—" : vocabularies.filter((v) => v.status === "PUBLISHED").length}</p></div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari vocabulary..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="panel py-12 flex flex-col items-center text-muted-foreground gap-2"><Inbox className="w-8 h-8 opacity-40" /><p className="text-sm">Belum ada vocabulary.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((v) => (
              <Card key={v.vocabulary_id} className="panel">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-accent" /> {v.name}</CardTitle>
                    <div className="flex gap-1.5">
                      {v.version && <Badge variant="outline" className="font-mono text-xs">v{String(v.version).replace(/^v/i, "")}</Badge>}
                      {v.status && <Badge variant="outline" className={STATUS_STYLE[v.status] ?? ""}>{v.status}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{v.description || "—"}</p>
                  <Button variant="outline" size="sm" onClick={() => openTerms(v)}><List className="w-4 h-4 mr-2" /> Lihat Terms</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Terms · {active?.name}</DialogTitle></DialogHeader>
          {loadingTerms ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat terms...</div>
          ) : terms.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada term.</p>
          ) : (
            <Table>
              <TableHeader><TableRow className="table-header"><TableHead>Term</TableHead><TableHead>Datatype</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
              <TableBody>
                {terms.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.term}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{t.datatype ?? "—"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.unit ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vocabularies;
