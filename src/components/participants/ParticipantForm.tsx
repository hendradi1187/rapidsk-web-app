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
import {
  participantSchema,
  ParticipantFormValues,
} from "./participant.schemas";
import { Participant } from "@/api/types";
import { useEffect } from "react";

interface ParticipantFormProps {
  initialData?: Participant;
  onSubmit: (values: ParticipantFormValues) => void;
  isLoading: boolean;
  onCancel: () => void;
}

const orgTypeLabels: Record<string, string> = {
    GOV_LOCAL: "Pemerintah Daerah",
    GOV_PROV: "Pemerintah Provinsi",
    GOV_CENTRAL: "Pemerintah Pusat",
    ENTERPRISE: "Swasta/BUMN",
};

export const ParticipantForm = ({
  initialData,
  onSubmit,
  isLoading,
  onCancel,
}: ParticipantFormProps) => {
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
    defaultValues: {
      organization_name: initialData?.organization_name || "",
      organization_type: initialData?.organization_type || "ENTERPRISE",
      address: initialData?.address || "",
      contact_person: {
        name: initialData?.contact_person?.name || "",
        email: initialData?.contact_person?.email || "",
        phone: initialData?.contact_person?.phone || "",
      },
    },
  });

  useEffect(() => {
    form.reset({
      organization_name: initialData?.organization_name || "",
      organization_type: initialData?.organization_type || "ENTERPRISE",
      address: initialData?.address || "",
      contact_person: {
        name: initialData?.contact_person?.name || "",
        email: initialData?.contact_person?.email || "",
        phone: initialData?.contact_person?.phone || "",
      },
    });
  }, [initialData, form.reset]);


  const handleSubmit = (values: ParticipantFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
            <FormField
              control={form.control}
              name="organization_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Organisasi</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: PT. Sejahtera" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organization_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Organisasi</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe organisasi" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(orgTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat</FormLabel>
                  <FormControl>
                    <Input placeholder="Alamat lengkap" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Person</h3>
            <FormField
              control={form.control}
              name="contact_person.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input placeholder="Nama lengkap" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_person.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@domain.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_person.phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telepon</FormLabel>
                  <FormControl>
                    <Input placeholder="+62812345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </div>
      </form>
    </Form>
  );
};
