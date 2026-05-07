// src/pages/v2/authority/ActivationEmailPreview.tsx
// Tool to preview & debug the activation email flow.
// 1. Pick a real user (pending or confirmed)
// 2. Generate the activation link (what email SHOULD contain)
// 3. Paste a token + POST /confirm-email to test
// 4. Quick "Try Login" handover

import { useMemo, useState } from "react";
import { Mail, Copy, ExternalLink, CheckCircle2, AlertTriangle, KeyRound, LogIn, Send } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/api/hooks/useUsers";
import { apiClient } from "@/api/client";
import { toast } from "sonner";

const ActivationEmailPreview = () => {
  const navigate = useNavigate();
  const { data: usersData, isLoading, refetch } = useUsers({ limit: 100 });
  const users = usersData?.data ?? [];

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [token, setToken] = useState("");
  const [confirming, setConfirming] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  const frontendBase = window.location.origin;
  const previewLink = token
    ? `${frontendBase}/confirm-email?token=${encodeURIComponent(token)}`
    : `${frontendBase}/confirm-email?token=PASTE_TOKEN_HERE`;

  const pendingUsers = users.filter((u) => !u.is_email_confirmed);
  const confirmedUsers = users.filter((u) => u.is_email_confirmed);

  const copyLink = () => {
    if (!token) {
      toast.error("Paste token dulu — link tanpa token gak guna");
      return;
    }
    navigator.clipboard.writeText(previewLink);
    toast.success("Activation link copied to clipboard");
  };

  const openInNewTab = () => {
    if (!token) {
      toast.error("Paste token dulu");
      return;
    }
    window.open(previewLink, "_blank");
  };

  const submitConfirm = async () => {
    if (!token.trim()) {
      toast.error("Token wajib diisi");
      return;
    }
    setConfirming(true);
    try {
      await apiClient.post(`/api/v1/identity-provider/users/confirm-email`, { token: token.trim() });
      toast.success("Email confirmed via API!", { description: "User sekarang bisa login" });
      refetch();
      setToken("");
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      const detail = body?.detail || body?.error || (Array.isArray(body?.errors) && body.errors[0]?.message) || err?.message;
      toast.error(`Confirm failed (HTTP ${status})`, {
        description:
          status === 400 ? `Token invalid: ${detail || "format salah"}`
          : status === 404 ? "Token tidak ditemukan / sudah used / expired"
          : status === 422 ? `Validation: ${detail || "schema salah"}`
          : status === 500 ? `Backend crash: ${detail || "cek log backend"}`
          : `${detail || "Unknown"}`,
        duration: 8000,
      });
    } finally {
      setConfirming(false);
    }
  };

  const tryLogin = (username: string) => {
    localStorage.setItem("remember_username", username);
    toast.info(`Username "${username}" pre-filled di login form`);
    navigate("/login");
  };

  const formattedEmailBody = useMemo(() => {
    const link = previewLink;
    const username = selectedUser?.username || "user";
    return `Subject: GX-Space — Confirm Your Email
From: noreply@gx-space.id
To: ${selectedUser?.email || "user@example.com"}

Hi ${username},

You've been registered as an admin on GX-Space Data Exchange Platform.

To activate your account, click the link below within 24 hours:

${link}

If the link doesn't work, copy this token and paste it at:
${frontendBase}/confirm-email

Token: ${token || "<TOKEN_FROM_BACKEND>"}

Need help? Contact your platform administrator.

— GX-Space Team`;
  }, [previewLink, selectedUser, token, frontendBase]);

  return (
    <V2PageShell title="Activation Email Helper" subtitle="Preview activation flow + manual confirm + login handover. Pakai ini untuk debug user yang stuck di Pending." status="Live API">
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <div className="space-y-2">
            <p className="font-medium">3 alasan email confirm gagal:</p>
            <ol className="ml-4 list-decimal text-xs space-y-1 text-muted-foreground">
              <li><strong>Email tidak masuk</strong> — backend `FRONTEND_BASE_URL` env salah → link di email arahnya ke domain wrong / SMTP config error → email gak ke-deliver</li>
              <li><strong>Token expired</strong> — kebanyakan backend set TTL 1-24 jam. Lewat itu, POST /confirm-email return 404 atau 400</li>
              <li><strong>Token sudah used</strong> — sekali pakai. Confirm lagi → reject</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Login gagal walau email confirmed → cek password (case-sensitive) atau backend bug 500 di /auth/login.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Users" value={isLoading ? "..." : users.length} subtitle="Identity provider" icon={Mail} trend="neutral" />
        <MetricCard title="Pending Confirm" value={pendingUsers.length} subtitle="Email belum confirmed" icon={AlertTriangle} trend={pendingUsers.length > 0 ? "down" : "up"} />
        <MetricCard title="Confirmed" value={confirmedUsers.length} subtitle="Bisa login" icon={CheckCircle2} trend="up" />
      </div>

      {/* User picker */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">1. Pick a User</CardTitle>
          <CardDescription>Pilih akun yang mau di-debug. Email + role-nya akan muncul di template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedUser?.id || ""} onValueChange={setSelectedUserId}>
            <SelectTrigger><SelectValue placeholder="Pilih user" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.username || u.email} — {u.email}
                  {!u.is_email_confirmed && " 🟡 Pending"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUser && (
            <div className="grid gap-2 rounded-lg border border-border/50 p-3 text-xs sm:grid-cols-3">
              <div><span className="text-muted-foreground">Username:</span> <span className="font-mono">{selectedUser.username}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-mono">{selectedUser.email}</span></div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                {selectedUser.is_email_confirmed ? (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[10px]">Confirmed</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-[10px]">Pending</Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token + link */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">2. Enter Activation Token</CardTitle>
          <CardDescription>
            Dapatin dari: email user, backend log saat create user, atau DB column <code className="rounded bg-muted px-1 text-xs">activation_token</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Activation Token</Label>
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="paste token disini" />
          </div>
          <div className="grid gap-2">
            <Label>Generated Activation Link (apa yg seharusnya dikirim ke email user)</Label>
            <div className="flex gap-2">
              <Input value={previewLink} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={openInNewTab}><ExternalLink className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test confirm */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">3. Test Confirm</CardTitle>
          <CardDescription>POST <code className="rounded bg-muted px-1 text-xs">/api/v1/identity-provider/users/confirm-email</code></CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={submitConfirm} disabled={confirming || !token.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            {confirming ? "Confirming..." : "Submit Token to API"}
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link to={token ? `/confirm-email?token=${encodeURIComponent(token)}` : "/confirm-email"} target="_blank">
              <KeyRound className="h-4 w-4" />Open /confirm-email page
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Try login */}
      {selectedUser && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">4. Try Login as This User</CardTitle>
            <CardDescription>Lompat ke /login dengan username pre-filled. Password tetap harus diketik manual.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => tryLogin(selectedUser.username || selectedUser.email)} className="gap-2">
              <LogIn className="h-4 w-4" />Login as {selectedUser.username || selectedUser.email}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Email body preview */}
      <Card className="overflow-hidden border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Email Template (apa yg backend SHARUSNYA kirim)</CardTitle>
          <CardDescription>Bandingkan dengan email asli yg user terima. Kalau beda → backend email template bug.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border/40 bg-muted/20 p-4 text-xs whitespace-pre-wrap">
{formattedEmailBody}
          </pre>
        </CardContent>
      </Card>

      {/* Pending users quick action */}
      {pendingUsers.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Pending Users (Quick List)</CardTitle>
            <CardDescription>{pendingUsers.length} user belum konfirmasi email — klik untuk pilih & debug.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Username", "Email", "Created", "Action"]}>
              {pendingUsers.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setSelectedUserId(u.id)}>Pick & Debug</Button>
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
