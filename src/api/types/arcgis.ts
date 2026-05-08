// Based on rapiDSK Enterprise OpenAPI spec /arcgis/connect, /arcgis/discover

export interface ArcGISConnection {
  service_name: string;
  service_url: string;
}

export interface ArcGISLayer {
  layer_id: number;
  layer_name: string;
  geometry_type: string;
}

export type ArcGISLayerListResponse = ArcGISLayer[];
