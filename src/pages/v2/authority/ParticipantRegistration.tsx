import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, ChevronRight, Eye, EyeOff, ShieldCheck, Trash2, Users2 } from "lucide-react";
import { Link } from "react-router-dom";
import { V2PageShell, DataTable, MetricCard } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParticipantDeleteDialog } from "@/components/participants/ParticipantDeleteDialog";
import { ParticipantForm } from "@/components/participants/ParticipantForm";
import type { ParticipantFormValues } from "@/components/participants/participant.schemas";
import { useCreateParticipant, useDeleteParticipant, useParticipantDomains, useParticipants } from "@/api/hooks/useParticipants";
import { useCreateOrganization, useOrganizations } from "@/api/hooks/useOrganizations";
import { formatParticipantDeleteConflict, useParticipantDeleteGuard } from "@/api/hooks/useParticipantDeleteGuard";
import { useCreateUser, useUserCategories, useUserGroups, useUsers } from "@/api/hooks/useUsers";
import type { Participant, UserResponse } from "@/api/types";
import { useAuth, deriveRole } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/config/rbac";
import { generateCode } from "@/lib/codeGenUtils";
import { toast } from "sonner";

type LinkedRole = "CONSUMER" | "PROVIDER";

const emptyUserForm = {
  username: "",
  full_name: "",
  email: "",
  password: "",
  confirm_password: "",
  category_id: "",
  group_id: "",
};

type OrgBindingMode = "existing" | "create";
type ParticipantTabMode = "create-new" | "use-existing";

const ROLE_BADGE_COLORS: Record<string, string> = {
  CONSUMER: "border-emerald-500/50 text-emerald-700 bg-emerald-500/10",
  PROVIDER: "border-amber-500/50 text-amber-700 bg-amber-500/10",
  SUPER_ADMIN: "border-blue-500/50 text-blue-700 bg-blue-500/10",
  ADMIN: "border-blue-500/50 text-blue-700 bg-blue-500/10",
  VIEWER: "border-slate-500/50 text-slate-700 bg-slate-500/10",
};

const defaultRoleForParticipant = (participant?: Participant | null): LinkedRole =>
  participant?.organization_type === "ENTERPRISE" ? "PROVIDER" : "CONSUMER";

const getErrorDescription = (error: any) => {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.errors)) {
    return data.errors.map((item: any) => `${item.loc?.join(".") || item.field || "field"}: ${item.msg || item.message || "Invalid value"}`).join(" | ");
  }
  return error?.message || "Unexpected error";
};

const ParticipantUsageCell = ({
  participant,
  serverConflict,
}: {
  participant: Participant;
  serverConflict?: string | null;
}) => {
  const { dependencyLines, hasDependencies, isChecking } = useParticipantDeleteGuard(participant);

  if (serverConflict) {
    return (
      <div className="space-y-1">
        <Badge variant="outline" className="border-red-500/40 text-[10px] text-red-600">Blocked by Backend</Badge>
        <div className="max-w-xs text-[11px] text-muted-foreground">
          {serverConflict}
        </div>
      </div>
    );
  }

  if (isChecking) {
    return <Badge variant="outline" className="text-[10px]">Checking</Badge>;
  }

  if (!hasDependencies) {
    return (
      <div className="space-y-1">
        <Badge variant="outline" className="border-slate-400/40 text-[10px] text-slate-600">Needs Backend Check</Badge>
        <div className="max-w-xs text-[11px] text-muted-foreground">
          FE tidak lihat dependency, tapi backend masih bisa block delete.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600">In Use</Badge>
      <div className="max-w-xs text-[11px] text-muted-foreground">
        {dependencyLines.join(" | ")}
      </div>
    </div>
  );
};

const ParticipantRegistration = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("participants.manage") && hasPermission("users.manage");
  const { data: participantsData, isLoading: loadingParticipants } = useParticipants({ limit: 100 });
  const { data: usersData } = useUsers({ limit: 100 });
  const { data: organizationsData, isLoading: loadingOrganizations } = useOrganizations({ limit: 100 });
  const { data: categoriesData } = useUserCategories({ limit: 100 });
  const { data: groupsData } = useUserGroups({ limit: 100 });
  const createParticipant = useCreateParticipant();
  const createOrganization = useCreateOrganization();
  const deleteParticipant = useDeleteParticipant();
  const createUser = useCreateUser();

  const participants = participantsData?.data ?? [];
  const users = usersData?.data ?? [];
  const organizations = organizationsData?.data ?? [];
  const categories = categoriesData?.data ?? [];
  const groups = groupsData?.data ?? [];

  const [createdParticipant, setCreatedParticipant] = useState<Participant | null>(null);
  const [existingParticipantId, setExistingParticipantId] = useState("");
  const [linkedRole, setLinkedRole] = useState<LinkedRole>("CONSUMER");
  const [orgBindingMode, setOrgBindingMode] = useState<OrgBindingMode>("existing");
  const [participantTabMode, setParticipantTabMode] = useState<ParticipantTabMode>("create-new");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [newOrganization, setNewOrganization] = useState({ name: "", code: "", description: "" });
  const [orgCodeManuallyEdited, setOrgCodeManuallyEdited] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [lastCreatedUser, setLastCreatedUser] = useState<UserResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null);
  const [deleteConflict, setDeleteConflict] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [blockedByBackend, setBlockedByBackend] = useState<Record<string, string>>({});
  const { data: currentMappingsData, isLoading: loadingCurrentMappings } = useParticipantDomains(createdParticipant?.id ?? "", { limit: 100 });
  // WORKAROUND: Backend GET /participants/{id}/domains ignores the participant_id
  // filter and returns ALL domain mappings globally. Filter client-side.
  const currentParticipantMappings = (currentMappingsData?.data ?? []).filter(
    (m) => m.participant_id === createdParticipant?.id
  );

  const selectedExistingParticipant = participants.find((participant) => participant.id === existingParticipantId) || null;
  const selectedOrganization = organizations.find((organization) => organization.id === selectedOrganizationId) || null;

  const roleCategories = useMemo(
    () => categories.filter((category) => (category.code || "").toUpperCase() === linkedRole),
    [categories, linkedRole]
  );

  const filteredGroups = useMemo(() => {
    if (!userForm.category_id) return groups;
    const next = groups.filter((group) => group.category?.id === userForm.category_id);
    return next.length > 0 ? next : groups;
  }, [groups, userForm.category_id]);

  useEffect(() => {
    if (!createdParticipant) return;
    const nextRole = defaultRoleForParticipant(createdParticipant);
    setLinkedRole(nextRole);
    const nextCategory = categories.find((category) => (category.code || "").toUpperCase() === nextRole);
    const nextGroups = groups.filter((group) => group.category?.id === nextCategory?.id);
    setUserForm({
      username: createdParticipant.contact_person?.email?.split("@")[0] || "",
      full_name: createdParticipant.contact_person?.name || createdParticipant.organization_name,
      email: createdParticipant.contact_person?.email || "",
      password: "",
      confirm_password: "",
      category_id: nextCategory?.id || "",
      group_id: nextGroups[0]?.id || "",
    });
  }, [createdParticipant, categories, groups]);

  useEffect(() => {
    const nextCategory = categories.find((category) => (category.code || "").toUpperCase() === linkedRole);
    setUserForm((prev) => {
      const nextGroups = groups.filter((group) => group.category?.id === nextCategory?.id);
      return {
        ...prev,
        category_id: nextCategory?.id || prev.category_id,
        group_id: nextGroups[0]?.id || prev.group_id,
      };
    });
  }, [linkedRole, categories, groups]);

  const linkedUserExists = createdParticipant?.contact_person?.email
    ? users.some((user) => user.email?.toLowerCase() === createdParticipant.contact_person.email.toLowerCase())
    : false;

  const handleParticipantSubmit = async (values: ParticipantFormValues) => {
    if (!canManage) {
      toast.error("Missing participants.manage or users.manage permission");
      return;
    }

    setLastCreatedUser(null);

    try {
      let organizationNameForParticipant = selectedOrganization?.name || "";
      if (orgBindingMode === "create") {
        if (!newOrganization.name.trim() || !newOrganization.code.trim() || !newOrganization.description.trim()) {
          toast.error("Isi dulu name, code, dan description untuk organisasi governance baru");
          return;
        }
        const createdOrganization = await createOrganization.mutateAsync({
          name: newOrganization.name.trim(),
          code: newOrganization.code.trim(),
          description: newOrganization.description.trim(),
        });
        organizationNameForParticipant = createdOrganization.name;
        setSelectedOrganizationId(createdOrganization.id);
        toast.success("Governance organization created", {
          description: `${createdOrganization.name} siap dipakai untuk participant onboarding.`,
        });
      } else if (!organizationNameForParticipant) {
        toast.error("Pilih governance organization dulu sebelum register participant");
        return;
      }

      const participant = await createParticipant.mutateAsync({
        ...values,
        organization_name: organizationNameForParticipant,
      });
      setCreatedParticipant(participant);
      setExistingParticipantId(participant.id);
      toast.success("Participant created", {
        description: `Lanjut step 2 untuk bikin login account yang linked ke participant ${participant.organization_name}.`,
      });
    } catch (error: any) {
      toast.error("Failed to create participant", {
        description: getErrorDescription(error),
      });
    }
  };

  const handleUseExistingParticipant = (participant?: Participant | null) => {
    const target = participant || selectedExistingParticipant;
    if (!target) {
      toast.error("Pilih participant existing dulu");
      return;
    }

    setExistingParticipantId(target.id);
    setCreatedParticipant(target);
    setParticipantTabMode("use-existing"); // Force switch tab so user sees they're on "Use Existing"
    setLastCreatedUser(null);
    toast.success("Existing participant loaded", {
      description: `Step 2 sekarang pakai participant ${target.organization_name}.`,
    });
  };

  const handleCreateLinkedUser = async () => {
    if (!createdParticipant) {
      toast.error("Create participant first");
      return;
    }
    if (!userForm.username.trim()) {
      toast.error("Username required");
      return;
    }
    if (!userForm.email.trim()) {
      toast.error("Email required");
      return;
    }
    if (!userForm.password.trim() || userForm.password.length < 8) {
      toast.error("Password min 8 chars");
      return;
    }
    if (userForm.password !== userForm.confirm_password) {
      toast.error("Password confirmation does not match");
      return;
    }
    if (!userForm.category_id || !userForm.group_id) {
      toast.error("Category and group are required");
      return;
    }

    try {
      const createdUser = await createUser.mutateAsync({
        username: userForm.username.trim(),
        full_name: userForm.full_name.trim() || userForm.username.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        category_id: userForm.category_id,
        group_id: userForm.group_id,
        participant_id: createdParticipant.id,
      });
      setLastCreatedUser(createdUser);
      toast.success("Linked login account created", {
        description: `${createdParticipant.organization_name} sekarang sudah punya login account ${createdUser.username || createdUser.email}.`,
      });
    } catch (error: any) {
      toast.error("Failed to create linked user", {
        description: getErrorDescription(error),
      });
    }
  };

  const handleDeleteParticipant = async () => {
    if (!deleteTarget) return;

    try {
      await deleteParticipant.mutateAsync(deleteTarget.id);
      toast.success(`Participant ${deleteTarget.organization_name} deleted`);
      if (createdParticipant?.id === deleteTarget.id) {
        setCreatedParticipant(null);
        setLastCreatedUser(null);
      }
      if (existingParticipantId === deleteTarget.id) {
        setExistingParticipantId("");
      }
      setBlockedByBackend((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      setDeleteTarget(null);
      setDeleteConflict(null);
    } catch (error: any) {
      const message = formatParticipantDeleteConflict(error, []);
      setDeleteConflict(message);
      setBlockedByBackend((prev) => ({ ...prev, [deleteTarget.id]: message }));
      toast.error("Failed to delete participant", {
        description: message,
        duration: 9000,
      });
    }
  };

  const selectedCategory = categories.find((category) => category.id === userForm.category_id);
  const selectedGroup = groups.find((group) => group.id === userForm.group_id);
  const derivedRole = deriveRole(selectedCategory?.code || "", selectedGroup?.code || "");

  return (
    <V2PageShell
      title="Onboarding Participant Registration"
      subtitle="Pendaftaran participant di onboarding: bisa create baru, pakai participant yang sudah ada, lalu lanjut bikin linked login user."
      status="Live API"
    >
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">Urutan onboarding yang benar (clear flow)</p>
          <ol className="ml-4 mt-2 list-decimal space-y-1 text-xs text-muted-foreground">
            <li>Pilih governance organization yang menaungi participant, atau create organization baru langsung di sini.</li>
            <li>Register participant onboarding (nama participant mengikuti organization governance yang dipilih).</li>
            <li>Create linked login user dengan participant_id.</li>
            <li>Resend activation email lalu user aktivasi via URL token + set password.</li>
            <li>Mapping domain berdasarkan organization participant di halaman Domain Mapping.</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Participants" value={participants.length} subtitle="Live onboarding records" icon={Users2} trend="up" />
        <MetricCard title="Login Accounts" value={users.length} subtitle="Live identity-provider users" icon={ShieldCheck} trend="up" />
        <MetricCard title="Provider Participants" value={participants.filter((participant) => participant.organization_type === "ENTERPRISE").length} subtitle="ENTERPRISE" icon={Building2} trend="neutral" />
        <MetricCard title="Consumer Participants" value={participants.filter((participant) => participant.organization_type !== "ENTERPRISE").length} subtitle="Government / SKK" icon={Building2} trend="neutral" />
      </div>

      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">Semua aksi participant sekarang ada di halaman ini.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bisa create participant baru, pilih participant yang sudah ada, lanjut bikin linked login user, dan hapus participant langsung dari tabel existing participant di bawah.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Existing Participants</CardTitle>
          <CardDescription>Pilih participant existing untuk lanjut ke step user, atau hapus participant langsung dari onboarding page ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <Select value={existingParticipantId} onValueChange={setExistingParticipantId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih participant existing" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.organization_name} ({participant.organization_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleUseExistingParticipant()} disabled={!selectedExistingParticipant}>
              Use Existing Participant
            </Button>
          </div>

          <DataTable headers={["Organization", "Type", "Contact", "Email", "Delete Status", "Created", "Actions"]} isLoading={loadingParticipants}>
            {participants.length > 0 ? (
              participants.map((participant) => (
                <tr key={participant.id} className={`hover:bg-muted/20 ${createdParticipant?.id === participant.id ? "bg-muted/20" : ""}`}>
                  <td className="px-4 py-3 text-sm font-medium">{participant.organization_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{participant.organization_type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{participant.contact_person?.name || "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{participant.contact_person?.email || "-"}</td>
                  <td className="px-4 py-3">
                    <ParticipantUsageCell
                      participant={participant}
                      serverConflict={blockedByBackend[participant.id] || null}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{participant.created_at ? new Date(participant.created_at).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleUseExistingParticipant(participant)}>
                        Use
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-destructive/40 text-destructive"
                        disabled={!hasPermission("participants.manage")}
                        onClick={() => {
                          setDeleteConflict(blockedByBackend[participant.id] || null);
                          setDeleteTarget(participant);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        {blockedByBackend[participant.id] ? "Blocked" : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No participants yet.
                </td>
              </tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Step 1 — Register Participant</CardTitle>
            <CardDescription>Ikuti sub-step di bawah: pilih/buat organization dulu, lalu register participant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* ── Step 1a: Organization Binding ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1a</span>
                <div>
                  <p className="text-sm font-semibold">Organization Binding</p>
                  <p className="text-[11px] text-muted-foreground">Participant harus terikat ke governance organization untuk domain mapping.</p>
                </div>
              </div>
              <Tabs value={orgBindingMode} onValueChange={(value) => setOrgBindingMode(value as OrgBindingMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Pick Existing Organization</TabsTrigger>
                  <TabsTrigger value="create">Create New Organization</TabsTrigger>
                </TabsList>
                <TabsContent value="existing" className="space-y-3">
                  <div className="grid gap-2">
                    <Label>Governance Organization *</Label>
                    <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingOrganizations ? "Loading organizations..." : "Pilih organization governance"} />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((organization) => (
                          <SelectItem key={organization.id} value={organization.id}>
                            {organization.name} ({organization.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="create" className="space-y-3">
                  <div className="grid gap-2">
                    <Label>Organization Name *</Label>
                    <Input
                      value={newOrganization.name}
                      onChange={(event) => {
                        const name = event.target.value;
                        setNewOrganization((prev) => ({
                          ...prev,
                          name,
                          ...(!orgCodeManuallyEdited ? { code: generateCode(name) } : {}),
                        }));
                      }}
                      placeholder="Contoh: PT Pertamina Hulu Energi"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Organization Code *</Label>
                    <Input
                      value={newOrganization.code}
                      onChange={(event) => {
                        setOrgCodeManuallyEdited(true);
                        setNewOrganization((prev) => ({ ...prev, code: event.target.value }));
                      }}
                      placeholder="Auto-generated dari nama"
                    />
                    <p className="text-[11px] text-muted-foreground">Auto-generated dari nama organisasi. Bisa diedit manual.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description *</Label>
                    <Input value={newOrganization.description} onChange={(event) => setNewOrganization((prev) => ({ ...prev, description: event.target.value }))} placeholder="Minimal 10 karakter" />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* ── Visual connector ── */}
            <div className="flex items-center justify-center">
              <ChevronRight className="h-5 w-5 rotate-90 text-muted-foreground/50" />
            </div>

            {/* ── Step 1b: Register Participant ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1b</span>
                <div>
                  <p className="text-sm font-semibold">Register Participant</p>
                  <p className="text-[11px] text-muted-foreground">Participant adalah entitas yang akan mendapat akses domain. Buat baru atau pilih yang sudah ada.</p>
                </div>
              </div>

              <Tabs
                value={participantTabMode}
                onValueChange={(value) => {
                  const mode = value as ParticipantTabMode;
                  setParticipantTabMode(mode);
                  // Reset state saat switch tab supaya domain mapping nggak bocor
                  setCreatedParticipant(null);
                  setLastCreatedUser(null);
                }}
              >
                <TabsList className="mb-4 grid w-full grid-cols-2">
                  <TabsTrigger value="create-new">Create New</TabsTrigger>
                  <TabsTrigger value="use-existing">Use Existing</TabsTrigger>
                </TabsList>

                <TabsContent value="create-new">
                  {orgBindingMode === "existing" && !selectedOrganization && (
                    <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
                      ⚠️ Pilih governance organization dulu di Step 1a sebelum submit participant.
                    </div>
                  )}
                  <ParticipantForm
                    onSubmit={handleParticipantSubmit}
                    isLoading={createParticipant.isPending || createOrganization.isPending}
                    onCancel={() => {
                      setCreatedParticipant(null);
                      setLastCreatedUser(null);
                    }}
                  />
                </TabsContent>

                <TabsContent value="use-existing" className="space-y-4">
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-sm">
                    <p className="font-medium">Participant existing bisa langsung dipakai.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pilih participant dari section existing participant di atas, atau pakai dropdown ini untuk lanjut ke step user.
                    </p>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                    <Select value={existingParticipantId} onValueChange={setExistingParticipantId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih participant existing" />
                      </SelectTrigger>
                      <SelectContent>
                        {participants.map((participant) => (
                          <SelectItem key={participant.id} value={participant.id}>
                            {participant.organization_name} ({participant.organization_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => handleUseExistingParticipant()} disabled={!selectedExistingParticipant}>
                      Pakai Participant Ini
                    </Button>
                  </div>
                  {selectedExistingParticipant && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                      <p className="font-medium">{selectedExistingParticipant.organization_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Contact: {selectedExistingParticipant.contact_person?.name || "-"} · {selectedExistingParticipant.contact_person?.email || "-"}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Step 2 - Create Linked Login User</CardTitle>
            <CardDescription>
              POST <code className="rounded bg-muted px-1 text-xs">/api/v1/identity-provider/users/</code> dengan <code className="rounded bg-muted px-1 text-xs">participant_id</code> dari participant yang dipilih.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {createdParticipant ? (
              <>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <p className="font-medium">{createdParticipant.organization_name}</p>
                    <Badge variant="outline" className="text-[10px]">{createdParticipant.organization_type}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Participant ID <code className="rounded bg-muted px-1">{createdParticipant.id}</code> akan dipakai otomatis saat create user.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>Linked role</Label>
                  <Select value={linkedRole} onValueChange={(value) => setLinkedRole(value as LinkedRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSUMER">CONSUMER</SelectItem>
                      <SelectItem value="PROVIDER">PROVIDER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Username *</Label>
                    <Input value={userForm.username} onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Full Name</Label>
                    <Input value={userForm.full_name} onChange={(event) => setUserForm((prev) => ({ ...prev, full_name: event.target.value }))} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Email *</Label>
                    <Input type="email" value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Participant linkage</Label>
                    <Input value={createdParticipant.id} readOnly className="font-mono text-xs" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Password *</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={userForm.password}
                        onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Confirm Password *</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={userForm.confirm_password}
                      onChange={(event) => setUserForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Category *</Label>
                    <Select value={userForm.category_id} onValueChange={(value) => setUserForm((prev) => ({ ...prev, category_id: value, group_id: "" }))}>
                      <SelectTrigger><SelectValue placeholder="Pick category" /></SelectTrigger>
                      <SelectContent>
                        {(roleCategories.length > 0 ? roleCategories : categories).map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.name || category.code} ({category.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Group *</Label>
                    <Select value={userForm.group_id} onValueChange={(value) => setUserForm((prev) => ({ ...prev, group_id: value }))}>
                      <SelectTrigger><SelectValue placeholder="Pick group" /></SelectTrigger>
                      <SelectContent>
                        {filteredGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>{group.name || group.code} ({group.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs space-y-2">
                  <p className="flex items-center gap-1">
                    Derived app role: <Badge variant="outline" className={`ml-1 text-[10px] ${ROLE_BADGE_COLORS[derivedRole] || ""}`}>{ROLE_LABELS[derivedRole]}</Badge>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Role ditentukan dari kombinasi Category + Group. Category <strong>PROVIDER</strong> → Admin Provider (KKKS), Category <strong>CONSUMER</strong> → Admin Consumer (SKK Migas).
                  </p>
                  <p className="text-[11px] text-amber-600">
                    ⚠️ Setelah user dibuat, link ke participant bersifat permanen. Pastikan participant sudah benar sebelum create user.
                  </p>
                </div>

                {linkedUserExists && !lastCreatedUser && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600">
                    Sudah ada user dengan email yang sama di identity-provider. Kalau mau bikin onboarding baru, pakai email lain atau cek halaman Register Admin Login dulu.
                  </div>
                )}

                {lastCreatedUser && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-600">
                    Linked user <strong>{lastCreatedUser.username}</strong> berhasil dibuat. Lanjutkan ke email confirmation helper untuk set password via token kalau perlu.
                  </div>
                )}
                {!loadingCurrentMappings && currentParticipantMappings.length === 0 && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
                    Participant <strong>{createdParticipant.organization_name}</strong> belum punya domain mapping. Lanjutkan ke{" "}
                    <Link to="/v2/admin-consumer/domain-mapping" className="underline font-medium">
                      Domain Mapping
                    </Link>{" "}
                    supaya participant ini dapat domain access.
                  </div>
                )}
                {!loadingCurrentMappings && currentParticipantMappings.length > 0 && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700">
                    Participant <strong>{createdParticipant.organization_name}</strong> sudah punya {currentParticipantMappings.length} domain mapping aktif.
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreatedParticipant(null)}>Reset Flow</Button>
                  <Button onClick={handleCreateLinkedUser} disabled={createUser.isPending || linkedUserExists || !canManage} className="gap-2">
                    {createUser.isPending ? "Creating..." : "Create Linked User"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Create participant baru atau pilih participant yang sudah ada dulu. Setelah itu step create linked login user akan kebuka di sini.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ParticipantDeleteDialog
        participant={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConflict(null);
          }
        }}
        onConfirm={handleDeleteParticipant}
        isDeleting={deleteParticipant.isPending}
        serverConflict={deleteConflict}
      />
    </V2PageShell>
  );
};

export default ParticipantRegistration;
