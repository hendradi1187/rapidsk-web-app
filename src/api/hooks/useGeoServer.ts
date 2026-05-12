import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// --- Types ---
export interface GeoServerConnection {
  id: number;
  name: string;
  base_url: string;
  username: string;
  default_workspace: string;
  status: "Connected" | "Failed";
}

export interface GeoServerLayer {
  workspace: string;
  name: string;
  qualified_name: string;
  wms_url: string;
  wfs_url: string;
}

export interface GeoServerMapping {
  id: number;
  workspace: string;
  layer_name: string;
  module_name: string;
  data_type: string;
  source_table: string;
  label: string;
}

// --- Mock Data Store ---
let mockMappings: GeoServerMapping[] = [
  {
    id: 1,
    workspace: "cts",
    layer_name: "kantor_layanan",
    module_name: "kepegawaian",
    data_type: "lokasi_kantor",
    source_table: "offices",
    label: "Lokasi Kantor",
  },
  {
    id: 2,
    workspace: "cts",
    layer_name: "batas_wilayah",
    module_name: "wilayah",
    data_type: "batas_wilayah",
    source_table: "regions",
    label: "Batas Wilayah",
  },
];

let mockConnection: GeoServerConnection | null = {
  id: 1,
  name: "Main GeoServer",
  base_url: "https://maps.domain.go.id/geoserver",
  username: "admin",
  default_workspace: "cts",
  status: "Connected",
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Hooks ---

export const useTestGeoServerConnection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      await delay(1000); // Simulate network
      // Mock validation
      if (payload.password !== "geoserver") {
        throw new Error("401 Unauthorized");
      }
      
      // Update mock connection settings
      mockConnection = {
        id: 1,
        name: "Main GeoServer",
        base_url: payload.base_url,
        username: payload.username,
        default_workspace: payload.workspace,
        status: "Connected",
      };

      return {
        connected: true,
        message: "GeoServer connected",
        workspaces: ["cts", "public", "monitoring"],
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geoserver-connection"] });
      toast.success("GeoServer connection successful");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cannot connect to GeoServer");
    },
  });
};

export const useGetGeoServerConnection = () => {
  return useQuery({
    queryKey: ["geoserver-connection"],
    queryFn: async () => {
      await delay(500);
      return mockConnection;
    },
  });
};

export const useGetGeoServerLayers = (workspace: string) => {
  return useQuery({
    queryKey: ["geoserver-layers", workspace],
    queryFn: async () => {
      await delay(800);
      return {
        workspace: workspace,
        layers: [
          {
            name: "batas_wilayah",
            qualified_name: `${workspace}:batas_wilayah`,
            wms_url: `https://maps.domain.go.id/geoserver/${workspace}/wms`,
            wfs_url: `https://maps.domain.go.id/geoserver/${workspace}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${workspace}:batas_wilayah&outputFormat=application/json`,
          },
          {
            name: "kantor_layanan",
            qualified_name: `${workspace}:kantor_layanan`,
            wms_url: `https://maps.domain.go.id/geoserver/${workspace}/wms`,
            wfs_url: `https://maps.domain.go.id/geoserver/${workspace}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${workspace}:kantor_layanan&outputFormat=application/json`,
          },
          {
            name: "sebaran_absensi",
            qualified_name: `${workspace}:sebaran_absensi`,
            wms_url: `https://maps.domain.go.id/geoserver/${workspace}/wms`,
            wfs_url: `https://maps.domain.go.id/geoserver/${workspace}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${workspace}:sebaran_absensi&outputFormat=application/json`,
          },
          {
            name: "aset_infrastruktur",
            qualified_name: `${workspace}:aset_infrastruktur`,
            wms_url: `https://maps.domain.go.id/geoserver/${workspace}/wms`,
            wfs_url: `https://maps.domain.go.id/geoserver/${workspace}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${workspace}:aset_infrastruktur&outputFormat=application/json`,
          },
        ] as GeoServerLayer[],
      };
    },
    enabled: !!workspace,
  });
};

export const useSyncGeoServerLayers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { connection_id: number; workspace: string }) => {
      await delay(1200);
      return {
        message: "GeoServer layers synced",
        total: 4,
        data: [
          { layer: "cts:batas_wilayah", wms: "/api/maps/wms/cts/batas_wilayah", wfs: "/api/maps/wfs/cts/batas_wilayah" },
          { layer: "cts:kantor_layanan", wms: "/api/maps/wms/cts/kantor_layanan", wfs: "/api/maps/wfs/cts/kantor_layanan" },
        ],
      };
    },
    onSuccess: () => {
      toast.success("Layers synchronized successfully");
      queryClient.invalidateQueries({ queryKey: ["geoserver-layers"] });
    },
  });
};

export const useGetMapCatalog = () => {
  return useQuery({
    queryKey: ["map-catalog"],
    queryFn: async () => {
      await delay(600);
      return {
        data: mockMappings.map(m => ({
          module: m.module_name,
          data_type: m.data_type,
          label: m.label,
          layer: `${m.workspace}:${m.layer_name}`,
          endpoint: {
            wms: `/api/maps/wms/${m.workspace}/${m.layer_name}`,
            wfs: `/api/maps/wfs/${m.workspace}/${m.layer_name}`,
          },
          active: true,
        })),
      };
    },
  });
};

export const useGetLayerMappings = () => {
  return useQuery({
    queryKey: ["geoserver-layer-mappings"],
    queryFn: async () => {
      await delay(500);
      return { data: mockMappings };
    },
  });
};

export const useSaveLayerMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<GeoServerMapping, "id">) => {
      await delay(800);
      const newMapping = { ...payload, id: Date.now() };
      mockMappings = [...mockMappings, newMapping];
      return {
        message: "Layer mapping saved",
        data: {
          module_name: payload.module_name,
          data_type: payload.data_type,
          layer: `${payload.workspace}:${payload.layer_name}`,
          wms: `/api/maps/wms/${payload.workspace}/${payload.layer_name}`,
          wfs: `/api/maps/wfs/${payload.workspace}/${payload.layer_name}`,
        },
      };
    },
    onSuccess: () => {
      toast.success("Layer mapping saved successfully");
      queryClient.invalidateQueries({ queryKey: ["geoserver-layer-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["map-catalog"] });
    },
  });
};

export const useDeleteLayerMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await delay(500);
      mockMappings = mockMappings.filter(m => m.id !== id);
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Mapping deleted");
      queryClient.invalidateQueries({ queryKey: ["geoserver-layer-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["map-catalog"] });
    },
  });
};

export const useInjectToGeoServer = () => {
  return useMutation({
    mutationFn: async (payload: { data: any, targetLayer?: string }) => {
      await delay(2000); // simulate parsing to WFS-T XML and POST
      // Mock validation
      if (!payload.data || !payload.data.features) {
        throw new Error("Invalid GeoJSON: Missing features array");
      }
      return { success: true, count: payload.data.features.length };
    },
    onSuccess: (data) => {
      toast.success(`Berhasil! ${data.count} data berhasil di-inject ke GeoServer.`, {
        description: "Data sudah tersedia di layer WMS/WFS secara real-time.",
      });
    },
    onError: (error: any) => {
      toast.error("Gagal inject ke GeoServer", { description: error.message });
    }
  });
};
