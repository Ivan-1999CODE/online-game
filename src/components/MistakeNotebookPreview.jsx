import React, { useRef, useState } from 'react';
import MistakeNotebook from './MistakeNotebook.jsx';
import { getMistakeNotebookUpdates } from '../utils/mistake-notebook-service.js';

const initialMistakes = {
    apple: { word: 'apple', chinese: '蘋果', count: 2, gameUnitId: 1 },
    book: { word: 'book', chinese: '書本', count: 1, gameUnitId: '2' },
    river: { word: 'river', chinese: '河流', count: 3, gameUnitId: 2 },
    tree: { word: 'tree', chinese: '樹木', count: 1, gameUnitId: 2, reviewStatus: 'familiar' },
    'advanced:2:hope': { word: 'hope', chinese: '希望', count: 2, source: 'advanced', lesson: 2 },
    'advanced:3:hope': { word: 'hope', chinese: '希望', count: 1, source: 'advanced', lesson: 3 },
    'advanced:3:future': { word: 'future', chinese: '未來', count: 1, source: 'advanced', lesson: 3 },
    'phrases:g1:get-up': { word: 'get up', chinese: '起床', count: 2, source: 'phrases', groupId: 'g1', groupTitle: '日常生活' },
    'phrases:g2:look-for': { word: 'look for', chinese: '尋找', count: 1, source: 'phrases', groupId: 'g2', groupTitle: '常用動作' }
};

// Development-only fixture: exercises the real notebook without signing in or
// modifying a student's cloud records. This module is omitted from production.
export default function MistakeNotebookPreview() {
    const [data, setData] = useState({ mistakeStats: initialMistakes });
    const [failNext, setFailNext] = useState(false);
    const dataRef = useRef(data);
    const change = async action => {
        if (failNext) {
            setFailNext(false);
            throw new Error('測試儲存失敗，請重試。');
        }
        const updates = getMistakeNotebookUpdates(dataRef.current, action);
        dataRef.current = { ...dataRef.current, ...updates };
        setData(dataRef.current);
        return dataRef.current.mistakeStats;
    };
    return <main className="mx-auto w-full max-w-md p-2 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-200">
            <span>錯題練習測試</span>
            <button className="border border-gray-500 px-2 py-1" onClick={() => setFailNext(true)}>
                {failNext ? '下次儲存將失敗' : '模擬下次儲存失敗'}
            </button>
        </div>
        <div className="relative h-[min(760px,90dvh)] min-h-[420px] overflow-hidden rounded-lg border-4 border-gray-700">
            <MistakeNotebook mistakeStats={data.mistakeStats} onBack={() => {}}
                optionPool={Object.entries(initialMistakes).map(([id, item]) => ({ ...item, id }))}
                onSavePractice={result => change({ type: 'practice', result })}
                onReviewStatusChange={(ids, status, options = {}) => change({
                    type: 'status', ids, status, correctSessionId: options.correctSessionId,
                    changedAt: new Date().toISOString()
                })}
                onRemoveMistake={id => change({ type: 'remove', ids: [id] })}
                onClearFamiliarMistakes={(scope, unit, ids) => change({ type: 'clear-familiar', scope, unit, ids })}
            />
        </div>
    </main>;
}
