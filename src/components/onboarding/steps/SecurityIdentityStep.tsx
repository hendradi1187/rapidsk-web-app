import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, Key, Lock, User, Eye, EyeOff } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useOnboarding } from "../OnboardingContext";
import { WizardNavigation } from "../WizardNavigation";
import { securitySchema, SecurityFormValues } from "../schemas/onboarding.schemas";
import { useEffect, useState } from "react";

export const SecurityIdentityStep = () => {
  const { formData, updateStepData, markStepComplete } = useOnboarding();
  const [showPassword, setShowPassword] = useState(false);

  const orgData = formData.organization;

  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: formData.security || {
      ssoType: "None",
      tlsEnabled: true,
      twoFactorAuth: false,
      password: "",
    },
  });

  useEffect(() => {
    if (formData.security) {
      form.reset(formData.security);
    }
  }, [formData.security, form]);

  const handleNext = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (isValid) {
      const values = form.getValues();
      updateStepData("security", values);
      markStepComplete(1);
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          {/* User Account Preview */}
          {orgData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="w-4 h-4 text-accent" />
                Akun Pengguna yang Akan Dibuat
              </div>
              <Separator />
              <div className="p-4 bg-muted/40 border border-border rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nama:</span>{" "}
                    <span className="font-medium">{orgData.participantName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-medium">{orgData.participantEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Role:</span>{" "}
                    <span className="font-medium">{orgData.participantRole}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Organisasi:</span>{" "}
                    <span className="font-medium">{orgData.orgName}</span>
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Akun</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Minimal 8 karakter"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Opsional. Jika dikosongkan, akun dibuat tanpa password (SSO only).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* SSO Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Key className="w-4 h-4 text-accent" />
              Konfigurasi SSO
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ssoType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe SSO</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe SSO" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="None">None (Local Auth)</SelectItem>
                        <SelectItem value="OIDC">OIDC (OpenID Connect)</SelectItem>
                        <SelectItem value="SAML">SAML 2.0</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Metode autentikasi yang digunakan organisasi
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Security Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Lock className="w-4 h-4 text-accent" />
              Pengaturan Keamanan
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tlsEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enkripsi TLS</FormLabel>
                      <FormDescription>
                        Aktifkan TLS/HTTPS untuk semua koneksi data
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="twoFactorAuth"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Two-Factor Auth (2FA)</FormLabel>
                      <FormDescription>
                        Wajibkan verifikasi dua langkah saat login
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Security summary */}
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Catatan</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Konfigurasi SSO (OIDC/SAML) bersifat indikatif pada tahap ini. Integrasi
              penuh dengan Identity Provider eksternal dilakukan di pengaturan lanjutan
              setelah onboarding selesai.
            </p>
          </div>
        </form>
      </Form>

      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
