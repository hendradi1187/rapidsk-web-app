import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Database, Globe, FileType } from "lucide-react";
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

const providers = [
  { value: "phe-onwj", label: "PHE ONWJ" },
  { value: "pertamina-hulu", label: "Pertamina Hulu Energi" },
  { value: "chevron-indonesia", label: "Chevron Indonesia" },
  { value: "medco-ep", label: "Medco E&P Indonesia" },
  { value: "conocophillips", label: "ConocoPhillips Indonesia" },
  { value: "eni-indonesia", label: "ENI Indonesia" },
  { value: "other", label: "Lainnya" },
];

const domains = [
  { value: "seismic", label: "Seismic Data" },
  { value: "well", label: "Well Data" },
  { value: "production", label: "Production Data" },
  { value: "reservoir", label: "Reservoir Data" },
  { value: "geospatial", label: "Geospatial Data" },
  { value: "other", label: "Lainnya" },
];

export const RegisterDatasetStep = () => {
  const { formData, updateStepData, markStepComplete } = useOnboarding();

  const form = useForm<DatasetFormValues>({
    resolver: zodResolver(datasetSchema),
    defaultValues: formData.dataset || {
      name: "",
      description: "",
      provider: "",
      domain: "",
      endpointType: undefined,
      endpointUrl: "",
      format: undefined,
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain Data *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih domain" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {domains.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                name="endpointType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Endpoint *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe endpoint" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WMS">WMS (Web Map Service)</SelectItem>
                        <SelectItem value="WFS">WFS (Web Feature Service)</SelectItem>
                        <SelectItem value="WCS">WCS (Web Coverage Service)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endpointUrl"
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

          {/* Data Format Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileType className="w-4 h-4 text-accent" />
              Format Data
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format Data *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GeoJSON">GeoJSON</SelectItem>
                        <SelectItem value="GML">GML</SelectItem>
                        <SelectItem value="KML">KML</SelectItem>
                        <SelectItem value="GeoTIFF">GeoTIFF</SelectItem>
                        <SelectItem value="Shapefile">Shapefile</SelectItem>
                        <SelectItem value="CSV">CSV</SelectItem>
                      </SelectContent>
                    </Select>
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
