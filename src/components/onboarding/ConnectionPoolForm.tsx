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
import { connectionPoolSchema, ConnectionPoolFormValues } from "./connection-pool.schemas";
import { ConnectionPool } from "@/api/types";
import { useParticipants } from "@/api/hooks/useParticipants";
import { useEffect } from "react";

interface ConnectionPoolFormProps {
  initialData?: ConnectionPool | null;
  onSubmit: (values: ConnectionPoolFormValues) => void;
  isLoading: boolean;
  onCancel: () => void;
}

export const ConnectionPoolForm = ({
  initialData,
  onSubmit,
  isLoading,
  onCancel,
}: ConnectionPoolFormProps) => {
  const { data: participantsData } = useParticipants();

  const form = useForm<ConnectionPoolFormValues>({
    resolver: zodResolver(connectionPoolSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "PROVIDER",
      participant_id: initialData?.participant_id || "",
      token: initialData?.token || "",
      metadata: {
        url_consumer: initialData?.metadata?.url_consumer || "",
        url_provider: initialData?.metadata?.url_provider || "",
      },
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        type: initialData.type,
        participant_id: initialData.participant_id,
        token: initialData.token,
        metadata: {
          url_consumer: initialData.metadata?.url_consumer || "",
          url_provider: initialData.metadata?.url_provider || "",
        },
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
              <FormLabel>Pool Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Primary Provider Node" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="participant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Participant</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Participant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {participantsData?.data?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.organization_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CONSUMER">CONSUMER</SelectItem>
                      <SelectItem value="PROVIDER">PROVIDER</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <FormField
          control={form.control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access Token</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Node access token" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Metadata Endpoints</h3>
            <FormField
              control={form.control}
              name="metadata.url_consumer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumer URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://consumer.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metadata.url_provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://provider.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-accent" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Save Changes" : "Create Pool"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
