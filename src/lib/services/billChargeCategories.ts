import type { AppState, PriceCategory } from "@/lib/store";

/** Canonical charge categories for itemized SOA line items. */
export type BillChargeCategory =
  | "Medicine"
  | "Supplies"
  | "Lab"
  | "Radiology"
  | "Room"
  | "PF"
  | "Other";

export const BILL_CHARGE_CATEGORIES: BillChargeCategory[] = [
  "Medicine",
  "Supplies",
  "Lab",
  "Radiology",
  "Room",
  "PF",
  "Other",
];

export const BILL_CHARGE_CATEGORY_LABELS: Record<BillChargeCategory, string> = {
  Medicine: "Drugs and Medicines",
  Supplies: "Medical Supplies",
  Lab: "Laboratory and Diagnostics",
  Radiology: "Radiology / Imaging",
  Room: "Room and Board",
  PF: "Professional Fees",
  Other: "Other Charges",
};

/** Map Price List categories to SOA charge categories. */
export function priceCategoryToChargeCategory(
  priceCategory?: PriceCategory | string
): BillChargeCategory {
  switch (priceCategory) {
    case "Medicine":
      return "Medicine";
    case "Supplies":
      return "Supplies";
    case "Laboratory":
      return "Lab";
    case "Room Rate":
      return "Room";
    case "Miscellaneous":
      return "Other";
    case "Procedure":
      return "Other";
    case "Equipment":
      return "Other";
    default:
      return "Other";
  }
}

/** Infer category from description when no price-list link exists (legacy rows). */
export function inferChargeCategoryFromDescription(description: string): BillChargeCategory {
  const d = description.toLowerCase();
  if (
    d.includes("consultation") ||
    d.includes("professional fee") ||
    d.includes("doctor fee") ||
    d.startsWith("pf:") ||
    d.includes("attending")
  ) {
    return "PF";
  }
  if (
    d.includes("radiology") ||
    d.includes("x-ray") ||
    d.includes("xray") ||
    d.includes("ct scan") ||
    d.includes("ultrasound") ||
    d.includes("mri") ||
    d.includes("mammograph")
  ) {
    return "Radiology";
  }
  if (
    d.includes("lab:") ||
    d.includes("laboratory") ||
    d.includes("cbc") ||
    d.includes("blood") ||
    d.includes("urine") ||
    d.includes("diagnostic")
  ) {
    return "Lab";
  }
  if (
    d.includes("room") ||
    d.includes("ward") ||
    d.includes("bed") ||
    d.includes("accommodation")
  ) {
    return "Room";
  }
  if (
    d.includes("supply") ||
    d.includes("supplies") ||
    d.includes("syringe") ||
    d.includes("gauze") ||
    d.includes("iv set")
  ) {
    return "Supplies";
  }
  if (
    d.includes("pharmacy") ||
    d.includes("medicine") ||
    d.includes("dispensed") ||
    d.includes("tablet") ||
    d.includes("capsule") ||
    d.includes("vial") ||
    d.includes("ampule")
  ) {
    return "Medicine";
  }
  return "Other";
}

/** Resolve category from price list / inventory links, then description. */
export function resolveChargeCategory(
  state: AppState,
  input: {
    category?: BillChargeCategory | string;
    priceItemId?: string;
    medicineId?: string;
    description?: string;
  }
): BillChargeCategory {
  if (input.category && BILL_CHARGE_CATEGORIES.includes(input.category as BillChargeCategory)) {
    return input.category as BillChargeCategory;
  }
  if (input.medicineId) return "Medicine";
  if (input.priceItemId) {
    const price = state.prices.find((p) => p.id === input.priceItemId);
    if (price) {
      if (price.category === "Miscellaneous") return "Other";
      return priceCategoryToChargeCategory(price.category);
    }
  }
  return inferChargeCategoryFromDescription(input.description ?? "");
}

export function groupChargesByCategory<T extends { category?: string; amount: number; description: string }>(
  items: T[]
): { category: BillChargeCategory; label: string; total: number; items: T[] }[] {
  const map = new Map<BillChargeCategory, T[]>();
  for (const cat of BILL_CHARGE_CATEGORIES) map.set(cat, []);

  for (const item of items) {
    const cat =
      item.category && BILL_CHARGE_CATEGORIES.includes(item.category as BillChargeCategory)
        ? (item.category as BillChargeCategory)
        : inferChargeCategoryFromDescription(item.description);
    map.get(cat)!.push(item);
  }

  return BILL_CHARGE_CATEGORIES.map((category) => {
    const groupItems = map.get(category) ?? [];
    return {
      category,
      label: BILL_CHARGE_CATEGORY_LABELS[category],
      total: groupItems.reduce((s, i) => s + (i.amount || 0), 0),
      items: groupItems,
    };
  }).filter((g) => g.items.length > 0 || g.total > 0);
}
