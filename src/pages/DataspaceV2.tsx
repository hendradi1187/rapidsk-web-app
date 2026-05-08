import { Navigate, useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  Gauge,
  Handshake,
  KeyRound,
  Mail,
  Network,
  RadioTower,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useParticipants, useParticipantDomains } from "@/api/hooks/useParticipants";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useContracts, useContractPolicies } from "@/api/hooks/useContracts";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useConnectionPools } from "@/api/hooks/useParticipants";
import { useMonitorings } from "@/api/hooks/useMonitorings";
import { useAuth, type AppRole } from "@/context/AuthContext";
import { V2_ROLE_LABELS } from "@/config/rbac";
import { getDefaultV2RouteForRole } from "@/lib/dataspace-version";
import type { Participant } from "@/api/types";
import { cn } from "@/lib/utils";

type Status = "Live API" | "Preview only" | "No backend contract";

interface SectionSpec {
  title: string;
  subtitle: string;
  actor: string;
  sequencePhase: string;
  status: Status;
  endpoints: string[];
  responsibilities: string[];
  nextActions: string[];
}

const STATUS_CLASS: Record<Status, string> = {
  "Live API": "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  "Preview only": "border-amber-500/30 bg-amber-500/10 text-amber-700",
  "No backend contract": "border-slate-400/30 bg-slate-500/10 text-slate-600",
};

const LIVE_API = {
  participants: "/api/v1/onboarding/participants",
  participantDomains: "/api/v1/onboarding/participants/{participant_id}/domains",
  connectionPools: "/api/v1/onboarding/connection-pools",
  users: "/api/v1/identity-provider/users/",
  userCategories: "/api/v1/identity-provider/user/categories/",
  userGroups: "/api/v1/identity-provider/user/groups/",
  organizations: "/api/v1/governance/organizations/",
  domains: "/api/v1/governance/organizations/{organization_id}/domains",
  vocabularies: "/api/v1/data-catalog/{domain_id}/vocabularies",
  schemas: "/api/v1/data-catalog/{domain_id}/schemas",
  metadataSchemas: "/api/v1/data-catalog/{domain_id}/metadata-schemas",
  datasets: "/api/v1/data-catalog/{domain_id}/datasets",
  datasetPolicies: "/api/v1/policy-contract/{domain_id}/dataset-policies",
  contractPolicies: "/api/v1/policy-contract/{domain_id}/contract-policies",
  contracts: "/api/v1/policy-contract/{domain_id}/contracts",
  agreements: "/api/v1/policy-contract/{domain_id}/agreements",
  monitorings: "/api/v1/onboarding/{domain_id}/monitorings",
  consume: "/api/v1/consumer/{domain_id}/consume/{agreement_id}",
  provide: "/api/v1/provider/{domain_id}/provide/{agreement_id}",
  dataTransfers: "/api/v1/{domain_id}/data-transfers",
  transferHistory: "/api/v1/{domain_id}/transfer-processes/history",
};

const SECTION_SPECS: Record<string, SectionSpec> = {
  "/v2/authority/dashboard": {
    title: "Dashboard Authority",
    subtitle: "Super Admin sequence overview",
    actor: "SUPER ADMIN (Data Space Authority)",
    sequencePhase: "Autentikasi -> Registrasi Participant Consumer -> Definisi Role Awal",
    status: "Live API",
    endpoints: [LIVE_API.participants, LIVE_API.users, LIVE_API.userCategories, LIVE_API.userGroups],
    responsibilities: [
      "Masuk sebagai Data Space Authority.",
      "Register Admin Consumer SKK Migas sebagai participant awal.",
      "Menentukan role awal: SUPER ADMIN, ADMIN CONSUMER, ADMIN PROVIDER.",
    ],
    nextActions: ["Cek jumlah participant dan user live.", "Pastikan activation email masih preview-only."],
  },
  "/v2/authority/register-admin-consumer": {
    title: "Register Admin Consumer",
    subtitle: "Create SKK Migas participant and admin user readiness",
    actor: "SUPER ADMIN (Data Space Authority)",
    sequencePhase: "PROSES 1: Registrasi Participant Consumer (SKK MIGAS) + Email Aktivasi",
    status: "Live API",
    endpoints: [LIVE_API.participants, LIVE_API.users],
    responsibilities: [
      "Input data SKK Migas sebagai Admin Consumer.",
      "Simpan participant lewat onboarding participant API.",
      "Siapkan user admin lewat identity-provider users API.",
    ],
    nextActions: ["Gunakan participant form live untuk record organisasi.", "Gunakan role setup untuk user category/group."],
  },
  "/v2/authority/role-setup": {
    title: "Role Setup",
    subtitle: "Initial role definition from sequence diagram",
    actor: "SUPER ADMIN (Data Space Authority)",
    sequencePhase: "PROSES 2: Definisi Role Awal",
    status: "Live API",
    endpoints: [LIVE_API.userCategories, LIVE_API.userGroups, LIVE_API.users],
    responsibilities: [
      "Map kategori dan grup backend ke role aplikasi.",
      "Pastikan Admin Consumer dan Admin Provider punya permission sesuai sequence.",
      "Validasi role dari category.code dan group.code.",
    ],
    nextActions: ["Review user category/group live.", "Jangan pakai role copy generic Consumer/Provider di UI V2."],
  },
  "/v2/authority/activation-email": {
    title: "Activation Email Preview",
    subtitle: "Preview only because SMTP and activation endpoints are not live",
    actor: "SUPER ADMIN (Data Space Authority)",
    sequencePhase: "Participant menerima email aktivasi",
    status: "Preview only",
    endpoints: ["Email delivery preview only", "Account activation preview only"],
    responsibilities: [
      "Tampilkan email invitation sebagai preview.",
      "Tampilkan activation code/link untuk demo.",
      "Jangan klaim email terkirim dari backend.",
    ],
    nextActions: ["Copy template untuk demo POC.", "Tandai status sebagai Preview only."],
  },
  "/v2/admin-consumer/dashboard": {
    title: "Dashboard Consumer",
    subtitle: "Admin Consumer SKK Migas operation view",
    actor: "ADMIN CONSUMER (SKK MIGAS)",
    sequencePhase: "Consumer login dengan credential yang telah diaktivasi",
    status: "Live API",
    endpoints: [LIVE_API.domains, LIVE_API.participants, LIVE_API.monitorings],
    responsibilities: [
      "Melihat status konfigurasi domain, participant, mapping, dan monitoring.",
      "Menjalankan alur master data sampai transfer monitor.",
      "Menjadi admin yang mengundang dan memetakan Admin Provider KKKS.",
    ],
    nextActions: ["Lengkapi master data.", "Buat policy/contract.", "Mapping Admin Provider ke domain."],
  },
  "/v2/admin-consumer/master-data": {
    title: "Master Data",
    subtitle: "Domain, terms, vocabulary, schema",
    actor: "ADMIN CONSUMER (SKK MIGAS)",
    sequencePhase: "GROUP A: Master Data Configuration",
    status: "Live API",
    endpoints: [LIVE_API.vocabularies, LIVE_API.schemas, LIVE_API.metadataSchemas],
    responsibilities: [
      "Input atau update domain terms, vocabulary, dan schema.",
      "Simpan dengan versioning dan timestamp.",
      "Menyiapkan standar metadata sebelum contract dibuat.",
    ],
    nextActions: ["Pilih domain aktif.", "Cek vocabulary/schema count dari live API."],
  },
  "/v2/admin-consumer/policy-contract": {
    title: "Policy & Contract",
    subtitle: "Policy, contract, agreement view",
    actor: "ADMIN CONSUMER (SKK MIGAS)",
    sequencePhase: "GROUP B: Policy & Contract Management",
    status: "Live API",
    endpoints: [LIVE_API.datasetPolicies, LIVE_API.contractPolicies, LIVE_API.contracts, LIVE_API.agreements],
    responsibilities: [
      "Buat policy rule, constraint, dan purpose.",
      "Buat contract referensi policy dan participant provider.",
      "View agreement detail untuk export/signature demo.",
    ],
    nextActions: ["Buat dataset policy.", "Buat contract.", "Aktifkan agreement."],
  },
  "/v2/admin-consumer/system-setup": {
    title: "System Setup",
    subtitle: "Endpoint, encryption, retention, monitoring setup",
    actor: "ADMIN CONSUMER (SKK MIGAS)",
    sequencePhase: "GROUP C: System Setup & Participant Management",
    status: "Live API",
    endpoints: [LIVE_API.connectionPools, LIVE_API.monitorings],
    responsibilities: [
      "Setup connection pool dan monitoring.",
      "Konfigurasi retention dan realtime notification.",
      "Menjadi control plane sebelum provider fulfilment.",
    ],
    nextActions: ["Cek connection pool live.", "Gunakan /onboarding/{domain_id}/monitorings untuk monitoring."],
  },
  "/v2/admin-consumer/admin-provider": {
    title: "Admin Provider",
    subtitle: "Register Admin Provider KKKS",
    actor: "ADMIN CONSUMER (SKK MIGAS)",
    sequencePhase: "Input Participant Provider (KKKS)",
    status: "Live API",
    endpoints: [LIVE_API.participants],
    responsibilities: [
      "Input Admin Provider KKKS.",
      "Simpan provider sebagai participant.",
      "Tampilkan activation provider sebagai preview bila email belum live.",
    ],
    nextActions: ["Register provider participant.", "Lanjutkan ke domain mapping."],
  },
  "/v2/admin-consumer/domain-mapping": {
    title: "Domain Mapping",
    subtitle: "Map Admin Provider to domain",
    actor: "ADMIN CONSUMER (SKK MIGAS)",
    sequencePhase: "Mapping Participant vs Domain",
    status: "Live API",
    endpoints: [LIVE_API.participantDomains],
    responsibilities: [
      "Mapping provider_id ke domain_id.",
      "Validasi domain yang boleh diakses provider.",
      "Menyiapkan provider agar hanya melihat assigned domains.",
    ],
    nextActions: ["Pilih provider.", "Assign domain via participant-domain endpoint."],
  },
  "/v2/admin-consumer/transfer-monitor": {
    title: "Transfer Monitor",
    subtitle: "Monitoring and data transfer view",
    actor: "ADMIN CONSUMER (SKK MIGAS)",
    sequencePhase: "GROUP D: Monitoring & Data Transfer View",
    status: "Live API",
    endpoints: [LIVE_API.monitorings, LIVE_API.consume],
    responsibilities: [
      "View monitoring data per domain.",
      "Gunakan connector consume untuk agreement-scoped checks.",
      "V2 memakai monitoring onboarding dan connector agreement-scoped.",
    ],
    nextActions: ["Cek monitoring records.", "Cek connector consume endpoint saat agreement tersedia."],
  },
  "/v2/admin-provider/dashboard": {
    title: "Dashboard Provider",
    subtitle: "Admin Provider KKKS limited menu",
    actor: "ADMIN PROVIDER (KKKS)",
    sequencePhase: "Provider login setelah diaktivasi",
    status: "Live API",
    endpoints: [LIVE_API.participantDomains, LIVE_API.datasets, LIVE_API.dataTransfers],
    responsibilities: [
      "Melihat menu terbatas provider.",
      "Melihat assigned domains dan contract fulfilment.",
      "Upload/register dataset untuk contract aktif.",
      "Ringkasan transfer memakai /data-transfers karena /transfer-processes/history belum stabil di backend.",
    ],
    nextActions: ["Cek assigned domains.", "Register dataset untuk fulfilment.", "Buka Fulfilment Reports untuk lihat transfer domain scope."],
  },
  "/v2/admin-provider/assigned-domains": {
    title: "Assigned Domains",
    subtitle: "View Data Participant vs Domain",
    actor: "ADMIN PROVIDER (KKKS)",
    sequencePhase: "PROSES 2: View Data Participant Vs Domain",
    status: "Live API",
    endpoints: [LIVE_API.participantDomains],
    responsibilities: [
      "Melihat domain yang di-assign ke provider.",
      "Melihat access status dan reference mapping.",
      "Scope provider dibatasi mapping participant-domain.",
    ],
    nextActions: ["Pastikan mapping aktif.", "Lanjut ke contract fulfilment."],
  },
  "/v2/admin-provider/contract-fulfilment": {
    title: "Contract Fulfilment",
    subtitle: "Choose active contract and fulfil dataset requirement",
    actor: "ADMIN PROVIDER (KKKS)",
    sequencePhase: "PROSES 3: Contract Fulfilment - Input Dataset",
    status: "Live API",
    endpoints: [LIVE_API.contracts, LIVE_API.datasets, LIVE_API.provide],
    responsibilities: [
      "Pilih contract aktif.",
      "Register dataset atau data source.",
      "Provider provide endpoint siap untuk agreement-scoped data.",
    ],
    nextActions: ["Cek contract list.", "Register dataset di Dataset Registration."],
  },
  "/v2/admin-provider/dataset-registration": {
    title: "Dataset Registration",
    subtitle: "Register dataset location and metadata",
    actor: "ADMIN PROVIDER (KKKS)",
    sequencePhase: "Upload dataset / register data source",
    status: "Live API",
    endpoints: [LIVE_API.datasets],
    responsibilities: [
      "Input dataset metadata, storage path, schema reference.",
      "Apply access policy through contract context.",
      "Status demo: Ready for Transfer setelah dataset tersedia.",
    ],
    nextActions: ["Register dataset lewat live data-catalog endpoint.", "Cek fulfilment report."],
  },
  "/v2/admin-provider/fulfilment-reports": {
    title: "Fulfilment Reports",
    subtitle: "Provider report memakai data-transfers domain scope",
    actor: "ADMIN PROVIDER (KKKS)",
    sequencePhase: "PROSES 4: View Data Transfer sesuai Contract Fulfilment",
    status: "Preview only",
    endpoints: [
      LIVE_API.dataTransfers,
      LIVE_API.contracts,
      LIVE_API.agreements,
      `${LIVE_API.transferHistory} (backend route broken)`,
      "/api/v1/{domain_id}/transfer-reports?contract_id={contract_id} (belum disediakan)",
    ],
    responsibilities: [
      "Lihat report fulfilment dari data transfer domain yang tersedia.",
      "Tandai jelas bila endpoint dedicated per-contract belum disediakan.",
      "Jangan lagi bergantung pada /transfer-processes/history untuk provider report.",
    ],
    nextActions: ["Filter berdasarkan domain.", "Gunakan export sebagai snapshot sementara.", "Minta backend sediakan endpoint report by contract bila butuh agregasi final."],
  },
};

const ROLE_PREFIX: Record<AppRole, string> = {
  SUPER_ADMIN: "/v2/authority",
  CONSUMER: "/v2/admin-consumer",
  PROVIDER: "/v2/admin-provider",
  VIEWER: "/",
};

const StatusBadge = ({ status }: { status: Status }) => (
  <Badge variant="outline" className={cn("w-fit", STATUS_CLASS[status])}>
    {status}
  </Badge>
);

const MetricCard = ({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Gauge;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardDescription>{title}</CardDescription>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="mt-1 break-all text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const pickParticipantForRole = (participants: Participant[], role: AppRole) => {
  if (role === "PROVIDER") {
    return participants.find((participant) => participant.organization_type === "ENTERPRISE") ?? participants[0];
  }

  if (role === "CONSUMER") {
    return participants.find((participant) => participant.organization_type !== "ENTERPRISE") ?? participants[0];
  }

  return participants[0];
};

const EmailPreview = ({ recipient }: { recipient: string }) => {
  const activationCode = "RDSK-V2-SKK-0426";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-amber-600" />
              Activation Email Preview
            </CardTitle>
            <CardDescription>No live SMTP or activation endpoint in the backend contract.</CardDescription>
          </div>
          <StatusBadge status="Preview only" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">To</p>
            <p className="font-medium">{recipient}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Activation Code</p>
            <p className="font-mono font-medium">{activationCode}</p>
          </div>
        </div>
        <Separator />
        <p className="text-sm text-muted-foreground">
          Admin account is ready for activation. Use code{" "}
          <span className="font-mono text-foreground">{activationCode}</span> in the demo activation step.
        </p>
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Preview only</AlertTitle>
          <AlertDescription>
            This card does not send email or activate accounts through a network request.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

const LiveDataPanel = ({
  role,
  selectedDomainId,
  selectedParticipant,
}: {
  role: AppRole;
  selectedDomainId: string;
  selectedParticipant?: Participant;
}) => {
  const { data: participantDomainsData, isLoading: isLoadingMappings } = useParticipantDomains(
    selectedParticipant?.id ?? "",
    { limit: 10 }
  );
  const { data: datasetsData, isLoading: isLoadingDatasets } = useDatasets(selectedDomainId, { limit: 10 });
  const { data: contractsData, isLoading: isLoadingContracts } = useContracts(selectedDomainId, { limit: 10 });
  const { data: agreementsData, isLoading: isLoadingAgreements } = useAgreements(selectedDomainId, { limit: 10 });
  const { data: policiesData, isLoading: isLoadingPolicies } = useContractPolicies(selectedDomainId, { limit: 10 });
  const { data: poolsData, isLoading: isLoadingPools } = useConnectionPools({ limit: 10 });
  const { data: monitoringsData, isLoading: isLoadingMonitorings } = useMonitorings(selectedDomainId, { limit: 10 });

  const mappings = participantDomainsData?.data ?? [];
  const datasets = datasetsData?.data ?? [];
  const contracts = contractsData?.data ?? [];
  const agreements = agreementsData?.data ?? [];
  const policies = policiesData?.data ?? [];
  const pools = poolsData?.data ?? [];
  const monitorings = monitoringsData?.data ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-5 w-5 text-info" />
            Live Scope Data
          </CardTitle>
          <CardDescription>
            {selectedParticipant
              ? `${selectedParticipant.organization_name} - ${selectedParticipant.organization_type}`
              : "No participant selected from live API"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard title="Mappings" value={isLoadingMappings ? "..." : mappings.length} description={LIVE_API.participantDomains} icon={Network} />
          <MetricCard title="Datasets" value={isLoadingDatasets ? "..." : datasets.length} description={LIVE_API.datasets} icon={Database} />
          <MetricCard title="Contracts" value={isLoadingContracts ? "..." : contracts.length} description={LIVE_API.contracts} icon={FileText} />
          <MetricCard title="Agreements" value={isLoadingAgreements ? "..." : agreements.length} description={LIVE_API.agreements} icon={Handshake} />
          <MetricCard title="Policies" value={isLoadingPolicies ? "..." : policies.length} description={LIVE_API.contractPolicies} icon={ClipboardCheck} />
          <MetricCard title="Pools" value={isLoadingPools ? "..." : pools.length} description={LIVE_API.connectionPools} icon={RadioTower} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-accent" />
            Monitoring Records
          </CardTitle>
          <CardDescription>{LIVE_API.monitorings}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Log</TableHead>
                <TableHead>Notification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingMonitorings ? (
                <TableRow>
                  <TableCell colSpan={3}>Loading monitoring records...</TableCell>
                </TableRow>
              ) : monitorings.length > 0 ? (
                monitorings.map((monitoring) => (
                  <TableRow key={monitoring.id}>
                    <TableCell className="font-mono text-xs">{monitoring.participant_id}</TableCell>
                    <TableCell>{monitoring.log.enabled ? `${monitoring.log.retention} days` : "Disabled"}</TableCell>
                    <TableCell>{monitoring.notification.realtime ? "Realtime" : monitoring.notification.email}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No live monitoring data yet. V2 uses onboarding monitorings only.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {role === "SUPER_ADMIN" && <EmailPreview recipient={selectedParticipant?.contact_person.email ?? "admin.consumer@skkmigas.go.id"} />}
      {role === "CONSUMER" && <EmailPreview recipient="admin.provider@kkks.example" />}
    </div>
  );
};

const DataspaceV2 = () => {
  const { role, user } = useAuth();
  const location = useLocation();

  if (location.pathname === "/v2") {
    return <Navigate to={getDefaultV2RouteForRole(role)} replace />;
  }

  if (role === "VIEWER") {
    return <Navigate to="/" replace />;
  }

  if (!location.pathname.startsWith(ROLE_PREFIX[role])) {
    return <Navigate to={getDefaultV2RouteForRole(role)} replace />;
  }

  const spec = SECTION_SPECS[location.pathname] ?? SECTION_SPECS[getDefaultV2RouteForRole(role)];
  const { data: domainsData, isLoading: isLoadingDomains } = useAllDomains({ limit: 20 });
  const { data: participantsData, isLoading: isLoadingParticipants } = useParticipants({ limit: 50 });
  const domains = domainsData?.data ?? [];
  const participants = participantsData?.data ?? [];
  const selectedDomainId = domains[0]?.id ?? "";
  const selectedParticipant = pickParticipantForRole(participants, role);

  return (
    <div className="min-h-screen">
      <Header title={spec.title} subtitle={`${spec.actor} - ${spec.subtitle}`} />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="V2 Actor" value={V2_ROLE_LABELS[role]} description={user?.email || "Authenticated account"} icon={ShieldCheck} />
          <MetricCard title="Domains" value={isLoadingDomains ? "..." : domains.length} description="Live governance domain scope" icon={BookOpen} />
          <MetricCard title="Participants" value={isLoadingParticipants ? "..." : participants.length} description="Live onboarding participants" icon={Users2} />
          <MetricCard title="Mode" value="Sequence V2" description="V1 menu hidden in this mode" icon={Gauge} />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{spec.sequencePhase}</CardTitle>
                <CardDescription>{spec.actor}</CardDescription>
              </div>
              <StatusBadge status={spec.status} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Admin responsibilities</h3>
              {spec.responsibilities.map((item) => (
                <div key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Live endpoint contract</h3>
              {spec.endpoints.map((endpoint) => (
                <div key={endpoint} className="break-all rounded-md border px-3 py-2 font-mono text-xs">
                  {endpoint}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Next UX actions</h3>
              {spec.nextActions.map((item) => (
                <div key={item} className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Alert className="border-blue-500/20 bg-blue-500/10">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <AlertTitle>V2 sequence mode</AlertTitle>
          <AlertDescription>
            Sidebar only shows menus for {V2_ROLE_LABELS[role]}. Old v1 routes and non-live sequence paths are hidden.
          </AlertDescription>
        </Alert>

        <LiveDataPanel
          role={role}
          selectedDomainId={selectedDomainId}
          selectedParticipant={selectedParticipant}
        />
      </div>
    </div>
  );
};

export default DataspaceV2;
