import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Download,
  Copy,
  Trash2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAutoMapping } from "@/api/hooks/useAutoMapping";
import type { MappingResultEntry } from "@/api/types/mapping";

/**
 * Confidence display helpers.
 *
 * Spec mengatakan `float` saja — frontend asumsikan range 0.0-1.0 (Q-G).
 * Fungsi normalisasi handle baik 0-1 atau 0-100 untuk forward-compat.
 */
const normalizeConfidence = (value: number): number => {
  if (value > 1) return Math.min(100, value); // already 0-100 (atau lebih)
  return Math.round(value * 100);
};

const confidenceBarColor = (pct: number): string => {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  if (pct >= 40) return "bg-orange-500";
  return "bg-rose-500";
};

const confidenceBgColor = (pct: number): string => {
  if (pct >= 80) return "bg-emerald-50";
  if (pct >= 60) return "bg-amber-50";
  if (pct >= 40) return "bg-orange-50";
  return "bg-rose-50";
};

const Mapping = () => {
  const [sourceText, setSourceText] = useState("");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0); // 0-100
  const [searchQuery, setSearchQuery] = useState("");

  const mutation = useAutoMapping();
  const result = mutation.data;

  // Parse source fields dari textarea (one per line, trim, dedupe)
  const sourceFields = useMemo(() => {
    return Array.from(
      new Set(
        sourceText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
  }, [sourceText]);

  // Filter mapping result by threshold + search
  const filteredMappings = useMemo(() => {
    if (!result?.mappings) return [];
    const q = searchQuery.toLowerCase();
    return result.mappings.filter((m) => {
      const pct = normalizeConfidence(m.confidence);
      const matchesThreshold = pct >= confidenceThreshold;
      const matchesSearch =
        !q ||
        m.source_field?.toLowerCase().includes(q) ||
        m.canonical_field?.toLowerCase().includes(q);
      return matchesThreshold && matchesSearch;
    });
  }, [result, confidenceThreshold, searchQuery]);

  const stats = useMemo(() => {
    if (!result?.mappings) return { total: 0, high: 0, medium: 0, low: 0 };
    const all = result.mappings.map((m) => normalizeConfidence(m.confidence));
    return {
      total: all.length,
      high: all.filter((p) => p >= 80).length,
      medium: all.filter((p) => p >= 60 && p < 80).length,
      low: all.filter((p) => p < 60).length,
    };
  }, [result]);

  const handleAutoMap = async () => {
    if (sourceFields.length === 0) {
      toast.error("Enter at least one source field (one per line)");
      return;
    }
    try {
      await mutation.mutateAsync({ source_fields: sourceFields });
      toast.success(`Mapped ${sourceFields.length} fields`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Auto mapping failed");
    }
  };

  const handleClear = () => {
    setSourceText("");
    setSearchQuery("");
    setConfidenceThreshold(0);
    mutation.reset();
  };

  const handleCopyJson = () => {
    if (!filteredMappings.length) return;
    const json = JSON.stringify({ mappings: filteredMappings }, null, 2);
    navigator.clipboard.writeText(json);
    toast.success("Mapping JSON copied to clipboard");
  };

  const handleDownloadCsv = () => {
    if (!filteredMappings.length) return;
    const headers = ["source_field", "canonical_field", "confidence"];
    const rows = filteredMappings.map((m) =>
      [m.source_field, m.canonical_field, normalizeConfidence(m.confidence).toString()]
        .map((val) => `"${val.replace(/"/g, '""')}"`)
        .join(","),
    );
    const content = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapping_results_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredMappings.length} mappings as CSV`);
  };

  const renderMappingRow = (m: MappingResultEntry) => {
    const pct = normalizeConfidence(m.confidence);
    return (
      <TableRow key={`${m.source_field}-${m.canonical_field}`} className="hover:bg-muted/50">
        <TableCell>
          <span className="font-medium">{m.source_field}</span>
        </TableCell>
        <TableCell>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </TableCell>
        <TableCell>
          <span className="font-mono text-sm text-accent">{m.canonical_field}</span>
        </TableCell>
        <TableCell className="w-64">
          <div className="flex items-center gap-3">
            <div className={cn("flex-1 h-2 rounded-full overflow-hidden", confidenceBgColor(pct))}>
              <div
                className={cn("h-full transition-all", confidenceBarColor(pct))}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-mono font-semibold w-10 text-right">{pct}%</span>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="min-h-screen">
      <Header title="Auto Mapping" subtitle="Map source fields to canonical schema with AI confidence" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h3 className="font-semibold">Source Fields</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter source field names — one per line. The system will suggest
                canonical mappings with confidence scores.
              </p>
              <div className="space-y-2">
                <Label htmlFor="source-fields">Fields ({sourceFields.length})</Label>
                <Textarea
                  id="source-fields"
                  placeholder={`well_name\nproduction_volume\nspud_date\n...`}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAutoMap}
                  className="flex-1 bg-accent hover:bg-accent/90"
                  disabled={mutation.isPending || sourceFields.length === 0}
                >
                  {mutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Auto Map
                </Button>
                <Button variant="outline" onClick={handleClear} disabled={mutation.isPending}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Confidence threshold filter */}
            {result?.mappings && result.mappings.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-3">
                <Label>Confidence threshold: {confidenceThreshold}%</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <p className="text-xs text-muted-foreground">
                  Hide mappings below this confidence level.
                </p>
              </div>
            )}
          </div>

          {/* Result panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stats */}
            {result?.mappings && (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="bg-card rounded-xl border border-emerald-200 p-4">
                  <p className="text-xs text-emerald-700">High (≥80%)</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.high}</p>
                </div>
                <div className="bg-card rounded-xl border border-amber-200 p-4">
                  <p className="text-xs text-amber-700">Medium (60-79%)</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.medium}</p>
                </div>
                <div className="bg-card rounded-xl border border-rose-200 p-4">
                  <p className="text-xs text-rose-700">Low (&lt;60%)</p>
                  <p className="text-2xl font-bold text-rose-700">{stats.low}</p>
                </div>
              </div>
            )}

            {/* Result toolbar */}
            {result?.mappings && result.mappings.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <Input
                  placeholder="Filter mappings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sm:max-w-xs"
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyJson}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy JSON
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </div>
            )}

            {/* Result table or empty / error state */}
            <div className="bg-card rounded-xl border border-border overflow-hidden min-h-[200px]">
              {mutation.isError ? (
                <div className="text-center py-12 text-destructive">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                  <p className="font-medium">Failed to map fields</p>
                  <p className="text-sm text-muted-foreground">
                    {(mutation.error as any)?.response?.data?.detail || (mutation.error as any)?.message}
                  </p>
                </div>
              ) : !result ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No mapping yet</p>
                  <p className="text-sm">
                    Enter source fields on the left, then click <Badge variant="outline">Auto Map</Badge>
                  </p>
                </div>
              ) : filteredMappings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium">No matches</p>
                  <p className="text-sm">
                    Try lowering the confidence threshold or clearing the search.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Source Field</TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Canonical Field</TableHead>
                      <TableHead className="w-64">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{filteredMappings.map(renderMappingRow)}</TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mapping;
