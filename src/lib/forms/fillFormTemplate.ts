/** Escape text for insertion into HTML template placeholders. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Replace `__TOKEN__` placeholders. Layout/markup is never altered. */
export function fillFormTemplate(
  template: string,
  values: Record<string, string | number | undefined | null>,
): string {
  let html = template;
  for (const [key, raw] of Object.entries(values)) {
    const token = key.startsWith("__") ? key : `__${key}__`;
    const text = raw == null || raw === "" ? "" : escapeHtml(String(raw));
    html = html.split(token).join(text);
  }
  return html;
}

export function money2(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateLong(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateTime12(dateStr?: string, timeFallback = "08:00:00 AM"): string {
  if (!dateStr) return "";
  if (dateStr.includes("T") || dateStr.includes(" ")) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    }
  }
  const [y, m, day] = dateStr.split("-");
  if (!y || !m || !day) return dateStr;
  return `${m}/${day}/${y} ${timeFallback}`;
}

export function formatPrintedAt(d = new Date()): string {
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function getAgeYears(birthDate?: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function patientTypeLabel(type?: string): string {
  switch (type) {
    case "In-Patient":
      return "INPATIENT";
    case "ER":
      return "EMERGENCY";
    case "Dialysis":
      return "DIALYSIS";
    case "OPD":
    case "Out-Patient":
    default:
      return "OUTPATIENT";
  }
}

export function getFullName(patient?: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
}): string {
  if (!patient) return "";
  const parts = [patient.firstName];
  if (patient.middleName) parts.push(patient.middleName);
  parts.push(patient.lastName);
  if (patient.suffix) parts.push(patient.suffix);
  return parts.filter(Boolean).join(" ").toUpperCase();
}

export function formatAddress(addr?: {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zip?: string;
}): string {
  if (!addr) return "";
  return [addr.street, addr.barangay, addr.city, addr.province, addr.zip]
    .filter(Boolean)
    .join(", ");
}
