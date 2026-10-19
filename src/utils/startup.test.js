import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createSingleFlight, observeAuthStartup, getLoginErrorMessage } from './startup.js';
import { createSessionId } from './session-id.js';

test('duplicate login notifications share one pending load', async () => {
    const run = createSingleFlight();
    let finish;
    let loads = 0;
    const first = run('student-1', () => {
        loads += 1;
        return new Promise(resolve => { finish = resolve; });
    });
    const duplicate = run('student-1', () => { throw new Error('must not run'); });
    assert.equal(first, duplicate);
    await Promise.resolve();
    assert.equal(loads, 1);
    finish('loaded');
    assert.equal(await duplicate, 'loaded');
    assert.equal(await run('student-1', () => 'retry'), 'retry');
});

test('failed load can be retried and different users do not share results', async () => {
    const run = createSingleFlight();
    await assert.rejects(run('a', () => { throw new Error('offline'); }), /offline/);
    assert.deepEqual(await Promise.all([run('a', () => 'A'), run('b', () => 'B')]), ['A', 'B']);
});

test('signed-out auth state immediately completes startup; cleanup ignores late events', () => {
    let notify;
    let unsubscribed = false;
    const states = [];
    const stop = observeAuthStartup({
        subscribe: next => { notify = next; return () => { unsubscribed = true; }; },
        onChange: user => states.push(user),
        onFailure: error => assert.fail(error.code)
    });
    notify(null);
    assert.deepEqual(states, [null]);
    stop();
    notify({ uid: 'late' });
    assert.equal(unsubscribed, true);
    assert.deepEqual(states, [null]);
});

test('stalled auth shows a recoverable error and can still recover when connected', async () => {
    let notify;
    let fail;
    const failure = new Promise(resolve => { fail = resolve; });
    const states = [];
    const stop = observeAuthStartup({
        subscribe: next => { notify = next; return () => {}; },
        onChange: user => states.push(user),
        onFailure: fail,
        timeoutMs: 5
    });
    try {
        assert.equal((await failure).code, 'startup/auth-timeout');
        notify({ uid: 'recovered' });
        assert.deepEqual(states, [{ uid: 'recovered' }]);
    } finally { stop(); }
});

test('auth SDK errors are reported instead of leaving a spinner', () => {
    const failure = { code: 'auth/network-request-failed' };
    let reported;
    const stop = observeAuthStartup({
        subscribe: (next, error) => { error(failure); return () => {}; },
        onChange: () => assert.fail('unexpected auth state'),
        onFailure: error => { reported = error; }
    });
    assert.equal(reported, failure);
    stop();
    assert.match(getLoginErrorMessage({ code: 'auth/popup-blocked' }), /彈出式視窗/);
    assert.match(getLoginErrorMessage(failure), /網路/);
});

test('session IDs work without randomUUID and retain UUID v4 format and uniqueness', () => {
    const olderCrypto = { getRandomValues: bytes => globalThis.crypto.getRandomValues(bytes) };
    const ids = Array.from({ length: 1000 }, () => createSessionId(olderCrypto));
    assert.equal(new Set(ids).size, 1000);
    for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(createSessionId({ randomUUID: () => 'native-id' }), 'native-id');
    assert.throws(() => createSessionId({}), /瀏覽器版本過舊/);
});

const startupHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const fallbackScript = startupHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
const runFallback = (protocol = 'https:') => {
    const elements = { 'startup-message': { textContent: '' }, 'startup-retry': { hidden: true } };
    const callbacks = {};
    vm.runInNewContext(fallbackScript, {
        document: { getElementById: id => elements[id] },
        window: { location: { protocol }, addEventListener: (event, handler) => { callbacks[event] = handler; } },
        setTimeout: fn => { callbacks.timeout = fn; }
    });
    return { elements, callbacks };
};

test('failed or stalled bundle download leaves a visible retry option', () => {
    for (const event of ['timeout', 'error']) {
        const { elements, callbacks } = runFallback();
        callbacks[event]({ target: { tagName: 'SCRIPT' } });
        assert.equal(elements['startup-retry'].hidden, false);
        assert.match(elements['startup-message'].textContent, /重新載入/);
    }
});

test('startup fallback does not touch an already rendered app and explains local HTML files', () => {
    const { elements, callbacks } = runFallback();
    delete elements['startup-message'];
    delete elements['startup-retry'];
    assert.doesNotThrow(() => callbacks.timeout());
    assert.match(runFallback('file:').elements['startup-message'].textContent, /網站連結/);
});
