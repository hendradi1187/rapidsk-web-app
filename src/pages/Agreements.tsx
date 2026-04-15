import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAgreements,
  useCreateAgreement,
  useUpdateAgreement,
  useDeleteAgreement,
} from "@/api/hooks/useAgreements";
import { useAllDomains } from "@/api/hooks/useDomains";
import { Agreement } from "@/api/types";

import { AgreementForm } from "@/components/policy-contract/AgreementForm";
import type { AgreementFormValues } from "@/components/policy-contract/agreement.schemas";

const AgreementsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);

  const { data: domainsData } = useAllDomains();
  
  useEffect(() => {
    if (!selectedDomainId && domainsData?.data?.[0]) {
      setSelectedDomainId(domainsData.data[0].id);
    }
  }, [domainsData, selectedDomainId]);

  const {
    data: agreementData,
    isLoading,
    refetch,
  } = useAgreements(selectedDomainId);

  const createMutation = useCreateAgreement();
  const updateMutation = useUpdateAgreement();
  const deleteMutation = useDeleteAgreement();

  const handleAdd = () => {
    setSelectedAgreement(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (a: Agreement) => {
    setSelectedAgreement(a);
    setIsDialogOpen(true);
  };

  const onFormSubmit = async (values: AgreementFormValues) => {
    if (!selectedDomainId) return;
    const payload = {
      contract_id: values.contract_id,
      effective_from: new Date(values.effective_from).toISOString(),
      effective_to: new Date(values.effective_to).toISOString(),
      status: values.status ?? undefined,
    };

    try {
      if (selectedAgreement) {
        await updateMutation.mutateAsync({
          domainId: selectedDomainId,
          id: selectedAgreement.id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync({
          domainId: selectedDomainId,
          data: {
            contract_id: payload.contract_id,
            effective_from: payload.effective_from,
            effective_to: payload.effective_to,
          },
        });
      }
      setIsDialogOpen(false);
      refetch();
    } catch (err) {}
  };

  const handleDelete = async () => {
    if (!selectedAgreement || !selectedDomainId) return;
    await deleteMutation.mutateAsync({ domainId: selectedDomainId, id: selectedAgreement.id });
    setIsDeleteDialogOpen(false);
    setSelectedAgreement(null);
  };

  if (isLoading && selectedDomainId) {
    return (
      <div className="min-h-screen">
        <Header title="Legal Agreements" subtitle="Review and audit signed data contracts" />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Legal Agreements" subtitle="Review and audit signed data contracts" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search agreements..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90">
             <Plus className="w-4 h-4 mr-2" /> Create Official Agreement
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Agreement ID</TableHead>
                <TableHead>Contract ID</TableHead>
                <TableHead>Effective Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreementData?.data?.filter(a => 
                a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.contract_id.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{a.id.slice(0, 13)}...</TableCell>
                  <TableCell className="font-mono text-xs">{a.contract_id.slice(0, 13)}...</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(a.effective_from).toLocaleDateString()} - {new Date(a.effective_to).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                     <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{a.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(a)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setSelectedAgreement(a); setIsDeleteDialogOpen(true); }} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Revoke
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAgreement ? "Edit Agreement" : "Create Official Agreement"}</DialogTitle>
            <DialogDescription>
              Set the contract and active date range for this agreement within the selected domain.
            </DialogDescription>
          </DialogHeader>
          <AgreementForm 
            initialData={selectedAgreement}
            domainId={selectedDomainId}
            onSubmit={onFormSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Agreement?</AlertDialogTitle>
            <AlertDialogDescription>This will immediately suspend data flow between participants.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgreementsPage;
