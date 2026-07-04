import { config } from "dotenv";

config();

import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as schema from "./schema";

export type Database = MySql2Database<typeof schema>;

let pool: mysql.Pool | null = null;
let db: Database | null = null;

export function getDatabaseConfig() {
  return {
    host: process.env.DATABASE_HOST ?? "127.0.0.1",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
    database: process.env.DATABASE_NAME ?? "medical_center",
  };
}

export function getDb(): Database {
  if (!db) {
    pool = mysql.createPool({
      ...getDatabaseConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
    });
    db = drizzle(pool, { schema, mode: "default" });
  }
  return db;
}

export async function pingDatabase(): Promise<void> {
  const connection = await mysql.createConnection(getDatabaseConfig());
  try {
    await connection.ping();
  } finally {
    await connection.end();
  }
}
