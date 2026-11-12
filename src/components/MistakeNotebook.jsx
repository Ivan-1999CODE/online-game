import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Book, CheckCircle, RefreshCw, Skull, Volume2, XCircle } from 'lucide-react';
import { playSound, speakText } from '../utils/audio';
import { createSessionId } from '../utils/session-id';
import {
    buildMistakePracticeQuestions, getMistakeUnits, isPracticeAnswerCorrect, selectMistakes
} from '../utils/mistake-notebook';

const buttonBase = 'rounded border-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-40';
const neutralButton = `${buttonBase} border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700 disabled:hover:bg-gray-800`;
const primaryButton = `${buttonBase} border-teal-500 bg-teal-900 text-teal-50 hover:bg-teal-800 disabled:hover:bg-teal-900`;
const dangerButton = `${buttonBase} border-red-700 bg-red-950 text-red-200 hover:bg-red-900 disabled:hover:bg-red-950`;
const scopeLabels = { main: '一般', adv: '進階', phrases: '片語' };

function ConfirmDialog({ title, children, onCancel, onConfirm, busy, confirmLabel = '確定刪除', error }) {
    const dialogRef = useRef(null);
    useEffect(() => {
        const previousFocus = document.activeElement;
        dialogRef.current?.querySelector('button')?.focus();
        return () => previousFocus?.focus();
    }, []);
    useEffect(() => { if (busy) dialogRef.current?.focus(); }, [busy]);
    const onKeyDown = event => {
        if (event.key === 'Escape' && !busy) onCancel();
        if (event.key !== 'Tab') return;
        const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
        if (!buttons.length) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === buttons[0]) {
            event.preventDefault(); buttons.at(-1).focus();
        } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
            event.preventDefault(); buttons[0].focus();
        }
    };
    return <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 p-3 backdrop-blur-sm">
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="mistake-dialog-title" onKeyDown={onKeyDown}
            className="my-auto max-h-full w-full max-w-sm overflow-y-auto rounded-lg border-2 border-red-700 bg-gray-900 p-4 text-gray-100 shadow-2xl">
            <h3 id="mistake-dialog-title" className="mb-3 text-base font-bold text-red-200">{title}</h3>
            <div className="text-sm leading-relaxed text-gray-300">{children}</div>
            {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button className={neutralButton} onClick={onCancel} disabled={busy}>取消</button>
                <button className={dangerButton} onClick={onConfirm} disabled={busy}>{busy ? '處理中…' : confirmLabel}</button>
            </div>
        </div>
    </div>;
}

function Pronunciation({ entry }) {
    return <button type="button" onClick={() => speakText(entry.word, entry.audio, entry.audioScope)}
        className="rounded p-2 text-gray-300 hover:bg-gray-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        aria-label={`播放 ${entry.word} 發音`}><Volume2 size={17} /></button>;
}

function MistakePractice({ run, mistakeStats, onBack, onRetry, onSavePractice, onReviewStatusChange }) {
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [finished, setFinished] = useState(false);
    const [saveState, setSaveState] = useState('idle');
    const [saveError, setSaveError] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [markedIds, setMarkedIds] = useState([]);
    const [markBusy, setMarkBusy] = useState(false);
    const [markError, setMarkError] = useState('');
    const [notice, setNotice] = useState('');
    const [showQuit, setShowQuit] = useState(false);
    const answerLock = useRef(false);
    const saveLock = useRef(false);
    const savePracticeRef = useRef(onSavePractice);
    const markLock = useRef(false);
    const submission = useRef(null);
    const headingRef = useRef(null);
    const contentRef = useRef(null);
    const question = run.questions[index];
    const correctRows = run.questions.filter(q => answers.some(item => item.id === q.target.id && item.isCorrect));
    const wrongRows = run.questions.filter(q => answers.some(item => item.id === q.target.id && !item.isCorrect));
    const remainingCorrect = correctRows.filter(q => !markedIds.includes(q.target.id));
    const busy = saveState === 'saving' || markBusy;

    useEffect(() => {
        headingRef.current?.focus();
        if (contentRef.current) contentRef.current.scrollTop = 0;
    }, [index, finished]);

    // Keep the latest save handler without restarting the answer's advance timer
    // when unrelated parent state (such as music volume) changes.
    useEffect(() => {
        savePracticeRef.current = onSavePractice;
    }, [onSavePractice]);

    const recordAnswer = value => {
        if (answerLock.current || feedback || finished || showQuit) return;
        answerLock.current = true;
        const isCorrect = isPracticeAnswerCorrect(question, value);
        setAnswer(value);
        setFeedback({ isCorrect });
        setAnswers(previous => [...previous, { id: question.target.id, isCorrect }]);
        playSound(isCorrect ? 'correct' : 'wrong');
    };

    const saveResults = useCallback(async payload => {
        if (saveLock.current) return;
        saveLock.current = true;
        setSaveState('saving');
        setSaveError('');
        try {
            if (!savePracticeRef.current) throw new Error('missing-save-handler');
            await savePracticeRef.current(payload);
            setSaveState('saved');
        } catch {
            setSaveState('error');
            setSaveError('練習結果尚未儲存。請確認連線後重試，單字仍保留在筆記本。');
        } finally { saveLock.current = false; }
    }, []);

    // One selection per question, then advance automatically. The latest render
    // includes the final answer; cleanup pauses on the quit dialog and cancels
    // advancement when this run is unmounted.
    useEffect(() => {
        if (!feedback || finished || showQuit) return;
        const timer = setTimeout(() => {
            if (index < run.questions.length - 1) {
                setIndex(current => current + 1);
                setAnswer('');
                setFeedback(null);
                answerLock.current = false;
                return;
            }
            if (submission.current) return;
            const payload = { sessionId: run.id, answers, completedAt: new Date().toISOString() };
            submission.current = payload;
            setSelectedIds(answers.filter(item => item.isCorrect).map(item => item.id));
            setFinished(true);
            saveResults(payload);
        }, 650);
        return () => clearTimeout(timer);
    }, [feedback, finished, showQuit, index, answers, run, saveResults]);

    const markFamiliar = async () => {
        if (markLock.current || saveState !== 'saved' || selectedIds.length === 0) return;
        markLock.current = true;
        setMarkBusy(true); setMarkError(''); setNotice('');
        const requestedIds = [...selectedIds];
        try {
            if (!onReviewStatusChange) throw new Error('missing-review-handler');
            const result = await onReviewStatusChange(requestedIds, 'familiar', { correctSessionId: run.id });
            const updatedIds = Array.isArray(result?.updatedIds) ? result.updatedIds : requestedIds;
            setMarkedIds(previous => [...new Set([...previous, ...updatedIds])]);
            setSelectedIds(previous => previous.filter(id => !updatedIds.includes(id)));
            setNotice(updatedIds.length ? `已將 ${updatedIds.length} 筆單字標記為已熟悉。` : '這些單字的紀錄已更新，請返回筆記本查看最新狀態。');
        } catch (error) {
            setMarkError(error?.message?.startsWith('部分單字')
                ? error.message : '尚未標記成功，請確認連線後再試。');
        } finally { markLock.current = false; setMarkBusy(false); }
    };

    const retryWrong = () => {
        const entries = wrongRows.map(q => ({ ...q.target, ...mistakeStats[q.target.id], id: q.target.id }))
            .filter(entry => mistakeStats[entry.id] && entry.reviewStatus !== 'familiar');
        if (entries.length) onRetry(entries, `${run.label}・答錯的單字`);
        else { setNotice('本次答錯的單字已不在待複習清單，請返回筆記本查看。'); }
    };

    const handleBack = () => {
        if (busy) return;
        if (finished && saveState === 'saved') onBack();
        else setShowQuit(true);
    };

    return <div className="relative flex h-full min-h-0 flex-col bg-gray-950 text-gray-100" style={{ colorScheme: 'dark' }}>
        <header className="flex shrink-0 items-center gap-2 border-b-2 border-teal-800 bg-gray-900 p-3">
            <button className={`${neutralButton} shrink-0 px-2`} aria-label="返回錯題筆記本" onClick={handleBack} disabled={busy}><ArrowLeft size={18} /></button>
            <div className="min-w-0 flex-1">
                <h2 ref={headingRef} tabIndex={-1} className="text-base font-bold text-teal-200 focus:outline-none">{finished ? '練習完成' : '錯題練習'}</h2>
                <p className="break-words text-xs text-gray-300">{run.label}</p>
            </div>
            <span className="shrink-0 text-xs text-gray-300">{finished ? run.questions.length : index + 1} / {run.questions.length}</span>
        </header>

        <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {!finished ? <>
                <div className="mb-3 h-1 rounded bg-gray-800" aria-hidden="true"><div className="h-full rounded bg-teal-500" style={{ width: `${index / run.questions.length * 100}%` }} /></div>
                <p className="mb-2 text-xs text-gray-400">{question.mode === 'spelling' ? '請依中文輸入英文' : '請選出正確的中文意思'}</p>
                <div className="mb-4 break-words rounded-lg border-2 border-gray-700 bg-gray-900 px-4 py-6 text-center">
                    <p className="text-2xl font-bold leading-relaxed text-white">{question.mode === 'spelling' ? question.target.chinese : question.target.word}</p>
                </div>
                {question.mode === 'spelling' ? <form onSubmit={event => { event.preventDefault(); if (answer.trim()) recordAnswer(answer); }} className="space-y-3">
                    <label className="block text-sm text-gray-300" htmlFor="mistake-spelling-answer">英文答案</label>
                    <input id="mistake-spelling-answer" value={answer} onChange={event => setAnswer(event.target.value)} disabled={Boolean(feedback)}
                        autoComplete="off" autoCapitalize="none" spellCheck={false}
                        className="w-full rounded border-2 border-gray-600 bg-gray-900 p-3 text-base text-white focus:border-teal-400 focus:outline-none disabled:opacity-60" />
                    <button type="submit" className={`${primaryButton} w-full`} disabled={Boolean(feedback) || !answer.trim()}>送出答案</button>
                </form> : <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                        const correct = feedback && option.id === question.target.id;
                        const wrongSelection = feedback && !feedback.isCorrect && option.id === answer;
                        return <button key={option.id} disabled={Boolean(feedback)} onClick={() => recordAnswer(option.id)}
                            className={`${buttonBase} flex w-full items-start gap-3 text-left disabled:opacity-100 ${correct ? 'border-teal-400 bg-teal-950 text-teal-100' : wrongSelection ? 'border-red-400 bg-red-950 text-red-100' : 'border-gray-700 bg-gray-900 text-gray-100 hover:border-gray-400 disabled:hover:border-gray-700'}`}>
                            <span className="shrink-0 text-gray-400">{String.fromCharCode(65 + optionIndex)}.</span><span className="min-w-0 break-words">{option.chinese}</span>
                            {correct && <CheckCircle size={17} className="ml-auto shrink-0 text-teal-300" />}
                            {wrongSelection && <XCircle size={17} className="ml-auto shrink-0 text-red-300" />}
                        </button>;
                    })}
                </div>}
                <div className="mt-3 min-h-14 text-sm" role="status" aria-live="polite">
                    {feedback && <p className={`break-words font-bold ${feedback.isCorrect ? 'text-teal-300' : 'text-red-300'}`}>
                        {feedback.isCorrect ? '答對了！' : `正確答案：${question.mode === 'spelling' ? question.target.word : question.target.chinese}`}
                    </p>}
                </div>
            </> : <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded border border-teal-800 bg-teal-950/50 p-3"><p className="text-2xl font-bold text-teal-300">{correctRows.length}</p><p className="text-sm text-teal-100">本次答對</p></div>
                    <div className="rounded border border-red-800 bg-red-950/40 p-3"><p className="text-2xl font-bold text-red-300">{wrongRows.length}</p><p className="text-sm text-red-100">仍需複習</p></div>
                </div>
                <p className="text-sm leading-relaxed text-gray-300">所有單字都已保留。你可以將這次答對、也確定記住的單字標記為「已熟悉」。</p>
                <div role="status" className="text-xs text-gray-400">{saveState === 'saving' ? '正在儲存練習結果…' : saveState === 'saved' ? '練習結果已儲存' : ''}</div>
                {saveError && <div role="alert" className="rounded border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
                    <p>{saveError}</p><button className={`${neutralButton} mt-2`} disabled={busy} onClick={() => saveResults(submission.current)}>重試儲存</button>
                </div>}
                {correctRows.length > 0 && <section className="rounded border border-gray-700 bg-gray-900 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-teal-200">本次答對的單字</h3>
                        {remainingCorrect.length > 0 && <button className="rounded p-1 text-xs text-teal-300 underline focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40"
                            disabled={busy || saveState !== 'saved'} onClick={() => setSelectedIds(selectedIds.length === remainingCorrect.length ? [] : remainingCorrect.map(q => q.target.id))}>
                            {selectedIds.length === remainingCorrect.length ? '取消全選' : '全選'}
                        </button>}
                    </div>
                    <div className="divide-y divide-gray-800">
                        {correctRows.map(({ target }) => <label key={target.id} className="flex cursor-pointer items-start gap-3 py-3">
                            <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                                checked={selectedIds.includes(target.id) || markedIds.includes(target.id)} disabled={busy || saveState !== 'saved' || markedIds.includes(target.id)}
                                onChange={event => setSelectedIds(previous => event.target.checked ? [...previous, target.id] : previous.filter(id => id !== target.id))} />
                            <span className="min-w-0 flex-1"><span className="block break-words text-sm text-white">{target.word}</span><span className="block break-words text-xs text-gray-400">{target.chinese}</span></span>
                            {markedIds.includes(target.id) && <span className="shrink-0 text-xs text-teal-300">已熟悉</span>}
                        </label>)}
                    </div>
                    <button className={`${primaryButton} mt-2 w-full`} disabled={busy || saveState !== 'saved' || selectedIds.length === 0} onClick={markFamiliar}>
                        {markBusy ? '正在標記…' : `標記為已熟悉（${selectedIds.length}）`}
                    </button>
                    {markError && <p role="alert" className="mt-2 text-sm text-red-300">{markError}</p>}
                </section>}
                {wrongRows.length > 0 && <section className="rounded border border-gray-700 bg-gray-900 p-3">
                    <h3 className="mb-2 text-sm font-bold text-red-200">需要再練的單字</h3>
                    {wrongRows.map(({ target }) => <div key={target.id} className="flex items-center gap-2 border-t border-gray-800 py-2">
                        <div className="min-w-0 flex-1"><p className="break-words text-sm">{target.word}</p><p className="break-words text-xs text-gray-400">{target.chinese}</p></div><Pronunciation entry={target} />
                    </div>)}
                    <button className={`${neutralButton} mt-2 w-full`} disabled={busy || saveState !== 'saved'} onClick={retryWrong}>再練答錯的（{wrongRows.length}）</button>
                </section>}
                {notice && <p role="status" className="text-sm text-teal-200">{notice}</p>}
                <button className={`${neutralButton} w-full`} disabled={busy} onClick={handleBack}>返回筆記本</button>
            </div>}
        </div>
        {showQuit && <ConfirmDialog title={finished ? '離開尚未儲存的結果？' : '先結束這次練習？'} onCancel={() => setShowQuit(false)} onConfirm={onBack} confirmLabel="返回筆記本">
            <p>{finished ? '這次作答結果尚未儲存，離開後無法從此處重試儲存。' : '這次練習尚未完成，離開後不會儲存這次的作答結果。'}筆記本中的單字都會保留。</p>
        </ConfirmDialog>}
    </div>;
}

export default function MistakeNotebook({ onBack, mistakeStats = {}, onClearFamiliarMistakes, onRemoveMistake, onReviewStatusChange, onSavePractice, optionPool = [] }) {
    const [scope, setScope] = useState('main');
    const [unit, setUnit] = useState('all');
    const [run, setRun] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const operationLock = useRef(false);
    const scopeLabel = scopeLabels[scope];
    const units = getMistakeUnits(mistakeStats, scope);
    const entries = selectMistakes(mistakeStats, { scope, unit, status: 'all' });
    const pendingEntries = selectMistakes(mistakeStats, { scope, unit, status: 'pending' });
    const familiarEntries = selectMistakes(mistakeStats, { scope, unit, status: 'familiar' });
    const unitLabel = unit === 'all' ? (scope === 'phrases' ? '全部群組' : '全部課程') : units.find(item => item.value === unit)?.label || (scope === 'adv' ? `第 ${unit} 課` : unit);

    const changeScope = next => { setScope(next); setUnit('all'); setError(''); setNotice(''); playSound('click'); };
    const startPractice = (selectedEntries, label = `${scopeLabel}・${unitLabel}`) => {
        setError(''); setNotice('');
        try {
            const questions = buildMistakePracticeQuestions(selectedEntries, optionPool);
            if (questions.length !== selectedEntries.length) {
                setError('此範圍有單字缺少英文或中文資料，暫時無法完整練習。請先檢查或移除資料不完整的紀錄。');
                return;
            }
            if (!questions.length) { setError('目前範圍沒有可練習的待複習單字。'); return; }
            setRun({ id: createSessionId(), questions, label });
            playSound('click');
        } catch { setError('無法開始練習，請稍後重試。'); }
    };

    const performOperation = async action => {
        if (operationLock.current) return;
        operationLock.current = true; setBusy(true); setError(''); setNotice('');
        try { await action(); setConfirmation(null); }
        catch { setError('變更尚未儲存，請確認連線後再試。'); }
        finally { operationLock.current = false; setBusy(false); }
    };

    if (run) return <MistakePractice key={run.id} run={run} mistakeStats={mistakeStats} onBack={() => setRun(null)} onRetry={startPractice}
        onSavePractice={onSavePractice} onReviewStatusChange={onReviewStatusChange} />;

    return <div className="relative flex h-full min-h-0 flex-col bg-gray-950 text-gray-100" style={{ colorScheme: 'dark' }}>
        <header className="shrink-0 border-b-2 border-red-900 bg-gradient-to-b from-red-950 to-gray-950 p-3">
            <div className="flex items-center gap-3">
                <button className={`${neutralButton} shrink-0 px-2`} onClick={onBack} aria-label="返回地圖" disabled={busy}><ArrowLeft size={18} /></button>
                <div className="min-w-0 flex-1"><h2 className="flex items-center gap-2 text-lg font-bold text-red-200"><Book size={20} />錯題筆記本</h2><p className="mt-1 text-xs text-gray-300">選擇課別，直接開始練習</p></div>
            </div>
        </header>
        <div className="grid shrink-0 grid-cols-3 border-b border-gray-800" aria-label="錯題分類">
            {Object.entries(scopeLabels).map(([value, label]) => <button key={value} aria-pressed={scope === value} disabled={busy} onClick={() => changeScope(value)}
                className={`min-w-0 border-b-2 px-1 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 ${scope === value ? 'border-red-400 bg-red-950 text-red-100' : 'border-transparent text-gray-400 hover:bg-gray-900 hover:text-white'}`}>{label}錯題</button>)}
        </div>
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-gray-800 p-2" aria-label="課別篩選">
            {[{ value: 'all', label: scope === 'phrases' ? '全部群組' : '全部課程' }, ...units].map(item => <button key={item.value} aria-pressed={unit === item.value} disabled={busy}
                onClick={() => { setUnit(item.value); setNotice(''); setError(''); }}
                className={`shrink-0 rounded border px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${unit === item.value ? 'border-red-400 bg-red-950 text-red-100' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}`}>{item.label}</button>)}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mb-4">
                <button className={`${primaryButton} flex w-full items-center justify-center gap-2 py-3 font-bold`} disabled={pendingEntries.length === 0 || busy} onClick={() => startPractice(pendingEntries)}>
                    <RefreshCw size={16} />開始練習（{pendingEntries.length} 個單字）
                </button>
                <p className="mt-2 text-xs text-gray-400">範圍：{scopeLabel}・{unitLabel}，已熟悉的單字會略過。</p>
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-emerald-300"><CheckCircle size={14} className="mt-0.5 shrink-0" />綠勾表示已熟悉，點一下可重新加入練習。</p>
                {entries.length > 0 && pendingEntries.length === 0 && <p className="mt-2 text-sm text-teal-200">這個範圍的單字都已熟悉！紀錄會繼續保留在下方。</p>}
            </div>
            {error && !confirmation && <p role="alert" className="mb-3 rounded border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
            {notice && <p role="status" className="mb-3 text-sm text-teal-200">{notice}</p>}
            {entries.length === 0 ? <div className="flex min-h-40 flex-col items-center justify-center gap-3 py-8 text-center">
                <CheckCircle size={44} className="text-teal-500" />
                <p className="text-sm text-gray-200">目前範圍沒有錯題單字</p>
                <p className="text-xs text-gray-400">可切換其他課別，或查看全部課程。</p>
                {unit !== 'all' && <button className={neutralButton} onClick={() => setUnit('all')}>查看{scope === 'phrases' ? '全部群組' : '全部課程'}</button>}
            </div> : <div className="space-y-3">
                {entries.map(entry => <article key={entry.id} className={`flex items-stretch justify-between gap-3 rounded-lg border bg-gray-900 p-3 ${entry.reviewStatus === 'familiar' ? 'border-emerald-800' : 'border-red-900'}`}>
                    <div className="min-w-0 flex-1">
                        <h3 className="break-words text-xl font-bold text-white">{entry.word}</h3>
                        <p className="mt-1 break-words text-sm leading-relaxed text-gray-300">{entry.chinese}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                            <span>{scope === 'adv' ? `第 ${entry.lesson} 課` : scope === 'phrases' ? entry.groupTitle || entry.groupId : entry.gameUnitId ? `Unit ${entry.gameUnitId}` : '未分類'}</span>
                            <span className="flex items-center gap-1"><Skull size={12} />累計答錯 {entry.count} 次</span>
                            {entry.lastPracticeCorrect === true && entry.reviewStatus !== 'familiar' && <span className="text-teal-300">上次練習答對</span>}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-2">
                        <Pronunciation entry={entry} />
                        {entry.reviewStatus === 'familiar' && <button className="rounded p-2 text-emerald-400 hover:bg-emerald-950 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-40"
                            aria-label={`${entry.word} 已熟悉，點一下重新加入練習`} title="已熟悉，點一下重新加入練習" disabled={busy} onClick={() => performOperation(async () => {
                            if (!onReviewStatusChange) throw new Error('missing-review-handler');
                            await onReviewStatusChange([entry.id], 'pending'); setNotice(`已將 ${entry.word} 重新加入練習。`);
                        })}><CheckCircle size={19} /></button>}
                        <button className="mt-auto rounded px-2 py-1 text-xs text-red-300 hover:bg-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-40" disabled={busy}
                            aria-label={`刪除 ${entry.word}`} onClick={() => { setError(''); setConfirmation({ type: 'remove', entry }); }}>刪除</button>
                    </div>
                </article>)}
            </div>}
            {entries.length > 0 && <div className="mt-5 border-t border-gray-800 pt-4">
                <button className="w-full rounded p-2 text-xs text-gray-400 hover:bg-red-950 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400" disabled={busy || familiarEntries.length === 0}
                    onClick={() => {
                        setError('');
                        setConfirmation({ type: 'clear-familiar', scope, unit, label: `${scopeLabel}・${unitLabel}`, ids: familiarEntries.map(entry => entry.id) });
                    }}>清空已熟悉的字（{familiarEntries.length}）</button>
                <p className="mt-1 text-center text-xs text-gray-500">{familiarEntries.length ? '只清除目前範圍內的綠勾單字。' : '目前範圍沒有已熟悉的字。'}</p>
            </div>}
        </div>
        {confirmation && <ConfirmDialog title={confirmation.type === 'remove' ? `刪除「${confirmation.entry.word}」？` : '清空已熟悉的字？'}
            busy={busy} error={error} onCancel={() => { setConfirmation(null); setError(''); }} onConfirm={() => performOperation(async () => {
                if (confirmation.type === 'remove') { if (!onRemoveMistake) throw new Error('missing-remove-handler'); await onRemoveMistake(confirmation.entry.id); }
                else {
                    if (!onClearFamiliarMistakes) throw new Error('missing-clear-handler');
                    await onClearFamiliarMistakes(confirmation.scope, confirmation.unit, confirmation.ids);
                    setNotice('已整理選定的已熟悉單字，還需要練習的單字已保留。');
                }
            })} confirmLabel={confirmation.type === 'remove' ? '確定刪除' : '確定清空'}>
            {confirmation.type === 'remove' ? <p>這筆單字及累計錯題紀錄將永久刪除，無法復原。若只是記熟了，可以先保留紀錄。</p>
                : <p>將刪除「{confirmation.label}」範圍內已熟悉的 {confirmation.ids.length} 個單字。還需要練習的單字會保留，此操作無法復原。</p>}
        </ConfirmDialog>}
    </div>;
}
