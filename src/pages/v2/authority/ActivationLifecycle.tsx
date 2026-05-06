// src/pages/v2/authority/ActivationLifecycle.tsx
// Phase 1 — Activation lifecycle for newly registered participants.
// Backend endpoints (activation_code, send-email, confirm-email, set-password,
// activation_status) are not yet available — UI is wired with stubs.

import { useMemo, useState } from "react";
import { Mail, KeyRound, ShieldCheck, RefreshCcw, Send } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParticipants } from "@/api/hooks/useParticipants";
import { BackendPendingBadge } from "@/components/dev/BackendPendingBadge";
import { toast } from "sonner";

type ActivationStatus = "INVITED" | "PENDING" | "ACTIVATED" | "SUSPENDED";

interface ActivationRecord {
  participant_id: string;
  organization_name: string;
  activation_code: string;
  email: string;
  status: ActivationStatus;
  invited_at: string;
  activated_at: string | null;
}

const STATUS_COLORS: Record<ActivationStatus, string> = {
  INVITED: "border-amber-500/40 text-amber-500",
  PENDING: "border-blue-500/40 text-blue-500",
  ACTIVATED: "border-emerald-500/40 text-emerald-500",
  SUSPENDED: "border-red-500/40 text-red-500",
};

const generateCode = () =>
  Array.from({ length: 4 })
    .map(() => Math.random().toString(36).slice(2, 6).toUpperCase())
    .join("-");

const STORAGE_KEY = "v2-activation-records";

const loadRecords = (): ActivationRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActivationRecord[]) : [];
  } catch {
    return [];
  }
};

const ActivationLifecycle = () => {
  const { data: participantsData, isLoading } = useParticipants({ limit: 100 });
  const participants = participantsData?.data ?? [];
  const [records, setRecords] = useState<ActivationRecord[]>(loadRecords);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [emailOverride, setEmailOverride] = useState("");

  const persist = (next: ActivationRecord[]) => {
    setRecords(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const counts = useMemo(() => {
    const c: Record<ActivationStatus, number> = { INVITED: 0, PENDING: 0, ACTIVATED: 0, SUSPENDED: 0 };
    records.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [records]);

  const eligibleParticipants = participants.filter(
    (p) => !records.some((r) => r.participant_id === p.id)
  );

  const handleInvite = () => {
    const participant = participants.find((p) => p.id === selectedParticipantId);
    if (!participant) {
      toast.error("Pick a participant first");
      return;
    }
    const next: ActivationRecord = {
      participant_id: participant.id,
      organization_name: participant.organization_name,
      activation_code: generateCode(),
      email: emailOverride || participant.contact_person?.email || "",
      status: "INVITED",
      invited_at: new Date().toISOString(),
      activated_at: null,
    };
    persist([next, ...records]);
    toast.success("Activation invite drafted (stored locally)");
    toast.info("Backend belum tersedia — invite tidak benar-benar terkirim", { duration: 5000 });
    setInviteDialog(false);
    setSelectedParticipantId("");
    setEmailOverride("");
  };

  const handleResend = (record: ActivationRecord) => {
    toast.info("Resend email stub — backend belum tersedia");
    persist(records.map((r) => r.participant_id === record.participant_id ? { ...r, status: "INVITED", invited_at: new Date().toISOString() } : r));
  };

  const handleAdvanceStatus = (record: ActivationRecord, next: ActivationStatus) => {
    persist(records.map((r) => r.participant_id === record.participant_id ? {
      ...r,
      status: next,
      activated_at: next === "ACTIVATED" ? new Date().toISOString() : r.activated_at,
    } : r));
    toast.success(`Status moved to ${next}`);
  };

  const handleDelete = (record: ActivationRecord) => {
    persist(records.filter((r) => r.participant_id !== record.participant_id));
    toast.success("Activation record removed");
  };

  return (
    <V2PageShell title="Activation Lifecycle" subtitle="Manage invite → confirm-email → set-password lifecycle for newly registered participants." status="Preview only">
      <BackendPendingBadge variant="block" message="Endpoint /participants/{id}/activation-code, /auth/confirm-email, /auth/set-password belum tersedia di backend. Halaman ini menyimpan state secara lokal (localStorage) untuk preview UI dan demo. Begitu backend ready, ganti ke API call." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Invited" value={counts.INVITED} subtitle="Awaiting confirmation" icon={Mail} trend="neutral" />
        <MetricCard title="Pending" value={counts.PENDING} subtitle="Email confirmed, password not set" icon={KeyRound} trend="neutral" />
        <MetricCard title="Activated" value={counts.ACTIVATED} subtitle="Ready to login" icon={ShieldCheck} trend="up" />
        <MetricCard title="Suspended" value={counts.SUSPENDED} subtitle="Access revoked" icon={ShieldCheck} trend="down" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Activation Records</CardTitle>
            <CardDescription>Each row tracks the invite-to-active state of a participant onboarding email.</CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setInviteDialog(true)} disabled={eligibleParticipants.length === 0}>
            <Send className="h-4 w-4" />
            Invite Participant
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Organization", "Email", "Activation Code", "Status", "Invited", "Actions"]} isLoading={isLoading}>
            {records.length > 0 ? records.map((r) => (
              <tr key={r.participant_id} className="hover:bg-muted/20">
                <td className="px-4 py-3 text-sm font-medium">{r.organization_name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.email || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.activation_code}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[r.status]}`}>{r.status}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.invited_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => handleResend(r)}>
                      <RefreshCcw className="h-3 w-3" />Resend
                    </Button>
                    {r.status !== "ACTIVATED" && (
                      <Select value="" onValueChange={(v) => handleAdvanceStatus(r, v as ActivationStatus)}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Advance" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">→ PENDING</SelectItem>
                          <SelectItem value="ACTIVATED">→ ACTIVATED</SelectItem>
                          <SelectItem value="SUSPENDED">→ SUSPENDED</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="sm" variant="outline" className="h-7 border-destructive/40 text-destructive" onClick={() => handleDelete(r)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No activation invites yet. Click "Invite Participant" to send the first one.</td></tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Participant</DialogTitle>
            <DialogDescription>Pick a registered participant and (optionally) override the contact email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Participant</Label>
              <Select value={selectedParticipantId} onValueChange={setSelectedParticipantId}>
                <SelectTrigger><SelectValue placeholder="Select participant" /></SelectTrigger>
                <SelectContent>
                  {eligibleParticipants.map((p) => (<SelectItem key={p.id} value={p.id}>{p.organization_name} ({p.organization_type})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Override Email (optional)</Label>
              <Input value={emailOverride} onChange={(e) => setEmailOverride(e.target.value)} placeholder="If empty, uses contact_person.email" />
            </div>
            <BackendPendingBadge variant="block" message="Email tidak benar-benar dikirim. Activation code di-generate client-side untuk preview." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!selectedParticipantId}>Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </V2PageShell>
  );
};

export default ActivationLifecycle;
