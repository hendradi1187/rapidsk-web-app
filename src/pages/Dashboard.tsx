import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { OnboardingFlow } from "@/components/dashboard/OnboardingFlow";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ParticipantsList } from "@/components/dashboard/ParticipantsList";
import {
  Building2,
  Database,
  FileText,
  ArrowRightLeft,
  Shield,
  TrendingUp,
} from "lucide-react";

const Dashboard = () => {
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
            value="12"
            change="+2 this month"
            changeType="positive"
            icon={Building2}
            iconColor="bg-info/10 text-info"
          />
          <StatCard
            title="Active Datasets"
            value="156"
            change="+24 this week"
            changeType="positive"
            icon={Database}
            iconColor="bg-accent/10 text-accent"
          />
          <StatCard
            title="Active Contracts"
            value="48"
            change="3 pending approval"
            changeType="neutral"
            icon={FileText}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Data Transfers"
            value="2.4K"
            change="+18% vs last month"
            changeType="positive"
            icon={ArrowRightLeft}
            iconColor="bg-purple-100 text-purple-600"
          />
        </div>

        {/* Onboarding Flow */}
        <OnboardingFlow />

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
