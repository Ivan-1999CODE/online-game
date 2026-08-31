export const BATTLE_PAUSE_FLOOR_SECONDS = 0.1;

export const getBattleTimerSnapshot = ({
    deadlineMs,
    nowMs = Date.now(),
    isPauseOpen = false,
    pauseFloorSeconds = BATTLE_PAUSE_FLOOR_SECONDS
}) => {
    const safeDeadline = Number(deadlineMs);
    const safeNow = Number(nowMs);
    const remainingSeconds = Number.isFinite(safeDeadline) && Number.isFinite(safeNow)
        ? Math.max(0, (safeDeadline - safeNow) / 1000)
        : 0;
    const expired = remainingSeconds <= 0;

    return {
        expired,
        secondsLeft: isPauseOpen
            ? Math.max(pauseFloorSeconds, remainingSeconds)
            : remainingSeconds
    };
};
