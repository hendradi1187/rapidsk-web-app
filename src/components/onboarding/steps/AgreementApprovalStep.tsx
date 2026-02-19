import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Handshake,
  AlertCircle,
  FileText,
  Users,
  Calendar,
  Shield,
  Gavel,
  PenLine,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "../OnboardingContext";
import { WizardNavigation } from "../WizardNavigation";
import { agreementSchema, AgreementFormValues } from "../schemas/onboarding.schemas";
import { useEffect } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const calcEndDate = (startDate: string, endDate?: string): string => {
  if (endDate) return endDate;
  const d = new Date(startDate);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value?: string }) => (
  <div>
    <span className="text-xs text-muted-foreground">{label}</span>
    <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AgreementApprovalStep = () => {
  const { formData, updateStepData, markStepComplete } = useOnboarding();

  const contract = formData.contractRequest;
  const policy = formData.policy;
  const orgData = formData.organization;

  const effectiveTo = contract
    ? calcEndDate(contract.startDate, contract.endDate)
    : "";

  const form = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementSchema),
    defaultValues: formData.agreement || {
      digitalSignature: "",
      approved: false,
    },
  });

  useEffect(() => {
    if (formData.agreement) {
      form.reset(formData.agreement);
    }
  }, [formData.agreement, form]);

  const handleNext = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (isValid) {
      updateStepData("agreement", form.getValues());
      markStepComplete(7);
      return true;
    }
    return false;
  };

  // Guard: contract step must be completed first
  if (!contract) {
    return (
      <div className="space-y-6">
        <div className="p-6 border border-destructive/30 bg-destructive/5 rounded-lg flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-destructive">
              Data Kontrak Belum Ada
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Kembali ke step <strong>Contract Request</strong> dan lengkapi data kontrak
              sebelum melakukan persetujuan.
            </p>
          </div>
        </div>
        <WizardNavigation />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">

          {/* Contract Summary */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="w-4 h-4 text-accent" />
              Ringkasan Kontrak
            </div>
            <Separator />
            <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Judul Kontrak" value={contract.title} />
                <InfoRow
                  label="Domain"
                  value={orgData?.domainName || orgData?.domainCode}
                />
              </div>
              {contract.description && (
                <InfoRow label="Deskripsi" value={contract.description} />
              )}
            </div>
          </div>

          {/* Parties */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="w-4 h-4 text-accent" />
              Pihak-pihak Terkait
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-1">
                <p className="text-xs text-muted-foreground">Provider (Penyedia Data)</p>
                <p className="text-sm font-semibold">{contract.provider}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-1">
                <p className="text-xs text-muted-foreground">Consumer (Penerima Data)</p>
                <p className="text-sm font-semibold">{contract.consumer}</p>
              </div>
            </div>
          </div>

          {/* Effective Period */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="w-4 h-4 text-accent" />
              Periode Berlaku
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-1">
                <p className="text-xs text-muted-foreground">Berlaku Mulai</p>
                <p className="text-sm font-semibold">{formatDate(contract.startDate)}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Berlaku Hingga
                  {!contract.endDate && (
                    <span className="ml-1 text-accent">(default +1 tahun)</span>
                  )}
                </p>
                <p className="text-sm font-semibold">{formatDate(effectiveTo)}</p>
              </div>
            </div>
          </div>

          {/* Dataset Policy Summary */}
          {policy && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Gavel className="w-4 h-4 text-accent" />
                Dataset Policy
              </div>
              <Separator />
              <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{policy.policyName}</span>
                  <Badge variant="outline" className="text-xs">{policy.type}</Badge>
                  <Badge variant="outline" className="text-xs">v{policy.version}</Badge>
                </div>
                {policy.rules.length > 0 && (
                  <div className="space-y-1.5">
                    {policy.rules.map((rule, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs font-mono bg-background border border-border rounded px-2 py-1"
                      >
                        <span className="text-blue-500">{rule.left_operand}</span>
                        <span className="text-muted-foreground">{rule.operator}</span>
                        <span className="text-green-500">{rule.right_operand}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contract Policies Summary */}
          {contract.policies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="w-4 h-4 text-accent" />
                Contract Policies
              </div>
              <Separator />
              <div className="space-y-2">
                {contract.policies.map((cp, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between p-3 border border-border rounded-lg bg-muted/20"
                  >
                    <div>
                      <p className="text-sm font-medium">{cp.name}</p>
                      {cp.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{cp.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                      {cp.dataClassification}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <PenLine className="w-4 h-4 text-accent" />
              Persetujuan & Tanda Tangan
            </div>
            <Separator />

            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-muted-foreground">
              Dengan menandatangani dokumen ini, Anda menyatakan telah membaca, memahami,
              dan menyetujui semua ketentuan kontrak data sharing di atas. Tanda tangan
              digital ini akan dicatat sebagai bukti persetujuan yang sah.
            </div>

            <FormField
              control={form.control}
              name="digitalSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanda Tangan Digital *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`Ketik nama lengkap Anda sebagai tanda tangan — ${orgData?.participantName || "Nama Anda"}`}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Ketik nama lengkap Anda persis seperti yang terdaftar sebagai bentuk
                    tanda tangan digital.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="approved"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium cursor-pointer">
                      Saya menyetujui semua ketentuan kontrak ini
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Persetujuan ini mencakup data sharing policy, contract policies, dan
                      periode berlaku yang telah ditentukan di atas.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Agreement badge */}
          <div className="flex items-center gap-3 p-4 border border-accent/20 bg-accent/5 rounded-lg">
            <Handshake className="w-5 h-5 text-accent shrink-0" />
            <p className="text-xs text-muted-foreground">
              Setelah disetujui, sistem akan membuat <strong>Agreement</strong> resmi yang
              mengikat kontrak antara{" "}
              <strong>{contract.provider}</strong> dan{" "}
              <strong>{contract.consumer}</strong> dengan periode{" "}
              <strong>{formatDate(contract.startDate)}</strong> –{" "}
              <strong>{formatDate(effectiveTo)}</strong>.
            </p>
          </div>
        </form>
      </Form>

      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
