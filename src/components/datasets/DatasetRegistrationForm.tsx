import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Database,
  Globe,
  FileType,
  Building2,
  Calendar,
  Info,
  Check,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const datasetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: "Nama dataset minimal 3 karakter" })
    .max(100, { message: "Nama dataset maksimal 100 karakter" }),
  description: z
    .string()
    .trim()
    .max(500, { message: "Deskripsi maksimal 500 karakter" })
    .optional(),
  provider: z.string().min(1, { message: "Pilih provider" }),
  domain: z.string().min(1, { message: "Pilih domain data" }),
  endpointType: z.enum(["WMS", "WFS", "WCS"], {
    required_error: "Pilih tipe endpoint",
  }),
  endpointUrl: z
    .string()
    .trim()
    .min(1, { message: "URL endpoint wajib diisi" })
    .url({ message: "Format URL tidak valid" })
    .or(
      z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/, {
          message: "Format endpoint tidak valid",
        })
    ),
  format: z.enum(["GeoJSON", "GML", "KML", "GeoTIFF", "Shapefile", "CSV"], {
    required_error: "Pilih format data",
  }),
  period: z.string().min(1, { message: "Periode data wajib diisi" }),
  wellCount: z.coerce
    .number()
    .min(0, { message: "Jumlah sumur tidak boleh negatif" })
    .optional(),
  tags: z.string().optional(),
  accessLevel: z.enum(["public", "restricted", "confidential"], {
    required_error: "Pilih level akses",
  }),
});

type DatasetFormValues = z.infer<typeof datasetSchema>;

interface DatasetRegistrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: DatasetFormValues) => void;
}

const providers = [
  "PHE ONWJ",
  "Pertamina Hulu Energi",
  "Chevron Indonesia",
  "Medco E&P",
  "ExxonMobil Indonesia",
  "ConocoPhillips",
  "SKK Migas",
];

const domains = [
  "Lifting Data",
  "Reservoir Data",
  "Well Test",
  "Exploration",
  "Production Data",
  "Seismic Data",
];

export const DatasetRegistrationForm = ({
  open,
  onOpenChange,
  onSubmit,
}: DatasetRegistrationFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DatasetFormValues>({
    resolver: zodResolver(datasetSchema),
    defaultValues: {
      name: "",
      description: "",
      provider: "",
      domain: "",
      endpointUrl: "",
      period: "",
      wellCount: 0,
      tags: "",
      accessLevel: "restricted",
    },
  });

  const handleSubmit = async (data: DatasetFormValues) => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast({
      title: "Dataset Berhasil Didaftarkan",
      description: `Dataset "${data.name}" telah ditambahkan ke katalog.`,
    });
    
    onSubmit?.(data);
    form.reset();
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Database className="w-5 h-5 text-accent" />
            Registrasi Dataset Baru
          </DialogTitle>
          <DialogDescription>
            Daftarkan dataset baru ke katalog dengan mengisi informasi endpoint
            GeoServer, metadata, dan format data.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Info className="w-4 h-4 text-accent" />
                Informasi Dasar
              </div>
              <Separator />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Dataset *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="contoh: Well Production Data Q4 2025"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Opsional. Maksimal 500 karakter.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Provider (KKKS) *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider}
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih domain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {domains.map((domain) => (
                            <SelectItem key={domain} value={domain}>
                              {domain}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* GeoServer Endpoint */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Globe className="w-4 h-4 text-accent" />
                GeoServer Endpoint
              </div>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="endpointType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe Endpoint *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WMS">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                WMS
                              </Badge>
                              Web Map Service
                            </div>
                          </SelectItem>
                          <SelectItem value="WFS">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                WFS
                              </Badge>
                              Web Feature Service
                            </div>
                          </SelectItem>
                          <SelectItem value="WCS">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                WCS
                              </Badge>
                              Web Coverage Service
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="endpointUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Endpoint *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://geoserver.example.com/wms"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          URL lengkap endpoint GeoServer
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Data Format & Metadata */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileType className="w-4 h-4 text-accent" />
                Format Data & Metadata
              </div>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Format Data *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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

                <FormField
                  control={form.control}
                  name="accessLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level Akses *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih level akses" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center gap-2">
                              <Badge className="badge-active text-xs">
                                Public
                              </Badge>
                              Dapat diakses semua peserta
                            </div>
                          </SelectItem>
                          <SelectItem value="restricted">
                            <div className="flex items-center gap-2">
                              <Badge className="badge-pending text-xs">
                                Restricted
                              </Badge>
                              Perlu persetujuan kontrak
                            </div>
                          </SelectItem>
                          <SelectItem value="confidential">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-xs">
                                Confidential
                              </Badge>
                              Rahasia - Akses terbatas
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Periode Data *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="contoh: Q4 2025, Streaming, 2024-2025"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wellCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Sumur (Opsional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (Opsional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="contoh: production, quarterly, offshore"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Pisahkan tag dengan koma untuk memudahkan pencarian
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mendaftarkan...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Daftarkan Dataset
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
