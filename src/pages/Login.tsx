import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Key, Lock, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { isKeycloakConfigured, loginWithKeycloak } from "@/auth/keycloak";

const Login = () => {
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  const from = (location.state as any)?.from?.pathname || "/";

  const handleSsoLogin = () => {
    if (!isKeycloakConfigured) {
      toast.info("SSO not configured", {
        description:
          "Set VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, VITE_KEYCLOAK_CLIENT_ID in .env",
      });
      return;
    }
    setRedirecting(true);
    loginWithKeycloak(window.location.origin + from);
  };

  return (
    // ── Root: full viewport, side-by-side panels ──
    <div
      className="h-screen w-screen flex overflow-hidden"
      style={{ backgroundColor: "#0b0f1a" }}
    >

      {/* ══════════════════════════════
          LEFT PANEL — Form
      ══════════════════════════════ */}
      <div
        className="relative w-full lg:w-[460px] flex-shrink-0 flex flex-col"
        style={{ backgroundColor: "#0f1624" }}
      >
        {/* Scrollable inner area, vertically centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-12">
          <div className="w-full max-w-[340px] flex flex-col gap-6">

            {/* Logo — identik dengan Sidebar */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber to-amber-glow flex items-center justify-center amber-glow flex-shrink-0">
                <span className="text-xl font-bold text-sidebar">R</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">
                  rapi<span className="text-gradient-amber">DSK</span>
                </h1>
                <p className="text-xs" style={{ color: "#5a6a82" }}>
                  Dataspace Connector
                </p>
              </div>
            </div>

            {/* SSO heading */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs uppercase tracking-wider font-semibold"
                style={{ color: "#5a6a82" }}
              >
                Single Sign-On
              </label>
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                Sign in with your enterprise identity provider to access the platform.
              </p>
            </div>

            {/* SSO Button (primary amber) */}
            <Button
              type="button"
              onClick={handleSsoLogin}
              disabled={redirecting}
              className="w-full h-12 font-bold text-base text-black hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#f59e0b" }}
            >
              {redirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to SSO...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Sign in with Enterprise SSO
                </>
              )}
            </Button>

            {/* Provider hint */}
            <p
              className="text-xs text-center"
              style={{ color: "#4a5a72" }}
            >
              You will be redirected to{" "}
              <span style={{ color: "#94a3b8" }}>Keycloak</span> to authenticate.
            </p>

            {/* Trust badges */}
            <div className="flex items-center gap-2 pt-2">
              {[
                { icon: Lock, label: "SECURE ACCESS" },
                { icon: FileText, label: "AUDIT READY" },
                { icon: ShieldCheck, label: "COMPLIANCE READY" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium flex-1 min-w-0"
                  style={{ border: "1px solid #1e2d44", color: "#4a5a72" }}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate leading-none">{label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Left panel footer */}
        <div className="px-10 py-4 text-center" style={{ borderTop: "1px solid #1a2436" }}>
          <p className="text-xs" style={{ color: "#2e3d52" }}>
            © 2026 RapiDSK Enterprise Platform. All rights reserved.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════
          RIGHT PANEL — Marketing
      ══════════════════════════════ */}
      <div className="hidden lg:flex flex-1 flex-col items-start justify-center px-16 xl:px-24">
        <div className="max-w-xl w-full">

          {/* Hero headline */}
          <h2
            className="font-bold text-white leading-tight mb-6"
            style={{ fontSize: "clamp(2.4rem, 3.5vw, 3.25rem)" }}
          >
            Enterprise Data<br />
            <span style={{ color: "#f59e0b" }}>Governance</span><br />
            You Can Trust.
          </h2>

          {/* Description */}
          <p className="text-base leading-relaxed mb-10" style={{ color: "#5a6a82", maxWidth: "480px" }}>
            RapiDSK provides end-to-end data governance, access control,
            and compliance management for organizations that demand the
            highest standards of security and regulatory readiness.
          </p>

          {/* Stats */}
          <div className="flex items-start gap-10">
            {[
              { value: "99.99%", label: "Uptime SLA" },
              { value: "SOC 2", label: "Certified" },
              { value: "GDPR", label: "Compliant" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-bold" style={{ color: "#f59e0b" }}>{value}</div>
                <div className="text-sm mt-1" style={{ color: "#5a6a82" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;
