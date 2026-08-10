import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
    addPhraseAttempt,
    buildPhraseQuestions,
    createSeededRandom,
    getPhraseGrade,
    normalizePhraseProgress,
    selectSmartPhrases
} from './phrase-library.js';

const makePhrases = count => Array.from({ length: count }, (_, index) => ({
    id: `phrase-${index + 1}`,
    word: `phrase ${index + 1}`,
    chinese: `意思 ${index + 1}`
}));

test('舊使用者沒有片語欄位時會得到安全預設值', () => {
    assert.deepEqual(normalizePhraseProgress(), {
        attempts: 0,
        clears: 0,
        grades: [],
        bestScore: 0,
        bestGrade: null,
        completed: false,
        seenPhraseIds: [],
        lastPlayedAt: null
    });
});

test('片語評級符合 S 100%、A 90%、B 80% 規則', () => {
    assert.equal(getPhraseGrade({ correct: 10, total: 10 }), 'S');
    assert.equal(getPhraseGrade({ correct: 9, total: 10 }), 'A');
    assert.equal(getPhraseGrade({ correct: 8, total: 10 }), 'B');
    assert.equal(getPhraseGrade({ correct: 4, total: 5 }), 'B');
    assert.equal(getPhraseGrade({ correct: 3, total: 5 }), null);
    assert.equal(getPhraseGrade({ correct: 10, total: 10, completed: false }), null);
});

test('三次有效通關依 S、A、B 排序，第四次只用較高評級替換最差一格', () => {
    let progress = addPhraseAttempt({}, { grade: 'B', score: 800, askedPhraseIds: ['p1'], playedAt: 't1' });
    progress = addPhraseAttempt(progress, { grade: 'A', score: 900, askedPhraseIds: ['p2'], playedAt: 't2' });
    progress = addPhraseAttempt(progress, { grade: 'S', score: 1000, askedPhraseIds: ['p3'], playedAt: 't3' });
    assert.deepEqual(progress.grades, ['S', 'A', 'B']);
    assert.equal(progress.clears, 3);
    assert.equal(progress.completed, true);

    const unchanged = addPhraseAttempt(progress, { grade: 'B', score: 800, askedPhraseIds: ['p4'], playedAt: 't4' });
    assert.deepEqual(unchanged.grades, ['S', 'A', 'B']);
    assert.equal(unchanged.clears, 4);

    const upgraded = addPhraseAttempt(unchanged, { grade: 'S', score: 1000, askedPhraseIds: ['p5'], playedAt: 't5' });
    assert.deepEqual(upgraded.grades, ['S', 'S', 'A']);
    assert.equal(upgraded.clears, 5);
    assert.deepEqual(upgraded.seenPhraseIds, ['p1', 'p2', 'p3', 'p4', 'p5']);
});

test('3、10、34 筆群組都遵守題數上限且不重複', () => {
    for (const size of [3, 10, 34]) {
        const selected = selectSmartPhrases(makePhrases(size), { random: createSeededRandom(size) });
        assert.equal(selected.length, Math.min(size, 10));
        assert.equal(new Set(selected.map(item => item.id)).size, selected.length);
    }
});

test('智慧抽題先覆蓋未考過片語，再放錯題，最後才放已答對內容', () => {
    const phrases = makePhrases(12);
    const selected = selectSmartPhrases(phrases, {
        seenPhraseIds: phrases.slice(0, 8).map(item => item.id),
        wrongPhraseIds: ['phrase-2', 'phrase-5'],
        limit: 7,
        random: createSeededRandom(42)
    });
    const ids = selected.map(item => item.id);
    for (const unseenId of ['phrase-9', 'phrase-10', 'phrase-11', 'phrase-12']) assert.ok(ids.includes(unseenId));
    assert.ok(ids.includes('phrase-2'));
    assert.ok(ids.includes('phrase-5'));
});

test('完成一輪覆蓋並重置後，下一輪仍會先帶回錯題', () => {
    const phrases = makePhrases(12);
    const selected = selectSmartPhrases(phrases, {
        seenPhraseIds: [],
        wrongPhraseIds: ['phrase-2', 'phrase-5'],
        limit: 3,
        random: createSeededRandom(8)
    });
    assert.ok(selected.some(item => item.id === 'phrase-2'));
    assert.ok(selected.some(item => item.id === 'phrase-5'));
});

test('題目選項排除相同中文並可從同 Part 補足 4 個選項', () => {
    const group = [
        { id: 'a', word: 'alpha', chinese: '相同' },
        { id: 'b', word: 'beta', chinese: '相同' },
        { id: 'c', word: 'gamma', chinese: '第三' }
    ];
    const part = [...group,
        { id: 'd', word: 'delta', chinese: '第四' },
        { id: 'e', word: 'epsilon', chinese: '第五' },
        { id: 'f', word: 'zeta', chinese: '第六' }
    ];
    const [question] = buildPhraseQuestions({
        selectedPhrases: [group[0]],
        groupPhrases: group,
        partPhrases: part,
        random: createSeededRandom(7)
    });
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map(item => item.chinese)).size, 4);
});

test('正式片語資料可為全部 830 筆建立四選一題目', async () => {
    const dataUrl = new URL('../data/phraseLibrary.json', import.meta.url);
    const library = JSON.parse(await readFile(dataUrl, 'utf8'));
    assert.deepEqual(library.totals, { parts: 9, groups: 75, phrases: 830 });
    for (const part of library.parts) {
        const partPhrases = part.groups.flatMap(group => group.phrases);
        for (const group of part.groups) {
            const questions = buildPhraseQuestions({
                selectedPhrases: group.phrases,
                groupPhrases: group.phrases,
                partPhrases,
                random: createSeededRandom(group.order)
            });
            assert.equal(questions.length, group.phrases.length);
            assert.ok(questions.every(question => question.options.length === 4));
        }
    }
});
