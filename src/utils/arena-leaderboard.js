import { getSharedArenaBotEntry } from './arena-simulations.js';

const emptyWeeklyStats = () => ({
    score: 0,
    sessions: 0,
    accuracy: 0,
    hasAccuracy: false,
    activeDays: 0,
    correct: 0,
    answered: 0
});

const normalizeWeeklyStats = (weekly = {}) => ({
    score: Number(weekly.score) || 0,
    sessions: Number(weekly.sessions) || 0,
    accuracy: Number(weekly.accuracy) || 0,
    hasAccuracy: Boolean(weekly.hasAccuracy),
    activeDays: Number(weekly.activeDays) || 0,
    correct: Number(weekly.correct) || 0,
    answered: Number(weekly.answered) || 0
});

export const sortArenaLeaderboard = (entries = []) => [...entries].sort((a, b) => (
    b.weekly.score - a.weekly.score
    || b.weekly.accuracy - a.weekly.accuracy
    || b.weekly.sessions - a.weekly.sessions
    || String(a.id).localeCompare(String(b.id))
));

export const buildSharedArenaEntries = ({
    group,
    publicEntries = [],
    currentUserId,
    currentUserEntry,
    asOfMs = Date.now()
}) => {
    if (!group || !Array.isArray(group.memberIds)) return [];

    const publicById = new Map(publicEntries.map(entry => [entry.id, entry]));
    const membersById = new Map((group.members || []).map(member => [member.userId, member]));
    const realEntries = group.memberIds.map(userId => {
        const publicEntry = publicById.get(userId);
        const localFallback = userId === currentUserId ? currentUserEntry : null;
        const member = membersById.get(userId);
        const source = publicEntry || localFallback;
        return {
            id: userId,
            maskedName: source?.maskedName || member?.maskedName || '神秘勇者',
            tier: group.tier,
            weekly: source ? normalizeWeeklyStats(source.weekly) : emptyWeeklyStats()
        };
    });
    const simulatedEntries = (group.simulatedRivals || []).map(
        bot => getSharedArenaBotEntry(bot, asOfMs)
    );

    return [...realEntries, ...simulatedEntries];
};

export const getSharedArenaStanding = ({
    entries,
    userId,
    participated
}) => {
    const leaderboard = sortArenaLeaderboard(entries);
    const index = leaderboard.findIndex(entry => entry.id === userId);
    const ownEntry = index >= 0 ? leaderboard[index] : null;
    return {
        leaderboard,
        rank: participated && index >= 0 ? index + 1 : null,
        score: ownEntry?.weekly.score || 0,
        participantCount: leaderboard.length
    };
};
