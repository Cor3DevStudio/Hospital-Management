import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import mysql from "mysql2/promise";

import { getDatabaseConfig } from "./client";
import {
  MAINTENANCE_FIX_FEE_LABEL,
  STORAGE_OVERDUE_MAINTENANCE_FEE_LINE,
} from "../systemServicePolicy";

/** Hard cap for MariaDB data + index storage. */
export const MAX_MARIADB_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
export const MAX_MARIADB_STORAGE_LABEL = "5GB";
export const MAINTENANCE_ERROR_CODE = "MAINTENANCE_REQUIRED";
export const STORAGE_LIMIT_ERROR_CODE = "STORAGE_LIMIT_EXCEEDED";

const LOCK_DIR = join(process.cwd(), ".data");
export const MAINTENANCE_LOCK_PATH = join(LOCK_DIR, "mariadb-maintenance.lock");

export type MaintenanceLock = {
  code: typeof MAINTENANCE_ERROR_CODE | typeof STORAGE_LIMIT_ERROR_CODE;
  reason: string;
  triggeredAt: string;
  usedBytes?: number;
  limitBytes?: number;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function readMaintenanceLock(): MaintenanceLock | null {
  if (!existsSync(MAINTENANCE_LOCK_PATH)) return null;
  try {
    const raw = readFileSync(MAINTENANCE_LOCK_PATH, "utf8");
    return JSON.parse(raw) as MaintenanceLock;
  } catch {
    return {
      code: MAINTENANCE_ERROR_CODE,
      reason: "Maintenance lock file is present but unreadable.",
      triggeredAt: new Date().toISOString(),
    };
  }
}

export function isMaintenanceLocked(): boolean {
  return readMaintenanceLock() !== null;
}

export function writeMaintenanceLock(lock: MaintenanceLock): void {
  if (!existsSync(LOCK_DIR)) {
    mkdirSync(LOCK_DIR, { recursive: true });
  }
  writeFileSync(MAINTENANCE_LOCK_PATH, JSON.stringify(lock, null, 2), "utf8");
}

export function printMaintenanceTerminalError(
  lock: MaintenanceLock | null = readMaintenanceLock(),
): void {
  if (!lock) return;

  const used =
    typeof lock.usedBytes === "number" ? ` Used: ${formatBytes(lock.usedBytes)}.` : "";
  const limit =
    typeof lock.limitBytes === "number" ? ` Limit: ${formatBytes(lock.limitBytes)}.` : "";

  console.error("");
  console.error("══════════════════════════════════════════════════════════════");
  console.error("  ERROR [MAINTENANCE]");
  console.error(`  Code: ${lock.code}`);
  console.error("  This application is locked and needs maintenance.");
  console.error(`  Reason: ${lock.reason}`);
  if (used || limit) console.error(` ${used}${limit}`);
  console.error(`  Locked at: ${lock.triggeredAt}`);
  console.error(`  Lock file: ${MAINTENANCE_LOCK_PATH}`);
  console.error(
    `  Deleting the lock file will NOT unlock the app while MariaDB is still over ${MAX_MARIADB_STORAGE_LABEL}.`,
  );
  console.error(`  Reduce MariaDB size below ${MAX_MARIADB_STORAGE_LABEL}, then run again.`);
  console.error(`  ${STORAGE_OVERDUE_MAINTENANCE_FEE_LINE}`);
  console.error("══════════════════════════════════════════════════════════════");
  console.error("");
}

/**
 * Call on process start. Blocks when lock exists OR MariaDB is still over the 5GB cap
 * (so deleting the lock file alone does not bypass maintenance).
 */
export async function assertNotInMaintenanceOrExit(): Promise<void> {
  let usedBytes: number | null = null;
  try {
    usedBytes = await getMariaDbStorageBytes();
  } catch {
    const lock = readMaintenanceLock();
    if (lock) {
      printMaintenanceTerminalError(lock);
      process.exit(1);
    }
    return;
  }

  if (usedBytes >= MAX_MARIADB_STORAGE_BYTES) {
    const lock: MaintenanceLock = {
      code: MAINTENANCE_ERROR_CODE,
      reason: `MariaDB storage is at or over the ${MAX_MARIADB_STORAGE_LABEL} security limit (${formatBytes(usedBytes)}). Deleting the lock file does not clear this.`,
      triggeredAt: new Date().toISOString(),
      usedBytes,
      limitBytes: MAX_MARIADB_STORAGE_BYTES,
    };
    writeMaintenanceLock(lock);
    printMaintenanceTerminalError(lock);
    process.exit(1);
  }

  // Under limit — clear a stale lock left behind after cleanup.
  if (existsSync(MAINTENANCE_LOCK_PATH)) {
    try {
      unlinkSync(MAINTENANCE_LOCK_PATH);
    } catch {
      // ignore
    }
  }
}

/**
 * Enter maintenance mode, print the terminal error, and terminate the process.
 */
export function enterMaintenanceAndTerminate(options: {
  reason: string;
  code?: MaintenanceLock["code"];
  usedBytes?: number;
  limitBytes?: number;
}): never {
  const lock: MaintenanceLock = {
    code: options.code ?? STORAGE_LIMIT_ERROR_CODE,
    reason: options.reason,
    triggeredAt: new Date().toISOString(),
    usedBytes: options.usedBytes,
    limitBytes: options.limitBytes ?? MAX_MARIADB_STORAGE_BYTES,
  };

  writeMaintenanceLock(lock);

  console.error("");
  console.error("══════════════════════════════════════════════════════════════");
  console.error("  ERROR [STORAGE SECURITY]");
  console.error(`  Code: ${lock.code}`);
  console.error(`  ${lock.reason}`);
  console.error(
    `  MariaDB storage max is ${MAX_MARIADB_STORAGE_LABEL}. The program will now terminate.`,
  );
  if (typeof lock.usedBytes === "number") {
    console.error(`  Measured usage: ${formatBytes(lock.usedBytes)}`);
  }
  console.error("  On the next run, the terminal will report MAINTENANCE_REQUIRED.");
  console.error(`  ${STORAGE_OVERDUE_MAINTENANCE_FEE_LINE}`);
  console.error("══════════════════════════════════════════════════════════════");
  console.error("");

  process.exit(1);
}

/** Total data + index bytes for the configured MariaDB schema. */
export async function getMariaDbStorageBytes(): Promise<number> {
  const config = getDatabaseConfig();
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
  });

  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT COALESCE(SUM(data_length + index_length), 0) AS size_bytes
       FROM information_schema.TABLES
       WHERE table_schema = ?`,
      [config.database],
    );
    return Number(rows[0]?.size_bytes ?? 0);
  } finally {
    await connection.end();
  }
}

/**
 * Enforce the 5GB MariaDB security cap before writing.
 * `incomingBytes` should be the *net growth* from this write (new - replaced), or the
 * full payload size when the write is purely additive / unknown.
 *
 * On breach: writes maintenance lock and terminates the process.
 */
export async function enforceMariaDbStorageQuota(incomingBytes: number): Promise<void> {
  if (isMaintenanceLocked()) {
    printMaintenanceTerminalError();
    process.exit(1);
  }

  const safeIncoming = Math.max(0, Math.floor(incomingBytes));

  if (safeIncoming > MAX_MARIADB_STORAGE_BYTES) {
    enterMaintenanceAndTerminate({
      reason: `Upload rejected: payload is ${formatBytes(safeIncoming)}, which exceeds the ${MAX_MARIADB_STORAGE_LABEL} MariaDB security limit.`,
      code: STORAGE_LIMIT_ERROR_CODE,
      usedBytes: safeIncoming,
    });
  }

  let usedBytes = 0;
  try {
    usedBytes = await getMariaDbStorageBytes();
  } catch (error) {
    console.warn(
      "[storageSecurity] Could not measure MariaDB size:",
      error instanceof Error ? error.message : error,
    );
    return;
  }

  if (usedBytes >= MAX_MARIADB_STORAGE_BYTES) {
    enterMaintenanceAndTerminate({
      reason: `MariaDB storage is already at or over the ${MAX_MARIADB_STORAGE_LABEL} security limit (${formatBytes(usedBytes)}).`,
      code: STORAGE_LIMIT_ERROR_CODE,
      usedBytes,
    });
  }

  const projected = usedBytes + safeIncoming;
  if (projected > MAX_MARIADB_STORAGE_BYTES) {
    enterMaintenanceAndTerminate({
      reason: `Upload rejected: saving ${formatBytes(safeIncoming)} would push MariaDB to ${formatBytes(projected)} (max ${MAX_MARIADB_STORAGE_LABEL}).`,
      code: STORAGE_LIMIT_ERROR_CODE,
      usedBytes: projected,
    });
  }
}
