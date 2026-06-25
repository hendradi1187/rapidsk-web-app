import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { registrationsApi } from "@/api/services/onboarding";
import { useOrganizations } from "@/api/hooks/useOrganizations";

const RegisterKKKS = () => {
  const { data: organizationsData, isLoading: organizationsLoading } = useOrganizations();
  const [form, setForm] = useState({
    organization_name: "",
    wilayah_kerja: "",
    operator_name: "",
    operator_email: "",
    operator_phone: "",
    note: "",
  });
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const organizations = useMemo(
    () =>
      ((organizationsData ?? []) as Array<{ organization_id: string; organization_name: string }>)
        .map((item) => ({
          organization_id: item.organization_id,
          organization_name: item.organization_name,
        }))
        .sort((left, right) => left.organization_name.localeCompare(right.organization_name)),
    [organizationsData],
  );
  const selectedOrganization = useMemo(
    () => organizations.find((item) => item.organization_id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId],
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!selectedOrganization && organizations.length > 0 && !selectedOrganizationId) {
      setSelectedOrganizationId(organizations[0].organization_id);
      return;
    }
    if (selectedOrganization) {
      setForm((current) => ({
        ...current,
        organization_name: selectedOrganization.organization_name,
      }));
    }
  }, [organizations, selectedOrganization, selectedOrganizationId]);

  const valid =
    !!selectedOrganizationId &&
    form.organization_name.trim().length >= 3 &&
    form.wilayah_kerja.trim().length >= 1 &&
    form.operator_name.trim().length >= 2 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.operator_email);

  const submit = async () => {
    if (!valid) {
      toast.error("Lengkapi nama KKKS, wilayah kerja, nama & email operator.");
      return;
    }
    setSubmitting(true);
    try {
      const noteSegments = [
        form.note.trim(),
        selectedOrganization
          ? `Referensi organisasi governance: ${selectedOrganization.organization_name} (${selectedOrganization.organization_id})`
          : "",
      ].filter(Boolean);

      await registrationsApi.create({
        organization_name: form.organization_name.trim(),
        wilayah_kerja: form.wilayah_kerja.trim(),
        operator_name: form.operator_name.trim(),
        operator_email: form.operator_email.trim(),
        operator_phone: form.operator_phone.trim() || undefined,
        note: noteSegments.join(" | ") || undefined,
      });
      setDone(true);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal mengirim pendaftaran"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="hero-gradient rounded-t-2xl p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pendaftaran KKKS</h1>
              <p className="text-white/70 text-sm">
                Daftar sebagai penyedia data (provider) SPEKTRUM IOG 4.0 — SKK Migas
              </p>
            </div>
          </div>
        </div>

        <div className="panel rounded-t-none p-6">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
              <h2 className="text-lg font-semibold mt-3">Pendaftaran terkirim</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                Pengajuan Anda menunggu verifikasi SKK Migas. Setelah disetujui,
                operator akan menerima <b>email aktivasi akun</b> untuk membuat kata
                sandi dan mulai memenuhi kewajiban data 5 domain.
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-5">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Ke halaman masuk
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div>
                    <Label className="text-sm font-medium">Organisasi Governance</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pilih organisasi yang sudah dibuat di sisi governance. Sumber ini dipakai bersama oleh login, pendaftaran KKKS, dan create participant supaya alurnya tidak pecah.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Daftar Organisasi Governance</Label>
                    <select
                      value={selectedOrganizationId}
                      onChange={(e) => setSelectedOrganizationId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      disabled={organizationsLoading || organizations.length === 0}
                    >
                      <option value="">
                        {organizationsLoading
                          ? "Memuat organisasi..."
                          : organizations.length === 0
                            ? "Belum ada organisasi governance"
                            : "-- Pilih organisasi --"}
                      </option>
                      {organizations.map((organization) => (
                        <option key={organization.organization_id} value={organization.organization_id}>
                          {organization.organization_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {organizations.length === 0 && !organizationsLoading ? (
                    <p className="text-xs text-amber-700">
                      Belum ada organisasi governance. Buat dulu dari menu organisasi atau setup juknis, baru pengajuan KKKS bisa dikirim.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Nama KKKS *</Label>
                  <Input
                    placeholder="mis. PT Pertamina Hulu Energi ONWJ"
                    value={form.organization_name}
                    onChange={(e) => set("organization_name", e.target.value)}
                    disabled={!!selectedOrganization}
                  />
                  {selectedOrganization && (
                    <p className="text-xs text-muted-foreground">
                      Nama ini mengikuti organisasi governance yang dipilih supaya proses approval tidak perlu nebak ulang.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Wilayah Kerja *</Label>
                  <Input
                    placeholder="mis. Offshore North West Java"
                    value={form.wilayah_kerja}
                    onChange={(e) => set("wilayah_kerja", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Operator *</Label>
                    <Input
                      placeholder="Nama PIC operator"
                      value={form.operator_name}
                      onChange={(e) => set("operator_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telepon Operator</Label>
                    <Input
                      placeholder="+62-..."
                      value={form.operator_phone}
                      onChange={(e) => set("operator_phone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email Operator *</Label>
                  <Input
                    type="email"
                    placeholder="operator@kkks.co.id"
                    value={form.operator_email}
                    onChange={(e) => set("operator_email", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Email ini akan menerima tautan aktivasi akun setelah disetujui.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Catatan (opsional)</Label>
                  <Textarea
                    rows={2}
                    value={form.note}
                    onChange={(e) => set("note", e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="w-full mt-5 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={submit}
                disabled={!valid || submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Kirim Pendaftaran
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Sudah punya akun?{" "}
                <Link to="/login" className="text-accent hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterKKKS;
