import { neon } from "@neondatabase/serverless";

/**
 * Database Client Singleton
 * 
 * Uses @neondatabase/serverless driver with pooled connection URL
 * for high concurrency and optimal performance on serverless runtimes.
 */

const connectionString =
  process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || "";

if (!connectionString && typeof window === "undefined" && process.env.NODE_ENV === "production") {
  console.warn("[Database]: DATABASE_URL or DATABASE_URL_POOLED environment variable is not defined");
}

export const db = neon(connectionString);
