import test from 'node:test';
import assert from 'node:assert/strict';

import {
    BATTLE_PAUSE_FLOOR_SECONDS,
    getBattleTimerSnapshot
} from './battle-timer.js';

test('uses the real deadline to calculate the remaining time', () => {
    const snapshot = getBattleTimerSnapshot({
        deadlineMs: 10_000,
        nowMs: 7_500
    });

    assert.equal(snapshot.expired, false);
    assert.equal(snapshot.secondsLeft, 2.5);
});

test('reaches zero normally after the deadline', () => {
    const snapshot = getBattleTimerSnapshot({
        deadlineMs: 10_000,
        nowMs: 10_000
    });

    assert.equal(snapshot.expired, true);
    assert.equal(snapshot.secondsLeft, 0);
});

test('holds an expired paused question at 0.1 seconds', () => {
    const snapshot = getBattleTimerSnapshot({
        deadlineMs: 10_000,
        nowMs: 15_000,
        isPauseOpen: true
    });

    assert.equal(snapshot.expired, true);
    assert.equal(snapshot.secondsLeft, BATTLE_PAUSE_FLOOR_SECONDS);
});

test('never displays less than 0.1 seconds while paused', () => {
    const snapshot = getBattleTimerSnapshot({
        deadlineMs: 10_000,
        nowMs: 9_950,
        isPauseOpen: true
    });

    assert.equal(snapshot.expired, false);
    assert.equal(snapshot.secondsLeft, BATTLE_PAUSE_FLOOR_SECONDS);
});
