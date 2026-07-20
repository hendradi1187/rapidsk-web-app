import * as React from "react";

import { cn } from "@/lib/utils";

// Table dengan scrollbar horizontal KEMBAR di atas: operator bisa geser kiri-kanan
// tanpa harus scroll ke dasar tabel dulu. Bar atas hanya muncul saat konten benar-benar
// melebar (overflow), tingginya menyamai tebal scrollbar asli, dan tersinkron dua arah
// dengan area scroll tabel. Karena dipasang di komponen dasar, SEMUA tabel dapat ini.
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const topRef = React.useRef<HTMLDivElement>(null);
    const spacerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const scroller = scrollRef.current;
      const top = topRef.current;
      const spacer = spacerRef.current;
      if (!scroller || !top || !spacer) return;

      // Samakan lebar spacer bar-atas dengan lebar konten tabel, lalu tampilkan/sembunyikan
      // bar-atas menurut ada-tidaknya overflow. Tinggi bar = tebal scrollbar asli (offset -
      // client height); kalau 0 (scrollbar overlay), pakai 12px supaya tetap bisa di-drag.
      const sync = () => {
        const scrollWidth = scroller.scrollWidth;
        const clientWidth = scroller.clientWidth;
        const overflowing = scrollWidth > clientWidth + 1;
        spacer.style.width = `${scrollWidth}px`;
        const barThickness = scroller.offsetHeight - scroller.clientHeight;
        top.style.height = overflowing ? `${barThickness > 0 ? barThickness : 12}px` : "0px";
        top.style.marginBottom = overflowing ? "2px" : "0px";
      };
      sync();

      // Sinkron dua arah dengan kunci sederhana supaya tidak saling memantul.
      let syncing = false;
      const onTop = () => {
        if (syncing) return;
        syncing = true;
        scroller.scrollLeft = top.scrollLeft;
        syncing = false;
      };
      const onScroller = () => {
        if (syncing) return;
        syncing = true;
        top.scrollLeft = scroller.scrollLeft;
        syncing = false;
      };
      top.addEventListener("scroll", onTop);
      scroller.addEventListener("scroll", onScroller);

      let observer: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(sync);
        observer.observe(scroller);
        const tableEl = scroller.querySelector("table");
        if (tableEl) observer.observe(tableEl);
      }
      window.addEventListener("resize", sync);

      return () => {
        top.removeEventListener("scroll", onTop);
        scroller.removeEventListener("scroll", onScroller);
        window.removeEventListener("resize", sync);
        observer?.disconnect();
      };
    }, []);

    return (
      <div className="relative w-full">
        <div
          ref={topRef}
          aria-hidden
          className="overflow-x-auto overflow-y-hidden"
          style={{ height: 0 }}
        >
          <div ref={spacerRef} style={{ height: 1 }} />
        </div>
        <div ref={scrollRef} className="relative w-full overflow-auto">
          <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
        </div>
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
