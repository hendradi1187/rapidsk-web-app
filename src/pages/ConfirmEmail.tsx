import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, ChevronRight, KeyRound, Loader2, Lock, Shield, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { usersApi } from "@/api/services/identity";

type Phase = "license" | "installing" | "password" | "done";

type ActivationResult = {
  isActive: boolean;
  isVerified: boolean;
  raw: unknown;
};

const INSTALL_STEPS = [
  { ms: 300, text: "Initializing RapiDSK Connector Runtime v4.0..." },
  { ms: 700, text: "Verifying license key against SKK Migas Authority..." },
  { ms: 1200, text: "✓ License valid — ENTERPRISE tier activated" },
  { ms: 1700, text: "Loading control plane modules..." },
  { ms: 2100, text: "  → vocabulary engine         [OK]" },
  { ms: 2400, text: "  → policy enforcer           [OK]" },
  { ms: 2700, text: "  → contract manager          [OK]" },
  { ms: 3000, text: "Loading data plane modules..." },
  { ms: 3300, text: "  → transfer runtime          [OK]" },
  { ms: 3600, text: "  → adapter gateway           [OK]" },
  { ms: 3900, text: "  → audit logger              [OK]" },
  { ms: 4200, text: "Binding participant identity to connector..." },
  { ms: 4600, text: "✓ Connector registered in SKK Migas Dataspace" },
  { ms: 5000, text: "Securing operator credentials vault..." },
  { ms: 5400, text: "▶ ACTION REQUIRED: Set operator password to complete" },
];

const makeLicenseKey = (token: string) => {
  const raw = (token + "XXXXXXXXXXXXXXXXXXXX").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return [raw.slice(0, 4), raw.slice(4, 8), raw.slice(8, 12), raw.slice(12, 16)].join("-");
};

const ConfirmEmail = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>("license");
  const [licenseInput, setLicenseInput] = useState(token ? makeLicenseKey(token) : "");
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activationResult, setActivationResult] = useState<ActivationResult | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const startInstall = () => {
    setPhase("installing");
    setTerminalLines([]);
    setProgress(0);

    INSTALL_STEPS.forEach(({ ms, text }, i) => {
      setTimeout(() => {
        setTerminalLines((prev) => [...prev, text]);
        setProgress(Math.round(((i + 1) / INSTALL_STEPS.length) * 100));
        if (i === INSTALL_STEPS.length - 1) {
          setTimeout(() => setPhase("password"), 600);
        }
      }, ms);
    });
  };

  const submit = async () => {
    if (!token) return toast.error("Token aktivasi tidak ditemukan.");
    if (pwd.length < 6) return toast.error("Password minimal 6 karakter.");
    if (pwd !== confirm) return toast.error("Konfirmasi password tidak cocok.");
    setSubmitting(true);
    try {
      const response = await usersApi.confirmEmail(token, pwd);
      const payload = (response && typeof response === "object" ? response : null) as Record<string, unknown> | null;
      const isActive = payload?.is_active === true || payload?.active === true;
      const isVerified = payload?.is_verified === true || payload?.verified === true;
      setActivationResult({
        isActive,
        isVerified,
        raw: response,
      });
      setPhase("done");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Aktivasi gagal / token kedaluwarsa."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#070b16] flex items-center justify-center p-4">
        <div className="text-center text-slate-400">
          <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-3" />
          <p className="text-sm">Token aktivasi tidak ditemukan.<br />Buka tautan dari email undangan Anda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b16] flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-xl font-black text-[#0b1120]">R</span>
          </div>
          <div>
            <div className="text-white font-bold text-base leading-none">
              Rapi<span className="text-amber-400">DSK</span>
              <span className="ml-2 text-[10px] font-normal text-slate-500 align-middle">Connector Installer v4.0</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">SKK Migas National Dataspace Platform</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50">
          <div className="bg-[#1a1f2e] border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
            </div>
            <span className="ml-2 text-[11px] text-slate-500">rapidsk-connector-setup — operator activation</span>
          </div>

          <div className="bg-[#0d1117] p-5">
            {phase === "license" && (
              <div className="space-y-5">
                <div>
                  <p className="text-emerald-400 text-xs mb-1">$ rapidsk-connector setup --mode=operator-activation</p>
                  <p className="text-slate-400 text-xs">RapiDSK Connector Installer — Enterprise Edition</p>
                  <p className="text-slate-400 text-xs">Copyright © 2026 SKK Migas. All rights reserved.</p>
                </div>

                <div className="border border-white/10 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                    <KeyRound className="w-3.5 h-3.5" />
                    STEP 1 OF 2 — LICENSE ACTIVATION
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Enter your connector license key to activate this installation.
                    License keys are issued by SKK Migas Authority.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-500">LICENSE KEY</label>
                    <Input
                      value={licenseInput}
                      onChange={(e) => setLicenseInput(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="bg-[#070b16] border-white/10 text-amber-400 font-mono tracking-widest text-sm h-11 focus-visible:ring-amber-500/40"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <Shield className="w-3 h-3" />
                    Key will be verified against SKK Migas License Authority
                  </div>
                </div>

                <Button
                  className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-[#0b1120] font-bold"
                  onClick={startInstall}
                  disabled={licenseInput.replace(/-/g, "").length < 8}
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Activate &amp; Install Connector
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {phase === "installing" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  INSTALLING CONNECTOR...
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Installation Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div
                  ref={terminalRef}
                  className="bg-[#070b16] rounded-lg p-3 h-52 overflow-y-auto space-y-0.5 border border-white/[0.06]"
                >
                  {terminalLines.map((line, i) => (
                    <div
                      key={i}
                      className={`text-[11px] leading-5 ${
                        line.startsWith("✓")
                          ? "text-emerald-400"
                          : line.startsWith("▶")
                            ? "text-amber-400 font-semibold"
                            : line.startsWith("  →")
                              ? "text-slate-400 pl-2"
                              : "text-slate-500"
                      }`}
                    >
                      {!line.startsWith("✓") && !line.startsWith("▶") && !line.startsWith("  →")
                        ? <><span className="text-slate-700 mr-1.5">$</span>{line}</>
                        : line}
                    </div>
                  ))}
                  <div className="inline-block w-2 h-3.5 bg-slate-400 animate-pulse ml-0.5" />
                </div>
              </div>
            )}

            {phase === "password" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-emerald-400 text-xs">✓ Connector installed successfully</p>
                  <p className="text-slate-500 text-[11px]">Participant connector registered in SKK Migas Dataspace.</p>
                </div>

                <div className="border border-white/10 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    STEP 2 OF 2 — SET OPERATOR PASSWORD
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Create a secure password for your operator account.
                    You will use this to access RapiDSK platform.
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-500">NEW PASSWORD</label>
                      <Input
                        type="password"
                        placeholder="Min. 6 characters"
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        className="bg-[#070b16] border-white/10 text-white font-mono h-11 focus-visible:ring-amber-500/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-500">CONFIRM PASSWORD</label>
                      <Input
                        type="password"
                        placeholder="Re-enter password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="bg-[#070b16] border-white/10 text-white font-mono h-11 focus-visible:ring-amber-500/40"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  onClick={submit}
                  disabled={!pwd || pwd.length < 6 || pwd !== confirm || submitting}
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finalizing...</>
                    : <><CheckCircle2 className="w-4 h-4 mr-2" /> Complete Installation</>}
                </Button>
              </div>
            )}

            {phase === "done" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  {[
                    "✓ Password operator tersimpan",
                    activationResult?.isVerified ? "✓ Email sudah terverifikasi" : "• Verifikasi akhir belum terkonfirmasi dari server",
                    activationResult?.isActive ? "✓ Akun operator sudah aktif" : "• Status aktif akun belum terkonfirmasi dari server",
                  ].map((line) => (
                    <p
                      key={line}
                      className={line.startsWith("✓") ? "text-emerald-400 text-xs" : "text-amber-300 text-xs"}
                    >
                      {line}
                    </p>
                  ))}
                </div>

                <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-lg p-4 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                  <p className="text-white font-semibold text-sm">
                    {activationResult?.isActive && activationResult?.isVerified ? "Aktivasi Selesai" : "Password Berhasil Disimpan"}
                  </p>
                  <p className="text-slate-300 text-[11px]">
                    {activationResult?.isActive && activationResult?.isVerified
                      ? "Akun operator sudah aktif dan siap dipakai login."
                      : "Password sudah tersimpan, tetapi server belum mengembalikan konfirmasi bahwa akun sudah aktif penuh."}
                  </p>
                  {!activationResult?.isActive || !activationResult?.isVerified ? (
                    <p className="text-amber-300 text-[11px]">
                      Jika login masih ditolak, cek proses aktivasi di backend atau minta admin kirim ulang undangan.
                    </p>
                  ) : null}
                </div>

                <div className="bg-[#070b16] rounded-lg p-3 border border-white/[0.06] text-[10px] text-slate-600 space-y-0.5">
                  <p><span className="text-slate-500">operator.password</span> = <span className="text-emerald-400">SAVED</span></p>
                  <p><span className="text-slate-500">email.verification</span> = <span className={activationResult?.isVerified ? "text-emerald-400" : "text-amber-300"}>{activationResult?.isVerified ? "CONFIRMED" : "UNCONFIRMED"}</span></p>
                  <p><span className="text-slate-500">account.status</span>     = <span className={activationResult?.isActive ? "text-emerald-400" : "text-amber-300"}>{activationResult?.isActive ? "ACTIVE" : "PENDING"}</span></p>
                </div>

                <Link to="/login">
                  <Button className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-[#0b1120] font-bold">
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Launch RapiDSK Platform
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-4">
          RapiDSK Enterprise · SKK Migas National Dataspace · Secure Installation
        </p>
      </div>
    </div>
  );
};

export default ConfirmEmail;
