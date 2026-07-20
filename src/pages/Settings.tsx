import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  Link,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useConnectionPools } from "@/api/hooks/useConnectionPools";
import { useProviders } from "@/api/hooks/useProviders";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api-error";
import { ROLE_LABELS } from "@/config/rbac";
import { usersService } from "@/api/services/identity-provider";

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

const ADMIN_LIKE_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;

const Settings = () => {
  const navigate = useNavigate();
  const { participantId, role, user, setAuthUser } = useAuth();
  const { data: connectionPoolsData, isLoading: isLoadingConnectionPools } = useConnectionPools();
  const { data: providersData } = useProviders();

  const isAdminLike = ADMIN_LIKE_ROLES.includes(role as (typeof ADMIN_LIKE_ROLES)[number]);
  const isProvider = role === "PROVIDER";
  // Adapter kini modul sidebar sendiri (/adapter); provider default ke tab Akun.
  const defaultSettingsTab = isProvider ? "general" : "integrations";

  // Deep-link ?tab=<nama> — dihormati sebagai nilai awal, fallback ke defaultSettingsTab.
  // Tab dikontrol supaya perubahan dari user + deep-link konsisten dan URL selalu mencerminkan tab aktif.
  const [searchParams, setSearchParams] = useSearchParams();
  const VALID_TABS = ["general", "integrations", "security", "notifications"];
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : defaultSettingsTab,
  );
  useEffect(() => {
    // Adapter kini modul sendiri: deep-link lama ?tab=adapter diarahkan ke /adapter.
    if (tabParam === "adapter") {
      navigate("/adapter", { replace: true });
      return;
    }
    if (tabParam && VALID_TABS.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  const currentParticipant = useMemo(
    () => ((providersData ?? []) as Array<any>).find((item) => item.provider_id === participantId) ?? null,
    [providersData, participantId],
  );

  // Profile settings state
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    organization: "",
    role: "",
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
    { id: "dataset", title: "Dataset Baru", desc: "Saat ada dataset baru masuk ke katalog", enabled: true },
    { id: "contract", title: "Permintaan Kontrak", desc: "Saat consumer mengajukan akses data", enabled: true },
    { id: "transfer", title: "Transfer Gagal", desc: "Saat proses transfer data tidak selesai", enabled: true },
    { id: "compliance", title: "Peringatan Kepatuhan", desc: "Saat ada isu kepatuhan yang perlu dicek", enabled: false },
    { id: "audit", title: "Aktivitas Audit", desc: "Saat ada kejadian penting yang tercatat di audit trail", enabled: false },
  ]);

  // GeoServer endpoints state
  const [geoServerEndpoints, setGeoServerEndpoints] = useState<GeoServerEndpoint[]>([
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

  useEffect(() => {
    setProfileForm({
      name: user?.full_name ?? "",
      email: user?.email ?? "",
      organization:
        currentParticipant?.provider_name ??
        user?.category?.name ??
        "",
      role: ROLE_LABELS[role] ?? role,
    });
  }, [currentParticipant?.provider_name, role, user]);

  // Handle save profile
  const handleSaveProfile = async () => {
    if (!user?.id) {
      toast.error("User aktif tidak ditemukan.");
      return;
    }

    try {
      setIsSaving(true);
      await usersService.update(user.id, {
        full_name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      });

      const nextUser = {
        ...user,
        full_name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      };

      setAuthUser(nextUser);
      localStorage.setItem("user_info", JSON.stringify(nextUser));
      toast.success("Profil berhasil diperbarui.");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal memperbarui profil"));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle save localization
  const handleSaveLocalization = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Preferensi tampilan berhasil disimpan.");
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Lengkapi semua kolom kata sandi.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Konfirmasi kata sandi baru belum cocok.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Kata sandi minimal 8 karakter.");
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
    setIsPasswordDialogOpen(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    toast.success("Kata sandi berhasil diperbarui.");
  };

  // Handle toggle notification
  const handleToggleNotification = (id: string) => {
    setNotifications(
      notifications.map((n) =>
        n.id === id ? { ...n, enabled: !n.enabled } : n
      )
    );
    toast.success("Preferensi notifikasi diperbarui.");
  };

  // Handle toggle security setting
  const handleToggleSecurity = (setting: "twoFactorEnabled" | "sessionTimeout") => {
    setSecuritySettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
    toast.success(
      setting === "twoFactorEnabled"
        ? `Autentikasi dua langkah ${!securitySettings.twoFactorEnabled ? "diaktifkan" : "dimatikan"}`
        : `Batas waktu sesi ${!securitySettings.sessionTimeout ? "diaktifkan" : "dimatikan"}`
    );
  };

  // URL validator — hanya http(s) yang valid
  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Handle add GeoServer endpoint
  const handleAddEndpoint = () => {
    const trimmedName = newEndpointForm.name.trim();
    const trimmedUrl = newEndpointForm.url.trim();
    if (!trimmedName || !trimmedUrl) {
      toast.error("Lengkapi nama dan URL endpoint dulu.");
      return;
    }
    if (!isValidUrl(newEndpointForm.url)) {
      toast.error("URL tidak valid. Gunakan format https://domain.com");
      return;
    }

    const newEndpoint: GeoServerEndpoint = {
      id: Math.max(0, ...geoServerEndpoints.map((e) => e.id)) + 1,
      name: trimmedName,
      url: trimmedUrl,
      type: newEndpointForm.type,
      status: "connected",
    };

    setGeoServerEndpoints([...geoServerEndpoints, newEndpoint]);
    setNewEndpointForm({ name: "", url: "", type: "WMS" });
    setIsAddEndpointDialogOpen(false);
    toast.success("Endpoint berhasil ditambahkan.");
  };

  // Handle remove endpoint
  const handleRemoveEndpoint = (id: number) => {
    setGeoServerEndpoints(geoServerEndpoints.filter((e) => e.id !== id));
    toast.success("Endpoint berhasil dihapus.");
  };

  // Handle save IDP settings
  const handleSaveIdpSettings = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsIdpDialogOpen(false);
    toast.success("Pengaturan identity provider berhasil disimpan.");
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Pengaturan"
        subtitle="Pengaturan akun, koneksi, dan proses kerja"
      />
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="general">Akun</TabsTrigger>
            {!isProvider ? <TabsTrigger value="integrations">Koneksi & Akses</TabsTrigger> : null}
            {isAdminLike && <TabsTrigger value="security">Keamanan</TabsTrigger>}
            {isAdminLike && <TabsTrigger value="notifications">Notifikasi</TabsTrigger>}
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informasi Akun
                </CardTitle>
                <CardDescription>
                  Perbarui identitas operator yang sedang aktif dan lihat keterkaitannya dengan organisasi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
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
                    <Label htmlFor="org">Organisasi</Label>
                    <Input id="org" value={profileForm.organization} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Peran</Label>
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
                  Simpan Perubahan
                </Button>
              </CardContent>
            </Card>

            {isAdminLike && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Preferensi Tampilan
                </CardTitle>
                <CardDescription>
                  Dipakai untuk pengaturan umum yang tidak mengubah flow bisnis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Zona Waktu</Label>
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
                    <Label>Bahasa</Label>
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
                  Simpan Preferensi
                </Button>
              </CardContent>
            </Card>
            )}
          </TabsContent>

          {isAdminLike && (
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Autentikasi
                </CardTitle>
                <CardDescription>
                  Kelola metode login dan pengamanan akses operator.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Autentikasi Dua Langkah</p>
                    <p className="text-sm text-muted-foreground">
                      Tambahkan lapisan verifikasi tambahan untuk akun ini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {securitySettings.twoFactorEnabled && (
                      <Badge className="badge-active">Aktif</Badge>
                    )}
                    <Switch
                      checked={securitySettings.twoFactorEnabled}
                      onCheckedChange={() => handleToggleSecurity("twoFactorEnabled")}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Batas Waktu Sesi</p>
                    <p className="text-sm text-muted-foreground">
                      Keluar otomatis setelah 30 menit tanpa aktivitas.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {securitySettings.sessionTimeout && (
                      <Badge className="badge-active">Aktif</Badge>
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
                    Ubah Kata Sandi
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Sertifikat SSL/TLS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                    <div>
                      <p className="font-medium text-success">Sertifikat Aktif</p>
                      <p className="text-sm text-muted-foreground">
                        Berlaku sampai: 31 Desember 2026
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {isAdminLike && (
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Preferensi Notifikasi
                </CardTitle>
                <CardDescription>
                  Tentukan notifikasi apa saja yang ingin tetap tampil.
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
                        <Badge variant="secondary" className="text-xs">Aktif</Badge>
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
          )}

          <TabsContent value="integrations" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Urutan Koneksi Dasar</CardTitle>
                <CardDescription>
                  Mulai dari identitas layanan, lanjut ke sumber data, lalu pastikan jalur pertukaran sudah siap.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Tahap 1</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Identitas Layanan</p>
                  <p className="mt-2 text-sm text-slate-600">Pastikan metode login dan identitas layanan sudah sesuai dengan lingkungan yang dipakai.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Tahap 2</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Sumber Data</p>
                  <p className="mt-2 text-sm text-slate-600">Daftarkan layanan sumber yang akan diakses atau dirutekan oleh participant.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Tahap 3</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Jalur Pertukaran</p>
                  <p className="mt-2 text-sm text-slate-600">Simpan data koneksi yang dipakai saat proses pertukaran antar participant dijalankan.</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Koneksi dan Akses
                </CardTitle>
                <CardDescription>
                  Semua pengaturan teknis dasar dikumpulkan di sini dengan urutan yang lebih jelas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-info/10">
                        <Key className="w-5 h-5 text-info" />
                      </div>
                      <div>
                        <p className="font-medium">Identitas Layanan</p>
                        <p className="text-sm text-muted-foreground">
                          {idpSettings.provider === "keycloak" ? "Keycloak" : "Azure AD"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="badge-active">Terhubung</Badge>
                      <Button variant="outline" size="sm" onClick={() => setIsIdpDialogOpen(true)}>
                        Atur
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Database className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">Sumber Data</p>
                        <p className="text-sm text-muted-foreground">
                          Terhubung ke {geoServerEndpoints.length} layanan
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="badge-active">Siap</Badge>
                      <Button variant="outline" size="sm" onClick={() => setIsGeoServerDialogOpen(true)}>
                        Atur
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
                        <p className="font-medium">Jalur Pertukaran</p>
                        <p className="text-sm text-muted-foreground">
                          {isLoadingConnectionPools ? "Memuat registry..." : `${connectionPools.length} registry control plane tersedia`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {isLoadingConnectionPools ? "Loading" : connectionPools.length > 0 ? "Admin Managed" : "Empty"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => navigate("/connection-pools")}>
                        Buka Modul
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>


        {/* Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Ubah Kata Sandi
              </DialogTitle>
              <DialogDescription>
                Masukkan kata sandi saat ini lalu tentukan yang baru.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentPwd">Kata Sandi Saat Ini</Label>
                <div className="relative">
                  <Input
                    id="currentPwd"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Masukkan kata sandi saat ini"
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
                <Label htmlFor="newPwd">Kata Sandi Baru</Label>
                <div className="relative">
                  <Input
                    id="newPwd"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Masukkan kata sandi baru"
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
                <Label htmlFor="confirmPwd">Konfirmasi Kata Sandi Baru</Label>
                <div className="relative">
                  <Input
                    id="confirmPwd"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Ulangi kata sandi baru"
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
                Kata sandi minimal 8 karakter.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleChangePassword} disabled={isSaving} className="bg-accent hover:bg-accent/90">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Simpan Kata Sandi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GeoServer Configuration Dialog */}
        <Dialog open={isGeoServerDialogOpen} onOpenChange={setIsGeoServerDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Konfigurasi GeoServer
              </DialogTitle>
              <DialogDescription>
                Kelola daftar endpoint GeoServer yang dipakai di lingkungan ini.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {geoServerEndpoints.length} endpoint tersimpan
                </p>
                <Button size="sm" variant="outline" onClick={() => setIsAddEndpointDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Endpoint
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
                        {endpoint.status === "connected" ? "Terhubung" : "Terputus"}
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
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Endpoint Dialog */}
        <Dialog open={isAddEndpointDialogOpen} onOpenChange={setIsAddEndpointDialogOpen}>
          <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Endpoint GeoServer</DialogTitle>
              <DialogDescription>
                Tambahkan satu jalur endpoint baru untuk kebutuhan integrasi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="endpointName">Nama Endpoint</Label>
                <Input
                  id="endpointName"
                  placeholder="Contoh: PHE ONWJ GeoServer"
                  value={newEndpointForm.name}
                  onChange={(e) => setNewEndpointForm({ ...newEndpointForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpointUrl">URL Endpoint</Label>
                <Input
                  id="endpointUrl"
                  placeholder="https://geoserver.example.com"
                  value={newEndpointForm.url}
                  onChange={(e) => setNewEndpointForm({ ...newEndpointForm, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipe Layanan</Label>
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
                Batal
              </Button>
              <Button onClick={handleAddEndpoint} className="bg-accent hover:bg-accent/90">
                Tambah Endpoint
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Identity Provider Configuration Dialog */}
        <Dialog open={isIdpDialogOpen} onOpenChange={setIsIdpDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Konfigurasi Identity Provider
              </DialogTitle>
              <DialogDescription>
                Atur sumber autentikasi yang dipakai aplikasi ini.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Jenis Provider</Label>
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
                <Label htmlFor="realmUrl">URL Realm / Tenant</Label>
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
                  placeholder="client-id-aplikasi"
                  value={idpSettings.clientId}
                  onChange={(e) => setIdpSettings({ ...idpSettings, clientId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="client-secret-aplikasi"
                  value={idpSettings.clientSecret}
                  onChange={(e) => setIdpSettings({ ...idpSettings, clientSecret: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsIdpDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveIdpSettings} disabled={isSaving} className="bg-accent hover:bg-accent/90">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Konfigurasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Settings;
