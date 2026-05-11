// Public route /confirm-email?token=XXX
// Backend now requires POST /api/v1/identity-provider/users/confirm-email
// with { token, password }.

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersService } from "@/api/services/identity-provider";
import { toast } from "sonner";

type State = "idle" | "loading" | "success" | "error";

const getErrorMessage = (error: any) => {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.errors)) {
    return data.errors.map((item: any) => `${item.loc?.join(".") || item.field || "field"}: ${item.msg || item.message || "Invalid value"}`).join(" | ");
  }
  return `Confirmation failed (HTTP ${error?.response?.status || "?"})`;
};

const ConfirmEmail = () => {
  const [params] = useSearchParams();
  const tokenFromUrl = (params.get("token") || "").trim();
  const maskedToken = useMemo(() => {
    if (!tokenFromUrl) return "";
    const start = tokenFromUrl.slice(0, 4);
    const end = tokenFromUrl.slice(-4);
    return `${start}••••${end}`;
  }, [tokenFromUrl]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailForResend, setEmailForResend] = useState("");
  const [state, setState] = useState<State>("idle");
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async () => {
    if (!tokenFromUrl) {
      toast.error("Activation token required");
      return;
    }
    if (!password.trim() || password.length < 8) {
      toast.error("Password min 8 chars");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password confirmation does not match");
      return;
    }

    setState("loading");
    setErrorMessage("");
    try {
      await usersService.confirmEmail({ token: tokenFromUrl, password });
      setState("success");
      toast.success("Email confirmed and password set", {
        description: "You can now login with the password you just created.",
      });
    } catch (error: any) {
      const msg = getErrorMessage(error);
      setState("error");
      setErrorMessage(msg);
      toast.error("Email confirmation failed", { description: msg, duration: 8000 });
    }
  };

  const resend = async () => {
    if (!emailForResend.trim()) {
      toast.error("Email is required to resend confirmation");
      return;
    }
    setResending(true);
    try {
      await usersService.resendEmailConfirmation({ email: emailForResend.trim() });
      toast.success("Confirmation email resent", {
        description: "Check the inbox for a fresh token and activation link.",
      });
    } catch (error: any) {
      toast.error("Failed to resend confirmation email", {
        description: getErrorMessage(error),
        duration: 8000,
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {state === "loading" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {state === "success" && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
            {state === "error" && <XCircle className="h-6 w-6 text-red-500" />}
            {state === "idle" && <ShieldCheck className="h-6 w-6 text-primary" />}
          </div>
          <CardTitle>Email Confirmation</CardTitle>
          <CardDescription>
            {state === "idle" && "Set your new password to finish email activation."}
            {state === "loading" && "Confirming your email and saving the password..."}
            {state === "success" && "Your email is confirmed and your password is ready."}
            {state === "error" && "Could not confirm your email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state !== "success" && (
            <>
              <div className="grid gap-2">
                <Label>Activation Token Source</Label>
                <Input
                  value={tokenFromUrl ? `Token loaded from URL: ${maskedToken}` : "Token missing in URL query"}
                  readOnly
                  className="text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat the password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {state === "error" && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500">
              {errorMessage}
            </div>
          )}

          {state === "success" ? (
            <Button asChild className="w-full">
              <Link to="/login">Continue to login</Link>
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={submit} disabled={state === "loading" || !tokenFromUrl || !password || !confirmPassword}>
                {state === "loading" ? "Confirming..." : "Confirm Email & Save Password"}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-xs font-medium">Did not receive a usable token?</p>
            <div className="mt-3 grid gap-2">
              <Label htmlFor="resendEmail">Resend confirmation email</Label>
              <div className="flex gap-2">
                <Input
                  id="resendEmail"
                  type="email"
                  value={emailForResend}
                  onChange={(event) => setEmailForResend(event.target.value)}
                  placeholder="user@example.com"
                />
                <Button type="button" variant="outline" onClick={resend} disabled={resending || !emailForResend.trim()} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                  Resend
                </Button>
              </div>
            </div>
          </div>

          {!tokenFromUrl && (
            <p className="pt-1 text-center text-xs text-red-500">
              Activation token tidak ditemukan di URL. Buka link aktivasi dari email, atau minta resend email.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;
