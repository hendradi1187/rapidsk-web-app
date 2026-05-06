// src/pages/v2/authority/ActivationEmailPreview.tsx
import { Mail, AlertTriangle, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { V2PageShell, StatusBadge } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useParticipants } from "@/api/hooks/useParticipants";
import { toast } from "sonner";

const ActivationEmailPreview = () => {
  const { data: participantsData } = useParticipants({ limit: 10 });
  const participants = participantsData?.data ?? [];
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const latestParticipant = participants[0];
  const activationCode = "RDSK-V2-SKK-0426";

  const copyCode = () => {
    navigator.clipboard.writeText(activationCode);
    setCopied(true);
    toast.success("Invitation reference copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <V2PageShell
      title="Invitation Email Preview"
      subtitle="Preview only — backend supports confirmation semantics, not the full password activation flow from the target sequence diagram."
      status="Preview only"
    >
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle>Full activation is not live</AlertTitle>
        <AlertDescription>
          The current backend exposes <code className="rounded bg-muted px-1 text-xs">POST /api/v1/identity-provider/users/confirm-email</code>,
          but it does not expose the full activation-code validation, password setup, participant-status transition, and auto-login sequence from the target architecture.
          This page remains a preview for invitation and confirmation guidance only.
        </AlertDescription>
      </Alert>

      <Card className="overflow-hidden border-border/50">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <Mail className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">Invitation Email</CardTitle>
                <CardDescription>Template preview for participant invitation and confirmation guidance</CardDescription>
              </div>
            </div>
            <StatusBadge status="Preview only" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 rounded-xl border border-border/40 bg-muted/20 p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">To</p>
                <p className="mt-1 font-medium">{latestParticipant?.contact_person?.email || "admin.consumer@skkmigas.go.id"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">From</p>
                <p className="mt-1 font-medium">noreply@gx-space.id</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subject</p>
              <p className="mt-1 font-medium">Your GX-Space Invitation and Confirmation Steps</p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border/40 bg-card p-6">
            <p className="text-sm">
              Dear <span className="font-medium">{latestParticipant?.contact_person?.name || "Admin Consumer"}</span>,
            </p>
            <p className="text-sm text-muted-foreground">
              You have been provisioned as an Admin Consumer for{" "}
              <span className="font-medium text-foreground">{latestParticipant?.organization_name || "SKK Migas"}</span>{" "}
              on the GX-Space Data Exchange Platform.
            </p>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Invitation Reference</p>
              <div className="mt-2 flex items-center justify-center gap-3">
                <code className="text-2xl font-bold tracking-widest text-primary">{activationCode}</code>
                <Button variant="ghost" size="sm" onClick={copyCode} className="h-8 w-8 p-0">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this as preview reference material only. The current live backend does not yet complete the full sequence-diagram flow for activation code validation, password setup, and status activation from this invitation.
            </p>
            <Separator />
            <p className="text-xs text-muted-foreground">
              If you did not expect this email, please disregard it. This is an automated preview from GX-Space.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/20 bg-primary/5">
        <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-violet-500" />
        <CardContent className="flex items-center justify-between py-5">
          <div>
            <h3 className="text-sm font-semibold">Want to inspect the preview flow?</h3>
            <p className="text-xs text-muted-foreground">
              Open the preview page to review the invitation-confirmation experience currently exposed in the frontend.
            </p>
          </div>
          <Button onClick={() => navigate("/activate")} className="flex-shrink-0 gap-2">
            <ExternalLink className="h-4 w-4" />
            Open Preview
          </Button>
        </CardContent>
      </Card>
    </V2PageShell>
  );
};

export default ActivationEmailPreview;
