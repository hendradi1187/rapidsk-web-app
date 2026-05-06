// src/pages/Activation.tsx
// Preview-only invitation confirmation page.
// This mirrors the intended journey visually, but does not represent a live
// password activation transaction in the current backend.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type ActivationStep = "code" | "password" | "activating" | "success";

const MOCK_VALID_CODE = "RDSK-V2-SKK-0426";

// Password strength checker
const getPasswordStrength = (pw: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 8) score += 25;
  if (pw.length >= 12) score += 10;
  if (/[A-Z]/.test(pw)) score += 20;
  if (/[a-z]/.test(pw)) score += 15;
  if (/[0-9]/.test(pw)) score += 15;
  if (/[^A-Za-z0-9]/.test(pw)) score += 15;

  if (score < 30) return { score, label: "Weak", color: "bg-red-500" };
  if (score < 60) return { score, label: "Fair", color: "bg-amber-500" };
  if (score < 80) return { score, label: "Good", color: "bg-blue-500" };
  return { score: Math.min(score, 100), label: "Strong", color: "bg-emerald-500" };
};

const Activation = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<ActivationStep>("code");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleValidateCode = () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!code.trim()) {
      toast.error("Activation code is required");
      return;
    }

    // Simulate: POST /auth/activation-code → validate
    if (code.toUpperCase() === MOCK_VALID_CODE) {
      toast.success("Activation code validated!");
      setStep("password");
    } else {
      toast.error("Invalid activation code", {
        description: "Please check the code from your invitation email.",
      });
    }
  };

  const handleSetPassword = () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords do not match");
      return;
    }

    // Simulate activation sequence:
    // POST /activation → PATCH /participants/activation/{id} → POST /auth/token
    setStep("activating");

    setTimeout(() => {
      setStep("success");
      toast.success("Account activated successfully!");
    }, 2500);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Invitation Confirmation Preview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            GX-Space Data Exchange Platform
          </p>
        </div>

        {/* Preview Badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Preview Mode — backend does not yet expose the full activation and password setup sequence
          </Badge>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {["code", "password", "activating", "success"].map((s, i) => {
            const stepNames = ["Verify Code", "Set Password", "Activating", "Complete"];
            const currentIdx = ["code", "password", "activating", "success"].indexOf(step);
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;

            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isDone ? "bg-emerald-500/10 text-emerald-500" :
                  isActive ? "bg-primary/10 text-primary" :
                  "bg-muted/50 text-muted-foreground"
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/10 text-[10px]">{i + 1}</span>
                  )}
                  {stepNames[i]}
                </div>
                {i < 3 && <div className={`h-px w-6 ${isDone ? "bg-emerald-500/30" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        {/* Step: Code Verification */}
        {step === "code" && (
          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="h-5 w-5 text-primary" />
                Enter Activation Code
              </CardTitle>
              <CardDescription>
                Enter the invitation reference code and email from the preview invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activation-email">Email Address</Label>
                <Input
                  id="activation-email"
                  type="email"
                  placeholder="admin.consumer@skkmigas.go.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activation-code">Activation Code</Label>
                <Input
                  id="activation-code"
                  placeholder="RDSK-V2-SKK-0426"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-11 font-mono tracking-widest"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  Preview code: <code className="rounded bg-muted px-1.5 py-0.5">{MOCK_VALID_CODE}</code>
                </p>
              </div>
              <Button onClick={handleValidateCode} className="w-full h-11 gap-2">
                Validate Code
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Set Password */}
        {step === "password" && (
          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-primary" />
                Set Your Password
              </CardTitle>
              <CardDescription>
                This remains a frontend-only preview. The live backend does not yet complete password setup and participant activation from this screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-emerald-500/20 bg-emerald-500/5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertTitle className="text-sm">Code Verified</AlertTitle>
                <AlertDescription className="text-xs">
                  Activation code <code className="font-mono">{code}</code> for <strong>{email}</strong> is valid.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Progress value={strength.score} className="h-1.5 flex-1" />
                      <span className={`text-xs font-medium ${
                        strength.score < 30 ? "text-red-500" :
                        strength.score < 60 ? "text-amber-500" :
                        strength.score < 80 ? "text-blue-500" : "text-emerald-500"
                      }`}>{strength.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { test: password.length >= 8, label: "8+ chars" },
                        { test: /[A-Z]/.test(password), label: "Uppercase" },
                        { test: /[a-z]/.test(password), label: "Lowercase" },
                        { test: /[0-9]/.test(password), label: "Number" },
                        { test: /[^A-Za-z0-9]/.test(password), label: "Special" },
                      ].map(({ test, label }) => (
                        <Badge key={label} variant="outline" className={`text-[10px] ${
                          test ? "border-emerald-500/30 text-emerald-500" : "border-border text-muted-foreground"
                        }`}>
                          {test ? <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> : null}
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-xs ${passwordsMatch ? "text-emerald-500" : "text-red-500"}`}>
                    {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </div>

              <Button
                onClick={handleSetPassword}
                className="w-full h-11 gap-2"
                disabled={!passwordsMatch || strength.score < 30}
              >
                Activate Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Activating (Loading) */}
        {step === "activating" && (
          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                <ShieldCheck className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Activating Your Account</h3>
                <p className="text-sm text-muted-foreground">Please wait while we process your activation...</p>
              </div>
              <div className="w-full max-w-xs space-y-3">
                {[
                  { label: "POST /activation", desc: "Sending activation data", done: true },
                  { label: "POST /auth/activation-code", desc: "Validating code", done: true },
                  { label: "PATCH /participants/activation/{id}", desc: "Updating status → ACTIVATED", done: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/20 p-3">
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-primary" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <Badge variant="outline" className={`ml-auto text-[10px] ${item.done ? "border-emerald-500/30 text-emerald-500" : "border-primary/30 text-primary"}`}>
                      {item.done ? "Done" : "Processing"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <Card className="border-border/50 shadow-xl shadow-primary/5 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500" />
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">Account Activated!</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Your account has been successfully activated. A JWT access token has been generated
                  for your session.
                </p>
              </div>
              <div className="w-full max-w-xs space-y-2">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Participant Status</p>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">ACTIVATED</Badge>
                    <span className="text-xs text-muted-foreground">← was PENDING</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">JWT Token</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
                    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("code")} className="gap-2">
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Reset Demo
                </Button>
                <Button onClick={() => navigate("/login")} className="gap-2">
                  Continue to Login
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <Alert className="border-amber-500/20 bg-amber-500/5 max-w-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-xs">Preview Mode</AlertTitle>
                <AlertDescription className="text-[11px]">
                  This activation was simulated locally. No backend requests were made.
                  When backend implements the 3 activation endpoints, this page will connect to live APIs.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Footer: API reference */}
        <div className="rounded-xl border border-border/30 bg-card/50 p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Activation Endpoints (from diagram)</p>
          <div className="space-y-1.5">
            {[
              { method: "POST", path: "/activation", desc: "Submit code + password" },
              { method: "POST", path: "/auth/activation-code", desc: "Validate activation code" },
              { method: "PATCH", path: "/participants/activation/{id}", desc: "PENDING → ACTIVATED" },
              { method: "POST", path: "/auth/token", desc: "Generate JWT access token" },
            ].map((ep) => (
              <div key={ep.path} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className={`font-mono text-[10px] ${
                  ep.method === "POST" ? "border-blue-500/30 text-blue-500" : "border-amber-500/30 text-amber-500"
                }`}>{ep.method}</Badge>
                <code className="text-muted-foreground">{ep.path}</code>
                <span className="ml-auto text-[10px] text-muted-foreground">{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Activation;
