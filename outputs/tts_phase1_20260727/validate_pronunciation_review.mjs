import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = path.join(import.meta.dirname, "第一階段發音審核清單.xlsx");
const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const expectedSheets = ["說明", "樣本候選", "特殊寫法", "同字異音"];
const actualSheets = workbook.worksheets.items.map((sheet) => sheet.name);

const nonEmptyIds = (sheetName, range) =>
  workbook.worksheets
    .getItem(sheetName)
    .getRange(range)
    .values
    .flat()
    .filter((value) => String(value ?? "").trim() !== "");

const sampleIds = nonEmptyIds("樣本候選", "A6:A1000");
const specialIds = nonEmptyIds("特殊寫法", "A6:A1000");
const heteronymIds = nonEmptyIds("同字異音", "A6:A1000");

const allCellText = workbook.worksheets.items
  .flatMap((sheet) => sheet.getUsedRange()?.values?.flat(2) || [])
  .map((value) => String(value ?? ""))
  .join("\n");

const checks = {
  sheetsMatch: JSON.stringify(actualSheets) === JSON.stringify(expectedSheets),
  sampleCount: sampleIds.length,
  specialCount: specialIds.length,
  heteronymCount: heteronymIds.length,
  sampleIdsSequential: sampleIds.every(
    (id, index) => id === `P-${String(index + 1).padStart(2, "0")}`,
  ),
  specialIdsSequential: specialIds.every(
    (id, index) => id === `S-${String(index + 1).padStart(3, "0")}`,
  ),
  heteronymIdsSequential: heteronymIds.every(
    (id, index) => id === `H-${String(index + 1).padStart(3, "0")}`,
  ),
  containsApiKeyPrefix: /\bsk-(?:proj-)?[A-Za-z0-9_-]{8,}/.test(allCellText),
  containsApiKeyAssignment: /OPENAI_API_KEY\s*=/.test(allCellText),
};

const passed =
  checks.sheetsMatch &&
  checks.sampleCount === 20 &&
  checks.specialCount === 126 &&
  checks.heteronymCount === 24 &&
  checks.sampleIdsSequential &&
  checks.specialIdsSequential &&
  checks.heteronymIdsSequential &&
  !checks.containsApiKeyPrefix &&
  !checks.containsApiKeyAssignment;

console.log(JSON.stringify({ passed, actualSheets, checks }, null, 2));
if (!passed) process.exitCode = 1;
