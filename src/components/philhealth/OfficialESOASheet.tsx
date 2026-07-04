import type { Bill, Patient } from "@/lib/store";
import { buildEsoaValues, type EsoaHospital } from "@/components/philhealth/buildEsoaValues";
import { fillFormTemplate } from "@/lib/forms/fillFormTemplate";
import esoaTemplate from "@/assets/forms/ESOA.template.html?raw";

export type OfficialESOASheetProps = {
  bill: Bill;
  patient: Patient | undefined;
  hospital: EsoaHospital;
};

/**
 * Official PhilHealth ESOA — exact layout from ESOA.html (SautinSoft export).
 * Only placeholder values are filled; positions, borders, and typography are unchanged.
 */
export function OfficialESOASheet({ bill, patient, hospital }: OfficialESOASheetProps) {
  const values = buildEsoaValues({ bill, patient, hospital });
  const html = fillFormTemplate(esoaTemplate, values);

  return (
    <div className="esoa-official-sheet relative mx-auto bg-white text-black">
      <div
        className="esoa-official-sheet__page"
        dangerouslySetInnerHTML={{ __html: extractPageBody(html) }}
      />
    </div>
  );
}

function extractPageBody(fullHtml: string): string {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1] : fullHtml;
}
