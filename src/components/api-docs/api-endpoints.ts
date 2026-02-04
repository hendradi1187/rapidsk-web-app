// API Endpoint Configuration for Documentation Page

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

export const apiCategories: ApiCategory[] = [
  {
    name: "General",
    description: "General API endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/",
        summary: "Root",
        description: "Get API information",
        responses: {
          "200": { description: "Successful Response", type: "object" },
        },
      },
      {
        method: "GET",
        path: "/health",
        summary: "Health Check",
        description: "Check API health status",
        responses: {
          "200": { description: "Successful Response", type: "object" },
        },
      },
    ],
  },
  {
    name: "Governance - Organizations",
    description: "Organization management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/governance/organizations",
        summary: "Get Organizations",
        description: "Retrieve list of all organizations",
        parameters: [
          { name: "skip", in: "query", required: false, type: "integer", description: "Number of records to skip" },
          { name: "limit", in: "query", required: false, type: "integer", description: "Maximum number of records" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "OrganizationListResponse" },
        },
      },
      {
        method: "POST",
        path: "/governance/organizations",
        summary: "Create Organization",
        description: "Create a new organization",
        requestBody: {
          type: "OrganizationCreateRequest",
          example: {
            name: "Organization Name",
            type: "KKKS",
            role: "Provider",
          },
        },
        responses: {
          "201": { description: "Created", type: "Organization" },
          "422": { description: "Validation Error" },
        },
      },
      {
        method: "GET",
        path: "/governance/organizations/{organization_id}",
        summary: "Get Organization",
        description: "Retrieve organization by ID",
        parameters: [
          { name: "organization_id", in: "path", required: true, type: "string", description: "Organization ID" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Organization" },
          "404": { description: "Not Found" },
        },
      },
      {
        method: "PATCH",
        path: "/governance/organizations/{organization_id}",
        summary: "Update Organization",
        description: "Update an existing organization",
        parameters: [
          { name: "organization_id", in: "path", required: true, type: "string", description: "Organization ID" },
        ],
        requestBody: {
          type: "OrganizationUpdateRequest",
        },
        responses: {
          "200": { description: "Successful Response", type: "Organization" },
          "404": { description: "Not Found" },
          "422": { description: "Validation Error" },
        },
      },
      {
        method: "DELETE",
        path: "/governance/organizations/{organization_id}",
        summary: "Delete Organization",
        description: "Delete an organization",
        parameters: [
          { name: "organization_id", in: "path", required: true, type: "string", description: "Organization ID" },
        ],
        responses: {
          "200": { description: "Successful Response" },
          "404": { description: "Not Found" },
        },
      },
    ],
  },
  {
    name: "Governance - Domains",
    description: "Domain management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/governance/domains",
        summary: "Get Domains",
        description: "Retrieve list of all domains",
        parameters: [
          { name: "skip", in: "query", required: false, type: "integer", description: "Number of records to skip" },
          { name: "limit", in: "query", required: false, type: "integer", description: "Maximum number of records" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "DomainListResponse" },
        },
      },
      {
        method: "POST",
        path: "/governance/domains",
        summary: "Create Domain",
        description: "Create a new domain",
        requestBody: {
          type: "DomainCreateRequest",
          example: {
            name: "Domain Name",
            description: "Domain description",
          },
        },
        responses: {
          "201": { description: "Created", type: "Domain" },
          "422": { description: "Validation Error" },
        },
      },
      {
        method: "GET",
        path: "/governance/domains/{domain_id}",
        summary: "Get Domain",
        description: "Retrieve domain by ID",
        parameters: [
          { name: "domain_id", in: "path", required: true, type: "string", description: "Domain ID" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Domain" },
          "404": { description: "Not Found" },
        },
      },
      {
        method: "PATCH",
        path: "/governance/domains/{domain_id}",
        summary: "Update Domain",
        description: "Update an existing domain",
        parameters: [
          { name: "domain_id", in: "path", required: true, type: "string", description: "Domain ID" },
        ],
        requestBody: {
          type: "DomainUpdateRequest",
        },
        responses: {
          "200": { description: "Successful Response", type: "Domain" },
          "404": { description: "Not Found" },
          "422": { description: "Validation Error" },
        },
      },
      {
        method: "DELETE",
        path: "/governance/domains/{domain_id}",
        summary: "Delete Domain",
        description: "Delete a domain",
        parameters: [
          { name: "domain_id", in: "path", required: true, type: "string", description: "Domain ID" },
        ],
        responses: {
          "200": { description: "Successful Response" },
          "404": { description: "Not Found" },
        },
      },
    ],
  },
  {
    name: "Data Catalog - Vocabulary",
    description: "Vocabulary management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/data-catalog/vocabularies",
        summary: "Get Vocabularies",
        description: "Retrieve list of all vocabularies",
        parameters: [
          { name: "skip", in: "query", required: false, type: "integer" },
          { name: "limit", in: "query", required: false, type: "integer" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "VocabularyListResponse" },
        },
      },
      {
        method: "POST",
        path: "/data-catalog/vocabularies",
        summary: "Create Vocabulary",
        description: "Create a new vocabulary",
        requestBody: {
          type: "VocabularyCreateRequest",
          example: {
            name: "Vocabulary Name",
            namespace: "https://example.org/vocab",
          },
        },
        responses: {
          "201": { description: "Created", type: "Vocabulary" },
          "422": { description: "Validation Error" },
        },
      },
      {
        method: "GET",
        path: "/data-catalog/vocabularies/{vocabulary_id}",
        summary: "Get Vocabulary",
        description: "Retrieve vocabulary by ID",
        parameters: [
          { name: "vocabulary_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Vocabulary" },
          "404": { description: "Not Found" },
        },
      },
      {
        method: "PATCH",
        path: "/data-catalog/vocabularies/{vocabulary_id}",
        summary: "Update Vocabulary",
        description: "Update an existing vocabulary",
        parameters: [
          { name: "vocabulary_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Vocabulary" },
        },
      },
      {
        method: "DELETE",
        path: "/data-catalog/vocabularies/{vocabulary_id}",
        summary: "Delete Vocabulary",
        description: "Delete a vocabulary",
        parameters: [
          { name: "vocabulary_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
  {
    name: "Data Catalog - Datasets",
    description: "Dataset management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/data-catalog/datasets",
        summary: "Get Datasets",
        description: "Retrieve list of all datasets",
        parameters: [
          { name: "skip", in: "query", required: false, type: "integer" },
          { name: "limit", in: "query", required: false, type: "integer" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "DatasetListResponse" },
        },
      },
      {
        method: "POST",
        path: "/data-catalog/datasets",
        summary: "Create Dataset",
        description: "Create a new dataset",
        requestBody: {
          type: "DatasetCreateRequest",
          example: {
            name: "Dataset Name",
            endpoint: "https://api.example.com/data",
            format: "JSON",
          },
        },
        responses: {
          "201": { description: "Created", type: "Dataset" },
          "422": { description: "Validation Error" },
        },
      },
      {
        method: "GET",
        path: "/data-catalog/datasets/{dataset_id}",
        summary: "Get Dataset",
        description: "Retrieve dataset by ID",
        parameters: [
          { name: "dataset_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Dataset" },
          "404": { description: "Not Found" },
        },
      },
      {
        method: "PATCH",
        path: "/data-catalog/datasets/{dataset_id}",
        summary: "Update Dataset",
        description: "Update an existing dataset",
        parameters: [
          { name: "dataset_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Dataset" },
        },
      },
      {
        method: "DELETE",
        path: "/data-catalog/datasets/{dataset_id}",
        summary: "Delete Dataset",
        description: "Delete a dataset",
        parameters: [
          { name: "dataset_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
  {
    name: "Data Catalog - Schemas",
    description: "Schema management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/data-catalog/schemas",
        summary: "Get Schemas",
        description: "Retrieve list of all schemas",
        responses: {
          "200": { description: "Successful Response", type: "SchemaListResponse" },
        },
      },
      {
        method: "POST",
        path: "/data-catalog/schemas",
        summary: "Create Schema",
        description: "Create a new schema",
        requestBody: {
          type: "SchemaCreateRequest",
        },
        responses: {
          "201": { description: "Created", type: "Schema" },
        },
      },
      {
        method: "GET",
        path: "/data-catalog/schemas/{schema_id}",
        summary: "Get Schema",
        description: "Retrieve schema by ID",
        parameters: [
          { name: "schema_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Schema" },
        },
      },
      {
        method: "PATCH",
        path: "/data-catalog/schemas/{schema_id}",
        summary: "Update Schema",
        description: "Update an existing schema",
        parameters: [
          { name: "schema_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Schema" },
        },
      },
      {
        method: "DELETE",
        path: "/data-catalog/schemas/{schema_id}",
        summary: "Delete Schema",
        description: "Delete a schema",
        parameters: [
          { name: "schema_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
  {
    name: "Onboarding - Participants",
    description: "Participant management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/onboarding/participants",
        summary: "Get Participants",
        description: "Retrieve list of all participants",
        responses: {
          "200": { description: "Successful Response", type: "ParticipantListResponse" },
        },
      },
      {
        method: "POST",
        path: "/onboarding/participants",
        summary: "Create Participant",
        description: "Create a new participant",
        requestBody: {
          type: "ParticipantCreateRequest",
        },
        responses: {
          "201": { description: "Created", type: "Participant" },
        },
      },
      {
        method: "GET",
        path: "/onboarding/participants/{participant_id}",
        summary: "Get Participant",
        description: "Retrieve participant by ID",
        parameters: [
          { name: "participant_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Participant" },
        },
      },
      {
        method: "PATCH",
        path: "/onboarding/participants/{participant_id}",
        summary: "Update Participant",
        description: "Update an existing participant",
        parameters: [
          { name: "participant_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Participant" },
        },
      },
      {
        method: "DELETE",
        path: "/onboarding/participants/{participant_id}",
        summary: "Delete Participant",
        description: "Delete a participant",
        parameters: [
          { name: "participant_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
  {
    name: "Onboarding - Connection Pools",
    description: "Connection pool management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/onboarding/connection-pools",
        summary: "Get Connection Pools",
        description: "Retrieve list of all connection pools",
        responses: {
          "200": { description: "Successful Response", type: "ConnectionPoolListResponse" },
        },
      },
      {
        method: "POST",
        path: "/onboarding/connection-pools",
        summary: "Create Connection Pool",
        description: "Create a new connection pool",
        requestBody: {
          type: "ConnectionPoolCreateRequest",
        },
        responses: {
          "201": { description: "Created", type: "ConnectionPool" },
        },
      },
      {
        method: "GET",
        path: "/onboarding/connection-pools/{connection_pool_id}",
        summary: "Get Connection Pool",
        description: "Retrieve connection pool by ID",
        parameters: [
          { name: "connection_pool_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "ConnectionPool" },
        },
      },
      {
        method: "PATCH",
        path: "/onboarding/connection-pools/{connection_pool_id}",
        summary: "Update Connection Pool",
        description: "Update an existing connection pool",
        parameters: [
          { name: "connection_pool_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "ConnectionPool" },
        },
      },
      {
        method: "DELETE",
        path: "/onboarding/connection-pools/{connection_pool_id}",
        summary: "Delete Connection Pool",
        description: "Delete a connection pool",
        parameters: [
          { name: "connection_pool_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
  {
    name: "Policy & Contract - Dataset Policies",
    description: "Dataset policy management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/policy-contract/dataset-policies",
        summary: "Get Dataset Policies",
        description: "Retrieve list of all dataset policies",
        responses: {
          "200": { description: "Successful Response", type: "DatasetPolicyListResponse" },
        },
      },
      {
        method: "POST",
        path: "/policy-contract/dataset-policies",
        summary: "Create Dataset Policy",
        description: "Create a new dataset policy",
        requestBody: {
          type: "DatasetPolicyCreateRequest",
          example: {
            name: "Policy Name",
            version: "1.0.0",
            type: "ACCESS",
            rules: [],
          },
        },
        responses: {
          "201": { description: "Created", type: "DatasetPolicy" },
        },
      },
      {
        method: "GET",
        path: "/policy-contract/dataset-policies/{dataset_policy_id}",
        summary: "Get Dataset Policy",
        description: "Retrieve dataset policy by ID",
        parameters: [
          { name: "dataset_policy_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "DatasetPolicy" },
        },
      },
      {
        method: "PATCH",
        path: "/policy-contract/dataset-policies/{dataset_policy_id}",
        summary: "Update Dataset Policy",
        description: "Update an existing dataset policy",
        parameters: [
          { name: "dataset_policy_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "DatasetPolicy" },
        },
      },
      {
        method: "DELETE",
        path: "/policy-contract/dataset-policies/{dataset_policy_id}",
        summary: "Delete Dataset Policy",
        description: "Delete a dataset policy",
        parameters: [
          { name: "dataset_policy_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
  {
    name: "Policy & Contract - Contract Policies",
    description: "Contract policy management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/policy-contract/contract-policies",
        summary: "Get Contract Policies",
        description: "Retrieve list of all contract policies",
        responses: {
          "200": { description: "Successful Response", type: "ContractPolicyListResponse" },
        },
      },
      {
        method: "POST",
        path: "/policy-contract/contract-policies",
        summary: "Create Contract Policy",
        description: "Create a new contract policy",
        requestBody: {
          type: "ContractPolicyCreateRequest",
        },
        responses: {
          "201": { description: "Created", type: "ContractPolicy" },
        },
      },
      {
        method: "GET",
        path: "/policy-contract/contract-policies/{contract_policy_id}",
        summary: "Get Contract Policy",
        description: "Retrieve contract policy by ID",
        parameters: [
          { name: "contract_policy_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "ContractPolicy" },
        },
      },
      {
        method: "PATCH",
        path: "/policy-contract/contract-policies/{contract_policy_id}",
        summary: "Update Contract Policy",
        description: "Update an existing contract policy",
        parameters: [
          { name: "contract_policy_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "ContractPolicy" },
        },
      },
      {
        method: "DELETE",
        path: "/policy-contract/contract-policies/{contract_policy_id}",
        summary: "Delete Contract Policy",
        description: "Delete a contract policy",
        parameters: [
          { name: "contract_policy_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
  {
    name: "Policy & Contract - Contracts",
    description: "Contract management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/policy-contract/contracts",
        summary: "Get Contracts",
        description: "Retrieve list of all contracts",
        responses: {
          "200": { description: "Successful Response", type: "ContractListResponse" },
        },
      },
      {
        method: "POST",
        path: "/policy-contract/contracts",
        summary: "Create Contract",
        description: "Create a new contract",
        requestBody: {
          type: "ContractCreateRequest",
          example: {
            name: "Contract Name",
            provider_id: "provider-uuid",
            contract_policies: [],
            datasets: [],
          },
        },
        responses: {
          "201": { description: "Created", type: "Contract" },
        },
      },
      {
        method: "GET",
        path: "/policy-contract/contracts/{contract_id}",
        summary: "Get Contract",
        description: "Retrieve contract by ID",
        parameters: [
          { name: "contract_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Contract" },
        },
      },
      {
        method: "PATCH",
        path: "/policy-contract/contracts/{contract_id}",
        summary: "Update Contract",
        description: "Update an existing contract",
        parameters: [
          { name: "contract_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Contract" },
        },
      },
      {
        method: "DELETE",
        path: "/policy-contract/contracts/{contract_id}",
        summary: "Delete Contract",
        description: "Delete a contract",
        parameters: [
          { name: "contract_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
  {
    name: "Policy & Contract - Agreements",
    description: "Agreement management endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/policy-contract/agreements",
        summary: "Get Agreements",
        description: "Retrieve list of all agreements",
        responses: {
          "200": { description: "Successful Response", type: "AgreementListResponse" },
        },
      },
      {
        method: "POST",
        path: "/policy-contract/agreements",
        summary: "Create Agreement",
        description: "Create a new agreement",
        requestBody: {
          type: "AgreementCreateRequest",
        },
        responses: {
          "201": { description: "Created", type: "Agreement" },
        },
      },
      {
        method: "GET",
        path: "/policy-contract/agreements/{agreement_id}",
        summary: "Get Agreement",
        description: "Retrieve agreement by ID",
        parameters: [
          { name: "agreement_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Agreement" },
        },
      },
      {
        method: "PATCH",
        path: "/policy-contract/agreements/{agreement_id}",
        summary: "Update Agreement",
        description: "Update an existing agreement",
        parameters: [
          { name: "agreement_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response", type: "Agreement" },
        },
      },
      {
        method: "DELETE",
        path: "/policy-contract/agreements/{agreement_id}",
        summary: "Delete Agreement",
        description: "Delete an agreement",
        parameters: [
          { name: "agreement_id", in: "path", required: true, type: "string" },
        ],
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
  {
    name: "Connector - Consumer",
    description: "Consumer connector endpoints",
    endpoints: [
      {
        method: "GET",
        path: "/connector/consumer/catalog",
        summary: "Get Catalog",
        description: "Retrieve consumer catalog",
        responses: {
          "200": { description: "Successful Response" },
        },
      },
      {
        method: "POST",
        path: "/connector/consumer/negotiate",
        summary: "Negotiate Contract",
        description: "Initiate contract negotiation",
        requestBody: {
          type: "NegotiateRequest",
        },
        responses: {
          "200": { description: "Successful Response" },
        },
      },
      {
        method: "POST",
        path: "/connector/consumer/transfer",
        summary: "Transfer Data",
        description: "Initiate data transfer",
        requestBody: {
          type: "TransferRequest",
        },
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
  {
    name: "Connector - Provider",
    description: "Provider connector endpoints",
    endpoints: [
      {
        method: "POST",
        path: "/connector/provider/expose",
        summary: "Expose Dataset",
        description: "Expose a dataset for sharing",
        requestBody: {
          type: "ExposeDatasetRequest",
        },
        responses: {
          "200": { description: "Successful Response" },
        },
      },
    ],
  },
];

export const methodColors: Record<HttpMethod, { bg: string; text: string }> = {
  GET: { bg: "bg-green-500", text: "text-white" },
  POST: { bg: "bg-blue-500", text: "text-white" },
  PUT: { bg: "bg-orange-500", text: "text-white" },
  PATCH: { bg: "bg-yellow-500", text: "text-black" },
  DELETE: { bg: "bg-red-500", text: "text-white" },
};
