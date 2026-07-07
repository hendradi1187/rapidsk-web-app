import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Loader2, Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { useDomain } from "@/context/DomainContext";
import { providersApi } from "@/api/services/providers";
import { monitoringsApi, type MonitoringItem } from "@/api/services/monitoring";

export const MonitoringConfigPanel = () => {
  const { domainId, domainName } = useDomain();
  const [busyAction, setBusyAction] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoringItem | null>(null);
  const [deleting, setDeleting] = useState<MonitoringItem | null>(null);
  const [form, setForm] = useState({
    participant_id: "",
    logEnabled: true,
    retention: "30",
    email: "",
    realtime: true,
  });

  const monitoringsQ = useQuery({
    queryKey: ["monitorings", domainId],
    queryFn: () => monitoringsApi.list(domainId!),
    enabled: !!domainId,
  });
  const participantsQ = useQuery({
    queryKey: ["monitorings", "participants"],
    queryFn: () => providersApi.list(),
  });

  const monitorings = monitoringsQ.data ?? [];
  const participants = (participantsQ.data ?? []) as Array<{ provider_id: string; provider_name: string }>;
  const participantName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of participants) map[p.provider_id] = p.provider_name;
    return map;
  }, [participants]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      participant_id: participants[0]?.provider_id ?? "",
      logEnabled: true,
      retention: "30",
      email: "",
      realtime: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (m: MonitoringItem) => {
    setEditing(m);
    setForm({
      participant_id: m.participant_id,
      logEnabled: m.log?.enabled ?? true,
      retention: String(m.log?.retention ?? 30),
      email: m.notification?.email ?? "",
      realtime: m.notification?.realtime ?? true,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!domainId) return;
    try {
      setBusyAction("save");
      const body = {
        participant_id: form.participant_id,
        log: { enabled: form.logEnabled, retention: Number(form.retention || 0) },
        compliance: editing?.compliance ?? [],
        notification: { email: form.email.trim(), realtime: form.realtime },
      };
      if (editing) {
        await monitoringsApi.update(domainId, editing.id, body);
        toast.success("Konfigurasi monitoring diperbarui.");
      } else {
        await monitoringsApi.create(domainId, body);
        toast.success("Konfigurasi monitoring dibuat.");
      }
      setDialogOpen(false);
      await monitoringsQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan konfigurasi monitoring."));
    } finally {
      setBusyAction("");
    }
  };

  const remove = async () => {
    if (!domainId || !deleting) return;
    try {
      setBusyAction("delete");
      await monitoringsApi.remove(domainId, deleting.id);
      toast.success("Konfigurasi monitoring dihapus.");
      setDeleting(null);
      await monitoringsQ.refetch();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus konfigurasi monitoring."));
    } finally {
      setBusyAction("");
    }
  };

  if (!domainId) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">
        Pilih domain aktif dulu lewat pemilih domain di kanan atas. Konfigurasi monitoring diatur per domain.
      </div>
    );
  }

  return (
    <Card className="panel">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Konfigurasi Monitoring per Participant</CardTitle>
            <CardDescription>
              Atur retensi log, notifikasi, dan kepatuhan untuk tiap participant di domain{" "}
              <span className="font-medium text-slate-700">{domainName ?? domainId}</span>.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void monitoringsQ.refetch()} disabled={monitoringsQ.isFetching}>
              {monitoringsQ.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Muat Ulang
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Konfigurasi
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {monitoringsQ.isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat konfigurasi...
          </div>
        ) : monitorings.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
            Belum ada konfigurasi monitoring untuk domain ini.
          </div>
        ) : (
          monitorings.map((m) => (
            <div key={m.id} className="flex flex-col gap-3 rounded-2xl border p-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">
                    {participantName[m.participant_id] || m.participant_id}
                  </p>
                  <Badge className={m.log?.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}>
                    {m.log?.enabled ? "Log aktif" : "Log nonaktif"}
                  </Badge>
                  <Badge variant="outline">Retensi {m.log?.retention ?? 0} hari</Badge>
                  {m.notification?.realtime ? <Badge variant="secondary">Realtime</Badge> : null}
                </div>
                <p className="text-sm text-slate-600">Notifikasi ke: {m.notification?.email || "-"}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                  <Pencil className="mr-2 h-4 w-4" /> Ubah
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleting(m)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Hapus
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Konfigurasi Monitoring" : "Tambah Konfigurasi Monitoring"}</DialogTitle>
            <DialogDescription>Tetapkan participant, retensi log, dan tujuan notifikasi.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Participant</Label>
              <Select value={form.participant_id} onValueChange={(v) => setForm((p) => ({ ...p, participant_id: v }))}>
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
            <div className="flex items-center justify-between rounded-xl border p-3 md:col-span-2">
              <div>
                <Label>Aktifkan log</Label>
                <p className="text-xs text-slate-500">Rekam aktivitas transfer participant ini.</p>
              </div>
              <Switch checked={form.logEnabled} onCheckedChange={(v) => setForm((p) => ({ ...p, logEnabled: v }))} />
            </div>
            <div className="space-y-2">
              <Label>Retensi Log (hari)</Label>
              <Input type="number" min={0} value={form.retention} onChange={(e) => setForm((p) => ({ ...p, retention: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label>Notifikasi realtime</Label>
                <p className="text-xs text-slate-500">Kirim segera saat ada kejadian.</p>
              </div>
              <Switch checked={form.realtime} onCheckedChange={(v) => setForm((p) => ({ ...p, realtime: v }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email Notifikasi</Label>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="ops@participant.co.id" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => void save()} disabled={busyAction === "save"}>
              {busyAction === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hapus Konfigurasi Monitoring</DialogTitle>
            <DialogDescription>
              Konfigurasi untuk {participantName[deleting?.participant_id ?? ""] || deleting?.participant_id} akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => void remove()} disabled={busyAction === "delete"}>
              {busyAction === "delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
