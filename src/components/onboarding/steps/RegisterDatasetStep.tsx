import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Database, Globe, Calendar } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { datasetSchema, DatasetFormValues } from "../schemas/onboarding.schemas";
import { useEffect } from "react";

export const RegisterDatasetStep = () => {
  const { formData, updateStepData, markStepComplete } = useOnboarding();

  const form = useForm<DatasetFormValues>({
    resolver: zodResolver(datasetSchema),
    defaultValues: formData.dataset || {
      name: "",
      description: "",
      provider: "",
      format: undefined,
      endpoint: "",
      period: "",
      wells: undefined,
      accessLevel: undefined,
    },
  });

  useEffect(() => {
    if (formData.dataset) {
      form.reset(formData.dataset);
    }
  }, [formData.dataset, form]);

  const handleNext = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (isValid) {
      const values = form.getValues();
      updateStepData("dataset", values);
      markStepComplete(2);
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Database className="w-4 h-4 text-accent" />
              Informasi Dasar
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Dataset *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Well Log Data 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider/KKKS *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama provider, misal: PHE ONWJ" {...field} />
                    </FormControl>
                    <FormDescription>Nama organisasi penyedia data</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level Akses *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih level akses" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                        <SelectItem value="confidential">Confidential</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="wells"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Wells</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Opsional"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Opsional, jumlah sumur terkait</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Deskripsi singkat tentang dataset..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Opsional, maksimal 500 karakter</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* GeoServer Endpoint Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Globe className="w-4 h-4 text-accent" />
              GeoServer Endpoint
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format / Tipe Endpoint *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih format endpoint" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WMS">WMS (Web Map Service)</SelectItem>
                        <SelectItem value="WFS">WFS (Web Feature Service)</SelectItem>
                        <SelectItem value="WCS">WCS (Web Coverage Service)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Format layanan GeoServer yang digunakan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Endpoint *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://geoserver.example.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Period Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="w-4 h-4 text-accent" />
              Periode Data
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Q1 2024, 2023-2024, Jan 2024" {...field} />
                    </FormControl>
                    <FormDescription>
                      Periode waktu data, misal: Q1 2024, 2023-2024
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </form>
      </Form>

      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
