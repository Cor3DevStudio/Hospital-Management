import {
  formatChartDateLong,
  type PatientChartModel,
} from "@/components/clinical/buildPatientChartModel";
import type { ReactNode } from "react";

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="patient-chart-section">
      <h2 className="patient-chart-section__title">{title}</h2>
      {children}
    </section>
  );
}

export function PatientChartDocument({ model }: { model: PatientChartModel }) {
  const { patient, hospital } = model;

  return (
    <article className="patient-chart-page bg-white text-black">
      <header className="patient-chart-header border-b border-slate-300 pb-3 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-900">
          {hospital.name || "Hospital"}
        </p>
        {hospital.address ? <p className="mt-0.5 text-[10px] text-slate-600">{hospital.address}</p> : null}
        {hospital.phone ? <p className="text-[10px] text-slate-600">Tel: {hospital.phone}</p> : null}
      </header>

      <div className="mt-4 border-b-2 border-slate-800 pb-2 text-center">
        <h1 className="text-base font-bold uppercase tracking-wide text-slate-900">
          Patient Medical Chart
        </h1>
        <p className="mt-0.5 text-[11px] text-slate-600">
          Official clinical summary and record printout · Generated {model.printedAt}
        </p>
      </div>

      <SectionBlock title="Patient Demographics">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
          <p>
            <span className="font-semibold">Name:</span> {model.patientName}
          </p>
          <p>
            <span className="font-semibold">Patient ID:</span> {patient.id}
          </p>
          <p>
            <span className="font-semibold">Age / Sex:</span>{" "}
            {model.age == null ? "—" : `${model.age}y`} · {patient.gender}
          </p>
          <p>
            <span className="font-semibold">Birth date:</span> {formatChartDateLong(patient.birthDate)}
          </p>
          <p>
            <span className="font-semibold">Contact:</span> {patient.contactNumber || "—"}
          </p>
          <p>
            <span className="font-semibold">PhilHealth PIN:</span>{" "}
            {patient.philhealth?.memberNumber?.trim() || "—"}
          </p>
        </div>
      </SectionBlock>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SectionBlock title="Clinical Summary">
          <div className="space-y-1 text-[11px]">
            <p>
              <span className="font-semibold">Last OPD visit:</span> {model.lastOpdVisit}
            </p>
            <p>
              <span className="font-semibold">Next appointment:</span> {model.nextAppointment}
            </p>
          </div>
        </SectionBlock>

        <SectionBlock title="Billing Snapshot">
          <div className="space-y-1 text-[11px]">
            <p>
              <span className="font-semibold">Bills on record:</span> {model.billsOnRecord}
            </p>
            <p>
              <span className="font-semibold">Outstanding:</span> {model.outstandingBills}
            </p>
            <p>
              <span className="font-semibold">Latest bill status:</span> {model.latestBillStatus}
            </p>
          </div>
        </SectionBlock>
      </div>

      <SectionBlock title="OPD Visit History">
        {model.opdVisits.length > 0 ? (
          <div className="space-y-2">
            {model.opdVisits.map((visit) => (
              <div key={visit.id} className="rounded border border-slate-200 p-2 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{formatChartDateLong(visit.date)}</p>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">
                    {visit.discharged ? "Discharged" : visit.status || "Active"}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">Chief complaint: {visit.chiefComplaint}</p>
                <p>
                  <span className="font-semibold">Diagnosis:</span> {visit.diagnosis}
                </p>
                {visit.notes ? (
                  <p>
                    <span className="font-semibold">Notes:</span> {visit.notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">No OPD visits have been recorded for this patient.</p>
        )}
      </SectionBlock>

      <SectionBlock title="Current Prescriptions">
        {model.prescriptions.length > 0 ? (
          <div className="space-y-2">
            {model.prescriptions.map((rx, index) => (
              <div
                key={`${rx.consultationDate}-${index}`}
                className="rounded border border-slate-200 p-2 text-[11px]"
              >
                <p className="font-semibold">{rx.medicine}</p>
                <p className="text-slate-600">
                  {rx.dosage} · {rx.instructions}
                </p>
                <p className="text-[10px] text-slate-500">
                  OPD visit: {formatChartDateLong(rx.consultationDate)} · {rx.diagnosis}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">No prescriptions are on file for this patient.</p>
        )}
      </SectionBlock>

      {model.historySections.length > 0 ? (
        <SectionBlock title="Clinical History">
          <div className="space-y-3">
            {model.historySections.map((section) => (
              <div key={section.key}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
                  {section.label}
                </p>
                <ul className="mt-1 space-y-1 text-[11px]">
                  {section.items.slice(0, 4).map((item) => (
                    <li key={item.id} className="border-b border-slate-100 pb-1">
                      <span className="font-medium">{formatChartDateLong(item.date)}</span>
                      {" — "}
                      {item.title}
                      {item.detail ? ` · ${item.detail}` : ""}
                      {item.status ? ` (${item.status})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionBlock>
      ) : null}

      {model.attachments.length > 0 ? (
        <SectionBlock title="Attached Documents">
          <ul className="space-y-1 text-[11px]">
            {model.attachments.map((attachment) => (
              <li key={attachment.id}>
                {attachment.filename} · {(attachment.size / 1024).toFixed(1)} KB ·{" "}
                {new Date(attachment.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </SectionBlock>
      ) : null}

      <footer className="mt-6 border-t border-slate-300 pt-2 text-center text-[9px] text-slate-400">
        Confidential patient record — {hospital.name}
      </footer>
    </article>
  );
}
