import { doc, runTransaction } from 'firebase/firestore';
import {
    applyMistakePractice,
    removeMistakes,
    selectMistakes,
    setMistakeReviewStatus
} from './mistake-notebook.js';

// Compute from the latest server record, so another device's edits and deleted
// entries are not overwritten by an older notebook snapshot.
export const getMistakeNotebookUpdates = (data, change) => {
    const stats = data.mistakeStats || {};
    if (change.type === 'practice') {
        const result = change.result;
        if (!result?.sessionId || !Array.isArray(result.answers)) {
            throw new Error('練習紀錄不完整，請重新開始。');
        }
        const savedSessions = data.savedMistakePracticeSessions || {};
        if (savedSessions[result.sessionId]) return null;
        return {
            mistakeStats: applyMistakePractice(stats, result),
            savedMistakePracticeSessions: { ...savedSessions, [result.sessionId]: true }
        };
    }
    if (change.type === 'status') {
        if (change.status === 'familiar' && !change.correctSessionId) {
            throw new Error('請先完成練習，再標記本次答對的單字。');
        }
        if (change.status === 'familiar' && change.ids.some(id => {
            const entry = stats[id];
            return !entry || entry.lastPracticeSessionId !== change.correctSessionId
                || entry.lastPracticeCorrect !== true
                || Date.parse(entry.lastWrongAt) > Date.parse(entry.lastPracticedAt);
        })) {
            throw new Error('部分單字已有新的練習或刪除紀錄，請返回筆記本後重新練習。');
        }
        const mistakeStats = setMistakeReviewStatus(stats, change.ids, change.status, change.changedAt,
            { correctSessionId: change.correctSessionId });
        return { mistakeStats };
    }
    if (change.type === 'remove') {
        return { mistakeStats: removeMistakes(stats, change.ids) };
    }
    if (change.type === 'clear-familiar') {
        if (!['main', 'adv', 'phrases'].includes(change.scope)) throw new Error('找不到指定的錯題分類。');
        if (!Array.isArray(change.ids) || change.unit == null || String(change.unit).trim() === '') {
            throw new Error('清除範圍不完整，請重新開啟確認視窗。');
        }
        const confirmedIds = new Set(change.ids.map(String));
        // The confirmation is a snapshot: never add newly familiar entries to
        // it, and retain words that another device has moved back to practice.
        const ids = selectMistakes(stats, { scope: change.scope, unit: change.unit, status: 'familiar' })
            .filter(entry => confirmedIds.has(entry.id))
            .map(entry => entry.id);
        return { mistakeStats: removeMistakes(stats, ids) };
    }
    throw new Error('不支援的錯題操作。');
};

export const saveMistakeNotebookChange = (db, userId, change) => {
    if (!userId) throw new Error('登入已失效，請重新登入後再試。');
    return runTransaction(db, async transaction => {
        const userRef = doc(db, 'users', userId);
        const snapshot = await transaction.get(userRef);
        if (!snapshot.exists()) throw new Error('找不到學習資料，請重新登入後再試。');
        const data = snapshot.data();
        const updates = getMistakeNotebookUpdates(data, change);
        if (updates) transaction.update(userRef, updates);
        return updates?.mistakeStats || data.mistakeStats || {};
    });
};
