import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DATA_PATH = resolve('src/data/phraseLibrary.json');
const REPORT_PATH = resolve('reports/phrase-library-validation.json');
const EXPECTED = { parts: 9, groups: 75, phrases: 830 };

const normalizePhrase = value => value
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const library = JSON.parse(await readFile(DATA_PATH, 'utf8'));
const errors = [];
const warnings = [];
const ids = new Set();
let groupCount = 0;
let phraseCount = 0;
let minimumGroupSize = Number.POSITIVE_INFINITY;
let maximumGroupSize = 0;

const registerId = (id, label) => {
    if (!id) errors.push(`${label} 缺少 ID`);
    else if (ids.has(id)) errors.push(`ID 重複：${id}`);
    else ids.add(id);
};

for (const part of library.parts || []) {
    registerId(part.id, `Part ${part.order}`);
    if (!part.title?.trim()) errors.push(`${part.id || '未知 Part'} 標題為空`);

    for (const group of part.groups || []) {
        groupCount += 1;
        registerId(group.id, `群組 ${group.order}`);
        if (group.partId !== part.id) errors.push(`${group.id} 的 partId 不一致`);
        if (!group.title?.trim()) errors.push(`${group.id} 標題為空`);

        const phrases = group.phrases || [];
        minimumGroupSize = Math.min(minimumGroupSize, phrases.length);
        maximumGroupSize = Math.max(maximumGroupSize, phrases.length);
        if (group.phraseCount !== phrases.length) errors.push(`${group.id} 的 phraseCount 不一致`);

        const normalizedWords = new Set();
        for (const phrase of phrases) {
            phraseCount += 1;
            registerId(phrase.id, `${group.id} 片語`);
            if (phrase.groupId !== group.id || phrase.partId !== part.id) errors.push(`${phrase.id} 的群組關聯不一致`);
            if (!phrase.word?.trim()) errors.push(`${phrase.id} 英文為空`);
            if (!phrase.chinese?.trim()) errors.push(`${phrase.id} 中文為空`);

            const normalized = normalizePhrase(phrase.word || '');
            if (normalizedWords.has(normalized)) errors.push(`${group.id} 群組內重複片語：${phrase.word}`);
            normalizedWords.add(normalized);

            if (/[这发为关后进从东车门见听说无万与专业两严处]/.test(phrase.chinese)) {
                warnings.push({ type: 'possible-simplified-chinese', id: phrase.id, text: phrase.chinese });
            }
            if (/[;,]/.test(phrase.chinese)) {
                warnings.push({ type: 'ascii-punctuation', id: phrase.id, text: phrase.chinese });
            }
        }
    }
}

const actual = { parts: library.parts?.length || 0, groups: groupCount, phrases: phraseCount };
for (const key of Object.keys(EXPECTED)) {
    if (actual[key] !== EXPECTED[key]) errors.push(`${key} 數量錯誤：預期 ${EXPECTED[key]}，實際 ${actual[key]}`);
    if (library.totals?.[key] !== actual[key]) errors.push(`totals.${key} 與實際數量不一致`);
}

const report = {
    valid: errors.length === 0,
    expected: EXPECTED,
    actual,
    groupSize: { minimum: minimumGroupSize, maximum: maximumGroupSize },
    errors,
    warnings
};

await mkdir(dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exitCode = 1;
