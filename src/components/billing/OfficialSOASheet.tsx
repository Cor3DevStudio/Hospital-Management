import type { Bill, Patient } from "@/lib/store";
import {
  DEFAULT_SOA_PRINT_OPTIONS,
  type SOAPrintOptions,
} from "@/components/billing/soaPrintOptions";
import { buildSoaValues, type SoaHospital } from "@/components/billing/buildSoaValues";
import { fillFormTemplate } from "@/lib/forms/fillFormTemplate";
import soaTemplate from "@/assets/forms/SOA.template.html?raw";

export type OfficialSOASheetProps = {
  bill: Bill;
  patient: Patient | undefined;
  hospital: SoaHospital;
  billingOfficerName: string;
  printOptions?: SOAPrintOptions;
  caseRateDescription?: string;
  roomWard?: string;
};

/**
 * Official hospital SOA — exact layout from SOA.html (SautinSoft export).
 * Only placeholder values are filled; positions, borders, and typography are unchanged.
 */
export function OfficialSOASheet({
  bill,
  patient,
  hospital,
  billingOfficerName,
  printOptions = DEFAULT_SOA_PRINT_OPTIONS,
  caseRateDescription,
  roomWard,
}: OfficialSOASheetProps) {
  const options = { ...DEFAULT_SOA_PRINT_OPTIONS, ...printOptions };
  const values = buildSoaValues({
    bill,
    patient,
    hospital,
    billingOfficerName,
    printOptions: options,
    caseRateDescription,
    roomWard,
  });
  const html = fillFormTemplate(soaTemplate, values);
  const isTentative = options.status === "Tentative";

  return (
    <div className="soa-official-sheet relative mx-auto bg-white text-black">
      {isTentative && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          aria-hidden
        >
          <span className="rotate-[-28deg] select-none text-[72px] font-black tracking-[0.2em] text-red-600/15">
            TENTATIVE
          </span>
        </div>
      )}
      <div
        className="soa-official-sheet__page relative z-0"
        dangerouslySetInnerHTML={{ __html: extractPageBody(html) }}
      />
    </div>
  );
}

/** Use only the page container from the template (drop html/head/body wrappers). */
function extractPageBody(fullHtml: string): string {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1] : fullHtml;
}
