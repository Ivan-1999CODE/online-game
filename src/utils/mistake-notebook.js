import { hasAmbiguousTranslation, normaliseChineseMeaning } from '../constants/quizOptionRules.js';

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const count = value => Math.max(0, Number(value) || 0);
const normaliseEnglish = value => String(value ?? '').normalize('NFKC')
    .replace(/[\u2018\u2019]/g, "'").trim().replace(/\s+/g, ' ').toLowerCase();

export const getMistakeScope = (data = {}) => {
    if (data?.source === 'advanced' && data.lesson != null && Number.isFinite(Number(data.lesson))) return 'adv';
    if (data?.source === 'phrases' && data.groupId) return 'phrases';
    return 'main';
};

export const isPendingMistake = data => count(data?.count) > 0 && data?.reviewStatus !== 'familiar';

export const selectMistakes = (stats = {}, { scope = 'main', unit = 'all', status = 'pending' } = {}) =>
    Object.entries(stats || {})
        .filter(([, data]) => data && count(data.count) > 0 && getMistakeScope(data) === scope)
        .filter(([, data]) => status === 'all' || (status === 'familiar'
            ? data.reviewStatus === 'familiar' : isPendingMistake(data)))
        .filter(([, data]) => {
            if (unit === 'all') return true;
            if (scope === 'phrases') return String(data.groupId) === String(unit);
            const value = scope === 'adv' ? data.lesson : data.gameUnitId;
            return value != null && Number(value) === Number(unit);
        })
        .map(([id, data]) => ({ ...data, id }))
        .sort((a, b) => count(b.count) - count(a.count) || a.id.localeCompare(b.id));

export const getMistakeUnits = (stats = {}, scope = 'main') => {
    if (scope === 'main') return Array.from({ length: 16 }, (_, index) => ({
        value: String(index + 1), label: `Unit ${index + 1}`
    }));
    const entries = selectMistakes(stats, { scope, status: 'all' });
    if (scope === 'adv') return [...new Set(entries.map(entry => Number(entry.lesson)))]
        .sort((a, b) => a - b).map(lesson => ({ value: String(lesson), label: `第 ${lesson} 課` }));
    return [...new Map(entries.map(entry => [String(entry.groupId), entry.groupTitle || String(entry.groupId)])).entries()]
        .map(([value, label]) => ({ value, label }));
};

const shuffled = (items, random) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
        const other = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
};

const isUsableWord = entry => entry && entry.id != null && normaliseEnglish(entry.word) && String(entry.chinese ?? '').trim();
const conflicts = (left, right) => String(left.id) === String(right.id)
    || normaliseEnglish(left.word) === normaliseEnglish(right.word)
    || normaliseChineseMeaning(left.chinese) === normaliseChineseMeaning(right.chinese)
    || hasAmbiguousTranslation(left, right);

// Every selected notebook entry is a target exactly once. The wider pool only supplies choices.
export const buildMistakePracticeQuestions = (entries = [], optionPool = [], random = Math.random) => {
    const targets = [...new Map(entries.filter(isUsableWord).map(entry => [String(entry.id), entry])).values()];
    const pool = [...targets, ...optionPool.filter(isUsableWord)];
    return shuffled(targets, random).map(target => {
        const distractors = [];
        for (const candidate of shuffled(pool, random)) {
            if (conflicts(target, candidate) || distractors.some(option => conflicts(option, candidate))) continue;
            distractors.push(candidate);
            if (distractors.length === 3) break;
        }
        return {
            target,
            mode: distractors.length ? 'en-ch' : 'spelling',
            options: distractors.length ? shuffled([target, ...distractors], random) : []
        };
    });
};

export const isPracticeAnswerCorrect = (question, answer) => {
    if (!question?.target) return false;
    if (question.mode === 'spelling') {
        const expected = normaliseEnglish(question.target.word);
        return Boolean(expected) && normaliseEnglish(answer) === expected;
    }
    return answer != null && String(answer) === String(question.target.id)
        && question.options.some(option => String(option.id) === String(answer));
};

// Work from the latest persisted map so deleted entries are never resurrected by a stale result page.
export const applyMistakePractice = (stats = {}, { sessionId, answers = [], completedAt } = {}) => {
    if (!sessionId || !completedAt) throw new Error('練習紀錄缺少回合或完成時間。');
    const next = { ...(stats || {}) };
    const seen = new Set();
    for (const answer of answers) {
        const id = String(answer?.id ?? '');
        if (!own(next, id) || seen.has(id) || typeof answer.isCorrect !== 'boolean') continue;
        seen.add(id);
        const previous = next[id];
        if (!previous || previous.lastPracticeSessionId === sessionId) continue;
        next[id] = {
            ...previous,
            practiceCount: count(previous.practiceCount) + 1,
            practiceCorrectCount: count(previous.practiceCorrectCount) + (answer.isCorrect ? 1 : 0),
            lastPracticedAt: completedAt,
            lastPracticeCorrect: answer.isCorrect,
            lastPracticeSessionId: sessionId,
            ...(!answer.isCorrect ? {
                count: count(previous.count) + 1,
                reviewStatus: 'pending',
                familiarAt: null,
                lastWrongAt: completedAt
            } : {})
        };
    }
    return next;
};

export const setMistakeReviewStatus = (stats = {}, ids = [], status, changedAt, { correctSessionId } = {}) => {
    if (status !== 'pending' && status !== 'familiar') throw new Error('不支援的錯題複習狀態。');
    const next = { ...(stats || {}) };
    for (const rawId of new Set(ids)) {
        const id = String(rawId);
        if (!own(next, id) || !next[id]) continue;
        const previous = next[id];
        if (correctSessionId && (previous.lastPracticeSessionId !== correctSessionId || previous.lastPracticeCorrect !== true)) continue;
        // A newer wrong answer in another session takes priority over an older successful practice.
        if (correctSessionId && Date.parse(previous.lastWrongAt) > Date.parse(previous.lastPracticedAt)) continue;
        next[id] = {
            ...previous,
            reviewStatus: status,
            familiarAt: status === 'familiar' ? (changedAt || null) : null
        };
    }
    return next;
};

export const removeMistakes = (stats = {}, ids = []) => {
    const next = { ...(stats || {}) };
    for (const id of ids) delete next[String(id)];
    return next;
};
