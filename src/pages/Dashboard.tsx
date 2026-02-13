import { OnboardingProvider } from "@/components/onboarding/OnboardingContext";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { OnboardingFlow } from "@/components/dashboard/OnboardingFlow";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ParticipantsList } from "@/components/dashboard/ParticipantsList";
import {
  Building2,
  Layers,
  Users,
  ArrowRightLeft,
  Shield,
} from "lucide-react";
import { useOrganizations } from "@/api/hooks/useOrganizations";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useParticipants } from "@/api/hooks/useParticipants";

const Dashboard = () => {
  const { data: orgsData } = useOrganizations({ limit: 1 });
  const { data: domainsData } = useAllDomains({ limit: 1 });
  const { data: participantsData } = useParticipants({ limit: 1 });

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Welcome to rapiDSK Dataspace Connector"
      />
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Organizations"
            value={orgsData?.total ?? "—"}
            change="Total registered"
            changeType="neutral"
            icon={Building2}
            iconColor="bg-info/10 text-info"
          />
          <StatCard
            title="Domains"
            value={domainsData?.total ?? "—"}
            change="Total active"
            changeType="neutral"
            icon={Layers}
            iconColor="bg-accent/10 text-accent"
          />
          <StatCard
            title="Participants"
            value={participantsData?.total ?? "—"}
            change="Total onboarded"
            changeType="neutral"
            icon={Users}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Data Transfers"
            value="—"
            change="No transfer API"
            changeType="neutral"
            icon={ArrowRightLeft}
            iconColor="bg-purple-100 text-purple-600"
          />
        </div>

        {/* Onboarding Flow */}
        <OnboardingProvider>
          <OnboardingFlow />
        </OnboardingProvider>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity & Compliance */}
          <div className="lg:col-span-2 space-y-6">
            <RecentActivity />

            {/* Quick Compliance Status */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Compliance Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700">ISO 27001</span>
                  </div>
                  <p className="text-sm text-emerald-600">Compliant</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700">COBIT/ITIL</span>
                  </div>
                  <p className="text-sm text-emerald-600">Compliant</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-700">SKK Migas</span>
                  </div>
                  <p className="text-sm text-amber-600">Review Required</p>
                </div>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="lg:col-span-1">
            <ParticipantsList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
