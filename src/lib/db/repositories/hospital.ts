import { eq } from "drizzle-orm";

import type { HospitalInfo } from "@/lib/store";

import { getDb } from "../client";
import { hospitalSettings } from "../schema";

const DEFAULT_ID = "default";

export async function upsertHospitalSettings(hospital: HospitalInfo): Promise<void> {
  const db = getDb();
  const row = {
    id: DEFAULT_ID,
    name: hospital.name || "Hospital",
    address: hospital.address || "",
    phone: hospital.phone || "",
    email: hospital.email || "",
    philhealthAccreditation: hospital.philhealthAccreditation || "",
    tin: hospital.tin || "",
  };

  await db
    .insert(hospitalSettings)
    .values(row)
    .onDuplicateKeyUpdate({
      set: {
        name: row.name,
        address: row.address,
        phone: row.phone,
        email: row.email,
        philhealthAccreditation: row.philhealthAccreditation,
        tin: row.tin,
      },
    });
}

export async function getHospitalSettings(): Promise<HospitalInfo | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(hospitalSettings)
    .where(eq(hospitalSettings.id, DEFAULT_ID))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    philhealthAccreditation: row.philhealthAccreditation,
    tin: row.tin,
  };
}
