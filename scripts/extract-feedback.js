const mammoth = require("mammoth");
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const fs = require("fs");
const path = require("path");

const base = "C:\\Users\\LAPTOP80\\OneDrive - prlsitesolutions.co.uk\\Documents\\ISO9001 Management System\\ISO9001 Management System\\4. Core Procedures\\Customer Satisfaction\\";

const docxFiles = [
  "Customer Satisfaction Metlen.docx",
  "Customer Feedback Log PRL-CFL1.docx",
  "Customer Satisfaction Survey PRL-CSS1 template.docx",
];

const pdfFiles = [
  "PRL customer satifaction Dalkia.pdf",
];

async function run() {
  for (const f of docxFiles) {
    const result = await mammoth.extractRawText({ path: path.join(base, f) });
    console.log("=== FILE: " + f + " ===");
    console.log(result.value.slice(0, 4000));
    console.log("");
  }
  for (const f of pdfFiles) {
    const buf = fs.readFileSync(path.join(base, f));
    const result = await pdfParse(buf);
    console.log("=== FILE: " + f + " ===");
    console.log(result.text.slice(0, 4000));
    console.log("");
  }
}

run().catch(console.error);
