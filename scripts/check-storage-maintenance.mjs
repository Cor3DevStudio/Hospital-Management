/**
 * Startup gate for MariaDB storage security.
 * - If usage is still >= 5GB, refuse to run and rewrite the lock (even if the user deleted it).
 * - Unlock only works after MariaDB size is reduced below 5GB.
 */
import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCK_DIR = join(__dirname, "..", ".data");
const LOCK_PATH = join(LOCK_DIR, "mariadb-maintenance.lock");
const MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
const MAX_LABEL = "5GB";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function printMaintenanceError(lock) {
  const used =
    typeof lock.usedBytes === "number" ? ` Used: ${formatBytes(lock.usedBytes)}.` : "";
  const limit =
    typeof lock.limitBytes === "number" ? ` Limit: ${formatBytes(lock.limitBytes)}.` : "";

  console.error("");
  console.error("══════════════════════════════════════════════════════════════");
  console.error("  ERROR [MAINTENANCE]");
  console.error(`  Code: ${lock.code || "MAINTENANCE_REQUIRED"}`);
  console.error("  This application is locked and needs maintenance.");
  console.error(`  Reason: ${lock.reason || "MariaDB storage security limit was exceeded."}`);
  if (used || limit) console.error(` ${used}${limit}`);
  if (lock.triggeredAt) console.error(`  Locked at: ${lock.triggeredAt}`);
  console.error(`  Lock file: ${LOCK_PATH}`);
  console.error(
    `  Deleting the lock file will NOT unlock the app while MariaDB is still over ${MAX_LABEL}.`,
  );
  console.error(`  Reduce MariaDB size below ${MAX_LABEL}, then run again.`);
  console.error(
    "  Maintenance for fixing your system after exceeding the 5GB limit: ₱7,000 (7,000 Pesos).",
  );
  console.error("══════════════════════════════════════════════════════════════");
  console.error("");
}

function writeLock(lock) {
  if (!existsSync(LOCK_DIR)) mkdirSync(LOCK_DIR, { recursive: true });
  writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2), "utf8");
}

function readLockFile() {
  if (!existsSync(LOCK_PATH)) return null;
  try {
    return JSON.parse(readFileSync(LOCK_PATH, "utf8"));
  } catch {
    return {
      code: "MAINTENANCE_REQUIRED",
      reason: "Maintenance lock file is present but unreadable.",
      triggeredAt: new Date().toISOString(),
    };
  }
}

async function getMariaDbStorageBytes() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST ?? "127.0.0.1",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
  });

  try {
    const database = process.env.DATABASE_NAME ?? "medical_center";
    const [rows] = await connection.query(
      `SELECT COALESCE(SUM(data_length + index_length), 0) AS size_bytes
       FROM information_schema.TABLES
       WHERE table_schema = ?`,
      [database],
    );
    return Number(rows[0]?.size_bytes ?? 0);
  } finally {
    await connection.end();
  }
}

async function main() {
  let usedBytes = null;
  try {
    usedBytes = await getMariaDbStorageBytes();
  } catch (error) {
    // If MariaDB is down, still honor an existing lock file.
    const existing = readLockFile();
    if (existing) {
      printMaintenanceError(existing);
      process.exit(1);
    }
    console.warn(
      "[storage-security] Could not measure MariaDB size:",
      error instanceof Error ? error.message : error,
    );
    process.exit(0);
  }

  if (usedBytes >= MAX_BYTES) {
    const lock = {
      code: "MAINTENANCE_REQUIRED",
      reason: `MariaDB storage is at or over the ${MAX_LABEL} security limit (${formatBytes(usedBytes)}). Deleting the lock file does not clear this.`,
      triggeredAt: new Date().toISOString(),
      usedBytes,
      limitBytes: MAX_BYTES,
    };
    writeLock(lock);
    printMaintenanceError(lock);
    process.exit(1);
  }

  // Size is under the limit — clear a stale lock if present.
  if (existsSync(LOCK_PATH)) {
    try {
      unlinkSync(LOCK_PATH);
      console.log(
        `[storage-security] MariaDB usage ${formatBytes(usedBytes)} is under ${MAX_LABEL}; cleared maintenance lock.`,
      );
    } catch {
      // ignore
    }
  }

  process.exit(0);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    console.error("[storage-security] Startup check failed:", error.message);
    process.exit(1);
  });
}
