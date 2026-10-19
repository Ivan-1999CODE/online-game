// A complete Taipei week is the migration boundary. Old results are never re-scored.
export const ARENA_V2_START = Date.parse('2026-10-19T00:00:00+08:00');
export const ARENA_SCORING_VERSION = 2;
export const ARENA_DAY_MS = 86400000;
export const ARENA_WEEK_MS = 7 * ARENA_DAY_MS;
export const isArenaV2Week = weekStart => Number(weekStart) >= ARENA_V2_START;
export const arenaDateKey = ms => new Date(Number(ms) + 8 * 3600000).toISOString().slice(0, 10);
export const arenaWeekRange = ms => {
    const local = new Date(Number(ms) + 8 * 3600000);
    const startMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()
        - (local.getUTCDay() + 6) % 7) - 8 * 3600000;
    return { startMs, endMs: startMs + ARENA_WEEK_MS };
};

export const getArenaRoundScore = attempt => {
    const count = Number(attempt.plannedQuestions);
    const score = Number(attempt.score);
    if (attempt.completed !== true || attempt.cleared === false || attempt.arenaEligible === false || !Number.isInteger(count) || count < 1 || count > 20
        || !Number.isFinite(score) || score < 0 || score > count * 100) return 0;
    return Math.round(score * 20 / count);
};

export const isArenaClear = attempt => (
    attempt.scoringVersion === ARENA_SCORING_VERSION && attempt.completed === true && attempt.cleared !== false
    && attempt.arenaEligible !== false
    && Number.isInteger(attempt.plannedQuestions) && attempt.plannedQuestions > 0 && attempt.plannedQuestions <= 20
    && attempt.totalQuestions === attempt.plannedQuestions
    && Number.isInteger(attempt.correctCount) && attempt.correctCount >= 0 && attempt.correctCount <= attempt.plannedQuestions
    && Number.isFinite(attempt.score) && attempt.score >= 0 && attempt.score <= attempt.correctCount * 100
);

export const makeArenaAttempt = (result, context = {}) => {
    const logs = result.battleLog || [];
    const attempt = {
        id: result.sessionId,
        scoringVersion: ARENA_SCORING_VERSION,
        timestamp: new Date(context.completedAtMs).toISOString(),
        score: Number(result.score),
        plannedQuestions: Number(result.plannedQuestions),
        totalQuestions: logs.length,
        correctCount: logs.filter(log => log.isCorrect).length,
        completed: result.completed === true,
        cleared: result.arenaCleared ?? result.completed === true,
        mode: context.mode || 'quiz',
        difficulty: result.difficulty || 'hard',
        quizMode: result.quizMode || 'standard',
        unit: context.unit || '',
        rank: result.rank || null
    };
    if (typeof attempt.id !== 'string' || !attempt.id || !Number.isFinite(Date.parse(attempt.timestamp))) {
        throw new TypeError('缺少有效場次識別或完成時間。');
    }
    attempt.arenaScore = isArenaClear(attempt) ? getArenaRoundScore(attempt) : 0;
    return attempt;
};

export const mergeArenaAttempt = (history = {}, attempt) => {
    if (Object.prototype.hasOwnProperty.call(history, attempt.id)) return history;
    return { ...history, [attempt.id]: attempt };
};

// Closed weeks must remain immutable, including a result screen left open overnight.
export const qualifyArenaSubmission = (attempt, receivedAtMs) => {
    const range = arenaWeekRange(Date.parse(attempt.timestamp));
    return isArenaV2Week(range.startMs) && receivedAtMs >= range.endMs
        ? { ...attempt, arenaEligible: false, arenaScore: 0, exclusionReason: 'closed-week' }
        : attempt;
};

export const getArenaHistory = (data = {}, range) => isArenaV2Week(range.startMs)
    ? Object.values(data.arenaHistory || {}) : (data.trialHistory || []);

export const getArenaWeeklyStats = (history = [], range) => {
    const unique = new Map();
    for (const attempt of history) {
        const time = Date.parse(attempt.timestamp);
        if (!attempt.id || unique.has(attempt.id) || !Number.isFinite(time)
            || time < range.startMs || time >= range.endMs) continue;
        unique.set(attempt.id, attempt);
    }
    const records = [...unique.values()];
    const clears = records.filter(isArenaClear);
    const byDate = new Map();
    for (const attempt of clears) {
        const key = arenaDateKey(Date.parse(attempt.timestamp));
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key).push({ ...attempt, arenaScore: getArenaRoundScore(attempt) });
    }
    const daily = [...byDate].map(([date, attempts]) => {
        const selected = attempts.sort((a, b) => b.arenaScore - a.arenaScore || a.id.localeCompare(b.id)).slice(0, 5);
        return { date, selected, sessions: attempts.length, score: selected.reduce((sum, a) => sum + a.arenaScore, 0) };
    }).sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
    const selectedDays = daily.slice(0, 5);
    const counted = selectedDays.flatMap(day => day.selected);
    return {
        scoringVersion: ARENA_SCORING_VERSION,
        score: selectedDays.reduce((sum, day) => sum + day.score, 0),
        sessions: clears.length,
        activeDays: daily.length,
        accuracy: counted.length ? counted.reduce((sum, a) => sum + a.correctCount / a.plannedQuestions * 100, 0) / counted.length : 0,
        hasAccuracy: counted.length > 0,
        answered: records.reduce((sum, a) => sum + (Number(a.totalQuestions) || 0), 0),
        correct: records.reduce((sum, a) => sum + (Number(a.correctCount) || 0), 0),
        practiceSessions: records.length,
        rawScore: records.reduce((sum, a) => sum + (Number(a.score) || 0), 0),
        daily, selectedDays
    };
};

export const ARENA_PROMOTION_REQUIREMENTS = Object.freeze({
    unranked: { score: 0, days: 1 }, wood: { score: 12000, days: 3 },
    stone: { score: 16000, days: 3 }, bronze: { score: 20000, days: 4 },
    silver: { score: 24000, days: 4 }, gold: { score: 28000, days: 5 },
    platinum: { score: 32000, days: 5 }, diamond: { score: 36000, days: 5 },
    warlord: { score: 0, days: 0 }
});
