import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { complianceChecklistsApi } from "../services/audit-compliance";
import { monitoringApi } from "../services/monitoring";
import { useAllDomains } from "./useDomains";
import { useConnectionPools, useParticipantDomains } from "./useParticipants";
import { useUsers } from "./useUsers";

type ParticipantLite = {
  id: string;
  organization_name?: string;
  contact_person?: {
    email?: string | null;
  } | null;
};

export type ParticipantDeleteDependency = {
  key: "linked_user" | "domain_mapping" | "connection_pool" | "monitoring" | "compliance_checklist";
  label: string;
  count: number;
  confidence: "confirmed" | "possible";
};

const flattenApiError = (error: any) => {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  return error?.message || "Unexpected error";
};

export const formatParticipantDeleteDependencies = (dependencies: ParticipantDeleteDependency[]) =>
  dependencies
    .filter((dependency) => dependency.count > 0)
    .map((dependency) =>
      dependency.confidence === "possible"
        ? `${dependency.label}: ${dependency.count} possible`
        : `${dependency.label}: ${dependency.count}`
    );

export const formatParticipantDeleteConflict = (error: any, dependencies: ParticipantDeleteDependency[]) => {
  const status = error?.response?.status;
  const detail = flattenApiError(error);
  const lines = formatParticipantDeleteDependencies(dependencies);
  const prefix = status ? `HTTP ${status}` : "Delete blocked";
  return lines.length > 0 ? `${prefix}. ${detail}. Dependency detected: ${lines.join(" | ")}` : `${prefix}. ${detail}`;
};

export function useParticipantDeleteGuard(participant?: ParticipantLite | null) {
  const participantId = participant?.id || "";
  const contactEmail = participant?.contact_person?.email?.toLowerCase() || "";

  const { data: usersData, isLoading: loadingUsers } = useUsers({ limit: 200 });
  const { data: mappingsData, isLoading: loadingMappings } = useParticipantDomains(participantId, { limit: 200 });
  const { data: poolsData, isLoading: loadingPools } = useConnectionPools({ limit: 200 });
  const { data: domainsData, isLoading: loadingDomains } = useAllDomains({ limit: 1000 });

  const monitoringQuery = useQuery({
    queryKey: ["participant-delete-guard", "monitorings", participantId, domainsData?.data?.length || 0],
    enabled: !!participantId && !!domainsData?.data,
    queryFn: async () => {
      const uniqueDomainIds = Array.from(new Set((domainsData?.data ?? []).map((domain: any) => domain.id).filter(Boolean)));
      if (uniqueDomainIds.length === 0) return [];

      const results = await Promise.all(
        uniqueDomainIds.map((domainId) =>
          monitoringApi
            .list(domainId, { limit: 100 })
            .then((response) => response.data || [])
            .catch(() => [])
        )
      );

      return results.flat().filter((monitoring: any) => monitoring?.participant_id === participantId);
    },
  });

  const checklistQuery = useQuery({
    queryKey: ["participant-delete-guard", "compliance-checklists", participantId],
    enabled: !!participantId,
    queryFn: async () => {
      const response = await complianceChecklistsApi.list({ limit: 500 });
      return (response.data || []).filter((checklist) => checklist.participant_id === participantId);
    },
  });

  const dependencies = useMemo<ParticipantDeleteDependency[]>(() => {
    const linkedUsers = (usersData?.data ?? []).filter(
      (user: any) => contactEmail && user.email?.toLowerCase() === contactEmail
    );
    const domainMappings = mappingsData?.data ?? [];
    const connectionPools = (poolsData?.data ?? []).filter((pool: any) => pool.participant_id === participantId);
    const monitorings = monitoringQuery.data ?? [];
    const checklists = checklistQuery.data ?? [];

    return [
      {
        key: "linked_user",
        label: "Linked login account",
        count: linkedUsers.length,
        confidence: "possible",
      },
      {
        key: "domain_mapping",
        label: "Domain mapping",
        count: domainMappings.length,
        confidence: "confirmed",
      },
      {
        key: "connection_pool",
        label: "Connection pool",
        count: connectionPools.length,
        confidence: "confirmed",
      },
      {
        key: "monitoring",
        label: "Monitoring config",
        count: monitorings.length,
        confidence: "confirmed",
      },
      {
        key: "compliance_checklist",
        label: "Compliance checklist",
        count: checklists.length,
        confidence: "confirmed",
      },
    ].filter((dependency) => dependency.count > 0);
  }, [
    checklistQuery.data,
    contactEmail,
    mappingsData?.data,
    monitoringQuery.data,
    participantId,
    poolsData?.data,
    usersData?.data,
  ]);

  const isChecking =
    loadingUsers ||
    loadingMappings ||
    loadingPools ||
    loadingDomains ||
    monitoringQuery.isLoading ||
    checklistQuery.isLoading;

  return {
    dependencies,
    dependencyLines: formatParticipantDeleteDependencies(dependencies),
    hasDependencies: dependencies.length > 0,
    isChecking,
  };
}
