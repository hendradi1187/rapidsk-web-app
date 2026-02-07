import { useMemo, useState } from "react";
import { MoreHorizontal, PlusCircle, Search as SearchIcon, Loader2, RefreshCw, Users2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useParticipants,
  useCreateParticipant,
  useUpdateParticipant,
  useDeleteParticipant,
} from "@/api/hooks/useParticipants";
import { Participant, ParticipantCreateRequest } from "@/api/types";
import { ParticipantForm } from "@/components/participants/ParticipantForm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const ParticipantsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | undefined>(undefined);

  const { data: participantsData, isLoading, refetch } = useParticipants();
  const createMutation = useCreateParticipant();
  const updateMutation = useUpdateParticipant();
  const deleteMutation = useDeleteParticipant();

  const handleCreate = () => {
    setSelectedParticipant(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (participant: Participant) => {
    setSelectedParticipant(participant);
    setDialogOpen(true);
  };

  const handleDelete = (participant: Participant) => {
    setSelectedParticipant(participant);
    setDeleteDialogOpen(true);
  };

  const onFormSubmit = (values: ParticipantCreateRequest) => {
    const mutationPromise = selectedParticipant
      ? updateMutation.mutateAsync({ id: selectedParticipant.id, data: values })
      : createMutation.mutateAsync(values);

    toast.promise(mutationPromise, {
      loading: `Menyimpan participant...`,
      success: `Participant berhasil disimpan!`,
      error: `Gagal menyimpan participant.`,
    });
    
    mutationPromise.then(() => setDialogOpen(false));
  };
  
  const onConfirmDelete = () => {
    if (selectedParticipant) {
      toast.promise(deleteMutation.mutateAsync(selectedParticipant.id), {
        loading: `Menghapus participant...`,
        success: `Participant berhasil dihapus!`,
        error: `Gagal menghapus participant.`,
      });
      setDeleteDialogOpen(false);
    }
  };

  const filteredParticipants = useMemo(() => {
    if (!participantsData?.data) return [];
    return participantsData.data.filter((participant) =>
      participant.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.contact_person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.contact_person.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [participantsData?.data, searchQuery]);

  return (
    <div>
      <Header
        title="Participants"
        subtitle="Lihat dan kelola semua partisipan yang terdaftar."
      >
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Participant
        </Button>
      </Header>
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search participants..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Organization Name</TableHead>
                <TableHead>Organization Type</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading participants...</p>
                  </TableCell>
                </TableRow>
              ) : filteredParticipants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Users2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No participants found</p>
                    <p className="text-sm">
                      {searchQuery ? "Try adjusting your search" : "Create your first participant"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredParticipants.map((participant) => (
                  <TableRow key={participant.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {participant.organization_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{participant.organization_type}</Badge>
                    </TableCell>
                    <TableCell>{participant.contact_person.name}</TableCell>
                    <TableCell>{participant.contact_person.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(participant)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(participant)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedParticipant ? "Edit Participant" : "Create Participant"}
            </DialogTitle>
          </DialogHeader>
          <ParticipantForm
            initialData={selectedParticipant}
            onSubmit={onFormSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the participant
              "{selectedParticipant?.organization_name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ParticipantsPage;
