import { useEffect, useState } from "react";
import type { AppState, Bill, CaseRate, Patient } from "@/lib/store";
import {
  DEFAULT_SOA_PRINT_OPTIONS,
  type SOAPrintOptions,
} from "@/components/billing/soaPrintOptions";
import { buildHospitalSoaModel } from "@/components/billing/buildHospitalSoaModel";
import type { SoaHospital } from "@/components/billing/buildSoaValues";
import { StandardBillingSoaDocument } from "@/components/billing/StandardBillingSoaDocument";
import { HospitalSoaDocument } from "@/components/billing/HospitalSoaDocument";
import { fetchCaseRateByCode } from "@/lib/services/caseRateApi";

export type OfficialSOASheetProps = {
  bill: Bill;
  patient: Patient | undefined;
  hospital: SoaHospital;
  billingOfficerName: string;
  printOptions?: SOAPrintOptions;
  caseRateDescription?: string;
  caseRate?: CaseRate | null;
  state: AppState;
  roomWard?: string;
};

/** Official hospital Statement of Account — standard PhilHealth SOA layout (A4). */
export function OfficialSOASheet({
  bill,
  patient,
  hospital,
  billingOfficerName,
  printOptions = DEFAULT_SOA_PRINT_OPTIONS,
  caseRateDescription,
  caseRate,
  state,
  roomWard: _roomWard,
}: OfficialSOASheetProps) {
  const options = { ...DEFAULT_SOA_PRINT_OPTIONS, ...printOptions };
  const [resolvedCaseRate, setResolvedCaseRate] = useState<CaseRate | null>(caseRate ?? null);

  useEffect(() => {
    if (caseRate) {
      setResolvedCaseRate(caseRate);
      return;
    }
    const code = bill.caseRateCode;
    if (!code || code === "none") {
      setResolvedCaseRate(null);
      return;
    }
    let cancelled = false;
    void fetchCaseRateByCode(code).then((rate) => {
      if (!cancelled) setResolvedCaseRate(rate);
    });
    return () => {
      cancelled = true;
    };
  }, [bill.caseRateCode, caseRate]);

  const model = buildHospitalSoaModel({
    bill,
    patient,
    hospital,
    state,
    billingOfficerName,
    printOptions: options,
    caseRateDescription: caseRateDescription ?? resolvedCaseRate?.description,
    caseRate: resolvedCaseRate,
  });

  return (
    <div className="hospital-soa-sheet soa-official-sheet relative mx-auto bg-white text-black">
      {model.isTentative && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          aria-hidden
        >
          <span className="rotate-[-28deg] select-none text-[72px] font-black tracking-[0.2em] text-red-600/15">
            TENTATIVE
          </span>
        </div>
      )}
      <div className="soa-official-sheet__page relative z-0">
        {options.forPhilHealth ? (
          <HospitalSoaDocument model={model} printOptions={options} />
        ) : (
          <StandardBillingSoaDocument model={model} printOptions={options} />
        )}
      </div>
    </div>
  );
}
