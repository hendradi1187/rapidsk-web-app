import { useState } from "react";
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
  Activity,
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
  useConnectionPools,
  useCreateConnectionPool,
  useUpdateConnectionPool,
  useDeleteConnectionPool,
} from "@/api/hooks/useConnectionPools";
import { ConnectionPool } from "@/api/types";

import { ConnectionPoolForm } from "@/components/onboarding/ConnectionPoolForm";
import type { ConnectionPoolFormValues } from "@/components/onboarding/connection-pool.schemas";

const ConnectionPoolsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<ConnectionPool | null>(null);

  const {
    data: poolsData,
    isLoading,
    refetch,
  } = useConnectionPools();

  const createMutation = useCreateConnectionPool();
  const updateMutation = useUpdateConnectionPool();
  const deleteMutation = useDeleteConnectionPool();

  const handleAdd = () => {
    setSelectedPool(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (pool: ConnectionPool) => {
    setSelectedPool(pool);
    setIsDialogOpen(true);
  };

  const onFormSubmit = async (values: ConnectionPoolFormValues) => {
    try {
      if (selectedPool) {
        await updateMutation.mutateAsync({ id: selectedPool.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setIsDialogOpen(false);
      refetch();
    } catch (err) {}
  };

  const handleDelete = async () => {
    if (!selectedPool) return;
    await deleteMutation.mutateAsync(selectedPool.id);
    setIsDeleteDialogOpen(false);
    setSelectedPool(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Connection Pools" subtitle="Manage network connection configurations" />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Connection Pools" subtitle="Manage network connection configurations" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search pools..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" /> Add Connection Pool
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Pool Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {poolsData?.data?.filter(p => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                p.type.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((pool) => (
                <TableRow key={pool.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-info/5 text-info">
                        <Activity className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{pool.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] tracking-widest uppercase">
                      {pool.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">TCP/Secure</TableCell>
                  <TableCell>
                     <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20 w-fit">
                      ONLINE
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(pool)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setSelectedPool(pool); setIsDeleteDialogOpen(true); }} className="text-destructive">
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
            <DialogTitle>{selectedPool ? "Edit Connection Pool" : "Add Connection Pool"}</DialogTitle>
            <DialogDescription>
              Connect a participant to consumer and provider endpoints with the required access token.
            </DialogDescription>
          </DialogHeader>
          <ConnectionPoolForm 
            initialData={selectedPool}
            onSubmit={onFormSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection Pool?</AlertDialogTitle>
            <AlertDialogDescription>This connection node will be decoupled from the network.</AlertDialogDescription>
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

export default ConnectionPoolsPage;
