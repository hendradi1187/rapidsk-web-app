import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useOnboarding } from "../OnboardingContext";
import { WizardNavigation } from "../WizardNavigation";
import { vocabularySchema, VocabularyFormValues } from "../schemas/onboarding.schemas";
import { useEffect } from "react";

export const DefineVocabularyStep = () => {
  const { formData, updateStepData, markStepComplete } = useOnboarding();

  const form = useForm<VocabularyFormValues>({
    resolver: zodResolver(vocabularySchema),
    defaultValues: formData.vocabulary || {
      vocabularyName: "",
      version: "1.0.0",
      vocabularyDescription: "",
      terms: [{ term: "", datatype: "string", unit: "", description: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "terms",
  });

  useEffect(() => {
    if (formData.vocabulary) {
      form.reset(formData.vocabulary);
    }
  }, [formData.vocabulary, form]);

  const handleNext = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (isValid) {
      const values = form.getValues();
      updateStepData("vocabulary", values as VocabularyStepData);
      markStepComplete(1);
      return true;
    }
    return false;
  };
  
  type VocabularyStepData = import("../OnboardingContext").VocabularyStepData;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          {/* Vocabulary Metadata Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <BookOpen className="w-4 h-4 text-accent" />
              Metadata Vocabulary
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vocabularyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Vocabulary *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Oil & Gas Terminology" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version *</FormLabel>
                    <FormControl>
                      <Input placeholder="1.0.0" {...field} />
                    </FormControl>
                    <FormDescription>Versi vocabulary</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="vocabularyDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Deskripsi vocabulary (opsional)..."
                          className="resize-none"
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

          {/* Terms Definition Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BookOpen className="w-4 h-4 text-accent" />
                Definisi Terms
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ term: "", datatype: "string", unit: "", description: "" })}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Tambah Term
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
                    <span className="text-sm font-medium">Term #{index + 1}</span>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`terms.${index}.term`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Term *</FormLabel>
                          <FormControl>
                            <Input placeholder="Contoh: Well ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`terms.${index}.datatype`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipe Data *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih tipe" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="string">String</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="object">Object</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`terms.${index}.unit`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="Contoh: bbl, m3, psi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`terms.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deskripsi</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Penjelasan tentang term ini (minimal 10 karakter)..."
                                className="resize-none"
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
              ))}
            </div>

            {form.formState.errors.terms?.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.terms.root.message}
              </p>
            )}
          </div>
        </form>
      </Form>

      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
