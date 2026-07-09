import {
  formatChartDateLong,
  type PatientChartModel,
} from "@/components/clinical/buildPatientChartModel";
import { formatPatientName } from "@/lib/services/patientHistoryService";
import { computeAge } from "@/lib/services/patientService";
import type { ReactNode } from "react";

function ChartSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="patient-chart-sheet__section">
      <h2 className="patient-chart-sheet__section-title">{title}</h2>
      {children}
    </section>
  );
}

function FieldCell({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <td>
      <span className="patient-chart-sheet__label">{label}</span>
      <span className={`patient-chart-sheet__value${emphasize ? " patient-chart-sheet__value--name" : ""}`}>
        {value || "—"}
      </span>
    </td>
  );
}

export function PatientChartDocument({ model }: { model: PatientChartModel }) {
  const { patient, hospital } = model;
  const age = computeAge(patient.birthDate);
  const address = [
    patient.address.street,
    patient.address.barangay,
    patient.address.city,
    patient.address.province,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="patient-chart-sheet patient-chart-page force-light">
      <header className="patient-chart-sheet__header">
        <div className="patient-chart-sheet__logo" aria-hidden />
        <div className="patient-chart-sheet__header-text">
          <p className="patient-chart-sheet__republic">Republic of the Philippines</p>
          <p className="patient-chart-sheet__hospital">{hospital.name || "Hospital"}</p>
          {hospital.address ? <p className="patient-chart-sheet__address">{hospital.address}</p> : null}
          {hospital.phone ? (
            <p className="patient-chart-sheet__address">
              Tel: {hospital.phone}
              {hospital.email ? ` · ${hospital.email}` : ""}
            </p>
          ) : null}
          {hospital.philhealthAccreditation ? (
            <p className="patient-chart-sheet__accreditation">
              PhilHealth Accreditation No.: {hospital.philhealthAccreditation}
            </p>
          ) : null}
        </div>
      </header>

      <div className="patient-chart-sheet__title-row">
        <div>
          <h1 className="patient-chart-sheet__title">Patient Medical Chart</h1>
          <p className="patient-chart-sheet__subtitle">
            Official clinical summary and record printout
          </p>
        </div>
        <div className="patient-chart-sheet__meta">
          <p>
            <strong>Patient ID:</strong> {patient.id}
          </p>
          <p>
            <strong>Generated:</strong> {model.printedAt}
          </p>
        </div>
      </div>

      <ChartSection title="Patient Demographics">
        <table className="patient-chart-sheet__table">
          <tbody>
            <tr>
              <FieldCell label="Patient Name" value={formatPatientName(patient).toUpperCase()} emphasize />
              <FieldCell label="Patient ID" value={patient.id} />
            </tr>
            <tr>
              <FieldCell
                label="Age / Sex"
                value={`${age ?? "—"} / ${patient.gender}`}
              />
              <FieldCell label="Birth Date" value={formatChartDateLong(patient.birthDate)} />
            </tr>
            <tr>
              <FieldCell label="Contact Number" value={patient.contactNumber} />
              <FieldCell
                label="PhilHealth PIN"
                value={patient.philhealth?.memberNumber?.trim() || "—"}
              />
            </tr>
            <tr>
              <FieldCell label="Civil Status" value={patient.civilStatus} />
              <FieldCell label="Email" value={patient.email || "—"} />
            </tr>
            <tr>
              <td colSpan={2}>
                <span className="patient-chart-sheet__label">Address</span>
                <span className="patient-chart-sheet__value">{address || "—"}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </ChartSection>

      <div className="patient-chart-sheet__grid-2">
        <ChartSection title="Clinical Summary">
          <table className="patient-chart-sheet__table">
            <tbody>
              <tr>
                <td>
                  <span className="patient-chart-sheet__label">Last OPD Visit</span>
                  <span className="patient-chart-sheet__value">{model.lastOpdVisit}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="patient-chart-sheet__label">Next Appointment</span>
                  <span className="patient-chart-sheet__value">{model.nextAppointment}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </ChartSection>

        <ChartSection title="Billing Snapshot">
          <table className="patient-chart-sheet__table">
            <tbody>
              <tr>
                <td>
                  <span className="patient-chart-sheet__label">Bills on Record</span>
                  <span className="patient-chart-sheet__value">{String(model.billsOnRecord)}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="patient-chart-sheet__label">Outstanding Balance</span>
                  <span className="patient-chart-sheet__value">{String(model.outstandingBills)}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="patient-chart-sheet__label">Latest Bill Status</span>
                  <span className="patient-chart-sheet__value">{model.latestBillStatus}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </ChartSection>
      </div>

      <ChartSection title="OPD Visit History">
        {model.opdVisits.length > 0 ? (
          <table className="patient-chart-sheet__table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Chief Complaint</th>
                <th>Diagnosis</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {model.opdVisits.map((visit) => (
                <tr key={visit.id}>
                  <td>{formatChartDateLong(visit.date)}</td>
                  <td>{visit.chiefComplaint || "—"}</td>
                  <td>{visit.diagnosis || "—"}</td>
                  <td>{visit.discharged ? "Discharged" : visit.status || "Active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="patient-chart-sheet__empty">
            No OPD visits have been recorded for this patient.
          </p>
        )}
      </ChartSection>

      <ChartSection title="Current Prescriptions">
        {model.prescriptions.length > 0 ? (
          <table className="patient-chart-sheet__table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Dosage / Instructions</th>
                <th>OPD Visit</th>
                <th>Diagnosis</th>
              </tr>
            </thead>
            <tbody>
              {model.prescriptions.map((rx, index) => (
                <tr key={`${rx.consultationDate}-${index}`}>
                  <td>{rx.medicine}</td>
                  <td>
                    {rx.dosage}
                    {rx.instructions ? ` · ${rx.instructions}` : ""}
                  </td>
                  <td>{formatChartDateLong(rx.consultationDate)}</td>
                  <td>{rx.diagnosis || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="patient-chart-sheet__empty">
            No prescriptions are on file for this patient.
          </p>
        )}
      </ChartSection>

      {model.historySections.length > 0 ? (
        <ChartSection title="Clinical History">
          {model.historySections.map((section) => (
            <div key={section.key}>
              <p className="patient-chart-sheet__history-label">{section.label}</p>
              <table className="patient-chart-sheet__table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.slice(0, 6).map((item) => (
                    <tr key={item.id}>
                      <td>{formatChartDateLong(item.date)}</td>
                      <td>
                        {item.title}
                        {item.detail ? ` · ${item.detail}` : ""}
                      </td>
                      <td>{item.status || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </ChartSection>
      ) : null}

      {model.attachments.length > 0 ? (
        <ChartSection title="Attached Documents">
          <table className="patient-chart-sheet__table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {model.attachments.map((attachment) => (
                <tr key={attachment.id}>
                  <td>{attachment.filename}</td>
                  <td>{(attachment.size / 1024).toFixed(1)} KB</td>
                  <td>{new Date(attachment.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartSection>
      ) : null}

      <footer className="patient-chart-sheet__footer">
        <div>
          <p>Prepared by:</p>
          <div className="patient-chart-sheet__sig-line" />
          <p className="patient-chart-sheet__sig-label">Attending Physician / Medical Records</p>
          <p className="patient-chart-sheet__sig-label">(Signature over printed name)</p>
        </div>
        <div>
          <p>Verified by:</p>
          <div className="patient-chart-sheet__sig-line" />
          <p className="patient-chart-sheet__sig-label">Medical Records Officer</p>
          <p className="patient-chart-sheet__sig-label">Date: ________________________</p>
        </div>
      </footer>
      <p className="patient-chart-sheet__confidential">
        CONFIDENTIAL PATIENT RECORD — {hospital.name || "Hospital"}
      </p>
    </article>
  );
}
