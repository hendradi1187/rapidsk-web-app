import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Users, Plus, Trash2, Shield } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useOnboarding } from "../OnboardingContext";
import { WizardNavigation } from "../WizardNavigation";
import { contractSchema, ContractFormValues } from "../schemas/onboarding.schemas";
import { useEffect } from "react";

export const CreateContractStep = () => {
  const { formData, updateStepData, markStepComplete } = useOnboarding();

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: formData.contract || {
      title: "",
      provider: "",
      consumer: "",
      startDate: "",
      endDate: "",
      description: "",
      policies: [{ name: "", dataClassification: "", description: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "policies",
  });

  useEffect(() => {
    if (formData.contract) {
      form.reset(formData.contract);
    }
  }, [formData.contract, form]);

  const handleNext = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (isValid) {
      const values = form.getValues();
      updateStepData("contract", values);
      markStepComplete(3);
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          {/* Contract Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="w-4 h-4 text-accent" />
              Detail Kontrak
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul Kontrak *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Data Sharing Agreement 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Mulai *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Berakhir</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Deskripsi singkat tentang kontrak..."
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

          {/* Parties Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="w-4 h-4 text-accent" />
              Pihak-pihak Terkait
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider (Penyedia Data) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama organisasi provider" {...field} />
                    </FormControl>
                    <FormDescription>Nama organisasi penyedia data</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consumer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consumer (Penerima Data) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama organisasi consumer" {...field} />
                    </FormControl>
                    <FormDescription>Nama organisasi penerima data</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Contract Policies Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="w-4 h-4 text-accent" />
                Contract Policies
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", dataClassification: "", description: "" })}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Tambah Policy
              </Button>
            </div>
            <Separator />

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 border border-border rounded-lg space-y-4 bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Policy #{index + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`policies.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Policy *</FormLabel>
                          <FormControl>
                            <Input placeholder="Contoh: Access Control Policy" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`policies.${index}.dataClassification`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Klasifikasi Data *</FormLabel>
                          <FormControl>
                            <Input placeholder="Contoh: Confidential, Public, Internal" {...field} />
                          </FormControl>
                          <FormDescription>Tingkat klasifikasi data</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`policies.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deskripsi</FormLabel>
                            <FormControl>
                              <Input placeholder="Deskripsi singkat policy (opsional)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {form.formState.errors.policies?.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.policies.root.message}
              </p>
            )}
          </div>
        </form>
      </Form>

      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
