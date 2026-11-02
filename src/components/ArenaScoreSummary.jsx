import React from 'react';
import { ARENA_PROMOTION_REQUIREMENTS, arenaDateKey } from '../utils/arena-scoring';

export default function ArenaScoreSummary({ stats, tier, nowMs, rank }) {
    const today = stats.daily.find(day => day.date === arenaDateKey(nowMs));
    const requirement = ARENA_PROMOTION_REQUIREMENTS[tier] || ARENA_PROMOTION_REQUIREMENTS.unranked;
    const minimum = today?.selected.length === 5 ? today.selected[4].arenaScore : null;
    const countedByDate = new Map(stats.selectedDays.map(day => [day.date, day]));
    const weekly25 = stats.scoringVersion >= 3;
    return <section className="border-2 border-cyan-700 bg-slate-950/70 p-3 space-y-3 font-retro text-xs" aria-label="競技積分明細">
        <div className="text-cyan-200 font-bold">通關才計分 · 每日最高 5 回 · {weekly25 ? '每週最高 25 回' : '每週最高 5 天'}</div>
        {weekly25 && <p className="text-gray-300">整週 7 天都能累積。每天先取最高 5 回，再取全週最高 25 回；滿額後以較高分替換。</p>}
        <p className="text-gray-300">10 題成績 × 2；20 題維持原分數。每回最高 2,000 分。</p>
        <div className="text-white">今日最高 {today?.score || 0}／10,000 分 · 入選 {today?.selected.length || 0}／5 回</div>
        <div className="flex flex-wrap gap-2" aria-label="今日最高五回">
            {today?.selected.map((attempt, index) => <span className="px-2 py-1 bg-cyan-950 border border-cyan-700" key={attempt.id}>
                #{index + 1} · {attempt.arenaScore} 分
            </span>)}
        </div>
        {minimum !== null && <p className="text-cyan-300">{minimum === 2000 ? '今天已取得滿分！' : `超過 ${minimum} 分，就能提高今日積分。`}</p>}
        <div className="text-white">本週 {stats.score.toLocaleString()}／50,000 分 · 通關 {stats.sessions} 回 · 練習 {stats.practiceSessions} 回</div>
        {weekly25 && <p className="text-cyan-300">本週已採計 {stats.countedSessions}／25 回{stats.countedSessions < 25
            ? `，還可累積 ${25 - stats.countedSessions} 回（每天最多 5 回）。`
            : '，更高的入選成績可替換較低分。'}</p>}
        <div className="space-y-1" aria-label="本週採計日">
            {[...stats.daily].sort((a, b) => a.date.localeCompare(b.date)).map(day => {
                const counted = countedByDate.get(day.date);
                return <div className="flex justify-between gap-2" key={day.date}>
                    <span>{day.date.slice(5)} {weekly25 ? `採計 ${counted?.selected.length || 0} 回`
                        : counted ? '✓ 採計' : '未進前 5 天'}</span>
                    <span>{weekly25 ? counted?.score || 0 : day.score} 分</span>
                </div>;
            })}
        </div>
        {weekly25 && <p className="text-gray-400">當天有效通關 1 回就算參賽 1 天；成績未入選或被替換，參賽天數仍保留。</p>}
        {tier === 'warlord' ? <p className="text-amber-300">已達戰神，繼續爭取每週名次。</p> : <div className="border-t border-cyan-800 pt-2 text-amber-200">
            <p>{tier === 'unranked' ? '首次定級條件' : '晉級條件：前 2 名＋分數與參賽天數達標'}</p>
            <p>週積分 {stats.score.toLocaleString()}／{requirement.score.toLocaleString()} · 參賽 {stats.activeDays}／{requirement.days} 天</p>
            {tier !== 'unranked' && <p>目前第 {rank || '—'} 名；符合條件後於週結算升階。</p>}
        </div>}
        <p className="text-gray-400">連續 7 天未登入降一階。聯賽可能包含系統陪練對手。</p>
    </section>;
}
