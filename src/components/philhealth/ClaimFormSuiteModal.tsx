import { FileCode, Printer, Save, Send } from "lucide-react";

import { OfficialCF1Sheet } from "@/components/philhealth/OfficialCF1Sheet";
import { OfficialCF2Sheet } from "@/components/philhealth/OfficialCF2Sheet";
import { OfficialCF3Sheet } from "@/components/philhealth/OfficialCF3Sheet";
import { OfficialCF4Sheet } from "@/components/philhealth/OfficialCF4Sheet";
import { OfficialCF5Sheet } from "@/components/philhealth/OfficialCF5Sheet";
import { OfficialCSFSheet } from "@/components/philhealth/OfficialCSFSheet";
import { OfficialESOASheet } from "@/components/philhealth/OfficialESOASheet";
import type { Cf2FormData } from "@/components/philhealth/buildCf2Values";
import type { Cf4FormData } from "@/components/philhealth/buildCf4Values";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import type { PhilHealthXmlForm } from "@/lib/services/philhealthXmlService";
import { cn } from "@/lib/utils";

export type ClaimFormId = "CF1" | "CF2" | "CF3" | "CF4" | "CF5" | "ESOA" | "CSF";

/** Claim forms included in the printable suite. */
export const PRINTABLE_CLAIM_FORM_IDS = ["CF1", "CF2", "CF3", "CF4", "CF5", "ESOA", "CSF"] as const satisfies readonly ClaimFormId[];

export const CLAIM_FORM_TABS: {
  id: ClaimFormId;
  label: string;
  subtitle: string;
  headerTitle: string;
}[] = [
  {
    id: "CF1",
    label: "Claim Form 1 (CF-1)",
    subtitle: "Member Details",
    headerTitle: "CF1 – MEMBER INFORMATION FORM",
  },
  {
    id: "CF2",
    label: "Claim Form 2 (CF-2)",
    subtitle: "Confinement & Charges",
    headerTitle: "CF2 – CONFINEMENT & CHARGES",
  },
  {
    id: "CF3",
    label: "Claim Form 3 (CF-3)",
    subtitle: "Clinical Record",
    headerTitle: "CF3 – CLINICAL RECORD",
  },
  {
    id: "CF4",
    label: "Claim Form 4 (CF-4)",
    subtitle: "Clinical Summary",
    headerTitle: "CF4 – CLINICAL SUMMARY",
  },
  {
    id: "CF5",
    label: "Claim Form 5 (CF-5)",
    subtitle: "DRG Information",
    headerTitle: "CF5 – DRG INFORMATION",
  },
  {
    id: "ESOA",
    label: "ESOA",
    subtitle: "Statement of Account",
    headerTitle: "ESOA – ELECTRONIC STATEMENT OF ACCOUNT",
  },
  {
    id: "CSF",
    label: "CSF",
    subtitle: "Signature Form",
    headerTitle: "CSF – CLAIM SIGNATURE FORM",
  },
];

export type SuiteClaimMeta = {
  claimId: string;
  billId: string;
  patientName: string;
  confinementDate: string;
  statusLabel: string;
  statusTone: "draft" | "transmitted" | "approved" | "rejected";
};

type ClaimFormSuiteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeForm: ClaimFormId;
  onActiveFormChange: (form: ClaimFormId) => void;
  meta: SuiteClaimMeta | null;
  bill: Bill | undefined;
  patient: Patient | undefined;
  hospital: HospitalInfo;
  admission?: Admission;
  cf2Overrides?: Partial<Cf2FormData>;
  cf4Overrides?: Partial<Cf4FormData>;
  onCf2FieldChange?: (field: keyof Cf2FormData, value: string | boolean) => void;
  onCf4FieldChange?: (field: keyof Cf4FormData, value: string | boolean) => void;
  onValidate: () => void;
  onSave: () => void;
  onTransmit: () => void;
  onPrint: () => void;
  onExportXml?: (form: PhilHealthXmlForm, attach: boolean) => void;
};

const STATUS_BADGE: Record<SuiteClaimMeta["statusTone"], string> = {
  draft: "bg-amber-100 text-amber-800 border-amber-200",
  transmitted: "bg-sky-100 text-sky-800 border-sky-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

export function ClaimFormSuiteModal({
  open,
  onOpenChange,
  activeForm,
  onActiveFormChange,
  meta,
  bill,
  patient,
  hospital,
  admission,
  cf2Overrides,
  cf4Overrides,
  onCf2FieldChange,
  onCf4FieldChange,
  onValidate,
  onSave,
  onTransmit,
  onPrint,
  onExportXml,
}: ClaimFormSuiteModalProps) {
  const isCf1 = activeForm === "CF1";
  const isCf2 = activeForm === "CF2";
  const isCf3 = activeForm === "CF3";
  const isCf4 = activeForm === "CF4";
  const isCf5 = activeForm === "CF5";
  const isEsoa = activeForm === "ESOA";
  const isCsf = activeForm === "CSF";
  const hasReadyForm = isCf1 || isCf2 || isCf3 || isCf4 || isCf5 || isEsoa || isCsf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="no-print flex h-[94vh] w-full max-w-[1200px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1200px]"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">PhilHealth eClaims Suite</DialogTitle>

        {/* Header */}
        <div className="shrink-0 border-b px-4 py-3 pr-12">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-foreground">PhilHealth eClaims Suite</h2>
                {meta && (
                  <span
                    className={cn(
                      "rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      STATUS_BADGE[meta.statusTone]
                    )}
                  >
                    {meta.statusLabel}
                  </span>
                )}
              </div>
              {meta && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Claim ID: <span className="font-medium text-foreground">{meta.billId}</span>
                  <span className="mx-1.5 text-border">·</span>
                  Patient:{" "}
                  <span className="font-medium uppercase text-foreground">{meta.patientName}</span>
                  <span className="mx-1.5 text-border">·</span>
                  Confinement Date:{" "}
                  <span className="font-medium text-foreground">{meta.confinementDate}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {onExportXml && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      <FileCode className="mr-1 h-3.5 w-3.5" /> XML
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Generate supporting XML</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(["ESOA", "CF4", "CF5"] as PhilHealthXmlForm[]).map((form) => (
                      <div key={form}>
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => onExportXml(form, false)}
                        >
                          Download {form}.xml
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => onExportXml(form, true)}
                        >
                          Attach {form}.xml to eClaim
                        </DropdownMenuItem>
                        {form !== "CF5" ? <DropdownMenuSeparator /> : null}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onValidate}>
                Validate
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onSave}>
                <Save className="mr-1 h-3.5 w-3.5" /> Save
              </Button>
              <Button
                size="sm"
                className="h-8 bg-blue-600 text-xs text-white hover:bg-blue-700"
                onClick={onTransmit}
              >
                <Send className="mr-1 h-3.5 w-3.5" /> Transmit
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onPrint}>
                <Printer className="mr-1 h-3.5 w-3.5" /> Print
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-0 overflow-x-auto border-b bg-slate-100/80 px-2 pt-2">
          {CLAIM_FORM_TABS.map((tab) => {
            const active = activeForm === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onActiveFormChange(tab.id)}
                className={cn(
                  "min-w-[120px] shrink-0 rounded-t-md border border-b-0 px-3 py-2 text-left transition-colors",
                  active
                    ? "border-border bg-white shadow-[inset_0_2px_0_0_#2563eb]"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-white/60 hover:text-foreground"
                )}
              >
                <p
                  className={cn(
                    "text-[11px] font-semibold leading-tight",
                    active ? "text-foreground" : ""
                  )}
                >
                  {tab.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{tab.subtitle}</p>
              </button>
            );
          })}
        </div>

        {/* Form body — CF1/CF2 clean template; CF3/CF4 exact official layouts */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-6">
          {hasReadyForm ? (
            bill ? (
              <div className="force-light mx-auto w-full max-w-[210mm] rounded-md border border-slate-200 bg-white shadow-sm">
                {isCf1 ? (
                  <OfficialCF1Sheet bill={bill} patient={patient} />
                ) : isCf2 ? (
                  <OfficialCF2Sheet
                    bill={bill}
                    patient={patient}
                    hospital={hospital}
                    admission={admission}
                    editable
                    overrides={cf2Overrides}
                    onFieldChange={onCf2FieldChange}
                  />
                ) : isCf3 ? (
                  <OfficialCF3Sheet
                    bill={bill}
                    patient={patient}
                    hospital={hospital}
                    admission={admission}
                  />
                ) : isCf4 ? (
                  <OfficialCF4Sheet
                    bill={bill}
                    patient={patient}
                    hospital={hospital}
                    admission={admission}
                    editable
                    overrides={cf4Overrides}
                    onFieldChange={onCf4FieldChange}
                  />
                ) : isEsoa ? (
                  <OfficialESOASheet bill={bill} patient={patient} hospital={hospital} />
                ) : isCsf ? (
                  <OfficialCSFSheet bill={bill} patient={patient} admission={admission} />
                ) : (
                  <OfficialCF5Sheet
                    bill={bill}
                    patient={patient}
                    hospital={hospital}
                    admission={admission}
                  />
                )}
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-border bg-background px-6 text-center text-xs text-muted-foreground">
                Select a claim from the directory to load {activeForm}.
              </div>
            )
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t bg-muted/40 px-4 py-3">
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => onOpenChange(false)}>
            Close Editor
          </Button>
          <Button
            size="sm"
            className="h-9 bg-slate-900 text-xs text-white hover:bg-slate-800"
            onClick={onSave}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
