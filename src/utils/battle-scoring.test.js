import test from 'node:test';
import assert from 'node:assert/strict';
import { getBattleAnswerScore } from './battle-scoring.js';
import { getPhraseGrade } from './phrase-library.js';
import { getArenaRoundScore } from './arena-scoring.js';

test('每種題目共用遞減曲線，剩一秒答對得 17 分', () => {
    for (const [secondsLeft, expected] of [[7, 100], [6, 100], [5, 84], [4, 67], [3, 50], [2, 34], [1, 17], [0.1, 2], [0.01, 1]]) {
        assert.equal(getBattleAnswerScore({ secondsLeft }), expected);
    }
});

test('到期、答錯與無效時間為零分；滿分不超過一百分', () => {
    for (const secondsLeft of [0, -1, NaN, Infinity]) assert.equal(getBattleAnswerScore({ secondsLeft }), 0);
    assert.equal(getBattleAnswerScore({ secondsLeft: 7, isCorrect: false }), 0);
    assert.equal(getBattleAnswerScore({ secondsLeft: 8 }), 100);
});

test('未到期分數隨時間遞減，保留原本向上取整的計分', () => {
    let previous = 0;
    for (let ms = 1; ms <= 7000; ms++) {
        const score = getBattleAnswerScore({ secondsLeft: ms / 1000 });
        assert.ok(score >= previous && score >= 1 && score <= 100);
        previous = score;
    }
});

test('慢速全對片語仍是 S；10 題與 20 題換算後同為 340 分', () => {
    for (const plannedQuestions of [10, 20]) {
        const score = plannedQuestions * getBattleAnswerScore({ secondsLeft: 1 });
        assert.equal(getPhraseGrade({ correct: plannedQuestions, total: plannedQuestions }), 'S');
        assert.equal(getArenaRoundScore({ score, plannedQuestions, completed: true }), 340);
    }
});

test('片語通關門檻仍為正確率八成，失敗仍不計聯賽積分', () => {
    assert.equal(getPhraseGrade({ correct: 8, total: 10 }), 'B');
    assert.equal(getPhraseGrade({ correct: 7, total: 10 }), null);
    assert.equal(getArenaRoundScore({ score: 136, plannedQuestions: 10, completed: true, cleared: false }), 0);
});
