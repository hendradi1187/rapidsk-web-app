import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Pager ringkas: Prev / nomor (windowed) / Next + ringkasan rentang. */
export function Pager({
  page,
  total,
  pageSize,
  onPage,
  pageSizeOptions = [12, 24, 50, 100],
  onPageSize,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  pageSizeOptions?: number[];
  onPageSize?: (size: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  // window nomor halaman di sekitar current
  const win = 1;
  const nums: number[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || (p >= page - win && p <= page + win)) nums.push(p);
  }
  const withGaps: (number | "...")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) withGaps.push("...");
    withGaps.push(n);
    prev = n;
  }

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap pt-3">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {from}–{to} dari {total}
        </p>
        {onPageSize ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Limit</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}/hal
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {withGaps.map((n, i) =>
          n === "..." ? (
            <span key={`g${i}`} className="px-1 text-muted-foreground text-xs">…</span>
          ) : (
            <Button
              key={n}
              variant={n === page ? "default" : "outline"}
              size="icon"
              className={`h-8 w-8 text-xs ${n === page ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}`}
              onClick={() => onPage(n)}
            >
              {n}
            </Button>
          ),
        )}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
