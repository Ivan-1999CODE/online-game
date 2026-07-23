import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import {
    BarChart3,
    BookOpen,
    Clock,
    History,
    Map,
    Trophy,
    User,
    X
} from "lucide-react";
import { BOSS_INFO, LEVEL_INFO, MAP_STRUCTURE } from "../constants/gameData";

const TOTAL_TASKS = 110; // (16 units * 5 categories) + (6 bosses * 5 clears)
const TASKS_PER_MAIN_NODE = 5;
const ADV_CLEARS_TO_COMPLETE = 3;

const CATEGORY_DEFS = [
    { recordKey: 'vocabA', historyKey: 'vocab_a', label: '單字A' },
    { recordKey: 'vocabB', historyKey: 'vocab_b', label: '單字B' },
    { recordKey: 'equip', historyKey: 'collocation', label: '搭配詞' },
    { recordKey: 'alchemy', historyKey: 'polysemy', label: '多義字' },
    { recordKey: 'scroll', historyKey: 'sentences', label: '句子' }
];

const RANK_COLORS = {
    S: 'text-amber-500',
    A: 'text-orange-500',
    B: 'text-blue-500',
    C: 'text-emerald-500',
    D: 'text-slate-500',
    E: 'text-slate-400',
    '?': 'text-slate-400'
};

const RANK_WEIGHTS = { S: 5, A: 4, B: 3, C: 2, D: 1, E: 0, '?': 0 };

const getRecordDate = (record) => record?.timestamp || record?.date || record?.lastPlayed || null;

const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value?.toDate === 'function') {
        const date = value.toDate();
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        const date = new Date(value.seconds * 1000);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
    const date = toDate(value);
    if (!date) return '尚無紀錄';
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

const formatDateTime = (value) => {
    const date = toDate(value);
    if (!date) return '時間未知';
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getCategoryData = (record = {}, recordKey) => {
    if (record[recordKey] && typeof record[recordKey] === 'object') {
        return {
            score: record[recordKey].score ?? null,
            rank: record[recordKey].grade || record[recordKey].rank || '?'
        };
    }

    const legacyGrade = record[`${recordKey}Grade`];
    const legacyScore = record[`${recordKey}Score`];
    if (legacyGrade || legacyScore !== undefined) {
        return { score: legacyScore ?? null, rank: legacyGrade || '?' };
    }

    // 拆箱前的舊紀錄：單字A/B 沿用原本的 vocab 成績
    if (recordKey === 'vocabA' || recordKey === 'vocabB') {
        return getCategoryData(record, 'vocab');
    }

    return { score: null, rank: '?' };
};

const calculateTotalRank = (record = {}) => {
    let sum = 0;
    let playedCount = 0;

    CATEGORY_DEFS.forEach(({ recordKey }) => {
        const { rank } = getCategoryData(record, recordKey);
        if (rank !== '?') playedCount += 1;
        sum += RANK_WEIGHTS[rank] || 0;
    });

    if (playedCount === 0) return '?';
    const average = Math.ceil(sum / CATEGORY_DEFS.length);
    return ({ 5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D', 0: 'E' })[average] || '?';
};

const getMainNodeProgress = (node, levelRecords = {}) => {
    const record = levelRecords[node.id] || {};
    const completed = node.type === 'boss'
        ? Math.min(Number(record.successCount) || 0, TASKS_PER_MAIN_NODE)
        : CATEGORY_DEFS.filter(({ recordKey }) => {
            const { rank } = getCategoryData(record, recordKey);
            return rank === 'S' || rank === 'A';
        }).length;

    return {
        completed,
        total: TASKS_PER_MAIN_NODE,
        percentage: (completed / TASKS_PER_MAIN_NODE) * 100,
        started: Object.keys(record).length > 0
    };
};

const getMainProgressStats = (levelRecords = {}) => {
    const nodeProgress = MAP_STRUCTURE.map((node) => ({
        node,
        ...getMainNodeProgress(node, levelRecords)
    }));
    const completedTasks = nodeProgress.reduce((sum, item) => sum + item.completed, 0);

    return {
        completedTasks,
        percentage: Math.min((completedTasks / TOTAL_TASKS) * 100, 100),
        startedChapters: nodeProgress.filter(({ node, started }) => node.type !== 'boss' && started).length,
        completedChapters: nodeProgress.filter(({ node, completed }) => node.type !== 'boss' && completed === TASKS_PER_MAIN_NODE).length,
        completedBosses: nodeProgress.filter(({ node, completed }) => node.type === 'boss' && completed === TASKS_PER_MAIN_NODE).length,
        nodeProgress
    };
};

const calculateProgress = (levelRecords) => getMainProgressStats(levelRecords).percentage;

const getCompletedTaskCount = (progress) => Math.round(((progress || 0) / 100) * TOTAL_TASKS);

const getAdvancedQualifiedClears = (record = {}) => Math.max(
    0,
    Number(record.bPlusClears ?? record.clears) || 0
);

const getAdvancedLessons = (levelRecords = {}, advancedMeta = null) => {
    const recordedLessons = Object.keys(levelRecords)
        .map((key) => /^adv_(\d+)$/.exec(String(key)))
        .filter(Boolean)
        .map((match) => Number(match[1]));
    const totalLessons = Math.max(Number(advancedMeta?.totalLessons) || 0, ...recordedLessons, 0);

    return Array.from({ length: totalLessons }, (_, index) => {
        const lesson = index + 1;
        const record = levelRecords[`adv_${lesson}`] || {};
        const qualifiedClears = Math.min(getAdvancedQualifiedClears(record), ADV_CLEARS_TO_COMPLETE);

        return {
            lesson,
            record,
            qualifiedClears,
            isCompleted: qualifiedClears >= ADV_CLEARS_TO_COMPLETE,
            title: advancedMeta?.titles?.[String(lesson)] || `進階單字 第 ${lesson} 課`
        };
    });
};

const getHistoryUnitLabel = (record) => {
    if (record.unit) return record.unit;
    if (Array.isArray(record.units) && record.units.length > 0) {
        return `Level ${record.units.join(', ')}`;
    }
    return record.type === 'quiz' ? '測驗' : '練習';
};

const getHistoryCategoryLabel = (record) => {
    if (record.categoryLabel) return record.categoryLabel;
    const def = CATEGORY_DEFS.find(({ historyKey }) => historyKey === record.categoryKey);
    return def?.label || '';
};

const getBossStatusLabel = (status) => {
    if (status === 'COMPLETE') return '全 S 完成';
    if (status === 'CLEAR') return '已通關';
    if (status === 'PASS') return '已挑戰';
    return '未完成';
};

const TeacherDashboard = ({ onClose }) => {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [advancedMeta, setAdvancedMeta] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const [querySnapshot, advancedSnapshot] = await Promise.all([
                    getDocs(collection(db, "users")),
                    getDoc(doc(db, "meta", "advanced")).catch((error) => {
                        console.error("讀取進階篇章目錄失敗", error);
                        return null;
                    })
                ]);
                const list = querySnapshot.docs.map((docSnapshot) => {
                    const data = docSnapshot.data();
                    const progress = calculateProgress(data.levelRecords);
                    return { id: docSnapshot.id, ...data, progress };
                });
                setStudents(list);
                if (advancedSnapshot?.exists()) setAdvancedMeta(advancedSnapshot.data());
            } catch (error) {
                console.error("讀取學生資料失敗", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, []);

    const StudentDetailModal = ({ student, onClose }) => {
        const [activeTab, setActiveTab] = useState('progress');
        const [scoreSection, setScoreSection] = useState('main');
        const levelRecords = student.levelRecords || {};
        const mainProgress = getMainProgressStats(levelRecords);
        const advancedLessons = getAdvancedLessons(levelRecords, advancedMeta);
        const advancedCompleted = advancedLessons.filter(({ isCompleted }) => isCompleted).length;
        const advancedStars = advancedLessons.reduce((sum, { qualifiedClears }) => sum + qualifiedClears, 0);
        const history = student.trialHistory || [];
        const sortedHistory = [...history].sort((a, b) => {
            const dateA = toDate(getRecordDate(a))?.getTime() || 0;
            const dateB = toDate(getRecordDate(b))?.getTime() || 0;
            return dateB - dateA;
        });

        return (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[110] p-2 backdrop-blur-sm animate-in fade-in">
                <div className="bg-slate-50 rounded-xl w-full h-full flex flex-col shadow-2xl overflow-hidden">
                    <div className="bg-slate-900 text-white p-3 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            {student.photoURL ? (
                                <img src={student.photoURL} alt="學生頭像" className="w-10 h-10 rounded-full border border-slate-500 object-cover shrink-0" />
                            ) : (
                                <div className="bg-white/10 p-2 rounded-full shrink-0"><User className="w-5 h-5" /></div>
                            )}
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold truncate max-w-[150px]">{student.studentName || '未命名學生'}</h3>
                                <p className="text-[10px] text-slate-300">普通篇章 {student.progress.toFixed(1)}% · {getCompletedTaskCount(student.progress)} / {TOTAL_TASKS} 任務</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors" aria-label="關閉學生詳情">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-white px-3 pt-2 border-b border-slate-200 shrink-0">
                        <div className="grid grid-cols-3 gap-1">
                            <button
                                onClick={() => setActiveTab('progress')}
                                className={`flex items-center justify-center gap-1 px-1 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === 'progress' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <Map className="w-4 h-4" />
                                普通篇章進度
                            </button>
                            <button
                                onClick={() => setActiveTab('scores')}
                                className={`flex items-center justify-center gap-1 px-1 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === 'scores' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <BarChart3 className="w-4 h-4" />
                                章節得分
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex items-center justify-center gap-1 px-1 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <History className="w-4 h-4" />
                                歷史紀錄
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 bg-slate-100">
                        {activeTab === 'progress' && (
                            <div className="p-2 pb-6 space-y-2">
                                <div className="rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 p-4 text-white shadow-sm">
                                    <div className="flex items-end justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-100">普通篇章完成進度</p>
                                            <p className="mt-1 text-3xl font-black">{mainProgress.percentage.toFixed(1)}%</p>
                                        </div>
                                        <p className="text-xs font-bold">{mainProgress.completedTasks} / {TOTAL_TASKS} 任務</p>
                                    </div>
                                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20">
                                        <div className="h-full rounded-full bg-amber-300 transition-all duration-500" style={{ width: `${mainProgress.percentage}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                                        <div className="text-lg font-black text-indigo-600">{mainProgress.startedChapters} / 16</div>
                                        <div className="text-[9px] font-bold text-slate-500">已開始章節</div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                                        <div className="text-lg font-black text-emerald-600">{mainProgress.completedChapters} / 16</div>
                                        <div className="text-[9px] font-bold text-slate-500">完成主線章節</div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                                        <div className="text-lg font-black text-red-600">{mainProgress.completedBosses} / 6</div>
                                        <div className="text-[9px] font-bold text-slate-500">Boss 已通關</div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h4 className="text-xs font-black text-slate-800">各章節任務進度</h4>
                                        <span className="text-[9px] text-slate-500">主線 A／S；Boss B 以上</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {mainProgress.nodeProgress.map(({ node, completed, total, percentage, started }) => {
                                            const isBoss = node.type === 'boss';
                                            const info = isBoss ? BOSS_INFO[node.id] : LEVEL_INFO[node.id];

                                            return (
                                                <div key={node.id} className={`rounded-md border p-2 ${started ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="truncate text-[10px] font-bold">
                                                            {isBoss ? (node.label || 'Boss') : `Level ${String(node.id).padStart(2, '0')}`}
                                                        </span>
                                                        <span className="text-[10px] font-black">{completed} / {total}</span>
                                                    </div>
                                                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                                        <div className={`h-full rounded-full ${isBoss ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${percentage}%` }}></div>
                                                    </div>
                                                    <div className="mt-1 truncate text-[9px]">{info?.title || (isBoss ? 'Boss 關卡' : `第 ${node.id} 章`)}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'scores' && (
                            <div className="pb-6">
                                <div className="sticky top-0 z-20 border-b border-slate-200 bg-white p-2 shadow-sm">
                                    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-1">
                                        <button
                                            onClick={() => setScoreSection('main')}
                                            className={`rounded-md px-2 py-2 text-xs font-black transition-colors ${scoreSection === 'main' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            主線冒險
                                        </button>
                                        <button
                                            onClick={() => setScoreSection('advanced')}
                                            className={`rounded-md px-2 py-2 text-xs font-black transition-colors ${scoreSection === 'advanced' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            進階篇章
                                        </button>
                                    </div>
                                </div>

                                {scoreSection === 'main' ? (
                                    <div className="grid grid-cols-1 gap-2 p-2">
                                        {MAP_STRUCTURE.map((node) => {
                                            const record = levelRecords[node.id] || {};
                                            const isBoss = node.type === 'boss';
                                            const isUnlocked = Object.keys(record).length > 0;
                                            const info = isBoss ? BOSS_INFO[node.id] : LEVEL_INFO[node.id];
                                            const totalRank = isBoss ? (record.rank || '?') : calculateTotalRank(record);

                                            return (
                                                <div
                                                    key={node.id}
                                                    className={`rounded-lg border shadow-sm overflow-hidden ${isBoss ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'} ${isUnlocked ? '' : 'opacity-60 grayscale'}`}
                                                >
                                                    <div className={`px-3 py-2 flex items-start justify-between gap-2 ${isBoss ? 'bg-red-900 text-white' : 'bg-slate-800 text-white'}`}>
                                                        <div className="min-w-0">
                                                            <div className="text-[10px] font-black uppercase tracking-wide opacity-80">
                                                                {isBoss ? (node.label || 'BOSS') : `Level ${String(node.id).padStart(2, '0')}`}
                                                            </div>
                                                            <div className="text-xs font-bold truncate">{info?.title || (isBoss ? 'Boss 關卡' : `第 ${node.id} 章`)}</div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className={`text-lg font-black ${RANK_COLORS[totalRank] || 'text-slate-200'}`}>{totalRank}</div>
                                                            <div className="text-[9px] opacity-70">總等級</div>
                                                        </div>
                                                    </div>

                                                    <div className="px-3 py-2">
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2">
                                                            <Clock className="w-3 h-3" />
                                                            最後練習：{formatDate(record.lastPlayed || record.timestamp || record.date)}
                                                        </div>

                                                        {isBoss ? (
                                                            <div className="grid grid-cols-4 gap-1 text-center">
                                                                <div className="rounded bg-white border border-red-100 p-1">
                                                                    <div className="text-[9px] text-slate-500">最高分</div>
                                                                    <div className="text-sm font-black text-red-600">{record.score ?? '-'}</div>
                                                                </div>
                                                                <div className="rounded bg-white border border-red-100 p-1">
                                                                    <div className="text-[9px] text-slate-500">通關</div>
                                                                    <div className="text-sm font-black text-slate-700">{record.successCount || 0}</div>
                                                                </div>
                                                                <div className="rounded bg-white border border-red-100 p-1">
                                                                    <div className="text-[9px] text-slate-500">S 次數</div>
                                                                    <div className="text-sm font-black text-amber-500">{record.sCount || 0}</div>
                                                                </div>
                                                                <div className="rounded bg-white border border-red-100 p-1">
                                                                    <div className="text-[9px] text-slate-500">狀態</div>
                                                                    <div className="text-[10px] font-black text-slate-700 leading-tight">{getBossStatusLabel(record.bestStatus)}</div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 gap-1">
                                                                {CATEGORY_DEFS.map(({ recordKey, label }) => {
                                                                    const data = getCategoryData(record, recordKey);
                                                                    const hasScore = data.score !== null || data.rank !== '?';

                                                                    return (
                                                                        <div key={recordKey} className={`rounded border px-2 py-1 flex items-center justify-between gap-2 ${hasScore ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                                                            <span className="text-[10px] font-bold">{label}</span>
                                                                            <span className="text-[10px] font-black whitespace-nowrap">
                                                                                {data.score ?? '-'} · <span className={RANK_COLORS[data.rank] || RANK_COLORS['?']}>Rank {data.rank}</span>
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : advancedLessons.length === 0 ? (
                                    <div className="flex min-h-[320px] flex-col items-center justify-center p-6 text-center text-slate-400">
                                        <BookOpen className="mb-2 h-12 w-12 opacity-30" />
                                        <p className="text-xs font-bold">目前沒有進階篇章資料</p>
                                        <p className="mt-1 text-[10px]">匯入進階單字書後，這裡會顯示學生的進度與得分。</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 p-2">
                                        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-[10px] font-bold text-violet-600">進階篇章進度</div>
                                                    <div className="mt-1 text-xl font-black text-violet-800">{advancedCompleted} / {advancedLessons.length} 課完成</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-black text-amber-500">{advancedStars} / {advancedLessons.length * ADV_CLEARS_TO_COMPLETE} ★</div>
                                                    <div className="text-[9px] text-slate-500">每課累積 3 次 B 以上完成</div>
                                                </div>
                                            </div>
                                        </div>

                                        {advancedLessons.map(({ lesson, record, qualifiedClears, isCompleted, title }) => {
                                            const hasPlayed = Object.keys(record).length > 0;

                                            return (
                                                <div key={lesson} className={`overflow-hidden rounded-lg border bg-white shadow-sm ${isCompleted ? 'border-amber-300' : 'border-violet-200'} ${hasPlayed ? '' : 'opacity-60'}`}>
                                                    <div className={`flex items-start justify-between gap-2 px-3 py-2 text-white ${isCompleted ? 'bg-violet-800' : 'bg-slate-800'}`}>
                                                        <div className="min-w-0">
                                                            <div className="text-[10px] font-black tracking-wide">L{String(lesson).padStart(3, '0')}</div>
                                                            <div className="truncate text-xs font-bold">{title}</div>
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            <div className="text-base leading-none">
                                                                {Array.from({ length: ADV_CLEARS_TO_COMPLETE }, (_, index) => (
                                                                    <span key={index} className={index < qualifiedClears ? 'text-amber-300' : 'text-slate-500'}>★</span>
                                                                ))}
                                                            </div>
                                                            <div className="mt-1 text-[9px] text-slate-300">{qualifiedClears} / {ADV_CLEARS_TO_COMPLETE} 次完成</div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1 p-2 text-center">
                                                        <div className="rounded bg-violet-50 p-1.5">
                                                            <div className="text-[9px] text-slate-500">最高分</div>
                                                            <div className="text-sm font-black text-violet-700">{record.bestScore ?? '-'}</div>
                                                        </div>
                                                        <div className="rounded bg-violet-50 p-1.5">
                                                            <div className="text-[9px] text-slate-500">最佳 Rank</div>
                                                            <div className={`text-sm font-black ${RANK_COLORS[record.bestGrade || '?']}`}>{record.bestGrade || '?'}</div>
                                                        </div>
                                                        <div className="rounded bg-violet-50 p-1.5">
                                                            <div className="text-[9px] text-slate-500">挑戰次數</div>
                                                            <div className="text-sm font-black text-slate-700">{record.attempts || 0}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-500">
                                                        <Clock className="h-3 w-3" />
                                                        最後練習：{formatDate(record.lastPlayed)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="p-2 pb-6">
                                {sortedHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-slate-400">
                                        <BookOpen className="w-12 h-12 mb-2 opacity-30" />
                                        <p className="text-xs">尚無練習或測驗紀錄</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 shadow-sm z-10 text-xs">
                                                <tr className="text-slate-500">
                                                    <th className="py-2 px-2 font-bold">時間 / 內容</th>
                                                    <th className="py-2 px-2 font-bold text-right">分數 / Rank</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs">
                                                {sortedHistory.map((record, idx) => {
                                                    const categoryLabel = getHistoryCategoryLabel(record);
                                                    const typeLabel = record.type === 'quiz' ? '測驗' : '練習';
                                                    const typeClass = record.type === 'quiz' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
                                                    const rank = record.rank || '?';

                                                    return (
                                                        <tr key={`${getRecordDate(record) || idx}-${idx}`} className="border-b border-slate-100 hover:bg-indigo-50/40 transition-colors">
                                                            <td className="py-2 px-2">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[10px] text-slate-500">{formatDateTime(getRecordDate(record))}</span>
                                                                        <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${typeClass}`}>{typeLabel}</span>
                                                                        {categoryLabel && (
                                                                            <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-emerald-100 text-emerald-700">{categoryLabel}</span>
                                                                        )}
                                                                    </div>
                                                                    <span className="font-bold text-slate-700 leading-snug">{getHistoryUnitLabel(record)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 px-2 text-right">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="font-black text-sm text-emerald-600">{record.score ?? '-'}</span>
                                                                    <span className={`text-[10px] font-bold ${RANK_COLORS[rank] || RANK_COLORS['?']}`}>
                                                                        Rank {rank}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full bg-slate-100 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-white p-3 shadow-sm border-b border-slate-200 flex justify-between items-center shrink-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-500 text-white p-1.5 rounded-lg"><Trophy className="w-4 h-4" /></div>
                    <h1 className="text-lg font-black text-slate-800">學生資料</h1>
                </div>
                <button onClick={onClose} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-slate-700 transition-all shadow-md">
                    關閉
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-2"></div>
                        <p className="text-xs font-bold">讀取學生資料...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <User className="w-12 h-12 mb-2 opacity-30" />
                        <p className="text-xs font-bold">目前沒有學生資料</p>
                    </div>
                ) : (
                    <div
                        className="h-full overflow-y-auto p-2"
                        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4rem)' }}
                    >
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="p-3 font-bold">學生</th>
                                        <th className="p-3 font-bold text-center">普通篇章</th>
                                        <th className="p-3 font-bold text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {students.map((student) => (
                                        <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {student.photoURL ? (
                                                        <img src={student.photoURL} alt="學生頭像" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-500 text-xs shrink-0">
                                                            {student.studentName ? student.studentName[0] : "?"}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col min-w-0">
                                                        <div className="font-bold text-slate-700 truncate max-w-[90px]">{student.studentName || '未命名學生'}</div>
                                                        <div className="text-[9px] text-slate-400">
                                                            {getCompletedTaskCount(student.progress)} / {TOTAL_TASKS} 任務
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <span className="font-bold text-indigo-600">{student.progress ? student.progress.toFixed(1) : 0}%</span>
                                                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${student.progress || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => setSelectedStudent(student)}
                                                    className="bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-500 hover:text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-all active:scale-95"
                                                >
                                                    詳情
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {selectedStudent && <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
        </div>
    );
};

export default TeacherDashboard;
