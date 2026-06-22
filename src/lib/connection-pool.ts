import type { ConnectionPoolItem } from "@/api/types/governance";

export interface ResolvedPoolMeta {
  endpoint: string | null;
  wellKnownJwtUrl: string | null;
}

/** Normalize metadata — prefers B1 fields, falls back to legacy url_* fields. */
export function resolvePoolMeta(pool: ConnectionPoolItem): ResolvedPoolMeta {
  const m = pool.metadata ?? {};
  return {
    endpoint: m.endpoint ?? m.url_provider ?? m.url_consumer ?? null,
    wellKnownJwtUrl: m.well_known_jwt_url ?? null,
  };
}

/**
 * A pool is "ready" for B1 transfer when both endpoint and well_known_jwt_url
 * are resolvable from its metadata.
 */
export function isPoolReady(pool: ConnectionPoolItem | undefined | null): boolean {
  if (!pool) return false;
  const { endpoint, wellKnownJwtUrl } = resolvePoolMeta(pool);
  return !!endpoint && !!wellKnownJwtUrl;
}

/** Find the best PROVIDER pool for a given participant. */
export function findParticipantPool(
  pools: ConnectionPoolItem[],
  participantId: string | null | undefined,
): ConnectionPoolItem | undefined {
  if (!participantId) return undefined;
  // Prefer PROVIDER type, fallback to any pool for this participant
  return (
    pools.find((p) => p.participant_id === participantId && p.type === "PROVIDER") ??
    pools.find((p) => p.participant_id === participantId)
  );
}
