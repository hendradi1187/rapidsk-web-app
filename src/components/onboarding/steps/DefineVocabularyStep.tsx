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
      namespace: "",
      terms: [{ name: "", definition: "", dataType: "string" }],
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
      updateStepData("vocabulary", values);
      markStepComplete(1);
      return true;
    }
    return false;
  };

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
                name="namespace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Namespace URI</FormLabel>
                    <FormControl>
                      <Input placeholder="https://vocab.rapidsk.id/..." {...field} />
                    </FormControl>
                    <FormDescription>Opsional, URL namespace</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                onClick={() => append({ name: "", definition: "", dataType: "string" })}
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
                      name={`terms.${index}.name`}
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
                      name={`terms.${index}.dataType`}
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
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`terms.${index}.definition`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Definisi *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Penjelasan tentang term ini..."
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
