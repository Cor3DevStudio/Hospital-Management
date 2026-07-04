import type { Bill, Patient } from "@/lib/store";

export type Cf1FormData = {
  memPin: string[];
  memLastName: string;
  memFirstName: string;
  memNameExt: string;
  memMiddleName: string;
  memDob: string[];
  memUnit: string;
  memBuilding: string;
  memLotBlk: string;
  memStreet: string;
  memSubdivision: string;
  memBarangay: string;
  memCity: string;
  memProvince: string;
  memCountry: string;
  memZip: string;
  memSexMale: boolean;
  memSexFemale: boolean;
  memLandline: string;
  memMobile: string;
  memEmail: string;
  patientIsMember: boolean;
  patPin: string[];
  patLastName: string;
  patFirstName: string;
  patNameExt: string;
  patMiddleName: string;
  patDob: string[];
  patSexMale: boolean;
  patSexFemale: boolean;
  patRelChild: boolean;
  patRelParent: boolean;
  patRelSpouse: boolean;
  memSignatureName: string;
};

function digitsOnly(value?: string): string {
  return (value ?? "").replace(/\D/g, "");
}

function digitCells(value: string | undefined, len: number): string[] {
  const d = digitsOnly(value).slice(0, len);
  return Array.from({ length: len }, (_, i) => d[i] ?? "");
}

function dobCells(birthDate?: string): string[] {
  if (!birthDate) return Array(8).fill("");
  const [y, m, d] = birthDate.split("-");
  if (!y || !m || !d) return Array(8).fill("");
  return `${m}${d}${y}`.split("");
}

function upper(value?: string): string {
  return (value ?? "").trim().toUpperCase();
}

function isDependent(patient?: Patient): boolean {
  const type = patient?.philhealth?.memberType?.toLowerCase() ?? "";
  return type.includes("dependent");
}

/** Patient/bill → CF-1 field values. */
export function buildCf1FormData(input: {
  bill: Bill;
  patient?: Patient;
}): Cf1FormData {
  const { patient } = input;
  const dependent = isDependent(patient);

  const last = upper(patient?.lastName);
  const first = upper(patient?.firstName);
  const middle = upper(patient?.middleName);
  const ext = upper(patient?.suffix);
  const street = upper(patient?.address?.street);
  const barangay = upper(patient?.address?.barangay);
  const city = upper(patient?.address?.city);
  const province = upper(patient?.address?.province);
  const zip = upper(patient?.address?.zip);
  const mobile = patient?.contactNumber ?? "";
  const email = upper(patient?.email);
  const pin = digitCells(patient?.philhealth?.memberNumber, 12);
  const dob = dobCells(patient?.birthDate);
  const male = patient?.gender === "Male";
  const female = patient?.gender === "Female";
  const fullName = [first, middle, last, ext].filter(Boolean).join(" ");

  return {
    memPin: pin,
    memLastName: last,
    memFirstName: first,
    memNameExt: ext,
    memMiddleName: middle,
    memDob: dob,
    memUnit: street,
    memBuilding: "",
    memLotBlk: "",
    memStreet: street,
    memSubdivision: "",
    memBarangay: barangay,
    memCity: city,
    memProvince: province,
    memCountry: "PHILIPPINES",
    memZip: zip,
    memSexMale: male,
    memSexFemale: female,
    memLandline: "",
    memMobile: mobile,
    memEmail: email,
    patientIsMember: !dependent,
    patPin: dependent ? pin : Array(12).fill(""),
    patLastName: dependent ? last : "",
    patFirstName: dependent ? first : "",
    patNameExt: dependent ? ext : "",
    patMiddleName: dependent ? middle : "",
    patDob: dependent ? dob : Array(8).fill(""),
    patSexMale: dependent ? male : false,
    patSexFemale: dependent ? female : false,
    patRelChild: false,
    patRelParent: false,
    patRelSpouse: false,
    memSignatureName: fullName,
  };
}
