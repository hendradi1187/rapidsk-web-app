import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { userSchema, type UserFormValues } from "./user.schemas";
import { UserResponse } from "@/api/types/identity-provider";
import { useEffect, useMemo, useState } from "react";
import { derivePermissions, deriveRole } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/config/rbac";

const LAST_CATEGORY_ID_KEY = "demo_user_category_id";
const LAST_GROUP_ID_KEY = "demo_user_group_id";

export interface UserCategoryOption {
  id: string;
  name: string;
  code: string;
}

export interface UserGroupOption {
  id: string;
  category_id: string;
  name: string;
  code: string;
}

interface UserFormProps {
  initialData?: UserResponse | null;
  onSubmit: (values: UserFormValues) => void;
  isLoading: boolean;
  onCancel: () => void;
  categoryOptions: UserCategoryOption[];
  groupOptions: UserGroupOption[];
  preferredCategoryId?: string;
  preferredGroupId?: string;
}

export const UserForm = ({
  initialData,
  onSubmit,
  isLoading,
  onCancel,
  categoryOptions,
  groupOptions,
  preferredCategoryId,
  preferredGroupId,
}: UserFormProps) => {
  const [showAdvancedIds, setShowAdvancedIds] = useState(false);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      full_name: initialData?.full_name || "",
      email: initialData?.email || "",
      password: "",
      category_id: initialData?.category?.id || "",
      group_id: initialData?.group?.id || "",
    },
  });
  const selectedCategoryId = useWatch({
    control: form.control,
    name: "category_id",
  });
  const selectedGroupId = useWatch({
    control: form.control,
    name: "group_id",
  });

  const filteredGroupOptions = useMemo(() => {
    if (!selectedCategoryId) return groupOptions;
    const filtered = groupOptions.filter((group) => group.category_id === selectedCategoryId);
    return filtered.length > 0 ? filtered : groupOptions;
  }, [groupOptions, selectedCategoryId]);

  const categorySelectValue = categoryOptions.some((category) => category.id === selectedCategoryId)
    ? selectedCategoryId
    : undefined;
  const groupSelectValue = filteredGroupOptions.some((group) => group.id === selectedGroupId)
    ? selectedGroupId
    : undefined;
  const selectedCategory = categoryOptions.find((category) => category.id === selectedCategoryId);
  const selectedGroup = groupOptions.find((group) => group.id === selectedGroupId);
  const derivedRole = deriveRole(selectedCategory?.code || "", selectedGroup?.code || "");
  const derivedPermissions = derivePermissions(selectedCategory?.code || "", selectedGroup?.code || "");

  useEffect(() => {
    if (initialData) {
      form.reset({
        username: "",
        full_name: initialData.full_name,
        email: initialData.email,
        password: "", // Don't populate password on edit
        category_id: initialData.category?.id || "",
        group_id: initialData.group?.id || "",
      });
    }
  }, [initialData, form]);

  useEffect(() => {
    if (initialData) return;

    const lastCategoryId = localStorage.getItem(LAST_CATEGORY_ID_KEY);
    const lastGroupId = localStorage.getItem(LAST_GROUP_ID_KEY);
    const validCategoryIds = new Set(categoryOptions.map((category) => category.id));
    const validGroupIds = new Set(groupOptions.map((group) => group.id));

    const nextCategoryId =
      [preferredCategoryId, lastCategoryId, categoryOptions[0]?.id].find(
        (candidate) => candidate && validCategoryIds.has(candidate)
      ) || "";

    const nextGroupId =
      [preferredGroupId, lastGroupId].find((candidate) => candidate && validGroupIds.has(candidate)) || "";

    if (!form.getValues("category_id") || !validCategoryIds.has(form.getValues("category_id"))) {
      form.setValue("category_id", nextCategoryId, { shouldDirty: false, shouldValidate: true });
    }

    const groupMatchesCategory = groupOptions.some(
      (group) =>
        group.id === nextGroupId &&
        (!nextCategoryId || group.category_id === nextCategoryId)
    );

    if (!form.getValues("group_id") || !validGroupIds.has(form.getValues("group_id"))) {
      form.setValue(
        "group_id",
        groupMatchesCategory ? nextGroupId : filteredGroupOptions[0]?.id || "",
        { shouldDirty: false, shouldValidate: true }
      );
    }
  }, [categoryOptions, filteredGroupOptions, form, groupOptions, initialData, preferredCategoryId, preferredGroupId]);

  useEffect(() => {
    const currentGroupId = form.getValues("group_id");
    if (!currentGroupId) {
      if (filteredGroupOptions[0]?.id) {
        form.setValue("group_id", filteredGroupOptions[0].id, {
          shouldDirty: false,
          shouldValidate: true,
        });
      }
      return;
    }

    const isStillValid = filteredGroupOptions.some((group) => group.id === currentGroupId);
    if (!isStillValid) {
      form.setValue("group_id", filteredGroupOptions[0]?.id || "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [filteredGroupOptions, form]);

  const handleSubmit = (values: UserFormValues) => {
    localStorage.setItem(LAST_CATEGORY_ID_KEY, values.category_id);
    localStorage.setItem(LAST_GROUP_ID_KEY, values.group_id);
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {!initialData ? (
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="john.doe" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  Required by API on create. If left empty, the page will derive it from the email prefix.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
            <p className="text-sm font-medium">Username is not exposed by the current backend user response</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Edit mode only updates the fields that the live API returns reliably here: email, full name, category, and group. If username changes are needed, that capability should be exposed explicitly by the backend response contract.
            </p>
          </div>
        )}
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!initialData ? (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Min 8 characters" {...field} value={field.value || ""} />
                </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        ) : (
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
            <p className="text-xs text-muted-foreground">
              Password is not preloaded in edit mode. Use dedicated reset or activation flow once the backend exposes that lifecycle.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={categorySelectValue}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a valid category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name} ({category.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Loaded from the current system so the backend accepts the selected category.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="group_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group</FormLabel>
                <Select onValueChange={field.onChange} value={groupSelectValue}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a valid group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredGroupOptions.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Groups are filtered to match the selected category whenever possible.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">Live backend mapping preview:</p>
            <Badge variant="outline" className="border-accent/30 bg-accent/5 text-accent">
              {ROLE_LABELS[derivedRole]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              from {selectedCategory?.code || "-"} / {selectedGroup?.code || "-"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Categories and groups are loaded from the live identity-provider API. This preview shows which app role the frontend will derive after login.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Permission set: {derivedPermissions.join(", ") || "-"}
          </p>
        </div>

        <Collapsible open={showAdvancedIds} onOpenChange={setShowAdvancedIds} className="rounded-xl border border-border/70 bg-background/80">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-between rounded-xl px-4 py-3 text-sm font-medium">
              Advanced ID Override
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 border-t border-border/70 px-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manual Category ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Override category UUID" {...field} />
                    </FormControl>
                    <FormDescription>Only use this if you already know a valid backend category UUID.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="group_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manual Group ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Override group UUID" {...field} />
                    </FormControl>
                    <FormDescription>Only use this if you already know a valid backend group UUID.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-accent" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Save Changes" : "Create User"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
