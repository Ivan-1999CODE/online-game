import { doc, getDoc, runTransaction } from 'firebase/firestore';
import {
    ARENA_GROUP_MEMBER_LIMIT,
    addArenaGroupMember,
    createArenaGroup,
    createArenaGroupMember,
    getArenaActivityBand,
    getArenaGroupAssignmentId,
    getArenaGroupId,
    getArenaGroupLockAt,
    getArenaGroupPoolId,
    getLateArenaGroupId,
    lockArenaGroup
} from './arena-groups.js';
import { normalizeArenaTier } from './arena-tiers.js';
import {
    ARENA_SIMULATION_VERSION,
    buildSharedArenaBots
} from './arena-simulations.js';

const GROUPS_COLLECTION = 'weeklyArenaGroups';
const POOLS_COLLECTION = 'weeklyArenaGroupPools';
const ASSIGNMENTS_COLLECTION = 'weeklyArenaAssignments';

const toIsoString = (value) => new Date(value).toISOString();

const createAssignment = ({
    userId,
    weekStart,
    tier,
    activityBand,
    groupId,
    assignedAt,
    lateEntry
}) => ({
    version: 1,
    userId,
    weekStart: Number(weekStart),
    tier,
    activityBand,
    groupId,
    assignedAt,
    lateEntry
});

export const assignWeeklyArenaGroup = async ({
    db,
    userId,
    maskedName,
    weekStart,
    tier,
    activityStats,
    nowMs = Date.now()
}) => {
    if (!db || !userId) throw new TypeError('建立競技小組需要 db 與 userId。');

    const normalizedTier = normalizeArenaTier(tier);
    const activityBand = getArenaActivityBand(activityStats, normalizedTier);
    const assignmentId = getArenaGroupAssignmentId({ weekStart, userId });
    const assignmentRef = doc(db, ASSIGNMENTS_COLLECTION, assignmentId);
    const assignedAt = toIsoString(nowMs);
    const member = createArenaGroupMember({
        userId,
        maskedName,
        tier: normalizedTier,
        activityBand,
        joinedAt: assignedAt
    });
    const lateEntry = Number(nowMs) >= getArenaGroupLockAt(weekStart);

    return runTransaction(db, async transaction => {
        const assignmentSnapshot = await transaction.get(assignmentRef);
        if (assignmentSnapshot.exists()) {
            const existingAssignment = assignmentSnapshot.data();
            const existingGroupRef = doc(db, GROUPS_COLLECTION, existingAssignment.groupId);
            const existingGroupSnapshot = await transaction.get(existingGroupRef);
            if (
                existingGroupSnapshot.exists()
                && existingGroupSnapshot.data().status !== 'locked'
                && Number(nowMs) >= Number(existingGroupSnapshot.data().lockAt)
            ) {
                transaction.set(
                    existingGroupRef,
                    lockArenaGroup(existingGroupSnapshot.data(), assignedAt),
                    { merge: true }
                );
            }
            return existingAssignment;
        }

        if (lateEntry) {
            const groupId = getLateArenaGroupId({ weekStart, tier: normalizedTier, userId });
            const groupRef = doc(db, GROUPS_COLLECTION, groupId);
            const groupSnapshot = await transaction.get(groupRef);
            if (!groupSnapshot.exists()) {
                transaction.set(groupRef, createArenaGroup({
                    groupId,
                    weekStart,
                    tier: normalizedTier,
                    activityBand,
                    member,
                    createdAt: assignedAt,
                    lateEntry: true
                }));
            }
            const assignment = createAssignment({
                userId,
                weekStart,
                tier: normalizedTier,
                activityBand,
                groupId,
                assignedAt,
                lateEntry: true
            });
            transaction.set(assignmentRef, assignment);
            return assignment;
        }

        const poolId = getArenaGroupPoolId({
            weekStart,
            tier: normalizedTier,
            activityBand
        });
        const poolRef = doc(db, POOLS_COLLECTION, poolId);
        const poolSnapshot = await transaction.get(poolRef);
        let groupNumber = Math.max(1, Number(poolSnapshot.data()?.currentGroupNumber) || 1);
        let groupId = getArenaGroupId({ poolId, groupNumber });
        let groupRef = doc(db, GROUPS_COLLECTION, groupId);
        let groupSnapshot = await transaction.get(groupRef);
        let group = groupSnapshot.exists() ? groupSnapshot.data() : null;

        // pool 指標若因舊資料停在已滿小組，安全前進到下一組。
        if (
            group
            && (
                group.status === 'locked'
                || (Number(group.memberCount) || 0) >= ARENA_GROUP_MEMBER_LIMIT
            )
        ) {
            groupNumber += 1;
            groupId = getArenaGroupId({ poolId, groupNumber });
            groupRef = doc(db, GROUPS_COLLECTION, groupId);
            groupSnapshot = await transaction.get(groupRef);
            group = groupSnapshot.exists() ? groupSnapshot.data() : null;
        }

        const nextGroup = group
            ? addArenaGroupMember(group, member, assignedAt)
            : createArenaGroup({
                groupId,
                weekStart,
                tier: normalizedTier,
                activityBand,
                member,
                createdAt: assignedAt
            });
        const isFull = nextGroup.memberCount >= ARENA_GROUP_MEMBER_LIMIT;
        const nextPoolGroupNumber = isFull ? groupNumber + 1 : groupNumber;
        const assignment = createAssignment({
            userId,
            weekStart,
            tier: normalizedTier,
            activityBand,
            groupId,
            assignedAt,
            lateEntry: false
        });

        transaction.set(groupRef, nextGroup);
        transaction.set(poolRef, {
            version: 1,
            poolId,
            weekStart: Number(weekStart),
            tier: normalizedTier,
            activityBand,
            currentGroupNumber: nextPoolGroupNumber,
            currentGroupId: isFull
                ? getArenaGroupId({ poolId, groupNumber: nextPoolGroupNumber })
                : groupId,
            updatedAt: assignedAt
        }, { merge: true });
        transaction.set(assignmentRef, assignment);
        return assignment;
    });
};

export const ensureWeeklyArenaGroupSimulation = async ({
    db,
    groupId,
    nowMs = Date.now()
}) => {
    if (!db || !groupId) throw new TypeError('建立共享模擬玩家需要 db 與 groupId。');

    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const finalizedAt = toIsoString(nowMs);
    return runTransaction(db, async transaction => {
        const groupSnapshot = await transaction.get(groupRef);
        if (!groupSnapshot.exists()) {
            throw new Error('找不到指定的競技小組。');
        }

        const group = groupSnapshot.data();
        if ((Number(group.simulationVersion) || 0) >= ARENA_SIMULATION_VERSION) {
            return group;
        }

        const memberCount = Math.max(
            Number(group.memberCount) || 0,
            Array.isArray(group.memberIds) ? group.memberIds.length : 0
        );
        const canFinalize = group.status === 'locked'
            || memberCount >= ARENA_GROUP_MEMBER_LIMIT
            || Number(nowMs) >= Number(group.lockAt);
        if (!canFinalize) return group;

        const lockedGroup = lockArenaGroup(group, group.lockedAt || finalizedAt);
        const simulatedRivals = buildSharedArenaBots({
            groupId: group.groupId,
            weekStart: group.weekStart,
            tier: group.tier,
            count: Math.max(0, ARENA_GROUP_MEMBER_LIMIT - memberCount)
        });
        const finalizedGroup = {
            ...lockedGroup,
            simulationVersion: ARENA_SIMULATION_VERSION,
            simulationStatus: 'ready',
            simulatedMemberCount: simulatedRivals.length,
            simulatedRivals,
            simulationCreatedAt: finalizedAt,
            updatedAt: finalizedAt
        };
        transaction.set(groupRef, finalizedGroup);
        return finalizedGroup;
    });
};

export const fetchWeeklyArenaGroup = async ({ db, groupId }) => {
    if (!db || !groupId) return null;
    const snapshot = await getDoc(doc(db, GROUPS_COLLECTION, groupId));
    return snapshot.exists() ? snapshot.data() : null;
};
