import { SEMANTIC_CONFLICT_GROUPS } from './quizConflictGroups.js';
import { CHINESE_MEANING_GROUPS } from './chineseMeaningGroups.js';

export const normaliseEnglish = value => String(value ?? '').normalize('NFKC')
    .replace(/[‘’]/g, "'").trim().replace(/\s+/g, ' ').toLowerCase();

// 只比對完整義項，例如「小孩；兒童」和「名: 小孩 / 動: 開玩笑」都包含「小孩」。
const partOfSpeechPrefix = /^(?:\[[^\]]+\]|(?:名|動|形容?|副|介|代|連接|助動|感嘆|數|量)(?:詞)?\s*:)\s*/;
const chineseSenses = value => String(value ?? '').normalize('NFKC')
    .replace(/\([^)]*\)/g, '')
    .replace(/\.{3,}/g, '…')
    .replace(/\s+/g, ' ')
    .split(/[;,、/]/)
    .map(sense => sense.trim()
        .replace(partOfSpeechPrefix, '')
        .replace(/[。.!?]+$/g, '').trim())
    .filter(Boolean);

export const normaliseChineseMeaning = value => chineseSenses(value).join('；');

const indexGroups = (groups, keysFor) => {
    const byTerm = new Map();
    groups.forEach((terms, group) => {
        for (const term of terms) {
            for (const key of keysFor(term)) {
                if (!byTerm.has(key)) byTerm.set(key, new Set());
                byTerm.get(key).add(group);
            }
        }
    });
    return byTerm;
};

const englishGroups = indexGroups(SEMANTIC_CONFLICT_GROUPS, term => [normaliseEnglish(term)]);
const chineseGroups = indexGroups(CHINESE_MEANING_GROUPS, term => {
    const key = normaliseChineseMeaning(term);
    // 只展開清單裡形容詞的「的」，保留「目的地」、「不漂亮」等完整語義。
    return key.endsWith('的') && key.length > 2 ? [key, key.slice(0, -1)] : [key];
});

const shareGroup = (index, left, right) => {
    const leftGroups = index.get(left);
    const rightGroups = index.get(right);
    if (!leftGroups || !rightGroups) return false;
    for (const group of leftGroups) {
        if (rightGroups.has(group)) return true;
    }
    return false;
};

export const hasAmbiguousTranslation = (left, right) => {
    if (!left || !right) return false;
    const leftWord = normaliseEnglish(left.word);
    const rightWord = normaliseEnglish(right.word);
    if (leftWord && (leftWord === rightWord || shareGroup(englishGroups, leftWord, rightWord))) return true;
    const rightSenses = chineseSenses(right.chinese);
    return chineseSenses(left.chinese).some(a => rightSenses.some(b => a === b || shareGroup(chineseGroups, a, b)));
};

export const needsEnglishPrompt = item => englishGroups.has(normaliseEnglish(item?.word));

// Candidates are already in the caller's preferred (usually shuffled) order.
// A word with two senses can block two otherwise compatible choices. Try the
// next combination before returning a short question to a small practice pool.
export const selectQuizOptions = (target, orderedCandidates) => {
    const choices = [target];
    let best = choices.slice();
    const search = start => {
        if (choices.length > best.length) best = choices.slice();
        if (best.length === 4) return true;
        for (let i = start; i < orderedCandidates.length; i++) {
            if (choices.length + orderedCandidates.length - i <= best.length) break;
            const candidate = orderedCandidates[i];
            if (choices.some(choice => (choice.id != null && String(choice.id) === String(candidate.id))
                || hasAmbiguousTranslation(choice, candidate))) continue;
            choices.push(candidate);
            if (search(i + 1)) return true;
            choices.pop();
        }
        return false;
    };
    search(0);
    return best;
};
