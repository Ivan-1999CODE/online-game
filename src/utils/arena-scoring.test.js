import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_V2_START, ARENA_DAY_MS, ARENA_WEEK_MS, getArenaRoundScore, getArenaWeeklyStats,
    arenaDateKey, arenaWeekRange, makeArenaAttempt, mergeArenaAttempt, getArenaHistory, qualifyArenaSubmission } from './arena-scoring.js';

const range = { startMs: ARENA_V2_START, endMs: ARENA_V2_START + ARENA_WEEK_MS };
const attempt = (id, day = 0, score = 800, overrides = {}) => ({
    id, scoringVersion: 2, score, plannedQuestions: 10, totalQuestions: 10, correctCount: 10,
    completed: true, timestamp: new Date(ARENA_V2_START + day * ARENA_DAY_MS + 3600000).toISOString(), ...overrides
});

test('跨週才首次儲存只保留練習，不改動已結算的聯賽；截止前可計分', () => {
    const original = attempt('late', 6);
    assert.equal(getArenaWeeklyStats([qualifyArenaSubmission(original, range.endMs - 1)], range).score, 1600);
    const late = qualifyArenaSubmission(original, range.endMs);
    const stats = getArenaWeeklyStats([late], range);
    assert.equal(stats.score, 0);
    assert.equal(stats.activeDays, 0);
    assert.equal(stats.practiceSessions, 1);
    assert.equal(late.exclusionReason, 'closed-week');
    assert.equal(getArenaRoundScore(late), 0);
});

test('10 題乘二與 20 題原分數公平比較；特殊題數依開場滿分換算', () => {
    assert.equal(getArenaRoundScore(attempt('a')), 1600);
    assert.equal(getArenaRoundScore(attempt('b', 0, 1600, { plannedQuestions: 20 })), 1600);
    assert.equal(getArenaRoundScore(attempt('c', 0, 640, { plannedQuestions: 8 })), 1600);
    assert.equal(getArenaRoundScore(attempt('d', 0, 550, { plannedQuestions: 6 })), 1833);
});

test('失敗、未達通關條件、舊資料與無效分數不計分、不取得參賽日', () => {
    const cases = [
        attempt('failed', 0, 800, { completed: false, plannedQuestions: 20 }),
        attempt('grade', 0, 800, { cleared: false }),
        attempt('partial', 0, 800, { plannedQuestions: 20 }),
        attempt('old', 0, 800, { scoringVersion: 1 }),
        attempt('inflated', 0, 1100),
        attempt('bad-correct', 0, 800, { correctCount: 3 }),
        attempt('empty', 0, 0, { plannedQuestions: 0 }),
        attempt('nan', 0, NaN)
    ];
    const stats = getArenaWeeklyStats(cases, range);
    assert.equal(stats.score, 0);
    assert.equal(stats.sessions, 0);
    assert.equal(stats.activeDays, 0);
    assert.equal(stats.practiceSessions, cases.length);
    assert.equal(getArenaRoundScore(cases[0]), 0);
});

test('第六回替換較低成績，不限制額外練習，較低與同分不增加積分', () => {
    const history = [1600, 1500, 1700, 1800, 1900].map((score, i) => attempt(`${i}`, 0, score, { plannedQuestions: 20, totalQuestions: 20, correctCount: 20 }));
    assert.equal(getArenaWeeklyStats(history, range).score, 8500);
    history.push(attempt('new', 0, 1850, { plannedQuestions: 20, totalQuestions: 20, correctCount: 20 }));
    assert.equal(getArenaWeeklyStats(history, range).score, 8850);
    history.push(attempt('low', 0, 100), attempt('same', 0, 800));
    assert.equal(getArenaWeeklyStats(history, range).score, 8850);
    assert.equal(getArenaWeeklyStats(history, range).sessions, 8);
});

test('七天只採最高五天；新增較弱日仍記參賽日但不增加週分數', () => {
    const history = [800, 900, 1000, 700, 950, 500, 600].flatMap((score, day) =>
        Array.from({ length: 5 }, (_, i) => attempt(`${day}-${i}`, day, score)));
    const stats = getArenaWeeklyStats(history, range);
    assert.equal(stats.score, 43500);
    assert.equal(stats.activeDays, 7);
    assert.deepEqual(stats.selectedDays.map(day => day.score), [10000, 9500, 9000, 8000, 7000]);
});

test('一天再多滿分仍最多一萬，一週再多滿分仍最多五萬', () => {
    const history = Array.from({ length: 7 }, (_, day) => Array.from({ length: 30 }, (_, i) => attempt(`${day}-${i}`, day, 1000))).flat();
    assert.equal(getArenaWeeklyStats(history.filter(a => a.id.startsWith('0-')), range).score, 10000);
    assert.equal(getArenaWeeklyStats(history, range).score, 50000);
});

test('採計正確率每回等權，未採計回合不影響同分判定', () => {
    const history = [attempt('a', 0, 800, { correctCount: 8 }),
        attempt('b', 0, 1600, { plannedQuestions: 20, totalQuestions: 20, correctCount: 18 })];
    assert.equal(getArenaWeeklyStats(history, range).accuracy, 85);
});

test('重送場次不能重複加分或覆寫首次已保存的分數', () => {
    const first = attempt('a');
    const history = mergeArenaAttempt({}, first);
    assert.strictEqual(mergeArenaAttempt(history, { ...first, score: 1000 }), history);
    assert.equal(getArenaWeeklyStats([first, first], range).score, 1600);
});

test('依完成時間處理台北跨日與跨週，與裝置當下日期無關', () => {
    const at = time => attempt(time, 0, 800, { timestamp: time });
    const stats = getArenaWeeklyStats([
        at('2026-10-19T15:59:59.999Z'), at('2026-10-19T16:00:00.000Z'),
        at('2026-10-25T16:00:00.000Z'), at('2026-10-18T15:59:59.999Z')
    ], range);
    assert.equal(stats.activeDays, 2);
    assert.equal(stats.score, 3200);
    assert.equal(arenaDateKey(ARENA_V2_START), '2026-10-19');
    assert.deepEqual(arenaWeekRange(ARENA_V2_START + 1000), range);
});

test('所有模式包含兩種片語都使用同一個成功通關計分入口', () => {
    for (const mode of ['quiz', 'advanced', 'boss', 'challenge-quiz', 'phrase-quiz', 'phrase-challenge']) {
        const record = makeArenaAttempt({ sessionId: mode, score: 900, plannedQuestions: 10, completed: true,
            battleLog: Array.from({ length: 10 }, (_, i) => ({ isCorrect: i < 9 })) },
        { mode, completedAtMs: ARENA_V2_START + 1000 });
        assert.equal(record.arenaScore, 1800);
        assert.equal(getArenaWeeklyStats([record], range).sessions, 1);
    }
});

test('新週不猜測舊歷史的題數；舊週仍使用舊紀錄', () => {
    const data = { trialHistory: [{ score: 99999 }], arenaHistory: { a: attempt('a') } };
    assert.deepEqual(getArenaHistory(data, range), [data.arenaHistory.a]);
    assert.strictEqual(getArenaHistory(data, { startMs: ARENA_V2_START - ARENA_WEEK_MS }), data.trialHistory);
});
