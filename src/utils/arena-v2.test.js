import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_V2_START as START, ARENA_WEEK_MS as WEEK, getArenaWeeklyStats, getArenaRoundScore } from './arena-scoring.js';
import { settleArenaTier, applyArenaInactivity } from './arena-tiers.js';
import { buildSharedArenaBots, getSharedArenaBotEntry } from './arena-simulations.js';
import { buildSharedArenaEntries, sortArenaLeaderboard } from './arena-leaderboard.js';

const progress = { currentTier: 'gold', highestTier: 'diamond', activity: { anchorAt: START, processed: 0, credits: [] } };
const settle = (p = progress, opts = {}) => settleArenaTier({ progress: p, weekStart: START,
    participated: true, rank: 1, score: 30000, activeDays: 5, ...opts });

test('前兩名同時需要分數與通關天數，一天衝第一不能晉級', () => {
    assert.equal(settle().progress.currentTier, 'platinum');
    assert.equal(settle(progress, { activeDays: 1 }).progress.currentTier, 'gold');
    assert.equal(settle(progress, { score: 27000 }).progress.currentTier, 'gold');
    assert.equal(settle(progress, { rank: 3 }).progress.currentTier, 'gold');
    assert.equal(settle(progress, { rank: 7 }).progress.currentTier, 'silver');
});

test('無牌需要通關日才定級，木牌與戰神邊界正確', () => {
    assert.equal(settle({ currentTier: 'unranked' }, { activeDays: 0 }).progress.currentTier, 'unranked');
    assert.equal(settle({ currentTier: 'unranked' }, { activeDays: 1 }).progress.currentTier, 'wood');
    assert.equal(settle({ currentTier: 'wood' }, { rank: 8 }).progress.currentTier, 'wood');
    assert.equal(settle({ currentTier: 'warlord' }).progress.currentTier, 'warlord');
});

test('新制度不再因第二週沒作答額外降階；登入與通關分開', () => {
    const result = settle({ ...progress, consecutiveInactiveWeeks: 8 }, { participated: false, rank: null });
    assert.equal(result.progress.currentTier, 'gold');
});

test('未登入滿 168 小時才降階；14 天降兩階且保留歷史最高', () => {
    assert.equal(applyArenaInactivity(progress, START + WEEK - 1).currentTier, 'gold');
    assert.equal(applyArenaInactivity(progress, START + WEEK).currentTier, 'silver');
    const two = applyArenaInactivity(progress, START + 2 * WEEK);
    assert.equal(two.currentTier, 'bronze');
    assert.equal(two.highestTier, 'diamond');
    assert.deepEqual(applyArenaInactivity(two, START + 2 * WEEK), two);
    assert.equal(applyArenaInactivity(progress, START + 40 * WEEK).currentTier, 'wood');
});

test('回來先補算降階，再重設活動時間，不會洗掉缺席紀錄', () => {
    const back = applyArenaInactivity(progress, START + WEEK + 1000, { touch: true });
    assert.equal(back.currentTier, 'silver');
    assert.equal(back.activity.anchorAt, START + WEEK + 1000);
    assert.equal(applyArenaInactivity(back, START + 2 * WEEK).currentTier, 'silver');
});

test('同一缺席區間先排名降階，滿七天時抵扣一次', () => {
    const p = { ...progress, activity: { anchorAt: START + 3600000, processed: 0, credits: [] } };
    const ranked = settle(p, { rank: 8 }).progress;
    assert.equal(ranked.currentTier, 'silver');
    const due = applyArenaInactivity(ranked, START + WEEK + 3600000);
    assert.equal(due.currentTier, 'silver');
    assert.equal(applyArenaInactivity(due, START + 2 * WEEK + 3600000).currentTier, 'bronze');
});

test('同時到期先補未登入降階，不再因排名降第二次，也不立即升回去', () => {
    const due = applyArenaInactivity(progress, START + WEEK);
    assert.equal(settle(due, { rank: 8 }).progress.currentTier, 'silver');
    assert.equal(settle(due, { rank: 1, score: 50000, activeDays: 5 }).progress.currentTier, 'silver');
});

test('新規則啟用前不追罰缺席，重複週結算不重複晉級', () => {
    assert.equal(applyArenaInactivity(progress, START - 1).currentTier, 'gold');
    const first = settle();
    assert.equal(settle(first.progress).changed, false);
    assert.equal(first.settlement.tierVersion, 2);
});

test('新版 AI 使用相同換算、通關、每日五回與每週五天規則', () => {
    const bots = buildSharedArenaBots({ groupId: 'v2-test', weekStart: START, tier: 'diamond', count: 7 });
    assert.deepEqual(bots, buildSharedArenaBots({ groupId: 'v2-test', weekStart: START, tier: 'diamond', count: 7 }));
    for (const bot of bots) {
        assert.equal(bot.simulationVersion, 2);
        const stats = getSharedArenaBotEntry(bot, START + WEEK).weekly;
        assert.deepEqual(stats, getArenaWeeklyStats(bot.updates, { startMs: START, endMs: START + WEEK }));
        assert.ok(stats.score <= 50000);
        assert.ok(stats.daily.every(day => day.score <= 10000));
        for (const attempt of bot.updates) {
            assert.ok(attempt.score <= attempt.correctCount * 100);
            assert.ok(getArenaRoundScore(attempt) <= 2000);
        }
        const monday = getSharedArenaBotEntry(bot, START + 86400000).weekly.score;
        assert.ok(monday <= 10000 && monday <= stats.score);
    }
});

test('跨多組模擬驗證高牌位更強、木牌有必須跨日才能超越的對手', () => {
    const totals = { wood: [], warlord: [] };
    for (let i = 0; i < 30; i++) for (const tier of Object.keys(totals)) {
        const bots = buildSharedArenaBots({ groupId: `group-${i}`, weekStart: START, tier, count: 7 });
        const scores = bots.map(bot => getSharedArenaBotEntry(bot, START + WEEK).weekly.score);
        totals[tier].push(...scores);
        if (tier === 'wood') assert.ok(Math.max(...scores) > 10000);
    }
    const mean = a => a.reduce((sum, n) => sum + n, 0) / a.length;
    assert.ok(mean(totals.warlord) > mean(totals.wood) * 1.5);
});

test('新週不採用舊版未封頂的公開摘要；同分不靠刷場次決勝', () => {
    const entries = buildSharedArenaEntries({ group: { weekStart: START, memberIds: ['a'], simulatedRivals: [] },
        publicEntries: [{ id: 'a', weekly: { score: 999999, sessions: 100 } }] });
    assert.equal(entries[0].weekly.score, 0);
    const sorted = sortArenaLeaderboard([
        { id: 'a', weekly: { scoringVersion: 2, score: 1000, accuracy: 90, sessions: 100, activeDays: 1 } },
        { id: 'b', weekly: { scoringVersion: 2, score: 1000, accuracy: 90, sessions: 5, activeDays: 5 } }
    ]);
    assert.equal(sorted[0].id, 'b');
});
