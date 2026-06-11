import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Shield,
  Bell,
  Key,
  Database,
  Globe,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useConnectionPools, useCreateConnectionPool, useDeleteConnectionPool } from "@/api/hooks/useConnectionPools";
import { useParticipantAdapters, useAddParticipantAdapter, useUpdateParticipantAdapter, useDeleteParticipantAdapter } from "@/api/hooks/useProviders";
import { useProviders } from "@/api/hooks/useProviders";
import { useAuth } from "@/context/AuthContext";
import { useDomain } from "@/context/DomainContext";
import { getApiErrorMessage } from "@/lib/api-error";
import { DOMAINS } from "@/lib/fulfillment";

interface GeoServerEndpoint {
  id: number;
  name: string;
  url: string;
  type: string;
  status: "connected" | "disconnected";
}

interface NotificationSetting {
  id: string;
  title: string;
  desc: string;
  enabled: boolean;
}

const ADAPTER_TYPES = ["GIS_STUDIO", "REST_API", "OGC_WFS", "OGC_WMS", "ARCGIS", "GEONODE"];

const Settings = () => {
  const { participantId, role } = useAuth();
  const { domainId } = useDomain();
  const { data: connectionPoolsData, isLoading: isLoadingConnectionPools } = useConnectionPools();
  const { data: providersData } = useProviders();
  const createConnectionPoolMutation = useCreateConnectionPool();
  const deleteConnectionPoolMutation = useDeleteConnectionPool();

  // Adapter — hanya PROVIDER
  const { data: adaptersData, isLoading: loadingAdapters, refetch: refetchAdapters } =
    useParticipantAdapters(participantId ?? "");
  const addAdapterMutation = useAddParticipantAdapter();
  const updateAdapterMutation = useUpdateParticipantAdapter();
  const deleteAdapterMutation = useDeleteParticipantAdapter();

  const [adapterDialog, setAdapterDialog] = useState(false);
  const [editingAdapter, setEditingAdapter] = useState<any>(null);
  const [adapterForm, setAdapterForm] = useState({
    domain_id: domainId ?? "",
    type: "GIS_STUDIO",
    url: "",
  });
  const [connTestStatus, setConnTestStatus] = useState<Record<string, "idle"|"checking"|"ok"|"error">>({});

  const testAdapterConn = async (id: string, url: string) => {
    setConnTestStatus((p) => ({ ...p, [id]: "checking" }));
    try {
      await fetch(url, { method: "HEAD", mode: "no-cors" });
      setConnTestStatus((p) => ({ ...p, [id]: "ok" }));
    } catch {
      setConnTestStatus((p) => ({ ...p, [id]: "error" }));
    }
  };

  const openAddAdapter = () => {
    setEditingAdapter(null);
    setAdapterForm({ domain_id: domainId ?? "", type: "GIS_STUDIO", url: "" });
    setAdapterDialog(true);
  };
  const openEditAdapter = (a: any) => {
    setEditingAdapter(a);
    setAdapterForm({ domain_id: a.domain_id ?? "", type: a.type ?? "GIS_STUDIO", url: a.endpoint?.url ?? "" });
    setAdapterDialog(true);
  };
  const saveAdapter = async () => {
    if (!participantId) return toast.error("Akun tidak terhubung ke participant.");
    if (!adapterForm.url) return toast.error("URL endpoint wajib diisi.");
    try {
      const body = { domain_id: adapterForm.domain_id, type: adapterForm.type, endpoint: { url: adapterForm.url } };
      if (editingAdapter) {
        await updateAdapterMutation.mutateAsync({ participantId, id: editingAdapter.id, body });
        toast.success("Adapter diperbarui.");
      } else {
        await addAdapterMutation.mutateAsync({ participantId, body });
        toast.success("Adapter ditambahkan.");
      }
      setAdapterDialog(false);
      refetchAdapters();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal simpan adapter"));
    }
  };
  const removeAdapter = async (id: string) => {
    if (!participantId) return;
    try {
      await deleteAdapterMutation.mutateAsync({ participantId, id });
      toast.success("Adapter dihapus.");
      refetchAdapters();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal hapus adapter"));
    }
  };

  // Profile settings state
  const [profileForm, setProfileForm] = useState({
    name: "Super Admin",
    email: "admin@rapidsk.id",
    organization: "SKK Migas",
    role: "Super Admin",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Localization state
  const [localization, setLocalization] = useState({
    timezone: "Asia/Jakarta",
    language: "id",
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: true,
    sessionTimeout: true,
  });

  // Notification settings state
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: "dataset", title: "New Dataset Registered", desc: "When a new dataset is added to the catalog", enabled: true },
    { id: "contract", title: "Contract Requests", desc: "When a consumer requests data access", enabled: true },
    { id: "transfer", title: "Transfer Failures", desc: "When a data transfer fails", enabled: true },
    { id: "compliance", title: "Compliance Alerts", desc: "When compliance issues are detected", enabled: false },
    { id: "audit", title: "Audit Notifications", desc: "When audit events occur", enabled: false },
  ]);

  // GeoServer endpoints state
  const [geoServerEndpoints, setGeoServerEndpoints] = useState<GeoServerEndpoint[]>([
    { id: 1, name: "PHE ONWJ GeoServer", url: "https://geoserver.pheonwj.id", type: "WMS", status: "connected" },
    { id: 2, name: "Pertamina GeoServer", url: "https://geo.phe.id", type: "WFS", status: "connected" },
    { id: 3, name: "Chevron Data Server", url: "https://data.chevron.id", type: "WCS", status: "connected" },
    { id: 4, name: "Medco GeoServer", url: "https://geoserver.medco.id", type: "WMS", status: "connected" },
    { id: 5, name: "ExxonMobil GeoServer", url: "https://geo.exxon.id", type: "WMS", status: "connected" },
  ]);

  // Identity Provider state
  const [idpSettings, setIdpSettings] = useState({
    provider: "keycloak",
    realmUrl: "https://auth.rapidsk.id/realms/rapidsk",
    clientId: "rapidsk-web",
    clientSecret: "••••••••••••",
  });

  // Dialog states
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isGeoServerDialogOpen, setIsGeoServerDialogOpen] = useState(false);
  const [isIdpDialogOpen, setIsIdpDialogOpen] = useState(false);
  const [isAddEndpointDialogOpen, setIsAddEndpointDialogOpen] = useState(false);
  const [isConnectionPoolDialogOpen, setIsConnectionPoolDialogOpen] = useState(false);
  const [isAddConnectionPoolDialogOpen, setIsAddConnectionPoolDialogOpen] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // New endpoint form
  const [newEndpointForm, setNewEndpointForm] = useState({
    name: "",
    url: "",
    type: "WMS",
  });
  const [newConnectionPoolForm, setNewConnectionPoolForm] = useState({
    participant_id: participantId ?? "",
    name: "",
    type: "PROVIDER" as "CONSUMER" | "PROVIDER",
    token: "",
    url_consumer: "",
    url_provider: "",
  });

  const connectionPools = useMemo(
    () => (connectionPoolsData ?? []) as Array<{
      id: string;
      participant_id: string;
      name: string;
      type: "CONSUMER" | "PROVIDER";
      token: string;
      metadata: { url_consumer: string; url_provider: string };
    }>,
    [connectionPoolsData],
  );

  const providers = useMemo(
    () => (providersData ?? []) as Array<{ provider_id: string; provider_name: string }>,
    [providersData],
  );

  const providerNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const provider of providers) map[provider.provider_id] = provider.provider_name;
    return map;
  }, [providers]);

  // Handle save profile
  const handleSaveProfile = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Profile settings saved successfully");
  };

  // Handle save localization
  const handleSaveLocalization = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Localization settings saved successfully");
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
    setIsPasswordDialogOpen(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    toast.success("Password changed successfully");
  };

  // Handle toggle notification
  const handleToggleNotification = (id: string) => {
    setNotifications(
      notifications.map((n) =>
        n.id === id ? { ...n, enabled: !n.enabled } : n
      )
    );
    toast.success("Notification preference updated");
  };

  // Handle toggle security setting
  const handleToggleSecurity = (setting: "twoFactorEnabled" | "sessionTimeout") => {
    setSecuritySettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
    toast.success(
      setting === "twoFactorEnabled"
        ? `Two-Factor Authentication ${!securitySettings.twoFactorEnabled ? "enabled" : "disabled"}`
        : `Session Timeout ${!securitySettings.sessionTimeout ? "enabled" : "disabled"}`
    );
  };

  // Handle add GeoServer endpoint
  const handleAddEndpoint = () => {
    if (!newEndpointForm.name || !newEndpointForm.url) {
      toast.error("Please fill in all endpoint fields");
      return;
    }

    const newEndpoint: GeoServerEndpoint = {
      id: Math.max(...geoServerEndpoints.map((e) => e.id)) + 1,
      name: newEndpointForm.name,
      url: newEndpointForm.url,
      type: newEndpointForm.type,
      status: "connected",
    };

    setGeoServerEndpoints([...geoServerEndpoints, newEndpoint]);
    setNewEndpointForm({ name: "", url: "", type: "WMS" });
    setIsAddEndpointDialogOpen(false);
    toast.success("Endpoint added successfully");
  };

  // Handle remove endpoint
  const handleRemoveEndpoint = (id: number) => {
    setGeoServerEndpoints(geoServerEndpoints.filter((e) => e.id !== id));
    toast.success("Endpoint removed successfully");
  };

  const handleAddConnectionPool = async () => {
    if (
      !newConnectionPoolForm.participant_id ||
      !newConnectionPoolForm.name ||
      !newConnectionPoolForm.token ||
      !newConnectionPoolForm.url_consumer ||
      !newConnectionPoolForm.url_provider
    ) {
      toast.error("Please fill in all connection pool fields");
      return;
    }

    try {
      await createConnectionPoolMutation.mutateAsync({
        participant_id: newConnectionPoolForm.participant_id,
        name: newConnectionPoolForm.name,
        type: newConnectionPoolForm.type,
        token: newConnectionPoolForm.token,
        metadata: {
          url_consumer: newConnectionPoolForm.url_consumer,
          url_provider: newConnectionPoolForm.url_provider,
        },
      });
      setNewConnectionPoolForm({
        participant_id: participantId ?? "",
        name: "",
        type: "PROVIDER",
        token: "",
        url_consumer: "",
        url_provider: "",
      });
      setIsAddConnectionPoolDialogOpen(false);
      toast.success("Connection pool added successfully");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to add connection pool"));
    }
  };

  const handleRemoveConnectionPool = async (id: string) => {
    try {
      await deleteConnectionPoolMutation.mutateAsync(id);
      toast.success("Connection pool removed successfully");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to remove connection pool"));
    }
  };

  // Handle save IDP settings
  const handleSaveIdpSettings = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsIdpDialogOpen(false);
    toast.success("Identity Provider settings saved successfully");
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Settings"
        subtitle="Manage your account and system preferences"
      />
      <div className="p-6">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            {(role === "PROVIDER" || role === "ADMIN" || role === "SUPER_ADMIN") && (
              <TabsTrigger value="adapter">DS Adapter</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Settings
                </CardTitle>
                <CardDescription>
                  Manage your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org">Organization</Label>
                    <Input id="org" value={profileForm.organization} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={profileForm.role} disabled />
                  </div>
                </div>
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Localization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={localization.timezone}
                      onValueChange={(v) => setLocalization({ ...localization, timezone: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                        <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                        <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={localization.language}
                      onValueChange={(v) => setLocalization({ ...localization, language: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSaveLocalization}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Localization
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Authentication
                </CardTitle>
                <CardDescription>
                  Manage your security settings and authentication methods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {securitySettings.twoFactorEnabled && (
                      <Badge className="badge-active">Enabled</Badge>
                    )}
                    <Switch
                      checked={securitySettings.twoFactorEnabled}
                      onCheckedChange={() => handleToggleSecurity("twoFactorEnabled")}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Session Timeout</p>
                    <p className="text-sm text-muted-foreground">
                      Auto logout after 30 minutes of inactivity
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {securitySettings.sessionTimeout && (
                      <Badge className="badge-active">Enabled</Badge>
                    )}
                    <Switch
                      checked={securitySettings.sessionTimeout}
                      onCheckedChange={() => handleToggleSecurity("sessionTimeout")}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  SSL/TLS Certificate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                    <div>
                      <p className="font-medium text-success">Certificate Active</p>
                      <p className="text-sm text-muted-foreground">
                        Valid until: December 31, 2026
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose which notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {notifications.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.enabled && (
                        <Badge variant="secondary" className="text-xs">On</Badge>
                      )}
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={() => handleToggleNotification(item.id)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Connected Services
                </CardTitle>
                <CardDescription>
                  Manage external service connections and integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-info/10">
                        <Database className="w-5 h-5 text-info" />
                      </div>
                      <div>
                        <p className="font-medium">GeoServer</p>
                        <p className="text-sm text-muted-foreground">
                          Connected to {geoServerEndpoints.length} endpoints
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="badge-active">Connected</Badge>
                      <Button variant="outline" size="sm" onClick={() => setIsGeoServerDialogOpen(true)}>
                        Configure
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Key className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">Identity Provider</p>
                        <p className="text-sm text-muted-foreground">
                          {idpSettings.provider === "keycloak" ? "Keycloak" : "Azure AD"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="badge-active">Configured</Badge>
                      <Button variant="outline" size="sm" onClick={() => setIsIdpDialogOpen(true)}>
                        Configure
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <Database className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">Connection Pools</p>
                        <p className="text-sm text-muted-foreground">
                          {isLoadingConnectionPools ? "Loading connection pools..." : `${connectionPools.length} connector pools configured`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {isLoadingConnectionPools ? "Loading" : connectionPools.length > 0 ? "Configured" : "Empty"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => setIsConnectionPoolDialogOpen(true)}>
                        Configure
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DS Adapter Tab ─────────────────────────────────────── */}
          <TabsContent value="adapter" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" /> DS Adapter Configuration
                  </CardTitle>
                  <CardDescription>
                    Daftarkan adapter yang menghubungkan connector ke sumber data aktual (GeoServer, ArcGIS, GeoNode, dll).
                    Setiap adapter terikat ke satu domain wajib.
                  </CardDescription>
                </div>
                <Button onClick={openAddAdapter} disabled={!participantId}>
                  <Plus className="w-4 h-4 mr-2" /> Tambah Adapter
                </Button>
              </CardHeader>
              <CardContent>
                {!participantId && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <Shield className="w-4 h-4" /> Akun tidak terhubung ke participant — hanya operator KKKS yang dapat mengelola adapter.
                  </div>
                )}

                {loadingAdapters && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Memuat adapter…
                  </div>
                )}

                {!loadingAdapters && (adaptersData ?? []).length === 0 && participantId && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">Belum ada adapter terdaftar</p>
                    <p className="text-xs mt-1">Tambah adapter untuk setiap domain yang sumber datanya via GeoServer / ArcGIS / GeoNode.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {(adaptersData ?? []).map((a: any) => {
                    const domainLabel = DOMAINS.find((d) => d.key === a.domain_id || d.key === a.domain?.key)?.label ?? a.domain_id ?? "—";
                    const connSt = connTestStatus[a.id] ?? "idle";
                    return (
                      <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{domainLabel}</Badge>
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">{a.type ?? "GIS_STUDIO"}</Badge>
                            {connSt === "ok" && <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Online</Badge>}
                            {connSt === "error" && <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">Unreachable</Badge>}
                          </div>
                          <p className="text-xs font-mono text-muted-foreground truncate">{a.endpoint?.url ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => testAdapterConn(a.id, a.endpoint?.url ?? "")}
                            disabled={connSt === "checking"}
                          >
                            {connSt === "checking"
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Globe className="w-3 h-3" />}
                            <span className="ml-1">Test</span>
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditAdapter(a)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => removeAdapter(a.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Cara kerja adapter:</p>
                  <p>Dataset endpoint → <span className="font-mono bg-muted px-1 rounded">DS Adapter URL</span> → Adapter routing ke GeoServer/ArcGIS → Connector mengambil data sesuai standar SKK Migas.</p>
                  <p>Set endpoint URL dataset Anda ke URL adapter ini agar transfer data melalui adapter.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Adapter Dialog */}
        <Dialog open={adapterDialog} onOpenChange={setAdapterDialog}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle>{editingAdapter ? "Edit Adapter" : "Tambah DS Adapter"}</DialogTitle>
              <DialogDescription>
                Daftarkan endpoint adapter Anda untuk domain tertentu.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={adapterForm.domain_id} onValueChange={(v) => setAdapterForm((f) => ({ ...f, domain_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih domain" /></SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((d) => (
                      <SelectItem key={d.key} value={d.key}>{d.label} <span className="text-muted-foreground text-xs">({d.sub})</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipe Adapter</Label>
                <Select value={adapterForm.type} onValueChange={(v) => setAdapterForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADAPTER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Endpoint URL *</Label>
                <Input
                  value={adapterForm.url}
                  onChange={(e) => setAdapterForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://adapter.kkks.co.id/api/v1"
                />
                <p className="text-xs text-muted-foreground">URL service adapter Anda. Dataset endpoint harus diarahkan ke URL ini agar transfer via adapter.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdapterDialog(false)}>Batal</Button>
              <Button onClick={saveAdapter}
                disabled={addAdapterMutation.isPending || updateAdapterMutation.isPending || !adapterForm.url}>
                {(addAdapterMutation.isPending || updateAdapterMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingAdapter ? "Simpan Perubahan" : "Tambah Adapter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Change Password
              </DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentPwd">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPwd"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPwd">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPwd"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPwd">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPwd"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleChangePassword} disabled={isSaving} className="bg-accent hover:bg-accent/90">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Change Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GeoServer Configuration Dialog */}
        <Dialog open={isGeoServerDialogOpen} onOpenChange={setIsGeoServerDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                GeoServer Configuration
              </DialogTitle>
              <DialogDescription>
                Manage your GeoServer endpoint connections
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {geoServerEndpoints.length} endpoints configured
                </p>
                <Button size="sm" variant="outline" onClick={() => setIsAddEndpointDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Endpoint
                </Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {geoServerEndpoints.map((endpoint) => (
                  <div
                    key={endpoint.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-info/10">
                        <Database className="w-4 h-4 text-info" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{endpoint.name}</p>
                        <p className="text-xs text-muted-foreground">{endpoint.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{endpoint.type}</Badge>
                      <Badge className={endpoint.status === "connected" ? "badge-active" : "badge-inactive"}>
                        {endpoint.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveEndpoint(endpoint.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGeoServerDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Endpoint Dialog */}
        <Dialog open={isAddEndpointDialogOpen} onOpenChange={setIsAddEndpointDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Add GeoServer Endpoint</DialogTitle>
              <DialogDescription>
                Configure a new GeoServer endpoint connection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="endpointName">Endpoint Name</Label>
                <Input
                  id="endpointName"
                  placeholder="e.g., PHE ONWJ GeoServer"
                  value={newEndpointForm.name}
                  onChange={(e) => setNewEndpointForm({ ...newEndpointForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpointUrl">Endpoint URL</Label>
                <Input
                  id="endpointUrl"
                  placeholder="https://geoserver.example.com"
                  value={newEndpointForm.url}
                  onChange={(e) => setNewEndpointForm({ ...newEndpointForm, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select
                  value={newEndpointForm.type}
                  onValueChange={(v) => setNewEndpointForm({ ...newEndpointForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WMS">WMS (Web Map Service)</SelectItem>
                    <SelectItem value="WFS">WFS (Web Feature Service)</SelectItem>
                    <SelectItem value="WCS">WCS (Web Coverage Service)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddEndpointDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEndpoint} className="bg-accent hover:bg-accent/90">
                Add Endpoint
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Identity Provider Configuration Dialog */}
        <Dialog open={isIdpDialogOpen} onOpenChange={setIsIdpDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Identity Provider Configuration
              </DialogTitle>
              <DialogDescription>
                Configure your authentication provider settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Provider Type</Label>
                <Select
                  value={idpSettings.provider}
                  onValueChange={(v) => setIdpSettings({ ...idpSettings, provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keycloak">Keycloak</SelectItem>
                    <SelectItem value="azure">Azure AD</SelectItem>
                    <SelectItem value="okta">Okta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="realmUrl">Realm URL / Tenant URL</Label>
                <Input
                  id="realmUrl"
                  placeholder="https://auth.example.com/realms/your-realm"
                  value={idpSettings.realmUrl}
                  onChange={(e) => setIdpSettings({ ...idpSettings, realmUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  placeholder="your-client-id"
                  value={idpSettings.clientId}
                  onChange={(e) => setIdpSettings({ ...idpSettings, clientId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="your-client-secret"
                  value={idpSettings.clientSecret}
                  onChange={(e) => setIdpSettings({ ...idpSettings, clientSecret: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsIdpDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveIdpSettings} disabled={isSaving} className="bg-accent hover:bg-accent/90">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isConnectionPoolDialogOpen} onOpenChange={setIsConnectionPoolDialogOpen}>
          <DialogContent className="sm:max-w-[760px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Connection Pool Configuration
              </DialogTitle>
              <DialogDescription>
                Manage connector onboarding pools without changing the existing transfer flow.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {isLoadingConnectionPools ? "Loading..." : `${connectionPools.length} connection pools configured`}
                </p>
                <Button size="sm" variant="outline" onClick={() => setIsAddConnectionPoolDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pool
                </Button>
              </div>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {connectionPools.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No connection pools configured yet.
                  </div>
                ) : (
                  connectionPools.map((pool) => (
                    <div key={pool.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{pool.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Participant: {providerNameById[pool.participant_id] ?? pool.participant_id}
                        </p>
                        <p className="text-xs text-muted-foreground">Type: {pool.type}</p>
                        <p className="text-xs text-muted-foreground">Consumer URL: {pool.metadata?.url_consumer || "—"}</p>
                        <p className="text-xs text-muted-foreground">Provider URL: {pool.metadata?.url_provider || "—"}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveConnectionPool(pool.id)}
                        disabled={deleteConnectionPoolMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConnectionPoolDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddConnectionPoolDialogOpen} onOpenChange={setIsAddConnectionPoolDialogOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Add Connection Pool</DialogTitle>
              <DialogDescription>
                Register connector pool metadata already supported by the live backend.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Participant</Label>
                <Select
                  value={newConnectionPoolForm.participant_id}
                  onValueChange={(value) => setNewConnectionPoolForm({ ...newConnectionPoolForm, participant_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select participant" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.provider_id} value={provider.provider_id}>
                        {provider.provider_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newConnectionPoolForm.name}
                    onChange={(e) => setNewConnectionPoolForm({ ...newConnectionPoolForm, name: e.target.value })}
                    placeholder="Pool name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newConnectionPoolForm.type}
                    onValueChange={(value) =>
                      setNewConnectionPoolForm({
                        ...newConnectionPoolForm,
                        type: value as "CONSUMER" | "PROVIDER",
                      })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROVIDER">PROVIDER</SelectItem>
                      <SelectItem value="CONSUMER">CONSUMER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Token</Label>
                <Input
                  value={newConnectionPoolForm.token}
                  onChange={(e) => setNewConnectionPoolForm({ ...newConnectionPoolForm, token: e.target.value })}
                  placeholder="Connection pool token"
                />
              </div>
              <div className="space-y-2">
                <Label>Consumer URL</Label>
                <Input
                  value={newConnectionPoolForm.url_consumer}
                  onChange={(e) => setNewConnectionPoolForm({ ...newConnectionPoolForm, url_consumer: e.target.value })}
                  placeholder="http://consumer-host"
                />
              </div>
              <div className="space-y-2">
                <Label>Provider URL</Label>
                <Input
                  value={newConnectionPoolForm.url_provider}
                  onChange={(e) => setNewConnectionPoolForm({ ...newConnectionPoolForm, url_provider: e.target.value })}
                  placeholder="http://provider-host"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddConnectionPoolDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddConnectionPool}
                disabled={createConnectionPoolMutation.isPending}
                className="bg-accent hover:bg-accent/90"
              >
                {createConnectionPoolMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Add Pool
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Settings;
