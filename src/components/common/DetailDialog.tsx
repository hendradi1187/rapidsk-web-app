import { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DetailField {
  label: string;
  value: ReactNode;
  span?: 1 | 2;
  mono?: boolean;
}

interface DetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  status?: string;
  statusColor?: string;
  fields: DetailField[];
  raw?: unknown;
  footer?: ReactNode;
}

const isEmpty = (v: unknown) => v === null || v === undefined || v === "";

export const renderValue = (v: unknown): ReactNode => {
  if (isEmpty(v)) return <span className="text-muted-foreground italic">—</span>;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-muted-foreground italic">empty</span>;
    if (typeof v[0] === "string") return <div className="flex flex-wrap gap-1">{v.map((s, i) => <Badge key={i} variant="outline" className="text-[10px]">{String(s)}</Badge>)}</div>;
    return <pre className="rounded bg-muted/40 p-2 text-[11px] overflow-auto max-h-40">{JSON.stringify(v, null, 2)}</pre>;
  }
  if (typeof v === "object") return <pre className="rounded bg-muted/40 p-2 text-[11px] overflow-auto max-h-40">{JSON.stringify(v, null, 2)}</pre>;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString();
  return String(v);
};

export const DetailDialog = ({ open, onOpenChange, title, subtitle, status, statusColor, fields, raw, footer }: DetailDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle>{title}</DialogTitle>
            {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
          </div>
          {status && <Badge variant="outline" className={`text-xs ${statusColor || ""}`}>{status}</Badge>}
        </div>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2 py-2">
        {fields.map((f, i) => (
          <div key={i} className={`grid gap-1 ${f.span === 2 ? "sm:col-span-2" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</p>
            <div className={`text-sm ${f.mono ? "font-mono text-xs break-all" : ""}`}>{f.value}</div>
          </div>
        ))}
      </div>
      {raw !== undefined && (
        <details className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
          <summary className="cursor-pointer font-medium">Raw JSON (backend response)</summary>
          <pre className="mt-2 overflow-auto max-h-80 text-[11px]">{JSON.stringify(raw, null, 2)}</pre>
        </details>
      )}
      <DialogFooter>
        {footer}
        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
