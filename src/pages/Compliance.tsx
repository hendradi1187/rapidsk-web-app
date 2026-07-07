import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/context/AuthContext";
import { providersApi } from "@/api/services/providers";
import {
  complianceControlsApi,
  complianceChecklistsApi,
  type ComplianceControl,
  type ComplianceChecklist,
} from "@/api/services/compliance";

const CHECKLIST_STATUSES = [
  { value: "COMPLIANT", label: "Terpenuhi" },
  { value: "PARTIAL", label: "Sebagian" },
  { value: "NON_COMPLIANT", label: "Belum terpenuhi" },
  { value: "IN_PROGRESS", label: "Sedang dikerjakan" },
  { value: "NOT_APPLICABLE", label: "Tidak berlaku" },
];

const statusTone = (status: string) => {
  switch (String(status).toUpperCase()) {
    case "COMPLIANT":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "PARTIAL":
    case "IN_PROGRESS":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "NON_COMPLIANT":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const statusLabel = (status: string) =>
  CHECKLIST_STATUSES.find((s) => s.value === String(status).toUpperCase())?.label ?? status;

const emptyControl = {
  control_id: "",
  framework: "",
  name: "",
  description: "",
  version: "1.0",
};

const nowLocalInput = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Compliance = () => {
  const { role, roles, hasPermission } = useAuth();
  const canManage =
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    roles?.includes("AUDITOR") ||
    hasPermission?.("compliance.manage") ||
    hasPermission?.("audit.manage");

  const [busyAction, setBusyAction] = useState("");

  // ── Controls ──
  const [controlDialogOpen, setControlDialogOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<ComplianceControl | null>(null);
  const [controlForm, setControlForm] = useState(emptyControl);
  const [deletingControl, setDeletingControl] = useState<ComplianceControl | null>(null);

  // ── Checklists ──
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<ComplianceChecklist | null>(null);
  const [checklistForm, setChecklistForm] = useState({
    participant_id: "",
    control_id: "",
    framework: "",
    control_name: "",
    status: "COMPLIANT",
    evidence_ids: "",
    notes: "",
    checked_at: nowLocalInput(),
  });
  const [deletingChecklist, setDeletingChecklist] = useState<ComplianceChecklist | null>(null);

  const controlsQ = useQuery({
    queryKey: ["compliance", "controls"],
    queryFn: () => complianceControlsApi.list(),
  });
  const checklistsQ = useQuery({
    queryKey: ["compliance", "checklists"],
    queryFn: () => complianceChecklistsApi.list(),
  });
  const participantsQ = useQuery({
    queryKey: ["compliance", "participants"],
    queryFn: () => providersApi.list(),
  });

  const controls = controlsQ.data ?? [];
  const checklists = checklistsQ.data ?? [];
  const participants = (participantsQ.data ?? []) as Array<{
    provider_id: string;
    provider_name: string;
  }>;

  const participantName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of participants) map[p.provider_id] = p.provider_name;
    return map;
  }, [participants]);

  const coverage = useMemo(() => {
    const compliant = checklists.filter(
      (c) => String(c.status).toUpperCase() === "COMPLIANT",
    ).length;
    const pct = checklists.length ? Math.round((compliant / checklists.length) * 100) : 0;
    return { compliant, pct };
  }, [checklists]);

  const openCreateControl = () => {
    setEditingControl(null);
    setControlForm(emptyControl);
    setControlDialogOpen(true);
  };

  const openEditControl = (control: ComplianceControl) => {
    setEditingControl(control);
    setControlForm({
      control_id: control.control_id,
      framework: control.framework,
      name: control.name,
      description: control.description,
      version: control.version,
    });
    setControlDialogOpen(true);
  };

  const saveControl = async () => {
    try {
      setBusyAction("save-control");
      if (editingControl) {
        await complianceControlsApi.update(editingControl.id, controlForm);
        toast.success("Kontrol kepatuhan diperbarui.");
      } else {
        await complianceControlsApi.create(controlForm);
        toast.success("Kontrol kepatuhan ditambahkan.");
      }
      setControlDialogOpen(false);
      await controlsQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan kontrol."));
    } finally {
      setBusyAction("");
    }
  };

  const toggleControlActive = async (control: ComplianceControl) => {
    try {
      setBusyAction(`toggle:${control.id}`);
      await complianceControlsApi.update(control.id, { active: !control.active });
      toast.success(control.active ? "Kontrol dinonaktifkan." : "Kontrol diaktifkan.");
      await controlsQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal mengubah status kontrol."));
    } finally {
      setBusyAction("");
    }
  };

  const deleteControl = async () => {
    if (!deletingControl) return;
    try {
      setBusyAction("delete-control");
      await complianceControlsApi.remove(deletingControl.id);
      toast.success("Kontrol dihapus.");
      setDeletingControl(null);
      await controlsQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus kontrol."));
    } finally {
      setBusyAction("");
    }
  };

  const openCreateChecklist = () => {
    setEditingChecklist(null);
    setChecklistForm({
      participant_id: participants[0]?.provider_id ?? "",
      control_id: controls[0]?.control_id ?? "",
      framework: controls[0]?.framework ?? "",
      control_name: controls[0]?.name ?? "",
      status: "COMPLIANT",
      evidence_ids: "",
      notes: "",
      checked_at: nowLocalInput(),
    });
    setChecklistDialogOpen(true);
  };

  const openEditChecklist = (checklist: ComplianceChecklist) => {
    setEditingChecklist(checklist);
    setChecklistForm({
      participant_id: checklist.participant_id,
      control_id: checklist.control_id,
      framework: checklist.framework,
      control_name: checklist.control_name,
      status: String(checklist.status).toUpperCase(),
      evidence_ids: (checklist.evidence_ids ?? []).join(", "),
      notes: checklist.notes ?? "",
      checked_at: checklist.checked_at
        ? new Date(checklist.checked_at).toISOString().slice(0, 16)
        : nowLocalInput(),
    });
    setChecklistDialogOpen(true);
  };

  // Ketika control dipilih, isi otomatis framework + control_name dari master control.
  const onPickControl = (controlId: string) => {
    const found = controls.find((c) => c.control_id === controlId);
    setChecklistForm((prev) => ({
      ...prev,
      control_id: controlId,
      framework: found?.framework ?? prev.framework,
      control_name: found?.name ?? prev.control_name,
    }));
  };

  const saveChecklist = async () => {
    try {
      setBusyAction("save-checklist");
      const body = {
        participant_id: checklistForm.participant_id,
        control_id: checklistForm.control_id.trim(),
        framework: checklistForm.framework.trim(),
        control_name: checklistForm.control_name.trim(),
        status: checklistForm.status,
        evidence_ids: checklistForm.evidence_ids
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: checklistForm.notes.trim() || null,
        checked_at: new Date(checklistForm.checked_at).toISOString(),
      };
      if (editingChecklist) {
        await complianceChecklistsApi.update(editingChecklist.id, body);
        toast.success("Checklist kepatuhan diperbarui.");
      } else {
        await complianceChecklistsApi.create(body);
        toast.success("Checklist kepatuhan dicatat.");
      }
      setChecklistDialogOpen(false);
      await checklistsQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan checklist."));
    } finally {
      setBusyAction("");
    }
  };

  const deleteChecklist = async () => {
    if (!deletingChecklist) return;
    try {
      setBusyAction("delete-checklist");
      await complianceChecklistsApi.remove(deletingChecklist.id);
      toast.success("Checklist dihapus.");
      setDeletingChecklist(null);
      await checklistsQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus checklist."));
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Kepatuhan"
        subtitle="Kelola kontrol kepatuhan dan catat bukti pemenuhannya per participant."
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Kontrol Terdaftar</p>
            <p className="mt-1 text-3xl font-bold">{controls.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Kontrol Aktif</p>
            <p className="mt-1 text-3xl font-bold">{controls.filter((c) => c.active).length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Checklist Tercatat</p>
            <p className="mt-1 text-3xl font-bold">{checklists.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Sudah Terpenuhi</p>
            <p className="mt-1 text-3xl font-bold">{coverage.pct}%</p>
          </div>
        </div>

        <Tabs defaultValue="checklists" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 gap-2">
            <TabsTrigger value="checklists">Checklist Pemenuhan</TabsTrigger>
            <TabsTrigger value="controls">Kontrol Kepatuhan</TabsTrigger>
          </TabsList>

          {/* ── Checklists ── */}
          <TabsContent value="checklists" className="space-y-4">
            <Card className="panel">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Bukti Pemenuhan Kepatuhan</CardTitle>
                    <CardDescription>
                      Setiap baris mencatat sejauh mana satu participant memenuhi sebuah kontrol,
                      lengkap dengan bukti dan waktu pemeriksaannya.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => void checklistsQ.refetch()} disabled={checklistsQ.isFetching}>
                      {checklistsQ.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Muat Ulang
                    </Button>
                    {canManage ? (
                      <Button onClick={openCreateChecklist}>
                        <Plus className="mr-2 h-4 w-4" />
                        Catat Pemenuhan
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {checklistsQ.isLoading ? (
                  <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat checklist...
                  </div>
                ) : checklists.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                    Belum ada catatan pemenuhan. Mulai dengan menekan "Catat Pemenuhan".
                  </div>
                ) : (
                  checklists.map((item) => (
                    <div key={item.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{item.control_name}</p>
                            <Badge className={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                            <Badge variant="outline">{item.framework}</Badge>
                            <Badge variant="secondary">{item.control_id}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            Participant: {participantName[item.participant_id] || item.participant_id}
                          </p>
                          {item.notes ? <p className="text-sm text-slate-600">Catatan: {item.notes}</p> : null}
                          <p className="text-xs text-slate-500">
                            {(item.evidence_ids ?? []).length} bukti · Diperiksa {item.checked_at ? new Date(item.checked_at).toLocaleString() : "-"}
                          </p>
                        </div>
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditChecklist(item)}>
                              <Pencil className="mr-2 h-4 w-4" /> Ubah
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeletingChecklist(item)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Controls ── */}
          <TabsContent value="controls" className="space-y-4">
            <Card className="panel">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Katalog Kontrol Kepatuhan</CardTitle>
                    <CardDescription>
                      Daftar kendali dari framework yang dipakai sebagai acuan pemeriksaan, misalnya
                      kontrol keamanan atau tata kelola data.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => void controlsQ.refetch()} disabled={controlsQ.isFetching}>
                      {controlsQ.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Muat Ulang
                    </Button>
                    {canManage ? (
                      <Button onClick={openCreateControl}>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Kontrol
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {controlsQ.isLoading ? (
                  <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat kontrol...
                  </div>
                ) : controls.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                    Belum ada kontrol. Tambahkan kontrol pertama sebagai acuan checklist.
                  </div>
                ) : (
                  controls.map((control) => (
                    <div key={control.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{control.name}</p>
                            <Badge
                              className={
                                control.active
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }
                            >
                              {control.active ? "Aktif" : "Nonaktif"}
                            </Badge>
                            <Badge variant="outline">{control.framework}</Badge>
                            <Badge variant="secondary">{control.control_id}</Badge>
                            <Badge variant="secondary">v{control.version}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{control.description}</p>
                        </div>
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void toggleControlActive(control)}
                              disabled={busyAction === `toggle:${control.id}`}
                            >
                              {busyAction === `toggle:${control.id}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              {control.active ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditControl(control)}>
                              <Pencil className="mr-2 h-4 w-4" /> Ubah
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeletingControl(control)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Control */}
      <Dialog open={controlDialogOpen} onOpenChange={setControlDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingControl ? "Ubah Kontrol" : "Tambah Kontrol"}</DialogTitle>
            <DialogDescription>
              Kontrol jadi acuan checklist. Beri ID yang jelas supaya mudah dirujuk saat mencatat pemenuhan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>ID Kontrol</Label>
              <Input
                value={controlForm.control_id}
                onChange={(e) => setControlForm((p) => ({ ...p, control_id: e.target.value }))}
                placeholder="mis. AC-01"
              />
            </div>
            <div className="space-y-2">
              <Label>Framework</Label>
              <Input
                value={controlForm.framework}
                onChange={(e) => setControlForm((p) => ({ ...p, framework: e.target.value }))}
                placeholder="mis. ISO 27001 / SPBE"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Nama Kontrol</Label>
              <Input
                value={controlForm.name}
                onChange={(e) => setControlForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="mis. Pembatasan Akses Data"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={controlForm.description}
                onChange={(e) => setControlForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Jelaskan apa yang diperiksa oleh kontrol ini."
              />
            </div>
            <div className="space-y-2">
              <Label>Versi</Label>
              <Input
                value={controlForm.version}
                onChange={(e) => setControlForm((p) => ({ ...p, version: e.target.value }))}
                placeholder="1.0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setControlDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void saveControl()} disabled={busyAction === "save-control"}>
              {busyAction === "save-control" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Checklist */}
      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingChecklist ? "Ubah Checklist" : "Catat Pemenuhan"}</DialogTitle>
            <DialogDescription>
              Pilih participant dan kontrol yang diperiksa, lalu tetapkan statusnya beserta bukti pendukung.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Participant</Label>
              <Select
                value={checklistForm.participant_id}
                onValueChange={(v) => setChecklistForm((p) => ({ ...p, participant_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih participant" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.provider_id} value={p.provider_id}>
                      {p.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kontrol</Label>
              {controls.length > 0 ? (
                <Select value={checklistForm.control_id} onValueChange={onPickControl}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kontrol" />
                  </SelectTrigger>
                  <SelectContent>
                    {controls.map((c) => (
                      <SelectItem key={c.id} value={c.control_id}>
                        {c.control_id} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={checklistForm.control_id}
                  onChange={(e) => setChecklistForm((p) => ({ ...p, control_id: e.target.value }))}
                  placeholder="ID kontrol"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Framework</Label>
              <Input
                value={checklistForm.framework}
                onChange={(e) => setChecklistForm((p) => ({ ...p, framework: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Kontrol</Label>
              <Input
                value={checklistForm.control_name}
                onChange={(e) => setChecklistForm((p) => ({ ...p, control_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={checklistForm.status}
                onValueChange={(v) => setChecklistForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHECKLIST_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Waktu Pemeriksaan</Label>
              <Input
                type="datetime-local"
                value={checklistForm.checked_at}
                onChange={(e) => setChecklistForm((p) => ({ ...p, checked_at: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>ID Bukti (pisahkan dengan koma)</Label>
              <Input
                value={checklistForm.evidence_ids}
                onChange={(e) => setChecklistForm((p) => ({ ...p, evidence_ids: e.target.value }))}
                placeholder="mis. doc-123, log-456"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Catatan</Label>
              <Textarea
                value={checklistForm.notes}
                onChange={(e) => setChecklistForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Opsional — konteks tambahan hasil pemeriksaan."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void saveChecklist()} disabled={busyAction === "save-checklist"}>
              {busyAction === "save-checklist" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus control */}
      <Dialog open={!!deletingControl} onOpenChange={(o) => !o && setDeletingControl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hapus Kontrol</DialogTitle>
            <DialogDescription>
              Kontrol "{deletingControl?.name}" akan dihapus permanen. Checklist yang sudah tercatat tidak ikut terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingControl(null)}>
              Batal
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void deleteControl()}
              disabled={busyAction === "delete-control"}
            >
              {busyAction === "delete-control" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus checklist */}
      <Dialog open={!!deletingChecklist} onOpenChange={(o) => !o && setDeletingChecklist(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hapus Checklist</DialogTitle>
            <DialogDescription>
              Catatan pemenuhan "{deletingChecklist?.control_name}" akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingChecklist(null)}>
              Batal
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void deleteChecklist()}
              disabled={busyAction === "delete-checklist"}
            >
              {busyAction === "delete-checklist" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Compliance;
