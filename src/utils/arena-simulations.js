import { normalizeArenaTier } from './arena-tiers.js';
import { ARENA_GROUP_MEMBER_LIMIT } from './arena-groups.js';
import { getArenaWeeklyStats, arenaWeekRange, isArenaV2Week } from './arena-scoring.js';

export const ARENA_SIMULATION_VERSION = 2;
export const getArenaSimulationVersion = weekStart => isArenaV2Week(weekStart) ? 2 : 1;
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
    const safeCount = Math.max(0, Math.min(8, Number(count) || 0));
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
        weekly: bot.simulationVersion === 2 ? getArenaWeeklyStats(completedUpdates, arenaWeekRange(bot.weekStart)) : {
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
