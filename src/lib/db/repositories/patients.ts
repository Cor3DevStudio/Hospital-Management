import type { Patient } from "@/lib/store";
import { sql } from "drizzle-orm";

import { getDb } from "../client";
import { patients } from "../schema";

const BATCH_SIZE = 50;

function toDateOnly(value: string): string {
  if (!value) return "1900-01-01";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function patientToRow(p: Patient) {
  return {
    id: p.id,
    firstName: p.firstName || "Unknown",
    middleName: p.middleName ?? null,
    lastName: p.lastName || "Unknown",
    suffix: p.suffix ?? null,
    birthDate: toDateOnly(p.birthDate),
    gender: p.gender,
    civilStatus: p.civilStatus,
    contactNumber: p.contactNumber || "",
    email: p.email ?? null,
    street: p.address?.street || "",
    barangay: p.address?.barangay || "",
    city: p.address?.city || "",
    province: p.address?.province || "",
    zip: p.address?.zip ?? null,
    emergencyName: p.emergencyContact?.name || "",
    emergencyPhone: p.emergencyContact?.phone || "",
    emergencyRel: p.emergencyContact?.relationship ?? null,
    philhealthNo: p.philhealth?.memberNumber ?? null,
    extendedData: {
      philhealth: p.philhealth,
      seniorCitizen: p.seniorCitizen,
      pwd: p.pwd,
      clientCreatedAt: p.createdAt,
    },
    archived: p.archived,
  };
}

const upsertSet = {
  firstName: sql`values(${patients.firstName})`,
  middleName: sql`values(${patients.middleName})`,
  lastName: sql`values(${patients.lastName})`,
  suffix: sql`values(${patients.suffix})`,
  birthDate: sql`values(${patients.birthDate})`,
  gender: sql`values(${patients.gender})`,
  civilStatus: sql`values(${patients.civilStatus})`,
  contactNumber: sql`values(${patients.contactNumber})`,
  email: sql`values(${patients.email})`,
  street: sql`values(${patients.street})`,
  barangay: sql`values(${patients.barangay})`,
  city: sql`values(${patients.city})`,
  province: sql`values(${patients.province})`,
  zip: sql`values(${patients.zip})`,
  emergencyName: sql`values(${patients.emergencyName})`,
  emergencyPhone: sql`values(${patients.emergencyPhone})`,
  emergencyRel: sql`values(${patients.emergencyRel})`,
  philhealthNo: sql`values(${patients.philhealthNo})`,
  extendedData: sql`values(${patients.extendedData})`,
  archived: sql`values(${patients.archived})`,
};

/** Upserts all patients into the normalized patients table in batches. */
export async function syncPatientsToDatabase(patientList: Patient[]): Promise<number> {
  if (patientList.length === 0) return 0;

  const db = getDb();
  const rows = patientList.map(patientToRow);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(patients)
      .values(batch)
      .onDuplicateKeyUpdate({ set: upsertSet });
  }

  return patientList.length;
}
