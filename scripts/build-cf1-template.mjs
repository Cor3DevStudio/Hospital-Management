import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const formsDir = path.join(root, "src/assets/forms");

/**
 * Field tokens in HTML document order (underscore fill lines only).
 * Order must match ClaimForm1_092018.html appearance order.
 */
const FIELD_TOKENS = [
  "MEM_LAST_NAME",
  "MEM_UNIT_ROOM",
  "MEM_BARANGAY",
  "MEM_FIRST_NAME",
  "MEM_BUILDING",
  "MEM_CITY",
  "MEM_NAME_EXT",
  "MEM_STREET",
  "MEM_PROVINCE",
  "MEM_MIDDLE_NAME",
  "MEM_SUBDIVISION",
  "MEM_COUNTRY",
  "MEM_ZIP",
  "MEM_ZIP_ALT",
  "MEM_LANDLINE",
  "MEM_MOBILE",
  "MEM_EMAIL",
  "PAT_LAST_NAME",
  "PAT_FIRST_NAME",
  "PAT_NAME_EXT",
  "PAT_MIDDLE_NAME",
  "MEM_SIGNATURE_NAME",
  "REP_SIGNATURE_NAME",
  "REP_RELATIONSHIP",
  "REP_REASON",
  "EMP_NAME",
  "EMP_CONTACT",
  "EMP_ADDRESS",
  "EMP_ADDRESS_2",
];

/** Digit cells: [leftPt, topPt, token] — must match SVG box positions in the export. */
const DIGIT_CELLS = [
  // Member PIN (Series / PIN row)
  [432.5, 101.6, "MEM_PIN_1"],
  [444.35, 101.6, "MEM_PIN_2"],
  [456.2, 101.6, "MEM_PIN_3"],
  [468.05, 101.6, "MEM_PIN_4"],
  [479.95, 101.6, "MEM_PIN_5"],
  [491.75, 101.6, "MEM_PIN_6"],
  [503.7, 101.6, "MEM_PIN_7"],
  [515.55, 101.6, "MEM_PIN_8"],
  [527.35, 101.6, "MEM_PIN_9"],
  [539.4, 101.6, "MEM_PIN_10"],
  [551.25, 101.6, "MEM_PIN_11"],
  [563.05, 101.6, "MEM_PIN_12"],
  // Member DOB
  [457.8, 243.15, "MEM_DOB_1"],
  [470.1, 243.15, "MEM_DOB_2"],
  [489.5, 243.15, "MEM_DOB_3"],
  [501.8, 243.15, "MEM_DOB_4"],
  [521.2, 243.15, "MEM_DOB_5"],
  [533.5, 243.15, "MEM_DOB_6"],
  [545.75, 243.15, "MEM_DOB_7"],
  [558.1, 243.15, "MEM_DOB_8"],
  // Patient / dependent DOB
  [457.8, 475.9, "PAT_DOB_1"],
  [470.1, 475.9, "PAT_DOB_2"],
  [489.5, 475.9, "PAT_DOB_3"],
  [501.8, 475.9, "PAT_DOB_4"],
  [521.2, 475.9, "PAT_DOB_5"],
  [533.5, 475.9, "PAT_DOB_6"],
  [545.75, 475.9, "PAT_DOB_7"],
  [558.1, 475.9, "PAT_DOB_8"],
];

function digitSpan(token) {
  return (
    `<span style="position:absolute; left:3.5pt; top:1.5pt; z-index:2; ` +
    `white-space:pre; font-size:9pt; font-family:'Calibri',sans-serif; ` +
    `color:#231f20; line-height:1; font-weight:bold;">__${token}__</span>`
  );
}

function buildCf1() {
  const srcPath = path.join(root, "ClaimForm1_092018.html");
  let html = fs.readFileSync(srcPath, "utf8");

  html = html.replace('src="image1.jpeg"', 'src="/cf1-logo.jpeg"');

  // Underscore fill lines → tokens (layout unchanged)
  let idx = 0;
  html = html.replace(
    /(<div style="position:absolute; left:[\d.]+pt; top:[\d.]+pt;[^"]*"><span style="position:absolute; white-space:pre; font-size:\d+pt; font-family: 'Calibri'; color:#231f20; left:[\d.]+pt">)(_+)(<\/span><\/div>)/g,
    (full, open, underscores, close) => {
      const token = FIELD_TOKENS[idx];
      idx += 1;
      if (!token) {
        console.warn("Extra underscore field at index", idx);
        return full;
      }
      // Keep fill text on the line; do not alter box geometry
      return `${open}__${token}__${close}`;
    },
  );

  // Inject digit tokens INSIDE each box div (same positioning context as the SVG)
  let cellsPlaced = 0;
  for (const [left, top, token] of DIGIT_CELLS) {
    const leftRe = String(left).replace(".", "\\.");
    const topRe = String(top).replace(".", "\\.");
    const re = new RegExp(
      `(<div style="position:absolute; left:${leftRe}pt; top:${topRe}pt"\\s*>\\s*` +
        `<svg[\\s\\S]*?<\\/svg>)\\s*<\\/div>`,
      "i",
    );
    const next = html.replace(re, `$1${digitSpan(token)}</div>`);
    if (next === html) {
      console.warn(`Box not found for ${token} at ${left},${top}`);
    } else {
      cellsPlaced += 1;
      html = next;
    }
  }

  // Ensure page root is an explicit positioning context for all absolute children
  html = html.replace(
    'style="position:relative; border:solid 1pt black; margin:10pt auto 10pt auto; overflow:hidden; width:612pt; height:936pt;"',
    'style="position:relative; border:solid 1pt black; margin:10pt auto 10pt auto; overflow:hidden; width:612pt; height:936pt; box-sizing:content-box;"',
  );

  fs.writeFileSync(path.join(formsDir, "CF1.html"), fs.readFileSync(srcPath, "utf8"));
  fs.writeFileSync(path.join(formsDir, "CF1.template.html"), html);

  const tokens = [...new Set(html.match(/__[A-Z0-9_]+__/g) || [])].sort();
  console.log(`CF1 underscore fields: ${idx}`);
  console.log(`CF1 digit cells placed: ${cellsPlaced}/${DIGIT_CELLS.length}`);
  console.log("CF1 tokens:", tokens.join(", "));
}

buildCf1();
console.log("CF1 template written.");
