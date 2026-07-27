import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ARENA_TIER_ACTIVATION_WEEK_START,
    normalizeArenaTierProgress,
    settleArenaTier
} from './arena-tiers.js';
import {
    createArenaGroup,
    createArenaGroupMember,
    getArenaActivityBand,
    getArenaGroupPoolId
} from './arena-groups.js';
import {
    buildSharedArenaBots
} from './arena-simulations.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SETTLED_AT = '2026-08-10T00:05:00.000+08:00';

const settleWeek = (progress, weekOffset, options = {}) => settleArenaTier({
    progress,
    participated: false,
    rank: null,
    weekStart: ARENA_TIER_ACTIVATION_WEEK_START + (weekOffset * WEEK_MS),
    settledAt: SETTLED_AT,
    ...options
});

test('舊資料缺欄位或格式錯誤時可安全升級，且最高排位不低於目前排位', () => {
    const migrated = normalizeArenaTierProgress({
        currentTier: 'gold',
        highestTier: 'unknown-tier',
        consecutiveInactiveWeeks: -3,
        lastSettledWeek: 'not-a-number'
    });

    assert.equal(migrated.version, 1);
    assert.equal(migrated.currentTier, 'gold');
    assert.equal(migrated.highestTier, 'gold');
    assert.equal(migrated.consecutiveInactiveWeeks, 0);
    assert.equal(migrated.lastSettledWeek, null);
});

test('多週未登入會按週依序補結算，重新參賽後清除未參賽週數且不重複結算', () => {
    const start = normalizeArenaTierProgress({
        currentTier: 'gold',
        highestTier: 'gold'
    });
    const firstMiss = settleWeek(start, 0);
    const secondMiss = settleWeek(firstMiss.progress, 1);
    const returnWeek = settleWeek(secondMiss.progress, 2, {
        participated: true,
        rank: 1
    });
    const repeated = settleWeek(returnWeek.progress, 2, {
        participated: true,
        rank: 1
    });

    assert.equal(firstMiss.progress.currentTier, 'gold');
    assert.equal(secondMiss.progress.currentTier, 'silver');
    assert.equal(returnWeek.progress.currentTier, 'gold');
    assert.equal(returnWeek.progress.consecutiveInactiveWeeks, 0);
    assert.equal(repeated.changed, false);
    assert.equal(repeated.progress.currentTier, 'gold');
});

test('上一週升降階結果會套用到新週分組，且舊週分組識別保持不變', () => {
    const oldWeekStart = ARENA_TIER_ACTIVATION_WEEK_START;
    const newWeekStart = oldWeekStart + WEEK_MS;
    const oldPoolId = getArenaGroupPoolId({
        weekStart: oldWeekStart,
        tier: 'gold',
        activityBand: 'steady'
    });
    const settlement = settleWeek({
        currentTier: 'gold',
        highestTier: 'gold'
    }, 0, {
        participated: true,
        rank: 7
    });
    const newActivityBand = getArenaActivityBand({ sessions: 3, activeDays: 2 }, settlement.progress.currentTier);
    const newPoolId = getArenaGroupPoolId({
        weekStart: newWeekStart,
        tier: settlement.progress.currentTier,
        activityBand: newActivityBand
    });

    assert.equal(settlement.progress.currentTier, 'silver');
    assert.equal(oldPoolId, `${oldWeekStart}_gold_steady`);
    assert.equal(newPoolId, `${newWeekStart}_silver_steady`);
    assert.notEqual(newPoolId, oldPoolId);
});

test('建立新週資料不會改寫已鎖定的舊週小組與模擬玩家', () => {
    const oldWeekStart = ARENA_TIER_ACTIVATION_WEEK_START;
    const oldMember = createArenaGroupMember({
        userId: 'student-a',
        maskedName: '小○明',
        tier: 'wood',
        activityBand: 'steady',
        joinedAt: '2026-08-03T08:00:00.000+08:00'
    });
    const oldGroup = createArenaGroup({
        groupId: `${oldWeekStart}_wood_steady_0001`,
        weekStart: oldWeekStart,
        tier: 'wood',
        activityBand: 'steady',
        member: oldMember,
        createdAt: '2026-08-03T08:00:00.000+08:00'
    });
    const oldBots = buildSharedArenaBots({
        groupId: oldGroup.groupId,
        weekStart: oldWeekStart,
        tier: oldGroup.tier,
        count: 7
    });
    const frozenOldWeek = structuredClone({ ...oldGroup, simulatedRivals: oldBots });

    buildSharedArenaBots({
        groupId: `${oldWeekStart + WEEK_MS}_stone_steady_0001`,
        weekStart: oldWeekStart + WEEK_MS,
        tier: 'stone',
        count: 7
    });

    assert.deepEqual({ ...oldGroup, simulatedRivals: oldBots }, frozenOldWeek);
});
