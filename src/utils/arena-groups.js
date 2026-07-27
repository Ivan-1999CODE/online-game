import { getArenaTierIndex, normalizeArenaTier } from './arena-tiers.js';

export const ARENA_GROUP_VERSION = 1;
export const ARENA_GROUP_MEMBER_LIMIT = 8;
export const ARENA_GROUP_MATCHING_WINDOW_MS = 24 * 60 * 60 * 1000;

export const getArenaActivityBand = (stats = {}, tier = 'unranked') => {
    if (normalizeArenaTier(tier) === 'unranked') return 'newcomer';

    const sessions = Math.max(0, Number(stats.sessions) || 0);
    const activeDays = Math.max(0, Number(stats.activeDays) || 0);
    if (sessions >= 7 || activeDays >= 4) return 'active';
    if (sessions >= 3 || activeDays >= 2) return 'steady';
    return 'casual';
};

export const getArenaGroupPoolId = ({ weekStart, tier, activityBand }) => (
    `${Number(weekStart)}_${normalizeArenaTier(tier)}_${activityBand}`
);

export const getArenaGroupAssignmentId = ({ weekStart, userId }) => (
    `${Number(weekStart)}_${userId}`
);

export const getArenaGroupLockAt = (weekStart) => (
    Number(weekStart) + ARENA_GROUP_MATCHING_WINDOW_MS
);

export const getArenaGroupId = ({ poolId, groupNumber }) => (
    `${poolId}_${String(groupNumber).padStart(4, '0')}`
);

const getStableHash = (value) => [...String(value)].reduce(
    (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0,
    2166136261
);

export const getLateArenaGroupId = ({ weekStart, tier, userId }) => (
    `${Number(weekStart)}_${normalizeArenaTier(tier)}_late_${getStableHash(userId).toString(36)}`
);

export const createArenaGroupMember = ({
    userId,
    maskedName,
    tier,
    activityBand,
    joinedAt
}) => ({
    userId,
    maskedName,
    tier: normalizeArenaTier(tier),
    activityBand,
    joinedAt
});

export const createArenaGroup = ({
    groupId,
    weekStart,
    tier,
    activityBand,
    member,
    createdAt,
    lateEntry = false
}) => ({
    version: ARENA_GROUP_VERSION,
    groupId,
    weekStart: Number(weekStart),
    weekEnd: Number(weekStart) + (7 * 24 * 60 * 60 * 1000),
    tier: normalizeArenaTier(tier),
    tierIndex: getArenaTierIndex(tier),
    activityBand,
    memberLimit: ARENA_GROUP_MEMBER_LIMIT,
    memberIds: [member.userId],
    members: [member],
    memberCount: 1,
    lateEntry,
    status: lateEntry ? 'locked' : 'open',
    lockAt: getArenaGroupLockAt(weekStart),
    createdAt,
    updatedAt: createdAt,
    lockedAt: lateEntry ? createdAt : null
});

export const addArenaGroupMember = (group, member, joinedAt) => {
    if (!group || !group.groupId) {
        throw new TypeError('競技小組資料不完整。');
    }
    if (group.memberIds?.includes(member.userId)) return group;
    if (group.status === 'locked') {
        throw new Error('競技小組已鎖定。');
    }
    if (normalizeArenaTier(member.tier) !== normalizeArenaTier(group.tier)) {
        throw new Error('真人玩家階級不同，不能加入同一競技小組。');
    }
    if (member.activityBand !== group.activityBand) {
        throw new Error('玩家不屬於此活躍程度分池。');
    }
    if ((Number(group.memberCount) || 0) >= ARENA_GROUP_MEMBER_LIMIT) {
        throw new Error('競技小組已額滿。');
    }

    const members = [...(group.members || []), member];
    const isFull = members.length >= ARENA_GROUP_MEMBER_LIMIT;
    return {
        ...group,
        memberIds: members.map(item => item.userId),
        members,
        memberCount: members.length,
        status: isFull ? 'locked' : 'open',
        updatedAt: joinedAt,
        lockedAt: isFull ? joinedAt : group.lockedAt
    };
};

export const lockArenaGroup = (group, lockedAt) => {
    if (!group || group.status === 'locked') return group;
    return {
        ...group,
        status: 'locked',
        updatedAt: lockedAt,
        lockedAt
    };
};
