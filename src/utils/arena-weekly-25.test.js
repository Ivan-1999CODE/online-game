import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_WEEKLY_25_START as START, ARENA_V2_START, ARENA_DAY_MS as DAY, ARENA_WEEK_MS as WEEK,
    getArenaWeeklyStats, getArenaWeeklyScoringVersion, arenaWeekRange } from './arena-scoring.js';
import { publicArenaSummary } from './arena-session-service.js';
import { buildSharedArenaEntries, sortArenaLeaderboard } from './arena-leaderboard.js';
import { ARENA_V2_PROFILES, buildSharedArenaBots, getSharedArenaBotEntry } from './arena-simulations.js';

const range = arenaWeekRange(START);
const attempt = (id, day, score = 2000, extra = {}) => ({
    id, scoringVersion: 2, completed: true, score, plannedQuestions: 20, totalQuestions: 20,
    correctCount: 20, timestamp: new Date(START + day * DAY + 3600000).toISOString(), ...extra
});
const days = (counts, score = 2000) => counts.flatMap((count, day) =>
    Array.from({ length: count }, (_, index) => attempt(`${day}-${index}`, day, score)));
const counted = stats => stats.selectedDays.flatMap(day => day.selected);
const stats = history => getArenaWeeklyStats(history, range);

test('週一一場加週二至週五各五場，週六四場即可補足二十五場並保留週一', () => {
    const first = stats(days([1, 5, 5, 5, 5]));
    assert.equal(first.countedSessions, 21);
    assert.equal(first.score, 42000);
    const full = stats(days([1, 5, 5, 5, 5, 4]));
    assert.equal(full.countedSessions, 25);
    assert.equal(full.score, 50000);
    assert.equal(full.activeDays, 6);
    assert.equal(full.selectedDays.length, 6);
    assert.ok(counted(full).some(a => a.id === '0-0'));
});

test('七天零散完成二十五場可全部採計；週日可補足最後四場', () => {
    assert.equal(stats(days([1, 4, 4, 4, 4, 4])).countedSessions, 21);
    const full = stats(days([1, 4, 4, 4, 4, 4, 4]));
    assert.equal(full.countedSessions, 25);
    assert.equal(full.selectedDays.length, 7);
    assert.equal(full.activeDays, 7);
    assert.equal(full.score, 50000);
});

test('採計單場高分而非整日總分，同一天可只有部分場次進入週榜', () => {
    const history = days([5, 5, 5, 5, 5, 5], 1600).map(a => ({ ...a,
        score: a.id === '0-0' ? 2000 : a.id.startsWith('0-') ? 100 : a.id.startsWith('5-') ? 1500 : a.score }));
    const result = stats(history);
    assert.equal(result.score, 40000);
    assert.equal(result.countedSessions, 25);
    assert.equal(result.selectedDays.length, 6);
    assert.equal(result.selectedDays.find(day => day.date === '2026-11-02').selected.length, 1);
    assert.equal(result.selectedDays.find(day => day.date === '2026-11-07').selected.length, 4);
    assert.equal(result.daily.find(day => day.date === '2026-11-07').score, 7500);
    assert.equal(result.selectedDays.reduce((sum, day) => sum + day.score, 0), result.score);
});

test('週滿額後低分與同分不增加積分，高分替換但每一天仍最多五場', () => {
    const history = days([5, 5, 5, 5, 5], 1600);
    history.push(attempt('low', 5, 1400), attempt('equal', 5, 1600));
    assert.equal(stats(history).score, 40000);
    assert.equal(stats(history).activeDays, 6);
    assert.ok(!counted(stats(history)).some(a => ['low', 'equal'].includes(a.id)));
    history.push(attempt('higher', 5, 1800));
    assert.equal(stats(history).score, 40200);
    history.push(...Array.from({ length: 9 }, (_, i) => attempt(`high-${i}`, 5, 2000)));
    const result = stats(history);
    assert.equal(result.score, 42000);
    assert.equal(result.countedSessions, 25);
    assert.equal(result.selectedDays.find(day => day.date === '2026-11-07').selected.length, 5);
});

test('當日滿五場仍可提高成績；同分的新場次不換掉先完成的場次', () => {
    const history = days([5], 1600);
    history.push(attempt('00-later', 0, 1600, { timestamp: new Date(START + 7200000).toISOString() }));
    assert.ok(!counted(stats(history)).some(a => a.id === '00-later'));
    history.push(attempt('improved', 0, 1800));
    assert.equal(stats(history).score, 8200);
    assert.equal(stats(history).countedSessions, 5);
    assert.equal(stats(history).activeDays, 1);
    assert.equal(stats(days([25])).score, 10000);
    assert.equal(stats(days([30, 30, 30, 30, 30, 30, 30])).score, 50000);
});

test('通關日不因成績未入選而消失；未通關與跨週場次不增參賽日', () => {
    const history = days([5, 5, 5, 5, 5]);
    history.push(attempt('low', 5, 100), attempt('failed', 6, 100, { completed: false }),
        attempt('uncleared', 6, 100, { cleared: false }), attempt('next-week', 7));
    const result = stats(history);
    assert.equal(result.activeDays, 6);
    assert.equal(result.sessions, 26);
    assert.equal(result.countedSessions, 25);
    assert.equal(result.selectedDays.length, 5);
    assert.equal(result.score, 50000);
});

test('正確率只看入選場次且每場等權；重送與歷史順序不影響結果', () => {
    const history = days([5, 5, 5, 5, 5], 1600).map(a => ({ ...a, correctCount: 16 }));
    history.push(attempt('better', 5, 1800, { correctCount: 18 }),
        attempt('unused', 6, 100, { correctCount: 20 }));
    const result = stats(history);
    assert.equal(result.accuracy, (24 * 80 + 90) / 25);
    assert.equal(stats([...history, history[0]]).score, result.score);
    assert.deepEqual(stats([...history].reverse()), result);
});

test('新制只影響十一月二日起的週次，舊週仍採最高五天與舊版摘要', () => {
    const history = days([1, 4, 4, 4, 4, 4, 4]);
    const historicalStart = START - WEEK;
    const historical = getArenaWeeklyStats(history.map(a => ({ ...a,
        timestamp: new Date(Date.parse(a.timestamp) - WEEK).toISOString() })), arenaWeekRange(historicalStart));
    assert.equal(historical.score, 40000);
    assert.equal(historical.countedSessions, 20);
    assert.equal(historical.scoringVersion, 2);
    assert.equal(stats(history).score, 50000);
    assert.equal(stats(history).scoringVersion, 3);
    assert.equal(getArenaWeeklyScoringVersion(START - 1), 2);
    assert.equal(getArenaWeeklyScoringVersion(START), 3);
    assert.equal(getArenaWeeklyScoringVersion(ARENA_V2_START - WEEK), 1);
});

test('公開摘要使用新週版本與補場結果，榜單不混用舊版摘要且可使用自己的新紀錄', () => {
    const history = days([1, 4, 4, 4, 4, 4, 4]);
    const data = { arenaHistory: Object.fromEntries(history.map(a => [a.id, a])) };
    const summary = publicArenaSummary('me', data, range);
    assert.equal(summary.scoringVersion, 3);
    assert.equal(summary.score, 50000);
    assert.equal(summary.activeDays, 7);
    const entries = buildSharedArenaEntries({ group: { weekStart: START, memberIds: ['me', 'old', 'new'] },
        publicEntries: [{ id: 'me', weekly: { scoringVersion: 2, score: 40000 } },
            { id: 'old', weekly: { scoringVersion: 2, score: 40000 } }, { id: 'new', weekly: summary }],
        currentUserId: 'me', currentUserEntry: { id: 'me', weekly: stats(history) } });
    assert.deepEqual(entries.map(entry => entry.weekly.score), [50000, 0, 50000]);
    const sorted = sortArenaLeaderboard([
        { id: 'a', weekly: { scoringVersion: 3, score: 1000, accuracy: 90, sessions: 100, activeDays: 1 } },
        { id: 'b', weekly: { scoringVersion: 3, score: 1000, accuracy: 90, sessions: 5, activeDays: 5 } }
    ]);
    assert.equal(sorted[0].id, 'b');
});

test('九階 AI 共用每日五場與週最高二十五場，不變更模擬場次且各時間點符合上限', () => {
    for (const tier of Object.keys(ARENA_V2_PROFILES)) {
        const bots = buildSharedArenaBots({ groupId: `weekly-25-${tier}`, weekStart: START, tier, count: 7 });
        const original = structuredClone(bots);
        for (const bot of bots) {
            assert.equal(bot.simulationVersion, 3);
            let previous = 0;
            for (const update of bot.updates) {
                const result = getSharedArenaBotEntry(bot, update.atMs).weekly;
                assert.equal(result.scoringVersion, 3);
                assert.ok(result.score >= previous && result.score <= 50000);
                assert.ok(result.countedSessions <= 25);
                assert.ok(result.selectedDays.every(day => day.selected.length <= 5 && day.score <= 10000));
                previous = result.score;
            }
            const buckets = Array.from({ length: 7 }, () => []);
            for (const update of bot.updates.filter(a => a.completed)) {
                buckets[Math.floor((update.atMs - START) / DAY)].push(Math.round(update.score * 20 / update.plannedQuestions));
            }
            const expected = buckets.flatMap(scores => scores.sort((a, b) => b - a).slice(0, 5))
                .sort((a, b) => b - a).slice(0, 25).reduce((sum, score) => sum + score, 0);
            assert.equal(getSharedArenaBotEntry(bot, START + WEEK).weekly.score, expected);
        }
        assert.deepEqual(bots, original);
    }
});
