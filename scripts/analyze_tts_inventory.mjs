import fs from "node:fs";
import path from "node:path";

const workspace = path.resolve(import.meta.dirname, "..");

const textbookFilePattern = /^data(?:_book\d+_units\d+-\d+)?\.json$/;
const textbookFiles = fs
  .readdirSync(workspace)
  .filter((name) => textbookFilePattern.test(name))
  .sort((a, b) => a.localeCompare(b, "en"));

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeKey = (value) => normalizeText(value).toLowerCase();

const entries = [];

const sourceLabel = (entry) => {
  if (entry.sourceType === "進階") return `進階 L${entry.lesson}`;
  if (entry.book !== "" && entry.unit !== "") return `Book ${entry.book} Unit ${entry.unit}`;
  return entry.sourceFile;
};

for (const file of textbookFiles) {
  const rows = JSON.parse(fs.readFileSync(path.join(workspace, file), "utf8"));
  rows.forEach((row, index) => {
    const category = normalizeText(row.category);
    const displayText = normalizeText(
      category.includes("2") ? row.phrase || row.word : row.word || row.phrase,
    );
    if (!displayText) return;

    entries.push({
      sourceType: "課本",
      sourceFile: file,
      sourceIndex: index + 1,
      book: row.book ?? "",
      unit: row.unit ?? "",
      lesson: "",
      category,
      displayText,
      chinese: normalizeText(row.chinese || row.details),
      pos: normalizeText(row.pos || row.part),
    });
  });
}

const advancedPath = path.join(workspace, "data_advanced.json");
const advancedLessons = JSON.parse(fs.readFileSync(advancedPath, "utf8"));

advancedLessons.forEach((lessonRow) => {
  const lesson = lessonRow.lesson ?? "";
  (lessonRow.words || []).forEach((row, index) => {
    const displayText = normalizeText(row.word);
    if (!displayText) return;

    entries.push({
      sourceType: "進階",
      sourceFile: "data_advanced.json",
      sourceIndex: index + 1,
      book: "",
      unit: "",
      lesson,
      category: "進階單字",
      displayText,
      chinese: normalizeText(row.chinese),
      pos: normalizeText(row.pos),
    });
  });
});

const uniqueMap = new Map();
for (const entry of entries) {
  const key = normalizeKey(entry.displayText);
  if (!uniqueMap.has(key)) uniqueMap.set(key, []);
  uniqueMap.get(key).push(entry);
}

const issueRules = [
  { label: "斜線替代寫法", test: (text) => text.includes("/") },
  { label: "加號文法代號", test: (text) => text.includes("+") },
  { label: "括號選用字", test: (text) => /[()[\]]/.test(text) },
  { label: "省略號／未完成形式", test: (text) => /\.{2,}|…/.test(text) },
  {
    label: "抽象代名詞／所有格",
    test: (text) => /\b(one['’]s|someone|somebody)\b/i.test(text),
  },
  {
    label: "文法縮寫",
    test: (text) => /\b(v-ing|to v|n\.?|adj\.?|adv\.?)\b/i.test(text),
  },
];

const specialRows = [];
for (const [key, group] of uniqueMap) {
  const text = group[0].displayText;
  const issues = issueRules.filter((rule) => rule.test(text)).map((rule) => rule.label);
  if (!issues.length) continue;

  const sourceLabels = group.map(sourceLabel);

  let draft = text;
  if (draft.includes("/")) draft = draft.replace(/\s*\/\s*/g, " or ");
  if (draft.includes("...") || draft.includes("…")) {
    draft = draft.replace(/\.{2,}|…/g, " something");
  }

  const requiresExample = /[+]|\b(v-ing|to v|n\.?|adj\.?|adv\.?)\b/i.test(text);
  const requiresManualDraft = requiresExample || issues.length > 1;
  const action = requiresManualDraft
    ? "不要直接轉檔；先改成完整自然例句或拆成固定片語"
    : text.includes("/")
      ? "確認要朗讀全部選項，或拆成多段音檔"
      : /[()[\]]/.test(text)
        ? "確認括號內容是否朗讀；必要時拆成兩段"
        : "確認朗讀草案後再產生";

  specialRows.push({
    reviewId: `S-${String(specialRows.length + 1).padStart(3, "0")}`,
    displayText: text,
    chinese: [...new Set(group.map((entry) => entry.chinese).filter(Boolean))].join("；"),
    pos: [...new Set(group.map((entry) => entry.pos).filter(Boolean))].join(" / "),
    issues: issues.join("、"),
    draftTtsText: requiresManualDraft ? "" : draft,
    recommendedAction: action,
    status: "待確認",
    sources: [...new Set(sourceLabels)].join("；"),
    occurrences: group.length,
    normalizedKey: key,
  });
}

const heteronymDefinitions = {
  address: {
    variants: "名詞：住址；動詞：發表演說／處理",
    instruction: "依詞性分檔；名詞通常首音節重讀，動詞通常後音節重讀",
  },
  bow: {
    variants: "蝴蝶結 /boʊ/；鞠躬 /baʊ/",
    instruction: "必須依中文意思分成兩個 pronunciation key",
  },
  close: {
    variants: "形容詞 /kloʊs/；動詞 /kloʊz/",
    instruction: "必須依詞性分檔",
  },
  conduct: {
    variants: "名詞首音節重讀；動詞後音節重讀",
    instruction: "依詞性分檔",
  },
  contrast: {
    variants: "名詞通常首音節重讀；動詞通常後音節重讀",
    instruction: "依詞性分檔",
  },
  decrease: {
    variants: "名詞首音節重讀；動詞後音節重讀",
    instruction: "依詞性分檔",
  },
  desert: {
    variants: "沙漠 /ˈdezərt/；遺棄 /dɪˈzɜːrt/",
    instruction: "若資料只表示沙漠，保留名詞發音；混合詞性時拆分",
  },
  does: {
    variants: "助動詞／動詞 /dʌz/；母鹿複數 /doʊz/",
    instruction: "目前資料為 do 的第三人稱單數，指定 /dʌz/ 並抽聽確認",
  },
  entrance: {
    variants: "入口 /ˈentrəns/；使著迷 /ɪnˈtræns/",
    instruction: "必須依意思分檔",
  },
  estimate: {
    variants: "名詞通常首音節重讀；動詞發音與重音可能不同",
    instruction: "依詞性分檔並抽聽確認",
  },
  export: {
    variants: "名詞首音節重讀；動詞後音節重讀",
    instruction: "依詞性分檔",
  },
  import: {
    variants: "名詞首音節重讀；動詞後音節重讀",
    instruction: "依詞性分檔",
  },
  increase: {
    variants: "名詞首音節重讀；動詞後音節重讀",
    instruction: "依詞性分檔",
  },
  invalid: {
    variants: "無效的 /ɪnˈvælɪd/；病弱者 /ˈɪnvəlɪd/",
    instruction: "依中文意思分檔",
  },
  lead: {
    variants: "帶領 /liːd/；鉛 /led/",
    instruction: "目前資料為帶領，指定 /liːd/ 並抽聽確認",
  },
  live: {
    variants: "居住 /lɪv/；現場的／直播 /laɪv/",
    instruction: "目前資料為動詞居住，指定 /lɪv/ 並抽聽確認",
  },
  house: {
    variants: "名詞房子 /haʊs/；動詞提供住處 /haʊz/",
    instruction: "目前資料為名詞房子，指定 /haʊs/ 並抽聽確認",
  },
  minute: {
    variants: "分鐘 /ˈmɪnɪt/；極小的 /maɪˈnuːt/",
    instruction: "目前資料為分鐘，指定 /ˈmɪnɪt/ 並抽聽確認",
  },
  object: {
    variants: "物體 /ˈɑːbdʒekt/；反對 /əbˈdʒekt/",
    instruction: "必須依詞性分檔",
  },
  permit: {
    variants: "名詞首音節重讀；動詞後音節重讀",
    instruction: "依詞性分檔",
  },
  present: {
    variants: "名詞／形容詞 /ˈprezənt/；動詞 /prɪˈzent/",
    instruction: "必須依詞性分檔",
  },
  produce: {
    variants: "農產品 /ˈproʊduːs/；生產 /prəˈduːs/",
    instruction: "必須依詞性分檔",
  },
  progress: {
    variants: "名詞通常首音節重讀；動詞通常後音節重讀",
    instruction: "依詞性分檔並抽聽確認",
  },
  read: {
    variants: "現在式 /riːd/；過去式／過去分詞 /red/",
    instruction: "目前資料未標時態；先決定教材要採現在式或另外拆分",
  },
  rebel: {
    variants: "名詞首音節重讀；動詞後音節重讀",
    instruction: "依詞性分檔",
  },
  record: {
    variants: "名詞 /ˈrekərd/；動詞 /rɪˈkɔːrd/",
    instruction: "必須依詞性分檔",
  },
  refuse: {
    variants: "廢物 /ˈrefjuːs/；拒絕 /rɪˈfjuːz/",
    instruction: "必須依詞性分檔",
  },
  row: {
    variants: "一列／划船 /roʊ/；爭吵 /raʊ/",
    instruction: "目前資料為列、排，指定 /roʊ/ 並抽聽確認",
  },
  subject: {
    variants: "名詞／形容詞通常首音節重讀；動詞通常後音節重讀",
    instruction: "若有動詞義，依詞性分檔",
  },
  survey: {
    variants: "名詞首音節重讀；動詞後音節重讀",
    instruction: "依詞性分檔",
  },
  suspect: {
    variants: "名詞首音節重讀；動詞後音節重讀",
    instruction: "依詞性分檔",
  },
  tear: {
    variants: "眼淚 /tɪr/；撕裂 /ter/",
    instruction: "依中文意思分檔",
  },
  use: {
    variants: "名詞 /juːs/；動詞 /juːz/",
    instruction: "若同時包含名詞與動詞義，依詞性分檔",
  },
  wind: {
    variants: "風 /wɪnd/；纏繞 /waɪnd/",
    instruction: "依中文意思分檔",
  },
};

const heteronymRows = [];
for (const [word, definition] of Object.entries(heteronymDefinitions)) {
  const group = uniqueMap.get(word);
  if (!group) continue;

  const meanings = [...new Set(group.map((entry) => entry.chinese).filter(Boolean))];
  const parts = [...new Set(group.map((entry) => entry.pos).filter(Boolean))];
  const sourceLabels = group.map(sourceLabel);

  heteronymRows.push({
    reviewId: `H-${String(heteronymRows.length + 1).padStart(3, "0")}`,
    word: group[0].displayText,
    datasetMeanings: meanings.join("；"),
    datasetPos: parts.join(" / "),
    pronunciationVariants: definition.variants,
    recommendedAction: definition.instruction,
    pronunciationKeyDraft: `${word}_請依詞性或意思命名`,
    status: "待確認",
    sources: [...new Set(sourceLabels)].join("；"),
    occurrences: group.length,
  });
}

const samplePriority = [
  { text: "bedroom", reason: "基礎雙音節單字" },
  { text: "apartment", reason: "多音節與重音" },
  { text: "world", reason: "子音群與 /r/" },
  { text: "comfortable", reason: "常見音節省略" },
  { text: "vegetable", reason: "常見音節省略" },
  { text: "temperature", reason: "多音節與自然語速" },
  { text: "through", reason: "th 與母音" },
  { text: "clothes", reason: "尾音子音群" },
  { text: "read", reason: "單字本身可能受時態影響" },
  { text: "present", reason: "同字異音：名詞／形容詞與動詞" },
  { text: "record", reason: "同字異音：名詞與動詞" },
  { text: "bow", reason: "同字異音：蝴蝶結與鞠躬" },
  { text: "close", reason: "同字異音：形容詞與動詞" },
  { text: "living room", reason: "自然片語節奏" },
  { text: "take a seat", reason: "短片語連音" },
  { text: "keep in touch", reason: "短片語重音與連音" },
  { text: "for here or to go?", reason: "問句語調" },
  { text: "what's wrong?", reason: "縮寫與問句語調" },
  { text: "thanks for helping", reason: "測試 V-ing 的自然朗讀" },
  { text: "do your best", reason: "將 one's 具體化後的自然版本" },
];

const sampleRows = [];
for (const candidate of samplePriority) {
  const group = uniqueMap.get(normalizeKey(candidate.text));
  if (group) {
    sampleRows.push({
      sampleId: `P-${String(sampleRows.length + 1).padStart(2, "0")}`,
      displayText: group[0].displayText,
      ttsText: candidate.text,
      reason: candidate.reason,
      datasetStatus: "資料中存在",
      source: sourceLabel(group[0]),
      voiceA: "marin",
      voiceB: "cedar",
      speedDraft: "0.88",
      reviewStatus: "待產生樣本",
    });
  } else {
    sampleRows.push({
      sampleId: `P-${String(sampleRows.length + 1).padStart(2, "0")}`,
      displayText: candidate.text,
      ttsText: candidate.text,
      reason: candidate.reason,
      datasetStatus: "測試用改寫／資料中未找到完全相同文字",
      source: "測試樣本",
      voiceA: "marin",
      voiceB: "cedar",
      speedDraft: "0.88",
      reviewStatus: "待產生樣本",
    });
  }
}

const sortedSpecialRows = specialRows
  .sort((a, b) => {
    const blankDraftOrder = Number(a.draftTtsText !== "") - Number(b.draftTtsText !== "");
    if (blankDraftOrder !== 0) return blankDraftOrder;
    const issueCountOrder = b.issues.split("、").length - a.issues.split("、").length;
    if (issueCountOrder !== 0) return issueCountOrder;
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    return a.displayText.localeCompare(b.displayText, "en", { sensitivity: "base" });
  })
  .map((row, index) => ({
    ...row,
    reviewId: `S-${String(index + 1).padStart(3, "0")}`,
  }));

const sortedHeteronymRows = heteronymRows
  .sort((a, b) => a.word.localeCompare(b.word, "en", { sensitivity: "base" }))
  .map((row, index) => ({
    ...row,
    reviewId: `H-${String(index + 1).padStart(3, "0")}`,
  }));

export const output = {
  generatedAt: new Date().toISOString(),
  sourceSummary: {
    textbookFiles: textbookFiles.length,
    textbookEntries: entries.filter((entry) => entry.sourceType === "課本").length,
    advancedLessons: advancedLessons.length,
    advancedEntries: entries.filter((entry) => entry.sourceType === "進階").length,
    totalEntries: entries.length,
    uniqueDisplayTexts: uniqueMap.size,
    specialCount: specialRows.length,
    heteronymCount: heteronymRows.length,
    sampleCount: sampleRows.length,
  },
  sampleRows,
  specialRows: sortedSpecialRows,
  heteronymRows: sortedHeteronymRows,
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  process.stdout.write(`${JSON.stringify(output.sourceSummary, null, 2)}\n`);
}
