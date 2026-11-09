import assert from 'node:assert/strict';
import test from 'node:test';
import {
    applyMistakePractice, buildMistakePracticeQuestions, getMistakeScope, getMistakeUnits,
    isPendingMistake, isPracticeAnswerCorrect, removeMistakes, selectMistakes, setMistakeReviewStatus
} from './mistake-notebook.js';

const stats = {
    first: { word: 'apple', chinese: '蘋果', count: 3, gameUnitId: 1 },
    second: { word: 'book', chinese: '書', count: 2, gameUnitId: '2' },
    learned: { word: 'cat', chinese: '貓', count: 5, gameUnitId: 2, reviewStatus: 'familiar', familiarAt: 'before' },
    advanced: { word: 'dawn', chinese: '黎明', count: 1, source: 'advanced', lesson: '2' },
    phrase: { word: 'get up', chinese: '起床', count: 4, source: 'phrases', groupId: 'group-2', groupTitle: '日常生活' },
    inactive: { word: 'zero', chinese: '零', count: 0, gameUnitId: 2 }
};
const ids = entries => entries.map(entry => entry.id);

test('舊資料預設待複習，已熟悉不出現在日常清單', () => {
    assert.equal(isPendingMistake(stats.first), true);
    assert.equal(isPendingMistake(stats.learned), false);
    assert.equal(isPendingMistake(stats.inactive), false);
    assert.equal(isPendingMistake(null), false);
    assert.deepEqual(ids(selectMistakes(stats)), ['first', 'second']);
    assert.deepEqual(ids(selectMistakes(stats, { status: 'familiar' })), ['learned']);
    assert.deepEqual(selectMistakes(null), []);
});

test('單一課別與全部範圍維持一般、進階、片語隔離', () => {
    assert.deepEqual(ids(selectMistakes(stats, { unit: 2 })), ['second']);
    assert.deepEqual(ids(selectMistakes(stats, { unit: '2' })), ['second']);
    assert.deepEqual(ids(selectMistakes(stats, { unit: '2', status: 'all' })), ['learned', 'second']);
    assert.deepEqual(ids(selectMistakes(stats, { scope: 'adv', unit: 2 })), ['advanced']);
    assert.deepEqual(ids(selectMistakes(stats, { scope: 'phrases', unit: 'group-2' })), ['phrase']);
    assert.deepEqual(selectMistakes(stats, { unit: 16 }), []);
    assert.deepEqual(selectMistakes(stats, { scope: 'adv', unit: 3 }), []);
    assert.equal(getMistakeScope({ source: 'advanced', lesson: null }), 'main');
});

test('課別選項包括已熟悉紀錄，以便重新查看與加入待複習', () => {
    assert.equal(getMistakeUnits(stats).length, 16);
    const onlyLearned = { a: { ...stats.advanced, reviewStatus: 'familiar' } };
    assert.deepEqual(getMistakeUnits(onlyLearned, 'adv'), [{ value: '2', label: '第 2 課' }]);
    assert.deepEqual(getMistakeUnits(stats, 'phrases'), [{ value: 'group-2', label: '日常生活' }]);
});

test('全部練習包含超過 20 個待複習目標，額外選項不變成題目', () => {
    const entries = Array.from({ length: 31 }, (_, index) => ({ id: `word-${index}`, word: `word ${index}`, chinese: `意思 ${index}` }));
    const pool = [{ id: 'outside', word: 'outside', chinese: '其他課的選項' }];
    const questions = buildMistakePracticeQuestions(entries, pool, () => 0.25);
    assert.equal(questions.length, 31);
    assert.deepEqual(new Set(questions.map(question => question.target.id)), new Set(ids(entries)));
    assert.ok(questions.every(question => question.options.length === 4));
    assert.equal(entries[0].id, 'word-0');
});

test('僅 1 個錯題仍可作答，沒有選項時改成拼字題', () => {
    const [question] = buildMistakePracticeQuestions([{ id: 'one', word: "Don't give up", chinese: '不要放棄' }]);
    assert.equal(question.mode, 'spelling');
    assert.deepEqual(question.options, []);
    assert.equal(isPracticeAnswerCorrect(question, '  DON’T   GIVE UP '), true);
    assert.equal(isPracticeAnswerCorrect(question, 'do give up'), false);
    assert.equal(isPracticeAnswerCorrect(question, ''), false);
});

test('相同英文、中文、近義詞與重複干擾選項均排除', () => {
    const target = { id: 'target', word: 'big', chinese: '大的' };
    const pool = [
        { id: 'same-word', word: ' BIG ', chinese: '巨大' },
        { id: 'same-chinese', word: 'huge', chinese: '大的（形容詞）' },
        { id: 'synonym', word: 'large', chinese: '大號' },
        { id: 'book', word: 'book', chinese: '書本' },
        { id: 'duplicate-book', word: 'book', chinese: '書' },
        { id: 'water', word: 'water', chinese: '水' },
        { id: 'same-water', word: 'aqua', chinese: '水' }
    ];
    const [question] = buildMistakePracticeQuestions([target], pool, () => 0.5);
    assert.equal(question.mode, 'en-ch');
    assert.equal(question.options.length, 3);
    assert.ok(question.options.every(option => !['same-word', 'same-chinese', 'synonym'].includes(option.id)));
    assert.equal(isPracticeAnswerCorrect(question, 'target'), true);
    assert.equal(isPracticeAnswerCorrect(question, 'book'), false);
    assert.equal(isPracticeAnswerCorrect(question, 'outside'), false);
});

test('答對保留舊錯題與狀態，僅記錄成果；答錯恢復待複習', () => {
    const next = applyMistakePractice(stats, {
        sessionId: 'session-1', completedAt: '2026-11-09T01:00:00Z',
        answers: [{ id: 'second', isCorrect: true }, { id: 'learned', isCorrect: false }]
    });
    assert.equal(next.second.count, 2);
    assert.equal(next.second.reviewStatus, undefined);
    assert.equal(next.second.practiceCount, 1);
    assert.equal(next.second.practiceCorrectCount, 1);
    assert.equal(next.second.lastPracticeCorrect, true);
    assert.equal(next.learned.count, 6);
    assert.equal(next.learned.reviewStatus, 'pending');
    assert.equal(next.learned.familiarAt, null);
    assert.equal(next.learned.practiceCorrectCount, 0);
    assert.equal(stats.learned.reviewStatus, 'familiar');
    assert.equal(stats.second.practiceCount, undefined);
    assert.equal(next.first, stats.first);
});

test('儲存重試與重複答案不重複計數，也不復活已刪除單字', () => {
    const result = {
        sessionId: 'retry', completedAt: '2026-11-09T01:00:00Z',
        answers: [{ id: 'first', isCorrect: false }, { id: 'first', isCorrect: false }, { id: 'deleted', isCorrect: false }]
    };
    const once = applyMistakePractice(stats, result);
    const twice = applyMistakePractice(once, result);
    assert.deepEqual(twice, once);
    assert.equal(twice.first.count, 4);
    assert.equal(twice.first.practiceCount, 1);
    assert.equal(twice.deleted, undefined);
    assert.throws(() => applyMistakePractice(stats, { answers: [] }), /缺少/);
});

test('批次已熟悉僅允許指定回合答對的單字，其他課別與答錯資料不動', () => {
    const practiced = applyMistakePractice(stats, {
        sessionId: 'result', completedAt: '2026-11-09T01:00:00Z',
        answers: [{ id: 'first', isCorrect: true }, { id: 'second', isCorrect: false }]
    });
    const marked = setMistakeReviewStatus(practiced, ['first', 'second', 'advanced', 'deleted'], 'familiar', '2026-11-09T02:00:00Z', { correctSessionId: 'result' });
    assert.equal(marked.first.reviewStatus, 'familiar');
    assert.equal(marked.first.familiarAt, '2026-11-09T02:00:00Z');
    assert.equal(marked.first.count, 3);
    assert.equal(marked.second.reviewStatus, 'pending');
    assert.equal(marked.advanced.reviewStatus, undefined);
    assert.equal(marked.deleted, undefined);
    assert.deepEqual(ids(selectMistakes(marked)), ['second']);
    const stale = setMistakeReviewStatus(practiced, ['first'], 'familiar', 'later', { correctSessionId: 'older' });
    assert.equal(stale.first.reviewStatus, undefined);
});

test('其他回合新答錯的紀錄，不能被舊結果頁重新標記為已熟悉', () => {
    const practiced = applyMistakePractice(stats, {
        sessionId: 'older', completedAt: '2026-11-09T01:00:00Z', answers: [{ id: 'first', isCorrect: true }]
    });
    const latest = { ...practiced, first: { ...practiced.first, lastWrongAt: '2026-11-09T02:00:00Z', reviewStatus: 'pending' } };
    const marked = setMistakeReviewStatus(latest, ['first'], 'familiar', '2026-11-09T03:00:00Z', { correctSessionId: 'older' });
    assert.equal(marked.first.reviewStatus, 'pending');
});

test('已熟悉可恢復待複習，手動刪除僅移除指定的完整 key', () => {
    const restored = setMistakeReviewStatus(stats, ['learned'], 'pending', 'later');
    assert.equal(restored.learned.reviewStatus, 'pending');
    assert.equal(restored.learned.familiarAt, null);
    assert.equal(restored.learned.count, 5);
    const source = { 'advanced:2:word.id': stats.advanced, 'word.id': stats.first, ordinary: stats.second };
    const removed = removeMistakes(source, ['advanced:2:word.id']);
    assert.deepEqual(Object.keys(removed), ['word.id', 'ordinary']);
    assert.ok(source['advanced:2:word.id']);
    assert.throws(() => setMistakeReviewStatus(stats, ['first'], 'deleted'), /不支援/);
});
