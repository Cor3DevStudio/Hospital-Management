import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const formsDir = path.join(__dirname, "../src/assets/forms");

function replaceAll(html, from, to) {
  if (!html.includes(from)) {
    console.warn("Missing token:", from.slice(0, 80));
    return html;
  }
  return html.split(from).join(to);
}

function buildSoa() {
  let soa = fs.readFileSync(path.join(formsDir, "SOA.html"), "utf8");

  const replacements = [
    ["MEDICAL CENTER", "__HOSPITAL_NAME__"],
    ["COMPANY ADDRESS", "__HOSPITAL_ADDRESS__"],
    ["Manila", "__HOSPITAL_CITY__"],
    ["OUTPATIENT", "__PATIENT_TYPE__"],
    ["FINAL BILL", "__BILL_STATUS__"],
    [": July 3, 2026", ": __DATE_TODAY__"],
    [": 000000000051226", ": __SOA_NUMBER__"],
    [": 04/20/2021 01:32:00 PM", ": __ADMIT_DT__"],
    [": 04/21/2021 01:38:52 PM", ": __DISCHARGE_DT__"],
    [": 2021-000006390", ": __ACCOUNT_NO__"],
    [": Out-Patient Department", ": __ROOM__"],
    [": 27 y/o", ": __AGE__"],
    [": Indigent", ": __PHIC_MEMBERSHIP__"],
    ["User Name", "__PREPARED_BY__"],
    ["User Position", "__PREPARED_POSITION__"],
    ["07/03/2026 02:21:48 PM", "__PRINTED_AT__"],
    [">NBB</span>", ">__NBB__</span>"],
    ["First Case Description:</span>", "First Case Description: __FIRST_CASE_DESC__</span>"],
  ];

  soa = soa.replace(
    'left:0pt">                                                    </span>',
    'left:0pt">__PATIENT_NAME__</span>',
  );

  for (const [from, to] of replacements) {
    soa = replaceAll(soa, from, to);
  }

  soa = replaceAll(
    soa,
    "Hospital Fees</span><span style=\"position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:159.25pt\">0.00</span>",
    "Hospital Fees</span><span style=\"position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:159.25pt\">__HF_ACTUAL__</span>",
  );
  soa = replaceAll(
    soa,
    "Professional Fees</span><span style=\"position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:159.25pt\">0.00</span>",
    "Professional Fees</span><span style=\"position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:159.25pt\">__PF_ACTUAL__</span>",
  );
  soa = replaceAll(
    soa,
    "  TOTAL</span><span style=\"position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:159.25pt\">0.00</span>",
    "  TOTAL</span><span style=\"position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:159.25pt\">__TOTAL_ACTUAL__</span>",
  );

  const phicRight = [
    ["__HF_CR1__", "__HF_CR2__", "__HF_AFTER__", "__HF_BAL__"],
    ["__PF_CR1__", "__PF_CR2__", "__PF_AFTER__", "__PF_BAL__"],
    ["__TOT_CR1__", "__TOT_CR2__", "__TOT_AFTER__", "__TOT_BAL__"],
  ];

  let idx = 0;
  soa = soa.replace(
    /left:320\.85pt; top:(\d+(?:\.\d+)?)pt;"><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:0pt">0\.00 <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:71\.65pt">0\.00<\/span>/g,
    (_m, top) => {
      const t = phicRight[idx++] ?? ["0.00", "0.00", "0.00", "0.00"];
      return `left:320.85pt; top:${top}pt;"><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:0pt">${t[0]} </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:71.65pt">${t[1]}</span>`;
    },
  );

  idx = 0;
  soa = soa.replace(
    /left:464\.15pt; top:(\d+(?:\.\d+)?)pt;"><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:0pt">0\.00 <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:87\.45pt">0\.00<\/span>/g,
    (_m, top) => {
      const t = phicRight[idx++] ?? ["0.00", "0.00", "0.00", "0.00"];
      return `left:464.15pt; top:${top}pt;"><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:0pt">${t[2]} </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:87.45pt">${t[3]}</span>`;
    },
  );

  const feeRows = [
    {
      actual: "__ST_ACTUAL__",
      vat: "__ST_VAT__",
      disc: "__ST_DISC__",
      cr1: "__ST_CR1__",
      cr2: "__ST_CR2__",
      assist: "__ST_ASSIST__",
      pay: "__ST_PAY__",
      bal: "__ST_BAL__",
    },
    {
      actual: "__TOT_FEE_ACTUAL__",
      vat: "__TOT_FEE_VAT__",
      disc: "__TOT_FEE_DISC__",
      cr1: "__TOT_FEE_CR1__",
      cr2: "__TOT_FEE_CR2__",
      assist: "__TOT_FEE_ASSIST__",
      pay: "__TOT_FEE_PAY__",
      bal: "__TOT_FEE_BAL__",
    },
  ];

  idx = 0;
  soa = soa.replace(
    /left:166\.7pt; top:(\d+(?:\.\d+)?)pt;"><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:2\.2pt">0\.00 <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; font-weight:bold; left:20pt">               <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; font-weight:bold; left:53\.2pt; letter-spacing:1pt"> <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:56\.85pt">0\.00 <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; font-weight:bold; left:74\.6pt">               <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; font-weight:bold; left:107\.85pt; letter-spacing:1pt"> <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:111\.45pt">0\.00<\/span>/g,
    (_m, top) => {
      const r = feeRows[idx++] ?? feeRows[0];
      return `left:166.7pt; top:${top}pt;"><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:2.2pt">${r.actual} </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; font-weight:bold; left:20pt">               </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; font-weight:bold; left:53.2pt; letter-spacing:1pt"> </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:56.85pt">${r.vat} </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; font-weight:bold; left:74.6pt">               </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; font-weight:bold; left:107.85pt; letter-spacing:1pt"> </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:111.45pt">${r.disc}</span>`;
    },
  );

  idx = 0;
  soa = soa.replace(
    /left:330\.55pt; top:(\d+(?:\.\d+)?)pt;"><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:2\.2pt">0\.00 <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; font-weight:bold; left:19\.95pt">               <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; font-weight:bold; left:53\.2pt; letter-spacing:1pt"> <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:56\.8pt">0\.00<\/span>/g,
    (_m, top) => {
      const r = feeRows[idx++] ?? feeRows[0];
      return `left:330.55pt; top:${top}pt;"><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:2.2pt">${r.cr1} </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; font-weight:bold; left:19.95pt">               </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; font-weight:bold; left:53.2pt; letter-spacing:1pt"> </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:56.8pt">${r.cr2}</span>`;
    },
  );

  idx = 0;
  soa = soa.replace(
    /left:439\.85pt; top:(\d+(?:\.\d+)?)pt;"><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:2\.2pt">0\.00 <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; font-weight:bold; left:20pt">               <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; font-weight:bold; left:53\.2pt; letter-spacing:1pt"> <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:56\.85pt">0\.00 <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; font-weight:bold; left:74\.6pt">               <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; font-weight:bold; left:107\.85pt; letter-spacing:1pt"> <\/span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV\+Helvetica'; color:#000000; font-weight:bold; left:111\.45pt">0\.00<\/span>/g,
    (_m, top) => {
      const r = feeRows[idx++] ?? feeRows[0];
      return `left:439.85pt; top:${top}pt;"><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:2.2pt">${r.assist} </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; font-weight:bold; left:20pt">               </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; font-weight:bold; left:53.2pt; letter-spacing:1pt"> </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:56.85pt">${r.pay} </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; font-weight:bold; left:74.6pt">               </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; font-weight:bold; left:107.85pt; letter-spacing:1pt"> </span><span style="position:absolute; white-space:pre; font-size:8pt; font-family: 'QLTVDV+Helvetica'; color:#000000; font-weight:bold; left:111.45pt">${r.bal}</span>`;
    },
  );

  fs.writeFileSync(path.join(formsDir, "SOA.template.html"), soa);
  const tokens = [...new Set(soa.match(/__[A-Z0-9_]+__/g) || [])].sort();
  console.log("SOA tokens:", tokens.join(", "));
}

function buildEsoa() {
  let esoa = fs.readFileSync(path.join(formsDir, "ESOA.html"), "utf8");

  const replacements = [
    ["SOA Reference No: 2021-00000", "SOA Reference No: __SOA_REF__"],
    [">1234</span>", ">__SOA_REF_SUFFIX__</span>"],
    ["MEDICAL CENTER", "__HOSPITAL_NAME__"],
    ["COMPANY ADDRESS", "__HOSPITAL_ADDRESS__"],
    [
      'left:49.95pt">_________________________________________</span>',
      'left:49.95pt">__PATIENT_NAME__</span>',
    ],
    [
      'left:37.95pt">_______________________________________</span>',
      'left:37.95pt">__PATIENT_ADDRESS__</span>',
    ],
    ["Final Diagnosis (ICD-10/RVS):  ()", "Final Diagnosis (ICD-10/RVS): __DIAGNOSIS__"],
    ["Date and Time Admitted: 01/01/1970 08:00:00 AM", "Date and Time Admitted: __ADMIT_DT__"],
    [
      "Date and Time Discharged: 01/01/1970 08:00:00 AM",
      "Date and Time Discharged: __DISCHARGE_DT__",
    ],
    ['left:20.95pt">       </span>', 'left:20.95pt">__AGE_YRS__</span>'],
  ];

  for (const [from, to] of replacements) {
    esoa = replaceAll(esoa, from, to);
  }

  esoa = replaceAll(
    esoa,
    'left:0pt"> Total </span><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:175.75pt">0.00</span><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:245.75pt">0.00</span><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:315.75pt">0.00</span><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:380.4pt">0.00</span><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:515.05pt">0.00</span>',
    'left:0pt"> Total </span><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:175.75pt">__FEE_AMOUNT__</span><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:245.75pt">__FEE_MANDATORY__</span><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:315.75pt">__FEE_PHIC__</span><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:380.4pt">__FEE_OTHER__</span><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:515.05pt">__FEE_BALANCE__</span>',
  );

  esoa = replaceAll(
    esoa,
    'left:545.35pt; top:533.95pt;"><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:0pt">0.00</span>',
    'left:545.35pt; top:533.95pt;"><span style="position:absolute; white-space:pre; font-size:9pt; font-family: \'RXTMEF+Helvetica\'; color:#000000; font-weight:bold; left:0pt">__ITEMIZED_TOTAL__</span>',
  );

  fs.writeFileSync(path.join(formsDir, "ESOA.template.html"), esoa);
  const tokens = [...new Set(esoa.match(/__[A-Z0-9_]+__/g) || [])].sort();
  console.log("ESOA tokens:", tokens.join(", "));
}

buildSoa();
buildEsoa();
console.log("Templates written.");
