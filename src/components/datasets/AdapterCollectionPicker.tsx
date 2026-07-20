/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Layers3, Loader2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { adapterServiceApi, type AdapterDomainCode } from "@/api/services/adapter-service";
import { FIELD_LABELS, labelOf, summarizeValue, previewKeysFromFeatures } from "@/lib/feature-labels";
import { useCollectionProvenance, describeProvenance } from "@/api/hooks/useCollectionProvenance";

export interface AdapterCollectionOption {
  id: string;
  domain_code: string;
  title: string;
}

// Param limit adapter: minimum 5 (openapi FASE 0). listItems response punya `total`
// (jumlah item pasti) + `features`. Kita pakai limit kecil-sah untuk hitung & contoh data.
const SAFE_LIMIT = 5;
const SAMPLE_SHOWN = 3;

const collectionTotal = async (code: string): Promise<number | null> => {
  const res = (await adapterServiceApi.listItems(code as AdapterDomainCode, { limit: SAFE_LIMIT })) as any;
  const total = res?.total;
  if (typeof total === "number") return total;
  return Array.isArray(res?.features) ? res.features.length : null;
};

function SamplePeek({ code }: { code: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adapter-collection-sample", code],
    queryFn: async () => {
      const res = (await adapterServiceApi.listItems(code as AdapterDomainCode, { limit: SAFE_LIMIT })) as any;
      return Array.isArray(res?.features) ? res.features : [];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" /> Memuat contoh data...
      </div>
    );
  }
  if (isError) {
    return (
      <p className="mt-2 text-[11px] text-rose-600">
        Gagal memuat contoh data: {(error as Error)?.message || "coba lagi"}
      </p>
    );
  }
  const features: any[] = data ?? [];
  if (features.length === 0) {
    return <p className="mt-2 text-[11px] text-muted-foreground">Koleksi ini belum berisi item.</p>;
  }
  const keys = previewKeysFromFeatures(features, 4);
  return (
    <div className="mt-2 space-y-1.5">
      {features.slice(0, SAMPLE_SHOWN).map((feature, index) => (
        <div key={index} className="rounded-md border border-border bg-background/60 px-2.5 py-1.5">
          <p className="text-[11px] font-semibold truncate">{labelOf(feature?.properties)}</p>
          <div className="mt-1 grid gap-0.5">
            {keys.map((key) => (
              <div key={key} className="flex items-start justify-between gap-3 text-[10px]">
                <span className="text-muted-foreground">{FIELD_LABELS[key] || key}</span>
                <span className="max-w-[160px] truncate text-right">{summarizeValue(feature?.properties?.[key])}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">Menampilkan {Math.min(SAMPLE_SHOWN, features.length)} contoh pertama.</p>
    </div>
  );
}

// Picker koleksi adapter dengan jumlah item + tombol "Contoh data". Dipakai di dialog
// create maupun edit dataset supaya perilakunya sama.
export function AdapterCollectionPicker({
  collections,
  onPick,
  onClose,
}: {
  collections: AdapterCollectionOption[];
  onPick: (col: AdapterCollectionOption) => void;
  onClose: () => void;
}) {
  const [sampleCode, setSampleCode] = useState<string | null>(null);

  const countQueries = useQueries({
    queries: collections.map((col) => ({
      queryKey: ["adapter-collection-total", col.domain_code],
      queryFn: () => collectionTotal(col.domain_code),
      staleTime: 60_000,
    })),
  });

  // "Data ini dari koneksi mana?" — asal isi koleksi (koneksi + layer + waktu) dari
  // detail task ingest sukses terakhir. Dataset menunjuk KOLEKSI (gudang), bukan koneksi;
  // baris ini menunjukkan siapa yang terakhir mengisi gudang itu.
  const provenanceByCode = useCollectionProvenance(true);

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-accent flex items-center gap-1.5">
          <Layers3 className="w-3.5 h-3.5" /> Koleksi tersedia di adapter
        </p>
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={onClose}>
          x
        </button>
      </div>
      <div className="space-y-1.5">
        {collections.map((col, i) => {
          const q = countQueries[i];
          const total = q?.data;
          const showSample = sampleCode === col.domain_code;
          return (
            <div key={col.id} className="rounded-lg border border-transparent bg-background/40 hover:border-accent/20 transition-colors">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <button type="button" onClick={() => onPick(col)} className="flex-1 text-left text-sm">
                  <span className="font-medium">{col.title || col.domain_code}</span>
                  <span className="ml-2 text-xs text-muted-foreground font-mono">{col.domain_code}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {(() => {
                      const src = describeProvenance(provenanceByCode.get(col.domain_code.toUpperCase()));
                      return src
                        ? <>Isi dari: {src}</>
                        : "Asal isi belum tercatat (belum ada ingest sukses lewat wizard).";
                    })()}
                  </span>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[10px] border-accent/40 text-accent">
                    {q?.isLoading ? "…" : typeof total === "number" ? `${total} item` : "OGC"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setSampleCode(showSample ? null : col.domain_code)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {showSample ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    Contoh data
                  </button>
                </div>
              </div>
              {showSample && (
                <div className="px-3 pb-2">
                  <SamplePeek code={col.domain_code} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Endpoint disimpan sebagai base adapter URL; runtime context menyimpan collection path per koleksi.
      </p>
    </div>
  );
}
