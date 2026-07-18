import {
  boolean,
  date,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["Administrator", "Doctor", "Receptionist", "Cashier"]).notNull(),
  active: boolean("active").notNull().default(true),
  darkMode: boolean("dark_mode").notNull().default(false),
  /** JSON array of allowed route paths (e.g. ["/dashboard","/patients"]). Null = all pages. */
  pageAccess: json("page_access").$type<string[] | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const hospitalSettings = mysqlTable("hospital_settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  philhealthAccreditation: varchar("philhealth_accreditation", {
    length: 100,
  }).notNull(),
  tin: varchar("tin", { length: 50 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const patients = mysqlTable("patients", {
  id: varchar("id", { length: 36 }).primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  middleName: varchar("middle_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  suffix: varchar("suffix", { length: 20 }),
  birthDate: date("birth_date").notNull(),
  gender: mysqlEnum("gender", ["Male", "Female"]).notNull(),
  civilStatus: mysqlEnum("civil_status", ["Single", "Married", "Widowed", "Separated"]).notNull(),
  contactNumber: varchar("contact_number", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  street: varchar("street", { length: 255 }).notNull(),
  barangay: varchar("barangay", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  province: varchar("province", { length: 100 }).notNull(),
  zip: varchar("zip", { length: 20 }),
  emergencyName: varchar("emergency_name", { length: 255 }).notNull(),
  emergencyPhone: varchar("emergency_phone", { length: 50 }).notNull(),
  emergencyRel: varchar("emergency_rel", { length: 100 }),
  philhealthNo: varchar("philhealth_no", { length: 50 }),
  extendedData: json("extended_data"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const authSessions = mysqlTable("auth_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appClinicalState = mysqlTable("app_clinical_state", {
  id: varchar("id", { length: 36 }).primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/** PhilHealth case rate catalog (Case Rate Type from previous clinic_management). */
export const philhealthRecords = mysqlTable("philhealth_records", {
  id: int("id").primaryKey().autoincrement(),
  caseCode: varchar("case_code", { length: 20 }).notNull().unique(),
  caseDescription: text("case_description").notNull(),
  caseType: varchar("case_type", { length: 20 }).notNull(),
  caseRate: decimal("case_rate", { precision: 12, scale: 2 }).notNull(),
  healthFacilityFee: decimal("health_facility_fee", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  professionalFeeAmount: decimal("professional_fee_amount", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("0"),
  priceEffectiveDate: date("price_effective_date"),
  hospitalSharePct: decimal("hospital_share_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("70.00"),
  professionalFeePct: decimal("professional_fee_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("30.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
