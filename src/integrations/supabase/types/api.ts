export type SupabasePrimitive = string | number | boolean | null;

export type SupabaseRecord = Record<string, unknown>;

export type SupabaseFilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in"
  | "is";

export type SupabaseFilter = {
  column: string;
  operator?: SupabaseFilterOperator;
  value: SupabasePrimitive | SupabasePrimitive[];
};

export type SupabaseOrderBy = {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
};

export type SupabaseRange = {
  from: number;
  to: number;
};

export type SupabaseListParams = {
  columns?: string;
  filters?: SupabaseFilter[];
  orderBy?: SupabaseOrderBy;
  range?: SupabaseRange;
  count?: "exact" | "planned" | "estimated";
};

export type SupabaseMutationMatch = Record<string, SupabasePrimitive>;

export type SupabaseUploadParams = {
  bucket: string;
  path: string;
  file: File | Blob | ArrayBuffer;
  upsert?: boolean;
  contentType?: string;
};
