// Rules for vocabulary that cannot be fairly tested as direct translations.
// Keep this list data-driven: add a word to a group instead of adding a
// chapter-specific condition in the quiz component.
const SEMANTIC_CONFLICT_GROUPS = [
    ['boy', 'man', 'guy', 'male', 'gentleman'],
    ['girl', 'woman', 'female', 'lady'],
    ['good', 'great', 'nice', 'fine', 'wonderful', 'excellent'],
    ['beautiful', 'pretty', 'nice-looking', 'handsome'],
    ['thin', 'slim', 'slender'],
    ['smart', 'intelligent', 'clever'],
    ['big', 'large'], ['small', 'little'], ['tall', 'high'],
    ['doctor', 'dr.'], ['mr.', 'sir'],
    ['job', 'work'], ['begin', 'start'], ['die', 'death'],
    ['dinner', 'supper'], ['soccer', 'football'], ['hello', 'hi'],
    ['mistake', 'error'], ['fact', 'truth'], ['far', 'distant'],
    ['country', 'nation'], ['america', 'usa'], ['sunny', 'clear'],
    ['humid', 'wet'], ['certain', 'sure'], ['almost', 'nearly'],
    ['maybe', 'perhaps', 'probably'], ['also', 'too', 'either'],
    ['many', 'much', 'a lot of'], ['garbage', 'trash'], ['hat', 'cap'],
    ['arrive', 'get to', 'arrive at', 'arrive in'],
    ['invite', 'invitation'], ['pollution', 'pollute'],
    ['discussion', 'discuss'], ['talent', 'genius'],
    ['pleased', 'glad'], ['foolish', 'silly'],
    ['hard-working', 'diligent'], ['sincere', 'honest'],
    ['everyone', 'everybody'], ['i', 'me'], ['we', 'us'],
    ['they', 'them'], ['your', 'yours'], ['her', 'hers'],
    ['our', 'ours'], ['their', 'theirs'],
    ['because', 'because of'], ['do exercise', 'play sports'],
    ['sit down', 'have / take a seat'], ['pack', 'pack up']
];

const normaliseWord = (value = '') => String(value).trim().toLowerCase();

// Parenthetical notes explain usage but should not make
// the option eligible as a separate translation choice.
export const normaliseChineseMeaning = (value = '') => String(value)
    .replace(/\([^)]*\)/g, '')
    .replace(/\uFF08[^\uFF09]*\uFF09/g, '')
    .replace(/[\u3001\uFF0C,\/\uFF0F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const CONFLICT_GROUP_BY_WORD = new Map();
SEMANTIC_CONFLICT_GROUPS.forEach((group, index) => {
    group.forEach(word => {
        const key = normaliseWord(word);
        const groups = CONFLICT_GROUP_BY_WORD.get(key) || new Set();
        groups.add(index);
        CONFLICT_GROUP_BY_WORD.set(key, groups);
    });
});

const sharesConflictGroup = (leftWord, rightWord) => {
    const leftGroups = CONFLICT_GROUP_BY_WORD.get(normaliseWord(leftWord));
    const rightGroups = CONFLICT_GROUP_BY_WORD.get(normaliseWord(rightWord));
    return Boolean(leftGroups && rightGroups && [...leftGroups].some(group => rightGroups.has(group)));
};

export const hasAmbiguousTranslation = (left, right) => {
    if (!left || !right || left.id === right.id) return false;
    const leftMeaning = normaliseChineseMeaning(left.chinese);
    const rightMeaning = normaliseChineseMeaning(right.chinese);
    return Boolean(leftMeaning && leftMeaning === rightMeaning)
        || sharesConflictGroup(left.word, right.word);
};

// A direct Chinese prompt is not a reliable one-to-one question for
// words in a conflict group. Use English-to-Chinese for those targets.
export const needsEnglishPrompt = (item) => CONFLICT_GROUP_BY_WORD.has(normaliseWord(item?.word));
