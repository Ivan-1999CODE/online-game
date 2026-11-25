import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { hasAmbiguousTranslation } from '../constants/quizOptionRules.js';
import { createBattleQuestionSet } from './battle-questions.js';
import { createSeededRandom } from './phrase-library.js';

// These word labels do not belong to any English synonym group.
const meaningsConflict = (left, right) => hasAmbiguousTranslation(
    { id: 'a', word: 'entry-a', chinese: left },
    { id: 'b', word: 'entry-b', chinese: right }
);

test('中譯近義能匹配完整義項、詞性、括號及有無「的」的寫法', () => {
    const examples = [
        ['美麗的', '漂亮的'], ['漂亮', '好看'], ['好看的', '美麗'],
        ['名：風景 ／ 形：美麗的（形容外表）', '好看；容易閱讀']
    ];
    for (const [left, right] of examples) {
        assert.equal(meaningsConflict(left, right), true, `${left} / ${right}`);
        assert.equal(meaningsConflict(right, left), true, `${right} / ${left}`);
    }
});

test('多義詞可以分別避讓兩組選項，兩組之間仍能一起出題', () => {
    assert.equal(meaningsConflict('方法', '途徑'), true);
    assert.equal(meaningsConflict('途徑', '路徑'), true);
    assert.equal(meaningsConflict('方法', '路徑'), false);
});

test('反義詞、帶否定的詞與相同片段不會被判成同義', () => {
    for (const [left, right] of [['美麗的', '醜陋的'], ['漂亮', '不漂亮'], ['好看', '好看的風景'], ['人', '人行道']]) {
        assert.equal(meaningsConflict(left, right), false, `${left} / ${right}`);
    }
});

test('進階第 122 課的每個目標都可出四選一，且 be、do、have 各家族不會併列', async () => {
    const lessons = JSON.parse(await readFile(new URL('../../data_advanced.json', import.meta.url), 'utf8'));
    const { lesson, words } = lessons.find(item => item.lesson === 122);
    const quizData = words.map(item => ({ ...item, id: item.word, lesson, series: 'advanced' }));
    const families = [
        ['be', 'am', 'is', 'are', 'was', 'were', 'been'],
        ['do', 'does', 'did'],
        ['have', 'has', 'had']
    ];
    const { questions, questionBuildError } = createBattleQuestionSet({
        quizData, questionLimit: quizData.length, random: createSeededRandom(122)
    });
    assert.equal(questionBuildError, '');
    assert.equal(questions.length, quizData.length);
    assert.deepEqual(new Set(questions.map(q => q.target.word)), new Set(words.map(item => item.word)));
    for (const { target, options } of questions) {
        const optionWords = options.map(item => item.word);
        assert.equal(options.length, 4, target.word);
        assert.equal(new Set(optionWords).size, 4, target.word);
        assert.ok(optionWords.includes(target.word), target.word);
        for (const family of families) {
            assert.ok(optionWords.filter(word => family.includes(word)).length <= 1, optionWords.join(' / '));
        }
    }
});
