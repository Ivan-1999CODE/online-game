import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { loadQuizComponents } from '../../scripts/test-helpers/load-quiz-components.mjs';
import { createSeededRandom } from './phrase-library.js';

const { BattleMode, StudyMode, PhraseGroupStudy, MistakePractice, audioCalls } = await loadQuizComponents();
const words = Array.from({ length: 24 }, (_, index) => ({
    id: `word-${index}`, word: `word${index}`, chinese: `中文${index}`,
    book: 1, unit: 1, audioScope: 'test', groupId: 'group-1', partId: 'part-1'
}));
const textOf = node => typeof node === 'string' || typeof node === 'number'
    ? String(node) : (node?.children || []).map(textOf).join('');
const buttons = renderer => renderer.root.findAllByType('button');
const button = (renderer, text) => buttons(renderer).find(node => textOf(node).includes(text));
const click = node => {
    assert.ok(node, 'expected button exists');
    assert.ok(!node.props.disabled, 'expected button is enabled');
    act(() => node.props.onClick({ stopPropagation() {} }));
};
const optionButtons = renderer => buttons(renderer).filter(node => node.props.className?.includes('h-14 border-4'));
const wave = renderer => renderer.root.findAllByType('div').map(textOf).find(text => /^WAVE \d+\/\d+$/.test(text));
const timer = renderer => renderer.root.findAllByType('span').map(textOf).find(text => /^\d\.\ds$/.test(text));
const currentQuestion = renderer => ({
    question: renderer.root.findAllByType('h3').map(textOf),
    options: optionButtons(renderer).map(textOf),
    wave: wave(renderer),
    hearts: renderer.root.findAllByType('svg').filter(node => node.props.className?.includes('lucide-heart')).map(node => node.props.fill),
    score: renderer.root.findAllByType('div').filter(node => node.props.className?.includes('text-rpg-accent text-lg flex')).map(textOf)
});

function setup(t) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'], now: 100000 });
    t.mock.method(Math, 'random', createSeededRandom(123));
    audioCalls.length = 0;
    let renderer;
    t.after(() => { if (renderer) act(() => renderer.unmount()); });
    return {
        mount: element => { act(() => { renderer = TestRenderer.create(element); }); return renderer; },
        tick: ms => act(() => t.mock.timers.tick(ms))
    };
}

const modes = [
    ['一般困難', {}], ['一般簡單', { difficulty: 'easy' }],
    ['進階 10 題', { questionLimit: 10, requiresPassingGrade: true }],
    ['BOSS', { isBoss: true }],
    ['一般終極試煉', { isChallenge: true }],
    ['進階終極試煉', { isChallenge: true, requiresPassingGrade: true }],
    ['片語關卡', { isPhrase: true, questionLimit: 10 }],
    ['片語終極試煉', { isPhrase: true, isChallenge: true }]
];
const styles = [['standard', '標準模式'], ['simple', '簡易模式'], ['listening', '聽力模式']];

for (const [name, modeProps] of modes) {
    for (const [style, styleLabel] of styles) {
        test(`${name} / ${style}: mute, volume and background rerenders preserve questions and deadline`, t => {
            const clock = setup(t);
            const count = modeProps.questionLimit || 20;
            const source = modeProps.isPhrase ? words.slice(0, count) : words;
            const props = { quizData: source, optionPool: modeProps.isPhrase ? words : null,
                onComplete() {}, onFlee() {}, ...modeProps };
            const renderer = clock.mount(React.createElement(BattleMode, { ...props, key: 'run' }));
            click(button(renderer, styleLabel));
            click(button(renderer, 'FIGHT!'));
            const before = currentQuestion(renderer);
            assert.equal(before.options.length, 4);
            assert.equal(before.wave, `WAVE 1/${count}`);
            if (style === 'listening') assert.ok(before.options.every(value => value.startsWith('中文')));
            const spoken = audioCalls.length;
            assert.equal(spoken, style === 'standard' ? 0 : 1);
            clock.tick(1200);
            assert.equal(timer(renderer), '5.8s');

            // Each UI/background state change can supply new random arrays and
            // new callbacks, just like App's existing renderContent path.
            for (const event of ['mute', 'unmute', 'volume', 'activity-sync']) {
                act(() => renderer.update(React.createElement(BattleMode, {
                    ...props, quizData: source.slice().reverse().map(item => ({ ...item })),
                    optionPool: props.optionPool?.slice().reverse(),
                    arenaHistory: {}, onComplete() {}, onFlee() {}, key: 'run'
                })));
                assert.deepEqual(currentQuestion(renderer), before, event);
                assert.equal(audioCalls.length, spoken, `${event} must not replay pronunciation`);
                assert.equal(timer(renderer), '5.8s', `${event} must not reset deadline`);
            }
            clock.tick(1000);
            assert.equal(timer(renderer), '4.8s');
        });
    }
}

test('retry remount creates a new session, resets progress and keeps its new question stable', t => {
    const clock = setup(t);
    const props = { quizData: words, isBoss: true, onComplete() {}, onFlee() {} };
    const renderer = clock.mount(React.createElement(BattleMode, { ...props, key: 'first' }));
    click(button(renderer, '標準模式')); click(button(renderer, 'FIGHT!'));
    const first = currentQuestion(renderer);
    click(optionButtons(renderer)[0]);
    clock.tick(1000);
    assert.equal(wave(renderer), 'WAVE 2/20');
    act(() => renderer.update(React.createElement(BattleMode, { ...props, key: 'retry' })));
    assert.ok(button(renderer, 'FIGHT!'));
    click(button(renderer, '聽力模式')); click(button(renderer, 'FIGHT!'));
    assert.equal(wave(renderer), 'WAVE 1/20');
    assert.equal(timer(renderer), '7.0s');
    assert.notDeepEqual(currentQuestion(renderer).options, first.options);
});

test('rerenders during feedback and timeout keep the displayed question and saved answers aligned', async t => {
    const clock = setup(t);
    const saved = [];
    const props = { quizData: words, questionLimit: 2, onComplete: result => saved.push(result), onFlee() {} };
    const renderer = clock.mount(React.createElement(BattleMode, { ...props, key: 'run' }));
    click(button(renderer, '標準模式')); click(button(renderer, 'FIGHT!'));
    const first = currentQuestion(renderer);
    const selected = first.options[0];
    click(optionButtons(renderer)[0]);
    const answered = currentQuestion(renderer);
    act(() => renderer.update(React.createElement(BattleMode, { ...props, quizData: words.slice().reverse(), key: 'run' })));
    assert.deepEqual(currentQuestion(renderer), answered, 'feedback, HP and score must remain attached to the answered question');
    clock.tick(1000);
    const second = currentQuestion(renderer);
    clock.tick(3000);
    act(() => renderer.update(React.createElement(BattleMode, { ...props, quizData: words.slice(), key: 'run' })));
    assert.deepEqual(currentQuestion(renderer), second);
    clock.tick(4000);
    assert.equal(timer(renderer), '0.0s');
    clock.tick(1000);
    await act(async () => button(renderer, 'CONTINUE').props.onClick({ stopPropagation() {} }));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].battleLog.length, 2);
    assert.equal(saved[0].battleLog[0].question, first.question[0]);
    assert.equal(saved[0].battleLog[0].selectedAnswer, selected);
    assert.equal(saved[0].battleLog[1].question, second.question[0]);
    assert.equal(saved[0].battleLog[1].isTimeout, true);
});

const practiceRun = (count = 2) => ({ id: 'practice-1', label: '一般・Unit 1', questions: words.slice(0, count).map(target => ({
    target, mode: 'choice', options: words.slice(0, 4)
})) });
const practiceAnswer = renderer => buttons(renderer).find(node => textOf(node).startsWith('A.'));
const practiceProgress = renderer => renderer.root.findByType('header').findAllByType('span').map(textOf).find(text => /^\d+ \/ \d+$/.test(text));

test('mistake practice advances at 650ms despite new save callback at 400ms', t => {
    const clock = setup(t);
    const props = { run: practiceRun(), mistakeStats: {}, onSavePractice() {}, onBack() {}, onRetry() {} };
    const renderer = clock.mount(React.createElement(MistakePractice, props));
    click(practiceAnswer(renderer));
    clock.tick(400);
    act(() => renderer.update(React.createElement(MistakePractice, { ...props, onSavePractice() {} })));
    clock.tick(250);
    assert.equal(practiceProgress(renderer), '2 / 2');
});

test('last mistake answer saves once at 650ms using the latest callback', async t => {
    const clock = setup(t);
    const oldCalls = [], latestCalls = [];
    const props = { run: practiceRun(1), mistakeStats: {}, onSavePractice: value => oldCalls.push(value), onBack() {}, onRetry() {} };
    const renderer = clock.mount(React.createElement(MistakePractice, props));
    click(practiceAnswer(renderer)); clock.tick(400);
    act(() => renderer.update(React.createElement(MistakePractice, { ...props, onSavePractice: value => latestCalls.push(value) })));
    await act(async () => t.mock.timers.tick(250));
    assert.equal(oldCalls.length, 0);
    assert.equal(latestCalls.length, 1);
    clock.tick(1000);
    assert.equal(latestCalls.length, 1);
});

test('mistake practice still pauses automatic advancement while exit confirmation is open', t => {
    const clock = setup(t);
    const previousDocument = globalThis.document;
    globalThis.document = { activeElement: null };
    t.after(() => { globalThis.document = previousDocument; });
    const props = { run: practiceRun(), mistakeStats: {}, onSavePractice() {}, onBack() {}, onRetry() {} };
    const renderer = clock.mount(React.createElement(MistakePractice, props));
    click(practiceAnswer(renderer)); clock.tick(400);
    click(buttons(renderer).find(node => node.props['aria-label'] === '返回錯題筆記本'));
    clock.tick(1000);
    assert.equal(practiceProgress(renderer), '1 / 2');
    click(button(renderer, '取消')); clock.tick(650);
    assert.equal(practiceProgress(renderer), '2 / 2');
});

test('failed mistake save retries with the latest callback and the same submission', async t => {
    const clock = setup(t);
    let failedPayload;
    const retried = [];
    const props = { run: practiceRun(1), mistakeStats: {}, onBack() {}, onRetry() {},
        onSavePractice: value => { failedPayload = value; throw new Error('offline'); } };
    const renderer = clock.mount(React.createElement(MistakePractice, props));
    click(practiceAnswer(renderer));
    await act(async () => t.mock.timers.tick(650));
    assert.ok(button(renderer, '重試儲存'));
    act(() => renderer.update(React.createElement(MistakePractice, { ...props, onSavePractice: value => retried.push(value) })));
    await act(async () => button(renderer, '重試儲存').props.onClick());
    assert.equal(retried.length, 1);
    assert.equal(retried[0], failedPayload);
});

test('mistake spelling preserves typed input during parent rerenders', t => {
    const clock = setup(t);
    const run = practiceRun(1);
    run.questions[0].mode = 'spelling';
    const props = { run, mistakeStats: {}, onSavePractice() {}, onBack() {}, onRetry() {} };
    const renderer = clock.mount(React.createElement(MistakePractice, props));
    act(() => renderer.root.findByType('input').props.onChange({ target: { value: 'wor' } }));
    act(() => renderer.update(React.createElement(MistakePractice, { ...props, mistakeStats: {}, onSavePractice() {} })));
    assert.equal(renderer.root.findByType('input').props.value, 'wor');
    assert.equal(practiceProgress(renderer), '1 / 1');
});

for (const unitId of [1, 'adv_1']) {
    test(`${unitId}: study card, flip and list selection survive parent rerenders`, t => {
        const clock = setup(t);
        const props = { unitId, categoryId: 'vocab', data: { vocab: words }, onBack() {}, onStartQuiz() {} };
        const renderer = clock.mount(React.createElement(StudyMode, props));
        click(button(renderer, '下一張'));
        const card = renderer.root.findAllByType('div').find(node => node.props.style?.perspective === '1000px');
        act(() => card.props.onClick());
        const before = JSON.stringify(renderer.toJSON());
        act(() => renderer.update(React.createElement(StudyMode, { ...props, data: { vocab: words.slice() }, onBack() {}, onStartQuiz() {} })));
        assert.equal(JSON.stringify(renderer.toJSON()), before);
        assert.equal(renderer.root.findByType('h2').children.join(''), 'word1');
        click(buttons(renderer).find(node => node.props.title === '切換為列表模式'));
        act(() => renderer.update(React.createElement(StudyMode, { ...props, data: { vocab: words.slice() } })));
        assert.equal(renderer.root.findAllByType('h3').length, words.length);
        assert.equal(audioCalls.length, 0);
    });
}

test('phrase study keeps its current card and does not replay audio on parent rerenders', t => {
    const clock = setup(t);
    const props = { group: { id: 'group-1', title: '片語群組', phrases: words }, part: { id: 'part-1', title: '片語篇章' }, onBack() {}, onStartQuiz() {} };
    const renderer = clock.mount(React.createElement(PhraseGroupStudy, props));
    click(button(renderer, '下一張'));
    const before = JSON.stringify(renderer.toJSON());
    act(() => renderer.update(React.createElement(PhraseGroupStudy, { ...props, group: { ...props.group, phrases: words.slice() }, onBack() {}, onStartQuiz() {} })));
    assert.equal(JSON.stringify(renderer.toJSON()), before);
    assert.equal(renderer.root.findByType('h3').children.join(''), 'word1');
    assert.equal(audioCalls.length, 0);
});
