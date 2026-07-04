export type SOAPrintStatus = "Final" | "Tentative";

export type SOAPrintViewMode = "details" | "summary" | "both";

export type SOAPrintOptions = {
  /** Final = official copy; Tentative = draft with watermark. */
  status: SOAPrintStatus;
  /** details = itemized only; summary = category totals only; both = itemized + summary. */
  viewMode: SOAPrintViewMode;
  /** Formats SOA for PhilHealth claim processing (PhilHealth columns / layout). */
  forPhilHealth: boolean;
};

export const DEFAULT_SOA_PRINT_OPTIONS: SOAPrintOptions = {
  status: "Final",
  viewMode: "both",
  forPhilHealth: false,
};
