import type { Admission, AppState, HospitalInfo, Patient } from "@/lib/store";
import { billableDays, roomTypeLabel } from "@/lib/services/roomBoardService";
import { computeAge } from "@/lib/services/patientService";
import { formatAddress, formatDateTime12 } from "@/lib/forms/fillFormTemplate";

export type AdmissionCoverSheetModel = {
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  hospitalCode: string;
  seniorCitizenNo: string;
  hospitalNo: string;
  oldHealthRecordNo: string;
  serviceType: string;
  lastName: string;
  firstName: string;
  middleName: string;
  wardRoomBed: string;
  service: string;
  permanentAddress: string;
  contactNumber: string;
  sex: string;
  civilStatus: string;
  birthDate: string;
  age: string;
  birthPlace: string;
  nationality: string;
  religion: string;
  occupation: string;
  indigenous: string;
  employer: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  admissionDate: string;
  admissionTime: string;
  dischargeDate: string;
  dischargeTime: string;
  totalDays: string;
  admittingPhysician: string;
  attendingPhysician: string;
  admittingClerk: string;
  admissionType: string;
  referredBy: string;
  socialClassification: string;
  allergicTo: string;
  hospitalizationPlan: string;
  phicMemberNo: string;
  phicCategory: string;
  admissionDiagnosis: string;
  dischargeDiagnosis: string;
  principalDiagnosis: string;
  otherDiagnosis: string;
  principalOperation: string;
  otherOperations: string;
  accidentInjuries: string;
  disposition: string;
  dataFurnishedBy: string;
  informantAddress: string;
  relationToPatient: string;
};

function formatDateOnly(dateStr?: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("T") || dateStr.includes(" ")) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    }
  }
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${m}/${d}/${y}`;
}

function formatTimeOnly(dateStr?: string): string {
  if (!dateStr) return "";
  if (!dateStr.includes("T") && !dateStr.includes(" ")) return "08:00 AM";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function hospitalPatientNo(patient?: Patient, admission?: Admission): string {
  const raw = admission?.id?.replace(/\D/g, "") || patient?.id?.replace(/\D/g, "") || "";
  return raw.padStart(15, "0").slice(-15);
}

export function buildAdmissionCoverSheetModel(input: {
  hospital: HospitalInfo;
  admission: Admission;
  patient?: Patient;
  state: AppState;
  preparedBy?: string;
}): AdmissionCoverSheetModel {
  const { hospital, admission, patient, state, preparedBy } = input;
  const roomType = roomTypeLabel(state, admission.roomTypeId);
  const stays = admission.roomStays ?? [];
  const wardLabel = [admission.roomWard, roomType].filter(Boolean).join(" / ");
  const age = patient?.birthDate ? computeAge(patient.birthDate) : null;
  const endDate = admission.dischargeDate ?? todayFromAdmission(admission.admissionDate);
  const totalDays =
    stays.length > 0
      ? stays.reduce(
          (sum, stay) =>
            sum +
            billableDays(stay.startDate, stay.endDate ?? admission.dischargeDate ?? stay.startDate),
          0,
        )
      : admission.dischargeDate
        ? billableDays(admission.admissionDate, admission.dischargeDate)
        : billableDays(admission.admissionDate, endDate);

  const phicNo = patient?.philhealth?.memberNumber?.trim() || "";
  const notes = admission.notes?.trim() || "";

  return {
    hospitalName: hospital.name.toUpperCase(),
    hospitalAddress: hospital.address,
    hospitalPhone: hospital.phone,
    hospitalCode: hospital.philhealthAccreditation || hospital.tin || "",
    seniorCitizenNo: patient?.seniorCitizen?.idNumber || "",
    hospitalNo: hospitalPatientNo(patient, admission),
    oldHealthRecordNo: patient?.id || "",
    serviceType: "BASIC (Service)",
    lastName: (patient?.lastName || "").toUpperCase(),
    firstName: (patient?.firstName || "").toUpperCase(),
    middleName: (patient?.middleName || "").toUpperCase(),
    wardRoomBed: wardLabel,
    service: roomType || admission.admissionType,
    permanentAddress: formatAddress(patient?.address).toUpperCase() || "",
    contactNumber: patient?.contactNumber || "",
    sex: patient?.gender || "",
    civilStatus: patient?.civilStatus || "",
    birthDate: formatDateOnly(patient?.birthDate),
    age: age == null ? "" : `${age} yr(s)`,
    birthPlace: "",
    nationality: "Filipino",
    religion: "",
    occupation: "",
    indigenous: "N/A",
    employer: "",
    fatherName: "",
    motherName: "",
    spouseName: "",
    admissionDate: formatDateOnly(admission.admissionDate),
    admissionTime: formatTimeOnly(admission.admissionDate),
    dischargeDate: formatDateOnly(admission.dischargeDate),
    dischargeTime: formatTimeOnly(admission.dischargeDate),
    totalDays: totalDays > 0 ? String(totalDays) : "",
    admittingPhysician: admission.attendingDoctor,
    attendingPhysician: admission.attendingDoctor,
    admittingClerk: preparedBy || "",
    admissionType: admission.admissionType,
    referredBy: admission.erRecordId ? `ER Record ${admission.erRecordId}` : "",
    socialClassification: "",
    allergicTo: "",
    hospitalizationPlan: phicNo ? "PHIC" : "",
    phicMemberNo: phicNo,
    phicCategory: patient?.philhealth?.category || patient?.philhealth?.memberType || "",
    admissionDiagnosis: notes,
    dischargeDiagnosis: admission.status === "Discharged" ? notes : "",
    principalDiagnosis: notes,
    otherDiagnosis: "",
    principalOperation: "",
    otherOperations: "",
    accidentInjuries: "",
    disposition: admission.status === "Discharged" ? "Discharged" : admission.status,
    dataFurnishedBy: patient ? `${patient.firstName} ${patient.lastName}`.trim() : "",
    informantAddress: formatAddress(patient?.address),
    relationToPatient: "Self",
  };
}

function todayFromAdmission(admissionDate: string): string {
  if (admissionDate.includes("T")) return admissionDate;
  return `${admissionDate}T12:00:00`;
}

export function formatAdmissionPrintDateTime(dateStr?: string): string {
  return formatDateTime12(dateStr);
}
