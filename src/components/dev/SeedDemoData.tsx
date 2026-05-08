// src/components/dev/SeedDemoData.tsx
// One-click seed of end-to-end demo data: org → domain → vocab → schema →
// participants (consumer + provider) → mapping → pools → dataset → policies
// → contract → agreement (APPROVED+ACTIVE).
//
// After running, admin can immediately Trigger Provide & Consume to validate
// the full data-transfer chain.

import { useState } from "react";
import { Sparkles, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type StepStatus = "pending" | "running" | "ok" | "skip" | "error";
interface Step {
  key: string;
  label: string;
  status: StepStatus;
  detail?: string;
  result?: any;
}

const SEED_PREFIX = "SEED_DEMO";

const initialSteps: Step[] = [
  { key: "org", label: "1. Create Organization (governance)", status: "pending" },
  { key: "domain", label: "2. Create Domain under org", status: "pending" },
  { key: "vocab", label: "3. Create Vocabulary", status: "pending" },
  { key: "term", label: "4. Create Vocabulary Term", status: "pending" },
  { key: "schema", label: "5. Create Schema", status: "pending" },
  { key: "schema-metadata", label: "5b. Attach Metadata to Schema", status: "pending" },
  { key: "consumer-part", label: "6. Create Consumer Participant (SKK Migas)", status: "pending" },
  { key: "provider-part", label: "7. Create Provider Participant (KKKS Demo)", status: "pending" },
  { key: "mapping", label: "8. Map Provider → Domain", status: "pending" },
  { key: "pool-consumer", label: "9. Create Connection Pool (consumer)", status: "pending" },
  { key: "pool-provider", label: "10. Create Connection Pool (provider)", status: "pending" },
  { key: "dataset", label: "11. Register Dataset (under provider)", status: "pending" },
  { key: "dataset-policy", label: "12. Create Dataset Policy", status: "pending" },
  { key: "contract-policy", label: "13. Create Contract Policy", status: "pending" },
  { key: "contract", label: "14. Create Contract (consumer↔provider)", status: "pending" },
  { key: "agreement", label: "15. Create Agreement", status: "pending" },
  { key: "approve", label: "16. Approve Agreement", status: "pending" },
  { key: "activate", label: "17. Activate Agreement", status: "pending" },
];

export const SeedDemoData = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>(initialSteps);

  const updateStep = (key: string, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => s.key === key ? { ...s, ...patch } : s));
  };

  const onlySuper = user?.is_superadmin === true;

  const runSeed = async () => {
    setRunning(true);
    setSteps(initialSteps);
    const ts = Date.now().toString().slice(-6);
    const ctx: Record<string, any> = {};

    const tryStep = async <T,>(key: string, fn: () => Promise<T>, optional = false): Promise<T | null> => {
      updateStep(key, { status: "running" });
      try {
        const result = await fn();
        updateStep(key, { status: "ok", result, detail: `id: ${(result as any)?.id?.slice(0, 8) || "ok"}` });
        return result;
      } catch (e: any) {
        const msg = e?.response?.data?.detail || e?.response?.data?.errors?.detail || e?.message || "fail";
        const status = e?.response?.status;
        updateStep(key, { status: optional ? "skip" : "error", detail: `HTTP ${status || "?"}: ${String(msg).slice(0, 80)}` });
        if (!optional) throw e;
        return null;
      }
    };

    try {
      // 1. Organization
      const org = await tryStep("org", async () => {
        const res = await apiClient.post("/api/v1/governance/organizations/", {
          name: `${SEED_PREFIX} Org ${ts}`,
          code: `${SEED_PREFIX}_${ts}`,
          description: "Auto-seeded demo organization",
        });
        ctx.org = res.data;
        return res.data;
      });
      if (!org) throw new Error("org failed");

      // 2. Domain
      const domain = await tryStep("domain", async () => {
        const res = await apiClient.post(`/api/v1/governance/organizations/${ctx.org.id}/domains`, {
          name: `Production ${ts}`,
          code: `PROD_${ts}`,
          description: "Auto-seeded production domain",
        });
        ctx.domain = res.data;
        return res.data;
      });
      if (!domain) throw new Error("domain failed");

      // 3. Vocabulary
      const vocab = await tryStep("vocab", async () => {
        const res = await apiClient.post(`/api/v1/data-catalog/${ctx.domain.id}/vocabularies`, {
          name: `Demo Vocab ${ts}`,
          version: "1.0.0",
          description: "Auto-seeded vocabulary",
          terms: [],
        });
        ctx.vocab = res.data;
        return res.data;
      });
      if (!vocab) throw new Error("vocab failed");

      // 4. Vocabulary Term
      const term = await tryStep("term", async () => {
        const res = await apiClient.post(`/api/v1/data-catalog/${ctx.domain.id}/vocabulary-terms`, {
          term: `well_id_${ts}`,
          datatype: "string",
          unit: null,
          description: "Demo term — well identifier",
          vocabulary_id: ctx.vocab.id,
        });
        ctx.term = res.data;
        return res.data;
      });
      if (!term) throw new Error("term failed");

      // 5. Schema (empty metadata_schemas — backend will accept and we add metadata after)
      const schema = await tryStep("schema", async () => {
        const res = await apiClient.post(`/api/v1/data-catalog/${ctx.domain.id}/schemas`, {
          vocabulary_id: ctx.vocab.id,
          version: "1.0.0",
          metadata_schemas: [],
        });
        ctx.schema = res.data;
        return res.data;
      });
      if (!schema) throw new Error("schema failed");

      // 5b. Add metadata schema as separate POST (cardinality enum: SINGLE | MULTIPLE)
      await tryStep("schema-metadata", async () => {
        const res = await apiClient.post(`/api/v1/data-catalog/${ctx.domain.id}/metadata-schemas`, {
          schema_id: ctx.schema.id,
          vocabulary_term_id: ctx.term.id,
          required: true,
          cardinality: "SINGLE",
        });
        return res.data;
      }, true); // optional — schema already created so don't block

      // 6. Consumer Participant
      const consumerPart = await tryStep("consumer-part", async () => {
        const res = await apiClient.post(`/api/v1/onboarding/participants`, {
          organization_name: `SKK Migas Demo ${ts}`,
          organization_type: "GOV_CENTRAL",
          address: "Jl. Demo No. 1, Jakarta",
          contact_person: { name: "Demo SKK Admin", email: `consumer.${ts}@demo.gxspace.id`, phone: "+62800000000" },
        });
        ctx.consumerPart = res.data;
        return res.data;
      });
      if (!consumerPart) throw new Error("consumer-part failed");

      // 7. Provider Participant
      const providerPart = await tryStep("provider-part", async () => {
        const res = await apiClient.post(`/api/v1/onboarding/participants`, {
          organization_name: `KKKS Demo ${ts}`,
          organization_type: "ENTERPRISE",
          address: "Jl. Demo No. 2, Jakarta",
          contact_person: { name: "Demo KKKS Admin", email: `provider.${ts}@demo.gxspace.id`, phone: "+62800000001" },
        });
        ctx.providerPart = res.data;
        return res.data;
      });
      if (!providerPart) throw new Error("provider-part failed");

      // 8. Mapping
      await tryStep("mapping", async () => {
        const res = await apiClient.post(`/api/v1/onboarding/participants/${ctx.providerPart.id}/domains`, {
          domain_id: ctx.domain.id,
        });
        return res.data;
      });

      // 9. Connection Pool consumer
      await tryStep("pool-consumer", async () => {
        const res = await apiClient.post(`/api/v1/onboarding/connection-pools`, {
          participant_id: ctx.consumerPart.id,
          name: `Consumer Pool ${ts}`,
          type: "CONSUMER",
          token: `demo-consumer-token-${ts}`,
          metadata: { url_consumer: "https://consumer.demo.gxspace.id", url_provider: "https://provider.demo.gxspace.id" },
        });
        return res.data;
      });

      // 10. Connection Pool provider
      await tryStep("pool-provider", async () => {
        const res = await apiClient.post(`/api/v1/onboarding/connection-pools`, {
          participant_id: ctx.providerPart.id,
          name: `Provider Pool ${ts}`,
          type: "PROVIDER",
          token: `demo-provider-token-${ts}`,
          metadata: { url_consumer: "https://consumer.demo.gxspace.id", url_provider: "https://provider.demo.gxspace.id" },
        });
        return res.data;
      });

      // 11. Dataset
      const dataset = await tryStep("dataset", async () => {
        const res = await apiClient.post(`/api/v1/data-catalog/${ctx.domain.id}/datasets`, {
          provider_id: ctx.providerPart.id,
          schema_id: ctx.schema.id,
          name: `Demo Well Production ${ts}`,
          description: "Auto-seeded dataset",
          version: "1.0.0",
          endpoint: {
            url: `https://provider.demo.gxspace.id/api/datasets/well-${ts}`,
            access_type: "PRIVATE",
            auth_strategy: null,
            protocol: "REST_API",
          },
          endpoint_metadata: {
            rate_limit: { requests_per_minute: 60 },
            documentation_url: "https://demo.gxspace.id/docs",
            data_format: "JSON",
            tags: ["demo", "auto-seeded"],
            sla: "best-effort",
          },
          metadata: [],
        });
        ctx.dataset = res.data;
        return res.data;
      });
      if (!dataset) throw new Error("dataset failed");

      // 12. Dataset Policy
      const dsPolicy = await tryStep("dataset-policy", async () => {
        const res = await apiClient.post(`/api/v1/policy-contract/${ctx.domain.id}/dataset-policies`, {
          name: `Demo Read Policy ${ts}`,
          description: "Auto-seeded read access policy",
          version: "1.0.0",
          type: "ACCESS",
          rules: [],
        });
        ctx.dsPolicy = res.data;
        return res.data;
      });
      if (!dsPolicy) throw new Error("dataset-policy failed");

      // 13. Contract Policy
      const cPolicy = await tryStep("contract-policy", async () => {
        const now = new Date();
        const later = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const res = await apiClient.post(`/api/v1/policy-contract/${ctx.domain.id}/contract-policies`, {
          name: `Demo Contract Policy ${ts}`,
          data_clasification: "INTERNAL",
          effective_from: now.toISOString(),
          effective_to: later.toISOString(),
          description: "Auto-seeded contract policy",
        });
        ctx.cPolicy = res.data;
        return res.data;
      });
      if (!cPolicy) throw new Error("contract-policy failed");

      // 14. Contract (with attached dataset + policy)
      const contract = await tryStep("contract", async () => {
        const res = await apiClient.post(`/api/v1/policy-contract/${ctx.domain.id}/contracts`, {
          consumer_id: ctx.consumerPart.id,
          provider_id: ctx.providerPart.id,
          name: `Demo Contract ${ts}`,
          description: "Auto-seeded contract",
          contract_policies: [ctx.cPolicy.id],
          datasets: [{ dataset_id: ctx.dataset.id, dataset_policy_id: ctx.dsPolicy.id }],
        });
        ctx.contract = res.data;
        return res.data;
      });
      if (!contract) throw new Error("contract failed");

      // 15. Agreement
      const agreement = await tryStep("agreement", async () => {
        const now = new Date();
        const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const res = await apiClient.post(`/api/v1/policy-contract/${ctx.domain.id}/agreements`, {
          contract_id: ctx.contract.id,
          effective_from: now.toISOString(),
          effective_to: later.toISOString(),
        });
        ctx.agreement = res.data;
        return res.data;
      });
      if (!agreement) throw new Error("agreement failed");

      // 16. Approve agreement
      await tryStep("approve", async () => {
        const res = await apiClient.patch(`/api/v1/policy-contract/${ctx.domain.id}/agreements/${ctx.agreement.id}`, {
          contract_id: ctx.contract.id,
          status: "APPROVED",
        });
        return res.data;
      }, true); // optional — skip if backend rejects

      // 17. Activate agreement
      await tryStep("activate", async () => {
        const res = await apiClient.patch(`/api/v1/policy-contract/${ctx.domain.id}/agreements/${ctx.agreement.id}`, {
          contract_id: ctx.contract.id,
          status: "ACTIVE",
        });
        return res.data;
      }, true);

      toast.success(`Demo seed complete — Domain ${ctx.domain.code}, Agreement ${ctx.agreement.id.slice(0, 8)}`, {
        description: "Trigger Provide/Consume sekarang dari ContractFulfilment / PolicyContract",
        duration: 8000,
      });
    } catch (e) {
      toast.error("Seed stopped at first failure. Cek step error di list.");
    } finally {
      setRunning(false);
    }
  };

  if (!onlySuper) return null;

  const okCount = steps.filter((s) => s.status === "ok").length;
  const errCount = steps.filter((s) => s.status === "error").length;
  const skipCount = steps.filter((s) => s.status === "skip").length;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600">
        <Sparkles className="h-4 w-4" />
        Seed Demo Data
      </Button>

      <Dialog open={open} onOpenChange={(o) => !running && setOpen(o)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Seed End-to-End Demo Data</DialogTitle>
            <DialogDescription>
              17 step otomatis bikin: organization → domain → vocab → schema → 2 participants → mapping → 2 pools → dataset → policies → contract → agreement (APPROVED+ACTIVE).
              Semua record di-prefix <code className="rounded bg-muted px-1 text-xs">SEED_DEMO</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {!running && okCount === 0 && errCount === 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 flex gap-3 text-xs">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Catatan sebelum jalan:</p>
                  <ul className="ml-4 mt-1 list-disc space-y-0.5 text-muted-foreground">
                    <li>Akan bikin record baru di backend (gak destructive)</li>
                    <li>Kalau ada step error → seed stop di situ, sisa step ga lanjut</li>
                    <li>Approve/Activate agreement bersifat optional — skip kalau backend reject</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border/50">
              {steps.map((s) => (
                <div key={s.key} className="flex items-start gap-3 border-b border-border/30 px-3 py-2 text-sm last:border-0">
                  <div className="mt-0.5">
                    {s.status === "pending" && <span className="inline-block h-3 w-3 rounded-full border border-border/60" />}
                    {s.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
                    {s.status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {s.status === "skip" && <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />}
                    {s.status === "error" && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={s.status === "error" ? "text-red-500" : s.status === "skip" ? "text-amber-500" : ""}>{s.label}</p>
                    {s.detail && <p className="text-[11px] text-muted-foreground font-mono truncate">{s.detail}</p>}
                  </div>
                </div>
              ))}
            </div>

            {(okCount > 0 || errCount > 0) && (
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">{okCount} ok</Badge>
                {skipCount > 0 && <Badge variant="outline" className="border-amber-500/40 text-amber-500">{skipCount} skipped</Badge>}
                {errCount > 0 && <Badge variant="outline" className="border-red-500/40 text-red-500">{errCount} error</Badge>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>Close</Button>
            <Button onClick={runSeed} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {running ? "Seeding..." : okCount > 0 ? "Run Again" : "Run Seed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
