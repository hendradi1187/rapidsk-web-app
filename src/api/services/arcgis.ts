import { apiClient } from "../client";
import type {
  ArcGISConnection,
  ArcGISLayerListResponse,
} from "../types/arcgis";

export const arcgisApi = {
  /**
   * Connect ArcGIS service. Spec tidak define response shape secara explicit
   * — backend kemungkinan return acknowledgement / connection_id.
   */
  connect: async (data: ArcGISConnection): Promise<unknown> => {
    const response = await apiClient.post("/arcgis/connect", data);
    return response.data;
  },

  /**
   * Discover layers from connected ArcGIS service(s).
   */
  discover: async (): Promise<ArcGISLayerListResponse> => {
    const response = await apiClient.get<ArcGISLayerListResponse>(
      "/arcgis/discover",
    );
    return response.data;
  },
};
