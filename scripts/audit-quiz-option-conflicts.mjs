import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { hasAmbiguousTranslation, normaliseChineseMeaning, normaliseEnglish } from '../src/constants/quizOptionRules.js';
import { createBattleQuestionSet } from '../src/utils/battle-questions.js';
import { createSeededRandom } from '../src/utils/phrase-library.js';

const root = new URL('../', import.meta.url);
const readJson = file => JSON.parse(readFileSync(new URL(file, root), 'utf8'));
const verbose = process.argv.includes('--verbose');
const random = createSeededRandom(2026);
let targetCount = 0;
let groupCount = 0;

function* pairs(items) {
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) yield [items[i], items[j]];
    }
}

function auditGroup(label, quizData, optionPool, isPhrase = false) {
    assert.ok(quizData.length, `${label} 沒有題目`);
    const { questions, questionBuildError } = createBattleQuestionSet({
        quizData, optionPool, isPhrase, questionLimit: quizData.length, random
    });
    assert.ok(!questionBuildError, `${label} 無法出題：${questionBuildError}`);
    const pending = new Map(quizData.map(item => [item.id, item.word]));
    assert.equal(pending.size, quizData.length, `${label} 的目標 ID 重複`);
    for (const { target, options } of questions) {
        const name = `${label} / ${target.word}`;
        assert.ok(pending.delete(target.id), `${name} 是重複或額外的題目`);
        assert.equal(options.length, 4, `${name} 未滿四個選項`);
        assert.equal(new Set(options.map(option => option.id)).size, 4, `${name} 選項 ID 重複`);
        const correct = options.find(option => option.id === target.id);
        assert.ok(correct && correct.word === target.word && correct.chinese === target.chinese, `${name} 缺少正解`);
        for (const labels of [options.map(o => normaliseEnglish(o.word)), options.map(o => normaliseChineseMeaning(o.chinese))]) {
            assert.ok(labels.every(Boolean), `${name} 含空白選項`);
            assert.equal(new Set(labels).size, 4, `${name} 選項文字重複`);
        }
        for (const [left, right] of pairs(options)) {
            assert.ok(!hasAmbiguousTranslation(left, right), `${name} 選項衝突：${left.word} / ${right.word}`);
        }
    }
    assert.equal(pending.size, 0, `${label} 遺漏目標：${[...pending.values()].join('、')}`);
    groupCount++;
    targetCount += questions.length;
}

const textbookFiles = readdirSync(root).filter(file => /^data(?:_book\d+_units\d+-\d+)?\.json$/.test(file)).sort();
assert.equal(textbookFiles.length, 16, '主線題庫應包含 16 個單元');
for (const file of textbookFiles) {
    const unit = readJson(file).map((row, index) => ({
        ...row,
        id: `${file}:${index}`,
        word: row.category.startsWith('2') ? row.phrase || row.word : row.word || row.phrase,
        chinese: row.chinese || row.details || row.definitions?.map(d => `[${d.pos}] ${d.mean}`).join(' / ')
    }));
    const categories = number => unit.filter(item => item.category.startsWith(number));
    const vocabulary = categories('1').sort((a, b) => a.word.localeCompare(b.word));
    const half = Math.ceil(vocabulary.length / 2);
    const groups = [
        ['單字 A', vocabulary.slice(0, half)], ['單字 B', vocabulary.slice(half)],
        ['搭配字', categories('2')], ['多義字', categories('4')], ['片語佳句', categories('3')]
    ];
    assert.equal(groups.flatMap(([, items]) => items).length, unit.length, `${file} 有未檢查的類別`);
    for (const [name, items] of groups) auditGroup(`${file} ${name}`, items, unit);
}

const lessons = readJson('data_advanced.json');
assert.deepEqual(lessons.map(l => l.lesson).sort((a, b) => a - b), Array.from({ length: 133 }, (_, i) => i + 1));
let advancedPairs = 0;
let blockedPairs = 0;
for (const { lesson, words } of lessons) {
    const items = words.map((item, index) => ({ ...item, id: `advanced:${lesson}:${index}`, series: 'advanced', lesson }));
    auditGroup(`進階第 ${lesson} 課`, items);
    let total = 0;
    let blocked = 0;
    for (const [left, right] of pairs(items)) {
        total++;
        if (hasAmbiguousTranslation(left, right)) blocked++;
    }
    advancedPairs += total;
    blockedPairs += blocked;
    if (verbose) console.log(`進階第 ${lesson} 課：${total} 個可能詞對，排除 ${blocked} 對`);
}

const { parts } = readJson('src/data/phraseLibrary.json');
assert.equal(parts.flatMap(part => part.groups).length, 75, '片語題庫應包含 75 組');
for (const part of parts) {
    const partPool = part.groups.flatMap(group => group.phrases);
    for (const group of part.groups) auditGroup(group.title, group.phrases, partPool, true);
}

console.log(`通過：主線 16 單元 × 5 類、進階 133 課、片語 75 組，共 ${groupCount} 個題組、${targetCount} 個出題目標。`);
console.log(`進階各課的全部詞對合計 ${advancedPairs} 對，排除 ${blockedPairs} 對。加上 --verbose 可查看逐課統計。`);
