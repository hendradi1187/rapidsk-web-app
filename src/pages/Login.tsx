import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLogin } from "@/api/hooks/useUsers";
import { Loader2, Eye, EyeOff, AlertCircle, Key, Lock, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();

  const from = (location.state as any)?.from?.pathname || "/";

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
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
      await loginMutation.mutateAsync({
        username: formData.username,
        password: formData.password,
      });

      if (rememberMe) {
        localStorage.setItem("remember_username", formData.username);
      } else {
        localStorage.removeItem("remember_username");
      }

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
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
    <div className="min-h-screen flex" style={{ backgroundColor: "#0d1117" }}>

      {/* ── Left Panel: Form ── */}
      <div
        className="w-full lg:w-[460px] flex-shrink-0 flex flex-col justify-between p-8 lg:p-10"
        style={{ backgroundColor: "#0d1523" }}
      >
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-6">

          {/* Logo — identik dengan Sidebar */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber to-amber-glow flex items-center justify-center amber-glow">
              <span className="text-xl font-bold text-sidebar">R</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">
                rapi<span className="text-gradient-amber">DSK</span>
              </h1>
              <p className="text-xs" style={{ color: "#6b7a99" }}>Dataspace Connector</p>
            </div>
          </div>

          {/* SSO Button */}
          <Button
            type="button"
            className="w-full h-11 font-medium"
            style={{
              backgroundColor: "#1a2236",
              borderColor: "#2a3a54",
              color: "#c9d1e0",
            }}
            variant="outline"
            onClick={() => toast.info("SSO integration coming soon")}
            disabled={loginMutation.isPending}
          >
            <Key className="w-4 h-4 mr-2" />
            Sign in with Enterprise SSO (Keycloak)
          </Button>

          {/* Divider: OR CREDENTIALS */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: "#2a3a54" }} />
            <span
              className="text-xs uppercase tracking-widest font-medium"
              style={{ color: "#6b7a99" }}
            >
              OR CREDENTIALS
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "#2a3a54" }} />
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email / Username */}
            <div className="space-y-1.5">
              <label
                className="text-xs uppercase tracking-wider font-semibold"
                style={{ color: "#6b7a99" }}
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
                className="h-11"
                style={{
                  backgroundColor: "#1a2236",
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
            <div className="space-y-1.5">
              <label
                className="text-xs uppercase tracking-wider font-semibold"
                style={{ color: "#6b7a99" }}
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
                  className="h-11 pr-10"
                  style={{
                    backgroundColor: "#1a2236",
                    borderColor: errors.password ? "#ef4444" : "#2a3a54",
                    color: "#e2e8f0",
                  }}
                  disabled={loginMutation.isPending}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#4a5568" }}
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
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={loginMutation.isPending}
                  className="border-[#2a3a54] data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-400"
                />
                <label
                  htmlFor="remember"
                  className="text-sm cursor-pointer"
                  style={{ color: "#6b7a99" }}
                >
                  Remember this device
                </label>
              </div>
              <button
                type="button"
                className="text-sm hover:opacity-80 transition-opacity"
                style={{ color: "#f59e0b" }}
                onClick={() => toast.info("Contact your administrator to reset password")}
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {loginMutation.isError && (
              <Alert
                className="border"
                style={{
                  backgroundColor: "rgba(239,68,68,0.1)",
                  borderColor: "rgba(239,68,68,0.3)",
                }}
              >
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">
                  {(loginMutation.error as any)?.response?.data?.detail ||
                    "Invalid credentials. Please try again."}
                </AlertDescription>
              </Alert>
            )}

            {/* Sign In Button */}
            <Button
              type="submit"
              className="w-full h-12 font-bold text-base text-black"
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

          {/* Bottom Trust Badges */}
          <div className="flex items-center gap-2 pt-2">
            {[
              { icon: Lock, label: "SECURE ACCESS" },
              { icon: FileText, label: "AUDIT READY" },
              { icon: ShieldCheck, label: "COMPLIANCE READY" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium flex-1 justify-center"
                style={{
                  border: "1px solid #2a3a54",
                  color: "#6b7a99",
                  backgroundColor: "transparent",
                }}
              >
                <Icon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Marketing ── */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 xl:px-24 relative">
        <div className="max-w-xl">
          {/* Hero Headline */}
          <h1 className="font-bold text-white leading-tight mb-6" style={{ fontSize: "clamp(2.5rem, 4vw, 3.5rem)" }}>
            Enterprise Data<br />
            <span style={{ color: "#f59e0b" }}>Governance</span><br />
            You Can Trust.
          </h1>

          {/* Description */}
          <p className="text-lg leading-relaxed mb-10" style={{ color: "#6b7a99" }}>
            RapiDSK provides end-to-end data governance, access control,
            and compliance management for organizations that demand the
            highest standards of security and regulatory readiness.
          </p>

          {/* Stats */}
          <div className="flex items-start gap-12">
            {[
              { value: "99.99%", label: "Uptime SLA" },
              { value: "SOC 2", label: "Certified" },
              { value: "GDPR", label: "Compliant" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-bold" style={{ color: "#f59e0b" }}>{value}</div>
                <div className="text-sm mt-1" style={{ color: "#6b7a99" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs" style={{ color: "#3a4a64" }}>
          © 2026 RapiDSK Enterprise Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
