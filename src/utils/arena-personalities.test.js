import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ARENA_PERSONALITY_START as START, ARENA_V3_PROFILES, buildSharedArenaBots,
    fillArenaGroupForDisplay, getSharedArenaBotEntry, getArenaSimulationVersion,
    shouldKeepArenaSimulation } from './arena-simulations.js';
import { ARENA_WEEK_MS as WEEK, isArenaClear, getArenaWeeklyStats, arenaWeekRange } from './arena-scoring.js';
import { buildSharedArenaEntries } from './arena-leaderboard.js';

const build = (overrides = {}) => buildSharedArenaBots({
    groupId: 'personality-fixture', weekStart: START, tier: 'platinum', count: 7, ...overrides
});
const roleCounts = bots => bots.reduce((counts, bot) => {
    counts[bot.role]++;
    return counts;
}, { strong: 0, steady: 0, light: 0 });
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test('至少三位 AI 時保證三種角色；其餘隨機且整組最多兩位強敵', () => {
    const compositions = new Set();
    const firstRoles = new Set();
    for (let index = 0; index < 100; index++) {
        const options = { groupId: `roles-${index}`, weekStart: START + (index % 4) * WEEK };
        const complete = build({ ...options, count: 8 });
        for (let count = 0; count <= 8; count++) {
            const bots = build({ ...options, count });
            assert.equal(bots.length, count);
            assert.deepEqual(bots, complete.slice(0, count));
            const roles = roleCounts(bots);
            assert.ok(roles.strong <= 2);
            if (count >= 3) assert.ok(roles.strong >= 1 && roles.steady >= 1 && roles.light >= 1);
        }
        firstRoles.add(complete[0].role);
        compositions.add(JSON.stringify(roleCounts(complete.slice(0, 7))));
    }
    assert.equal(firstRoles.size, 3);
    assert.ok(compositions.size >= 8, `Only ${compositions.size} group compositions`);
});

test('額外席位依 20／50／30 抽取；強敵滿額後只從穩定與輕量依比例抽取', () => {
    const beforeCap = { strong: 0, steady: 0, light: 0 };
    const afterCap = { strong: 0, steady: 0, light: 0 };
    for (let index = 0; index < 1000; index++) {
        let strongCount = 1;
        for (const bot of build({ groupId: `weights-${index}` }).slice(3)) {
            (strongCount === 2 ? afterCap : beforeCap)[bot.role]++;
            if (bot.role === 'strong') strongCount++;
        }
    }
    const totalBefore = Object.values(beforeCap).reduce((a, b) => a + b, 0);
    for (const [role, expected] of Object.entries({ strong: 0.2, steady: 0.5, light: 0.3 })) {
        assert.ok(Math.abs(beforeCap[role] / totalBefore - expected) < 0.035);
    }
    assert.equal(afterCap.strong, 0);
    assert.ok(Math.abs(afterCap.steady / (afterCap.steady + afterCap.light) - 0.625) < 0.04);
});

test('整週對手固定，同組觀看者看到相同榜單；不同週次或小組會重抽', () => {
    const bots = build();
    assert.deepEqual(build(), bots);
    assert.notDeepEqual(build({ weekStart: START + WEEK }), bots);
    assert.notDeepEqual(build({ groupId: 'another-group' }), bots);
    const group = { weekStart: START, memberIds: ['a'], tier: 'platinum', simulatedRivals: bots };
    const a = buildSharedArenaEntries({ group, currentUserId: 'a', asOfMs: START + WEEK });
    const b = buildSharedArenaEntries({ group, currentUserId: 'b', asOfMs: START + WEEK });
    assert.deepEqual(a, b);
    assert.equal(new Set(bots.map(bot => bot.maskedName)).size, bots.length);
});

test('同類型有不同能力、練習方式與出席安排，不保證強敵永遠第一', () => {
    const samples = Array.from({ length: 100 }, (_, i) => build({ groupId: `styles-${i}` })).flat();
    for (const role of ['strong', 'steady', 'light']) {
        const selected = samples.filter(bot => bot.role === role);
        assert.equal(new Set(selected.map(bot => bot.persona)).size, 4);
        assert.ok(new Set(selected.map(bot => bot.baselineScore)).size > 30);
        assert.ok(new Set(selected.map(bot => bot.updates.length)).size >= 4);
        assert.ok(new Set(selected.map(bot => bot.activityDays.join(','))).size > 10);
        assert.equal(new Set(selected.map(bot => bot.weekendFocus)).size, 2);
    }
    // Ability ranges overlap naturally; there is no post-hoc ranking correction.
    const scores = role => samples.filter(bot => bot.role === role)
        .map(bot => getSharedArenaBotEntry(bot, START + WEEK).weekly.score);
    assert.ok(Math.max(...scores('steady')) > Math.min(...scores('strong')));
});

test('九階各類型中位數隨階級上升，同階強弱有實質差距', () => {
    let previous = { light: 0, steady: 0, strong: 0 };
    for (const tier of Object.keys(ARENA_V3_PROFILES)) {
        const roles = { light: [], steady: [], strong: [] };
        for (let i = 0; i < 100; i++) for (const bot of build({ tier, groupId: `balance-${i}` })) {
            const [minCount, maxCount] = ARENA_V3_PROFILES[tier][bot.role];
            assert.ok(bot.updates.length >= minCount && bot.updates.length <= maxCount);
            roles[bot.role].push(getSharedArenaBotEntry(bot, START + WEEK).weekly.score);
        }
        const current = Object.fromEntries(Object.entries(roles).map(([role, scores]) => [role, median(scores)]));
        assert.ok(current.strong > current.steady + 2000, tier);
        assert.ok(current.steady > current.light + 2000, tier);
        for (const role of Object.keys(roles)) assert.ok(current[role] > previous[role], `${tier}/${role}`);
        if (tier === 'platinum') {
            assert.ok(current.light >= 23000 && current.light <= 31000);
            assert.ok(current.steady >= 31000 && current.steady <= 39000);
            assert.ok(current.strong >= 39000 && current.strong <= 46000);
        }
        previous = current;
    }
});

test('每場成績有效且只能在排定時間出現，失敗不加分，沿用每日五場和週二十五場上限', () => {
    let failures = 0;
    for (const tier of Object.keys(ARENA_V3_PROFILES)) {
        for (const bot of build({ tier })) {
            assert.equal(getSharedArenaBotEntry(bot, START - 1).weekly.score, 0);
            let previousScore = 0;
            const ids = new Set();
            const buckets = Array.from({ length: 7 }, () => []);
            for (const update of bot.updates) {
                assert.ok(update.atMs >= START && update.atMs < START + WEEK);
                assert.equal(Date.parse(update.timestamp), update.atMs);
                assert.ok(!ids.has(update.id));
                ids.add(update.id);
                assert.ok(update.correctCount >= 0 && update.correctCount <= update.totalQuestions);
                assert.ok(update.score >= 0 && update.score <= update.correctCount * 100);
                assert.equal(isArenaClear(update), update.completed);
                const before = getSharedArenaBotEntry(bot, update.atMs - 1).weekly;
                const after = getSharedArenaBotEntry(bot, update.atMs).weekly;
                assert.equal(before.score, previousScore);
                assert.ok(after.score >= before.score && after.score - before.score <= 2000);
                assert.ok(after.score <= 50000 && after.countedSessions <= 25);
                assert.ok(after.selectedDays.every(day => day.score <= 10000 && day.selected.length <= 5));
                if (!update.completed) {
                    failures++;
                    assert.equal(after.score, before.score);
                    assert.equal(after.activeDays, before.activeDays);
                    assert.equal(after.sessions, before.sessions);
                } else {
                    buckets[Math.floor((update.atMs - START) / 86400000)]
                        .push(Math.round(update.score * 20 / update.plannedQuestions));
                }
                previousScore = after.score;
            }
            const expected = buckets.flatMap(values => values.sort((a, b) => b - a).slice(0, 5))
                .sort((a, b) => b - a).slice(0, 25).reduce((sum, value) => sum + value, 0);
            const result = getSharedArenaBotEntry(bot, START + WEEK).weekly;
            assert.equal(result.score, expected);
            assert.deepEqual(result, getArenaWeeklyStats(bot.updates, arenaWeekRange(START)));
        }
    }
    assert.ok(failures > 0);
});

test('舊週 AI 產生結果完全保留，既存當週名單也不因版本升級而被重抽', () => {
    for (const [weekStart, digest] of [
        [1785686400000, 'bb94fa61d82de24ac3972278dd3e7ced7574c02e4e2ca3375c9bec7be039c37f'],
        [1792944000000, '5f9778c4b1fdaf9ebc8502facb785beb228ce6a817a0ea6fd81ea4f37fc167e6']
    ]) {
        const bots = build({ groupId: 'historical-fixture', weekStart });
        assert.equal(createHash('sha256').update(JSON.stringify(bots)).digest('hex'), digest);
    }
    assert.equal(getArenaSimulationVersion(START - 1), 2);
    assert.equal(getArenaSimulationVersion(START), 3);
    const stored = { weekStart: START, status: 'locked', simulationVersion: 2,
        simulatedRivals: build({ weekStart: START - WEEK }) };
    assert.equal(shouldKeepArenaSimulation(stored), true);
    assert.strictEqual(fillArenaGroupForDisplay(stored), stored);
    assert.equal(shouldKeepArenaSimulation({ weekStart: START, simulationVersion: 2,
        simulationStatus: 'ready', simulatedRivals: [] }), true);
    assert.equal(shouldKeepArenaSimulation({ weekStart: START, simulatedRivals: [] }), false);
    assert.equal(shouldKeepArenaSimulation({ weekStart: START }), false);
});

test('配對中的 AI 預覽與正式生成一致，真人增加只減少 AI 席位，不改剩餘對手', () => {
    const group = { groupId: 'preview-fixture', weekStart: START, tier: 'platinum',
        status: 'open', memberCount: 1, memberIds: ['a'] };
    const preview = fillArenaGroupForDisplay(group);
    const filled = fillArenaGroupForDisplay({ ...group, memberCount: 2, memberIds: ['a', 'b'] });
    assert.deepEqual(filled.simulatedRivals, preview.simulatedRivals.slice(0, 6));
    assert.deepEqual(preview.simulatedRivals, build({ groupId: group.groupId }));
    assert.deepEqual(group.memberIds, ['a']);
});
