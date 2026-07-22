import {
  ClinicalDocumentFooter,
  HospitalLetterhead,
  PatientDemographicsGrid,
} from "@/components/clinical/ClinicalPrintShared";
import { formatPatientName } from "@/lib/services/patientHistoryService";
import type { Bill, CashierTransaction, HospitalInfo, Patient } from "@/lib/store";

export type CashierReceiptSheetProps = {
  hospital: HospitalInfo;
  patient: Patient | undefined;
  transaction: CashierTransaction;
  bill?: Bill;
  cashierName: string;
};

export function CashierReceiptSheet({
  hospital,
  patient,
  transaction,
  bill,
  cashierName,
}: CashierReceiptSheetProps) {
  const billTotal = bill
    ? bill.items.reduce((s, i) => s + (i.amount || 0), 0) -
      (bill.mandatoryDiscountAmount || 0) -
      (bill.philhealthDeduction || 0)
    : null;

  return (
    <div
      className="cashier-receipt-sheet bg-white p-8 text-black"
      style={{ width: "210mm", maxWidth: "210mm" }}
    >
      <HospitalLetterhead hospital={hospital} />
      <h1 className="mt-6 text-center text-base font-bold uppercase tracking-wide">
        Official Receipt
      </h1>
      <p className="mt-1 text-center text-[11px] text-slate-600">
        OR No.{" "}
        <span className="font-mono font-semibold text-slate-900">{transaction.receiptNumber}</span>
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 text-[11px]">
        <div>
          <p className="text-[9px] font-semibold uppercase text-slate-500">Patient</p>
          <p className="font-semibold">{formatPatientName(patient)}</p>
          <p className="font-mono text-slate-600">{patient?.id ?? "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-semibold uppercase text-slate-500">Payment Date</p>
          <p className="font-semibold">{transaction.transactionDate}</p>
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-[11px]">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="py-2 text-slate-600">Bill / SOA Reference</td>
            <td className="py-2 text-right font-mono font-medium">{transaction.billId ?? "—"}</td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="py-2 text-slate-600">Payment Method</td>
            <td className="py-2 text-right font-medium">{transaction.paymentMethod}</td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="py-2 text-slate-600">Amount Paid</td>
            <td className="py-2 text-right text-base font-bold">
              ₱{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
          </tr>
          {billTotal != null && (
            <tr className="border-b border-slate-200">
              <td className="py-2 text-slate-600">Bill Total</td>
              <td className="py-2 text-right font-medium">₱{billTotal.toLocaleString()}</td>
            </tr>
          )}
          <tr>
            <td className="py-2 text-slate-600">Balance Remaining</td>
            <td className="py-2 text-right font-semibold">
              ₱
              {(transaction.balanceRemaining ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </td>
          </tr>
        </tbody>
      </table>

      {transaction.description && (
        <p className="mt-4 text-[10px] text-slate-600">{transaction.description}</p>
      )}

      <ClinicalDocumentFooter
        hospital={hospital}
        preparedBy={cashierName}
        footerNote="This is an official receipt of payment"
      />
    </div>
  );
}

export function CashierPatientInfoSheet({
  hospital,
  patient,
  preparedBy,
}: {
  hospital: HospitalInfo;
  patient: Patient | undefined;
  preparedBy: string;
}) {
  return (
    <div
      className="cashier-patient-sheet bg-white p-8 text-black"
      style={{ width: "210mm", maxWidth: "210mm" }}
    >
      <HospitalLetterhead hospital={hospital} />
      <h1 className="mt-6 text-center text-base font-bold uppercase tracking-wide">
        Patient Information
      </h1>
      <div className="mt-6">
        <PatientDemographicsGrid patient={patient} />
      </div>
      <ClinicalDocumentFooter
        hospital={hospital}
        preparedBy={preparedBy}
        footerNote="Patient demographic record"
      />
    </div>
  );
}
