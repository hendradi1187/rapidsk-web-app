import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Code2, AlertCircle, Layers } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "../OnboardingContext";
import { WizardNavigation } from "../WizardNavigation";
import { metadataSchemaSchema, MetadataSchemaFormValues } from "../schemas/onboarding.schemas";
import { useEffect } from "react";

const DATATYPE_BADGE: Record<string, string> = {
  string: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  number: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  boolean: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  date: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  object: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export const MetadataSchemaStep = () => {
  const { formData, updateStepData, markStepComplete } = useOnboarding();
  const vocabularyTerms = formData.vocabulary?.terms ?? [];

  // Build default fields from vocabulary terms (one entry per term)
  const buildDefaultFields = () =>
    vocabularyTerms.map((_, index) => ({
      termIndex: index,
      required: false,
      cardinality: "SINGLE" as const,
    }));

  const form = useForm<MetadataSchemaFormValues>({
    resolver: zodResolver(metadataSchemaSchema),
    defaultValues: formData.metadataSchema || {
      version: "1.0.0",
      fields: buildDefaultFields(),
    },
  });

  useEffect(() => {
    if (formData.metadataSchema) {
      form.reset(formData.metadataSchema);
    } else if (vocabularyTerms.length > 0) {
      form.reset({
        version: "1.0.0",
        fields: buildDefaultFields(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.metadataSchema, formData.vocabulary]);

  const handleNext = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (isValid) {
      const values = form.getValues();
      updateStepData("metadataSchema", values);
      markStepComplete(3);
      return true;
    }
    return false;
  };

  if (vocabularyTerms.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-6 border border-destructive/30 bg-destructive/5 rounded-lg flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-destructive">Vocabulary Belum Dikonfigurasi</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Kembali ke step <strong>Vocabulary</strong> dan tambahkan minimal satu term sebelum
              mengkonfigurasi Metadata Schema.
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
          {/* Schema Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Code2 className="w-4 h-4 text-accent" />
              Informasi Schema
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Versi Schema *</FormLabel>
                    <FormControl>
                      <Input placeholder="1.0.0" {...field} />
                    </FormControl>
                    <FormDescription>Versi schema metadata (SemVer)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end">
                <div className="p-3 bg-muted/40 border border-border rounded-lg text-sm w-full">
                  <span className="text-muted-foreground">Vocabulary:</span>{" "}
                  <span className="font-medium">{formData.vocabulary?.vocabularyName}</span>
                  <span className="text-muted-foreground ml-2">
                    v{formData.vocabulary?.version}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Field Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Layers className="w-4 h-4 text-accent" />
              Konfigurasi Field Schema
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Konfigurasikan setiap vocabulary term — tentukan apakah wajib diisi dan
              kardinalitasnya (satu atau banyak nilai).
            </p>

            <div className="space-y-3">
              {vocabularyTerms.map((term, index) => (
                <div
                  key={index}
                  className="p-4 border border-border rounded-lg bg-muted/20 space-y-3"
                >
                  {/* Term Info Header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{term.term}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs font-normal ${DATATYPE_BADGE[term.datatype] ?? ""}`}
                    >
                      {term.datatype}
                    </Badge>
                    {term.unit && (
                      <Badge variant="outline" className="text-xs font-normal">
                        unit: {term.unit}
                      </Badge>
                    )}
                  </div>
                  {term.description && (
                    <p className="text-xs text-muted-foreground">{term.description}</p>
                  )}

                  {/* Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <FormField
                      control={form.control}
                      name={`fields.${index}.required`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                          <div>
                            <FormLabel className="text-sm">Wajib Diisi</FormLabel>
                            <FormDescription className="text-xs">
                              Field ini harus ada pada setiap record
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`fields.${index}.cardinality`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Kardinalitas</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih kardinalitas" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SINGLE">Single (satu nilai)</SelectItem>
                              <SelectItem value="MULTIPLE">Multiple (banyak nilai)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            Jumlah nilai yang diizinkan per record
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Hidden termIndex field */}
                    <input
                      type="hidden"
                      {...form.register(`fields.${index}.termIndex`, { valueAsNumber: true })}
                      value={index}
                    />
                  </div>
                </div>
              ))}
            </div>

            {form.formState.errors.fields && !Array.isArray(form.formState.errors.fields) && (
              <p className="text-sm text-destructive">
                {form.formState.errors.fields.message}
              </p>
            )}
          </div>
        </form>
      </Form>

      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
