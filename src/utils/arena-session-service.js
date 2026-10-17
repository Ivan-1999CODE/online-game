import { doc, setDoc, getDocFromServer, serverTimestamp, runTransaction } from 'firebase/firestore';
import { arenaWeekRange, getArenaWeeklyStats, makeArenaAttempt, isArenaV2Week, qualifyArenaSubmission } from './arena-scoring.js';
import { applyArenaInactivity, normalizeArenaTierProgress } from './arena-tiers.js';
import { maskArenaName } from './arena-simulations.js';

let clockAnchor = null;
export const arenaNow = () => clockAnchor
    ? clockAnchor.serverMs + (performance.now() - clockAnchor.monotonicMs) : Date.now();
export const hasArenaServerClock = () => Boolean(clockAnchor);

// The server timestamp is independent of changes to the device wall clock.
export const synchronizeArenaClock = async (db, userId) => {
    const ref = doc(db, 'users', userId);
    await setDoc(ref, { arenaClock: serverTimestamp() }, { merge: true });
    const snapshot = await getDocFromServer(ref);
    const serverMs = snapshot.data()?.arenaClock?.toMillis();
    if (!Number.isFinite(serverMs)) throw new Error('無法取得伺服器時間，請連線後重試。');
    clockAnchor = { serverMs, monotonicMs: performance.now() };
    return serverMs;
};

export const publicArenaSummary = (userId, data, range) => {
    const stats = getArenaWeeklyStats(Object.values(data.arenaHistory || {}), range);
    const assignment = data.weeklyArenaGroupAssignments?.[String(range.startMs)];
    return {
        userId, weekStart: range.startMs, scoringVersion: 2,
        maskedName: maskArenaName(data.studentName || '神秘勇者'),
        groupId: assignment?.groupId || null,
        tier: assignment?.tier || normalizeArenaTierProgress(data.arenaTierProgress).currentTier,
        score: stats.score, sessions: stats.sessions, activeDays: stats.activeDays,
        accuracy: stats.accuracy, hasAccuracy: stats.hasAccuracy,
        updatedAt: serverTimestamp()
    };
};

export const publishArenaSummary = async (db, userId, range) => runTransaction(db, async transaction => {
    const ref = doc(db, 'users', userId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return;
    transaction.set(doc(db, 'weeklyLeaderboard', `${range.startMs}_${userId}`), publicArenaSummary(userId, snapshot.data(), range));
});

export const saveArenaAttempt = async ({ db, userId, result, mode, unit }) => {
    if (!hasArenaServerClock()) await synchronizeArenaClock(db, userId);
    const attempt = makeArenaAttempt(result, { mode, unit, completedAtMs: result.completedAtMs });
    const range = arenaWeekRange(Date.parse(attempt.timestamp));
    const ref = doc(db, 'users', userId);
    return runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error('尚未建立玩家資料，請重新登入。');
        const data = snapshot.data();
        const history = data.arenaHistory || {};
        // An acknowledged attempt is immutable even if retried from another device.
        if (history[attempt.id]) return { history, attempt: history[attempt.id] };
        const acceptedAttempt = qualifyArenaSubmission(attempt, arenaNow());
        const next = { ...history, [attempt.id]: acceptedAttempt };
        transaction.update(ref, { arenaHistory: next });
        if (isArenaV2Week(range.startMs) && acceptedAttempt.arenaEligible !== false) {
            transaction.set(doc(db, 'weeklyLeaderboard', `${range.startMs}_${userId}`),
                publicArenaSummary(userId, { ...data, arenaHistory: next }, range));
        }
        return { history: next, attempt: acceptedAttempt };
    });
};

export const touchArenaActivity = async (db, userId) => {
    const nowMs = await synchronizeArenaClock(db, userId);
    return runTransaction(db, async transaction => {
        const ref = doc(db, 'users', userId);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) return null;
        const progress = applyArenaInactivity(snapshot.data().arenaTierProgress, nowMs, { touch: true });
        transaction.update(ref, { arenaTierProgress: progress });
        return progress;
    });
};

export const saveLearningUpdates = async (db, userId, sessionId, updates) => runTransaction(db, async transaction => {
    const ref = doc(db, 'users', userId);
    const snapshot = await transaction.get(ref);
    const completed = snapshot.data()?.savedBattleSessions || {};
    if (completed[sessionId]) return;
    transaction.update(ref, { ...updates, savedBattleSessions: { ...completed, [sessionId]: true } });
});
