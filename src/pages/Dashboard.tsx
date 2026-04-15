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
  Clock,
  AlertTriangle,
  LogOut
} from "lucide-react";
import { useOrganizations } from "@/api/hooks/useOrganizations";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useParticipants } from "@/api/hooks/useParticipants";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Dashboard = () => {
  const { data: orgsData } = useOrganizations({ limit: 1 });
  const { data: domainsData } = useAllDomains({ limit: 1 });
  const { data: participantsData } = useParticipants({ limit: 1 });
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  
  // TTL Logic for POC Participant
  const [ttlInfo, setTtlInfo] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const ttlStr = localStorage.getItem("consumer_ttl_active");
    if (!ttlStr) return;

    const expiry = new Date(ttlStr).getTime();
    
    const updateTtl = () => {
      const now = Date.now();
      const diff = expiry - now;
      if (diff > 0) {
        setTtlInfo({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60)
        });
      } else {
        // Expired Session Logic
        localStorage.removeItem("consumer_ttl_active");
        setTtlInfo(null);
      }
    };
    
    updateTtl();
    const timer = setInterval(updateTtl, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleEndSession = () => {
    localStorage.removeItem("consumer_ttl_active");
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Welcome to rapiDSK Dataspace Connector"
      />
      <div className="p-6 space-y-6">
        
        {/* POC Participant TTL Banner */}
        {ttlInfo && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between shadow-sm mb-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-amber-500 font-bold text-lg flex items-center gap-2">
                  Active Participant Session (Consumer) <AlertTriangle className="w-4 h-4" />
                </h3>
                <p className="text-muted-foreground text-sm">
                  You are currently authenticated via Unique Key with limited OGC capabilities.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Time to Live (TTL)</div>
                <div className="text-2xl font-mono font-bold text-foreground">
                  <span className="text-amber-500">{ttlInfo.days}d</span>:
                  <span>{ttlInfo.hours}h</span>:
                  <span>{ttlInfo.minutes}m</span>
                </div>
              </div>
              
              <div className="h-10 w-px bg-border hidden sm:block" />
              
              <button 
                onClick={handleEndSession}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Disconnect
              </button>
            </div>
          </div>
        )}

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
