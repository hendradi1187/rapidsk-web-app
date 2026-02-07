import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, Shield, Bell, CheckCircle2, Loader2, AlertCircle, PartyPopper } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useOnboarding } from "../OnboardingContext";
import { WizardNavigation } from "../WizardNavigation";
import { monitoringSchema, MonitoringFormValues } from "../schemas/onboarding.schemas";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const complianceFrameworks = [
  { id: "ISO27001", label: "ISO 27001", description: "Information Security Management" },
  { id: "COBIT", label: "COBIT", description: "IT Governance Framework" },
  { id: "SKKMigas", label: "SKK Migas", description: "Regulatory Compliance" },
  { id: "ITIL4", label: "ITIL 4", description: "IT Service Management" },
];

export const EnableMonitoringStep = () => {
  const navigate = useNavigate();
  const {
    formData,
    updateStepData,
    markStepComplete,
    completedSteps,
    isSubmitting,
    submissionError,
    submissionResult,
    isOnboardingComplete,
    submitOnboarding,
    resetWizard,
  } = useOnboarding();

  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [currentSubmissionStep, setCurrentSubmissionStep] = useState("");
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const form = useForm<MonitoringFormValues>({
    resolver: zodResolver(monitoringSchema),
    defaultValues: formData.monitoring || {
      enableAuditLog: true,
      retentionPeriod: 90,
      alertEmail: "",
      complianceFrameworks: [],
      enableRealTimeAlerts: false,
    },
  });

  useEffect(() => {
    if (formData.monitoring) {
      form.reset(formData.monitoring);
    }
  }, [formData.monitoring, form]);

  // Simulate progress during submission
  useEffect(() => {
    if (isSubmitting) {
      const steps = [
        "Creating organization...",
        "Defining vocabulary...",
        "Registering dataset...",
        "Setting up contract...",
        "Configuring transfer...",
        "Enabling monitoring...",
      ];
      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < steps.length) {
          setCurrentSubmissionStep(steps[stepIndex]);
          setSubmissionProgress(((stepIndex + 1) / steps.length) * 100);
          stepIndex++;
        }
      }, 1000);

      return () => clearInterval(progressInterval);
    } else {
      setSubmissionProgress(0);
      setCurrentSubmissionStep("");
    }
  }, [isSubmitting]);

  // Redirect to dashboard after successful onboarding
  useEffect(() => {
    if (isOnboardingComplete && submissionResult?.success && !isSubmitting) {
      // Start countdown
      setRedirectCountdown(3);
      const countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            // Reset wizard state and navigate
            resetWizard();
            navigate("/");
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [isOnboardingComplete, submissionResult?.success, isSubmitting, navigate, resetWizard]);

  const handleNext = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (isValid) {
      const values = form.getValues();
      updateStepData("monitoring", values as MonitoringStepData);
      markStepComplete(5);
      return true;
    }
    return false;
  };
  
  type MonitoringStepData = import("../OnboardingContext").MonitoringStepData;

  const handleComplete = async () => {
    // Save current step data first
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Validasi gagal", {
        description: "Silakan periksa kembali formulir Anda.",
      });
      return;
    }

    const values = form.getValues();
    updateStepData("monitoring", values as MonitoringStepData);
    markStepComplete(5);

    // Submit all data to backend using toast.promise for better feedback
    toast.promise(submitOnboarding(), {
      loading: "Menyelesaikan orientasi...",
      success: (result) => {
        if (result.success) {
          return "Setup selesai! Dataspace connector Anda telah dikonfigurasi.";
        } else {
          return `Onboarding selesai dengan peringatan: ${result.message}`;
        }
      },
      error: (err) => {
        return `Gagal menyelesaikan onboarding: ${err?.message || "Terjadi kesalahan tak terduga."}`;
      },
    });
  };

  const allPreviousStepsComplete = [0, 1, 2, 3, 4].every((step) => completedSteps.has(step));

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          {/* Audit Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Activity className="w-4 h-4 text-accent" />
              Konfigurasi Audit
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="enableAuditLog"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Audit Log</FormLabel>
                      <FormDescription>
                        Catat semua aktivitas akses dan perubahan data
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="retentionPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periode Retensi (hari) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={30} max={365} {...field} />
                    </FormControl>
                    <FormDescription>Minimal 30 hari, maksimal 365 hari</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Compliance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Shield className="w-4 h-4 text-accent" />
              Compliance Frameworks
            </div>
            <Separator />
            <FormField
              control={form.control}
              name="complianceFrameworks"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {complianceFrameworks.map((framework) => (
                      <FormField
                        key={framework.id}
                        control={form.control}
                        name="complianceFrameworks"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={framework.id}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(framework.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, framework.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== framework.id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium">
                                  {framework.label}
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  {framework.description}
                                </FormDescription>
                              </div>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Alert Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Bell className="w-4 h-4 text-accent" />
              Notifikasi Alert
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="alertEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Notifikasi</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="alert@domain.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Opsional, untuk menerima alert compliance
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enableRealTimeAlerts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Real-time Alerts</FormLabel>
                      <FormDescription>
                        Kirim notifikasi segera saat ada pelanggaran
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Submission Progress - Show during submission */}
          {isSubmitting && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
                Menyimpan Konfigurasi...
              </div>
              <Separator />
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg space-y-3">
                <Progress value={submissionProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">{currentSubmissionStep}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Syncing to backend...
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Submission Error */}
          {submissionError && !isSubmitting && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="w-4 h-4" />
                Error
              </div>
              <Separator />
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{submissionError}</p>
              </div>
            </div>
          )}

          {/* Success Result */}
          {isOnboardingComplete && submissionResult?.success && !isSubmitting && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <PartyPopper className="w-4 h-4" />
                Onboarding Berhasil!
              </div>
              <Separator />
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
                <p className="text-sm text-green-600 dark:text-green-400">
                  {submissionResult.message}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {submissionResult.organizationId && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Organization ID:</span>
                      <code className="ml-1 px-1 bg-muted rounded">{submissionResult.organizationId}</code>
                    </div>
                  )}
                  {submissionResult.datasetId && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Dataset ID:</span>
                      <code className="ml-1 px-1 bg-muted rounded">{submissionResult.datasetId}</code>
                    </div>
                  )}
                  {submissionResult.contractId && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Contract ID:</span>
                      <code className="ml-1 px-1 bg-muted rounded">{submissionResult.contractId}</code>
                    </div>
                  )}
                  {submissionResult.transferId && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Transfer ID:</span>
                      <code className="ml-1 px-1 bg-muted rounded">{submissionResult.transferId}</code>
                    </div>
                  )}
                </div>
                {redirectCountdown !== null && (
                  <div className="pt-2 text-xs text-muted-foreground">
                    Mengarahkan ke Dashboard dalam {redirectCountdown} detik...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary Section - Only show if all previous steps complete and not yet submitted */}
          {allPreviousStepsComplete && !isOnboardingComplete && !isSubmitting && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Siap untuk Submit
              </div>
              <Separator />
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Semua langkah telah diselesaikan. Klik tombol "Selesai" untuk menyimpan
                  konfigurasi ke server dan mulai menggunakan dataspace connector.
                </p>
              </div>
            </div>
          )}
        </form>
      </Form>

      <WizardNavigation
        onNext={handleNext}
        onComplete={handleComplete}
        isSubmitting={isSubmitting}
        isComplete={isOnboardingComplete}
      />
    </div>
  );
};
