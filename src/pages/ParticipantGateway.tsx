import React, { useState } from "react";
import { Key, ShieldCheck, Lock, Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ParticipantGateway() {
  const [step, setStep] = useState<"input" | "verifying">("input");
  const [uniqueKey, setUniqueKey] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();

  // Handle the verification sequence trick
  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uniqueKey || uniqueKey.length < 5) return;
    
    setStep("verifying");
    
    const sequence = [
      "Initiating secure handshake...",
      "Validating Unique Key [RapiDSK-Auth]...",
      "Key verified. Establishing Zero-Trust Tunnel...",
      "Resolving OGC Binding configurations...",
      "Allocating Connection Pool (Consumer Node)...",
      "Pulling dataset metadata & semantics...",
      "Connection ESTABLISHED."
    ];

    let i = 0;
    const interval = setInterval(() => {
      setLogs(prev => [...prev, sequence[i]]);
      i++;
      if (i >= sequence.length) {
        clearInterval(interval);
        setTimeout(() => {
          // Log User in as a Consumer
          const mockUser = {
            id: "consumer-999",
            email: "node@consumer.gov",
            full_name: "Consumer Node",
            role: "CONSUMER" as const,
            category: { name: "Government", code: "GOV", description: "" },
            group: { name: "Consumer", code: "CONSUMER", description: "", priority: 1 }
          };
          localStorage.setItem("auth_token", "mock-consumer-token");
          localStorage.setItem("user_info", JSON.stringify(mockUser));
          
          // Set TTL expiry 14 days from now
          localStorage.setItem("consumer_ttl_active", new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
          
          setAuthUser(mockUser);
          navigate("/");
        }, 800);
      }
    }, 600); // Add new log every 600ms
  };

  // View: 1. INPUT KEY
  if (step === "input") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-4 bg-[#0b0f1a] relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-md w-full bg-[#0f1624] border border-[#1e2d44] rounded-2xl p-8 relative z-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
              <Key className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Participant Access</h1>
            <p className="text-[#5a6a82] text-sm">
              Enter your Unique Key to establish a secure connection and stream the dataset instantly.
            </p>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-[#5a6a82]">
                Unique Access Key
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. RAPID-9B2X-KL8M-P77"
                  value={uniqueKey}
                  onChange={(e) => setUniqueKey(e.target.value.toUpperCase())}
                  className="w-full bg-[#16213a] border border-[#2a3a54] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-amber-500 transition-colors font-mono tracking-wider text-sm placeholder:text-[#3a4a62]"
                  autoFocus
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5a72]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={uniqueKey.length < 5}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect to Node
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#1e2d44] flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-xs text-[#5a6a82]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              E2E Encrypted
            </div>
            <div className="flex items-center gap-2 text-xs text-[#5a6a82]">
              <Zap className="w-4 h-4 text-amber-400" />
              Zero-Install
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View: 2. VERIFYING (TERMINAL)
  if (step === "verifying") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-4 bg-[#0b0f1a]">
        <div className="max-w-lg w-full bg-[#0a0d14] border border-[#1e2d44] rounded-lg overflow-hidden font-mono text-sm shadow-2xl">
          <div className="bg-[#16213a] px-4 py-2 border-b border-[#1e2d44] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
            <span className="ml-2 text-[#5a6a82] text-xs">Provisioning Consumer Node</span>
          </div>
          <div className="p-6 h-[250px] flex flex-col justify-end">
            <div className="space-y-2">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-3 text-[#a0aec0] animate-in fade-in slide-in-from-bottom-2">
                  <span className="text-emerald-500">{">"}</span>
                  <span className={idx === logs.length - 1 && log.includes("ESTABLISHED") ? "text-emerald-400 font-bold" : ""}>
                    {log}
                  </span>
                </div>
              ))}
              <div className="flex gap-3 text-amber-500 animate-pulse mt-2">
                <span>{">"}</span>
                <span className="w-2 h-4 bg-amber-500 inline-block" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // In this new flow, View 3 (Dashboard) is handled by the actual Dashboard route
  return null;
}
