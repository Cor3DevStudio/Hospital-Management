import type { ReactNode } from "react";
import philhealthLogo from "@/assets/forms/philhealth-logo.png";

export function PartBar({ children }: { children: ReactNode }) {
  return <div className="cf-part-bar">{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="cf-label">{children}</div>;
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="cf-row">{children}</div>;
}

export function LineField({
  label,
  value,
  tall,
}: {
  label: string;
  value: string;
  tall?: boolean;
}) {
  return (
    <div className={`cf-line-field${tall ? " cf-line-field--tall" : ""}`}>
      <div className="cf-line-field__value">{value}</div>
      <div className="cf-line-field__label">{label}</div>
    </div>
  );
}

export function EditableLineField({
  label,
  value,
  tall,
  editable,
  onChange,
}: {
  label: string;
  value: string;
  tall?: boolean;
  editable?: boolean;
  onChange?: (value: string) => void;
}) {
  if (!editable || !onChange) {
    return <LineField label={label} value={value} tall={tall} />;
  }

  return (
    <div className={`cf-line-field cf-line-field--editable${tall ? " cf-line-field--tall" : ""}`}>
      <input
        type="text"
        className="cf-line-field__value cf-line-field__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
      <div className="cf-line-field__label">{label}</div>
    </div>
  );
}

export function EditableTextAreaField({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (value: string) => void;
}) {
  if (!editable || !onChange) {
    return (
      <div className="cf-line-field cf-line-field--tall" style={{ height: "auto" }}>
        <div
          className="cf-line-field__value"
          style={{ whiteSpace: "pre-wrap", minHeight: "60px", height: "auto", display: "block" }}
        >
          {value}
        </div>
        <div className="cf-line-field__label">{label}</div>
      </div>
    );
  }

  return (
    <div
      className="cf-line-field cf-line-field--editable cf-line-field--tall"
      style={{ height: "auto" }}
    >
      <textarea
        className="cf-line-field__value cf-line-field__input w-full p-1"
        style={{
          minHeight: "60px",
          height: "auto",
          display: "block",
          whiteSpace: "pre-wrap",
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
      <div className="cf-line-field__label">{label}</div>
    </div>
  );
}

export function Check({ label, checked }: { label: string; checked: boolean }) {
  return (
    <label className="cf-check">
      <span className={`cf-check__box${checked ? " is-checked" : ""}`}>{checked ? "X" : ""}</span>
      <span>{label}</span>
    </label>
  );
}

export function EditableCheck({
  label,
  checked,
  editable,
  onChange,
}: {
  label: string;
  checked: boolean;
  editable?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  if (!editable || !onChange) {
    return <Check label={label} checked={checked} />;
  }

  return (
    <label className="cf-check cf-check--editable">
      <input
        type="checkbox"
        className="cf-check__input sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={`cf-check__box${checked ? " is-checked" : ""}`}>{checked ? "X" : ""}</span>
      <span>{label}</span>
    </label>
  );
}

export function DigitBoxes({
  chars,
  groups,
  labels,
}: {
  chars: string[];
  groups: number[];
  labels?: string[];
}) {
  const nodes: ReactNode[] = [];
  let idx = 0;
  groups.forEach((count, g) => {
    if (g > 0)
      nodes.push(
        <span key={`h-${g}`} className="cf-digit-hyphen">
          -
        </span>,
      );
    const groupChars: ReactNode[] = [];
    for (let i = 0; i < count; i++) {
      groupChars.push(
        <span key={`${g}-${i}`} className="cf-digit">
          {chars[idx] ?? ""}
        </span>,
      );
      idx += 1;
    }
    nodes.push(
      <span key={`g-${g}`} className="cf-digit-group">
        {groupChars}
        {labels?.[g] ? <span className="cf-digit-group__label">{labels[g]}</span> : null}
      </span>,
    );
  });
  return <div className="cf-digits">{nodes}</div>;
}

/** Shared PhilHealth claim-form header (original layout; CF-1 / CF-2 title differs). */
export function CfOfficialHeader({
  formCode,
  formTitle,
}: {
  formCode: "CF-1" | "CF-2" | "CF-3" | "CF-4" | "CF-5" | "CSF";
  formTitle: string;
}) {
  return (
    <div className="cf-header">
      <div className="cf-header__top">
        <div className="cf-header__logo">
          <img
            src={philhealthLogo}
            alt="PhilHealth"
            className="cf-header__logo-img"
            draggable={false}
          />
        </div>
        <div className="cf-header__agency">
          <div className="cf-header__republic">Republic of the Philippines</div>
          <div className="cf-header__corp">PHILIPPINE HEALTH INSURANCE CORPORATION</div>
          <div className="cf-header__contact">
            Citystate Centre 709 Shaw Boulevard, Pasig City
            <br />
            Call Center (02) 441-7442 · Trunkline (02) 441-7444
            <br />
            www.philhealth.gov.ph · actioncenter@philhealth.gov.ph
          </div>
        </div>
        <div className="cf-header__form">
          <div className="cf-header__not-sale">This form may be reproduced and is NOT FOR SALE</div>
          <div className="cf-header__code">{formCode}</div>
          <div className="cf-header__form-title">{formTitle}</div>
          <div className="cf-header__revised">Revised September 2018</div>
          <div className="cf-header__series">
            <span>Series #</span>
            <span className="cf-header__series-boxes">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="cf-header__series-box" />
              ))}
            </span>
          </div>
        </div>
      </div>
      <div className="cf-header__reminders">
        <strong>IMPORTANT REMINDERS:</strong> PLEASE WRITE IN CAPITAL LETTERS AND CHECK THE
        APPROPRIATE BOXES. For local availment, this form together with other PhilHealth claim forms
        and supporting documents should be filed within 60 days from date of discharge.
      </div>
    </div>
  );
}
