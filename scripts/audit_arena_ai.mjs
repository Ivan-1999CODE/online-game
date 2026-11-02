import { ARENA_PERSONALITY_START, ARENA_V3_PROFILES, buildSharedArenaBots,
    getSharedArenaBotEntry } from '../src/utils/arena-simulations.js';
import { ARENA_WEEK_MS } from '../src/utils/arena-scoring.js';

// Deterministic, offline balance audit. Never reads or writes player accounts.
const groupsPerTier = 100;
const summarize = values => {
    const sorted = [...values].sort((a, b) => a - b);
    const at = quantile => sorted[Math.floor((sorted.length - 1) * quantile)];
    return { min: sorted[0], p10: at(0.1), median: at(0.5), p90: at(0.9), max: sorted.at(-1) };
};
const report = { groupsPerTier, botsPerGroup: 7, weeks: 4, totalBots: 0, tiers: {} };
for (const tier of Object.keys(ARENA_V3_PROFILES)) {
    const samples = { light: [], steady: [], strong: [] };
    const compositions = new Map();
    for (let index = 0; index < groupsPerTier; index++) {
        const weekStart = ARENA_PERSONALITY_START + (index % report.weeks) * ARENA_WEEK_MS;
        const bots = buildSharedArenaBots({ groupId: `audit-${index}`, weekStart, tier, count: 7 });
        const counts = { light: 0, steady: 0, strong: 0 };
        for (const bot of bots) {
            const weekly = getSharedArenaBotEntry(bot, weekStart + ARENA_WEEK_MS).weekly;
            samples[bot.role].push({ score: weekly.score, attempts: bot.updates.length,
                counted: weekly.countedSessions, activeDays: weekly.activeDays });
            counts[bot.role]++;
            report.totalBots++;
        }
        const key = `${counts.strong} strong / ${counts.steady} steady / ${counts.light} light`;
        compositions.set(key, (compositions.get(key) || 0) + 1);
    }
    report.tiers[tier] = {
        compositions: Object.fromEntries(compositions),
        roles: Object.fromEntries(Object.entries(samples).map(([role, entries]) => [role, {
            bots: entries.length, score: summarize(entries.map(item => item.score)),
            attempts: summarize(entries.map(item => item.attempts)),
            counted: summarize(entries.map(item => item.counted)),
            activeDays: summarize(entries.map(item => item.activeDays))
        }]))
    };
}
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
