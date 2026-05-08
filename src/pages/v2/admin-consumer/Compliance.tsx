// src/pages/v2/admin-consumer/Compliance.tsx
// Phase 2 — Compliance: full CRUD on compliance controls (frameworks like
// ISO 27001, SKK MIGAS) and per-participant compliance checklists.
// Backend: /api/v1/audit-compliance/{compliance-controls,compliance-checklists}

import { useMemo, useState } from "react";
import { Shield, Plus, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { complianceControlsApi, complianceChecklistsApi } from "@/api/services/audit-compliance";
import type {
  ComplianceControl,
  ComplianceChecklist,
} from "@/api/services/audit-compliance";
import { useParticipants } from "@/api/hooks/useParticipants";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  COMPLIANT: "border-emerald-500/40 text-emerald-500",
  NON_COMPLIANT: "border-red-500/40 text-red-500",
  "NON-COMPLIANT": "border-red-500/40 text-red-500",
  IN_REVIEW: "border-amber-500/40 text-amber-500",
  NOT_APPLICABLE: "border-slate-400/40 text-slate-400",
};

const emptyControlForm = {
  control_id: "",
  framework: "ISO_27001",
  name: "",
  description: "",
  version: "1.0.0",
};

const emptyChecklistForm = {
  participant_id: "",
  control_id: "",
  framework: "ISO_27001",
  control_name: "",
  status: "IN_REVIEW",
  evidence_text: "",
  notes: "",
};

const Compliance = () => {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const canManage = hasPermission("compliance.view") || hasPermission("compliance.manage");

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: controlsData, isLoading: loadingControls } = useQuery({
    queryKey: ["compliance-controls"],
    queryFn: () => complianceControlsApi.list({ limit: 100 }),
  });
  const { data: checklistsData, isLoading: loadingChecklists } = useQuery({
    queryKey: ["compliance-checklists"],
    queryFn: () => complianceChecklistsApi.list({ limit: 100 }),
  });
  const { data: participantsData } = useParticipants({ limit: 100 });

  const controls = controlsData?.data ?? [];
  const checklists = checklistsData?.data ?? [];
  const participants = participantsData?.data ?? [];

  // ── Mutations ───────────────────────────────────────────────────────────
  const invalidateControls = () => qc.invalidateQueries({ queryKey: ["compliance-controls"] });
  const invalidateChecklists = () => qc.invalidateQueries({ queryKey: ["compliance-checklists"] });

  const createControl = useMutation({ mutationFn: complianceControlsApi.create, onSuccess: invalidateControls });
  const updateControl = useMutation({
    mutationFn: ({ id, data }: any) => complianceControlsApi.update(id, data),
    onSuccess: invalidateControls,
  });
  const deleteControl = useMutation({ mutationFn: (id: string) => complianceControlsApi.delete(id), onSuccess: invalidateControls });

  const createChecklist = useMutation({ mutationFn: complianceChecklistsApi.create, onSuccess: invalidateChecklists });
  const updateChecklist = useMutation({
    mutationFn: ({ id, data }: any) => complianceChecklistsApi.update(id, data),
    onSuccess: invalidateChecklists,
  });
  const deleteChecklist = useMutation({ mutationFn: (id: string) => complianceChecklistsApi.delete(id), onSuccess: invalidateChecklists });

  // ── Control state ───────────────────────────────────────────────────────
  const [controlDialog, setControlDialog] = useState(false);
  const [editingControl, setEditingControl] = useState<ComplianceControl | null>(null);
  const [controlForm, setControlForm] = useState(emptyControlForm);
  const [controlDelete, setControlDelete] = useState<ComplianceControl | null>(null);

  const openControl = (record?: ComplianceControl) => {
    if (record) {
      setEditingControl(record);
      setControlForm({
        control_id: record.control_id,
        framework: record.framework,
        name: record.name,
        description: record.description,
        version: record.version,
      });
    } else {
      setEditingControl(null);
      setControlForm(emptyControlForm);
    }
    setControlDialog(true);
  };

  const handleSaveControl = async () => {
    if (!controlForm.control_id || !controlForm.framework || !controlForm.name) {
      toast.error("Control ID, framework, and name are required");
      return;
    }
    try {
      if (editingControl) {
        await updateControl.mutateAsync({ id: editingControl.id, data: controlForm });
        toast.success("Control updated");
      } else {
        await createControl.mutateAsync(controlForm);
        toast.success("Control created");
      }
      setControlDialog(false);
    } catch (error: any) {
      toast.error("Failed to save control", {
        description: error?.response?.data?.detail || "Unexpected error",
      });
    }
  };

  // ── Checklist state ─────────────────────────────────────────────────────
  const [checklistDialog, setChecklistDialog] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<ComplianceChecklist | null>(null);
  const [checklistForm, setChecklistForm] = useState(emptyChecklistForm);
  const [checklistDelete, setChecklistDelete] = useState<ComplianceChecklist | null>(null);

  const openChecklist = (record?: ComplianceChecklist) => {
    if (record) {
      setEditingChecklist(record);
      setChecklistForm({
        participant_id: record.participant_id,
        control_id: record.control_id,
        framework: record.framework,
        control_name: record.control_name,
        status: record.status,
        evidence_text: (record.evidence_ids || []).join(", "),
        notes: record.notes || "",
      });
    } else {
      setEditingChecklist(null);
      setChecklistForm(emptyChecklistForm);
    }
    setChecklistDialog(true);
  };

  const handleControlPicked = (controlId: string) => {
    const control = controls.find((c) => c.id === controlId);
    if (control) {
      setChecklistForm((prev) => ({
        ...prev,
        control_id: control.control_id,
        framework: control.framework,
        control_name: control.name,
      }));
    } else {
      setChecklistForm((prev) => ({ ...prev, control_id: controlId }));
    }
  };

  const handleSaveChecklist = async () => {
    if (!checklistForm.participant_id || !checklistForm.control_id || !checklistForm.control_name) {
      toast.error("Participant, control, and control name are required");
      return;
    }
    const payload = {
      participant_id: checklistForm.participant_id,
      control_id: checklistForm.control_id,
      framework: checklistForm.framework,
      control_name: checklistForm.control_name,
      status: checklistForm.status,
      evidence_ids: checklistForm.evidence_text.split(",").map((x) => x.trim()).filter(Boolean),
      notes: checklistForm.notes || null,
      checked_at: new Date().toISOString(),
    };
    try {
      if (editingChecklist) {
        await updateChecklist.mutateAsync({ id: editingChecklist.id, data: payload });
        toast.success("Checklist updated");
      } else {
        await createChecklist.mutateAsync(payload);
        toast.success("Checklist entry created");
      }
      setChecklistDialog(false);
    } catch (error: any) {
      toast.error("Failed to save checklist", {
        description: error?.response?.data?.detail || "Unexpected error",
      });
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const compliant = checklists.filter((c) => c.status === "COMPLIANT").length;
    const total = checklists.length;
    const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;
    const frameworks = new Set(controls.map((c) => c.framework)).size;
    return { compliant, total, rate, frameworks };
  }, [controls, checklists]);

  return (
    <V2PageShell title="Compliance Management" subtitle="Manage compliance controls (frameworks) and per-participant compliance checklists." status="Live API">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active Controls" value={loadingControls ? "..." : controls.length} subtitle="Across frameworks" icon={Shield} trend="up" />
        <MetricCard title="Frameworks" value={loadingControls ? "..." : stats.frameworks} subtitle="Distinct frameworks" icon={Shield} trend="neutral" />
        <MetricCard title="Checklist Entries" value={loadingChecklists ? "..." : stats.total} subtitle="Per-participant assessments" icon={Shield} trend="up" />
        <MetricCard title="Compliance Rate" value={`${stats.rate}%`} subtitle={`${stats.compliant} of ${stats.total} compliant`} icon={Shield} trend={stats.rate >= 70 ? "up" : "down"} />
      </div>

      <Tabs defaultValue="controls">
        <TabsList>
          <TabsTrigger value="controls">Compliance Controls</TabsTrigger>
          <TabsTrigger value="checklists">Compliance Checklists</TabsTrigger>
        </TabsList>

        {/* Controls */}
        <TabsContent value="controls">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Controls Catalog</CardTitle>
                <CardDescription>Define compliance controls (e.g. ISO 27001 A.9.2 Access Provisioning).</CardDescription>
              </div>
              <Button size="sm" className="gap-2" disabled={!canManage} onClick={() => openControl()}>
                <Plus className="h-4 w-4" />New Control
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Control ID", "Framework", "Name", "Version", "Active", "Actions"]} isLoading={loadingControls}>
                {controls.length > 0 ? controls.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{c.control_id}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.framework}</Badge></td>
                    <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-sm font-mono">{c.version}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${c.active ? "border-emerald-500/40 text-emerald-500" : ""}`}>{c.active ? "Yes" : "No"}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1" disabled={!canManage} onClick={() => openControl(c)}>
                          <Pencil className="h-3 w-3" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!canManage} onClick={() => setControlDelete(c)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No controls yet — create your first control.</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklists */}
        <TabsContent value="checklists">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Per-Participant Checklists</CardTitle>
                <CardDescription>Track compliance status of each control for each participant.</CardDescription>
              </div>
              <Button size="sm" className="gap-2" disabled={!canManage || controls.length === 0 || participants.length === 0} onClick={() => openChecklist()}>
                <Plus className="h-4 w-4" />New Checklist Entry
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Participant", "Framework", "Control", "Status", "Checked", "Actions"]} isLoading={loadingChecklists}>
                {checklists.length > 0 ? checklists.map((c) => {
                  const participant = participants.find((p) => p.id === c.participant_id);
                  return (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm">{participant?.organization_name || c.participant_id.slice(0, 8)}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.framework}</Badge></td>
                      <td className="px-4 py-3 text-sm">{c.control_name}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.checked_at ? new Date(c.checked_at).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-1" disabled={!canManage} onClick={() => openChecklist(c)}>
                            <Pencil className="h-3 w-3" />Edit
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!canManage} onClick={() => setChecklistDelete(c)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (<tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No checklist entries yet.</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Control Dialog */}
      <Dialog open={controlDialog} onOpenChange={setControlDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingControl ? "Edit Control" : "New Control"}</DialogTitle>
            <DialogDescription>Define one row in the compliance catalog.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Control ID *</Label>
                <Input value={controlForm.control_id} onChange={(e) => setControlForm({ ...controlForm, control_id: e.target.value })} placeholder="A.9.2.1" />
              </div>
              <div className="grid gap-2">
                <Label>Framework *</Label>
                <Select value={controlForm.framework} onValueChange={(v) => setControlForm({ ...controlForm, framework: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ISO_27001">ISO 27001</SelectItem>
                    <SelectItem value="SOC_2">SOC 2</SelectItem>
                    <SelectItem value="GDPR">GDPR</SelectItem>
                    <SelectItem value="SKK_MIGAS">SKK MIGAS</SelectItem>
                    <SelectItem value="NIST">NIST</SelectItem>
                    <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={controlForm.name} onChange={(e) => setControlForm({ ...controlForm, name: e.target.value })} placeholder="User Access Provisioning" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={controlForm.description} onChange={(e) => setControlForm({ ...controlForm, description: e.target.value })} rows={3} />
            </div>
            <div className="grid gap-2">
              <Label>Version</Label>
              <Input value={controlForm.version} onChange={(e) => setControlForm({ ...controlForm, version: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setControlDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveControl} disabled={createControl.isPending || updateControl.isPending}>
              {createControl.isPending || updateControl.isPending ? "Saving..." : editingControl ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checklist Dialog */}
      <Dialog open={checklistDialog} onOpenChange={setChecklistDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingChecklist ? "Edit Checklist Entry" : "New Checklist Entry"}</DialogTitle>
            <DialogDescription>Pick a participant and a control, then mark status + attach evidence.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Participant *</Label>
              <Select value={checklistForm.participant_id} onValueChange={(v) => setChecklistForm({ ...checklistForm, participant_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select participant" /></SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (<SelectItem key={p.id} value={p.id}>{p.organization_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Control *</Label>
              <Select value={controls.find((c) => c.control_id === checklistForm.control_id)?.id || ""} onValueChange={handleControlPicked}>
                <SelectTrigger><SelectValue placeholder="Pick from controls catalog" /></SelectTrigger>
                <SelectContent>
                  {controls.map((c) => (<SelectItem key={c.id} value={c.id}>{c.control_id} — {c.name} ({c.framework})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status *</Label>
              <Select value={checklistForm.status} onValueChange={(v) => setChecklistForm({ ...checklistForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLIANT">COMPLIANT</SelectItem>
                  <SelectItem value="NON_COMPLIANT">NON-COMPLIANT</SelectItem>
                  <SelectItem value="IN_REVIEW">IN_REVIEW</SelectItem>
                  <SelectItem value="NOT_APPLICABLE">NOT_APPLICABLE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Evidence IDs (comma-separated)</Label>
              <Input value={checklistForm.evidence_text} onChange={(e) => setChecklistForm({ ...checklistForm, evidence_text: e.target.value })} placeholder="evidence-uuid-1, evidence-uuid-2" />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={checklistForm.notes} onChange={(e) => setChecklistForm({ ...checklistForm, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveChecklist} disabled={createChecklist.isPending || updateChecklist.isPending}>
              {createChecklist.isPending || updateChecklist.isPending ? "Saving..." : editingChecklist ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!controlDelete} onOpenChange={(o) => !o && setControlDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Control?</AlertDialogTitle>
            <AlertDialogDescription>This removes <strong>{controlDelete?.name}</strong>. Existing checklist entries referencing this control will be orphaned.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={async () => {
                if (!controlDelete) return;
                try {
                  await deleteControl.mutateAsync(controlDelete.id);
                  toast.success("Control deleted");
                  setControlDelete(null);
                } catch (error: any) {
                  toast.error("Failed to delete", { description: error?.response?.data?.detail || "Unexpected error" });
                }
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!checklistDelete} onOpenChange={(o) => !o && setChecklistDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist Entry?</AlertDialogTitle>
            <AlertDialogDescription>This removes the assessment record. Audit trail is preserved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={async () => {
                if (!checklistDelete) return;
                try {
                  await deleteChecklist.mutateAsync(checklistDelete.id);
                  toast.success("Checklist entry deleted");
                  setChecklistDelete(null);
                } catch (error: any) {
                  toast.error("Failed to delete", { description: error?.response?.data?.detail || "Unexpected error" });
                }
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default Compliance;
