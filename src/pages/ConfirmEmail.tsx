import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { usersApi } from "@/api/services/identity";

const ConfirmEmail = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const valid = token && pwd.length >= 6 && pwd === confirm;

  const submit = async () => {
    if (!token) {
      toast.error("Token aktivasi tidak ditemukan pada tautan.");
      return;
    }
    if (pwd.length < 6) {
      toast.error("Kata sandi minimal 6 karakter.");
      return;
    }
    if (pwd !== confirm) {
      toast.error("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setSubmitting(true);
    try {
      await usersApi.confirmEmail(token, pwd);
      setDone(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Aktivasi gagal / token kedaluwarsa.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="hero-gradient rounded-t-2xl p-6 text-white flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Aktivasi Akun Operator</h1>
            <p className="text-white/70 text-sm">Buat kata sandi untuk mengaktifkan akun</p>
          </div>
        </div>

        <div className="panel rounded-t-none p-6">
          {!token ? (
            <div className="text-center py-6">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <p className="mt-3 text-sm text-muted-foreground">
                Tautan tidak memuat token aktivasi. Buka tautan dari email undangan
                Anda.
              </p>
            </div>
          ) : done ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
              <h2 className="text-lg font-semibold mt-3">Akun aktif</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Kata sandi berhasil dibuat. Silakan masuk dan penuhi kewajiban data
                Anda.
              </p>
              <Link to="/login">
                <Button className="mt-5 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Masuk sekarang
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Kata Sandi Baru</Label>
                <Input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ulangi Kata Sandi</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={submit}
                disabled={!valid || submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Aktifkan Akun
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail;
