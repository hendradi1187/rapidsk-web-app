import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft, Database, Clock, Globe, Lock } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useOnboarding } from "../OnboardingContext";
import { WizardNavigation } from "../WizardNavigation";
import { transferSchema, TransferFormValues } from "../schemas/onboarding.schemas";
import { useEffect } from "react";

export const SetupTransferStep = () => {
  const { formData, updateStepData, markStepComplete } = useOnboarding();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: formData.transfer || {
      name: "",
      from: "",
      to: "",
      type: undefined,
      targetEndpoint: "",
      protocol: undefined,
      scheduleType: undefined,
      cronExpression: "",
      encrypted: true,
    },
  });

  const scheduleType = form.watch("scheduleType");

  useEffect(() => {
    if (formData.transfer) {
      form.reset(formData.transfer);
    }
  }, [formData.transfer, form]);

  const handleNext = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (isValid) {
      const values = form.getValues();
      updateStepData("transfer", values);
      markStepComplete(4);
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          {/* Transfer Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ArrowRightLeft className="w-4 h-4 text-accent" />
              Konfigurasi Transfer
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Transfer *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Daily Sync to SKK Migas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Transfer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe transfer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="streaming">Streaming (Real-time)</SelectItem>
                        <SelectItem value="batch">Batch (Terjadwal)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="protocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protokol *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih protokol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HTTPS">HTTPS</SelectItem>
                        <SelectItem value="HTTP">HTTP</SelectItem>
                        <SelectItem value="S3">Amazon S3</SelectItem>
                        <SelectItem value="FTP">FTP</SelectItem>
                        <SelectItem value="SFTP">SFTP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetEndpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Endpoint *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.target.com/ingest" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Source & Target Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Database className="w-4 h-4 text-accent" />
              Sumber & Tujuan
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sumber (From) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: PHE ONWJ" {...field} />
                    </FormControl>
                    <FormDescription>Nama organisasi atau sistem sumber data</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tujuan (To) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: SKK Migas" {...field} />
                    </FormControl>
                    <FormDescription>Nama organisasi atau sistem tujuan data</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Schedule Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="w-4 h-4 text-accent" />
              Jadwal Transfer
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Jadwal *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe jadwal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time (Streaming)</SelectItem>
                        <SelectItem value="scheduled">Terjadwal (Cron)</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {scheduleType === "scheduled" && (
                <FormField
                  control={form.control}
                  name="cronExpression"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cron Expression</FormLabel>
                      <FormControl>
                        <Input placeholder="0 0 * * * (setiap jam)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Format: minute hour day month weekday
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Lock className="w-4 h-4 text-accent" />
              Keamanan
            </div>
            <Separator />
            <FormField
              control={form.control}
              name="encrypted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enkripsi Transfer</FormLabel>
                    <FormDescription>
                      Enkripsi data selama proses transfer menggunakan TLS 1.3
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border">
            <Globe className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <p className="text-sm font-medium">Keamanan Transfer</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pastikan target endpoint mendukung protokol yang dipilih.
                Untuk keamanan optimal, gunakan HTTPS atau SFTP dengan enkripsi aktif.
              </p>
            </div>
          </div>
        </form>
      </Form>

      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
