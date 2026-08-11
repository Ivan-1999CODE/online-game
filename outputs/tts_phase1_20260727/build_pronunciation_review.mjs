import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { output as inventory } from "../../scripts/analyze_tts_inventory.mjs";

const outputDir = import.meta.dirname;
const workbookPath = path.join(outputDir, "第一階段發音審核清單.xlsx");

const workbook = Workbook.create();
const overview = workbook.worksheets.add("說明");
const samples = workbook.worksheets.add("樣本候選");
const specials = workbook.worksheets.add("特殊寫法");
const heteronyms = workbook.worksheets.add("同字異音");

const colors = {
  navy: "#17324D",
  teal: "#177E89",
  tealLight: "#DFF3F4",
  gold: "#E3A62F",
  goldLight: "#FFF4D6",
  redLight: "#FDE7E7",
  greenLight: "#E4F3E8",
  gray: "#5E6B75",
  grayLight: "#EEF2F5",
  white: "#FFFFFF",
  border: "#CAD4DC",
};

const applyTitle = (sheet, title, subtitle, lastColumn) => {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${lastColumn}1`).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A1:${lastColumn}1`).format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white, size: 18 },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
  sheet.getRange(`A1:${lastColumn}1`).format.rowHeight = 34;

  sheet.getRange(`A2:${lastColumn}2`).merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A2:${lastColumn}2`).format = {
    fill: colors.tealLight,
    font: { color: colors.navy, italic: true, size: 10 },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange(`A2:${lastColumn}2`).format.rowHeight = 32;
};

const styleHeader = (range) => {
  range.format = {
    fill: colors.teal,
    font: { bold: true, color: colors.white },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: colors.navy },
  };
  range.format.rowHeight = 30;
};

const styleData = (range) => {
  range.format = {
    font: { color: "#1F2933", size: 10 },
    verticalAlignment: "top",
    wrapText: true,
    borders: {
      insideHorizontal: { style: "thin", color: colors.border },
      bottom: { style: "thin", color: colors.border },
    },
  };
};

const applyStatusFormatting = (range) => {
  range.conditionalFormats.add("containsText", {
    text: "待",
    format: { fill: colors.goldLight, font: { color: "#7A5200", bold: true } },
  });
  range.conditionalFormats.add("containsText", {
    text: "已確認",
    format: { fill: colors.greenLight, font: { color: "#23613A", bold: true } },
  });
  range.conditionalFormats.add("containsText", {
    text: "需修改",
    format: { fill: colors.redLight, font: { color: "#8C2525", bold: true } },
  });
};

// 說明頁
applyTitle(
  overview,
  "第一階段發音審核清單",
  "本檔只整理資料，尚未呼叫 OpenAI API、尚未產生音檔或費用。先確認朗讀文字，再進入 marin／cedar 樣本比較。",
  "J",
);

overview.getRange("A4:J4").values = [[
  "樣本候選",
  null,
  "特殊寫法",
  null,
  "同字異音",
  null,
  "不重複文字",
  null,
  "API 狀態",
  null,
]];
overview.getRange("A5:J5").formulas = [[
  "=COUNTA('樣本候選'!A6:A1000)",
  null,
  "=COUNTA('特殊寫法'!A6:A1000)",
  null,
  "=COUNTA('同字異音'!A6:A1000)",
  null,
  `=${inventory.sourceSummary.uniqueDisplayTexts}`,
  null,
  null,
  null,
]];
overview.getRange("I5").values = [["尚未呼叫"]];
overview.getRange("A4:J5").format = {
  fill: colors.grayLight,
  font: { color: colors.navy },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: colors.border },
};
overview.getRange("A4:J4").format.font = { bold: true, color: colors.gray };
overview.getRange("A5:J5").format.font = { bold: true, color: colors.navy, size: 16 };
overview.getRange("I5:J5").format.fill = colors.greenLight;
overview.getRange("A4:J5").format.rowHeight = 28;

overview.getRange("A8:D8").values = [["階段", "狀態", "工作內容", "進入下一階段前的確認"]];
styleHeader(overview.getRange("A8:D8"));
overview.getRange("A9:D13").values = [
  ["1", "進行中", "整理特殊符號、文法代號與同字異音", "Ivan 確認本活頁簿"],
  ["2", "未開始", "marin／cedar 各產生 20 個樣本", "選定聲音、速度與語氣"],
  ["3", "未開始", "挑 1 個單元產生完整 MP3", "三星及其他手機實測"],
  ["4", "未開始", "批次產生全部 MP3，支援續跑", "抽查發音與檔案數量"],
  ["5", "未開始", "網站優先播放 MP3，手機 TTS 備援", "顯示 AI 語音揭露文字"],
];
styleData(overview.getRange("A9:D13"));
applyStatusFormatting(overview.getRange("B9:B13"));

overview.getRange("A16:J16").merge();
overview.getRange("A16").values = [["審核原則"]];
overview.getRange("A16:J16").format = {
  fill: colors.gold,
  font: { bold: true, color: colors.navy },
};
overview.getRange("A17:J20").merge(true);
overview.getRange("A17:A20").values = [
  ["1. 「顯示文字」保留教材原貌；「TTS 朗讀文字」才是送給語音模型的自然英文。"],
  ["2. 含 /、+、V-ing、括號或省略號的資料，不直接批次轉檔。"],
  ["3. 同字異音依詞性或中文意思建立不同 pronunciation key。"],
  ["4. 審核欄可選：待確認、已確認、需修改、不處理。"],
];
overview.getRange("A17:J20").format = {
  fill: "#FFFBED",
  font: { color: "#4A3A13" },
  wrapText: true,
  verticalAlignment: "center",
};
overview.getRange("A17:J20").format.rowHeight = 25;

overview.getRange("B23:J23").merge();
overview.getRange("B24:J24").merge();
overview.getRange("B25:J25").merge();
overview.getRange("B26:J26").merge();
overview.getRange("A23").values = [["資料來源"]];
overview.getRange("B23").values = [["位置／網址"]];
overview.getRange("A24:B26").values = [
  ["本地教材資料", "data*.json 與 data_advanced.json"],
  ["OpenAI TTS 指南", "https://developers.openai.com/api/docs/guides/text-to-speech"],
  ["建議聲音", "marin、cedar（正式產生前仍需實際試聽）"],
];
styleHeader(overview.getRange("A23:J23"));
styleData(overview.getRange("A24:J26"));
overview.getRange("A24:J26").format.rowHeight = 24;

overview.getRange("A:A").format.columnWidth = 15;
overview.getRange("B:B").format.columnWidth = 18;
overview.getRange("C:C").format.columnWidth = 50;
overview.getRange("D:D").format.columnWidth = 34;
overview.getRange("E:J").format.columnWidth = 14;
overview.freezePanes.freezeRows(2);

// 樣本候選
applyTitle(
  samples,
  "marin／cedar 聲音比較：20 個候選樣本",
  "這些項目涵蓋基礎單字、多音節、子音群、問句、片語與同字異音。此頁尚未產生音檔。",
  "J",
);
samples.getRange("A4:J4").merge();
samples.getRange("A4").values = [["請先檢查 C 欄的實際朗讀文字；確認後，每列會各產生 marin 與 cedar 兩個版本。"]];
samples.getRange("A4:J4").format = {
  fill: colors.goldLight,
  font: { bold: true, color: "#6F4A00" },
  wrapText: true,
};
samples.getRange("A5:J5").values = [[
  "樣本 ID",
  "顯示文字",
  "TTS 朗讀文字",
  "測試目的",
  "資料狀態",
  "來源",
  "聲音 A",
  "聲音 B",
  "建議速度",
  "審核狀態",
]];
styleHeader(samples.getRange("A5:J5"));
const sampleValues = inventory.sampleRows.map((row) => [
  row.sampleId,
  row.displayText,
  row.ttsText,
  row.reason,
  row.datasetStatus,
  row.source,
  row.voiceA,
  row.voiceB,
  Number(row.speedDraft),
  row.reviewStatus,
]);
const sampleEnd = 5 + sampleValues.length;
samples.getRange(`A6:J${sampleEnd}`).values = sampleValues;
styleData(samples.getRange(`A6:J${sampleEnd}`));
samples.getRange(`I6:I${sampleEnd}`).format.numberFormat = "0.00";
samples.getRange(`J6:J${sampleEnd}`).dataValidation = {
  rule: { type: "list", values: ["待產生樣本", "已確認", "需修改", "不處理"] },
};
applyStatusFormatting(samples.getRange(`J6:J${sampleEnd}`));
samples.getRange(`A6:A${sampleEnd}`).format.horizontalAlignment = "center";
samples.getRange(`G6:J${sampleEnd}`).format.horizontalAlignment = "center";
samples.getRange("A:A").format.columnWidth = 12;
samples.getRange("B:C").format.columnWidth = 24;
samples.getRange("D:D").format.columnWidth = 31;
samples.getRange("E:F").format.columnWidth = 28;
samples.getRange("G:H").format.columnWidth = 12;
samples.getRange("I:J").format.columnWidth = 15;
samples.getRange(`A6:J${sampleEnd}`).format.autofitRows();
samples.freezePanes.freezeRows(5);
samples.freezePanes.freezeColumns(1);

// 特殊寫法
applyTitle(
  specials,
  `特殊寫法審核：${inventory.specialRows.length} 筆`,
  "包含斜線、加號、V-ing／N 等文法代號、括號、省略號與抽象代名詞。F 欄空白代表不可直接轉檔，需先補自然英文。",
  "K",
);
specials.getRange("A4:K4").merge();
specials.getRange("A4").values = [["優先審核順序：F 欄空白 → 同時含多種問題 → 出現次數較高。"]];
specials.getRange("A4:K4").format = {
  fill: colors.goldLight,
  font: { bold: true, color: "#6F4A00" },
};
specials.getRange("A5:K5").values = [[
  "審核 ID",
  "顯示文字",
  "中文",
  "詞性",
  "問題類型",
  "朗讀草案",
  "建議處理方式",
  "審核狀態",
  "來源",
  "出現次數",
  "正規化 key",
]];
styleHeader(specials.getRange("A5:K5"));
const specialValues = inventory.specialRows.map((row) => [
  row.reviewId,
  row.displayText,
  row.chinese,
  row.pos,
  row.issues,
  row.draftTtsText,
  row.recommendedAction,
  row.status,
  row.sources,
  row.occurrences,
  row.normalizedKey,
]);
const specialEnd = 5 + specialValues.length;
specials.getRange(`A6:K${specialEnd}`).values = specialValues;
styleData(specials.getRange(`A6:K${specialEnd}`));
specials.getRange(`H6:H${specialEnd}`).dataValidation = {
  rule: { type: "list", values: ["待確認", "已確認", "需修改", "不處理"] },
};
applyStatusFormatting(specials.getRange(`H6:H${specialEnd}`));
specials.getRange(`J6:J${specialEnd}`).format.numberFormat = "0";
specials.getRange(`A6:A${specialEnd}`).format.horizontalAlignment = "center";
specials.getRange(`H6:J${specialEnd}`).format.horizontalAlignment = "center";
specials.getRange("A:A").format.columnWidth = 11;
specials.getRange("B:B").format.columnWidth = 33;
specials.getRange("C:C").format.columnWidth = 30;
specials.getRange("D:D").format.columnWidth = 14;
specials.getRange("E:E").format.columnWidth = 27;
specials.getRange("F:F").format.columnWidth = 36;
specials.getRange("G:G").format.columnWidth = 43;
specials.getRange("H:H").format.columnWidth = 13;
specials.getRange("I:I").format.columnWidth = 28;
specials.getRange("J:J").format.columnWidth = 11;
specials.getRange("K:K").format.columnWidth = 28;
specials.getRange(`A6:K${specialEnd}`).format.autofitRows();
specials.freezePanes.freezeRows(5);
specials.freezePanes.freezeColumns(2);

// 同字異音
applyTitle(
  heteronyms,
  `同字異音候選：${inventory.heteronymRows.length} 個`,
  "即使畫面只顯示同一個拼字，也可能需要依詞性、時態或中文意思指定不同發音。此頁是第一輪風險清單。",
  "J",
);
heteronyms.getRange("A4:J4").merge();
heteronyms.getRange("A4").values = [["正式轉檔時，會使用獨立 pronunciation key 與發音提示；不會只用拼字覆蓋同名音檔。"]];
heteronyms.getRange("A4:J4").format = {
  fill: colors.goldLight,
  font: { bold: true, color: "#6F4A00" },
};
heteronyms.getRange("A5:J5").values = [[
  "審核 ID",
  "單字",
  "教材中文意思",
  "教材詞性",
  "可能的發音差異",
  "建議處理",
  "pronunciation key 草案",
  "審核狀態",
  "來源",
  "出現次數",
]];
styleHeader(heteronyms.getRange("A5:J5"));
const heteronymValues = inventory.heteronymRows.map((row) => [
  row.reviewId,
  row.word,
  row.datasetMeanings,
  row.datasetPos,
  row.pronunciationVariants,
  row.recommendedAction,
  row.pronunciationKeyDraft,
  row.status,
  row.sources,
  row.occurrences,
]);
const heteronymEnd = 5 + heteronymValues.length;
heteronyms.getRange(`A6:J${heteronymEnd}`).values = heteronymValues;
styleData(heteronyms.getRange(`A6:J${heteronymEnd}`));
heteronyms.getRange(`H6:H${heteronymEnd}`).dataValidation = {
  rule: { type: "list", values: ["待確認", "已確認", "需修改", "不處理"] },
};
applyStatusFormatting(heteronyms.getRange(`H6:H${heteronymEnd}`));
heteronyms.getRange(`J6:J${heteronymEnd}`).format.numberFormat = "0";
heteronyms.getRange(`A6:B${heteronymEnd}`).format.horizontalAlignment = "center";
heteronyms.getRange(`H6:J${heteronymEnd}`).format.horizontalAlignment = "center";
heteronyms.getRange("A:A").format.columnWidth = 11;
heteronyms.getRange("B:B").format.columnWidth = 17;
heteronyms.getRange("C:C").format.columnWidth = 32;
heteronyms.getRange("D:D").format.columnWidth = 17;
heteronyms.getRange("E:E").format.columnWidth = 40;
heteronyms.getRange("F:F").format.columnWidth = 40;
heteronyms.getRange("G:G").format.columnWidth = 31;
heteronyms.getRange("H:H").format.columnWidth = 13;
heteronyms.getRange("I:I").format.columnWidth = 29;
heteronyms.getRange("J:J").format.columnWidth = 11;
heteronyms.getRange(`A6:J${heteronymEnd}`).format.autofitRows();
heteronyms.freezePanes.freezeRows(5);
heteronyms.freezePanes.freezeColumns(2);

// 緊湊驗證
const overviewCheck = await workbook.inspect({
  kind: "table",
  range: "說明!A1:J26",
  include: "values,formulas",
  tableMaxRows: 26,
  tableMaxCols: 10,
});
console.log(overviewCheck.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const previews = [
  ["說明", "A1:J26", "preview_說明.png"],
  ["樣本候選", `A1:J${sampleEnd}`, "preview_樣本候選.png"],
  ["特殊寫法", "A1:K28", "preview_特殊寫法.png"],
  ["同字異音", `A1:J${heteronymEnd}`, "preview_同字異音.png"],
];

for (const [sheetName, range, filename] of previews) {
  const preview = await workbook.render({
    sheetName,
    range,
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    path.join(outputDir, filename),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(workbookPath);

console.log(
  JSON.stringify({
    workbookPath,
    sampleCount: sampleValues.length,
    specialCount: specialValues.length,
    heteronymCount: heteronymValues.length,
  }),
);
