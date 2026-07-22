/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  Layers3,
  Loader2,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adapterServiceApi, type AdapterDomainCode } from "@/api/services/adapter-service";
import { useCollectionProvenance, describeProvenance } from "@/api/hooks/useCollectionProvenance";
import { datasetsApi } from "@/api/services/data-catalog";
import type { Dataset } from "@/api/types/data-catalog";
import { groupDatasetsByCollection } from "@/lib/adapter-dataset-link";
import type { AdapterWizardDomainOption } from "@/components/settings/AdapterFlowWizard";

interface AdapterCollection {
  id: string;
  domain_code: string;
  title: string;
}

const SAFE_LIMIT = 5; // limit minimum sah adapter (FASE 0)

const collectionTotal = async (code: string): Promise<number | null> => {
  const res = (await adapterServiceApi.listItems(code as AdapterDomainCode, { limit: SAFE_LIMIT })) as any;
  if (typeof res?.total === "number") return res.total;
  return Array.isArray(res?.features) ? res.features.length : null;
};

// Nama domain bisa berupa UUID (domain tanpa nama) — potong biar tidak makan tempat.
const shortDomainLabel = (label: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(label)
    ? `domain ${label.slice(0, 8)}…`
    : label;

const statusBadgeClass = (status: string) => {
  const s = status.toUpperCase();
  if (s === "PUBLISHED" || s === "ACTIVE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "DRAFT") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

export function AdapterCollectionsUsage({
  adapterEndpoint,
  domainOptions,
}: {
  adapterEndpoint?: string;
  domainOptions: AdapterWizardDomainOption[];
}) {
  const navigate = useNavigate();
  const [showFlow, setShowFlow] = useState(false);
  const adapterReady = Boolean(adapterEndpoint?.trim());

  const {
    data: collections = [],
    isLoading: loadingCollections,
    isError: collectionsError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adapter-collections-usage", adapterEndpoint],
    queryFn: async () => {
      const res = (await adapterServiceApi.listCollections()) as { collections?: AdapterCollection[] };
      return res?.collections ?? [];
    },
    enabled: adapterReady,
  });

  // Kumpulkan dataset dari semua domain yang tersedia di wizard, lalu kelompokkan
  // per domain_code koleksi (pakai lib traceability murni F1).
  const domainIds = useMemo(
    () => Array.from(new Set(domainOptions.map((d) => d.value).filter(Boolean))),
    [domainOptions],
  );
  const datasetQueries = useQueries({
    queries: domainIds.map((domainId) => ({
      queryKey: ["datasets", "list", domainId],
      queryFn: () => datasetsApi.list(domainId),
      enabled: adapterReady,
      staleTime: 30_000,
    })),
  });
  const datasetsLoading = datasetQueries.some((q) => q.isLoading);
  // Signature stabil dari status+jumlah tiap query supaya memo tidak mengira berubah tiap render.
  const datasetsSignature = datasetQueries
    .map((q) => `${q.status}:${(q.data as unknown[] | undefined)?.length ?? 0}`)
    .join("|");
  // Nama dataset bisa identik lintas domain (mis. "Wilayah Kerja (PSC Area)" ada di 5
  // domain berbeda) — tanpa label domain, daftar perujuk terbaca seperti duplikat.
  const domainLabelById = useMemo(() => {
    const map = new globalThis.Map<string, string>();
    for (const opt of domainOptions) {
      if (opt.value) map.set(opt.value, opt.domainName || opt.label);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainOptions.map((d) => `${d.value}:${d.domainName}`).join("|")]);
  const { byCollection, datasetDomainLabel } = useMemo(() => {
    const out: Dataset[] = [];
    const seen = new Set<string>();
    const dsDomain = new globalThis.Map<string, string>();
    datasetQueries.forEach((q, idx) => {
      if (!Array.isArray(q.data)) return;
      for (const d of q.data as Dataset[]) {
        if (d.dataset_id && seen.has(d.dataset_id)) continue;
        if (d.dataset_id) {
          seen.add(d.dataset_id);
          const label = domainLabelById.get(domainIds[idx] ?? "");
          if (label) dsDomain.set(d.dataset_id, label);
        }
        out.push(d);
      }
    });
    return { byCollection: groupDatasetsByCollection(out), datasetDomainLabel: dsDomain };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetsSignature, domainLabelById]);

  const counts = useQueries({
    queries: collections.map((col) => ({
      queryKey: ["adapter-collection-total", col.domain_code],
      queryFn: () => collectionTotal(col.domain_code),
      enabled: adapterReady,
      staleTime: 60_000,
    })),
  });

  // Asal isi tiap koleksi (koneksi + layer + waktu) — dari detail task sukses terakhir.
  const provenanceByCode = useCollectionProvenance(adapterReady);

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-sky-700" /> Koleksi Hasil Ingest
            </CardTitle>
            <CardDescription>
              Dua angka di tiap kartu artinya beda: <strong>"N record di adapter"</strong> = isi data hasil ingest yang tersimpan di koleksi;
              <strong> "Dirujuk oleh dataset (N)"</strong> = dataset katalog yang endpoint-nya menunjuk koleksi itu. Koleksi kosong yang masih dirujuk akan ditandai kuning.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={!adapterReady || loadingCollections}>
            {loadingCollections ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Muat ulang
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Panel penjelasan alur (sekali baca) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80">
          <button
            type="button"
            onClick={() => setShowFlow((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-slate-900">Bagaimana alurnya?</span>
            {showFlow ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
          </button>
          {showFlow && (
            <div className="px-4 pb-4 text-sm leading-6 text-slate-600">
              Koneksi sumber (GeoServer/ArcGIS) → pilih layer → beri tag kategori (WK/FLD/SEI/WLL/FP) + klasifikasi → jalankan ingest.
              Hasil ingest yang lolos menjadi <strong>koleksi OGC</strong> di sini. Koleksi itulah yang dipakai modul <strong>Dataset</strong>
              (lewat tombol "Dari Adapter") sebagai sumber metadata & transfer. Kategori tidak dideteksi otomatis — berasal dari tag yang Anda pilih saat ingest.
            </div>
          )}
        </div>

        {!adapterReady ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Adapter endpoint belum diisi di deployment config, jadi koleksi hasil ingest belum bisa dibaca.
          </div>
        ) : collectionsError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Gagal memuat koleksi adapter: {(error as Error)?.message || "coba muat ulang"}.
          </div>
        ) : loadingCollections ? (
          <div className="flex items-center gap-2 px-1 py-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat koleksi...
          </div>
        ) : collections.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            Belum ada koleksi hasil ingest. Jalankan ingest lewat wizard di atas dulu.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {collections.map((col, i) => {
              const total = counts[i]?.data;
              const users = byCollection.get(col.domain_code.toUpperCase()) ?? [];
              const emptyButReferenced = typeof total === "number" && total === 0 && users.length > 0;
              const provenance = describeProvenance(provenanceByCode.get(col.domain_code.toUpperCase()));
              return (
                <div key={col.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{col.title || col.domain_code}</p>
                      <p className="mt-0.5 text-xs font-mono text-slate-500">{col.domain_code}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[10px]"
                      title="Jumlah record data hasil ingest yang tersimpan di koleksi adapter ini"
                    >
                      {counts[i]?.isLoading ? "…" : typeof total === "number" ? `${total} record di adapter` : "OGC"}
                    </Badge>
                  </div>

                  {/* Asal isi koleksi — koneksi + layer + waktu dari DETAIL task sukses terakhir. */}
                  <p className="mt-1.5 text-[11.5px] text-slate-500">
                    {provenance
                      ? <>Diisi terakhir dari: <b className="text-slate-700">{provenance}</b></>
                      : typeof total === "number" && total > 0
                        ? "Asal isi tidak tercatat di riwayat task (ingest lama / dari luar wizard)."
                        : "Belum pernah ada ingest sukses untuk kategori ini."}
                  </p>

                  {emptyButReferenced && (
                    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
                      Koleksi ini <strong>kosong (0 record)</strong> tapi masih dirujuk {users.length} dataset di bawah.
                      Transfer dari dataset itu akan berisi kosong sampai kategori {col.domain_code} di-ingest ulang lewat wizard di atas.
                    </div>
                  )}

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                      title="Dataset di katalog yang endpoint-nya menunjuk ke koleksi ini. Nama bisa sama karena dataset dibuat per consent — lihat label domain di tiap baris."
                    >
                      Dirujuk oleh dataset {datasetsLoading ? "" : `(${users.length})`}
                    </p>
                    {datasetsLoading ? (
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-3 w-3 animate-spin" /> Memeriksa...
                      </div>
                    ) : users.length === 0 ? (
                      <p className="mt-1.5 text-xs text-slate-500">Belum dirujuk dataset mana pun.</p>
                    ) : (
                      <ul className="mt-1.5 space-y-1">
                        {users.map((ds) => (
                          <li key={ds.dataset_id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <Database className="h-3 w-3 shrink-0 text-accent" />
                              <span className="truncate text-slate-800">{ds.dataset_name}</span>
                              {datasetDomainLabel.get(ds.dataset_id ?? "") && (
                                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
                                  {shortDomainLabel(datasetDomainLabel.get(ds.dataset_id ?? "") ?? "")}
                                </span>
                              )}
                            </span>
                            {ds.status && (
                              <Badge variant="outline" className={`shrink-0 text-[9px] ${statusBadgeClass(ds.status)}`}>
                                {ds.status.toUpperCase()}
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full text-xs"
                    onClick={() => navigate(`/datasets?create=1&adapterCollection=${encodeURIComponent(col.domain_code)}`)}
                  >
                    <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                    Buat dataset dari koleksi ini
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <ExternalLink className="h-3 w-3" />
          Tombol "Buat dataset" membuka form Tambah Dataset dengan koleksi ini sudah terpilih.
        </p>
      </CardContent>
    </Card>
  );
}
