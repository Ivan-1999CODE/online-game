import test from 'node:test';
import assert from 'node:assert/strict';
import { assertArenaLoginStateUnchanged } from './arena-login-state.js';
import { normalizeArenaTierProgress } from './arena-tiers.js';
import { mergeArenaAttempt } from './arena-scoring.js';

const player = {
    arenaTierProgress: {
        currentTier: 'wood', highestTier: 'silver',
        activity: { anchorAt: 1792339200000, processed: 0, credits: [1, 2] }
    },
    arenaHistory: {
        first: { id: 'first', score: 600, completed: true },
        second: { id: 'second', score: 800, completed: true }
    }
};
const reorderMaps = value => {
    if (Array.isArray(value)) return value.map(reorderMaps);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorderMaps(item)]));
};

test('same player data with reordered Firestore maps does not block login', () => {
    const serverRead = reorderMaps(player);
    // Reproduces the previous false positive, including nested activity fields.
    assert.notEqual(JSON.stringify(normalizeArenaTierProgress(player.arenaTierProgress)),
        JSON.stringify(normalizeArenaTierProgress(serverRead.arenaTierProgress)));
    assert.doesNotThrow(() => assertArenaLoginStateUnchanged(player, serverRead));
});

test('actual rank and history changes still stop stale settlement writes', () => {
    for (const change of [
        data => { data.arenaTierProgress.currentTier = 'gold'; },
        data => { data.arenaTierProgress.activity.anchorAt += 1; },
        data => { data.arenaHistory.first.score += 100; },
        data => { data.arenaHistory.third = { id: 'third', score: 900 }; },
        data => { delete data.arenaHistory.first; },
        data => { data.arenaTierProgress.activity.credits.reverse(); }
    ]) {
        const latest = structuredClone(player);
        change(latest);
        assert.throws(() => assertArenaLoginStateUnchanged(player, latest),
            { code: 'startup/arena-state-changed' });
    }
});

test('unrelated profile and server clock updates do not conflict with settlement', () => {
    assert.doesNotThrow(() => assertArenaLoginStateUnchanged(player,
        { ...player, arenaClock: { seconds: 123 }, studentName: 'Test player' }));
    assert.doesNotThrow(() => assertArenaLoginStateUnchanged({}, { arenaHistory: {} }));
    assert.deepEqual(normalizeArenaTierProgress(null), normalizeArenaTierProgress());
});

test('login tier normalization and history deduplication work without Object.hasOwn', () => {
    const hasOwn = Object.hasOwn;
    try {
        Object.hasOwn = undefined;
        assert.equal(normalizeArenaTierProgress({ currentTier: 'wood' }).currentTier, 'wood');
        assert.equal(normalizeArenaTierProgress({ currentTier: 'toString' }).currentTier, 'unranked');
        assert.equal(mergeArenaAttempt(player.arenaHistory, { id: 'first', score: 0 }), player.arenaHistory);
    } finally { Object.hasOwn = hasOwn; }
});
