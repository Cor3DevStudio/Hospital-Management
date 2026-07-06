import { config } from "dotenv";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

import { buildDemoClinicalPayload, summarizePayload } from "./demo-clinical-seed.mjs";
import {
  ensureDatabase,
  getDatabaseConnectionOptions,
  getDatabaseName,
} from "./ensure-database.mjs";

config();

const ALL_PAGE_PATHS = [
  "/dashboard", "/patients", "/appointments", "/inventory", "/billing", "/philhealth",
  "/eclaims-monitoring", "/pricelist", "/admission", "/er", "/opd", "/pharmacy", "/supplies",
  "/laboratory", "/radiology", "/miscellaneous", "/cashier", "/medical-records", "/reports", "/settings",
];

const ROLE_DEFAULT_PAGE_ACCESS = {
  Administrator: ALL_PAGE_PATHS,
  Doctor: ALL_PAGE_PATHS,
  Receptionist: [
    "/dashboard", "/patients", "/appointments", "/admission", "/er", "/opd",
    "/pharmacy", "/supplies", "/laboratory", "/radiology", "/miscellaneous", "/medical-records",
  ],
  Cashier: ["/cashier", "/billing", "/patients", "/medical-records"],
};

function defaultPageAccessForRole(role) {
  return ROLE_DEFAULT_PAGE_ACCESS[role] ?? ALL_PAGE_PATHS;
}

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
  await ensureDatabase();

  const databaseName = getDatabaseName();
  const connection = await mysql.createConnection(getDatabaseConnectionOptions());

  // Upgrade older patients tables that predate extended_data
  try {
    await connection.query(
      `ALTER TABLE \`${databaseName}\`.patients ADD COLUMN \`extended_data\` JSON NULL AFTER \`philhealth_no\``
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
      `ALTER TABLE \`${databaseName}\`.users ADD COLUMN \`page_access\` JSON NULL AFTER \`dark_mode\``
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
    const pageAccess = JSON.stringify(defaultPageAccessForRole(user.role));
    await connection.execute(
      `INSERT INTO \`${databaseName}\`.users (id, username, password_hash, full_name, role, active, dark_mode, page_access)
       VALUES (?, ?, ?, ?, ?, 1, 0, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name), role = VALUES(role), active = 1, page_access = VALUES(page_access)`,
      [user.id, user.username, hash, user.fullName, user.role, pageAccess]
    );
  }

  const [countRows] = await connection.query(
    `SELECT COUNT(*) AS n FROM \`${databaseName}\`.philhealth_records`
  );
  console.log(`  philhealth_records: ${countRows[0]?.n ?? 0} case rates loaded.`);

  // Demo clinical data for every module
  const payload = buildDemoClinicalPayload();
  const counts = summarizePayload(payload);
  console.log("Seeding demo clinical data for all modules...");

  await connection.execute(
    `INSERT INTO \`${databaseName}\`.app_clinical_state (id, payload)
     VALUES ('default', ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [JSON.stringify(payload)]
  );

  for (const patient of payload.patients) {
    await connection.execute(
      `INSERT INTO \`${databaseName}\`.patients (
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
