import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Gavel, Plus, Trash2, Wand2 } from "lucide-react";
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
import { policyDefinitionSchema, PolicyDefinitionFormValues, PolicyRuleValues } from "../schemas/onboarding.schemas";
import { useEffect } from "react";

// ─── Preset templates ────────────────────────────────────────────────────────

type TemplateKey = "AllowAll" | "DenyAll" | "Restricted";

const TEMPLATES: Record<TemplateKey, { type: PolicyDefinitionFormValues["type"]; rules: PolicyRuleValues[] }> = {
  AllowAll: {
    type: "ACCESS",
    rules: [
      { left_operand: "access.type", operator: "EQUALS", right_operand: "*" },
    ],
  },
  DenyAll: {
    type: "ACCESS",
    rules: [
      { left_operand: "access.type", operator: "NOT_EQUALS", right_operand: "*" },
    ],
  },
  Restricted: {
    type: "ACCESS",
    rules: [
      { left_operand: "user.authenticated", operator: "EQUALS", right_operand: "true" },
      { left_operand: "access.type", operator: "EQUALS", right_operand: "READ" },
    ],
  },
};

const OPERATORS = [
  { value: "EQUALS", label: "= EQUALS" },
  { value: "NOT_EQUALS", label: "≠ NOT_EQUALS" },
  { value: "GREATER_THAN", label: "> GREATER_THAN" },
  { value: "LESS_THAN", label: "< LESS_THAN" },
  { value: "CONTAINS", label: "⊇ CONTAINS" },
  { value: "STARTS_WITH", label: "⌖ STARTS_WITH" },
  { value: "ENDS_WITH", label: "⌗ ENDS_WITH" },
];

const POLICY_TYPES = [
  { value: "ACCESS", label: "Access — kontrol hak akses data" },
  { value: "USAGE", label: "Usage — kontrol penggunaan data" },
  { value: "RETENTION", label: "Retention — kontrol retensi data" },
  { value: "SECURITY", label: "Security — kontrol keamanan data" },
];

const EMPTY_RULE: PolicyRuleValues = {
  left_operand: "",
  operator: "EQUALS",
  right_operand: "",
};

// ─── Component ───────────────────────────────────────────────────────────────

export const PolicyDefinitionStep = () => {
  const { formData, updateStepData, markStepComplete } = useOnboarding();

  const form = useForm<PolicyDefinitionFormValues>({
    resolver: zodResolver(policyDefinitionSchema),
    defaultValues: formData.policy || {
      policyName: "",
      description: "",
      version: "1.0.0",
      type: "ACCESS",
      rules: [{ ...EMPTY_RULE }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "rules",
  });

  useEffect(() => {
    if (formData.policy) {
      form.reset(formData.policy);
    }
  }, [formData.policy, form]);

  const applyTemplate = (key: TemplateKey) => {
    const tpl = TEMPLATES[key];
    form.setValue("type", tpl.type);
    replace(tpl.rules);
  };

  const handleNext = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (isValid) {
      updateStepData("policy", form.getValues());
      markStepComplete(5);
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">

          {/* Policy Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Gavel className="w-4 h-4 text-accent" />
              Informasi Policy
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="policyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Policy *</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Data Access Policy KKKS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Versi *</FormLabel>
                      <FormControl>
                        <Input placeholder="1.0.0" {...field} />
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
                      <FormLabel>Tipe *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {POLICY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          placeholder="Deskripsi singkat tentang policy ini (opsional)..."
                          className="resize-none"
                          rows={2}
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

          {/* Template Presets */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Wand2 className="w-4 h-4 text-accent" />
              Template Cepat
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["AllowAll", "DenyAll", "Restricted"] as TemplateKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyTemplate(key)}
                  className="text-left p-3 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors space-y-1"
                >
                  <p className="text-sm font-medium">{key}</p>
                  <p className="text-xs text-muted-foreground">
                    {key === "AllowAll" && "Izinkan semua jenis akses"}
                    {key === "DenyAll" && "Tolak semua jenis akses"}
                    {key === "Restricted" && "Hanya user terautentikasi, READ only"}
                  </p>
                  <p className="text-xs text-accent">{TEMPLATES[key].rules.length} rule(s)</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Klik template untuk mengisi rules secara otomatis. Rules dapat diubah secara manual.
            </p>
          </div>

          {/* Rules Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Gavel className="w-4 h-4 text-accent" />
                Rules
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...EMPTY_RULE })}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Tambah Rule
              </Button>
            </div>
            <Separator />

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 border border-border rounded-lg bg-muted/20 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Rule #{index + 1}
                    </span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive h-7 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <FormField
                      control={form.control}
                      name={`rules.${index}.left_operand`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Left Operand *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Contoh: user.authenticated"
                              className="text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`rules.${index}.operator`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Operator *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Operator" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {OPERATORS.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
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
                      name={`rules.${index}.right_operand`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Right Operand *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Contoh: true"
                              className="text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            {form.formState.errors.rules && !Array.isArray(form.formState.errors.rules) && (
              <p className="text-sm text-destructive">
                {form.formState.errors.rules.message}
              </p>
            )}
          </div>
        </form>
      </Form>

      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
