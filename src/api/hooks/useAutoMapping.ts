import { useMutation } from "@tanstack/react-query";
import { mappingApi } from "../services/mapping";
import type { MappingRequest } from "../types/mapping";

export function useAutoMapping() {
  return useMutation({
    mutationFn: (data: MappingRequest) => mappingApi.auto(data),
  });
}
