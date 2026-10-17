// All question modes share the same seven-second countdown scoring curve.
export const getBattleAnswerScore = ({ secondsLeft, isCorrect = true }) => {
    if (!isCorrect || !Number.isFinite(secondsLeft) || secondsLeft <= 0) return 0;
    return Math.min(100, Math.ceil(secondsLeft / 6 * 100));
};
