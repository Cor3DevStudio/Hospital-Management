/**
 * Export philhealth_records from MariaDB into database/install_all.sql
 * (replaces the PhilHealth case rates section only).
 *
 * Usage: node scripts/export-case-rates-seed.mjs
 */
import { config } from "dotenv";
import mysql from "mysql2/promise";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSTALL_ALL = join(__dirname, "../database/install_all.sql");
const MARKER = "-- FILE: 06_philhealth_case_rates_seed.sql";
const BATCH = 200;

function sqlStr(value) {
  if (value == null) return "NULL";
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function sqlDate(value) {
  if (!value) return "NULL";
  if (value instanceof Date) return sqlStr(value.toISOString().slice(0, 10));
  return sqlStr(String(value).slice(0, 10));
}

function sqlNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST ?? "127.0.0.1",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
    database: process.env.DATABASE_NAME ?? "medical_center",
  });

  const [countRows] = await connection.query("SELECT COUNT(*) AS n FROM philhealth_records");
  const total = Number(countRows[0]?.n ?? 0);
  if (total === 0) {
    console.error("philhealth_records is empty. Import a dump first:");
    console.error('  npm run db:import-case-rates -- "C:\\path\\to\\dwa.sql"');
    process.exit(1);
  }

  console.log(`Exporting ${total} PhilHealth case rates into install_all.sql...`);

  let ratesSql = `-- #############################################################################
-- FILE: 06_philhealth_case_rates_seed.sql
-- #############################################################################

-- Official PhilHealth Case Rate catalog (${total.toLocaleString()} rates)
-- Safe to re-run: uses ON DUPLICATE KEY UPDATE on case_code

USE \`medical_center\`;

`;

  let offset = 0;
  let written = 0;

  while (offset < total) {
    const [rows] = await connection.query(
      `SELECT case_code, case_description, case_type, case_rate,
              health_facility_fee, professional_fee_amount, price_effective_date,
              hospital_share_pct, professional_fee_pct, is_active, created_at, updated_at
       FROM philhealth_records
       ORDER BY id
       LIMIT ? OFFSET ?`,
      [BATCH, offset],
    );

    if (rows.length === 0) break;

    ratesSql +=
      "INSERT INTO `philhealth_records` (`case_code`, `case_description`, `case_type`, `case_rate`, `health_facility_fee`, `professional_fee_amount`, `price_effective_date`, `hospital_share_pct`, `professional_fee_pct`, `is_active`, `created_at`, `updated_at`) VALUES\n";

    const values = rows.map((r) => {
      const created =
        r.created_at instanceof Date
          ? r.created_at.toISOString().slice(0, 19).replace("T", " ")
          : String(r.created_at ?? "2026-06-30 11:11:16").slice(0, 19);
      const updated =
        r.updated_at instanceof Date
          ? r.updated_at.toISOString().slice(0, 19).replace("T", " ")
          : String(r.updated_at ?? created).slice(0, 19);

      return `(${sqlStr(r.case_code)}, ${sqlStr(r.case_description)}, ${sqlStr(r.case_type)}, ${sqlNum(r.case_rate)}, ${sqlNum(r.health_facility_fee)}, ${sqlNum(r.professional_fee_amount)}, ${sqlDate(r.price_effective_date)}, ${sqlNum(r.hospital_share_pct)}, ${sqlNum(r.professional_fee_pct)}, ${r.is_active ? 1 : 0}, ${sqlStr(created)}, ${sqlStr(updated)})`;
    });

    ratesSql += values.join(",\n");
    ratesSql += `
ON DUPLICATE KEY UPDATE
  \`case_description\` = VALUES(\`case_description\`),
  \`case_type\` = VALUES(\`case_type\`),
  \`case_rate\` = VALUES(\`case_rate\`),
  \`health_facility_fee\` = VALUES(\`health_facility_fee\`),
  \`professional_fee_amount\` = VALUES(\`professional_fee_amount\`),
  \`price_effective_date\` = VALUES(\`price_effective_date\`),
  \`hospital_share_pct\` = VALUES(\`hospital_share_pct\`),
  \`professional_fee_pct\` = VALUES(\`professional_fee_pct\`),
  \`is_active\` = VALUES(\`is_active\`),
  \`updated_at\` = VALUES(\`updated_at\`);

`;

    written += rows.length;
    offset += rows.length;
    process.stdout.write(`\r  ${written}/${total}`);
  }

  ratesSql += `\n-- End of PhilHealth case rate seed (${written} rows)\n`;

  const existing = readFileSync(INSTALL_ALL, "utf8");
  const markerIdx = existing.indexOf(MARKER);
  if (markerIdx < 0) {
    console.error(`Marker not found in install_all.sql: ${MARKER}`);
    process.exit(1);
  }
  // Keep everything before the FILE: 06 section header line
  const prefixEnd = existing.lastIndexOf("\n", markerIdx - 1);
  const prefix = existing.slice(0, prefixEnd + 1);
  writeFileSync(INSTALL_ALL, prefix + "\n" + ratesSql, "utf8");

  await connection.end();
  console.log(`\nUpdated database/install_all.sql with ${written} case rates.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
