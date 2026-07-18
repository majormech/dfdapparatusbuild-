type D1Result<T = unknown> = { results?: T[]; meta: { last_row_id?: number } };
type D1PreparedStatement = { bind: (...values: unknown[]) => D1PreparedStatement; all: <T = unknown>() => Promise<D1Result<T>>; first: <T = unknown>() => Promise<T | null>; run: () => Promise<D1Result> };
type D1Database = { prepare: (query: string) => D1PreparedStatement };
