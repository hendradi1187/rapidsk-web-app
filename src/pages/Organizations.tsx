import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Filter,
  MoreHorizontal,
  Building2,
  Users,
  Database,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const organizations = [
  {
    id: 1,
    name: "PHE ONWJ",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi", "Reservoir", "Keuangan"],
    datasets: 24,
    contracts: 8,
    status: "active",
    avatar: "PO",
  },
  {
    id: 2,
    name: "Pertamina Hulu Energi",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi", "Eksplorasi"],
    datasets: 18,
    contracts: 6,
    status: "active",
    avatar: "PE",
  },
  {
    id: 3,
    name: "SKK Migas",
    type: "Regulator",
    role: "Consumer",
    units: ["Monitoring", "Compliance", "Data Analytics"],
    datasets: 0,
    contracts: 14,
    status: "active",
    avatar: "SK",
  },
  {
    id: 4,
    name: "Medco E&P Indonesia",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi"],
    datasets: 12,
    contracts: 4,
    status: "pending",
    avatar: "ME",
  },
  {
    id: 5,
    name: "Chevron Indonesia",
    type: "KKKS",
    role: "Provider",
    units: ["Produksi", "Reservoir", "HSE"],
    datasets: 32,
    contracts: 10,
    status: "active",
    avatar: "CI",
  },
];

const Organizations = () => {
  return (
    <div className="min-h-screen">
      <Header
        title="Organizations"
        subtitle="Manage KKKS and SKK Migas participants"
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Building2 className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Total Organizations</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">48</p>
                <p className="text-sm text-muted-foreground">Total Units</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Database className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">86</p>
                <p className="text-sm text-muted-foreground">Registered Datasets</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search organizations..." className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Organization
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Units</TableHead>
                <TableHead className="text-center">Datasets</TableHead>
                <TableHead className="text-center">Contracts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {org.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{org.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{org.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        org.role === "Provider"
                          ? "bg-info/10 text-info border-info/30"
                          : "bg-accent/10 text-accent border-accent/30"
                      }
                    >
                      {org.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {org.units.slice(0, 2).map((unit) => (
                        <Badge key={unit} variant="secondary" className="text-xs">
                          {unit}
                        </Badge>
                      ))}
                      {org.units.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{org.units.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">{org.datasets}</TableCell>
                  <TableCell className="text-center font-medium">{org.contracts}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        org.status === "active" ? "badge-active" : "badge-pending"
                      }
                    >
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Organizations;
