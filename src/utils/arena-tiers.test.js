import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ARENA_TIER_ACTIVATION_WEEK_START,
    ARENA_TIERS,
    createDefaultArenaTierProgress,
    normalizeArenaTierProgress,
    settleArenaTier
} from './arena-tiers.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SETTLED_AT = '2026-08-10T00:05:00.000+08:00';

const settle = (progress, options = {}) => settleArenaTier({
    progress,
    participated: true,
    rank: 4,
    weekStart: ARENA_TIER_ACTIVATION_WEEK_START,
    settledAt: SETTLED_AT,
    ...options
});

test('定義無牌到戰神共 9 個階級', () => {
    assert.deepEqual(
        ARENA_TIERS.map(tier => tier.id),
        ['unranked', 'wood', 'stone', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'warlord']
    );
    assert.ok(ARENA_TIERS.every(tier => tier.badge && tier.frame && tier.colors?.primary));
});

test('舊玩家缺少資料時安全視為無牌', () => {
    assert.deepEqual(normalizeArenaTierProgress(), createDefaultArenaTierProgress());
    assert.deepEqual(
        normalizeArenaTierProgress({ highestTierWeekStart: null, lastSettledWeek: null }),
        createDefaultArenaTierProgress()
    );
});

test('階級制度從 2026-08-03 台北時間的完整週一開始', () => {
    assert.equal(
        new Date(ARENA_TIER_ACTIVATION_WEEK_START).toISOString(),
        '2026-08-02T16:00:00.000Z'
    );
});

test('無牌玩家首次參賽後定級為木牌', () => {
    const result = settle(createDefaultArenaTierProgress(), { rank: 1 });
    assert.equal(result.progress.currentTier, 'wood');
    assert.equal(result.progress.highestTier, 'wood');
    assert.equal(result.settlement.tierOutcome, 'placement');
    assert.equal(result.progress.highestTierReachedAt, SETTLED_AT);
});

test('正式階級前 2 名升階、第 3 到 6 名維持、後 2 名降階', () => {
    const silver = { currentTier: 'silver', highestTier: 'silver' };
    assert.equal(settle(silver, { rank: 2 }).progress.currentTier, 'gold');
    assert.equal(settle(silver, { rank: 3 }).progress.currentTier, 'silver');
    assert.equal(settle(silver, { rank: 6 }).progress.currentTier, 'silver');
    assert.equal(settle(silver, { rank: 7 }).progress.currentTier, 'bronze');
});

test('木牌不會降回無牌，戰神不會繼續升階', () => {
    const woodResult = settle({ currentTier: 'wood', highestTier: 'wood' }, { rank: 8 });
    const warlordResult = settle({ currentTier: 'warlord', highestTier: 'warlord' }, { rank: 1 });
    assert.equal(woodResult.progress.currentTier, 'wood');
    assert.equal(warlordResult.progress.currentTier, 'warlord');
    assert.equal(warlordResult.settlement.tierOutcome, 'maintained');
});

test('戰神後 2 名會正確降為鑽石', () => {
    const result = settle(
        { currentTier: 'warlord', highestTier: 'warlord' },
        { rank: 7 }
    );
    assert.equal(result.progress.currentTier, 'diamond');
    assert.equal(result.settlement.tierOutcome, 'demoted');
});

test('第一次未參賽維持，連續第二週起每週降一階', () => {
    const firstMiss = settle(
        { currentTier: 'gold', highestTier: 'gold' },
        { participated: false, rank: null }
    );
    assert.equal(firstMiss.progress.currentTier, 'gold');
    assert.equal(firstMiss.settlement.tierOutcome, 'inactive-hold');

    const secondMiss = settleArenaTier({
        progress: firstMiss.progress,
        participated: false,
        rank: null,
        weekStart: ARENA_TIER_ACTIVATION_WEEK_START + WEEK_MS,
        settledAt: SETTLED_AT
    });
    assert.equal(secondMiss.progress.currentTier, 'silver');
    assert.equal(secondMiss.settlement.tierOutcome, 'inactive-demoted');

    const thirdMiss = settleArenaTier({
        progress: secondMiss.progress,
        participated: false,
        rank: null,
        weekStart: ARENA_TIER_ACTIVATION_WEEK_START + (2 * WEEK_MS),
        settledAt: SETTLED_AT
    });
    assert.equal(thirdMiss.progress.currentTier, 'bronze');
});

test('重新參賽會清除連續未參賽週數', () => {
    const result = settle({
        currentTier: 'silver',
        highestTier: 'gold',
        consecutiveInactiveWeeks: 3
    });
    assert.equal(result.progress.consecutiveInactiveWeeks, 0);
});

test('降階不會降低歷史最高排位或覆蓋首次達成時間', () => {
    const result = settle({
        currentTier: 'gold',
        highestTier: 'diamond',
        highestTierReachedAt: '2026-06-01T00:00:00.000+08:00',
        highestTierWeekStart: 123
    }, { rank: 8 });
    assert.equal(result.progress.currentTier, 'silver');
    assert.equal(result.progress.highestTier, 'diamond');
    assert.equal(result.progress.highestTierReachedAt, '2026-06-01T00:00:00.000+08:00');
    assert.equal(result.progress.highestTierWeekStart, 123);
});

test('同一週重複結算不會再次升階', () => {
    const first = settle({ currentTier: 'silver', highestTier: 'silver' }, { rank: 1 });
    const repeated = settleArenaTier({
        progress: first.progress,
        participated: true,
        rank: 1,
        weekStart: ARENA_TIER_ACTIVATION_WEEK_START,
        settledAt: SETTLED_AT
    });
    assert.equal(repeated.changed, false);
    assert.equal(repeated.progress.currentTier, 'gold');
    assert.equal(repeated.settlement.tierOutcome, 'already-settled');
});
