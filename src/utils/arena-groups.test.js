import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ARENA_GROUP_MEMBER_LIMIT,
    addArenaGroupMember,
    createArenaGroup,
    createArenaGroupMember,
    getArenaActivityBand,
    getArenaGroupId,
    getArenaGroupLockAt,
    getArenaGroupPoolId,
    getLateArenaGroupId,
    lockArenaGroup
} from './arena-groups.js';

const WEEK_START = 1785686400000;
const CREATED_AT = '2026-08-03T00:00:00.000+08:00';

const member = (index, overrides = {}) => createArenaGroupMember({
    userId: `user-${index}`,
    maskedName: `勇者 ${index}`,
    tier: 'gold',
    activityBand: 'steady',
    joinedAt: CREATED_AT,
    ...overrides
});

test('階級是配對硬條件，活躍程度是同階級內第二層分池', () => {
    assert.equal(getArenaActivityBand({ sessions: 99, activeDays: 7 }, 'unranked'), 'newcomer');
    assert.equal(getArenaActivityBand({ sessions: 1, activeDays: 1 }, 'gold'), 'casual');
    assert.equal(getArenaActivityBand({ sessions: 3, activeDays: 2 }, 'gold'), 'steady');
    assert.equal(getArenaActivityBand({ sessions: 7, activeDays: 4 }, 'gold'), 'active');

    const goldPool = getArenaGroupPoolId({
        weekStart: WEEK_START,
        tier: 'gold',
        activityBand: 'steady'
    });
    const silverPool = getArenaGroupPoolId({
        weekStart: WEEK_START,
        tier: 'silver',
        activityBand: 'steady'
    });
    assert.notEqual(goldPool, silverPool);
});

test('共同小組 ID 對相同週次、階級、分池與序號保持一致', () => {
    const poolId = getArenaGroupPoolId({
        weekStart: WEEK_START,
        tier: 'gold',
        activityBand: 'steady'
    });
    assert.equal(
        getArenaGroupId({ poolId, groupNumber: 2 }),
        `${WEEK_START}_gold_steady_0002`
    );
});

test('不同階級或不同活躍分池不能加入同一小組', () => {
    const group = createArenaGroup({
        groupId: 'group-1',
        weekStart: WEEK_START,
        tier: 'gold',
        activityBand: 'steady',
        member: member(1),
        createdAt: CREATED_AT
    });
    assert.throws(
        () => addArenaGroupMember(group, member(2, { tier: 'silver' }), CREATED_AT),
        /階級不同/
    );
    assert.throws(
        () => addArenaGroupMember(group, member(2, { activityBand: 'active' }), CREATED_AT),
        /活躍程度分池/
    );
});

test('同一真人重複加入不會占用第二個席位', () => {
    const firstMember = member(1);
    const group = createArenaGroup({
        groupId: 'group-1',
        weekStart: WEEK_START,
        tier: 'gold',
        activityBand: 'steady',
        member: firstMember,
        createdAt: CREATED_AT
    });
    const repeated = addArenaGroupMember(group, firstMember, CREATED_AT);
    assert.equal(repeated.memberCount, 1);
    assert.deepEqual(repeated.memberIds, ['user-1']);
});

test('第 8 位真人加入時，小組立即鎖定', () => {
    let group = createArenaGroup({
        groupId: 'group-1',
        weekStart: WEEK_START,
        tier: 'gold',
        activityBand: 'steady',
        member: member(1),
        createdAt: CREATED_AT
    });
    for (let index = 2; index <= ARENA_GROUP_MEMBER_LIMIT; index += 1) {
        group = addArenaGroupMember(group, member(index), CREATED_AT);
    }
    assert.equal(group.memberCount, 8);
    assert.equal(group.status, 'locked');
    assert.throws(
        () => addArenaGroupMember(group, member(9), CREATED_AT),
        /已鎖定/
    );
});

test('未滿小組可在配對窗口結束時鎖定', () => {
    const group = createArenaGroup({
        groupId: 'group-1',
        weekStart: WEEK_START,
        tier: 'gold',
        activityBand: 'steady',
        member: member(1),
        createdAt: CREATED_AT
    });
    const locked = lockArenaGroup(group, '2026-08-04T00:00:00.000+08:00');
    assert.equal(getArenaGroupLockAt(WEEK_START), WEEK_START + (24 * 60 * 60 * 1000));
    assert.equal(locked.status, 'locked');
    assert.equal(locked.memberCount, 1);
});

test('晚加入小組 ID 對同一玩家保持穩定，且不和其他玩家混用', () => {
    const first = getLateArenaGroupId({ weekStart: WEEK_START, tier: 'gold', userId: 'user-1' });
    const repeated = getLateArenaGroupId({ weekStart: WEEK_START, tier: 'gold', userId: 'user-1' });
    const other = getLateArenaGroupId({ weekStart: WEEK_START, tier: 'gold', userId: 'user-2' });
    assert.equal(first, repeated);
    assert.notEqual(first, other);
});
