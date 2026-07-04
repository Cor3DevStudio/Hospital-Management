import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const formsDir = path.join(root, "src/assets/forms");

/** Fill overlays in pt — inside Page1 coordinate system (exact CF3 layout). */
const PAGE1_OVERLAYS = [
  { left: 320, top: 166, token: "HCI_PAN", size: 9, width: 250 },
  { left: 100, top: 208, token: "PATIENT_NAME", size: 9, width: 300 },
  { left: 430, top: 208, token: "CHIEF_COMPLAINT", size: 8, width: 150 },
  { left: 105, top: 248, token: "ADMIT_MONTH", size: 9, width: 28 },
  { left: 148, top: 248, token: "ADMIT_DAY", size: 9, width: 28 },
  { left: 197, top: 248, token: "ADMIT_YEAR", size: 9, width: 40 },
  { left: 105, top: 278, token: "DISCH_MONTH", size: 9, width: 28 },
  { left: 148, top: 278, token: "DISCH_DAY", size: 9, width: 28 },
  { left: 197, top: 278, token: "DISCH_YEAR", size: 9, width: 40 },
  { left: 28, top: 332, token: "HISTORY", size: 8, width: 550 },
  { left: 90, top: 476, token: "GENERAL_SURVEY", size: 8, width: 200 },
  { left: 120, top: 505, token: "VITAL_BP", size: 8, width: 40 },
  { left: 170, top: 505, token: "VITAL_CR", size: 8, width: 40 },
  { left: 225, top: 505, token: "VITAL_RR", size: 8, width: 40 },
  { left: 280, top: 505, token: "VITAL_TEMP", size: 8, width: 40 },
  { left: 70, top: 530, token: "HEENT", size: 8, width: 200 },
  { left: 70, top: 555, token: "CHEST_LUNGS", size: 8, width: 200 },
  { left: 70, top: 580, token: "CVS", size: 8, width: 200 },
  { left: 400, top: 530, token: "ABDOMEN", size: 8, width: 180 },
  { left: 400, top: 555, token: "GU_IE", size: 8, width: 180 },
  { left: 400, top: 580, token: "NEURO", size: 8, width: 180 },
  { left: 28, top: 668, token: "COURSE_IN_WARDS", size: 8, width: 550 },
  { left: 28, top: 828, token: "LAB_FINDINGS", size: 8, width: 550 },
  { left: 130, top: 938, token: "DISP_MARK", size: 10, width: 14 },
];

function overlayHtml({ left, top, token, size, width }) {
  return (
    `\t\t<div style="position:absolute; left:${left}pt; top:${top}pt; z-index:5; ` +
    `width:${width}pt; overflow:hidden; white-space:nowrap;">` +
    `<span style="font-size:${size}pt; font-family:'Calibri',Arial,sans-serif; ` +
    `color:#000; font-weight:bold; text-transform:uppercase;">__${token}__</span></div>`
  );
}

function buildCf3() {
  const srcPath = path.join(root, "PhilHealth_ClaimForm3.html");
  let html = fs.readFileSync(srcPath, "utf8");

  html = html.replace('src="image1.jpeg"', 'src="__PHILHEALTH_LOGO_SRC__"');

  // Signature line on page 1/2
  html = html.replace(
    'left:0pt">___________________________________________________</span>',
    'left:0pt">__PHYSICIAN_NAME__</span>'
  );
  html = html.replace(
    "Age of Menarche __________",
    "Age of Menarche __AGE_MENARCHE__"
  );

  // Inject Part I overlays before Page1 closes (before Page2 opens)
  const page1Overlays = PAGE1_OVERLAYS.map(overlayHtml).join("\n");
  const page2Marker = '<a name="Page2" id="Page2"/>';
  const page2Idx = html.indexOf(page2Marker);
  if (page2Idx < 0) {
    console.warn("Page2 marker not found");
  } else {
    // Find the opening of the Page2 container div, then insert overlays just before Page1's closing </div>
    const page2DivStart = html.lastIndexOf("<div style=\"position:relative;", page2Idx);
    const insertAt = html.lastIndexOf("</div>", page2DivStart);
    html =
      html.slice(0, insertAt) +
      `\n${page1Overlays}\n\t` +
      html.slice(insertAt);
  }

  html = html.replace(
    /style="position:relative; border:solid 1pt black; margin:10pt auto 10pt auto; overflow:hidden; width:612pt; height:1008pt;"/g,
    'style="position:relative; border:solid 1pt black; margin:10pt auto 10pt auto; overflow:hidden; width:612pt; height:1008pt; box-sizing:content-box;"'
  );

  fs.writeFileSync(path.join(formsDir, "CF3.html"), fs.readFileSync(srcPath, "utf8"));
  fs.writeFileSync(path.join(formsDir, "CF3.template.html"), html);

  const tokens = [...new Set(html.match(/__[A-Z0-9_]+__/g) || [])].sort();
  console.log("CF3 tokens:", tokens.join(", "));
}

buildCf3();
console.log("CF3 template written.");
