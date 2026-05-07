// src/pages/ConfirmEmail.tsx
// Public route /confirm-email?token=XXX — handles activation link from email.
// Backend: POST /api/v1/identity-provider/users/confirm-email { token: string }

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/api/client";
import { toast } from "sonner";

type State = "idle" | "loading" | "success" | "error";

const ConfirmEmail = () => {
  const [params] = useSearchParams();
  const initialToken = params.get("token") || "";
  const [token, setToken] = useState(initialToken);
  const [state, setState] = useState<State>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async (t: string) => {
    if (!t) {
      toast.error("Activation token required");
      return;
    }
    setState("loading");
    setErrorMessage("");
    try {
      await apiClient.post("/api/v1/identity-provider/users/confirm-email", { token: t });
      setState("success");
      toast.success("Email confirmed — you can now login");
    } catch (err: any) {
      setState("error");
      const msg = err?.response?.data?.detail
        || err?.response?.data?.errors?.detail
        || err?.response?.data?.message
        || `Confirmation failed (HTTP ${err?.response?.status || "?"})`;
      setErrorMessage(msg);
      toast.error("Email confirmation failed", { description: msg });
    }
  };

  // Auto-submit if token already present in URL
  useEffect(() => {
    if (initialToken && state === "idle") {
      submit(initialToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

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
            {state === "idle" && "Paste the activation token from your invitation email below."}
            {state === "loading" && "Confirming your email..."}
            {state === "success" && "Your email has been confirmed."}
            {state === "error" && "Could not confirm your email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state !== "success" && (
            <div className="grid gap-2">
              <Label htmlFor="token">Activation Token</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from invite email"
                autoFocus={!initialToken}
              />
            </div>
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
              <Button
                className="w-full"
                onClick={() => submit(token)}
                disabled={state === "loading" || !token}
              >
                {state === "loading" ? "Confirming..." : "Confirm Email"}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          )}

          <p className="pt-3 text-center text-xs text-muted-foreground">
            Tidak punya token? Tanya admin yang mendaftarkan akun Anda — token dikirim via email saat akun dibuat.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;
