import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import RegistrationsTab from "./participants/RegistrationsTab";
import ActiveParticipantsTab from "./participants/ActiveParticipantsTab";

const Participants = () => {
  return (
    <div className="min-h-screen">
      <Header
        title="Participants"
        subtitle="Kelola antrean pendaftaran & data operasional peserta data space"
      />
      <div className="p-6">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">Akses pendaftaran publik KKKS</p>
            <p className="text-xs text-muted-foreground">
              Gunakan form publik `/register-kkks` untuk self-registration operator/provider baru.
            </p>
          </div>
          <Link to="/register-kkks">
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Buka Form /register-kkks
            </Button>
          </Link>
        </div>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Participants
            </TabsTrigger>
            <TabsTrigger value="registrations" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Registrations Queue
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-0 outline-none">
            <ActiveParticipantsTab />
          </TabsContent>
          
          <TabsContent value="registrations" className="mt-0 outline-none">
            <RegistrationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Participants;
