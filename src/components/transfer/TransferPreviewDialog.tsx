// src/components/transfer/TransferPreviewDialog.tsx
// Reusable dialog to display transfer trigger response data in a structured way.

import { useState } from "react";
import { Copy, Check, Code2, Table2, X, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TransferPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data: unknown;
  endpoint?: string;
  duration?: number; // ms
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function countKeys(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (isRecord(v)) return Object.keys(v).length;
  return 0;
}

/* Pretty-print a single value as inline JSX */
function InlineValue({ value }: { value: unknown }) {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground italic">null</span>;
  if (typeof value === "boolean")
    return (
      <Badge variant="outline" className={`text-[10px] ${value ? "text-emerald-600 border-emerald-500/40" : "text-red-500 border-red-500/40"}`}>
        {String(value)}
      </Badge>
    );
  if (typeof value === "number")
    return <span className="font-mono text-blue-600">{value}</span>;
  if (typeof value === "string") {
    // ISO date?
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return <span className="text-amber-600">{new Date(value).toLocaleString()}</span>;
      } catch { /* fall through */ }
    }
    // UUID?
    if (/^[0-9a-f]{8}-/.test(value))
      return <span className="font-mono text-xs text-muted-foreground">{value}</span>;
    // URL?
    if (/^https?:\/\//.test(value))
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 break-all">{value}</a>;
    return <span className="break-all">{value}</span>;
  }
  return <span className="text-muted-foreground">{JSON.stringify(value)}</span>;
}

/* Render a key-value table for a flat-ish object */
function KVTable({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {Object.entries(data).map(([key, value]) => (
            <tr key={key} className="border-b border-border/30 last:border-0">
              <td className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/20 w-[180px] align-top whitespace-nowrap">{key}</td>
              <td className="px-3 py-2 text-sm">
                {Array.isArray(value) ? (
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-[10px]">{value.length} items</Badge>
                    {value.length > 0 && value.length <= 20 && (
                      <div className="mt-1 space-y-1">
                        {value.map((item, idx) =>
                          isRecord(item) ? (
                            <details key={idx} className="rounded border border-border/30 bg-muted/10">
                              <summary className="cursor-pointer px-2 py-1 text-xs text-muted-foreground hover:bg-muted/20">
                                [{idx}] {countKeys(item)} fields
                              </summary>
                              <div className="px-2 py-1">
                                <KVTable data={item as Record<string, unknown>} />
                              </div>
                            </details>
                          ) : (
                            <div key={idx} className="text-xs"><InlineValue value={item} /></div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ) : isRecord(value) ? (
                  <details className="rounded border border-border/30 bg-muted/10">
                    <summary className="cursor-pointer px-2 py-1 text-xs text-muted-foreground hover:bg-muted/20">
                      {countKeys(value)} fields
                    </summary>
                    <div className="px-2 py-1">
                      <KVTable data={value as Record<string, unknown>} />
                    </div>
                  </details>
                ) : (
                  <InlineValue value={value} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────── */

export const TransferPreviewDialog = ({
  open,
  onOpenChange,
  title,
  description,
  data,
  endpoint,
  duration,
}: TransferPreviewDialogProps) => {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consume_data_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isEmpty = data === null || data === undefined || (typeof data === "object" && Object.keys(data as object).length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {title}
            {duration !== undefined && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {duration}ms
              </Badge>
            )}
          </DialogTitle>
          {(description || endpoint) && (
            <DialogDescription>
              {description}
              {endpoint && (
                <code className="mt-1 block rounded bg-muted px-2 py-1 text-[11px] font-mono break-all">
                  {endpoint}
                </code>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center py-12 text-sm text-muted-foreground">
            Response kosong — backend tidak mengembalikan data.
          </div>
        ) : (
          <Tabs defaultValue="structured" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between flex-shrink-0">
              <TabsList>
                <TabsTrigger value="structured" className="gap-1.5">
                  <Table2 className="h-3.5 w-3.5" />
                  Structured
                </TabsTrigger>
                <TabsTrigger value="raw" className="gap-1.5">
                  <Code2 className="h-3.5 w-3.5" />
                  Raw JSON
                </TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy JSON"}
                </Button>
              </div>
            </div>

            <TabsContent value="structured" className="flex-1 overflow-auto mt-3">
              {Array.isArray(data) ? (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-xs">{data.length} records</Badge>
                  {data.map((item, idx) =>
                    isRecord(item) ? (
                      <details key={idx} open={idx === 0} className="rounded-lg border border-border/50">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-medium hover:bg-muted/20">
                          Record [{idx}] — {countKeys(item)} fields
                        </summary>
                        <div className="px-3 pb-3">
                          <KVTable data={item as Record<string, unknown>} />
                        </div>
                      </details>
                    ) : (
                      <div key={idx} className="text-sm"><InlineValue value={item} /></div>
                    )
                  )}
                </div>
              ) : isRecord(data) ? (
                <KVTable data={data as Record<string, unknown>} />
              ) : (
                <div className="text-sm"><InlineValue value={data} /></div>
              )}
            </TabsContent>

            <TabsContent value="raw" className="flex-1 overflow-auto mt-3">
              <pre className="rounded-lg border border-border/50 bg-muted/30 p-4 text-xs font-mono leading-relaxed overflow-auto max-h-[60vh] whitespace-pre-wrap break-all">
                {jsonString}
              </pre>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
