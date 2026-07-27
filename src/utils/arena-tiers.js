export const ARENA_TIER_PROGRESS_VERSION = 1;

// 2026-08-03 00:00（Asia/Taipei）。階級制度只從完整週一開始生效。
export const ARENA_TIER_ACTIVATION_WEEK_START = Date.parse('2026-08-02T16:00:00.000Z');

export const ARENA_TIERS = Object.freeze([
    {
        id: 'unranked',
        label: '無牌',
        shortLabel: '尚未定級',
        badge: '—',
        colors: { primary: '#6b7280', secondary: '#1f2937', glow: '#9ca3af' },
        frame: 'dashed'
    },
    {
        id: 'wood',
        label: '木牌',
        shortLabel: '木牌',
        badge: '木',
        colors: { primary: '#92400e', secondary: '#451a03', glow: '#d97706' },
        frame: 'wood'
    },
    {
        id: 'stone',
        label: '石牌',
        shortLabel: '石牌',
        badge: '石',
        colors: { primary: '#78716c', secondary: '#292524', glow: '#a8a29e' },
        frame: 'stone'
    },
    {
        id: 'bronze',
        label: '銅牌',
        shortLabel: '銅牌',
        badge: '銅',
        colors: { primary: '#b45309', secondary: '#431407', glow: '#f59e0b' },
        frame: 'bronze'
    },
    {
        id: 'silver',
        label: '銀牌',
        shortLabel: '銀牌',
        badge: '銀',
        colors: { primary: '#cbd5e1', secondary: '#334155', glow: '#f1f5f9' },
        frame: 'silver'
    },
    {
        id: 'gold',
        label: '金牌',
        shortLabel: '金牌',
        badge: '金',
        colors: { primary: '#fbbf24', secondary: '#713f12', glow: '#fde68a' },
        frame: 'gold'
    },
    {
        id: 'platinum',
        label: '白金',
        shortLabel: '白金',
        badge: '白',
        colors: { primary: '#a5f3fc', secondary: '#164e63', glow: '#cffafe' },
        frame: 'platinum'
    },
    {
        id: 'diamond',
        label: '鑽石',
        shortLabel: '鑽石',
        badge: '鑽',
        colors: { primary: '#67e8f9', secondary: '#1e3a8a', glow: '#bfdbfe' },
        frame: 'diamond'
    },
    {
        id: 'warlord',
        label: '戰神',
        shortLabel: '戰神',
        badge: '神',
        colors: { primary: '#f59e0b', secondary: '#7f1d1d', glow: '#fca5a5' },
        frame: 'warlord'
    }
]);

const ARENA_TIER_INDEX = Object.freeze(Object.fromEntries(
    ARENA_TIERS.map((tier, index) => [tier.id, index])
));

export const normalizeArenaTier = (tier) => (
    Object.hasOwn(ARENA_TIER_INDEX, tier) ? tier : 'unranked'
);

export const getArenaTierIndex = (tier) => ARENA_TIER_INDEX[normalizeArenaTier(tier)];

export const getArenaTier = (tier) => ARENA_TIERS[getArenaTierIndex(tier)];

export const createDefaultArenaTierProgress = () => ({
    version: ARENA_TIER_PROGRESS_VERSION,
    currentTier: 'unranked',
    highestTier: 'unranked',
    highestTierReachedAt: null,
    highestTierWeekStart: null,
    consecutiveInactiveWeeks: 0,
    lastSettledWeek: null
});

export const normalizeArenaTierProgress = (progress = {}) => {
    const defaults = createDefaultArenaTierProgress();
    const currentTier = normalizeArenaTier(progress.currentTier);
    let highestTier = normalizeArenaTier(progress.highestTier);
    const normalizeNullableNumber = (value, fallback) => (
        value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
            ? Number(value)
            : fallback
    );

    // 舊資料若只有目前階級，最高排位至少不能低於目前階級。
    if (getArenaTierIndex(highestTier) < getArenaTierIndex(currentTier)) {
        highestTier = currentTier;
    }

    return {
        version: ARENA_TIER_PROGRESS_VERSION,
        currentTier,
        highestTier,
        highestTierReachedAt: progress.highestTierReachedAt || defaults.highestTierReachedAt,
        highestTierWeekStart: normalizeNullableNumber(
            progress.highestTierWeekStart,
            defaults.highestTierWeekStart
        ),
        consecutiveInactiveWeeks: Math.max(0, Number(progress.consecutiveInactiveWeeks) || 0),
        lastSettledWeek: normalizeNullableNumber(
            progress.lastSettledWeek,
            defaults.lastSettledWeek
        )
    };
};

const moveArenaTier = (tier, offset) => {
    const currentIndex = getArenaTierIndex(tier);
    const minimumFormalTierIndex = getArenaTierIndex('wood');
    const nextIndex = Math.min(
        ARENA_TIERS.length - 1,
        Math.max(minimumFormalTierIndex, currentIndex + offset)
    );
    return ARENA_TIERS[nextIndex].id;
};

export const settleArenaTier = ({
    progress,
    participated,
    rank,
    weekStart,
    settledAt = new Date().toISOString()
}) => {
    const normalizedProgress = normalizeArenaTierProgress(progress);
    const numericWeekStart = Number(weekStart);

    if (!Number.isFinite(numericWeekStart)) {
        throw new TypeError('weekStart 必須是有效的毫秒時間戳。');
    }

    if (
        normalizedProgress.lastSettledWeek !== null
        && numericWeekStart <= normalizedProgress.lastSettledWeek
    ) {
        return {
            changed: false,
            progress: normalizedProgress,
            settlement: {
                tierVersion: ARENA_TIER_PROGRESS_VERSION,
                tierBefore: normalizedProgress.currentTier,
                tierAfter: normalizedProgress.currentTier,
                tierOutcome: 'already-settled',
                tierChanged: false,
                consecutiveInactiveWeeks: normalizedProgress.consecutiveInactiveWeeks,
                highestTier: normalizedProgress.highestTier,
                highestTierReachedAt: normalizedProgress.highestTierReachedAt,
                highestTierWeekStart: normalizedProgress.highestTierWeekStart
            }
        };
    }

    const tierBefore = normalizedProgress.currentTier;
    const normalizedRank = Number(rank);
    const hasValidRank = Number.isInteger(normalizedRank) && normalizedRank >= 1 && normalizedRank <= 8;
    let tierAfter = tierBefore;
    let tierOutcome = 'maintained';
    let consecutiveInactiveWeeks = normalizedProgress.consecutiveInactiveWeeks;

    if (participated) {
        consecutiveInactiveWeeks = 0;
        if (tierBefore === 'unranked') {
            tierAfter = 'wood';
            tierOutcome = 'placement';
        } else if (hasValidRank && normalizedRank <= 2) {
            tierAfter = moveArenaTier(tierBefore, 1);
            tierOutcome = tierAfter === tierBefore ? 'maintained' : 'promoted';
        } else if (hasValidRank && normalizedRank >= 7) {
            tierAfter = moveArenaTier(tierBefore, -1);
            tierOutcome = tierAfter === tierBefore ? 'maintained' : 'demoted';
        }
    } else {
        consecutiveInactiveWeeks += 1;
        if (tierBefore === 'unranked') {
            tierOutcome = 'unranked';
        } else if (consecutiveInactiveWeeks === 1) {
            tierOutcome = 'inactive-hold';
        } else {
            tierAfter = moveArenaTier(tierBefore, -1);
            tierOutcome = tierAfter === tierBefore ? 'inactive-hold' : 'inactive-demoted';
        }
    }

    let highestTier = normalizedProgress.highestTier;
    let highestTierReachedAt = normalizedProgress.highestTierReachedAt;
    let highestTierWeekStart = normalizedProgress.highestTierWeekStart;
    if (getArenaTierIndex(tierAfter) > getArenaTierIndex(highestTier)) {
        highestTier = tierAfter;
        highestTierReachedAt = settledAt;
        highestTierWeekStart = numericWeekStart;
    }

    const nextProgress = {
        version: ARENA_TIER_PROGRESS_VERSION,
        currentTier: tierAfter,
        highestTier,
        highestTierReachedAt,
        highestTierWeekStart,
        consecutiveInactiveWeeks,
        lastSettledWeek: numericWeekStart
    };

    return {
        changed: true,
        progress: nextProgress,
        settlement: {
            tierVersion: ARENA_TIER_PROGRESS_VERSION,
            tierBefore,
            tierAfter,
            tierOutcome,
            tierChanged: tierAfter !== tierBefore,
            consecutiveInactiveWeeks,
            highestTier,
            highestTierReachedAt,
            highestTierWeekStart
        }
    };
};
