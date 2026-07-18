import type { Cf2FormData } from "@/components/philhealth/buildCf2Values";
import type { Cf4FormData } from "@/components/philhealth/buildCf4Values";

const CF2_DISPOSITION_FIELDS = [
  "dispositionImproved",
  "dispositionRecovered",
  "dispositionHama",
  "dispositionAbsconded",
  "dispositionExpired",
  "dispositionTransferred",
] as const satisfies readonly (keyof Cf2FormData)[];

const CF2_ACCOMMODATION_FIELDS = [
  "accommodationPrivate",
  "accommodationNonPrivate",
] as const satisfies readonly (keyof Cf2FormData)[];

export function mergeCf2FormData(base: Cf2FormData, overrides?: Partial<Cf2FormData>): Cf2FormData {
  return overrides ? { ...base, ...overrides } : base;
}

export function mergeCf4FormData(base: Cf4FormData, overrides?: Partial<Cf4FormData>): Cf4FormData {
  return overrides ? { ...base, ...overrides } : base;
}

export function patchCf2Override(
  overrides: Partial<Cf2FormData> | undefined,
  field: keyof Cf2FormData,
  value: string | boolean,
): Partial<Cf2FormData> {
  const next: Partial<Cf2FormData> = { ...overrides, [field]: value };

  if (value === true) {
    if ((CF2_DISPOSITION_FIELDS as readonly string[]).includes(field)) {
      for (const key of CF2_DISPOSITION_FIELDS) {
        if (key !== field) next[key] = false;
      }
    }
    if ((CF2_ACCOMMODATION_FIELDS as readonly string[]).includes(field)) {
      for (const key of CF2_ACCOMMODATION_FIELDS) {
        if (key !== field) next[key] = false;
      }
    }
    if (field === "patientSexMale") next.patientSexFemale = false;
    if (field === "patientSexFemale") next.patientSexMale = false;
  }

  return next;
}

export function patchCf4Override(
  overrides: Partial<Cf4FormData> | undefined,
  field: keyof Cf4FormData,
  value: string | boolean,
): Partial<Cf4FormData> {
  const next: Partial<Cf4FormData> = { ...overrides, [field]: value };
  if (value === true) {
    if (field === "sexMale") next.sexFemale = false;
    if (field === "sexFemale") next.sexMale = false;
  }
  return next;
}
