/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { adapterServiceApi, type AdapterIngestionTask } from "@/api/services/adapter-service";

// Asal-usul isi koleksi adapter ("record ini dari koneksi & layer mana").
// Fakta BE (terverifikasi live): list /data-ingestion/ TIDAK membawa metadata —
// koneksi/layer hanya ada di DETAIL task (metadata.connection_id, metadata.layer_name).
// Jadi: ambil task SUKSES terakhir per domain_code → fetch detailnya → resolve nama
// koneksi lewat /remote-sources/connections/.

export interface CollectionProvenance {
  connectionName: string | null;
  provider: string | null; // type task: ARCGIS/GEOSERVER/GEOJSON/SHAPEFILE
  layerName: string | null;
  when: string | null; // ISO
  createdBy: string | null;
}

const SUCCESS_STATUSES = new Set(["SUCCESS", "SUCCEEDED", "COMPLETED", "DONE", "VALIDATED"]);

const taskTime = (t: AdapterIngestionTask) =>
  new Date(String(t.updated_at ?? t.created_at ?? 0)).getTime() || 0;

export const latestSuccessTaskPerCode = (
  tasks: AdapterIngestionTask[],
): Map<string, AdapterIngestionTask> => {
  const byCode = new Map<string, AdapterIngestionTask>();
  for (const task of tasks) {
    const code = String(task.domain_code ?? "").toUpperCase();
    if (!code || !SUCCESS_STATUSES.has(String(task.status ?? "").toUpperCase())) continue;
    const existing = byCode.get(code);
    if (!existing || taskTime(task) > taskTime(existing)) byCode.set(code, task);
  }
  return byCode;
};

export function useCollectionProvenance(enabled: boolean) {
  const { data: tasks = [] } = useQuery({
    queryKey: ["adapter-provenance", "tasks"],
    queryFn: () => adapterServiceApi.listTasks(),
    enabled,
    staleTime: 30_000,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["adapter-provenance", "connections"],
    queryFn: () => adapterServiceApi.listConnections(),
    enabled,
    staleTime: 60_000,
  });

  const latestByCode = useMemo(() => latestSuccessTaskPerCode(tasks), [tasks]);
  const latestEntries = useMemo(() => Array.from(latestByCode.entries()), [latestByCode]);

  // Detail hanya untuk task sukses terakhir per koleksi (maks 5 fetch) — bukan semua task.
  const detailQueries = useQueries({
    queries: latestEntries.map(([, task]) => ({
      queryKey: ["adapter-provenance", "task-detail", task.id],
      queryFn: () => adapterServiceApi.getTask(task.id),
      enabled,
      staleTime: 60_000,
    })),
  });

  const connectionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const conn of connections) map.set(String(conn.id), conn.name);
    return map;
  }, [connections]);

  const detailSignature = detailQueries.map((q) => `${q.status}:${(q.data as any)?.id ?? ""}`).join("|");
  return useMemo(() => {
    const out = new Map<string, CollectionProvenance>();
    latestEntries.forEach(([code, task], index) => {
      const detail = (detailQueries[index]?.data ?? task) as AdapterIngestionTask;
      const meta = (detail.metadata ?? {}) as Record<string, unknown>;
      const connectionId = String(meta.connection_id ?? "");
      out.set(code, {
        connectionName: connectionId ? connectionNameById.get(connectionId) ?? `koneksi ${connectionId.slice(0, 8)}…` : null,
        provider: typeof detail.type === "string" ? String(detail.type) : null,
        layerName: typeof meta.layer_name === "string" ? String(meta.layer_name) : null,
        when: String(detail.updated_at ?? detail.created_at ?? "") || null,
        createdBy: typeof detail.created_by === "string" ? String(detail.created_by) : null,
      });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestEntries, connectionNameById, detailSignature]);
}

/** Format 1 baris asal-usul: "ArcGIS Public · layer IUPHHKHA · 16 Jul 10:12 · oleh xedafak". */
export const describeProvenance = (p: CollectionProvenance | undefined | null): string | null => {
  if (!p) return null;
  const when = p.when ? p.when.slice(0, 16).replace("T", " ") : "";
  const parts = [
    p.connectionName ?? (p.provider ? `sumber ${p.provider}` : ""),
    p.layerName ? `layer ${p.layerName}` : "",
    when,
    p.createdBy ? `oleh ${p.createdBy}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
};
