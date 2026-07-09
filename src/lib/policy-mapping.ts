import type { Dataset } from "@/api/types/data-catalog";
import type { Policy } from "@/api/types/governance";
import { datasetDomain, type DomainKey } from "@/lib/fulfillment";

export interface DatasetPolicyResolution {
  policy: Policy | null;
  status: "matched" | "missing" | "ambiguous";
  reason: string;
  candidates: Policy[];
}

const normalize = (value: string | null | undefined) =>
  String(value ?? "").trim().toLowerCase();

const normalizeLevel = (value: string | null | undefined) =>
  String(value ?? "").trim().toUpperCase();

const isPublished = (policy: Policy) => {
  const status = normalize(policy.status);
  return !status || status === "published";
};

const isAccessPolicy = (policy: Policy) => normalize(policy.classification) === "access";

const matchByDomain = (policy: Policy, domain: DomainKey | undefined) =>
  !domain || !policy.domain || normalize(policy.domain) === normalize(domain);

const matchByLevel = (policy: Policy, level: string | undefined) =>
  !level || !policy.level || normalizeLevel(policy.level) === normalizeLevel(level);

const scorePolicy = (policy: Policy, domain: DomainKey | undefined, level: string | undefined) => {
  let score = 0;
  if (isAccessPolicy(policy)) score += 4;
  if (domain && policy.domain && normalize(policy.domain) === normalize(domain)) score += 3;
  if (level && policy.level && normalizeLevel(policy.level) === normalizeLevel(level)) score += 3;
  if (isPublished(policy)) score += 1;
  return score;
};

export function resolveDatasetPolicyForDataset(
  policies: Policy[],
  dataset: Dataset | null | undefined,
): DatasetPolicyResolution {
  if (!dataset) {
    return {
      policy: null,
      status: "missing",
      reason: "Dataset belum dipilih.",
      candidates: [],
    };
  }

  const domain = datasetDomain(dataset);
  const level = dataset.level ? normalizeLevel(dataset.level) : undefined;
  const activePolicies = policies.filter(isPublished);

  const compatible = activePolicies.filter(
    (policy) => matchByDomain(policy, domain) && matchByLevel(policy, level),
  );

  const exact = compatible.filter((policy) => {
    const sameDomain = domain ? normalize(policy.domain) === normalize(domain) : true;
    const sameLevel = level ? normalizeLevel(policy.level) === level : true;
    return sameDomain && sameLevel;
  });

  const exactDomainSpecific = domain
    ? exact.filter((policy) => normalize(policy.domain) === normalize(domain))
    : exact;

  if (exactDomainSpecific.length === 1) {
    return {
      policy: exactDomainSpecific[0],
      status: "matched",
      reason: "Policy cocok berdasarkan domain dan level dataset.",
      candidates: exactDomainSpecific,
    };
  }

  if (!domain && exact.length === 1) {
    return {
      policy: exact[0],
      status: "matched",
      reason: "Policy cocok berdasarkan domain dan level dataset.",
      candidates: exact,
    };
  }

  const ranked = compatible
    .map((policy) => ({ policy, score: scorePolicy(policy, domain, level) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) {
    return {
      policy: null,
      status: "missing",
      reason: "Belum ada dataset policy yang cocok untuk domain dan klasifikasi dataset ini.",
      candidates: [],
    };
  }

  if (ranked.length === 1) {
    return {
      policy: ranked[0].policy,
      status: "matched",
      reason: "Policy terbaik ditemukan untuk dataset ini.",
      candidates: [ranked[0].policy],
    };
  }

  if (ranked[0].score === ranked[1].score) {
    return {
      policy: null,
      status: "ambiguous",
      reason: "Ada lebih dari satu policy yang sama-sama cocok. Mapping perlu dirapikan dulu.",
      candidates: ranked.map((item) => item.policy),
    };
  }

  return {
    policy: ranked[0].policy,
    status: "matched",
    reason: "Policy dipilih dari kandidat terbaik yang tersedia.",
    candidates: ranked.map((item) => item.policy),
  };
}
