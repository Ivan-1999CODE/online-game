import { normalizeArenaTierProgress } from './arena-tiers.js';

// Firestore map field order is not part of the player's state. Preserve array
// order, but compare maps by their keys and values at every nesting level.
const orderedJson = value => JSON.stringify(value, (_key, item) => (
    item && typeof item === 'object' && !Array.isArray(item)
        ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]))
        : item
));

export const assertArenaLoginStateUnchanged = (expected, latest) => {
    const sameProgress = orderedJson(normalizeArenaTierProgress(expected?.arenaTierProgress))
        === orderedJson(normalizeArenaTierProgress(latest?.arenaTierProgress));
    const sameHistory = orderedJson(expected?.arenaHistory || {})
        === orderedJson(latest?.arenaHistory || {});
    if (!sameProgress || !sameHistory) {
        const error = new Error('競技場資料已在另一個分頁或裝置更新，請重新讀取學習資料。');
        error.code = 'startup/arena-state-changed';
        throw error;
    }
};
