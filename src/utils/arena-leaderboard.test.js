import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildSharedArenaEntries,
    getSharedArenaStanding,
    sortArenaLeaderboard
} from './arena-leaderboard.js';
import { buildSharedArenaBots } from './arena-simulations.js';

const WEEK_START = 1785686400000;
const WEEK_END = WEEK_START + (7 * 24 * 60 * 60 * 1000);
const group = {
    groupId: 'group-1',
    weekStart: WEEK_START,
    tier: 'gold',
    memberIds: ['a', 'b'],
    members: [
        { userId: 'a', maskedName: 'A○' },
        { userId: 'b', maskedName: 'B○' }
    ],
    simulatedRivals: buildSharedArenaBots({
        groupId: 'group-1',
        weekStart: WEEK_START,
        tier: 'gold',
        count: 2
    })
};
const publicEntries = [
    {
        id: 'a',
        maskedName: 'A○',
        weekly: { score: 2000, sessions: 2, accuracy: 80, hasAccuracy: true, activeDays: 2 }
    },
    {
        id: 'b',
        maskedName: 'B○',
        weekly: { score: 3000, sessions: 3, accuracy: 85, hasAccuracy: true, activeDays: 3 }
    }
];

test('同組玩家不論觀看者是誰，都建立相同成員與分數', () => {
    const forA = buildSharedArenaEntries({
        group,
        publicEntries,
        currentUserId: 'a',
        asOfMs: WEEK_END
    });
    const forB = buildSharedArenaEntries({
        group,
        publicEntries,
        currentUserId: 'b',
        asOfMs: WEEK_END
    });
    assert.deepEqual(forA, forB);
});

test('共同榜單包含固定真人與共享模擬玩家', () => {
    const entries = buildSharedArenaEntries({
        group,
        publicEntries,
        currentUserId: 'a',
        asOfMs: WEEK_END
    });
    assert.equal(entries.length, 4);
    assert.deepEqual(entries.slice(0, 2).map(entry => entry.id), ['a', 'b']);
    assert.ok(entries.slice(2).every(entry => entry.simulated));
});

test('真人尚未產生公開成績時仍保留固定席位並顯示 0 分', () => {
    const entries = buildSharedArenaEntries({
        group,
        publicEntries: publicEntries.filter(entry => entry.id !== 'b'),
        currentUserId: 'a',
        asOfMs: WEEK_END
    });
    const missing = entries.find(entry => entry.id === 'b');
    assert.equal(missing.maskedName, 'B○');
    assert.equal(missing.weekly.score, 0);
});

test('排序依分數、正確率、場次及固定 ID 依序判定', () => {
    const sorted = sortArenaLeaderboard([
        { id: 'd', weekly: { score: 100, accuracy: 80, sessions: 2 } },
        { id: 'c', weekly: { score: 100, accuracy: 80, sessions: 3 } },
        { id: 'b', weekly: { score: 100, accuracy: 90, sessions: 1 } },
        { id: 'a', weekly: { score: 200, accuracy: 10, sessions: 1 } }
    ]);
    assert.deepEqual(sorted.map(entry => entry.id), ['a', 'b', 'c', 'd']);
});

test('顯示與結算使用同一榜單計算名次', () => {
    const entries = buildSharedArenaEntries({
        group: { ...group, simulatedRivals: [] },
        publicEntries,
        currentUserId: 'a',
        asOfMs: WEEK_END
    });
    const standing = getSharedArenaStanding({
        entries,
        userId: 'a',
        participated: true
    });
    assert.deepEqual(standing.leaderboard.map(entry => entry.id), ['b', 'a']);
    assert.equal(standing.rank, 2);
    assert.equal(standing.score, 2000);
    assert.equal(standing.participantCount, 2);
});

test('未參賽者保留席位但不產生結算名次', () => {
    const entries = buildSharedArenaEntries({
        group: { ...group, simulatedRivals: [] },
        publicEntries,
        currentUserId: 'a',
        asOfMs: WEEK_END
    });
    const standing = getSharedArenaStanding({
        entries,
        userId: 'a',
        participated: false
    });
    assert.equal(standing.rank, null);
});
