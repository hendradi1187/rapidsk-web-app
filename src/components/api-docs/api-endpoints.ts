// API Endpoint Types for Documentation Page

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiParameter {
  name: string;
  in: "path" | "query" | "body" | "header";
  required: boolean;
  type: string;
  description?: string;
}

export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  summary: string;
  description?: string;
  parameters?: ApiParameter[];
  requestBody?: {
    type: string;
    example?: Record<string, unknown>;
  };
  responses?: {
    [code: string]: {
      description: string;
      type?: string;
    };
  };
}

export interface ApiCategory {
  name: string;
  description?: string;
  endpoints: ApiEndpoint[];
}

export const methodColors: Record<HttpMethod, { bg: string; text: string }> = {
  GET: { bg: "bg-green-500", text: "text-white" },
  POST: { bg: "bg-blue-500", text: "text-white" },
  PUT: { bg: "bg-orange-500", text: "text-white" },
  PATCH: { bg: "bg-yellow-500", text: "text-black" },
  DELETE: { bg: "bg-red-500", text: "text-white" },
};
