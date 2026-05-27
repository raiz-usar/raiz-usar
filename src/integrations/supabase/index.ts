import { createClient, type AuthChangeEvent, type Session, type SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  SupabaseFilter,
  SupabaseListParams,
  SupabaseMutationMatch,
  SupabasePrimitive,
  SupabaseRecord,
  SupabaseUploadParams,
} from "./types";

const DEFAULT_PROJECT_ID = "umcscokdtviwklxcrwkx";

const resolvedProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID;

const supabaseConfig = {
  projectId: resolvedProjectId,
  url: import.meta.env.VITE_SUPABASE_URL?.trim() || `https://${resolvedProjectId}.supabase.co`,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || "",
};

let supabaseClient: SupabaseClient<Database> | null = null;

function assertSupabaseConfig() {
  if (!supabaseConfig.publishableKey) {
    throw new Error(
      "[Supabase] Defina VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env para habilitar as chamadas ao projeto.",
    );
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Erro desconhecido ao comunicar com o Supabase.";
}

function toSupabaseError(error: unknown) {
  return new Error(`[Supabase] ${getErrorMessage(error)}`);
}

function getClient() {
  assertSupabaseConfig();

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseConfig.url, supabaseConfig.publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}

function applyFilters(query: any, filters: SupabaseFilter[] = []) {
  return filters.reduce((currentQuery, filter) => {
    const operator = filter.operator ?? "eq";

    switch (operator) {
      case "eq":
        return currentQuery.eq(filter.column, filter.value);
      case "neq":
        return currentQuery.neq(filter.column, filter.value);
      case "gt":
        return currentQuery.gt(filter.column, filter.value);
      case "gte":
        return currentQuery.gte(filter.column, filter.value);
      case "lt":
        return currentQuery.lt(filter.column, filter.value);
      case "lte":
        return currentQuery.lte(filter.column, filter.value);
      case "like":
        return currentQuery.like(filter.column, filter.value);
      case "ilike":
        return currentQuery.ilike(filter.column, filter.value);
      case "in":
        return currentQuery.in(
          filter.column,
          Array.isArray(filter.value) ? filter.value : [filter.value],
        );
      case "is":
        return currentQuery.is(filter.column, filter.value);
      default:
        return currentQuery;
    }
  }, query);
}

function applyMatch(query: any, match?: SupabaseMutationMatch) {
  if (!match) return query;

  return Object.entries(match).reduce((currentQuery, [column, value]) => {
    return currentQuery.eq(column, value);
  }, query);
}

async function runQuery<T>(promise: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await promise;

  if (error) {
    throw toSupabaseError(error);
  }

  return data;
}

async function runQueryWithCount<T>(
  promise: PromiseLike<{ data: T; error: unknown; count: number | null }>,
) {
  const { data, error, count } = await promise;

  if (error) {
    throw toSupabaseError(error);
  }

  return {
    data,
    count,
  };
}

export const supabaseApi = {
  config() {
    return {
      ...supabaseConfig,
      hasPublishableKey: Boolean(supabaseConfig.publishableKey),
    };
  },

  client() {
    return getClient();
  },

  from(table: string) {
    return getClient().from(table);
  },

  async list<T extends SupabaseRecord = SupabaseRecord>(table: string, params: SupabaseListParams = {}) {
    let query = getClient().from(table).select(params.columns ?? "*", {
      count: params.count ?? "exact",
    });

    query = applyFilters(query, params.filters);

    if (params.orderBy) {
      query = query.order(params.orderBy.column, {
        ascending: params.orderBy.ascending ?? true,
        nullsFirst: params.orderBy.nullsFirst,
      });
    }

    if (params.range) {
      query = query.range(params.range.from, params.range.to);
    }

    return runQueryWithCount<T[]>(query);
  },

  async getById<T extends SupabaseRecord = SupabaseRecord>(
    table: string,
    id: SupabasePrimitive,
    idColumn = "id",
    columns = "*",
  ) {
    const query = getClient().from(table).select(columns).eq(idColumn, id).maybeSingle();
    return runQuery<T | null>(query);
  },

  async insert<T extends SupabaseRecord = SupabaseRecord>(table: string, payload: SupabaseRecord, columns = "*") {
    const query = getClient().from(table).insert(payload).select(columns).single();
    return runQuery<T>(query);
  },

  async insertMany<T extends SupabaseRecord = SupabaseRecord>(
    table: string,
    payload: SupabaseRecord[],
    columns = "*",
  ) {
    const query = getClient().from(table).insert(payload).select(columns);
    return runQuery<T[]>(query);
  },

  async update<T extends SupabaseRecord = SupabaseRecord>(
    table: string,
    payload: SupabaseRecord,
    match: SupabaseMutationMatch,
    columns = "*",
  ) {
    const query = applyMatch(getClient().from(table).update(payload).select(columns), match).single();
    return runQuery<T>(query);
  },

  async upsert<T extends SupabaseRecord = SupabaseRecord>(
    table: string,
    payload: SupabaseRecord | SupabaseRecord[],
    columns = "*",
  ) {
    const query = getClient().from(table).upsert(payload).select(columns);
    return runQuery<T | T[]>(query);
  },

  async remove(table: string, match: SupabaseMutationMatch) {
    const query = applyMatch(getClient().from(table).delete(), match);
    return runQuery(query);
  },

  async call<TResponse = unknown>(functionName: string, payload?: Record<string, unknown>) {
    const query = getClient().rpc(functionName, payload);
    return runQuery<TResponse>(query);
  },

  async upload(params: SupabaseUploadParams) {
    const query = getClient().storage.from(params.bucket).upload(params.path, params.file, {
      upsert: params.upsert,
      contentType: params.contentType,
    });

    return runQuery(query);
  },

  getPublicUrl(bucket: string, path: string) {
    return getClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },

  async signInWithPassword(email: string, password: string) {
    const query = getClient().auth.signInWithPassword({ email, password });
    return runQuery(query);
  },

  async signUp(email: string, password: string) {
    const query = getClient().auth.signUp({ email, password });
    return runQuery(query);
  },

  async signOut() {
    const query = getClient().auth.signOut();
    return runQuery(query);
  },

  async getSession() {
    const query = getClient().auth.getSession();
    const data = await runQuery<{ session: Session | null }>(query);
    return data.session;
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return getClient().auth.onAuthStateChange(callback);
  },
};

export type { AuthChangeEvent, Session, SupabaseClient };
export type {
  Database,
  Json,
  SupabaseFilter,
  SupabaseFilterOperator,
  SupabaseListParams,
  SupabaseMutationMatch,
  SupabaseOrderBy,
  SupabasePrimitive,
  SupabaseRange,
  SupabaseRecord,
  SupabaseTableShape,
  SupabaseUploadParams,
} from "./types";
