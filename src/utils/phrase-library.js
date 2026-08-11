import { hasAmbiguousTranslation } from '../constants/quizOptionRules.js';

export const PHRASE_CLEAR_TARGET = 3;
export const PHRASE_QUESTION_LIMIT = 10;
export const PHRASE_PASSING_GRADES = ['S', 'A', 'B'];
export const PHRASE_GRADE_ORDER = { B: 1, A: 2, S: 3 };

const unique = values => [...new Set(values.filter(Boolean))];

export const createSeededRandom = (seed = 1) => {
    let state = Number(seed) >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
};

export const shuffleWith = (items, random = Math.random) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
};

export const normalizePhraseProgress = (record = {}) => {
    const safeRecord = record && typeof record === 'object' ? record : {};
    const grades = Array.isArray(safeRecord.grades)
        ? safeRecord.grades.filter(grade => PHRASE_PASSING_GRADES.includes(grade))
            .sort((a, b) => PHRASE_GRADE_ORDER[b] - PHRASE_GRADE_ORDER[a])
            .slice(0, PHRASE_CLEAR_TARGET)
        : [];
    const clears = Math.max(0, Number(safeRecord.clears) || 0);
    const bestGrade = PHRASE_PASSING_GRADES.includes(safeRecord.bestGrade)
        ? safeRecord.bestGrade
        : (grades[0] || null);

    return {
        attempts: Math.max(0, Number(safeRecord.attempts) || 0),
        clears,
        grades,
        bestScore: Math.max(0, Number(safeRecord.bestScore) || 0),
        bestGrade,
        completed: clears >= PHRASE_CLEAR_TARGET,
        seenPhraseIds: unique(Array.isArray(safeRecord.seenPhraseIds) ? safeRecord.seenPhraseIds : []),
        lastPlayedAt: safeRecord.lastPlayedAt || null
    };
};

export const getPhraseGrade = ({ correct = 0, total = 0, completed = true } = {}) => {
    if (!completed || total <= 0) return null;
    const percentage = (correct / total) * 100;
    if (percentage >= 100) return 'S';
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    return null;
};

export const addPhraseAttempt = (record, {
    grade = null,
    score = 0,
    askedPhraseIds = [],
    playedAt = new Date().toISOString()
} = {}) => {
    const current = normalizePhraseProgress(record);
    const isQualified = PHRASE_PASSING_GRADES.includes(grade);
    const grades = isQualified
        ? [...current.grades, grade]
            .sort((a, b) => PHRASE_GRADE_ORDER[b] - PHRASE_GRADE_ORDER[a])
            .slice(0, PHRASE_CLEAR_TARGET)
        : current.grades;
    const clears = current.clears + (isQualified ? 1 : 0);

    return {
        attempts: current.attempts + 1,
        clears,
        grades,
        bestScore: Math.max(current.bestScore, Number(score) || 0),
        bestGrade: grades[0] || current.bestGrade,
        completed: clears >= PHRASE_CLEAR_TARGET,
        seenPhraseIds: unique([...current.seenPhraseIds, ...askedPhraseIds]),
        lastPlayedAt: playedAt
    };
};

export const selectSmartPhrases = (phrases, {
    seenPhraseIds = [],
    wrongPhraseIds = [],
    limit = PHRASE_QUESTION_LIMIT,
    random = Math.random
} = {}) => {
    const seen = new Set(seenPhraseIds);
    const wrong = new Set(wrongPhraseIds);
    const freshCoverageCycle = seen.size === 0 && wrong.size > 0;
    const freshWrongPool = freshCoverageCycle
        ? phrases.filter(phrase => wrong.has(phrase.id))
        : [];
    const unseenPool = phrases.filter(phrase => !seen.has(phrase.id));
    const wrongPool = phrases.filter(phrase => seen.has(phrase.id) && wrong.has(phrase.id));
    const remainingPool = phrases.filter(phrase => seen.has(phrase.id) && !wrong.has(phrase.id));
    const pools = freshCoverageCycle
        ? [freshWrongPool, unseenPool.filter(phrase => !wrong.has(phrase.id))]
        : [unseenPool, wrongPool, remainingPool];
    const ordered = pools
        .flatMap(pool => shuffleWith(pool, random));
    return shuffleWith(ordered.slice(0, Math.min(limit, phrases.length)), random);
};

const addDistinctDistractors = (choices, candidates, target, limit) => {
    for (const candidate of candidates) {
        if (choices.length >= limit) break;
        if (candidate.id === target.id || choices.some(choice => choice.id === candidate.id)) continue;
        if (choices.some(choice => hasAmbiguousTranslation(choice, candidate))) continue;
        choices.push(candidate);
    }
    return choices;
};

export const buildPhraseQuestions = ({
    selectedPhrases = [],
    groupPhrases = [],
    partPhrases = [],
    random = Math.random
} = {}) => selectedPhrases.map(target => {
    const choices = [target];
    addDistinctDistractors(choices, shuffleWith(groupPhrases, random), target, 4);
    addDistinctDistractors(choices, shuffleWith(partPhrases, random), target, 4);
    if (choices.length < 4) throw new Error(`片語 ${target.id} 找不到 3 個不重複的有效選項`);

    return {
        target,
        options: shuffleWith(choices, random),
        mode: random() > 0.5 ? 'en-ch' : 'ch-en'
    };
});
