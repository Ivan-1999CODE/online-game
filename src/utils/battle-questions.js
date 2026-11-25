import { hasAmbiguousTranslation, needsEnglishPrompt, selectQuizOptions } from '../constants/quizOptionRules.js';
import { buildPhraseQuestions, shuffleWith } from './phrase-library.js';

// 第 122 課只有 be、do、have 三個動詞家族。同課湊不滿四選一時，
// 從進階前面課程已教過的動詞補干擾項，出題目標仍只取自本次選課。
const advancedReviewChoices = [
    ['eat', '吃'], ['sleep', '睡覺'], ['walk', '走路'],
    ['swim', '游泳'], ['listen', '聽'], ['sit', '坐']
].map(([word, chinese]) => ({ id: `review-choice:${word}`, word, chinese }));

export const createBattleQuestionSet = ({ quizData, optionPool, isPhrase, questionLimit = 20, random = Math.random }) => {
    if (!Array.isArray(quizData) || quizData.length === 0) {
        return {
            questions: [],
            questionBuildError: isPhrase
                ? '找不到可用的題目，請返回片語列表後再試一次。'
                : '找不到可用的題目，請返回上一頁後再試一次。'
        };
    }
    try {
        if (isPhrase) {
            const questions = buildPhraseQuestions({
                selectedPhrases: quizData,
                groupPhrases: quizData,
                partPhrases: optionPool?.length ? optionPool : quizData,
                random
            });
            return { questions, questionBuildError: '' };
        }
        const generatedQuestions = quizData.flatMap(item => {
            let candidates = shuffleWith(quizData, random);
            let choices = selectQuizOptions(item, candidates);
            if (choices.length < 4 && optionPool?.length) {
                candidates = [...candidates, ...shuffleWith(optionPool, random)];
                choices = selectQuizOptions(item, candidates);
            }
            if (choices.length < 4 && item.series === 'advanced') {
                choices = selectQuizOptions(item, [...candidates, ...shuffleWith(advancedReviewChoices, random)]);
            }
            if (choices.length < 4) return [];
            const englishPrompt = needsEnglishPrompt(item)
                || quizData.some(other => other.id !== item.id && hasAmbiguousTranslation(item, other))
                || random() > 0.5;
            return [{ target: item, options: shuffleWith(choices, random), mode: englishPrompt ? 'en-ch' : 'ch-en' }];
        });
        const questions = shuffleWith(generatedQuestions, random).slice(0, questionLimit);
        if (questions.length === 0) throw new Error('找不到足夠的有效選項');
        return { questions, questionBuildError: '' };
    } catch (error) {
        console.error('Battle question setup failed:', error);
        return { questions: [], questionBuildError: '題目建立失敗，請返回上一頁後重新開始。' };
    }
};
