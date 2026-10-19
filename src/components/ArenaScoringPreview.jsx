import React, { useState } from 'react';
import { createSessionId } from '../utils/session-id';
import ArenaScoreSummary from './ArenaScoreSummary';
import { ARENA_V2_START, ARENA_DAY_MS, arenaWeekRange, getArenaWeeklyStats, getArenaRoundScore } from '../utils/arena-scoring';

// Development-only fixture; never authenticates or writes to Firebase.
export default function ArenaScoringPreview() {
    const nowMs = ARENA_V2_START + 4 * ARENA_DAY_MS + 12 * 3600000;
    const [history, setHistory] = useState(() => Array.from({ length: 5 }, (_, day) =>
        [700, 750, 800, 850, 900].map((score, i) => ({ id: `${day}-${i}`, scoringVersion: 2,
            timestamp: new Date(ARENA_V2_START + day * ARENA_DAY_MS + 3600000).toISOString(),
            score, completed: true, plannedQuestions: 10, totalQuestions: 10, correctCount: 10 }))).flat());
    const [last, setLast] = useState(null);
    const add = (plannedQuestions, completed = true) => {
        const attempt = { id: createSessionId(), scoringVersion: 2, timestamp: new Date(nowMs).toISOString(),
            score: plannedQuestions * 95, completed, plannedQuestions, totalQuestions: plannedQuestions,
            correctCount: plannedQuestions };
        setHistory(previous => [...previous, attempt]);
        setLast(attempt);
    };
    return <main className="min-h-screen bg-slate-950 text-white p-4">
        <div className="max-w-md mx-auto space-y-4">
            <h1 className="text-lg font-bold">競技計分第一版 · 本機測試</h1>
            <p className="text-xs text-gray-400">使用測試資料，不會寫入學生帳號。</p>
            <div className="flex flex-wrap gap-2">
                <button className="bg-cyan-800 p-2" onClick={() => add(10)}>通關 10 題・950 分</button>
                <button className="bg-indigo-800 p-2" onClick={() => add(20)}>通關 20 題・1900 分</button>
                <button className="bg-red-900 p-2" onClick={() => add(10, false)}>未通關</button>
            </div>
            {last && <p role="status">本回原始 {last.score} 分 → 排行榜 {getArenaRoundScore(last)} 分</p>}
            <ArenaScoreSummary stats={getArenaWeeklyStats(history, arenaWeekRange(nowMs))} tier="gold" nowMs={nowMs} rank={2} />
        </div>
    </main>;
}
