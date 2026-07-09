import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { organizationsApi } from "@/api/services/governance";
import { providersApi } from "@/api/services/providers";
import { getActiveDomainId, setActiveDomainId } from "@/lib/domain";
import {
  getPreferredOrganizationId,
  getPreferredOrganizationName,
  setPreferredOrganization,
} from "@/lib/session-binding";
import { getStoredParticipantOrganizationId } from "@/lib/participant-org-binding";
import { resolveGovernanceOrganizationBinding } from "@/lib/governance-binding";

export interface AvailableDomain {
  domain_id: string;
  domain_name: string;
  code?: string;
}

export type DomainSource =
  | "participant_binding"   // user punya participant, domain diambil dari participant
  | "governance_fallback"   // SUPER_ADMIN / ADMIN tanpa participant — diizinkan fallback
  | "none";                 // domain tidak bisa ditentukan

interface DomainContextValue {
  domainId: string | null;
  domainName: string | null;
  ready: boolean;
  availableDomains: AvailableDomain[];
  domainSource: DomainSource;
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  participantDomainCount: number;
  switchDomain: (domain: AvailableDomain) => void;
}

const DomainContext = createContext<DomainContextValue>({
  domainId: null,
  domainName: null,
  ready: false,
  availableDomains: [],
  domainSource: "none",
  activeOrganizationId: null,
  activeOrganizationName: null,
  participantDomainCount: 0,
  switchDomain: () => {},
});

/**
 * Aturan governance_fallback:
 *   - HANYA diizinkan untuk SUPER_ADMIN dan ADMIN (role tanpa participant).
 *   - Regular participant yang tidak punya domain binding aktif → source = "none",
 *     domain tidak diset secara otomatis. UI harus tampil empty-state bukan
 *     auto-assign domain acak dari governance list.
 *
 * Ini mencegah data cross-participant yang tidak sengaja ketika participant
 * baru belum selesai onboarding domain-nya.
 */
const GOVERNANCE_FALLBACK_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

export const DomainProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, role, participantId } = useAuth();
  const [domainId, setDomainId] = useState<string | null>(getActiveDomainId());
  const [domainName, setDomainName] = useState<string | null>(null);
  const [availableDomains, setAvailableDomains] = useState<AvailableDomain[]>([]);
  const [domainSource, setDomainSource] = useState<DomainSource>("none");
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [activeOrganizationName, setActiveOrganizationName] = useState<string | null>(null);
  const [participantDomainCount, setParticipantDomainCount] = useState(0);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      setReady(false);
      return;
    }

    (async () => {
      try {
        const orgs = await organizationsApi.list();
        const items = orgs as Array<{
          organization_id: string;
          organization_name: string;
        }>;

        if (items.length === 0) {
          if (!cancelled) {
            setAvailableDomains([]);
            setDomainSource("none");
            setActiveOrganizationId(null);
            setActiveOrganizationName(null);
            setParticipantDomainCount(0);
            setReady(true);
          }
          return;
        }

        const preferredOrgId = getPreferredOrganizationId();
        const preferredOrgName = getPreferredOrganizationName();
        const storedParticipantOrganizationId = participantId
          ? getStoredParticipantOrganizationId(participantId)
          : null;

        // ── Step 1: Resolve participant domains (binding resmi dari BE) ──────
        let participantDomainIds: string[] = [];
        const participantDetail = participantId
          ? await providersApi.getById(participantId).catch(() => null)
          : null;
        if (participantId) {
          try {
            const pDomains = await providersApi.listDomains(participantId);
            participantDomainIds = (
              pDomains as Array<{ domain_id: string; status?: string }>
            )
              .filter(
                (d) =>
                  !d.status || String(d.status).toUpperCase() === "ACTIVE"
              )
              .map((d) => d.domain_id);
          } catch {
            /* biarkan kosong — ditangani di bawah */
          }
        }

        // ── Step 2: Guard — participant tanpa domain binding = none ──────────
        // Regular participant (bukan admin) harus punya domain binding eksplisit.
        // Jangan auto-fallback ke governance list — itu bisa expose data silang.
        const roleAllowsFallback = GOVERNANCE_FALLBACK_ROLES.has(role ?? "");
        const hasParticipantBinding = participantDomainIds.length > 0;

        if (participantId && !hasParticipantBinding && !roleAllowsFallback) {
          // Participant terdaftar tapi belum ada domain aktif → source = none.
          // UI wajib tampilkan empty-state / pending-onboarding notice.
          if (!cancelled) {
            setAvailableDomains([]);
            setDomainId(null);
            setDomainName(null);
            setDomainSource("none");
            setActiveOrganizationId(null);
            setActiveOrganizationName(null);
            setParticipantDomainCount(0);
            setActiveDomainId(null);
            setReady(true);
          }
          return;
        }

        // ── Step 3: Resolve organization binding ─────────────────────────────
        const organizationDomainsById =
          hasParticipantBinding
            ? await organizationsApi.listDomainsMap(
                items.map((org) => org.organization_id)
              )
            : {};

        const binding = resolveGovernanceOrganizationBinding({
          organizations: items,
          domainsByOrganizationId: organizationDomainsById,
          participantDomainIds,
          participantName: String(
            participantDetail?.organization_name ??
              participantDetail?.provider_name ??
              "",
          ).trim(),
          preferredOrganizationId: storedParticipantOrganizationId ?? preferredOrgId,
          preferredOrganizationName: preferredOrgName,
        });

        const chosenOrg =
          binding.organization ??
          items.find((org) => org.organization_id === preferredOrgId) ??
          items.find(
            (org) =>
              normalize(org.organization_name) === normalize(preferredOrgName)
          ) ??
          (roleAllowsFallback ? items[0] : null);

        if (!chosenOrg) {
          if (!cancelled) {
            setAvailableDomains([]);
            setDomainId(null);
            setDomainName(null);
            setDomainSource("none");
            setActiveOrganizationId(null);
            setActiveOrganizationName(null);
            setParticipantDomainCount(participantDomainIds.length);
            setActiveDomainId(null);
            setReady(true);
          }
          return;
        }

        // ── Step 4: Load domains untuk org terpilih ──────────────────────────
        // Untuk SUPER_ADMIN/ADMIN (governance_fallback), kumpulkan semua domains
        // dari semua orgs sehingga domain selector di navbar tampil lengkap.
        let domains: AvailableDomain[];
        if (!hasParticipantBinding && roleAllowsFallback) {
          // Load domains dari semua orgs secara paralel
          const allDomainArrays = await Promise.all(
            items.map((org) =>
              organizationsApi.listDomains(org.organization_id).catch(() => [] as AvailableDomain[])
            )
          );
          const seen = new Set<string>();
          domains = allDomainArrays
            .flat()
            .filter((d: AvailableDomain) => {
              if (seen.has(d.domain_id)) return false;
              seen.add(d.domain_id);
              return true;
            });
        } else {
          domains = hasParticipantBinding
            ? ((organizationDomainsById[chosenOrg.organization_id] ??
                []) as AvailableDomain[])
            : ((await organizationsApi.listDomains(
                chosenOrg.organization_id
              )) as AvailableDomain[]);
        }

        // ── Step 5: Tentukan source label ─────────────────────────────────────
        // governance_fallback HANYA untuk admin tanpa participant binding.
        const resolvedSource: DomainSource = hasParticipantBinding
          ? "participant_binding"
          : roleAllowsFallback
            ? "governance_fallback"
            : "none";

        if (!cancelled) {
          setPreferredOrganization(
            chosenOrg.organization_id,
            chosenOrg.organization_name
          );
          setAvailableDomains(domains);
          setDomainSource(resolvedSource);
          setActiveOrganizationId(chosenOrg.organization_id);
          setActiveOrganizationName(chosenOrg.organization_name);
          setParticipantDomainCount(participantDomainIds.length);

          // Pilih domain aktif: participant binding > persisted > first
          const persistedId = getActiveDomainId();
          const persisted = persistedId
            ? domains.find((d) => d.domain_id === persistedId)
            : null;
          const participantDomain = hasParticipantBinding
            ? domains.find((d) => participantDomainIds.includes(d.domain_id))
            : null;
          const target =
            participantDomain ?? persisted ?? domains[0] ?? null;

          if (target) {
            setDomainId(target.domain_id);
            setDomainName(target.domain_name);
            setActiveDomainId(target.domain_id);
          } else {
            setDomainId(null);
            setDomainName(null);
            setActiveDomainId(null);
          }
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setDomainSource("none");
          setActiveOrganizationId(null);
          setActiveOrganizationName(null);
          setParticipantDomainCount(0);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, role, participantId]);

  const switchDomain = useCallback((domain: AvailableDomain) => {
    setDomainId(domain.domain_id);
    setDomainName(domain.domain_name);
    setActiveDomainId(domain.domain_id);
  }, []);

  return (
    <DomainContext.Provider
      value={{
        domainId,
        domainName,
        ready,
        availableDomains,
        domainSource,
        activeOrganizationId,
        activeOrganizationName,
        participantDomainCount,
        switchDomain,
      }}
    >
      {children}
    </DomainContext.Provider>
  );
};

export const useDomain = (): DomainContextValue => useContext(DomainContext);

