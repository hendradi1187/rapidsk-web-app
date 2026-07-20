import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Loader2, Play, RefreshCw, SatelliteDish, Send, ServerCog } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api-error";
import { canManageConnectionPools } from "@/lib/feature-access";
import { useAuth } from "@/context/AuthContext";
import { transfersApi } from "@/api/services/connector";
import { MonitoringConfigPanel } from "@/components/monitoring/MonitoringConfigPanel";

const ConnectorMonitoring = () => {
  const { role, roles, hasPermission } = useAuth();
  const canManage = canManageConnectionPools({ role, roles, hasPermission }) || role === "PROVIDER";

  const [heartbeatForm, setHeartbeatForm] = useState({
    connector_id: "",
    participant_id: "",
    status: "ONLINE",
    version: "",
    instance_id: "",
    metadata: '{\n  "source": "frontend-monitor"\n}',
  });
  const [publishForm, setPublishForm] = useState({
    limit: "100",
    max_retry_count: "5",
  });
  const [providerInitiateForm, setProviderInitiateForm] = useState({
    domain_id: "",
    agreement_id: "",
    dataset_id: "",
    transfer_id: "",
    consumer_transfer_process_id: "",
    consumer_tier: "",
  });
  const [providerDirectForm, setProviderDirectForm] = useState({
    transfer_process_id: "",
    domain_id: "",
    agreement_id: "",
    dataset_id: "",
    resume_from_byte: "0",
    transfer_mode: "direct_stream" as "direct_stream" | "persistent",
  });
  const [providerCheckResult, setProviderCheckResult] = useState<Record<string, unknown> | null>(null);
  const [busyAction, setBusyAction] = useState("");

  const heartbeatsQ = useQuery({
    queryKey: ["connector-monitoring", "heartbeats"],
    queryFn: () => transfersApi.listHeartbeats(100),
    enabled: canManage,
  });

  const projectionsQ = useQuery({
    queryKey: ["connector-monitoring", "projections"],
    queryFn: () => transfersApi.listTransferProjections(100),
    enabled: canManage,
  });

  const heartbeats = heartbeatsQ.data ?? [];
  const projections = projectionsQ.data ?? [];

  const onlineCount = heartbeats.filter((item) => String(item.status).toUpperCase() === "ONLINE").length;
  const activeProjectionCount = projections.filter((item) =>
    ["INITIATED", "TRANSFERRING", "PAUSED"].includes(String(item.status ?? "").toUpperCase()),
  ).length;

  const heartbeatStatusTone = (status: string) => {
    const normalized = String(status).toUpperCase();
    if (normalized === "ONLINE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (normalized === "DEGRADED") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const projectionStatusTone = (status: string | null | undefined) => {
    const normalized = String(status ?? "").toUpperCase();
    if (normalized === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (normalized === "FAILED") return "bg-rose-50 text-rose-700 border-rose-200";
    if (normalized === "TRANSFERRING") return "bg-sky-50 text-sky-700 border-sky-200";
    if (normalized === "PAUSED") return "bg-slate-50 text-slate-700 border-slate-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const latestHeartbeatAt = useMemo(() => {
    if (heartbeats.length === 0) return "-";
    return heartbeats
      .map((item) => item.last_seen_at)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  }, [heartbeats]);

  const runRefresh = async () => {
    await Promise.allSettled([heartbeatsQ.refetch(), projectionsQ.refetch()]);
    toast.success("Monitoring connector dimuat ulang.");
  };

  const parseMetadata = () => {
    const raw = heartbeatForm.metadata.trim();
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, unknown>;
  };

  const sendHeartbeat = async () => {
    try {
      setBusyAction("send-heartbeat");
      await transfersApi.sendHeartbeat({
        connector_id: heartbeatForm.connector_id.trim() || null,
        participant_id: heartbeatForm.participant_id.trim() || null,
        status: heartbeatForm.status.trim() || "ONLINE",
        version: heartbeatForm.version.trim() || null,
        instance_id: heartbeatForm.instance_id.trim() || null,
        metadata: parseMetadata(),
      });
      toast.success("Heartbeat connector berhasil dikirim.");
      await runRefresh();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal mengirim heartbeat connector."));
    } finally {
      setBusyAction("");
    }
  };

  const publishEvents = async () => {
    try {
      setBusyAction("publish-events");
      const result = await transfersApi.publishTransferEvents({
        limit: Number(publishForm.limit || 100),
        max_retry_count: Number(publishForm.max_retry_count || 5),
      });
      toast.success(`Publish event selesai. Terkirim ${result.sent}, gagal ${result.failed}.`);
      await runRefresh();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal publish transfer events."));
    } finally {
      setBusyAction("");
    }
  };

  const providerInitiate = async () => {
    try {
      setBusyAction("provider-initiate");
      const result = await transfersApi.providerInitiate({
        domain_id: providerInitiateForm.domain_id.trim(),
        agreement_id: providerInitiateForm.agreement_id.trim(),
        dataset_id: providerInitiateForm.dataset_id.trim(),
        transfer_id: providerInitiateForm.transfer_id.trim(),
        consumer_transfer_process_id: providerInitiateForm.consumer_transfer_process_id.trim(),
        consumer_tier: providerInitiateForm.consumer_tier.trim() || null,
      });
      setProviderDirectForm((current) => ({
        ...current,
        transfer_process_id: result.transfer_process_id,
        domain_id: providerInitiateForm.domain_id.trim(),
        agreement_id: providerInitiateForm.agreement_id.trim(),
        dataset_id: providerInitiateForm.dataset_id.trim(),
      }));
      toast.success(`Provider transfer diinisiasi. Process ID: ${result.transfer_process_id}`);
      await runRefresh();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal initiate provider transfer."));
    } finally {
      setBusyAction("");
    }
  };

  const buildProviderDirectBody = () => ({
    transfer_process_id: providerDirectForm.transfer_process_id.trim(),
    domain_id: providerDirectForm.domain_id.trim(),
    agreement_id: providerDirectForm.agreement_id.trim(),
    dataset_id: providerDirectForm.dataset_id.trim(),
    resume_from_byte: Number(providerDirectForm.resume_from_byte || 0),
    transfer_mode: providerDirectForm.transfer_mode,
  });

  const providerCheck = async () => {
    try {
      setBusyAction("provider-check");
      const result = await transfersApi.providerCheck(
        providerDirectForm.transfer_process_id.trim(),
        buildProviderDirectBody(),
      );
      setProviderCheckResult(result);
      toast.success("Provider check selesai.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal cek provider stream."));
    } finally {
      setBusyAction("");
    }
  };

  const providerStart = async () => {
    try {
      setBusyAction("provider-start");
      await transfersApi.providerStartDirect(
        providerDirectForm.transfer_process_id.trim(),
        buildProviderDirectBody(),
      );
      toast.success("Provider direct stream dijalankan.");
      await runRefresh();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menjalankan provider direct stream."));
    } finally {
      setBusyAction("");
    }
  };

  if (!canManage) {
    return (
      <div className="min-h-screen">
        <Header title="Connector Monitoring" subtitle="Runtime connector dan provider tools" />
        <div className="p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Halaman ini dibuka untuk admin runtime atau provider yang mengelola connector.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Connector Monitoring"
        subtitle="Pantau heartbeat, transfer projection, dan jalankan provider-side tools dari satu layar."
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Heartbeat Tersimpan</p>
            <p className="mt-1 text-3xl font-bold">{heartbeats.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Connector Online</p>
            <p className="mt-1 text-3xl font-bold">{onlineCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Transfer Aktif</p>
            <p className="mt-1 text-3xl font-bold">{activeProjectionCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Last Seen</p>
            <p className="mt-1 text-sm font-semibold">{latestHeartbeatAt === "-" ? "-" : new Date(latestHeartbeatAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void runRefresh()} disabled={heartbeatsQ.isFetching || projectionsQ.isFetching}>
            {(heartbeatsQ.isFetching || projectionsQ.isFetching) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Muat Ulang
          </Button>
        </div>

        <Tabs defaultValue="runtime" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 gap-2">
            <TabsTrigger value="runtime">Runtime</TabsTrigger>
            <TabsTrigger value="config">Monitoring Domain</TabsTrigger>
            <TabsTrigger value="provider">Provider Tools</TabsTrigger>
            <TabsTrigger value="events">Publish & Heartbeat</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            <MonitoringConfigPanel />
          </TabsContent>

          <TabsContent value="runtime" className="space-y-6">
            <Card className="panel">
              <CardHeader>
                <CardTitle>Connector Heartbeats</CardTitle>
                <CardDescription>Status runtime connector yang sudah masuk ke CTS monitoring.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {heartbeats.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                    Belum ada heartbeat yang terbaca.
                  </div>
                ) : (
                  heartbeats.map((heartbeat) => (
                    <div key={heartbeat.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{heartbeat.client_id}</p>
                            <Badge className={heartbeatStatusTone(heartbeat.status)}>{heartbeat.status}</Badge>
                            <Badge variant="outline">{heartbeat.service_type}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            Participant: {heartbeat.participant_id || "-"} · Connector: {heartbeat.connector_id || "-"}
                          </p>
                        </div>
                        <div className="text-sm text-slate-600">
                          Last seen: {new Date(heartbeat.last_seen_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="panel">
              <CardHeader>
                <CardTitle>Transfer Projections</CardTitle>
                <CardDescription>Snapshot transfer monitoring yang sudah diproyeksikan CTS.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {projections.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                    Belum ada transfer projection yang terbaca.
                  </div>
                ) : (
                  projections.map((projection) => (
                    <div key={projection.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{projection.transfer_process_id}</p>
                            <Badge className={projectionStatusTone(projection.status)}>{projection.status || "UNKNOWN"}</Badge>
                            <Badge variant="outline">{projection.role}</Badge>
                            <Badge variant="secondary">{projection.direction}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            Domain: {projection.domain_id || "-"} · Dataset: {projection.dataset_id || "-"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Last event: {projection.last_event_type} · {new Date(projection.last_event_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          Mode: {projection.mode || "-"} · Remote TP: {projection.remote_transfer_process_id || "-"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="provider" className="space-y-6">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Endpoint provider (<code>/connector/provider/*</code>) hanya menerima <strong>token layanan connector</strong>, bukan token login pengguna.
                Dipanggil dari browser dengan sesi biasa akan ditolak <strong>403 (PRINCIPAL_TYPE_NOT_ALLOWED)</strong>. Form ini untuk diagnosa/integrasi service, bukan operasi harian.
              </span>
            </div>
            <Card className="panel">
              <CardHeader>
                <CardTitle>Provider Initiate</CardTitle>
                <CardDescription>
                  Jalur ini membuka provider-side transfer process dari correlation ID consumer yang sudah ada.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Domain ID</Label>
                  <Input value={providerInitiateForm.domain_id} onChange={(e) => setProviderInitiateForm((p) => ({ ...p, domain_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Agreement ID</Label>
                  <Input value={providerInitiateForm.agreement_id} onChange={(e) => setProviderInitiateForm((p) => ({ ...p, agreement_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Dataset ID</Label>
                  <Input value={providerInitiateForm.dataset_id} onChange={(e) => setProviderInitiateForm((p) => ({ ...p, dataset_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Transfer ID</Label>
                  <Input value={providerInitiateForm.transfer_id} onChange={(e) => setProviderInitiateForm((p) => ({ ...p, transfer_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Consumer Transfer Process ID</Label>
                  <Input value={providerInitiateForm.consumer_transfer_process_id} onChange={(e) => setProviderInitiateForm((p) => ({ ...p, consumer_transfer_process_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Consumer Tier</Label>
                  <Input value={providerInitiateForm.consumer_tier} onChange={(e) => setProviderInitiateForm((p) => ({ ...p, consumer_tier: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Button onClick={() => void providerInitiate()} disabled={busyAction === "provider-initiate"}>
                    {busyAction === "provider-initiate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SatelliteDish className="mr-2 h-4 w-4" />}
                    Initiate Provider Transfer
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="panel">
              <CardHeader>
                <CardTitle>Provider Check & Start</CardTitle>
                <CardDescription>
                  Dipakai untuk cek akses source lalu menjalankan provider stream sesuai transfer process yang aktif.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Transfer Process ID</Label>
                  <Input value={providerDirectForm.transfer_process_id} onChange={(e) => setProviderDirectForm((p) => ({ ...p, transfer_process_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Domain ID</Label>
                  <Input value={providerDirectForm.domain_id} onChange={(e) => setProviderDirectForm((p) => ({ ...p, domain_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Agreement ID</Label>
                  <Input value={providerDirectForm.agreement_id} onChange={(e) => setProviderDirectForm((p) => ({ ...p, agreement_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Dataset ID</Label>
                  <Input value={providerDirectForm.dataset_id} onChange={(e) => setProviderDirectForm((p) => ({ ...p, dataset_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Resume From Byte</Label>
                  <Input value={providerDirectForm.resume_from_byte} onChange={(e) => setProviderDirectForm((p) => ({ ...p, resume_from_byte: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Transfer Mode</Label>
                  <select
                    value={providerDirectForm.transfer_mode}
                    onChange={(e) => setProviderDirectForm((p) => ({ ...p, transfer_mode: e.target.value as "direct_stream" | "persistent" }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="direct_stream">direct_stream</option>
                    <option value="persistent">persistent</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button variant="outline" onClick={() => void providerCheck()} disabled={busyAction === "provider-check"}>
                    {busyAction === "provider-check" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ServerCog className="mr-2 h-4 w-4" />}
                    Check Source
                  </Button>
                  <Button onClick={() => void providerStart()} disabled={busyAction === "provider-start"}>
                    {busyAction === "provider-start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Start Provider Stream
                  </Button>
                </div>
                {providerCheckResult ? (
                  <div className="md:col-span-2 rounded-xl border bg-slate-50 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-900">Hasil provider check</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">
                      {JSON.stringify(providerCheckResult, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <Card className="panel">
              <CardHeader>
                <CardTitle>Kirim Heartbeat Runtime</CardTitle>
                <CardDescription>Dipakai untuk uji alur heartbeat connector dari FE admin.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Connector ID</Label>
                  <Input value={heartbeatForm.connector_id} onChange={(e) => setHeartbeatForm((p) => ({ ...p, connector_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Participant ID</Label>
                  <Input value={heartbeatForm.participant_id} onChange={(e) => setHeartbeatForm((p) => ({ ...p, participant_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Input value={heartbeatForm.status} onChange={(e) => setHeartbeatForm((p) => ({ ...p, status: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input value={heartbeatForm.version} onChange={(e) => setHeartbeatForm((p) => ({ ...p, version: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Metadata JSON</Label>
                  <Textarea value={heartbeatForm.metadata} onChange={(e) => setHeartbeatForm((p) => ({ ...p, metadata: e.target.value }))} className="min-h-[160px] font-mono text-xs" />
                </div>
                <div className="md:col-span-2">
                  <Button onClick={() => void sendHeartbeat()} disabled={busyAction === "send-heartbeat"}>
                    {busyAction === "send-heartbeat" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                    Kirim Heartbeat
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="panel">
              <CardHeader>
                <CardTitle>Publish Pending Transfer Events</CardTitle>
                <CardDescription>Jalankan flush event transfer yang masih pending di runtime connector.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Limit</Label>
                  <Input value={publishForm.limit} onChange={(e) => setPublishForm((p) => ({ ...p, limit: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Max Retry Count</Label>
                  <Input value={publishForm.max_retry_count} onChange={(e) => setPublishForm((p) => ({ ...p, max_retry_count: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Button onClick={() => void publishEvents()} disabled={busyAction === "publish-events"}>
                    {busyAction === "publish-events" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Publish Transfer Events
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ConnectorMonitoring;
