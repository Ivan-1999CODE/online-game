import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const SOURCE_URL = 'https://ivan-1999code.github.io/mid-school-phase/';
const OUTPUT_PATH = resolve('src/data/phraseLibrary.json');

const normalizePhrase = value => value
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const slugify = value => normalizePhrase(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const stableHash = value => createHash('sha1').update(value).digest('hex').slice(0, 10);

const fixKnownFormatting = value => value
    .replace(/到处/g, '到處')
    .replace(/;/g, '；')
    .trim();

const extractArrayLiteral = source => {
    const markerIndex = source.indexOf('const database');
    if (markerIndex < 0) throw new Error('找不到 Demo 的 const database');

    const start = source.indexOf('[', markerIndex);
    if (start < 0) throw new Error('找不到 database 陣列開頭');

    let depth = 0;
    let quote = null;
    let escaped = false;

    for (let index = start; index < source.length; index += 1) {
        const char = source[index];

        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = null;
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            quote = char;
            continue;
        }
        if (char === '[') depth += 1;
        if (char === ']') {
            depth -= 1;
            if (depth === 0) return source.slice(start, index + 1);
        }
    }

    throw new Error('database 陣列未正常結束');
};

const buildGroupId = (title, partOrder) => {
    const unitMatch = title.match(/^Unit\s+(\d+)/i);
    if (unitMatch) return `phrase-unit-${String(unitMatch[1]).padStart(2, '0')}`;
    return `phrase-p${String(partOrder).padStart(2, '0')}-${slugify(title)}`;
};

const toVersionedLibrary = database => {
    const seenGroupIds = new Set();
    const seenPhraseIds = new Set();
    let phraseCount = 0;
    let groupCount = 0;

    const parts = database.map((part, partIndex) => {
        const partOrder = partIndex + 1;
        const partId = `phrase-part-${String(partOrder).padStart(2, '0')}`;
        const groups = part.units.map((group, groupIndex) => {
            const groupOrder = groupIndex + 1;
            const groupId = buildGroupId(group.title, partOrder);
            if (seenGroupIds.has(groupId)) throw new Error(`群組 ID 重複：${groupId}`);
            seenGroupIds.add(groupId);
            groupCount += 1;

            const phrases = group.phrases.map((phrase, phraseIndex) => {
                const word = phrase.en.trim();
                const chinese = fixKnownFormatting(phrase.zh);
                const phraseId = `${groupId}-${stableHash(normalizePhrase(word))}`;
                if (seenPhraseIds.has(phraseId)) throw new Error(`片語 ID 重複：${phraseId}`);
                seenPhraseIds.add(phraseId);
                phraseCount += 1;
                return {
                    id: phraseId,
                    partId,
                    groupId,
                    word,
                    chinese,
                    order: phraseIndex + 1
                };
            });

            return {
                id: groupId,
                partId,
                title: group.title.trim(),
                order: groupOrder,
                phraseCount: phrases.length,
                phrases
            };
        });

        return {
            id: partId,
            title: part.part.trim(),
            order: partOrder,
            groupCount: groups.length,
            groups
        };
    });

    return {
        version: 1,
        source: SOURCE_URL,
        totals: { parts: parts.length, groups: groupCount, phrases: phraseCount },
        parts
    };
};

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Demo 下載失敗：HTTP ${response.status}`);

const html = await response.text();
const literal = extractArrayLiteral(html);
const database = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
const library = toVersionedLibrary(database);

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(library, null, 2)}\n`, 'utf8');

console.log(`已匯入 ${library.totals.parts} 個 Part、${library.totals.groups} 個群組、${library.totals.phrases} 筆片語。`);
