import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { X, User, Clock, BookOpen, Trophy } from "lucide-react";

// 定義常數：總任務數
const TOTAL_TASKS = 94; // (16單元 * 4類別) + (6個Boss * 5次)

const TeacherDashboard = ({ onClose }) => {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(true);

    // === 新增：核心計算邏輯 ===
    const calculateProgress = (levelRecords) => {
        if (!levelRecords) return 0;
        let completedCount = 0;

        // 1. 計算一般單元 (Unit 1~16)
        for (let i = 1; i <= 16; i++) {
            const record = levelRecords[i];
            if (record) {
                // 檢查 4 個類別: 單字, 裝備(搭配詞), 藥水(多義), 捲軸(片語)
                // 規則：只要該類別拿到 'A' 或 'S' 就算完成
                ['vocab', 'equip', 'alchemy', 'scroll'].forEach(cat => {
                    // 取得成績 (相容新舊資料結構)
                    let grade = null;
                    if (record[cat] && typeof record[cat] === 'object') grade = record[cat].grade;
                    else if (record[`${cat}Grade`]) grade = record[`${cat}Grade`];

                    if (grade === 'S' || grade === 'A') {
                        completedCount++;
                    }
                });
            }
        }

        // 2. 計算 Boss (b1~b6)
        const bosses = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'];
        bosses.forEach(bid => {
            const record = levelRecords[bid];
            if (record) {
                // 規則：採計成功次數 (A以上)，最高 5 次
                let count = record.successCount || 0;
                if (count > 5) count = 5; // 上限 5
                completedCount += count;
            }
        });

        // 3. 計算百分比
        const percentage = (completedCount / TOTAL_TASKS) * 100;
        return Math.min(percentage, 100); // 確保不超過 100%
    };

    // 1. 抓取所有學生資料
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "users"));
                const list = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    // 這裡直接計算進度，存入 student 物件中方便後面顯示
                    const progress = calculateProgress(data.levelRecords);
                    return { id: doc.id, ...data, progress };
                });
                setStudents(list);
            } catch (error) {
                console.error("讀取資料失敗:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    // 2. 詳細成績視窗
    const StudentDetailModal = ({ student, onClose }) => {
        const history = student.trialHistory || [];
        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[110] p-2 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl w-full h-full flex flex-col shadow-2xl overflow-hidden">
                    <div className="bg-slate-800 text-white p-3 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            {/* 顯示 Google 大頭貼或預設圖 */}
                            {student.photoURL ? (
                                <img src={student.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-500" />
                            ) : (
                                <div className="bg-white/10 p-1.5 rounded-full"><User className="w-4 h-4" /></div>
                            )}
                            <div>
                                <h3 className="text-sm font-bold truncate max-w-[150px]">{student.studentName || "未命名"}</h3>
                                <p className="text-[10px] text-slate-400">目前進度: {student.progress.toFixed(1)}%</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <BookOpen className="w-12 h-12 mb-2 opacity-20" />
                                <p className="text-xs">尚無練習紀錄</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white border-b border-slate-200 sticky top-0 shadow-sm z-10 text-xs">
                                    <tr className="text-slate-500">
                                        <th className="py-2 px-2 font-bold">時間/單元</th>
                                        <th className="py-2 px-2 font-bold text-right">分數/評價</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white text-xs">
                                    {sortedHistory.map((record, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                                            <td className="py-2 px-2">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{record.unit || "未知"}</span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        {new Date(record.date).toLocaleDateString()}
                                                        <span className={`ml-1 px-1 rounded-sm text-[8px] text-white ${record.type === 'quiz' ? 'bg-red-400' : 'bg-blue-400'}`}>
                                                            {record.type === 'quiz' ? '測驗' : '練習'}
                                                        </span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-black text-sm text-emerald-600">{record.score}</span>
                                                    {/* 顯示等級 A, S... */}
                                                    <span className={`text-[10px] font-bold ${['S', 'A'].includes(record.rank) ? 'text-yellow-600' : 'text-gray-400'}`}>
                                                        RANK {record.rank}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // 主畫面
    return (
        <div className="h-full w-full bg-slate-100 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-white p-3 shadow-sm border-b border-slate-200 flex justify-between items-center shrink-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-500 text-white p-1.5 rounded-lg"><Trophy className="w-4 h-4" /></div>
                    <h1 className="text-lg font-black text-slate-800">冒險完成度</h1>
                </div>
                <button onClick={onClose} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-slate-700 transition-all shadow-md">
                    返回
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-2"></div>
                        <p className="text-xs font-bold">讀取中...</p>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-2 pb-10">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="p-3 font-bold">勇者</th>
                                        <th className="p-3 font-bold text-center">攻略進度</th>
                                        <th className="p-3 font-bold text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {students.map((student) => (
                                        <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {/* 大頭貼邏輯 */}
                                                    {student.photoURL ? (
                                                        <img src={student.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-500 text-xs shrink-0">
                                                            {student.studentName ? student.studentName[0] : "?"}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <div className="font-bold text-slate-700 truncate max-w-[80px]">{student.studentName || "未命名"}</div>
                                                        {/* 顯示收集到的星星/標記總數 */}
                                                        <div className="text-[9px] text-slate-400">
                                                            {((student.progress / 100) * TOTAL_TASKS).toFixed(0)} / {TOTAL_TASKS} 任務
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
