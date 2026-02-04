// Common types used across API

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface SimpleErrorResponse {
  error: string;
}

export interface ValidationErrorResponse {
  errors: Record<string, string[]>;
}

export interface HTTPValidationError {
  detail: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

// Pagination parameters
export interface PaginationParams {
  limit?: number;
  offset?: number;
}
