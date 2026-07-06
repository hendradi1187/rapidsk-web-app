import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useRuntime } from "@/context/RuntimeContext";
import { runtimeApi } from "@/api/services/runtime";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api-error";
import { canManageDeploymentConfig } from "@/lib/feature-access";

const DeploymentConfig = () => {
  const { runtimeConfig, licenseState, refreshRuntime } = useRuntime();
  const { role, roles, hasPermission } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const [form, setForm] = useState({
    publicAppUrl: runtimeConfig?.publicAppUrl ?? window.location.origin,
    apiBaseUrl: runtimeConfig?.apiBaseUrl ?? "/api/v1",
    adapterEndpoint: runtimeConfig?.adapterEndpoint ?? "",
    ssoEnabled: runtimeConfig?.sso.enabled ?? false,
    keycloakUrl: runtimeConfig?.sso.keycloakUrl ?? "",
    realm: runtimeConfig?.sso.realm ?? "",
    clientId: runtimeConfig?.sso.clientId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [refreshingOrganizations, setRefreshingOrganizations] = useState(false);
  const [localLicense, setLocalLicense] = useState(licenseState);
  const [warnings, setWarnings] = useState<string[]>([]);
  const isAdmin = canManageDeploymentConfig({ role, roles, hasPermission });

  useEffect(() => {
    setForm({
      publicAppUrl: runtimeConfig?.publicAppUrl ?? window.location.origin,
      apiBaseUrl: runtimeConfig?.apiBaseUrl ?? "/api/v1",
      adapterEndpoint: runtimeConfig?.adapterEndpoint ?? "",
      ssoEnabled: runtimeConfig?.sso.enabled ?? false,
      keycloakUrl: runtimeConfig?.sso.keycloakUrl ?? "",
      realm: runtimeConfig?.sso.realm ?? "",
      clientId: runtimeConfig?.sso.clientId ?? "",
    });
  }, [runtimeConfig]);

  useEffect(() => {
    setLocalLicense(licenseState);
  }, [licenseState]);

  const ssoPayload = useMemo(
    () => ({
      enabled: form.ssoEnabled,
      keycloakUrl: form.keycloakUrl.trim(),
      realm: form.realm.trim(),
      clientId: form.clientId.trim(),
    }),
    [form],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await runtimeApi.updateRuntimeConfig(
        {
          publicAppUrl: form.publicAppUrl.trim(),
          apiBaseUrl: form.apiBaseUrl.trim(),
          adapterEndpoint: form.adapterEndpoint.trim(),
          sso: ssoPayload,
        },
        token,
      );
      setWarnings(result.setupStatus.warnings);
      await refreshRuntime();
      toast.success("Runtime config tersimpan. Reload browser jika SSO berubah.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan runtime config."));
    } finally {
      setSaving(false);
    }
  };

  const handleRevalidateLicense = async () => {
    setRevalidating(true);
    try {
      const result = await runtimeApi.revalidateLicense(token);
      setLocalLicense(result.licenseState);
      setWarnings(result.warnings);
      toast.success("License berhasil divalidasi ulang.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal revalidate license."));
    } finally {
      setRevalidating(false);
    }
  };

  const handleRefreshPublicOrganizations = async () => {
    setRefreshingOrganizations(true);
    try {
      const result = await runtimeApi.refreshPublicOrganizations(token);
      setWarnings((prev) => [
        ...prev.filter((item) => item !== "Cache organisasi publik sudah diperbarui dari CTS."),
        "Cache organisasi publik sudah diperbarui dari CTS.",
      ]);
      localStorage.setItem("cached_orgs", JSON.stringify(result.data));
      toast.success(`${result.refreshed} organisasi publik berhasil disinkronkan.`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyinkronkan organisasi publik."));
    } finally {
      setRefreshingOrganizations(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Header title="Konfigurasi Sistem" subtitle="Hanya untuk admin runtime" />
        <div className="p-6">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Halaman ini hanya tersedia untuk admin runtime.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Konfigurasi Sistem"
        subtitle="Kelola alamat layanan, jalur adapter, dan status lisensi tanpa perlu build ulang."
      />
      <div className="space-y-6 p-6">
        <Card className="panel">
          <CardHeader>
            <CardTitle>Runtime Aplikasi</CardTitle>
            <CardDescription>Setiap perubahan di sini langsung disimpan ke file konfigurasi runtime di server.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="publicAppUrl">URL Aplikasi</Label>
                <Input
                  id="publicAppUrl"
                  value={form.publicAppUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, publicAppUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiBaseUrl">URL API Utama</Label>
                <Input
                  id="apiBaseUrl"
                  value={form.apiBaseUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, apiBaseUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adapterEndpoint">URL Adapter</Label>
                <Input
                  id="adapterEndpoint"
                  value={form.adapterEndpoint}
                  onChange={(e) => setForm((prev) => ({ ...prev, adapterEndpoint: e.target.value }))}
                  placeholder="http://100.66.10.14:8182"
                />
                <p className="text-xs text-muted-foreground">
                  Dipakai oleh alur proses data di sisi provider. Boleh dikosongkan saat awal pemasangan, tetapi proses validasi data belum bisa dijalankan sampai alamat ini terisi.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Aktifkan SSO / Keycloak</p>
                  <p className="text-sm text-muted-foreground">
                    Ubah konfigurasi login terpusat tanpa menyentuh hasil build.
                  </p>
                </div>
                <Switch
                  checked={form.ssoEnabled}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, ssoEnabled: checked }))}
                />
              </div>

              {form.ssoEnabled && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="keycloakUrl">URL Keycloak</Label>
                    <Input
                      id="keycloakUrl"
                      value={form.keycloakUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, keycloakUrl: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="realm">Realm</Label>
                    <Input
                      id="realm"
                      value={form.realm}
                      onChange={(e) => setForm((prev) => ({ ...prev, realm: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      value={form.clientId}
                      onChange={(e) => setForm((prev) => ({ ...prev, clientId: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Konfigurasi
              </Button>
              <Button variant="outline" onClick={handleRefreshPublicOrganizations} disabled={refreshingOrganizations}>
                {refreshingOrganizations ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sinkronkan Organisasi Login
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tombol sinkronisasi ini memperbarui cache organisasi publik yang dipakai dropdown login supaya host wrapper tidak terus menampilkan daftar lama.
            </p>
          </CardContent>
        </Card>

        <Card className="panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" />
              Status Lisensi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Kunci Tersamarkan</p>
                <p className="mt-1 font-medium">{localLicense?.licenseKeyMasked || "—"}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={localLicense?.licenseStatus === "ACTIVE" ? "outline" : "secondary"}>
                    {localLicense?.licenseStatus || "BELUM DIKETAHUI"}
                  </Badge>
                  {localLicense?.licensedHost && (
                    <span className="text-xs text-muted-foreground">{localLicense.licensedHost}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Aktif Sejak</p>
                <p className="mt-1 text-sm">{localLicense?.activatedAt || "—"}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Berlaku Sampai</p>
                <p className="mt-1 text-sm">{localLicense?.expiresAt || "—"}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Validasi Terakhir</p>
                <p className="mt-1 text-sm">{localLicense?.lastValidationAt || "—"}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRevalidateLicense} disabled={revalidating}>
                {revalidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Cek Ulang Lisensi
              </Button>
            </div>
          </CardContent>
        </Card>

        {warnings.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <p className="font-medium">Perlu Diperhatikan</p>
              </div>
              {warnings.map((warning) => (
                <p key={warning} className="text-sm text-amber-200/90">
                  {warning}
                </p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DeploymentConfig;
