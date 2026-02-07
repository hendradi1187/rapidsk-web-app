import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, User, Globe } from "lucide-react";
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
import { organizationSchema, OrganizationFormValues } from "../schemas/onboarding.schemas";
import { useEffect } from "react";

export const SetupOrganizationStep = () => {
  const { formData, updateStepData, markStepComplete } = useOnboarding();

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: formData.organization || {
      orgName: "",
      orgCode: "",
      orgType: undefined,
      description: "",
      participantName: "",
      participantEmail: "",
      participantPhone: "",
      participantAddress: "",
      participantRole: undefined,
      domainName: "",
      domainCode: "",
      domainDescription: "",
    },
  });

  useEffect(() => {
    if (formData.organization) {
      form.reset(formData.organization);
    }
  }, [formData.organization, form]);

  const handleNext = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (isValid) {
      const values = form.getValues();
      updateStepData("organization", values as OrganizationStepData);
      markStepComplete(0);
      return true;
    }
    return false;
  };
  
  type OrganizationStepData = import("../OnboardingContext").OrganizationStepData;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          {/* Organization Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Building2 className="w-4 h-4 text-accent" />
              Detail Organisasi
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="orgName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Organisasi *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: PT. Minyak Nusantara" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orgCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Organisasi *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: MNI" {...field} />
                    </FormControl>
                    <FormDescription>2-20 karakter, unik</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orgType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Organisasi *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe organisasi" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="KKKS">KKKS (Provider)</SelectItem>
                        <SelectItem value="Regulator">Regulator (Consumer)</SelectItem>
                        <SelectItem value="ServiceProvider">Service Provider</SelectItem>
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
                      <FormLabel>Deskripsi *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Deskripsi singkat tentang organisasi (minimal 10 karakter)..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Minimal 10, maksimal 500 karakter</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Primary Participant Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="w-4 h-4 text-accent" />
              Participant Utama
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="participantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama contact person" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="participantEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@domain.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="participantPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telepon *</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+62812345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="participantRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="DataSteward">Data Steward</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="participantAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Alamat lengkap organisasi..."
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Domain Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Globe className="w-4 h-4 text-accent" />
              Domain Governance
            </div>
            <Separator />
            <FormDescription className="text-xs">
              Domain akan dibuat otomatis bersama organisasi. Domain diperlukan untuk mengelola vocabulary, dataset, dan kontrak.
            </FormDescription>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="domainName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Domain *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Data Produksi Migas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domainCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Domain *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: PROD-MIGAS" {...field} />
                    </FormControl>
                    <FormDescription>2-20 karakter</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="domainDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi Domain *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Deskripsi singkat tentang domain data (minimal 10 karakter)..."
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </form>
      </Form>

      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
