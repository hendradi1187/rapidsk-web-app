import { DOMAINS } from "@/lib/fulfillment";

/** Filter chip per Cluster Domain (Semua + 5 domain migas) dengan hitungan. */
export function DomainClusterTabs({
  value,
  onChange,
  counts,
}: {
  value: string; // "all" | domain key
  onChange: (v: string) => void;
  counts: Record<string, number>; // key domain -> jumlah; "all" total
}) {
  const items = [{ key: "all", label: "Semua", sub: "" }, ...DOMAINS.map((d) => ({ key: d.key, label: d.label, sub: d.sub }))];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = value === it.key;
        const n = counts[it.key] ?? 0;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
              active
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card text-foreground/80 border-border hover:bg-muted"
            }`}
            title={it.sub}
          >
            <span className="font-medium">{it.label}</span>
            <span
              className={`text-xs px-1.5 rounded-full ${
                active ? "bg-white/25" : "bg-muted text-muted-foreground"
              }`}
            >
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
}
