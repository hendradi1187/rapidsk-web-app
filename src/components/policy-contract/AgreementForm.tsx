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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { agreementSchema, AgreementFormValues } from "./agreement.schemas";
import { Agreement } from "@/api/types";
import { useContracts } from "@/api/hooks/useContracts";
import { useEffect } from "react";

interface AgreementFormProps {
  initialData?: Agreement | null;
  domainId: string;
  onSubmit: (values: AgreementFormValues) => void;
  isLoading: boolean;
  onCancel: () => void;
}

export const AgreementForm = ({
  initialData,
  domainId,
  onSubmit,
  isLoading,
  onCancel,
}: AgreementFormProps) => {
  const { data: contractsData } = useContracts(domainId);

  const form = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      contract_id: initialData?.contract_id || "",
      effective_from: initialData?.effective_from ? initialData.effective_from.slice(0, 16) : "",
      effective_to: initialData?.effective_to ? initialData.effective_to.slice(0, 16) : "",
      status: initialData?.status || "REQUESTED",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        contract_id: initialData.contract_id,
        effective_from: initialData.effective_from.slice(0, 16),
        effective_to: initialData.effective_to.slice(0, 16),
        status: initialData.status,
      });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="contract_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Contract</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger drop-shadow-sm>
                    <SelectValue placeholder="Select Contract" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {contractsData?.data?.map((c) => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>{String(c.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="effective_from"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective From</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effective_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective To</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {initialData && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="REQUESTED">REQUESTED</SelectItem>
                    <SelectItem value="APPROVED">APPROVED</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-accent" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Save Changes" : "Create Official Agreement"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
