import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ARENA_SIMULATION_PROFILES,
    ARENA_SIMULATION_VERSION,
    buildSharedArenaBots,
    fillArenaGroupForDisplay,
    maskArenaName,
    getSharedArenaBotEntry
} from './arena-simulations.js';

const WEEK_START = 1785686400000;
const WEEK_END = WEEK_START + (7 * 24 * 60 * 60 * 1000);

const build = (overrides = {}) => buildSharedArenaBots({
    groupId: '1785686400000_gold_steady_0001',
    weekStart: WEEK_START,
    tier: 'gold',
    count: 5,
    ...overrides
});

test('暱稱與真人使用相同的中間遮罩規則', () => {
    assert.equal(maskArenaName('陳彥鍾'), '陳○鍾');
    assert.equal(maskArenaName('小明'), '小○');
    assert.equal(maskArenaName('MangoBoss'), 'M○○○○○○○s');
    assert.equal(maskArenaName('陳○鍾'), '陳○鍾');
});

test('同一小組、週次與階級會產生完全相同的共享模擬玩家', () => {
    assert.deepEqual(build(), build());
});

test('不同小組會產生不同的模擬玩家資料', () => {
    assert.notDeepEqual(
        build(),
        build({ groupId: '1785686400000_gold_steady_0002' })
    );
});

test('模擬玩家數量正確且全部屬於小組階級', () => {
    const bots = build({ count: 7, tier: 'diamond' });
    assert.equal(bots.length, 7);
    assert.ok(bots.every(bot => bot.tier === 'diamond'));
    assert.ok(bots.every(bot => bot.simulationVersion === ARENA_SIMULATION_VERSION));
    assert.ok(bots.every(bot => bot.maskedName.includes('○')));
    assert.equal(new Set(bots.map(bot => bot.maskedName)).size, 7);
});

test('未鎖定的小組會在顯示時以遮罩暱稱補滿 8 席', () => {
    const group = {
        groupId: 'group-open-1',
        weekStart: WEEK_START,
        tier: 'gold',
        status: 'open',
        memberCount: 2,
        memberIds: ['a', 'b']
    };
    const displayGroup = fillArenaGroupForDisplay(group);

    assert.equal(displayGroup.simulatedRivals.length, 6);
    assert.equal(displayGroup.memberIds.length + displayGroup.simulatedRivals.length, 8);
    assert.ok(displayGroup.simulatedRivals.every(bot => bot.maskedName.includes('○')));
    assert.equal(group.simulatedRivals, undefined);
    assert.deepEqual(fillArenaGroupForDisplay(group), displayGroup);
});

test('模擬場次平均散布於整週且不超出週期', () => {
    const bots = build();
    bots.forEach(bot => {
        assert.ok(bot.updates.length >= ARENA_SIMULATION_PROFILES.gold.sessions[0]);
        assert.ok(bot.updates.every(update => update.atMs >= WEEK_START && update.atMs < WEEK_END));
        assert.deepEqual(
            bot.updates.map(update => update.atMs),
            [...bot.updates].sort((a, b) => a.atMs - b.atMs).map(update => update.atMs)
        );
    });
});

test('同一模擬玩家的分數只會隨時間增加，不讀取真人活動', () => {
    const bot = build({ count: 1 })[0];
    const monday = getSharedArenaBotEntry(bot, WEEK_START + (24 * 60 * 60 * 1000));
    const friday = getSharedArenaBotEntry(bot, WEEK_START + (5 * 24 * 60 * 60 * 1000));
    const final = getSharedArenaBotEntry(bot, WEEK_END);
    assert.ok(monday.weekly.score <= friday.weekly.score);
    assert.ok(friday.weekly.score <= final.weekly.score);
    assert.ok(monday.weekly.sessions <= friday.weekly.sessions);
    assert.ok(friday.weekly.sessions <= final.weekly.sessions);
});

test('高階模擬玩家使用更高的固定強度範圍', () => {
    assert.ok(
        ARENA_SIMULATION_PROFILES.warlord.score[0]
        > ARENA_SIMULATION_PROFILES.wood.score[0]
    );
    assert.ok(
        ARENA_SIMULATION_PROFILES.warlord.sessions[0]
        > ARENA_SIMULATION_PROFILES.wood.sessions[0]
    );
    assert.ok(
        ARENA_SIMULATION_PROFILES.warlord.accuracy[0]
        > ARENA_SIMULATION_PROFILES.wood.accuracy[0]
    );
});
