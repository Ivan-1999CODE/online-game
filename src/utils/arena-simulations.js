import { normalizeArenaTier } from './arena-tiers.js';
import { ARENA_GROUP_MEMBER_LIMIT } from './arena-groups.js';
import { getArenaWeeklyStats, arenaWeekRange, isArenaV2Week } from './arena-scoring.js';

export const ARENA_SIMULATION_VERSION = 3;
export const ARENA_PERSONALITY_START = Date.parse('2026-11-02T00:00:00+08:00');
export const getArenaSimulationVersion = weekStart => Number(weekStart) >= ARENA_PERSONALITY_START
    ? 3 : isArenaV2Week(weekStart) ? 2 : 1;
const DAY_MS = 24 * 60 * 60 * 1000;

export const ARENA_SIMULATION_PROFILES = Object.freeze({
    unranked: { sessions: [4, 7], score: [350, 650], accuracy: [62, 82] },
    wood: { sessions: [4, 7], score: [400, 700], accuracy: [65, 84] },
    stone: { sessions: [5, 8], score: [450, 800], accuracy: [67, 86] },
    bronze: { sessions: [5, 9], score: [550, 900], accuracy: [69, 88] },
    silver: { sessions: [6, 10], score: [650, 1050], accuracy: [72, 90] },
    gold: { sessions: [7, 11], score: [750, 1200], accuracy: [75, 92] },
    platinum: { sessions: [8, 12], score: [900, 1400], accuracy: [78, 94] },
    diamond: { sessions: [9, 13], score: [1050, 1600], accuracy: [81, 96] },
    warlord: { sessions: [10, 14], score: [1200, 1800], accuracy: [84, 98] }
});

const SHARED_ARENA_NAMES = Object.freeze([
    '功課失蹤中', '暴走布丁', '鯊魚吃泡麵', '今天不想睡', '火箭小宇',
    '冰龍隊長', '閃電皮蛋', '傳說小蝦米', '奶茶半糖', '作業等等我',
    '隔壁小恐龍', '會飛的地瓜', '鉛筆不見了', '睡過頭勇者', '章魚燒隊長',
    '泡麵加顆蛋', '月亮追著我', '小熊不冬眠', '企鵝跑超快', '香蕉魔法師',
    'MangoBoss', 'SleepyKevin', 'DinoLeo', 'AmyGoGo', 'CocoCat',
    'HappyJason', 'RocketMia', 'SuperAndy', 'TinyTiger', 'PandaEmma',
    '草莓騎士', '巧克力忍者', '雞塊守門員', '飛天小饅頭', '雲朵收藏家',
    '貓咪開坦克', '恐龍寫功課', '飯糰大魔王', '週末才上線', '猜猜我是誰'
]);

export const maskArenaName = (name = '神秘勇者') => {
    const trimmed = String(name).trim();
    if (trimmed.length <= 1) return `${trimmed || '勇'}○`;
    if (trimmed.length === 2) return `${trimmed[0]}○`;
    return `${trimmed[0]}${'○'.repeat(Math.max(1, trimmed.length - 2))}${trimmed[trimmed.length - 1]}`;
};

const getSeedNumber = (seed) => [...String(seed)].reduce(
    (value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0,
    2166136261
);

const createSeededRandom = (seed) => {
    let state = getSeedNumber(seed) || 1;
    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

const randomInteger = (random, min, max) => (
    min + Math.floor(random() * (max - min + 1))
);

const roundToTen = value => Math.round(value / 10) * 10;

// [weekly attempts min/max, individual baseline score min/max]. Scores are
// normalized to 2,000; final totals always go through the player's scoring path.
export const ARENA_V3_PROFILES = Object.freeze({
    unranked: { light: [4, 6, 900, 1100], steady: [7, 10, 1000, 1200], strong: [11, 14, 1050, 1250] },
    wood: { light: [8, 11, 1000, 1150], steady: [12, 16, 1100, 1250], strong: [17, 22, 1150, 1300] },
    stone: { light: [10, 13, 1100, 1250], steady: [14, 19, 1200, 1350], strong: [20, 26, 1250, 1400] },
    bronze: { light: [12, 16, 1150, 1300], steady: [17, 22, 1250, 1450], strong: [23, 28, 1350, 1500] },
    silver: { light: [14, 18, 1250, 1400], steady: [19, 25, 1350, 1500], strong: [25, 30, 1450, 1600] },
    gold: { light: [16, 20, 1350, 1500], steady: [22, 28, 1450, 1600], strong: [27, 32, 1550, 1700] },
    platinum: { light: [18, 22, 1450, 1600], steady: [24, 29, 1500, 1650], strong: [28, 34, 1650, 1800] },
    diamond: { light: [20, 24, 1550, 1700], steady: [25, 31, 1650, 1780], strong: [30, 36, 1780, 1900] },
    warlord: { light: [22, 26, 1650, 1800], steady: [27, 33, 1780, 1880], strong: [32, 38, 1880, 1960] }
});

export const ARENA_ROLE_WEIGHTS = Object.freeze({ strong: 20, steady: 50, light: 30 });
const ARENA_PERSONAS = Object.freeze({
    precise: { volume: 0.9, skill: 70, spread: 65, failure: 0.025 },
    persistent: { volume: 1.1, skill: -60, spread: 100, failure: 0.06 },
    steady: { volume: 1, skill: 0, spread: 80, failure: 0.04 },
    variable: { volume: 1, skill: 0, spread: 220, failure: 0.10 }
});

const shuffled = (values, random) => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
        const j = randomInteger(random, 0, i);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

const chooseWeighted = (entries, random) => {
    let roll = random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [value, weight] of entries) {
        roll -= weight;
        if (roll < 0) return value;
    }
    return entries[entries.length - 1][0];
};

const buildV3Roles = random => {
    // Stable prefixes also keep existing preview opponents unchanged as new
    // real members take seats during the matching window. Fewer than 3 AI get
    // a random subset; 3+ always have all three roles.
    const roles = shuffled(['strong', 'steady', 'light'], random);
    while (roles.length < ARENA_GROUP_MEMBER_LIMIT) {
        const weights = Object.entries(ARENA_ROLE_WEIGHTS).filter(([role]) =>
            role !== 'strong' || roles.filter(value => value === 'strong').length < 2);
        roles.push(chooseWeighted(weights, random));
    }
    return roles;
};

const buildV3Updates = ({ random, tier, weekStart, botIndex, role }) => {
    const [minCount, maxCount, minScore, maxScore] = ARENA_V3_PROFILES[tier][role];
    const persona = Object.keys(ARENA_PERSONAS)[randomInteger(random, 0, 3)];
    const style = ARENA_PERSONAS[persona];
    const count = Math.max(minCount, Math.min(maxCount,
        Math.round(randomInteger(random, minCount, maxCount) * style.volume)));
    const baselineScore = Math.min(1960, randomInteger(random, minScore, maxScore) + style.skill);
    const failureRate = style.failure + random() * 0.025;
    const dayRange = role === 'light' ? [3, 5] : role === 'steady' ? [4, 6] : [5, 7];
    const dayCount = Math.max(Math.ceil(count / 6), Math.min(count, randomInteger(random, ...dayRange)));
    const weekendFocus = random() < 0.3;
    const dayOrder = weekendFocus
        ? [...shuffled([5, 6], random), ...shuffled([0, 1, 2, 3, 4], random)]
        : shuffled([0, 1, 2, 3, 4, 5, 6], random);
    const activityDays = dayOrder.slice(0, dayCount).sort((a, b) => a - b);
    const sessionsByDay = new Map(activityDays.map(day => [day, 1]));
    const dayWeights = activityDays.map(day => [day, 0.5 + random() + (weekendFocus && day >= 5 ? 0.5 : 0)]);
    for (let i = dayCount; i < count; i++) {
        const day = chooseWeighted(dayWeights.filter(([value]) => sessionsByDay.get(value) < 6), random);
        sessionsByDay.set(day, sessionsByDay.get(day) + 1);
    }
    const preferredMinute = randomInteger(random, 8 * 60, 21 * 60);
    const updates = [];
    for (const [day, sessions] of sessionsByDay) {
        const dailyForm = randomInteger(random, -45, 45);
        for (let i = 0; i < sessions; i++) {
            const index = updates.length;
            const minute = random() < 0.25 ? randomInteger(random, 7 * 60, 22 * 60 + 59)
                : Math.max(7 * 60, Math.min(22 * 60 + 59, preferredMinute + randomInteger(random, -90, 90)));
            const atMs = Number(weekStart) + day * DAY_MS + minute * 60000 + index;
            const plannedQuestions = random() < 0.5 ? 10 : 20;
            const completed = random() >= failureRate;
            const target = Math.max(0, Math.min(2000,
                baselineScore + dailyForm + randomInteger(random, -style.spread, style.spread)));
            const totalQuestions = completed ? plannedQuestions : randomInteger(random, 3, plannedQuestions - 1);
            const correctCount = completed ? Math.min(plannedQuestions,
                Math.max(Math.ceil(plannedQuestions * 0.8), Math.ceil(target * plannedQuestions / 2000))
                + randomInteger(random, 0, 1)) : Math.max(0, totalQuestions - 3);
            const score = Math.min(correctCount * 100, Math.round(target * plannedQuestions / 20));
            updates.push({ id: `bot-${botIndex}-${index}`, atMs, timestamp: new Date(atMs).toISOString(),
                scoringVersion: 2, score, plannedQuestions, totalQuestions, correctCount,
                completed, cleared: completed });
        }
    }
    updates.sort((a, b) => a.atMs - b.atMs);
    return { role, persona, baselineScore, failureRate, activityDays, weekendFocus, updates };
};

const buildV3Bots = ({ groupId, weekStart, tier, count }) => {
    const seed = `${groupId}:${Number(weekStart)}:${tier}:shared-v3`;
    const roles = buildV3Roles(createSeededRandom(`${seed}:roles`));
    const nameRandom = createSeededRandom(`${seed}:names`);
    const availableNames = [...SHARED_ARENA_NAMES];
    const usedMaskedNames = new Set();
    return Array.from({ length: count }, (_, index) => {
        const names = availableNames.filter(name => !usedMaskedNames.has(maskArenaName(name)));
        const selectedName = names[randomInteger(nameRandom, 0, names.length - 1)];
        availableNames.splice(availableNames.indexOf(selectedName), 1);
        const maskedName = maskArenaName(selectedName);
        usedMaskedNames.add(maskedName);
        return {
            id: `shared-bot-${getSeedNumber(`${groupId}:${index}`).toString(36)}`,
            maskedName, simulated: true, simulationVersion: 3, weekStart: Number(weekStart), tier,
            ...buildV3Updates({ random: createSeededRandom(`${seed}:bot:${index}`), tier, weekStart,
                botIndex: index, role: roles[index] })
        };
    });
};

// A stored roster is fixed for its week, including rosters generated before an
// update was deployed. Never silently replace its opponents on login.
export const shouldKeepArenaSimulation = group => (
    (Number(group.simulationVersion) || 0) >= getArenaSimulationVersion(group.weekStart)
    || (Array.isArray(group.simulatedRivals) && (group.simulatedRivals.length > 0
        || group.simulationStatus === 'ready'))
);

export const ARENA_V2_PROFILES = Object.freeze({
    unranked: { sessions: [8, 14], score: [1000, 1500] },
    wood: { sessions: [14, 20], score: [1150, 1600] },
    stone: { sessions: [18, 24], score: [1250, 1700] },
    bronze: { sessions: [22, 28], score: [1350, 1780] },
    silver: { sessions: [25, 32], score: [1450, 1850] },
    gold: { sessions: [28, 35], score: [1550, 1900] },
    platinum: { sessions: [32, 39], score: [1650, 1950] },
    diamond: { sessions: [36, 44], score: [1730, 1980] },
    warlord: { sessions: [40, 50], score: [1820, 2000] }
});

const buildV2Updates = ({ random, tier, weekStart, botIndex }) => {
    const profile = ARENA_V2_PROFILES[tier];
    const persona = ['steady', 'focused', 'persistent', 'variable'][botIndex % 4];
    const count = randomInteger(random, ...profile.sessions);
    // Each group has approachable opponents and stronger contenders. Never uses player activity.
    const strength = botIndex % 4 === 0 ? 0.87 : 0.96 + random() * 0.08;
    const days = Array.from({ length: 7 }, (_, index) => index);
    if (persona === 'focused') days.splice(randomInteger(random, 0, 6), 1);
    const updates = Array.from({ length: count }, (_, index) => {
        const plannedQuestions = random() < 0.5 ? 10 : 20;
        const day = days[index % days.length];
        const atMs = Number(weekStart) + day * DAY_MS
            + randomInteger(random, 7 * 60, 22 * 60 + 59) * 60000 + index;
        const target = Math.min(2000, Math.round(randomInteger(random, ...profile.score) * strength));
        const completed = random() >= (persona === 'variable' ? 0.12 : 0.03);
        const correctCount = completed ? Math.min(plannedQuestions, Math.max(plannedQuestions - 2,
            Math.ceil(target * plannedQuestions / 2000))) : Math.max(0, plannedQuestions - 4);
        const score = Math.min(correctCount * 100, Math.round(target * plannedQuestions / 20));
        return {
            id: `bot-${botIndex}-${index}`, atMs, timestamp: new Date(atMs).toISOString(),
            scoringVersion: 2, score, plannedQuestions, totalQuestions: completed ? plannedQuestions : plannedQuestions - 1,
            correctCount, completed
        };
    }).sort((a, b) => a.atMs - b.atMs);
    return { updates, persona };
};

export const buildSharedArenaBots = ({
    groupId,
    weekStart,
    tier,
    count
}) => {
    const normalizedTier = normalizeArenaTier(tier);
    const version = getArenaSimulationVersion(weekStart);
    const profile = ARENA_SIMULATION_PROFILES[normalizedTier];
    const safeCount = Math.floor(Math.max(0, Math.min(8, Number(count) || 0)));
    if (version === 3) return buildV3Bots({ groupId, weekStart, tier: normalizedTier, count: safeCount });
    const random = createSeededRandom(`${groupId}:${Number(weekStart)}:${normalizedTier}:shared-v1`);
    const availableNames = [...SHARED_ARENA_NAMES];
    const usedMaskedNames = new Set();

    return Array.from({ length: safeCount }, (_, index) => {
        const uniqueNames = availableNames.filter(name => !usedMaskedNames.has(maskArenaName(name)));
        const namePool = uniqueNames.length > 0 ? uniqueNames : availableNames;
        const nameIndex = Math.floor(random() * namePool.length);
        const selectedName = namePool[nameIndex];
        availableNames.splice(availableNames.indexOf(selectedName), 1);
        const maskedName = maskArenaName(selectedName);
        usedMaskedNames.add(maskedName);
        const sessionCount = randomInteger(random, profile.sessions[0], profile.sessions[1]);
        const accuracy = randomInteger(random, profile.accuracy[0], profile.accuracy[1]);
        const updates = Array.from({ length: sessionCount }, (__, sessionIndex) => {
            // 場次平均分布於整週，避免週末突然一次暴增。
            const dayIndex = Math.min(6, Math.floor((sessionIndex * 7) / sessionCount));
            const hour = randomInteger(random, 7, 22);
            const minute = randomInteger(random, 0, 59);
            const rawScore = randomInteger(random, profile.score[0], profile.score[1]);
            return {
                atMs: Number(weekStart)
                    + (dayIndex * DAY_MS)
                    + ((hour * 60 + minute) * 60 * 1000)
                    + sessionIndex,
                score: roundToTen(rawScore)
            };
        }).sort((a, b) => a.atMs - b.atMs);

        const v2 = version === 2 ? buildV2Updates({ random, tier: normalizedTier, weekStart, botIndex: index }) : null;
        return {
            id: `shared-bot-${getSeedNumber(`${groupId}:${index}`).toString(36)}`,
            maskedName,
            simulated: true,
            simulationVersion: version,
            weekStart: Number(weekStart),
            tier: normalizedTier,
            accuracy,
            updates,
            ...(v2 || {})
        };
    });
};

export const fillArenaGroupForDisplay = (group) => {
    if (!group) return group;

    const storedRivals = Array.isArray(group.simulatedRivals) ? group.simulatedRivals : [];
    if (group.status === 'locked' || storedRivals.length > 0) return group;

    const memberCount = Math.max(
        Number(group.memberCount) || 0,
        Array.isArray(group.memberIds) ? new Set(group.memberIds).size : 0
    );
    const simulatedRivals = buildSharedArenaBots({
        groupId: group.groupId,
        weekStart: group.weekStart,
        tier: group.tier,
        count: Math.max(0, ARENA_GROUP_MEMBER_LIMIT - memberCount)
    });

    return {
        ...group,
        simulatedMemberCount: simulatedRivals.length,
        simulatedRivals
    };
};

export const getSharedArenaBotEntry = (bot, asOfMs = Date.now()) => {
    const completedUpdates = (bot.updates || []).filter(
        update => Number(update.atMs) <= Number(asOfMs)
    );
    const activeDays = new Set(
        completedUpdates.map(update => Math.floor(Number(update.atMs) / DAY_MS))
    ).size;

    return {
        id: bot.id,
        maskedName: maskArenaName(bot.maskedName),
        simulated: true,
        tier: normalizeArenaTier(bot.tier),
        weekly: bot.simulationVersion >= 2 ? getArenaWeeklyStats(completedUpdates, arenaWeekRange(bot.weekStart)) : {
            score: completedUpdates.reduce(
                (sum, update) => sum + (Number(update.score) || 0),
                0
            ),
            sessions: completedUpdates.length,
            accuracy: Number(bot.accuracy) || 0,
            hasAccuracy: completedUpdates.length > 0,
            activeDays,
            correct: 0,
            answered: 0
        }
    };
};
