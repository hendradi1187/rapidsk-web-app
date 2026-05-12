import { useState, useEffect } from "react";
import { V2PageShell } from "../V2PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";

export const StorageConfig = () => {
  const [config, setConfig] = useState({
    storageType: "LOCAL",
    localPath: "/var/lib/cts/data",
    minioEndpoint: "http://minio.local:9000",
    minioBucket: "dataspace-consumer",
    minioAccessKey: "admin",
    minioSecretKey: "password",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load from localStorage mock
    const saved = localStorage.getItem("cts_storage_config");
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 600));
    localStorage.setItem("cts_storage_config", JSON.stringify(config));
    setIsSaving(false);
    toast.success("Storage configuration saved", {
      description: `Future consumed data will be saved to ${config.storageType === "LOCAL" ? "Local CTS Path" : "MinIO Bucket"}.`,
    });
  };

  return (
    <V2PageShell
      title="Storage Configuration"
      subtitle="Konfigurasi penyimpanan CTS untuk data hasil consume (GeoJSON/JSON)."
      status="Mock Backend"
    >
      <Card className="max-w-3xl border-border/50">
        <CardHeader>
          <CardTitle>Dataset Storage Settings</CardTitle>
          <CardDescription>
            Tentukan ke mana data hasil <code>Trigger Consume</code> akan disimpan di server CTS lokal Anda. 
            (Saat ini disimulasikan menggunakan Browser Storage untuk fitur Idempotent Consume).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>Storage Target *</Label>
            <Select value={config.storageType} onValueChange={(v) => setConfig((p) => ({ ...p, storageType: v }))}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Pilih target storage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOCAL">Local Server Path</SelectItem>
                <SelectItem value="MINIO">MinIO / S3 Compatible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.storageType === "LOCAL" ? (
            <div className="grid gap-2 rounded-lg border border-border/50 bg-muted/10 p-4">
              <Label>Local Path (Absolute) *</Label>
              <Input
                value={config.localPath}
                onChange={(e) => setConfig((p) => ({ ...p, localPath: e.target.value }))}
                placeholder="/var/www/cts/data"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Data akan disimpan langsung ke direktori server menggunakan backend file system.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 rounded-lg border border-border/50 bg-muted/10 p-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label>MinIO Endpoint URL *</Label>
                <Input
                  value={config.minioEndpoint}
                  onChange={(e) => setConfig((p) => ({ ...p, minioEndpoint: e.target.value }))}
                  placeholder="http://127.0.0.1:9000"
                />
              </div>
              <div className="grid gap-2">
                <Label>Bucket Name *</Label>
                <Input
                  value={config.minioBucket}
                  onChange={(e) => setConfig((p) => ({ ...p, minioBucket: e.target.value }))}
                  placeholder="consumer-data"
                />
              </div>
              <div className="grid gap-2">
                <Label>Region</Label>
                <Input
                  disabled
                  value="us-east-1"
                  placeholder="us-east-1"
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label>Access Key *</Label>
                <Input
                  value={config.minioAccessKey}
                  onChange={(e) => setConfig((p) => ({ ...p, minioAccessKey: e.target.value }))}
                  placeholder="Enter access key"
                />
              </div>
              <div className="grid gap-2">
                <Label>Secret Key *</Label>
                <Input
                  type="password"
                  value={config.minioSecretKey}
                  onChange={(e) => setConfig((p) => ({ ...p, minioSecretKey: e.target.value }))}
                  placeholder="Enter secret key"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border/40">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </V2PageShell>
  );
};

export default StorageConfig;
