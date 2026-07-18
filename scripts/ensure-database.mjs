import { config } from "dotenv";
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Must match tables created in database/install_all.sql */
export const EXPECTED_TABLES = [
  "users",
  "hospital_settings",
  "patients",
  "auth_sessions",
  "philhealth_records",
  "app_clinical_state",
];

export function getDatabaseConnectionOptions(overrides = {}) {
  return {
    host: process.env.DATABASE_HOST ?? "127.0.0.1",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
    multipleStatements: true,
    ...overrides,
  };
}

export function getDatabaseName() {
  return process.env.DATABASE_NAME ?? "medical_center";
}

/**
 * Returns whether a full rebuild (DROP + install_all.sql) is required.
 * - All expected tables exist → no rebuild
 * - Database missing or any table missing → rebuild
 */
export async function inspectDatabase(connection, databaseName = getDatabaseName()) {
  const [schemaRows] = await connection.query(
    "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
    [databaseName],
  );
  if (!schemaRows.length) {
    return {
      rebuild: true,
      databaseName,
      reason: "database does not exist",
      missingTables: [...EXPECTED_TABLES],
    };
  }

  const [tableRows] = await connection.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
    [databaseName],
  );
  const existing = new Set(tableRows.map((row) => row.TABLE_NAME));
  const missingTables = EXPECTED_TABLES.filter((name) => !existing.has(name));

  if (missingTables.length === 0) {
    return {
      rebuild: false,
      databaseName,
      reason: "all tables present",
      missingTables: [],
    };
  }

  return {
    rebuild: true,
    databaseName,
    reason: `missing table(s): ${missingTables.join(", ")}`,
    missingTables,
  };
}

export async function runInstallAllSql(connection) {
  const installAllPath = join(__dirname, "../database/install_all.sql");
  const installAll = readFileSync(installAllPath, "utf8");
  await connection.query(installAll);
}

/**
 * Drop and recreate the database only when it is missing or incomplete.
 * When every expected table already exists, this is a no-op.
 */
export async function ensureDatabase(options = {}) {
  const databaseName = options.databaseName ?? getDatabaseName();
  const connection = await mysql.createConnection(getDatabaseConnectionOptions(options.connection));

  try {
    const status = await inspectDatabase(connection, databaseName);

    if (!status.rebuild) {
      console.log(`Database "${databaseName}" is complete — skipping drop and install_all.sql.`);
      return { ...status, installed: false };
    }

    console.log(`Database "${databaseName}" needs setup (${status.reason}).`);
    console.log("  Dropping old database (one-time rebuild)...");
    await connection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    console.log("  Running database/install_all.sql...");
    await runInstallAllSql(connection);
    console.log("  Database install completed.");

    return { ...status, installed: true };
  } finally {
    await connection.end();
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  ensureDatabase().catch((error) => {
    console.error("Database ensure failed:", error.message);
    process.exit(1);
  });
}
