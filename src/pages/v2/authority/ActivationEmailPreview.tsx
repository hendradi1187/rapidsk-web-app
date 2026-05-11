import { useMemo, useState } from "react";
import { Mail, Copy, ExternalLink, CheckCircle2, AlertTriangle, KeyRound, LogIn, Send, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/api/hooks/useUsers";
import { usersService } from "@/api/services/identity-provider";
import { toast } from "sonner";

const getErrorMessage = (error: any) => {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.errors)) {
    return data.errors.map((item: any) => `${item.loc?.join(".") || item.field || "field"}: ${item.msg || item.message || "Invalid value"}`).join(" | ");
  }
  return `HTTP ${error?.response?.status || "?"}`;
};

const ActivationEmailPreview = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenFromUrl = (params.get("token") || "").trim();
  const { data: usersData, isLoading, refetch } = useUsers({ limit: 100 });
  const users = usersData?.data ?? [];

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resending, setResending] = useState(false);

  const selectedUser = users.find((user) => user.id === selectedUserId) || users[0];

  const frontendBase = window.location.origin;
  const previewLink = tokenFromUrl
    ? `${frontendBase}/confirm-email?token=${encodeURIComponent(tokenFromUrl)}`
    : `${frontendBase}/confirm-email`;
  const maskedToken = tokenFromUrl ? `${tokenFromUrl.slice(0, 4)}••••${tokenFromUrl.slice(-4)}` : "";

  const pendingUsers = users.filter((user) => !(user.is_verified ?? user.is_email_confirmed));
  const confirmedUsers = users.filter((user) => user.is_verified ?? user.is_email_confirmed);

  const copyLink = () => {
    if (!tokenFromUrl) {
      toast.error("Token URL tidak ada");
      return;
    }
    navigator.clipboard.writeText(previewLink);
    toast.success("Activation link copied");
  };

  const openInNewTab = () => {
    if (!tokenFromUrl) {
      toast.error("Token URL tidak ada");
      return;
    }
    window.open(previewLink, "_blank");
  };

  const submitConfirm = async () => {
    if (!tokenFromUrl) {
      toast.error("Token URL wajib tersedia");
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
    setConfirming(true);
    try {
      await usersService.confirmEmail({ token: tokenFromUrl, password });
      toast.success("Email confirmed via API", {
        description: "Password juga sudah diset pada call ini.",
      });
      await refetch();
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Confirm failed", {
        description: getErrorMessage(error),
        duration: 8000,
      });
    } finally {
      setConfirming(false);
    }
  };

  const resendConfirmation = async () => {
    if (!selectedUser?.email) {
      toast.error("Pick user with email first");
      return;
    }
    setResending(true);
    try {
      await usersService.resendEmailConfirmation({ email: selectedUser.email });
      toast.success("Confirmation email resent", {
        description: `Fresh email confirmation sent to ${selectedUser.email}.`,
      });
    } catch (error: any) {
      toast.error("Resend failed", {
        description: getErrorMessage(error),
        duration: 8000,
      });
    } finally {
      setResending(false);
    }
  };

  const tryLogin = (username: string) => {
    localStorage.setItem("remember_username", username);
    toast.info(`Username "${username}" pre-filled di login form`);
    navigate("/login");
  };

  const formattedEmailBody = useMemo(() => {
    const username = selectedUser?.username || "user";
    return `Subject: GX-Space - Confirm Your Email
From: noreply@gx-space.id
To: ${selectedUser?.email || "user@example.com"}

Hi ${username},

You've been registered as an admin on GX-Space Data Exchange Platform.

To activate your account, click the link below:

${previewLink}

This confirmation now requires the user to set a password during the confirm-email flow.

Token: ${tokenFromUrl ? maskedToken : "<TOKEN_FROM_BACKEND>"}
`;
  }, [maskedToken, previewLink, selectedUser, tokenFromUrl]);

  return (
    <V2PageShell title="Activation Email Helper" subtitle="Confirm-email sekarang URL token only + password setup. Halaman ini dipakai untuk resend dan validasi aktivasi." status="Live API">
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <div className="space-y-2">
            <p className="font-medium">Contract backend yang berlaku sekarang:</p>
            <ol className="ml-4 list-decimal text-xs space-y-1 text-muted-foreground">
              <li><code className="rounded bg-muted px-1">POST /users/confirm-email</code> wajib body <code className="rounded bg-muted px-1">{`{ token, password }`}</code>, token diambil dari URL activation link.</li>
              <li><code className="rounded bg-muted px-1">POST /users/resend-email-confirmation</code> body <code className="rounded bg-muted px-1">{`{ email }`}</code></li>
              <li>User list validnya sekarang pakai <code className="rounded bg-muted px-1">is_verified</code> dan <code className="rounded bg-muted px-1">is_active</code></li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Users" value={isLoading ? "..." : users.length} subtitle="Identity provider" icon={Mail} trend="neutral" />
        <MetricCard title="Pending Confirm" value={pendingUsers.length} subtitle="Email belum confirmed" icon={AlertTriangle} trend={pendingUsers.length > 0 ? "down" : "up"} />
        <MetricCard title="Confirmed" value={confirmedUsers.length} subtitle="Bisa login" icon={CheckCircle2} trend="up" />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">1. Pick a User</CardTitle>
          <CardDescription>Pilih akun yang mau di-debug untuk resend / confirm / try login.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedUser?.id || ""} onValueChange={setSelectedUserId}>
            <SelectTrigger><SelectValue placeholder="Pilih user" /></SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.username || user.email} - {user.email}
                  {!(user.is_verified ?? user.is_email_confirmed) && " Pending"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUser && (
            <div className="grid gap-2 rounded-lg border border-border/50 p-3 text-xs sm:grid-cols-4">
              <div><span className="text-muted-foreground">Username:</span> <span className="font-mono">{selectedUser.username}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-mono">{selectedUser.email}</span></div>
              <div><span className="text-muted-foreground">Created:</span> <span className="font-mono">{new Date(selectedUser.created_at).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Updated:</span> <span className="font-mono">{new Date(selectedUser.updated_at).toLocaleString()}</span></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">2. Resend Confirmation Email</CardTitle>
          <CardDescription>POST <code className="rounded bg-muted px-1 text-xs">/api/v1/identity-provider/users/resend-email-confirmation</code></CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={resendConfirmation} disabled={resending || !selectedUser?.email} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
            {resending ? "Resending..." : `Resend to ${selectedUser?.email || "selected user"}`}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">3. Set Password (Token from URL)</CardTitle>
          <CardDescription>
            Token tidak diinput manual di halaman ini. Token harus datang dari query URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Activation Token Source</Label>
            <Input value={tokenFromUrl ? `Token loaded from URL: ${maskedToken}` : "Token missing in URL query"} readOnly className="text-xs" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 8 chars" />
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
              <Label>Confirm Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Generated Activation Link</Label>
            <div className="flex gap-2">
              <Input value={tokenFromUrl ? `${frontendBase}/confirm-email?token=••••••••` : `${frontendBase}/confirm-email`} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={openInNewTab}><ExternalLink className="h-4 w-4" /></Button>
            </div>
          </div>
          {!tokenFromUrl && (
            <p className="text-xs text-red-500">Token URL belum ada. Buka halaman ini lewat activation link email atau gunakan tombol resend dulu.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">4. Test Confirm</CardTitle>
          <CardDescription>POST <code className="rounded bg-muted px-1 text-xs">/api/v1/identity-provider/users/confirm-email</code></CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={submitConfirm} disabled={confirming || !tokenFromUrl || !password || !confirmPassword} className="gap-2">
            <Send className="h-4 w-4" />
            {confirming ? "Confirming..." : "Submit Password Setup"}
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link to={tokenFromUrl ? `/confirm-email?token=${encodeURIComponent(tokenFromUrl)}` : "/confirm-email"} target="_blank">
              <KeyRound className="h-4 w-4" />Open /confirm-email page
            </Link>
          </Button>
        </CardContent>
      </Card>

      {selectedUser && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">5. Try Login as This User</CardTitle>
            <CardDescription>Lompat ke /login dengan username pre-filled. Password tetap diketik manual.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => tryLogin(selectedUser.username || selectedUser.email)} className="gap-2">
              <LogIn className="h-4 w-4" />Login as {selectedUser.username || selectedUser.email}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Email Template Preview</CardTitle>
          <CardDescription>Bandingkan dengan email asli yang dikirim backend.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border/40 bg-muted/20 p-4 text-xs whitespace-pre-wrap">
{formattedEmailBody}
          </pre>
        </CardContent>
      </Card>

      {pendingUsers.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Pending Users</CardTitle>
            <CardDescription>{pendingUsers.length} user belum konfirmasi email.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Username", "Email", "Created", "Updated", "Action"]}>
              {pendingUsers.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{user.username}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(user.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(user.updated_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setSelectedUserId(user.id)}>Pick & Debug</Button>
                  </td>
                </tr>
              ))}
            </DataTable>
          </CardContent>
        </Card>
      )}
    </V2PageShell>
  );
};

export default ActivationEmailPreview;
