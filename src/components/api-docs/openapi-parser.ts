import type { HttpMethod, ApiParameter, ApiEndpoint, ApiCategory } from "./api-endpoints";

// ============ OpenAPI 3.1 Types ============

interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
}

interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
}

interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: SchemaOrRef }>;
  };
  responses?: Record<string, ResponseObject>;
}

interface ParameterObject {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  schema?: SchemaOrRef;
  description?: string;
}

interface ResponseObject {
  description?: string;
  content?: Record<string, { schema?: SchemaOrRef }>;
}

interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaOrRef>;
  required?: string[];
  items?: SchemaOrRef;
  enum?: string[];
  anyOf?: SchemaOrRef[];
  title?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

interface RefObject {
  $ref: string;
}

type SchemaOrRef = SchemaObject | RefObject;

// ============ Helpers ============

function isRef(obj: SchemaOrRef): obj is RefObject {
  return "$ref" in obj;
}

function resolveRef(
  ref: string,
  schemas: Record<string, SchemaObject>
): SchemaObject {
  const name = ref.replace("#/components/schemas/", "");
  return schemas[name] || {};
}

function resolveSchema(
  schema: SchemaOrRef,
  schemas: Record<string, SchemaObject>
): SchemaObject {
  if (isRef(schema)) return resolveRef(schema.$ref, schemas);
  return schema;
}

function getRefName(schema: SchemaOrRef): string | undefined {
  if (isRef(schema)) {
    return schema.$ref.replace("#/components/schemas/", "");
  }
  return undefined;
}

function resolveParamType(
  schema: SchemaOrRef | undefined,
  schemas: Record<string, SchemaObject>
): string {
  if (!schema) return "string";

  if (isRef(schema)) {
    const resolved = resolveRef(schema.$ref, schemas);
    if (resolved.enum) return `string (${resolved.enum.join(" | ")})`;
    return resolved.type || "string";
  }

  if (schema.anyOf) {
    const nonNull = schema.anyOf.filter(
      (s) => !("type" in s && s.type === "null")
    );
    if (nonNull.length === 1) return resolveParamType(nonNull[0], schemas);
    return "mixed";
  }

  let t = schema.type || "string";
  if (schema.format) t += ` (${schema.format})`;
  return t;
}

function generateExample(
  schema: SchemaObject,
  schemas: Record<string, SchemaObject>,
  depth = 0
): Record<string, unknown> {
  if (depth > 3 || !schema.properties) return {};
  const example: Record<string, unknown> = {};

  for (const [key, propSchemaOrRef] of Object.entries(schema.properties)) {
    const prop = resolveSchema(propSchemaOrRef, schemas);

    if (prop.enum) {
      example[key] = prop.enum[0];
    } else if (prop.type === "string") {
      if (prop.format === "uuid") {
        example[key] = "00000000-0000-0000-0000-000000000000";
      } else if (prop.format === "date-time") {
        example[key] = new Date().toISOString();
      } else {
        example[key] = prop.description || key;
      }
    } else if (prop.type === "integer" || prop.type === "number") {
      example[key] =
        prop.default !== undefined
          ? prop.default
          : prop.minimum !== undefined
            ? prop.minimum
            : 0;
    } else if (prop.type === "boolean") {
      example[key] = false;
    } else if (prop.type === "array") {
      if (prop.items) {
        const itemSchema = resolveSchema(prop.items, schemas);
        if (itemSchema.properties) {
          example[key] = [generateExample(itemSchema, schemas, depth + 1)];
        } else {
          example[key] = [];
        }
      } else {
        example[key] = [];
      }
    } else if (prop.type === "object" || prop.properties) {
      example[key] = generateExample(prop, schemas, depth + 1);
    } else if (prop.anyOf) {
      const nonNull = prop.anyOf.filter(
        (s) => !("type" in s && s.type === "null")
      );
      if (nonNull.length > 0) {
        const resolved = resolveSchema(nonNull[0], schemas);
        if (resolved.enum) {
          example[key] = resolved.enum[0];
        } else if (resolved.type === "string") {
          example[key] = resolved.description || key;
        } else {
          example[key] = null;
        }
      } else {
        example[key] = null;
      }
    }
  }

  return example;
}

// ============ Main Parser ============

export function parseOpenApiSpec(rawSpec: unknown): ApiCategory[] {
  const spec = rawSpec as OpenApiSpec;
  const schemas = spec.components?.schemas || {};
  const categoryMap = new Map<string, ApiEndpoint[]>();

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const methods: [string, OperationObject | undefined][] = [
      ["GET", pathItem.get],
      ["POST", pathItem.post],
      ["PUT", pathItem.put],
      ["PATCH", pathItem.patch],
      ["DELETE", pathItem.delete],
    ];

    for (const [method, operation] of methods) {
      if (!operation) continue;

      const tag = operation.tags?.[0] || "General";

      // Extract parameters
      const parameters: ApiParameter[] = [];
      if (operation.parameters) {
        for (const param of operation.parameters) {
          if (param.in === "path" || param.in === "query") {
            parameters.push({
              name: param.name,
              in: param.in,
              required: param.required ?? false,
              type: resolveParamType(param.schema, schemas),
              description: param.description,
            });
          }
        }
      }

      // Extract request body
      let requestBody: ApiEndpoint["requestBody"] = undefined;
      if (operation.requestBody?.content) {
        const jsonContent = operation.requestBody.content["application/json"];
        if (jsonContent?.schema) {
          const schemaRef = jsonContent.schema;
          const typeName = getRefName(schemaRef) || "object";
          const resolved = resolveSchema(schemaRef, schemas);
          const example = generateExample(resolved, schemas);

          requestBody = {
            type: typeName,
            example: Object.keys(example).length > 0 ? example : undefined,
          };
        }
      }

      // Extract responses
      const responses: ApiEndpoint["responses"] = {};
      if (operation.responses) {
        for (const [code, resp] of Object.entries(operation.responses)) {
          const jsonContent = resp.content?.["application/json"];
          let typeName: string | undefined;
          if (jsonContent?.schema) {
            typeName = getRefName(jsonContent.schema);
            if (!typeName) {
              const resolved = resolveSchema(jsonContent.schema, schemas);
              typeName = resolved.title || resolved.type;
            }
          }
          responses[code] = {
            description: resp.description || "",
            type: typeName,
          };
        }
      }

      const endpoint: ApiEndpoint = {
        method: method as HttpMethod,
        path,
        summary: operation.summary || "",
        description: operation.description,
        ...(parameters.length > 0 ? { parameters } : {}),
        ...(requestBody ? { requestBody } : {}),
        ...(Object.keys(responses).length > 0 ? { responses } : {}),
      };

      if (!categoryMap.has(tag)) {
        categoryMap.set(tag, []);
      }
      categoryMap.get(tag)!.push(endpoint);
    }
  }

  // Convert map to ApiCategory[]
  const categories: ApiCategory[] = [];
  for (const [name, endpoints] of categoryMap) {
    categories.push({ name, endpoints });
  }

  return categories;
}
