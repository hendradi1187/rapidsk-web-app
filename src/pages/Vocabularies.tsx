import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Search,
  BookOpen,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useVocabularies } from "@/api/hooks/useVocabularies";

const Vocabularies = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: vocabularies, isLoading, isError, error, refetch } = useVocabularies();

  const filtered = useMemo(() => {
    if (!vocabularies) return [];
    const q = searchQuery.toLowerCase();
    return vocabularies.filter(
      (v) =>
        v.vocabulary_term?.toLowerCase().includes(q) ||
        v.canonical_name?.toLowerCase().includes(q),
    );
  }, [vocabularies, searchQuery]);

  const distinctCanonical = useMemo(
    () => new Set(vocabularies?.map((v) => v.canonical_name).filter(Boolean) ?? []),
    [vocabularies],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Vocabularies" subtitle="Term-to-canonical mapping registry" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
            <p className="mt-2 text-muted-foreground">Loading vocabularies...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Vocabularies" subtitle="Term-to-canonical mapping registry" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Failed to load vocabularies</p>
            <p className="text-sm text-muted-foreground mb-4">
              {(error as any)?.message || "An error occurred"}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Vocabularies" subtitle="Term-to-canonical mapping registry" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <BookOpen className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vocabularies?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Terms</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <BookOpen className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filtered.length}</p>
                <p className="text-sm text-muted-foreground">Showing Results</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <BookOpen className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{distinctCanonical.size}</p>
                <p className="text-sm text-muted-foreground">Canonical Names</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search terms or canonical names..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Vocabulary Term</TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>Canonical Name</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No vocabularies found</p>
                    <p className="text-sm">
                      {searchQuery ? "Try adjusting your search" : "No vocabularies registered yet"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v) => (
                  <TableRow key={v.vocabulary_id} className="hover:bg-muted/50">
                    <TableCell>
                      <span className="font-medium">{v.vocabulary_term}</span>
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-accent">{v.canonical_name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{v.vocabulary_id}</span>
                    </TableCell>
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

export default Vocabularies;
