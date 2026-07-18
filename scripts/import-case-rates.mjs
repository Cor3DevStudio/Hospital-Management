/**
 * Import PhilHealth case rates (Case Rate Type) from the previous clinic_management dump.
 *
 * Usage:
 *   npm run db:import-case-rates
 *   npm run db:import-case-rates -- "C:\Users\cor3d\OneDrive\Documents\dwa.sql"
 */
import { config } from "dotenv";
import mysql from "mysql2/promise";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

config();

const DEFAULT_DUMP = resolve(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "OneDrive/Documents/dwa.sql",
);

async function main() {
  const dumpPath = resolve(process.argv[2] || DEFAULT_DUMP);

  if (!existsSync(dumpPath)) {
    console.error(`Dump file not found: ${dumpPath}`);
    console.error('Pass the path: npm run db:import-case-rates -- "C:\\path\\to\\dwa.sql"');
    process.exit(1);
  }

  console.log(`Reading ${dumpPath}...`);
  const sql = readFileSync(dumpPath, "utf8");

  // Extract CREATE TABLE for philhealth_records (optional — we use our schema)
  const insertBlocks = [];
  const insertRe =
    /INSERT INTO `philhealth_records`[\s\S]*?;(?=\s*(?:INSERT INTO|\/\*!|CREATE |DROP |--|UNLOCK|LOCK|$))/gi;
  let match;
  while ((match = insertRe.exec(sql)) !== null) {
    insertBlocks.push(match[0]);
  }

  if (insertBlocks.length === 0) {
    // Fallback: split on INSERT INTO and take statements that mention philhealth_records
    const parts = sql.split(/(?=INSERT INTO `philhealth_records`)/i);
    for (const part of parts) {
      if (!part.trim().toUpperCase().startsWith("INSERT INTO")) continue;
      const end = part.indexOf(";\n");
      const stmt =
        end >= 0
          ? part.slice(0, end + 1)
          : part.trim().endsWith(";")
            ? part.trim()
            : `${part.trim()};`;
      if (stmt.includes("philhealth_records")) insertBlocks.push(stmt);
    }
  }

  if (insertBlocks.length === 0) {
    console.error("No INSERT statements for philhealth_records found in dump.");
    process.exit(1);
  }

  console.log(`Found ${insertBlocks.length} INSERT block(s).`);

  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST ?? "127.0.0.1",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
    multipleStatements: true,
    maxAllowedPacket: 64 * 1024 * 1024,
  });

  console.log("Ensuring philhealth_records table exists...");
  await connection.query(`
USE \`medical_center\`;
CREATE TABLE IF NOT EXISTS \`philhealth_records\` (
  \`id\`                      INT(11)       NOT NULL AUTO_INCREMENT,
  \`case_code\`               VARCHAR(20)   NOT NULL,
  \`case_description\`        TEXT          NOT NULL,
  \`case_type\`               VARCHAR(20)   NOT NULL,
  \`case_rate\`               DECIMAL(12,2) NOT NULL,
  \`health_facility_fee\`     DECIMAL(12,2) NOT NULL DEFAULT 0,
  \`professional_fee_amount\` DECIMAL(12,2) NOT NULL DEFAULT 0,
  \`price_effective_date\`    DATE          NULL,
  \`hospital_share_pct\`      DECIMAL(5,2)  NOT NULL DEFAULT 70.00,
  \`professional_fee_pct\`    DECIMAL(5,2)  NOT NULL DEFAULT 30.00,
  \`is_active\`               TINYINT(1)    NOT NULL DEFAULT 1,
  \`created_at\`              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\`              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_philhealth_case_code\` (\`case_code\`),
  KEY \`idx_philhealth_case_type\` (\`case_type\`),
  KEY \`idx_philhealth_active\` (\`is_active\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

  console.log("Clearing existing case rates (re-import)...");
  await connection.query("USE `medical_center`");
  await connection.query("DELETE FROM `philhealth_records`");

  let imported = 0;
  for (let i = 0; i < insertBlocks.length; i++) {
    const stmt = insertBlocks[i]
      .replace(
        /INSERT INTO `philhealth_records`/gi,
        "INSERT INTO `medical_center`.`philhealth_records`",
      )
      // Descriptions may contain newlines inside quoted strings — keep as-is
      .trim();

    try {
      const [result] = await connection.query(stmt);
      const affected = result?.affectedRows ?? 0;
      imported += affected;
      console.log(`  Block ${i + 1}/${insertBlocks.length}: ${affected} rows`);
    } catch (err) {
      console.error(`  Block ${i + 1} failed:`, err.message);
      throw err;
    }
  }

  const [countRows] = await connection.query(
    "SELECT COUNT(*) AS n FROM `medical_center`.`philhealth_records`",
  );
  const total = countRows[0]?.n ?? imported;

  await connection.end();
  console.log(`Done. philhealth_records now has ${total} case rate(s).`);
  console.log("Reload the app (or use Load from Database) to see them in Case Rates.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
