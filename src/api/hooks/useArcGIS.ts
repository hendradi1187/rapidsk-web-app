import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { arcgisApi } from "../services/arcgis";
import type { ArcGISConnection } from "../types/arcgis";

export const arcgisKeys = {
  all: ["arcgis"] as const,
  layers: () => [...arcgisKeys.all, "layers"] as const,
};

export function useArcGISLayers() {
  return useQuery({
    queryKey: arcgisKeys.layers(),
    queryFn: () => arcgisApi.discover(),
  });
}

export function useArcGISConnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ArcGISConnection) => arcgisApi.connect(data),
    onSuccess: () => {
      // Invalidate layers — connection baru biasanya bikin layer list refresh
      queryClient.invalidateQueries({ queryKey: arcgisKeys.layers() });
    },
  });
}
