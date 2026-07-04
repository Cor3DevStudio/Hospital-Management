export type ReportPrintStatus = "Final" | "Tentative";

export type ReportViewMode = "summary" | "details";

export type ReportKind = "dossier" | "income" | "revenue" | "clinical" | "roster";

export type DossierSections = "clinical" | "financial" | "both";

export type IncomePeriodType = "daily" | "monthly" | "yearly";

export type RosterStatusFilter = "all" | "active" | "archived";

export type DossierReportOptions = {
  status: ReportPrintStatus;
  sections: DossierSections;
  includePhilHealthPin: boolean;
};

export type IncomeReportOptions = {
  status: ReportPrintStatus;
  viewMode: ReportViewMode;
  periodType: IncomePeriodType;
  startDate: string;
  endDate: string;
  startMonth: string;
  endMonth: string;
  startYear: number;
  endYear: number;
  patientType: string;
  paymentMethod: string;
};

export type RevenueReportOptions = {
  status: ReportPrintStatus;
  viewMode: ReportViewMode;
  startMonth: string;
  endMonth: string;
};

export type ClinicalReportOptions = {
  status: ReportPrintStatus;
  viewMode: ReportViewMode;
  startDate: string;
  endDate: string;
  doctor: string;
};

export type RosterReportOptions = {
  status: ReportPrintStatus;
  viewMode: ReportViewMode;
  statusFilter: RosterStatusFilter;
  includePhilHealthPin: boolean;
};

export const DEFAULT_DOSSIER_OPTIONS: DossierReportOptions = {
  status: "Final",
  sections: "both",
  includePhilHealthPin: true,
};

export function defaultIncomeOptions(today: string): IncomeReportOptions {
  const month = today.slice(0, 7);
  const year = Number(today.slice(0, 4));
  return {
    status: "Final",
    viewMode: "details",
    periodType: "daily",
    startDate: today,
    endDate: today,
    startMonth: month,
    endMonth: month,
    startYear: year,
    endYear: year,
    patientType: "All",
    paymentMethod: "All",
  };
}

export function defaultRevenueOptions(today: string): RevenueReportOptions {
  const month = today.slice(0, 7);
  return {
    status: "Final",
    viewMode: "summary",
    startMonth: month,
    endMonth: month,
  };
}

export function defaultClinicalOptions(today: string): ClinicalReportOptions {
  return {
    status: "Final",
    viewMode: "summary",
    startDate: `${today.slice(0, 4)}-01-01`,
    endDate: today,
    doctor: "All",
  };
}

export const DEFAULT_ROSTER_OPTIONS: RosterReportOptions = {
  status: "Final",
  viewMode: "details",
  statusFilter: "all",
  includePhilHealthPin: true,
};
