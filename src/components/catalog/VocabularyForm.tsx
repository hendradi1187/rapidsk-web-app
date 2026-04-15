import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { vocabularySchema, VocabularyFormValues } from "./vocabulary.schemas";
import { VocabularyWithoutTerms } from "@/api/types";
import { useEffect } from "react";

interface VocabularyFormProps {
  initialData?: VocabularyWithoutTerms | null;
  onSubmit: (values: VocabularyFormValues) => void;
  isLoading: boolean;
  onCancel: () => void;
}

export const VocabularyForm = ({
  initialData,
  onSubmit,
  isLoading,
  onCancel,
}: VocabularyFormProps) => {
  const form = useForm<VocabularyFormValues>({
    resolver: zodResolver(vocabularySchema),
    defaultValues: {
      name: initialData?.name || "",
      version: initialData?.version || "1.0.0",
      description: initialData?.description || "",
      status: initialData?.status || "DRAFT",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        version: initialData.version,
        description: initialData.description || "",
        status: initialData.status,
      });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vocabulary Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Well Data Vocabulary" {...field} />
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
                <FormLabel>Version</FormLabel>
                <FormControl>
                  <Input placeholder="1.0.0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the purpose of this vocabulary..." 
                  className="resize-none"
                  {...field} 
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-accent" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Save Changes" : "Create Vocabulary"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
