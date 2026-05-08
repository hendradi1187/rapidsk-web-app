openapi: 3.0.3
info:
  title: rapiDSK Enterprise API
  version: 1.0.0
  description: SKK Migas Federated Regulatory Data Exchange Platform

servers:
  - url: http://localhost:8000/api/v1
    description: Local Development

security:
  - bearerAuth: []

tags:
  - name: Authentication
  - name: Organizations
  - name: Providers
  - name: Datasets
  - name: Schemas
  - name: Vocabulary
  - name: Mapping
  - name: ArcGIS
  - name: Governance
  - name: Audit
  - name: GIS
  - name: System

paths:
  /system/health:
    get:
      tags:
        - System
      summary: System health check
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: operational

  /auth/login:
    post:
      tags:
        - Authentication
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Login success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'

  /organizations:
    get:
      tags:
        - Organizations
      summary: List organizations
      responses:
        '200':
          description: Organization list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Organization'

    post:
      tags:
        - Organizations
      summary: Create organization
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrganizationCreate'
      responses:
        '201':
          description: Organization created

  /providers:
    get:
      tags:
        - Providers
      summary: List providers
      responses:
        '200':
          description: Provider list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Provider'

  /datasets:
    get:
      tags:
        - Datasets
      summary: List datasets
      responses:
        '200':
          description: Dataset list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Dataset'

    post:
      tags:
        - Datasets
      summary: Create dataset
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DatasetCreate'
      responses:
        '201':
          description: Dataset created

  /datasets/{dataset_id}:
    get:
      tags:
        - Datasets
      summary: Dataset detail
      parameters:
        - name: dataset_id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Dataset detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Dataset'

  /schemas:
    get:
      tags:
        - Schemas
      summary: List schemas
      responses:
        '200':
          description: Schema list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Schema'

  /vocabularies:
    get:
      tags:
        - Vocabulary
      summary: List vocabularies
      responses:
        '200':
          description: Vocabulary list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Vocabulary'

  /mapping/auto:
    post:
      tags:
        - Mapping
      summary: Auto mapping
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MappingRequest'
      responses:
        '200':
          description: Mapping result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MappingResult'

  /arcgis/connect:
    post:
      tags:
        - ArcGIS
      summary: Connect ArcGIS service
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ArcGISConnection'
      responses:
        '200':
          description: ArcGIS connected

  /arcgis/discover:
    get:
      tags:
        - ArcGIS
      summary: Discover ArcGIS layers
      responses:
        '200':
          description: Layer list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ArcGISLayer'

  /governance/policies:
    get:
      tags:
        - Governance
      summary: List governance policies
      responses:
        '200':
          description: Policy list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Policy'

  /audit/logs:
    get:
      tags:
        - Audit
      summary: List audit logs
      responses:
        '200':
          description: Audit logs
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/AuditLog'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    LoginRequest:
      type: object
      required:
        - username
        - password
      properties:
        username:
          type: string
        password:
          type: string

    AuthResponse:
      type: object
      properties:
        access_token:
          type: string
        token_type:
          type: string
          example: bearer

    Organization:
      type: object
      properties:
        organization_id:
          type: string
        organization_name:
          type: string
        organization_type:
          type: string

    OrganizationCreate:
      type: object
      required:
        - organization_name
      properties:
        organization_name:
          type: string
        organization_type:
          type: string

    Provider:
      type: object
      properties:
        provider_id:
          type: string
        provider_name:
          type: string
        status:
          type: string

    Dataset:
      type: object
      properties:
        dataset_id:
          type: string
        dataset_name:
          type: string
        schema_name:
          type: string
        provider_name:
          type: string
        classification:
          type: string
        status:
          type: string

    DatasetCreate:
      type: object
      required:
        - dataset_name
        - schema_name
      properties:
        dataset_name:
          type: string
        schema_name:
          type: string
        provider_id:
          type: string

    Schema:
      type: object
      properties:
        schema_id:
          type: string
        schema_name:
          type: string
        version:
          type: string

    Vocabulary:
      type: object
      properties:
        vocabulary_id:
          type: string
        vocabulary_term:
          type: string
        canonical_name:
          type: string

    MappingRequest:
      type: object
      properties:
        source_fields:
          type: array
          items:
            type: string

    MappingResult:
      type: object
      properties:
        mappings:
          type: array
          items:
            type: object
            properties:
              source_field:
                type: string
              canonical_field:
                type: string
              confidence:
                type: number
                format: float

    ArcGISConnection:
      type: object
      properties:
        service_name:
          type: string
        service_url:
          type: string

    ArcGISLayer:
      type: object
      properties:
        layer_id:
          type: integer
        layer_name:
          type: string
        geometry_type:
          type: string

    Policy:
      type: object
      properties:
        policy_id:
          type: string
        policy_name:
          type: string
        classification:
          type: string

    AuditLog:
      type: object
      properties:
        audit_id:
          type: string
        action:
          type: string
        performed_by:
          type: string
        timestamp:
          type: string
          format: date-time

