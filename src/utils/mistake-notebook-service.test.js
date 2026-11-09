import test from 'node:test';
import assert from 'node:assert/strict';
import { getMistakeNotebookUpdates } from './mistake-notebook-service.js';

const FIRST_AT = '2026-11-09T09:00:00.000+08:00';
const SECOND_AT = '2026-11-09T09:10:00.000+08:00';
const LATEST_AT = '2026-11-09T09:20:00.000+08:00';

const entry = (overrides = {}) => ({
    word: 'apple', chinese: '蘋果', count: 2, source: 'main', gameUnitId: 2,
    ...overrides
});
const practice = (sessionId, answers, completedAt = FIRST_AT) => ({
    type: 'practice', result: { sessionId, answers, completedAt }
});
const save = (data, change) => ({ ...data, ...getMistakeNotebookUpdates(data, change) });
const familiar = (ids, correctSessionId = 'round-1') => ({
    type: 'status', ids, status: 'familiar', correctSessionId, changedAt: LATEST_AT
});

test('回合 ledger 防止跨回合重送再次累加答題與錯誤次數', () => {
    const initial = { mistakeStats: { apple: entry() } };
    const first = save(initial, practice('round-1', [{ id: 'apple', isCorrect: false }]));
    const second = save(first, practice('round-2', [{ id: 'apple', isCorrect: true }], SECOND_AT));
    const beforeRetry = structuredClone(second);

    assert.equal(second.mistakeStats.apple.lastPracticeSessionId, 'round-2');
    assert.equal(second.mistakeStats.apple.practiceCount, 2);
    assert.equal(second.mistakeStats.apple.practiceCorrectCount, 1);
    assert.equal(second.mistakeStats.apple.count, 3);
    assert.deepEqual(second.savedMistakePracticeSessions, { 'round-1': true, 'round-2': true });
    assert.equal(getMistakeNotebookUpdates(second,
        practice('round-1', [{ id: 'apple', isCorrect: false }])), null);
    assert.deepEqual(second, beforeRetry);
    assert.equal(initial.mistakeStats.apple.count, 2);
    assert.equal(initial.mistakeStats.apple.practiceCount, undefined);
});

test('從最新資料累加且不重建已刪除單字，其他裝置新增項目完整保留', () => {
    const latest = {
        mistakeStats: {
            apple: entry({ count: 8, practiceCount: 4, note: '另一台裝置的新筆記' }),
            other: entry({ word: 'book', chinese: '書', count: 6, gameUnitId: 5 })
        },
        savedMistakePracticeSessions: { earlier: true }
    };
    const frozen = structuredClone(latest);
    const updates = getMistakeNotebookUpdates(latest, practice('round-1', [
        { id: 'apple', isCorrect: false },
        { id: 'deleted-word', isCorrect: true }
    ]));

    assert.equal(updates.mistakeStats.apple.count, 9);
    assert.equal(updates.mistakeStats.apple.practiceCount, 5);
    assert.equal(updates.mistakeStats.apple.note, '另一台裝置的新筆記');
    assert.equal(Object.hasOwn(updates.mistakeStats, 'deleted-word'), false);
    assert.deepEqual(updates.mistakeStats.other, latest.mistakeStats.other);
    assert.deepEqual(updates.savedMistakePracticeSessions, { earlier: true, 'round-1': true });
    assert.deepEqual(latest, frozen);
});

test('清空全部課別時只刪目前分類已熟悉的字，舊資料與待複習均保留', () => {
    const stats = {
        mainPending: entry(),
        explicitPending: entry({ reviewStatus: 'pending' }),
        mainFamiliar: entry({ gameUnitId: 7, reviewStatus: 'familiar' }),
        mainFamiliar2: entry({ gameUnitId: 2, reviewStatus: 'familiar' }),
        advancedPending: entry({ source: 'advanced', lesson: 2 }),
        advancedFamiliar: entry({ source: 'advanced', lesson: 3, reviewStatus: 'familiar' }),
        phrasePending: entry({ source: 'phrases', groupId: 'group-a' }),
        phraseFamiliar: entry({ source: 'phrases', groupId: 'group-b', reviewStatus: 'familiar' })
    };
    const original = structuredClone(stats);
    const removedByScope = {
        main: ['mainFamiliar', 'mainFamiliar2'],
        adv: ['advancedFamiliar'],
        phrases: ['phraseFamiliar']
    };
    for (const [scope, removed] of Object.entries(removedByScope)) {
        const updates = getMistakeNotebookUpdates({ mistakeStats: stats }, {
            type: 'clear-familiar', scope, unit: 'all', ids: Object.keys(stats)
        });
        const expected = Object.fromEntries(Object.entries(stats).filter(([id]) => !removed.includes(id)));
        assert.deepEqual(updates, { mistakeStats: expected });
    }
    assert.deepEqual(stats, original);
});

test('清除單一課別相容數字與字串，進階課與片語群組同樣不越界', () => {
    const stats = {
        main2: entry({ gameUnitId: '2', reviewStatus: 'familiar' }),
        main3: entry({ gameUnitId: 3, reviewStatus: 'familiar' }),
        mainPending: entry({ gameUnitId: 2 }),
        adv2: entry({ source: 'advanced', lesson: '2', reviewStatus: 'familiar' }),
        adv3: entry({ source: 'advanced', lesson: 3, reviewStatus: 'familiar' }),
        phraseA: entry({ source: 'phrases', groupId: 'group-a', reviewStatus: 'familiar' }),
        phraseB: entry({ source: 'phrases', groupId: 'group-b', reviewStatus: 'familiar' })
    };
    for (const [scope, unit, removed] of [
        ['main', 2, 'main2'], ['main', '2', 'main2'],
        ['adv', 2, 'adv2'], ['adv', '2', 'adv2'], ['phrases', 'group-a', 'phraseA']
    ]) {
        const updates = getMistakeNotebookUpdates({ mistakeStats: stats }, {
            type: 'clear-familiar', scope, unit, ids: Object.keys(stats)
        });
        const expected = Object.fromEntries(Object.entries(stats).filter(([id]) => id !== removed));
        assert.deepEqual(updates.mistakeStats, expected);
    }
});

test('確認後狀態改變或新增的字不會誤刪，也不重建已刪除項目', () => {
    const stats = {
        stillFamiliar: entry({ reviewStatus: 'familiar' }),
        backToPractice: entry({ reviewStatus: 'pending', count: 3, note: '又答錯，必須保留' }),
        newlyFamiliar: entry({ reviewStatus: 'familiar', familiarAt: LATEST_AT }),
        otherLesson: entry({ gameUnitId: 3, reviewStatus: 'familiar' })
    };
    const original = structuredClone(stats);
    const updates = getMistakeNotebookUpdates({ mistakeStats: stats }, {
        type: 'clear-familiar', scope: 'main', unit: 2,
        ids: ['stillFamiliar', 'stillFamiliar', 'backToPractice', 'already-deleted', 'otherLesson']
    });
    assert.deepEqual(Object.keys(updates.mistakeStats), ['backToPractice', 'newlyFamiliar', 'otherLesson']);
    assert.deepEqual(updates.mistakeStats.backToPractice, stats.backToPractice);
    assert.deepEqual(updates.mistakeStats.newlyFamiliar, stats.newlyFamiliar);
    assert.deepEqual(stats, original);
});

test('沒有確認項目或沒有符合範圍的已熟悉單字時不刪除任何紀錄', () => {
    const stats = { familiar: entry({ reviewStatus: 'familiar' }), pending: entry() };
    for (const change of [
        { type: 'clear-familiar', scope: 'main', unit: 'all', ids: [] },
        { type: 'clear-familiar', scope: 'main', unit: 9, ids: ['familiar'] },
        { type: 'clear-familiar', scope: 'main', unit: 2, ids: ['pending'] }
    ]) assert.deepEqual(getMistakeNotebookUpdates({ mistakeStats: stats }, change), { mistakeStats: stats });
    assert.deepEqual(getMistakeNotebookUpdates({ mistakeStats: {} }, {
        type: 'clear-familiar', scope: 'main', unit: 'all', ids: []
    }), { mistakeStats: {} });
});

test('拒絕舊的全刪操作及不完整清除範圍', () => {
    const data = { mistakeStats: { familiar: entry({ reviewStatus: 'familiar' }) } };
    const valid = { type: 'clear-familiar', scope: 'main', unit: 'all', ids: ['familiar'] };
    for (const change of [
        { type: 'clear', scope: 'main' },
        { ...valid, scope: 'all' },
        { ...valid, ids: undefined },
        { ...valid, ids: 'familiar' },
        { ...valid, unit: undefined },
        { ...valid, unit: null },
        { ...valid, unit: '' }
    ]) assert.throws(() => getMistakeNotebookUpdates(data, change));
});

test('手動刪除只移除完整 key，不會刪掉其他課別或分類的同字', () => {
    const stats = {
        apple: entry(),
        'advanced:2:apple': entry({ source: 'advanced', lesson: 2 }),
        'advanced:3:apple': entry({ source: 'advanced', lesson: 3 }),
        'phrases:group-a:apple': entry({ source: 'phrases', groupId: 'group-a' })
    };
    const updates = getMistakeNotebookUpdates({ mistakeStats: stats }, {
        type: 'remove', ids: ['advanced:2:apple', 'already-deleted']
    });
    assert.deepEqual(Object.keys(updates.mistakeStats), ['apple', 'advanced:3:apple', 'phrases:group-a:apple']);
    assert.equal(Object.keys(stats).length, 4);
});

test('批次標熟只接受該回合已保存且答對的單字，任何一筆失效就拒絕整批', () => {
    const correct = entry({ lastPracticeSessionId: 'round-1', lastPracticeCorrect: true, lastPracticedAt: FIRST_AT });
    const data = {
        mistakeStats: {
            good: correct,
            otherSession: entry({ ...correct, lastPracticeSessionId: 'round-2' }),
            wrong: entry({ ...correct, lastPracticeCorrect: false }),
            wrongLater: entry({ ...correct, lastWrongAt: SECOND_AT }),
            staleFamiliar: entry({ ...correct, reviewStatus: 'familiar', lastWrongAt: SECOND_AT })
        },
        savedMistakePracticeSessions: { 'round-1': true, 'round-2': true }
    };
    const original = structuredClone(data);
    for (const staleId of ['otherSession', 'wrong', 'wrongLater', 'staleFamiliar', 'deleted']) {
        assert.throws(() => getMistakeNotebookUpdates(data, familiar(['good', staleId])),
            `含 ${staleId} 的整批操作應失敗`);
    }
    assert.throws(() => getMistakeNotebookUpdates(data, familiar(['good'], null)));
    assert.deepEqual(data, original);

    const updates = getMistakeNotebookUpdates(data, familiar(['good']));
    assert.equal(updates.mistakeStats.good.reviewStatus, 'familiar');
    assert.equal(updates.mistakeStats.good.familiarAt, LATEST_AT);
    assert.equal(updates.mistakeStats.good.count, 2);
    assert.deepEqual(updates.mistakeStats.wrongLater, data.mistakeStats.wrongLater);
});

test('重新加入待複習保留歷史，筆記本 patch 不包含成績或帳號等無關欄位', () => {
    const data = {
        studentName: '測試學生',
        totalSessions: 25,
        arenaHistory: { battle: { score: 1000 } },
        mistakeStats: {
            apple: entry({ reviewStatus: 'familiar', familiarAt: FIRST_AT, practiceCount: 3 })
        },
        savedMistakePracticeSessions: { old: true }
    };
    const updates = getMistakeNotebookUpdates(data, {
        type: 'status', ids: ['apple'], status: 'pending', changedAt: LATEST_AT
    });
    assert.deepEqual(Object.keys(updates), ['mistakeStats']);
    assert.equal(updates.mistakeStats.apple.reviewStatus, 'pending');
    assert.equal(updates.mistakeStats.apple.familiarAt, null);
    assert.equal(updates.mistakeStats.apple.count, 2);
    assert.equal(updates.mistakeStats.apple.practiceCount, 3);

    const practiceUpdates = getMistakeNotebookUpdates(data,
        practice('new', [{ id: 'apple', isCorrect: true }]));
    assert.deepEqual(Object.keys(practiceUpdates).sort(), ['mistakeStats', 'savedMistakePracticeSessions']);
});
