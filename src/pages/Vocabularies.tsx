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
  Tag,
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
  useVocabularies,
  useCreateVocabulary,
  useUpdateVocabulary,
  useDeleteVocabulary,
} from "@/api/hooks/useVocabularies";
import { useAllDomains } from "@/api/hooks/useDomains";
import { VocabularyWithoutTerms } from "@/api/types";

import { VocabularyForm } from "@/components/catalog/VocabularyForm";
import type { VocabularyFormValues } from "@/components/catalog/vocabulary.schemas";

const VocabulariesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVocab, setSelectedVocab] = useState<VocabularyWithoutTerms | null>(null);

  // Fetch all domains to pick one (Vocabularies are domain-scoped)
  const { data: domainsData } = useAllDomains();
  
  // Update domain if not set
  useEffect(() => {
    if (!selectedDomainId && domainsData?.data?.[0]) {
      setSelectedDomainId(domainsData.data[0].id);
    }
  }, [domainsData, selectedDomainId]);

  const {
    data: vocabData,
    isLoading,
    refetch,
  } = useVocabularies(selectedDomainId);

  const createMutation = useCreateVocabulary();
  const updateMutation = useUpdateVocabulary();
  const deleteMutation = useDeleteVocabulary();

  const handleAdd = () => {
    setSelectedVocab(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (vocab: VocabularyWithoutTerms) => {
    setSelectedVocab(vocab);
    setIsDialogOpen(true);
  };

  const onFormSubmit = async (values: VocabularyFormValues) => {
    if (!selectedDomainId) return;
    try {
      if (selectedVocab) {
        await updateMutation.mutateAsync({
          domainId: selectedDomainId,
          id: selectedVocab.id,
          data: values,
        });
      } else {
        await createMutation.mutateAsync({
          domainId: selectedDomainId,
          data: {
            ...values,
            terms: [], // Backend expected field
          },
        });
      }
      setIsDialogOpen(false);
      refetch();
    } catch (err) {}
  };

  const handleDelete = async () => {
    if (!selectedVocab || !selectedDomainId) return;
    await deleteMutation.mutateAsync({ domainId: selectedDomainId, id: selectedVocab.id });
    setIsDeleteDialogOpen(false);
    setSelectedVocab(null);
  };

  if (isLoading && selectedDomainId) {
    return (
      <div className="min-h-screen">
        <Header title="Vocabularies" subtitle="Manage terms and classifications" />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Vocabularies" subtitle="Manage terms and classifications" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search vocabularies..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" /> Add Vocabulary
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Vocabulary Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vocabData?.data?.filter(v => 
                v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                v.id.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-accent" />
                      <span className="font-medium">{v.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{v.version}</Badge></TableCell>
                  <TableCell className="text-muted-foreground line-clamp-1">{v.description || "—"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(v)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setSelectedVocab(v); setIsDeleteDialogOpen(true); }} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
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
            <DialogTitle>{selectedVocab ? "Edit Vocabulary" : "Add Vocabulary"}</DialogTitle>
            <DialogDescription>
              Configure the vocabulary metadata and publication status for this domain.
            </DialogDescription>
          </DialogHeader>
          <VocabularyForm 
            initialData={selectedVocab}
            onSubmit={onFormSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vocabulary?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the vocabulary schema.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VocabulariesPage;
