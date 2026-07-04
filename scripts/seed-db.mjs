import { config } from "dotenv";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildDemoClinicalPayload, summarizePayload } from "./demo-clinical-seed.mjs";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const users = [
  { id: "u-admin", username: "admin", password: "admin123", fullName: "System Administrator", role: "Administrator" },
  { id: "u-santos", username: "dr.santos", password: "dr.santos123", fullName: "Dr. Maria Santos", role: "Doctor" },
  { id: "u-reyes", username: "dr.reyes", password: "dr.reyes123", fullName: "Dr. Juan Reyes", role: "Doctor" },
  { id: "u-receptionist", username: "receptionist", password: "receptionist123", fullName: "Jane Doe", role: "Receptionist" },
  { id: "u-cashier", username: "cashier", password: "cashier123", fullName: "John Smith", role: "Cashier" },
];

function patientToSqlParams(p) {
  return [
    p.id,
    p.firstName || "Unknown",
    p.middleName ?? null,
    p.lastName || "Unknown",
    p.suffix ?? null,
    (p.birthDate || "1900-01-01").slice(0, 10),
    p.gender,
    p.civilStatus,
    p.contactNumber || "",
    p.email ?? null,
    p.address?.street || "",
    p.address?.barangay || "",
    p.address?.city || "",
    p.address?.province || "",
    p.address?.zip ?? null,
    p.emergencyContact?.name || "",
    p.emergencyContact?.phone || "",
    p.emergencyContact?.relationship ?? null,
    p.philhealth?.memberNumber ?? null,
    JSON.stringify({
      philhealth: p.philhealth,
      seniorCitizen: p.seniorCitizen,
      pwd: p.pwd,
      clientCreatedAt: p.createdAt,
    }),
    p.archived ? 1 : 0,
  ];
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST ?? "127.0.0.1",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
    multipleStatements: true,
  });

  const installAllPath = join(__dirname, "../database/install_all.sql");
  console.log("Running database/install_all.sql (schema + seeds)...");
  const installAll = readFileSync(installAllPath, "utf8");
  await connection.query(installAll);

  // Upgrade older patients tables that predate extended_data
  try {
    await connection.query(
      "ALTER TABLE medical_center.patients ADD COLUMN `extended_data` JSON NULL AFTER `philhealth_no`"
    );
    console.log("  Added patients.extended_data column.");
  } catch (error) {
    if (!String(error.message).includes("Duplicate column")) {
      throw error;
    }
  }

  // Page-level access permissions per user
  try {
    await connection.query(
      "ALTER TABLE medical_center.users ADD COLUMN `page_access` JSON NULL AFTER `dark_mode`"
    );
    console.log("  Added users.page_access column.");
  } catch (error) {
    if (!String(error.message).includes("Duplicate column")) {
      throw error;
    }
  }

  console.log("Ensuring bcrypt user passwords...");
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await connection.execute(
      `INSERT INTO medical_center.users (id, username, password_hash, full_name, role, active, dark_mode)
       VALUES (?, ?, ?, ?, ?, 1, 0)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name), role = VALUES(role), active = 1`,
      [user.id, user.username, hash, user.fullName, user.role]
    );
  }

  const [countRows] = await connection.query(
    "SELECT COUNT(*) AS n FROM medical_center.philhealth_records"
  );
  console.log(`  philhealth_records: ${countRows[0]?.n ?? 0} case rates loaded.`);

  // Demo clinical data for every module
  const payload = buildDemoClinicalPayload();
  const counts = summarizePayload(payload);
  console.log("Seeding demo clinical data for all modules...");

  await connection.execute(
    `INSERT INTO medical_center.app_clinical_state (id, payload)
     VALUES ('default', ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [JSON.stringify(payload)]
  );

  for (const patient of payload.patients) {
    await connection.execute(
      `INSERT INTO medical_center.patients (
         id, first_name, middle_name, last_name, suffix, birth_date, gender, civil_status,
         contact_number, email, street, barangay, city, province, zip,
         emergency_name, emergency_phone, emergency_rel, philhealth_no, extended_data, archived
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         first_name = VALUES(first_name),
         middle_name = VALUES(middle_name),
         last_name = VALUES(last_name),
         suffix = VALUES(suffix),
         birth_date = VALUES(birth_date),
         gender = VALUES(gender),
         civil_status = VALUES(civil_status),
         contact_number = VALUES(contact_number),
         email = VALUES(email),
         street = VALUES(street),
         barangay = VALUES(barangay),
         city = VALUES(city),
         province = VALUES(province),
         zip = VALUES(zip),
         emergency_name = VALUES(emergency_name),
         emergency_phone = VALUES(emergency_phone),
         emergency_rel = VALUES(emergency_rel),
         philhealth_no = VALUES(philhealth_no),
         extended_data = VALUES(extended_data),
         archived = VALUES(archived)`,
      patientToSqlParams(patient)
    );
  }

  console.log("  Demo data counts:");
  for (const [key, value] of Object.entries(counts)) {
    console.log(`    ${key}: ${value}`);
  }

  await connection.end();
  console.log("Database seeded successfully.");
  console.log("Log in as admin / admin123, then use Load from Database (Settings) if data is not visible yet.");
}

main().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
