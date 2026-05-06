import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLogin } from "@/api/hooks/useUsers";
import {
  DATASPACE_UI_VERSION_KEY,
  getDefaultV2RouteForRole,
  setDataspaceV2Enabled,
} from "@/lib/dataspace-version";
import { Loader2, Eye, EyeOff, AlertCircle, Key, Lock, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();

  const from = (location.state as any)?.from?.pathname || "/";

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [useDataspaceV2, setUseDataspaceV2] = useState(
    () => localStorage.getItem(DATASPACE_UI_VERSION_KEY) === "v2"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const session = await loginMutation.mutateAsync({
        username: formData.username,
        password: formData.password,
      });

      if (rememberMe) {
        localStorage.setItem("remember_username", formData.username);
      } else {
        localStorage.removeItem("remember_username");
      }

      setDataspaceV2Enabled(useDataspaceV2);

      const nextRole = session.role;
      const nextPath = useDataspaceV2 ? getDefaultV2RouteForRole(nextRole) : from;

      setTimeout(() => navigate(nextPath, { replace: true }), 500);
    } catch (error: any) {
      console.error("Login failed:", error);
    }
  };

  // Load remembered username on mount
  useState(() => {
    const remembered = localStorage.getItem("remember_username");
    if (remembered) {
      setFormData((prev) => ({ ...prev, username: remembered }));
      setRememberMe(true);
    }
  });

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
          <div className="w-full max-w-[340px] flex flex-col gap-5">

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

            {/* SSO Button */}
            <button
              type="button"
              onClick={() => toast.info("SSO integration coming soon")}
              disabled={loginMutation.isPending}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "#16213a",
                border: "1px solid #2a3a54",
                color: "#a0aec0",
              }}
            >
              <Key className="w-4 h-4" />
              Sign in with Enterprise SSO (Keycloak)
            </button>

            {/* OR CREDENTIALS divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: "#1e2d44" }} />
              <span
                className="text-xs uppercase tracking-widest font-medium whitespace-nowrap"
                style={{ color: "#4a5a72" }}
              >
                OR CREDENTIALS
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: "#1e2d44" }} />
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4">

              {/* Email / Username */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs uppercase tracking-wider font-semibold"
                  style={{ color: "#5a6a82" }}
                >
                  Email Address
                </label>
                <Input
                  type="text"
                  placeholder="user@organization.com"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value });
                    setErrors({ ...errors, username: undefined });
                  }}
                  className="h-11 text-sm"
                  style={{
                    backgroundColor: "#16213a",
                    borderColor: errors.username ? "#ef4444" : "#2a3a54",
                    color: "#e2e8f0",
                  }}
                  disabled={loginMutation.isPending}
                  autoComplete="username"
                  autoFocus
                />
                {errors.username && (
                  <p className="text-xs text-red-400">{errors.username}</p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs uppercase tracking-wider font-semibold"
                  style={{ color: "#5a6a82" }}
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setErrors({ ...errors, password: undefined });
                    }}
                    className="h-11 pr-10 text-sm"
                    style={{
                      backgroundColor: "#16213a",
                      borderColor: errors.password ? "#ef4444" : "#2a3a54",
                      color: "#e2e8f0",
                    }}
                    disabled={loginMutation.isPending}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "#4a5a72" }}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />
                    }
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400">{errors.password}</p>
                )}
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v as boolean)}
                    disabled={loginMutation.isPending}
                    className="border-[#2a3a54] data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-400"
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm cursor-pointer select-none"
                    style={{ color: "#5a6a82" }}
                  >
                    Remember this device
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm hover:opacity-75 transition-opacity"
                  style={{ color: "#f59e0b" }}
                  onClick={() => toast.info("Contact your administrator to reset password")}
                >
                  Forgot password?
                </button>
              </div>

              <div
                className="flex items-center justify-between gap-4 rounded-md px-3 py-3"
                style={{ border: "1px solid #1e2d44", backgroundColor: "#111b2d" }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">Dataspace v2 POC</p>
                  <p className="text-xs" style={{ color: "#5a6a82" }}>
                    Use sequence-based role menus after login
                  </p>
                </div>
                <Switch
                  checked={useDataspaceV2}
                  onCheckedChange={setUseDataspaceV2}
                  disabled={loginMutation.isPending}
                  aria-label="Enable Dataspace v2 POC"
                />
              </div>

              {/* Error alert */}
              {loginMutation.isError && (
                <Alert
                  className="border"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.08)",
                    borderColor: "rgba(239,68,68,0.25)",
                  }}
                >
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-400 text-sm">
                    {(loginMutation.error as any)?.response?.data?.detail ||
                      "Invalid credentials. Please try again."}
                  </AlertDescription>
                </Alert>
              )}

              {/* Sign In button */}
              <Button
                type="submit"
                className="w-full h-12 font-bold text-base text-black hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#f59e0b" }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Trust badges */}
            <div className="flex items-center gap-2 pt-1">
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
