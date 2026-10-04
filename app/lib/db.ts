import postgres from "postgres";

// Single shared connection pool. Reused across hot reloads in dev so we don't exhaust connections.
const globalForSql = globalThis as unknown as {sql?: postgres.Sql};

export const sql = globalForSql.sql ?? postgres(process.env.POSTGRES_URL!, {ssl: "require"});

if (process.env.NODE_ENV !== "production") globalForSql.sql = sql;
