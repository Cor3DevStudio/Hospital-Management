import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const formsDir = path.join(root, "src/assets/forms");

/** Fill overlays in pt — Page1 coordinate system (CF5.html exact layout). */
const OVERLAYS = [
  { left: 28, top: 118, token: "PATIENT_NAME", size: 8, width: 280 },
  { left: 320, top: 118, token: "PATIENT_PIN", size: 8, width: 160 },
  { left: 28, top: 138, token: "HCI_NAME", size: 8, width: 280 },
  { left: 320, top: 138, token: "HCI_ACCREDITATION", size: 8, width: 160 },
  // Primary diagnosis (PDx)
  { left: 28, top: 188, token: "PDX", size: 8, width: 90 },
  // Secondary diagnoses
  { left: 130, top: 188, token: "SDX1", size: 8, width: 70 },
  { left: 210, top: 188, token: "SDX2", size: 8, width: 70 },
  { left: 290, top: 188, token: "SDX3", size: 8, width: 70 },
  { left: 370, top: 188, token: "SDX4", size: 8, width: 70 },
  // RVS / procedures
  { left: 28, top: 348, token: "RVS1", size: 8, width: 70 },
  { left: 110, top: 348, token: "RVS2", size: 8, width: 70 },
  { left: 190, top: 348, token: "RVS3", size: 8, width: 70 },
  // Case rate / package
  { left: 28, top: 470, token: "CASE_RATE", size: 8, width: 120 },
  // Member signature line
  { left: 40, top: 600, token: "MEMBER_NAME", size: 8, width: 240 },
  // Attending physician
  { left: 40, top: 775, token: "PHYSICIAN_NAME", size: 8, width: 220 },
  { left: 280, top: 775, token: "SIGN_DATE", size: 8, width: 90 },
];

function overlayHtml({ left, top, token, size, width }) {
  return (
    `\t\t<div style="position:absolute; left:${left}pt; top:${top}pt; z-index:5; ` +
    `width:${width}pt; overflow:hidden; white-space:nowrap;">` +
    `<span style="font-size:${size}pt; font-family:'Helvetica',Arial,sans-serif; ` +
    `color:#000; font-weight:bold; text-transform:uppercase;">__${token}__</span></div>`
  );
}

function buildCf5() {
  const srcPath = path.join(root, "CF5.html");
  let html = fs.readFileSync(srcPath, "utf8");

  // Header banner image from original export — use PhilHealth logo asset
  // (image1.png was not included with the HTML; keep slot, use official logo)
  html = html.replace(
    '<img style="position:absolute; width:566.9pt; height:85pt" src="image1.png" />',
    '<img style="position:absolute; left:8pt; top:12pt; width:auto; height:60pt; max-width:200pt" src="__CF5_HEADER_SRC__" />'
  );

  html = html.replace(
    'style="position:relative; border:solid 1pt black; margin:10pt auto 10pt auto; overflow:hidden; width:595.25pt; height:841.85pt;"',
    'style="position:relative; border:solid 1pt black; margin:10pt auto 10pt auto; overflow:hidden; width:595.25pt; height:841.85pt; box-sizing:content-box;"'
  );

  const overlays = OVERLAYS.map(overlayHtml).join("\n");
  // Insert overlays inside page div (before its closing tag, then </body>)
  const pageClose = html.lastIndexOf("</div>");
  if (pageClose > 0) {
    html =
      html.slice(0, pageClose) +
      `\n${overlays}\n\t` +
      html.slice(pageClose);
  }

  fs.writeFileSync(path.join(formsDir, "CF5.html"), fs.readFileSync(srcPath, "utf8"));
  fs.writeFileSync(path.join(formsDir, "CF5.template.html"), html);

  const tokens = [...new Set(html.match(/__[A-Z0-9_]+__/g) || [])].sort();
  console.log("CF5 tokens:", tokens.join(", "));
}

buildCf5();
console.log("CF5 template written.");
