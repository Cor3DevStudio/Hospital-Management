import { and, count, eq, like, or } from "drizzle-orm";

import type { CaseRate } from "@/lib/store";

import { getDb } from "../client";
import { philhealthRecords } from "../schema";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function rowToCaseRate(row: typeof philhealthRecords.$inferSelect): CaseRate {
  return {
    id: String(row.id),
    code: row.caseCode,
    description: row.caseDescription,
    amount: toNumber(row.caseRate),
    category: row.caseType,
    effectiveDate: formatDate(row.priceEffectiveDate),
    healthFacilityFee: toNumber(row.healthFacilityFee),
    professionalFeeAmount: toNumber(row.professionalFeeAmount),
    hospitalSharePct: toNumber(row.hospitalSharePct),
    professionalFeePct: toNumber(row.professionalFeePct),
    active: Boolean(row.isActive),
  };
}

function caseRateToRow(rate: CaseRate) {
  const hf =
    rate.healthFacilityFee ??
    (rate.hospitalSharePct != null
      ? (rate.amount * rate.hospitalSharePct) / 100
      : rate.amount * 0.7);
  const pf =
    rate.professionalFeeAmount ??
    (rate.professionalFeePct != null
      ? (rate.amount * rate.professionalFeePct) / 100
      : rate.amount * 0.3);

  return {
    caseCode: rate.code,
    caseDescription: rate.description,
    caseType: rate.category || "Medical",
    caseRate: rate.amount.toFixed(2),
    healthFacilityFee: hf.toFixed(2),
    professionalFeeAmount: pf.toFixed(2),
    priceEffectiveDate: rate.effectiveDate || null,
    hospitalSharePct: (rate.hospitalSharePct ?? 70).toFixed(2),
    professionalFeePct: (rate.professionalFeePct ?? 30).toFixed(2),
    isActive: rate.active !== false,
  };
}

export type CaseRateSearchParams = {
  query?: string;
  type?: string;
  page?: number;
  pageSize?: number;
};

export type CaseRateSearchResult = {
  items: CaseRate[];
  total: number;
  page: number;
  pageSize: number;
};

/** Paginated server-side search — never load the full catalog into memory. */
export async function searchCaseRates(
  params: CaseRateSearchParams = {}
): Promise<CaseRateSearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const offset = (page - 1) * pageSize;
  const db = getDb();

  const conditions = [];
  if (params.type && params.type !== "All") {
    conditions.push(eq(philhealthRecords.caseType, params.type));
  }
  const q = params.query?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        like(philhealthRecords.caseCode, pattern),
        like(philhealthRecords.caseDescription, pattern)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db
    .select({ n: count() })
    .from(philhealthRecords)
    .where(where);

  const rows = await db
    .select()
    .from(philhealthRecords)
    .where(where)
    .orderBy(philhealthRecords.caseCode)
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.map(rowToCaseRate),
    total: Number(countRow?.n ?? 0),
    page,
    pageSize,
  };
}

export async function findCaseRateByCode(code: string): Promise<CaseRate | null> {
  if (!code || code === "none") return null;
  const db = getDb();
  const rows = await db
    .select()
    .from(philhealthRecords)
    .where(eq(philhealthRecords.caseCode, code))
    .limit(1);
  return rows[0] ? rowToCaseRate(rows[0]) : null;
}

/** Insert or update a single case rate. Returns the persisted row as CaseRate. */
export async function upsertCaseRateToDatabase(rate: CaseRate): Promise<CaseRate> {
  const db = getDb();
  const row = caseRateToRow(rate);
  const numericId = Number(rate.id);

  if (Number.isInteger(numericId) && numericId > 0) {
    await db
      .insert(philhealthRecords)
      .values({ id: numericId, ...row })
      .onDuplicateKeyUpdate({
        set: {
          caseCode: row.caseCode,
          caseDescription: row.caseDescription,
          caseType: row.caseType,
          caseRate: row.caseRate,
          healthFacilityFee: row.healthFacilityFee,
          professionalFeeAmount: row.professionalFeeAmount,
          priceEffectiveDate: row.priceEffectiveDate,
          hospitalSharePct: row.hospitalSharePct,
          professionalFeePct: row.professionalFeePct,
          isActive: row.isActive,
        },
      });
    return { ...rate, id: String(numericId) };
  }

  await db
    .insert(philhealthRecords)
    .values(row)
    .onDuplicateKeyUpdate({
      set: {
        caseDescription: row.caseDescription,
        caseType: row.caseType,
        caseRate: row.caseRate,
        healthFacilityFee: row.healthFacilityFee,
        professionalFeeAmount: row.professionalFeeAmount,
        priceEffectiveDate: row.priceEffectiveDate,
        hospitalSharePct: row.hospitalSharePct,
        professionalFeePct: row.professionalFeePct,
        isActive: row.isActive,
      },
    });

  const rows = await db
    .select()
    .from(philhealthRecords)
    .where(eq(philhealthRecords.caseCode, rate.code))
    .limit(1);

  return rows[0] ? rowToCaseRate(rows[0]) : rate;
}

export async function deleteCaseRateFromDatabase(id: string): Promise<void> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return;
  const db = getDb();
  await db.delete(philhealthRecords).where(eq(philhealthRecords.id, numericId));
}

export async function countCaseRatesInDatabase(): Promise<number> {
  const db = getDb();
  const [row] = await db.select({ n: count() }).from(philhealthRecords);
  return Number(row?.n ?? 0);
}
