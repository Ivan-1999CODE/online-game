import React, { useState, useEffect, useRef } from 'react';
import {
    Sword, Shield, Scroll, Skull, Coins, Heart, Star, ChevronLeft, ChevronRight,
    Volume2, Map as MapIcon, RefreshCw, XCircle, CheckCircle,
    HelpCircle, Backpack, Gem, Flame, Skull as SkullIcon, Book, User,
    List, Grid, ArrowLeft, Lightbulb, MessageCircle, Clock, Award, Home, Lock, LogOut, Headphones
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth, googleProvider } from './config/firebase';
import { speakText, playSound, shuffleArray, playMusic, stopMusic, setMute, getMuteStatus, setVolume, unlockAudio } from './utils/audio';
import TeacherDashboard from './components/TeacherDashboard.jsx';

// --- Pixel Art SVGs ---
const PixelArt = {
    Chest: () => (
        <svg viewBox="0 0 24 24" className="w-16 h-16 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12H22M2 12V6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V12M2 12V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V12" stroke="#4a3c31" strokeWidth="2" fill="#e3ce9c" />
            <rect x="10" y="10" width="4" height="4" fill="#ffcc00" stroke="#000" strokeWidth="1" />
            <path d="M4 6H20" stroke="#4a3c31" strokeWidth="2" strokeDasharray="2 2" />
        </svg>
    ),
    SwordShield: () => (
        <svg viewBox="0 0 24 24" className="w-16 h-16 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4L14 12L12 14L4 6L6 4Z" fill="#e2e8f0" stroke="#000" strokeWidth="2" />
            <path d="M14 12L18 8M12 14L8 18" stroke="#000" strokeWidth="2" />
            <path d="M12 4C12 4 14 6 18 6C18 6 18 16 12 20C6 16 6 6 6 6C10 6 12 4 12 4Z" fill="#ef4444" fillOpacity="0.9" stroke="#000" strokeWidth="2" transform="translate(4, 0) scale(0.9)" />
            <path d="M10 8 L14 12" stroke="#fff" strokeWidth="1" opacity="0.5" />
        </svg>
    ),
    Potion: () => (
        <svg viewBox="0 0 24 24" className="w-16 h-16 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2H14V6L19 12V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V12L10 6V2Z" fill="#00ccff" stroke="#000" strokeWidth="2" />
            <path d="M8 14H16" stroke="#fff" strokeWidth="2" strokeOpacity="0.5" />
            <circle cx="14" cy="16" r="1" fill="#fff" />
            <circle cx="10" cy="18" r="1" fill="#fff" />
        </svg>
    ),
    Scroll: () => (
        <svg viewBox="0 0 24 24" className="w-16 h-16 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4H20V20H4V4Z" fill="#f5e0b6" stroke="#000" strokeWidth="2" />
            <path d="M6 8H18" stroke="#4a3c31" strokeWidth="2" />
            <path d="M6 12H18" stroke="#4a3c31" strokeWidth="2" />
            <path d="M6 16H14" stroke="#4a3c31" strokeWidth="2" />
            <path d="M20 4V20" stroke="#000" strokeWidth="2" />
            <path d="M4 4V20" stroke="#000" strokeWidth="2" />
            <circle cx="12" cy="12" r="2" fill="#d97706" opacity="0.3" />
        </svg>
    ),
    Book: () => (
        <svg viewBox="0 0 24 24" className="w-16 h-16 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6V20C4 20 8 18 12 18C16 18 20 20 20 20V6C20 6 16 4 12 4C8 4 4 6 4 6Z" fill="#8b5cf6" stroke="#000" strokeWidth="2" />
            <path d="M12 4V18" stroke="#000" strokeWidth="2" />
            <path d="M6 8H10" stroke="#fff" strokeWidth="2" strokeOpacity="0.5" />
            <path d="M6 12H10" stroke="#fff" strokeWidth="2" strokeOpacity="0.5" />
            <path d="M14 8H18" stroke="#fff" strokeWidth="2" strokeOpacity="0.5" />
            <path d="M14 12H18" stroke="#fff" strokeWidth="2" strokeOpacity="0.5" />
        </svg>
    ),
    MonsterSlime: () => (
        <svg viewBox="0 0 100 100" className="w-32 h-32 animate-float" fill="none">
            <path d="M20 80 Q 20 30 50 30 Q 80 30 80 80 L 20 80" fill="#00ccff" stroke="black" strokeWidth="3" />
            <circle cx="35" cy="55" r="5" fill="black" />
            <circle cx="65" cy="55" r="5" fill="black" />
            <path d="M45 65 Q 50 70 55 65" stroke="black" strokeWidth="3" fill="none" />
        </svg>
    ),
    MonsterBat: () => (
        <svg viewBox="0 0 100 100" className="w-32 h-32 animate-float" fill="none">
            <path d="M30 60 Q 10 40 30 30 Q 50 50 70 30 Q 90 40 70 60 Q 50 80 30 60" fill="#333" stroke="white" strokeWidth="2" />
            <circle cx="40" cy="50" r="3" fill="red" />
            <circle cx="60" cy="50" r="3" fill="red" />
            <path d="M45 65 L 50 70 L 55 65" fill="white" />
        </svg>
    ),
    Village: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18v-8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8z" fill="#e3ce9c" stroke="#4a3c31" />
            <path d="M2 10l10-7 5 3.5 5 3.5" fill="#a05a2c" stroke="#4a3c31" />
            <rect x="9" y="14" width="6" height="7" fill="#4a3c31" />
        </svg>
    ),
    Castle: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 21h16v-6h-4v-4h4V6h-4V2h-4V2h-4v4h-4V2H4v4H0v5h4v4H0v6z" fill="#333" stroke="red" />
            <path d="M9 21v-5h6v5" fill="#000" />
        </svg>
    ),
    Dragon: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 14C4 14 6 8 12 6C18 4 20 8 20 8C20 8 22 10 22 14C22 18 18 20 12 20C6 20 2 18 2 14" stroke="#ff0055" strokeWidth="2" fill="#330011" />
            <path d="M8 12L10 14" stroke="#fff" strokeWidth="2" />
            <path d="M16 12L14 14" stroke="#fff" strokeWidth="2" />
            <path d="M12 16V18" stroke="#fff" strokeWidth="2" />
            <path d="M2 14L4 10" stroke="#ff0055" strokeWidth="2" />
            <path d="M22 14L20 10" stroke="#ff0055" strokeWidth="2" />
        </svg>
    ),
    Tree: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <path d="M12 2L4 14H8L6 18H18L16 14H20L12 2Z" fill="#2d5a27" stroke="#000" strokeWidth="1.5" />
            <rect x="10" y="18" width="4" height="4" fill="#5c3c2e" stroke="#000" strokeWidth="1.5" />
        </svg>
    ),
    Mountain: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <path d="M4 20L10 8L16 20H4Z" fill="#718096" stroke="#000" strokeWidth="1.5" />
            <path d="M14 20L18 12L22 20H14Z" fill="#4a5568" stroke="#000" strokeWidth="1.5" />
        </svg>
    ),
    Ruins: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <rect x="4" y="4" width="4" height="16" fill="#d1d5db" stroke="#000" strokeWidth="1.5" />
            <rect x="16" y="10" width="4" height="10" fill="#d1d5db" stroke="#000" strokeWidth="1.5" />
            <path d="M4 4L8 2M16 10L20 8" stroke="#000" strokeWidth="1.5" />
            <path d="M2 22H22" stroke="#000" strokeWidth="1.5" />
        </svg>
    ),
    Cave: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <path d="M2 20V10C2 5 6 2 12 2C18 2 22 5 22 10V20H2Z" fill="#4a5568" stroke="#000" strokeWidth="1.5" />
            <path d="M8 20V12C8 10 9 8 12 8C15 8 16 10 16 12V20H8Z" fill="#1a202c" />
        </svg>
    ),
    Snow: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <path d="M12 2V22M2 12H22M5 5L19 19M19 5L5 19" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    ),
    Volcano: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <path d="M4 22L10 8H14L20 22H4Z" fill="#718096" stroke="#000" strokeWidth="1.5" />
            <path d="M10 8L12 4L14 8" fill="#ef4444" stroke="#000" strokeWidth="1.5" />
            <circle cx="12" cy="2" r="1.5" fill="#fca5a5" className="animate-bounce" />
        </svg>
    ),
    Cloud: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <path d="M4 16C2 16 2 12 4 12C4 10 6 8 8 8C10 6 14 6 16 8C18 8 20 10 20 12C22 12 22 16 20 16H4Z" fill="#e2e8f0" stroke="#000" strokeWidth="1.5" />
        </svg>
    ),
    Portal: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#805ad5" stroke="#000" strokeWidth="1.5" />
            <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6Z" fill="#000" />
        </svg>
    ),
    Crown: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <path d="M2 18V6L8 10L12 2L16 10L22 6V18H2Z" fill="#fbbf24" stroke="#000" strokeWidth="1.5" />
        </svg>
    ),
    Eye: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <path d="M2 12C2 12 6 4 12 4C18 4 22 12 22 12C22 12 18 20 12 20C6 20 2 12 2 12Z" fill="#fff" stroke="#000" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="4" fill="#7f1d1d" />
            <circle cx="12" cy="12" r="1.5" fill="#000" />
        </svg>
    ),
    Sun: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <circle cx="12" cy="12" r="6" fill="#fde047" stroke="#000" strokeWidth="1.5" />
            <path d="M12 2V4M12 20V22M2 12H4M20 12H22M4.9 4.9L6.3 6.3M17.7 17.7L19.1 19.1M4.9 19.1L6.3 17.7M17.7 6.3L19.1 4.9" stroke="#f59e0b" strokeWidth="2" />
        </svg>
    ),
    Universe: () => (
        <svg viewBox="0 0 24 24" className="w-full h-full p-2" fill="none">
            <circle cx="8" cy="8" r="1" fill="#fff" />
            <circle cx="16" cy="6" r="1" fill="#fff" />
            <circle cx="4" cy="14" r="1" fill="#fff" />
            <circle cx="20" cy="16" r="1" fill="#fff" />
            <circle cx="12" cy="18" r="1" fill="#fff" />
            <path d="M12 8L14 12L12 16L10 12L12 8Z" fill="#818cf8" />
        </svg>
    )
};

// --- Firebase Integ & Data Structure ---
const LEVEL_MAPPING = {
    1: { book: 1, unit: "1-3" }, 2: { book: 1, unit: "4-6" },
    3: { book: 2, unit: "1-2" }, 4: { book: 2, unit: "3-4" }, 5: { book: 2, unit: "5-6" },
    6: { book: 3, unit: "1-2" }, 7: { book: 3, unit: "3-4" }, 8: { book: 3, unit: "5-6" },
    9: { book: 4, unit: "1-2" }, 10: { book: 4, unit: "3-4" }, 11: { book: 4, unit: "5-6" },
    12: { book: 5, unit: "1-2" }, 13: { book: 5, unit: "3-4" }, 14: { book: 5, unit: "5-6" },
    15: { book: 6, unit: "1-2" }, 16: { book: 6, unit: "3-4" }
};

const fetchLevelData = async (levelId) => {
    const mapping = LEVEL_MAPPING[levelId];
    if (!mapping) return null;

    try {
        const q = query(collection(db, 'vocabulary'), where('book', '==', mapping.book), where('unit', '==', mapping.unit));
        const snapshot = await getDocs(q);

        const categories = { vocab: [], collocation: [], polysemy: [], sentences: [] };

        snapshot.forEach(doc => {
            const data = doc.data();
            const item = {
                id: doc.id,
                word: data.word || data.phrase || '',
                chinese: data.chinese || '',
                part: data.pos || data.part || '',  // 支援新的 pos 欄位和舊的 part 欄位
                sentence: data.example || data.sentence || '',
                sentence_ch: data.sentence_ch || '',
                book: data.book || mapping.book,
                unit: data.unit || mapping.unit
            };

            const categoryStr = String(data.category);
            if (categoryStr.includes("1") || categoryStr.includes("單字")) {
                categories.vocab.push(item);
            } else if (categoryStr.includes("2") || categoryStr.includes("搭配字")) {
                // 搭配裝備：顯示完整片語，不是基礎動詞
                categories.collocation.push({ ...item, word: data.phrase || data.word || '' });
            } else if (categoryStr.includes("4") || categoryStr.includes("一字多義")) {
                // 支援 details 欄位、definitions[] 陣列格式和舊的單一 chinese 欄位
                let chineseStr = data.chinese || '';
                if (!chineseStr && data.details) {
                    chineseStr = data.details;
                }
                if (!chineseStr && data.definitions && Array.isArray(data.definitions)) {
                    chineseStr = data.definitions.map(d => `[${d.pos}] ${d.mean}`).join(' / ');
                }
                categories.polysemy.push({ id: doc.id, word: data.word, chinese: chineseStr, definitions: data.definitions || [], book: data.book || mapping.book, unit: data.unit || mapping.unit });
            } else if (categoryStr.includes("3") || categoryStr.includes("片語") || categoryStr.includes("佳句")) {
                categories.sentences.push(item);
            }
        });

        // 單字寶箱拆成 A/B 兩箱：依字母序切半，確保切法固定、學生可對照課本複習
        const sortedVocab = [...categories.vocab].sort((a, b) => a.word.localeCompare(b.word));
        const half = Math.ceil(sortedVocab.length / 2);
        categories.vocab_a = sortedVocab.slice(0, half);
        categories.vocab_b = sortedVocab.slice(half);

        return categories;
    } catch (err) {
        console.error("Error fetching data:", err);
        return null;
    }
};

// --- 進階書（獨立地圖分頁）---
const ADV_LESSONS_PER_SECTION = 10; // 進階地圖每 10 課一卷
const ADV_CLEARS_TO_COMPLETE = 3;   // 通關 3 次才算完成
const ADV_QUIZ_QUESTION_LIMIT = 10; // 進階課每次隨機抽最多 10 題

const advLessonId = (lesson) => `adv_${lesson}`;

// 進階書目錄：meta/advanced 文件 { totalLessons, titles: { "1": "篇章名" } }，由匯入腳本維護
const fetchAdvancedMeta = async () => {
    try {
        const snap = await getDoc(doc(db, 'meta', 'advanced'));
        return snap.exists() ? snap.data() : null;
    } catch (err) {
        console.error("Error fetching advanced meta:", err);
        return null;
    }
};

const fetchAdvancedLesson = async (lesson) => {
    try {
        const q = query(collection(db, 'vocabulary'), where('series', '==', 'advanced'), where('lesson', '==', lesson));
        const snapshot = await getDocs(q);
        const vocab = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            vocab.push({
                id: docSnap.id,
                word: data.word || '',
                chinese: data.chinese || '',
                part: data.pos || data.part || '',
                sentence: data.example || data.sentence || '',
                sentence_ch: data.sentence_ch || '',
                series: 'advanced',
                lesson
            });
        });
        vocab.sort((a, b) => a.word.localeCompare(b.word));
        return { vocab, vocab_a: [], vocab_b: [], collocation: [], polysemy: [], sentences: [] };
    } catch (err) {
        console.error("Error fetching advanced lesson:", err);
        return null;
    }
};

// --- 資料結構生成器 ---
const LEVEL_INFO = {
    1: { title: "初學者的試煉之森", desc: "冒險的起點，裝備基礎武器。", sub: "CH 1-3" },
    2: { title: "史萊姆平原的遠征", desc: "第一次離開村莊，面對初級怪物。", sub: "CH 4-6" },
    3: { title: "迷霧峽谷的迷宮", desc: "開始遇到一些需要轉彎思考的挑戰。", sub: "CH 1-2" },
    4: { title: "古代遺跡的守護者", desc: "解開古老的謎題，獲得中階技能。", sub: "CH 3-4" },
    5: { title: "地下城：半獸人營地", desc: "本冊 BOSS，需整合前幾關能力。", sub: "CH 5-6" },
    6: { title: "極寒冰原的暴風雪", desc: "難度提升，環境變得嚴苛。", sub: "CH 1-2" },
    7: { title: "灼熱火山的赤炎龍", desc: "激烈的戰鬥，考驗抗壓性。", sub: "CH 3-4" },
    8: { title: "天空之城的雲端聖殿", desc: "掌握了飛行（高階技巧），俯瞰世界。", sub: "CH 5-6" },
    9: { title: "深淵魔域的入口", desc: "接近魔王，氣氛壓抑而嚴肅。", sub: "CH 1-2" },
    10: { title: "魔王城的最終迴廊", desc: "四天王等級的難題接踵而來。", sub: "CH 3-4" },
    11: { title: "英雄殿堂：榮耀加冕", desc: "擊敗魔王，成為凡間的英雄。", sub: "CH 5-6" },
    12: { title: "異次元的時空裂縫", desc: "進入更高的維度，凡間邏輯不再適用。", sub: "CH 1-2" },
    13: { title: "虛空巨獸的巢穴", desc: "面對不可名狀的強大存在。", sub: "CH 3-4" },
    14: { title: "諸神的黃昏戰場", desc: "與神話級別的對手交鋒。", sub: "CH 5-6" },
    15: { title: "創世神殿的階梯", desc: "接近世界的本源與真理。", sub: "CH 1-2" },
    16: { title: "宇宙終焉：新的起點", desc: "全破關卡，掌握了一切知識的盡頭。", sub: "CH 3-4" }
};

const SECTION_HEADERS = {
    1: { title: "第一冊：啟程之卷", subtitle: "新手村與草原" },
    3: { title: "第二冊：探索之卷", subtitle: "荒野與遺跡" },
    6: { title: "第三冊：覺醒之卷", subtitle: "極端環境" },
    9: { title: "第四冊：傳說之卷", subtitle: "魔王城" },
    12: { title: "第五冊：神話之卷", subtitle: "異次元與神界 (DLC)" },
    15: { title: "第六冊：起源之卷", subtitle: "宇宙真理" }
};

const GAME_DATA = {};
for (let i = 1; i <= 16; i++) {
    GAME_DATA[i] = {
        title: LEVEL_INFO[i] ? `Level ${i < 10 ? '0' + i : i}: ${LEVEL_INFO[i].title}` : `Unit ${i}`,
        // Content will be loaded asynchronously, but we initialize with empty arrays to prevent crashes in synchronous checks if any exist.
        content: { vocab: [], vocab_a: [], vocab_b: [], collocation: [], polysemy: [], sentences: [] }
    };
}

const MAP_STRUCTURE = [
    { type: 'unit', id: 1 },
    { type: 'unit', id: 2 },
    { type: 'boss', id: 'b1', label: 'BOSS 1', targetUnits: [1, 2] },

    { type: 'unit', id: 3 },
    { type: 'unit', id: 4 },
    { type: 'unit', id: 5 },
    { type: 'boss', id: 'b2', label: 'BOSS 2', targetUnits: [3, 4, 5] },

    { type: 'unit', id: 6 },
    { type: 'unit', id: 7 },
    { type: 'unit', id: 8 },
    { type: 'boss', id: 'b3', label: 'BOSS 3', targetUnits: [6, 7, 8] },

    { type: 'unit', id: 9 },
    { type: 'unit', id: 10 },
    { type: 'unit', id: 11 },
    { type: 'boss', id: 'b4', label: 'BOSS 4', targetUnits: [9, 10, 11] },

    { type: 'unit', id: 12 },
    { type: 'unit', id: 13 },
    { type: 'unit', id: 14 },
    { type: 'boss', id: 'b5', label: 'BOSS 5', targetUnits: [12, 13, 14] },

    { type: 'unit', id: 15 },
    { type: 'unit', id: 16 },
    { type: 'boss', id: 'b6', label: 'FINAL BOSS', targetUnits: [15, 16] }
];

const BOSS_INFO = {
    'b1': { title: "BOSS I: 森林守護者", desc: "第一冊的試煉總結", sub: "REC: LV 10" },
    'b2': { title: "BOSS II: 地下城主", desc: "第二冊的試煉總結", sub: "REC: LV 20" },
    'b3': { title: "BOSS III: 冰火巨人", desc: "第三冊的試煉總結", sub: "REC: LV 30" },
    'b4': { title: "BOSS IV: 魔王親衛", desc: "第四冊的試煉總結", sub: "REC: LV 40" },
    'b5': { title: "BOSS V: 虛空領主", desc: "第五冊的試煉總結", sub: "REC: LV 50" },
    'b6': { title: "FINAL BOSS: 創世神", desc: "最終試煉", sub: "REC: LV 60" }
};

// --- 全域 Helper Functions (新增) ---
const getLevelColor = (id) => {
    const i = parseInt(id);
    // Forest, Plains, Canyon, Ruins, Dungeon, Ice, Fire, Sky, Abyss, Dark, Hero, Dim, Void, War, Genesis, Uni
    const colors = [
        '#4ade80', '#a3e635', '#fb923c', '#d1d5db', '#4b5563', '#93c5fd', '#fca5a5', '#bae6fd',
        '#c084fc', '#374151', '#fde047', '#818cf8', '#111827', '#f87171', '#fef08a', '#312e81'
    ];
    return colors[i - 1] || '#8fb34d';
};

const getLevelIcon = (id) => {
    const i = parseInt(id);
    switch (i) {
        case 1: return <PixelArt.Tree />;
        case 2: return <div className="w-full h-full transform scale-75"><PixelArt.MonsterSlime /></div>;
        case 3: return <PixelArt.Mountain />;
        case 4: return <PixelArt.Ruins />;
        case 5: return <PixelArt.Cave />;
        case 6: return <PixelArt.Snow />;
        case 7: return <PixelArt.Volcano />;
        case 8: return <PixelArt.Cloud />;
        case 9: return <PixelArt.Portal />;
        case 10: return <PixelArt.Castle />;
        case 11: return <PixelArt.Crown />;
        case 12: return <PixelArt.Portal />;
        case 13: return <PixelArt.Eye />;
        case 14: return <div className="w-full h-full transform scale-75"><PixelArt.SwordShield /></div>;
        case 15: return <PixelArt.Sun />;
        case 16: return <PixelArt.Universe />;
        default: return <PixelArt.Village />;
    }
};

// --- Achievement Logic Helper ---
// 取得類別評級；vocabA/vocabB 在沒有新紀錄時回退到拆箱前的 vocab 舊成績
const getGradeWithVocabFallback = (record, cat) => {
    if (record[cat] && typeof record[cat] === 'object' && record[cat].grade) return record[cat].grade;
    if (record[`${cat}Grade`]) return record[`${cat}Grade`];
    if (cat === 'vocabA' || cat === 'vocabB') {
        if (record.vocab && typeof record.vocab === 'object' && record.vocab.grade) return record.vocab.grade;
        if (record.vocabGrade) return record.vocabGrade;
    }
    return null;
};

const ACHIEVEMENT_CATS = ['vocabA', 'vocabB', 'equip', 'alchemy', 'scroll'];

const getUnitAchievementStatus = (record) => {
    if (!record) return null;
    const grades = ACHIEVEMENT_CATS.map(c => getGradeWithVocabFallback(record, c));

    // If any category is missing (null or undefined), achievement not possible
    if (grades.some(g => !g)) return null;

    const rankWeights = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0, '?': 0 };

    const isAllS = grades.every(g => g === 'S');
    if (isAllS) return 'COMPLETE';

    const isAllClear = grades.every(g => rankWeights[g] && rankWeights[g] >= 4); // >= A
    if (isAllClear) return 'CLEAR';

    const isAllPass = grades.every(g => rankWeights[g] && rankWeights[g] >= 3); // >= B
    if (isAllPass) return 'PASS';

    return null;
};

// --- Helper Functions ---
const RPGBorder = ({ children, className = "", style = {} }) => (
    <div className={`nes-border relative ${className}`} style={style}>
        {children}
        <div className="absolute top-1 left-1 w-2 h-2 bg-rpg-border opacity-50"></div>
        <div className="absolute top-1 right-1 w-2 h-2 bg-rpg-border opacity-50"></div>
        <div className="absolute bottom-1 left-1 w-2 h-2 bg-rpg-border opacity-50"></div>
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-rpg-border opacity-50"></div>
    </div>
);

const RPGButton = ({ children, onClick, color = "primary", className = "", disabled = false, active = false, silent = false }) => {
    const colors = {
        primary: "bg-rpg-primary text-white hover:bg-red-600 shadow-pixel active:shadow-pixel-pressed",
        secondary: "bg-rpg-secondary text-white hover:bg-cyan-600 shadow-pixel active:shadow-pixel-pressed",
        accent: "bg-rpg-accent text-black hover:bg-yellow-500 shadow-pixel active:shadow-pixel-pressed",
        neutral: "bg-gray-300 text-black hover:bg-gray-400 shadow-pixel active:shadow-pixel-pressed",
        dark: "bg-slate-700 text-white hover:bg-slate-600 shadow-pixel active:shadow-pixel-pressed",
        success: "bg-rpg-success text-white hover:bg-green-600 shadow-pixel active:shadow-pixel-pressed"
    };
    const activeStyle = active ? "ring-2 ring-white ring-offset-2 ring-offset-black" : "";
    return (
        <button onClick={(e) => { e.stopPropagation(); if (!disabled) { if (!silent) playSound('click'); onClick(e); } }} disabled={disabled} className={`border-2 border-black relative px-3 py-2 font-pixel text-xs sm:text-sm uppercase tracking-wide ${colors[color] || colors.neutral} ${activeStyle} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-transform active:translate-y-1 ${className}`}>
            {children}
        </button>
    );
};

const ProgressBar = ({ value, max, color = "bg-rpg-success", label = "HP" }) => (
    <div className="flex items-center gap-2 w-full font-pixel text-[10px] text-white">
        <span className="w-10 text-right">{label}</span>
        <div className="flex-1 h-4 bg-black border-2 border-white relative">
            <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }}></div>
        </div>
        <span>{value}/{max}</span>
    </div>
);

// --- UI Components ---
// --- Screens ---
const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center h-full bg-rpg-bg z-50 absolute inset-0">
        <div className="w-16 h-16 border-4 border-rpg-accent animate-spin rounded-full border-t-transparent"></div>
        <p className="text-white font-pixel text-sm mt-4 animate-pulse">LOADING DATA...</p>
    </div>
);

const LoginScreen = ({ onLogin }) => {
    const handleGoogleLogin = async () => {
        playSound('start');
        unlockAudio(); // Unlock audio context on user gesture

        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isInAppBrowser = /Line|FBAN|FBAV|Instagram/i.test(userAgent);

        try {
            if (isInAppBrowser) {
                // 僅針對 LINE, FB, IG 等會擋 Popup 的內建瀏覽器使用 Redirect
                await signInWithRedirect(auth, googleProvider);
            } else {
                // 桌面版與一般手機瀏覽器 (Safari, Chrome) 預設使用 Popup
                // 這樣能避開 iOS Safari 預設阻擋跨站追蹤 (ITP) 造成的 Redirect 失敗問題
                const result = await signInWithPopup(auth, googleProvider);
                onLogin(result.user);
            }
        } catch (error) {
            console.error("Login Failed:", error);
            // If popup is blocked on desktop, fallback to redirect
            if (error.code === 'auth/popup-blocked') {
                await signInWithRedirect(auth, googleProvider);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-rpg-bg">
            <div className="mb-8 relative">
                <Sword size={80} className="text-rpg-primary relative z-10" />
            </div>
            <h1 className="font-pixel text-4xl text-rpg-accent mb-2 text-shadow tracking-widest">ENGLISH<br />HERO</h1>
            <p className="font-retro text-gray-300 mb-8 tracking-widest">PRESS START</p>

            <RPGButton onClick={handleGoogleLogin} color="primary" className="w-full max-w-xs py-4 text-lg">
                GOOGLE LOGIN
            </RPGButton>
        </div>
    );
};

const AchievementGuide = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] backdrop-blur-sm animate-in fade-in" onClick={onClose}>
        <div className="bg-slate-900 border-4 border-yellow-500/50 p-6 rounded-xl shadow-2xl w-96 max-w-[90%] relative" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors"><XCircle size={24} /></button>
            <h3 className="font-pixel text-xl text-yellow-400 mb-4 text-center flex items-center justify-center gap-2">
                <Award size={24} /> 成就獲得指南
            </h3>

            <div className="space-y-4 font-retro text-sm text-gray-300">
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-2">
                        <div className="text-blue-400 font-pixel text-xl">✔</div>
                        <span className="text-blue-400 font-bold text-lg">PASS (及格)</span>
                    </div>
                    <ul className="space-y-2 ml-1">
                        <li className="flex gap-2">
                            <span className="text-rpg-primary font-bold min-w-[4rem]">一般關卡:</span>
                            <span>所有項目 (寶箱/裝備/藥水/卷軸) 皆獲得 <span className="text-blue-400 font-bold">B 級以上</span>。</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-2">
                        <div className="text-green-500 font-pixel text-xl">✔</div>
                        <span className="text-green-400 font-bold text-lg">CLEAR (通關)</span>
                    </div>
                    <ul className="space-y-2 ml-1">
                        <li className="flex gap-2">
                            <span className="text-rpg-primary font-bold min-w-[4rem]">一般關卡:</span>
                            <span>所有項目 (寶箱/裝備/藥水/卷軸) 皆獲得 <span className="text-green-400 font-bold">A 級以上</span>。</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-red-400 font-bold min-w-[4rem]">BOSS 關:</span>
                            <span>累計獲勝 <span className="text-white font-bold">5 次</span> (需 A 級以上)。</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-2">
                        <div className="text-yellow-500 font-pixel text-xl">✔</div>
                        <span className="text-yellow-400 font-bold text-lg">COMPLETE (完美)</span>
                    </div>
                    <ul className="space-y-2 ml-1">
                        <li className="flex gap-2">
                            <span className="text-rpg-primary font-bold min-w-[4rem]">一般關卡:</span>
                            <span>所有項目 (寶箱/裝備/藥水/卷軸) 皆獲得 <span className="text-yellow-400 font-bold">S 級</span>。</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-red-400 font-bold min-w-[4rem]">BOSS 關:</span>
                            <span>累計獲勝 <span className="text-white font-bold">5 次</span> (需 S 級)。</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-6 text-center">
                <RPGButton onClick={onClose} color="primary" className="w-full py-3">了解！</RPGButton>
            </div>
        </div>
    </div>
);

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const getTaipeiWeekRange = (weekOffset = 0) => {
    const shiftedNow = new Date(Date.now() + TAIPEI_OFFSET_MS);
    const daysSinceMonday = (shiftedNow.getUTCDay() + 6) % 7;
    const mondayInTaipeiClock = Date.UTC(
        shiftedNow.getUTCFullYear(),
        shiftedNow.getUTCMonth(),
        shiftedNow.getUTCDate() - daysSinceMonday
    ) + (weekOffset * WEEK_MS);
    const startMs = mondayInTaipeiClock - TAIPEI_OFFSET_MS;
    return { startMs, endMs: startMs + WEEK_MS };
};

const getHistoryTime = (record) => {
    const value = record?.timestamp || record?.date;
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
};

const getWeeklyStats = (history = [], range) => {
    const records = history.filter(record => {
        const time = getHistoryTime(record);
        return time !== null && time >= range.startMs && time < range.endMs;
    });
    const answered = records.reduce((sum, record) => sum + (Number(record.totalQuestions) || 0), 0);
    const correct = records.reduce((sum, record) => {
        if (Number.isFinite(Number(record.correctCount))) return sum + Number(record.correctCount);
        const total = Number(record.totalQuestions) || 0;
        const accuracy = Number(record.accuracy) || 0;
        return sum + Math.round(total * accuracy / 100);
    }, 0);
    const accuracyValues = records
        .map(record => Number(record.accuracy))
        .filter(Number.isFinite);
    const accuracy = answered > 0
        ? (correct / answered) * 100
        : (accuracyValues.length > 0 ? accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length : 0);
    const activeDays = new Set(records.map(record => {
        const time = getHistoryTime(record);
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date(time));
    })).size;

    return {
        sessions: records.length,
        answered,
        correct,
        accuracy,
        activeDays,
        score: records.reduce((sum, record) => sum + (Number(record.score) || 0), 0)
    };
};

const formatWeekRange = ({ startMs, endMs }) => {
    const formatter = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric'
    });
    return `${formatter.format(new Date(startMs))}－${formatter.format(new Date(endMs - 1))}`;
};

const maskStudentName = (name = '神秘勇者') => {
    const trimmed = String(name).trim();
    if (trimmed.length <= 1) return `${trimmed || '勇'}○`;
    if (trimmed.length === 2) return `${trimmed[0]}○`;
    return `${trimmed[0]}${'○'.repeat(Math.max(1, trimmed.length - 2))}${trimmed[trimmed.length - 1]}`;
};

const WEEKLY_TRIVIA = [
    { icon: '🧠', title: '單字記憶不是一次完成', text: '把複習分散到不同天，通常比同一天重複背很多次更容易記久。' },
    { icon: '🐙', title: 'octopus 的複數', text: 'octopuses 是最常見的英文複數；octopi 雖常聽見，來源其實是誤套拉丁文規則。' },
    { icon: '✍️', title: '字母 i 的小點', text: '英文字母 i 和 j 上方的小點有名字，叫做 tittle。' },
    { icon: '📚', title: '最常見的英文字母', text: '在一般英文文本中，e 通常是出現頻率最高的字母。' },
    { icon: '⚔️', title: '錯題其實更有價值', text: '答錯後立刻回想正解，會讓大腦更清楚辨認原本混淆的線索。' },
    { icon: '🌍', title: 'English 不只一種', text: '不同地區的英文在拼字、發音和用字上都可能不同，但不代表其中一種必然是錯的。' }
];

const WeeklyReport = ({ onBack, currentUserId, userData }) => {
    const [period, setPeriod] = useState('current');
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [revealedFact, setRevealedFact] = useState(null);
    const range = getTaipeiWeekRange(period === 'current' ? 0 : -1);

    useEffect(() => {
        let active = true;
        getDocs(collection(db, 'users'))
            .then(snapshot => {
                if (!active) return;
                const loaded = snapshot.docs.map(studentDoc => ({ id: studentDoc.id, ...studentDoc.data() }));
                setStudents(loaded);
            })
            .catch(error => {
                console.error('讀取每週排行榜失敗', error);
                if (active) setLoadError(true);
            })
            .finally(() => { if (active) setIsLoading(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => { setRevealedFact(null); }, [period]);

    const classEntries = students.map(student => ({
        ...student,
        weekly: getWeeklyStats(student.trialHistory || [], range)
    }));
    const remoteCurrent = classEntries.find(student => student.id === currentUserId);
    const currentStats = getWeeklyStats(userData?.trialHistory || remoteCurrent?.trialHistory || [], range);
    const activeStudents = classEntries.filter(student => student.weekly.sessions > 0);
    const leaderboard = [...activeStudents].sort((a, b) => (
        b.weekly.correct - a.weekly.correct ||
        b.weekly.accuracy - a.weekly.accuracy ||
        b.weekly.sessions - a.weekly.sessions
    ));
    const currentRank = leaderboard.findIndex(student => student.id === currentUserId) + 1;
    const classAverage = activeStudents.length > 0 ? {
        correct: activeStudents.reduce((sum, student) => sum + student.weekly.correct, 0) / activeStudents.length,
        sessions: activeStudents.reduce((sum, student) => sum + student.weekly.sessions, 0) / activeStudents.length,
        accuracy: activeStudents.reduce((sum, student) => sum + student.weekly.accuracy, 0) / activeStudents.length
    } : { correct: 0, sessions: 0, accuracy: 0 };
    const comparisonRows = [
        { label: '答對題數', mine: currentStats.correct, average: classAverage.correct, suffix: ' 題' },
        { label: '挑戰場次', mine: currentStats.sessions, average: classAverage.sessions, suffix: ' 場' },
        { label: '答題準確率', mine: currentStats.accuracy, average: classAverage.accuracy, suffix: '%' }
    ];
    const visibleLeaderboard = leaderboard.slice(0, 5);
    const currentOutsideTopFive = currentRank > 5 ? leaderboard[currentRank - 1] : null;
    const factUnlocked = currentStats.sessions >= 3;

    const drawTrivia = () => {
        if (!factUnlocked) return;
        const seed = Math.abs([...`${currentUserId || 'hero'}-${range.startMs}`]
            .reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) | 0, 7));
        setRevealedFact(WEEKLY_TRIVIA[seed % WEEKLY_TRIVIA.length]);
        playSound('success');
    };

    return (
        <div className="flex flex-col h-full bg-[#24173a] text-white">
            <div className="flex items-center justify-between p-3 border-b-4 border-yellow-500/70 bg-black/40">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <div className="text-center">
                    <h2 className="font-pixel text-sm text-yellow-300">每週冒險戰報</h2>
                    <p className="font-retro text-[10px] text-gray-400">WEEKLY QUEST REPORT</p>
                </div>
                <div className="w-9 text-center text-xl">🏆</div>
            </div>

            <div className="grid grid-cols-2 bg-black/50 border-b-2 border-yellow-500/30">
                <button onClick={() => setPeriod('current')} className={`py-2 font-pixel text-[10px] ${period === 'current' ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}>本週累積</button>
                <button onClick={() => setPeriod('previous')} className={`py-2 font-pixel text-[10px] ${period === 'previous' ? 'bg-purple-500 text-white' : 'text-gray-400'}`}>上週結算</button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                <section className="border-4 border-yellow-500/60 bg-gradient-to-br from-[#513018] to-[#24173a] p-4 shadow-xl">
                    <div className="flex justify-between items-start gap-3">
                        <div>
                            <p className="font-pixel text-[10px] text-yellow-300">{period === 'current' ? '本週累積戰力' : '上週最終戰績'}</p>
                            <p className="font-retro text-[11px] text-gray-300 mt-1">{formatWeekRange(range)} · 週一至週日</p>
                        </div>
                        <div className="text-right">
                            <div className="font-pixel text-3xl text-yellow-300">{currentStats.correct}</div>
                            <div className="font-retro text-[10px] text-yellow-100">答對題數</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="bg-black/35 border border-white/10 p-2"><div className="font-pixel text-lg text-cyan-300">{currentStats.sessions}</div><div className="font-retro text-[10px] text-gray-300">挑戰場次</div></div>
                        <div className="bg-black/35 border border-white/10 p-2"><div className="font-pixel text-lg text-green-300">{Math.round(currentStats.accuracy)}%</div><div className="font-retro text-[10px] text-gray-300">準確率</div></div>
                        <div className="bg-black/35 border border-white/10 p-2"><div className="font-pixel text-lg text-purple-300">{currentStats.activeDays}</div><div className="font-retro text-[10px] text-gray-300">活躍天數</div></div>
                    </div>
                    <p className="font-retro text-[10px] text-gray-400 mt-3">
                        {period === 'current' ? '每週一 00:00 重新累積，週日 23:59 結算。' : '排行依答對題數計算；同分時依準確率與挑戰場次排序。'}
                    </p>
                </section>

                <section className="border-2 border-purple-400/50 bg-black/30 p-3">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-pixel text-xs text-purple-200">我和班級的比較</h3>
                        <span className="font-retro text-[10px] text-gray-400">{activeStudents.length} 位本週有作答</span>
                    </div>
                    <div className="space-y-3">
                        {comparisonRows.map(row => {
                            const scale = Math.max(row.mine, row.average, 1);
                            return (
                                <div key={row.label}>
                                    <div className="flex justify-between font-retro text-[11px] mb-1">
                                        <span>{row.label}</span>
                                        <span className="text-cyan-300">我 {Math.round(row.mine)}{row.suffix} · 班平均 {Math.round(row.average)}{row.suffix}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-2 bg-black/70"><div className="h-full bg-cyan-400" style={{ width: `${(row.mine / scale) * 100}%` }}></div></div>
                                        <div className="h-1 bg-black/70"><div className="h-full bg-purple-400" style={{ width: `${(row.average / scale) * 100}%` }}></div></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="border-2 border-yellow-500/50 bg-black/30 overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b border-yellow-500/30">
                        <h3 className="font-pixel text-xs text-yellow-300">班級排行榜</h3>
                        <span className="font-retro text-[10px] text-gray-400">其他同學姓名已隱藏</span>
                    </div>
                    {isLoading ? (
                        <div className="p-5 text-center font-retro text-sm text-gray-400 animate-pulse">載入班級戰績...</div>
                    ) : loadError ? (
                        <div className="p-5 text-center font-retro text-sm text-gray-400">目前無法讀取班級排行，個人戰報仍可正常使用。</div>
                    ) : visibleLeaderboard.length === 0 ? (
                        <div className="p-5 text-center font-retro text-sm text-gray-400">這一週還沒有人完成挑戰，搶下第一名吧！</div>
                    ) : (
                        <div>
                            {visibleLeaderboard.map((student, index) => {
                                const isMe = student.id === currentUserId;
                                return (
                                    <div key={student.id} className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 px-3 py-2 border-b border-white/10 ${isMe ? 'bg-cyan-900/40' : ''}`}>
                                        <span className={`font-pixel text-sm ${index < 3 ? 'text-yellow-300' : 'text-gray-400'}`}>#{index + 1}</span>
                                        <div className="min-w-0"><div className="font-retro text-sm truncate">{isMe ? `${student.studentName || userData?.studentName || '我'}（我）` : maskStudentName(student.studentName)}</div><div className="font-retro text-[9px] text-gray-500">準確率 {Math.round(student.weekly.accuracy)}%</div></div>
                                        <span className="font-pixel text-xs text-yellow-300">{student.weekly.correct} 題</span>
                                    </div>
                                );
                            })}
                            {currentOutsideTopFive && (
                                <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 px-3 py-2 bg-cyan-900/40 border-t-2 border-dashed border-cyan-500/50">
                                    <span className="font-pixel text-sm text-cyan-300">#{currentRank}</span>
                                    <span className="font-retro text-sm">{currentOutsideTopFive.studentName || userData?.studentName || '我'}（我）</span>
                                    <span className="font-pixel text-xs text-yellow-300">{currentOutsideTopFive.weekly.correct} 題</span>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <section className={`border-4 p-4 text-center ${factUnlocked ? 'border-green-400/60 bg-green-950/40' : 'border-gray-600 bg-black/30'}`}>
                    {revealedFact ? (
                        <div className="animate-in fade-in">
                            <div className="text-4xl mb-2">{revealedFact.icon}</div>
                            <h3 className="font-pixel text-xs text-green-300 mb-2">{revealedFact.title}</h3>
                            <p className="font-retro text-sm text-gray-200 leading-relaxed">{revealedFact.text}</p>
                            <p className="font-retro text-[10px] text-gray-500 mt-3">本週冷知識卡已揭曉</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-3xl mb-2">🎁</div>
                            <h3 className="font-pixel text-xs text-green-300">冷知識抽卡</h3>
                            <p className="font-retro text-xs text-gray-300 my-2">本週完成 3 場挑戰，即可抽出一張英文冷知識卡。</p>
                            <RPGButton onClick={drawTrivia} color={factUnlocked ? 'success' : 'dark'} disabled={!factUnlocked} className="w-full mt-3">
                                {factUnlocked ? '抽一張冷知識卡' : `還差 ${Math.max(0, 3 - currentStats.sessions)} 場解鎖`}
                            </RPGButton>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

const WorldMap = ({ onSelectNode, onViewJourney, onViewWeeklyReport, onUltimateChallenge, onViewMistakeNotebook, onLogout, records = {}, advMeta = null, activeTab = 'main', onChangeTab }) => {
    const [showGuide, setShowGuide] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    return (
        <div className="flex flex-col h-full bg-[#3d2963]">
            {showGuide && <AchievementGuide onClose={() => setShowGuide(false)} />}
            <div className="bg-rpg-bg sticky top-0 z-10 p-2 border-b-4 border-rpg-border shadow-lg flex justify-between items-center">
                <div className="flex items-center gap-1">
                    <button onClick={onUltimateChallenge} className="text-rpg-primary hover:text-white p-1" title="終極試煉">
                        <div className="w-8 h-8"><PixelArt.Dragon /></div>
                    </button>
                    <button onClick={() => setShowGuide(true)} className="text-yellow-400 hover:text-yellow-200 p-1 animate-pulse" title="成就說明">
                        <HelpCircle size={24} />
                    </button>
                </div>
                <h2 className="font-pixel text-white text-center flex items-center justify-center gap-2"><MapIcon size={16} /> WORLD MAP</h2>
                <div className="flex items-center gap-1">
                    <button onClick={onViewWeeklyReport} className="text-yellow-400 hover:text-yellow-200 p-1" title="每週冒險戰報">
                        <Award size={21} />
                    </button>
                    <button onClick={onViewMistakeNotebook} className="text-red-400 hover:text-red-300 p-1" title="錯題筆記本">
                        <Book size={20} />
                    </button>
                    <button onClick={onViewJourney} className="text-rpg-accent hover:text-white p-1" title="我的冒險旅程">
                        <Backpack size={20} />
                    </button>
                </div>
            </div>
            {/* 主線 / 進階 地圖切換 */}
            <div className="flex bg-black/60 border-b-4 border-rpg-border z-10">
                <button
                    onClick={() => { playSound('click'); onChangeTab && onChangeTab('main'); }}
                    className={`flex-1 py-2 font-pixel text-xs transition-colors ${activeTab === 'main' ? 'bg-rpg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ⚔ 主線冒險
                </button>
                <button
                    onClick={() => { playSound('click'); onChangeTab && onChangeTab('adv'); }}
                    className={`flex-1 py-2 font-pixel text-xs transition-colors ${activeTab === 'adv' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ✦ 進階篇章
                </button>
            </div>
            <div className="flex-1 overflow-y-auto relative p-4 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]">
                <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="absolute top-3 right-3 bg-[#1a1a1a] p-1.5 rounded-full border-2 border-[#333] hover:bg-red-900 transition-colors shadow-black shadow-sm z-10"
                    title="登出"
                >
                    <LogOut size={14} color="#aaa" />
                </button>
                {showLogoutConfirm && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                        <RPGBorder className="bg-rpg-panel p-6 w-full max-w-xs text-center shadow-2xl">
                            <h3 className="font-retro text-xl font-bold text-rpg-bg mb-6">確定要登出嗎?</h3>
                            <div className="flex gap-4 justify-center">
                                <RPGButton onClick={() => { playSound('click'); setShowLogoutConfirm(false); }} color="neutral">取消</RPGButton>
                                <RPGButton onClick={() => { playSound('click'); setShowLogoutConfirm(false); onLogout(); }} color="primary">確定</RPGButton>
                            </div>
                        </RPGBorder>
                    </div>
                )}
                {activeTab === 'main' && MAP_STRUCTURE.map((node, index) => {
                    const isBoss = node.type === 'boss';
                    const info = LEVEL_INFO[node.id];
                    const sectionHeader = !isBoss && SECTION_HEADERS[node.id];

                    return (
                        <div key={index} className="flex flex-col items-center">
                            {/* Section Header */}
                            {sectionHeader && (
                                <div className="w-full max-w-xs mb-4 mt-2">
                                    <div className="bg-gradient-to-r from-transparent via-rpg-border to-transparent h-[2px] w-full mb-1"></div>
                                    <h3 className="text-center font-pixel text-yellow-400 text-sm tracking-widest text-shadow">{sectionHeader.title}</h3>
                                    <p className="text-center font-retro text-gray-300 text-xs">{sectionHeader.subtitle}</p>
                                    <div className="bg-gradient-to-r from-transparent via-rpg-border to-transparent h-[2px] w-full mt-1"></div>
                                </div>
                            )}

                            <div className="relative flex justify-center w-full">
                                {index > 0 && !sectionHeader && <div className="absolute -top-6 h-6 w-1 bg-rpg-border/50"></div>}
                                <button onClick={() => { playSound('click'); onSelectNode(node); }} className={`relative w-full max-w-xs p-2 border-4 transition-all hover:scale-105 active:scale-95 text-left group flex items-center gap-3 shadow-xl ${isBoss ? 'bg-red-950 border-red-500' : 'bg-rpg-panel border-rpg-border'}`}>
                                    <div
                                        className={`w-14 h-14 flex-shrink-0 border-2 border-black overflow-hidden flex items-center justify-center relative`}
                                        style={{ backgroundColor: isBoss ? '#000000' : getLevelColor(node.id) }}
                                    >
                                        {isBoss ? <PixelArt.Castle /> : getLevelIcon(node.id)}
                                        {/* Boss Achievement Checkmark */}
                                        {isBoss && records[node.id]?.bestStatus === 'COMPLETE' && (
                                            <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 border border-yellow-400 z-10">
                                                <div className="text-yellow-400 font-pixel text-xs">✔</div>
                                            </div>
                                        )}
                                        {isBoss && records[node.id]?.bestStatus === 'CLEAR' && (
                                            <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 border border-green-400 z-10">
                                                <div className="text-green-400 font-pixel text-xs">✔</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        {isBoss ? (
                                            <h3 className="font-pixel text-lg text-red-400 leading-tight flex items-center gap-2">
                                                {node.label}
                                                {records[node.id]?.bestStatus === 'COMPLETE' && <span className="text-[10px] text-yellow-500 border border-yellow-500 px-1 rounded bg-black/50">COMPLETE</span>}
                                                {records[node.id]?.bestStatus === 'CLEAR' && <span className="text-[10px] text-green-500 border border-green-500 px-1 rounded bg-black/50">CLEAR</span>}
                                            </h3>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-baseline">
                                                    <h3 className="font-pixel text-xl text-rpg-bg leading-tight">UNIT {node.id}</h3>
                                                    {info?.sub && <span className="font-pixel text-[10px] bg-black/10 px-1 rounded ml-1 text-rpg-border">{info.sub}</span>}
                                                </div>
                                                <p className="font-retro text-[12px] text-gray-700 mt-1 leading-snug">
                                                    Level {node.id < 10 ? '0' + node.id : node.id}_{info?.title}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    {/* General Achievement Checkmark */}
                                    {!isBoss && (() => {
                                        const status = getUnitAchievementStatus(records[node.id]);
                                        if (!status) {
                                            return (
                                                <div className="flex flex-col items-center justify-center opacity-30">
                                                    <div className="w-6 h-6 border-2 border-gray-400 rounded bg-black/20" title="Complete all categories with B rank or higher"></div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="flex flex-col items-center justify-center animate-pulse">
                                                {status === 'COMPLETE' && (
                                                    <div className="text-yellow-500 font-pixel text-xl drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" title="COMPLETE (All S)">✔</div>
                                                )}
                                                {status === 'CLEAR' && (
                                                    <div className="text-green-500 font-pixel text-xl drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]" title="CLEAR (All A+)">✔</div>
                                                )}
                                                {status === 'PASS' && (
                                                    <div className="text-blue-400 font-pixel text-xl drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" title="PASS (All B+)">✔</div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    <ChevronRight className={isBoss ? 'text-red-500' : 'text-rpg-bg'} size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {activeTab === 'adv' && (() => {
                    const totalLessons = advMeta?.totalLessons || 0;
                    if (totalLessons === 0) {
                        return (
                            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                                <Lock size={48} className="text-gray-400" />
                                <p className="font-pixel text-gray-300 text-sm">進階篇章準備中...</p>
                                <p className="font-retro text-gray-400 text-xs">COMING SOON</p>
                            </div>
                        );
                    }
                    return Array.from({ length: totalLessons }, (_, i) => i + 1).map(n => {
                        const isSectionStart = (n - 1) % ADV_LESSONS_PER_SECTION === 0;
                        const sectionIdx = Math.floor((n - 1) / ADV_LESSONS_PER_SECTION) + 1;
                        const sectionEnd = Math.min(sectionIdx * ADV_LESSONS_PER_SECTION, totalLessons);
                        const record = records[advLessonId(n)] || {};
                        const clears = record.clears || 0;
                        const starCount = Math.min(clears, ADV_CLEARS_TO_COMPLETE);
                        const isDone = clears >= ADV_CLEARS_TO_COMPLETE;
                        const title = advMeta?.titles?.[String(n)] || `進階單字 第 ${n} 課`;

                        return (
                            <div key={n} className="flex flex-col items-center">
                                {isSectionStart && (
                                    <div className="w-full max-w-xs mb-4 mt-2">
                                        <div className="bg-gradient-to-r from-transparent via-purple-400 to-transparent h-[2px] w-full mb-1"></div>
                                        <h3 className="text-center font-pixel text-purple-300 text-sm tracking-widest text-shadow">進階 第 {sectionIdx} 卷</h3>
                                        <p className="text-center font-retro text-gray-300 text-xs">Lesson {(sectionIdx - 1) * ADV_LESSONS_PER_SECTION + 1} - {sectionEnd}</p>
                                        <div className="bg-gradient-to-r from-transparent via-purple-400 to-transparent h-[2px] w-full mt-1"></div>
                                    </div>
                                )}
                                <div className="relative flex justify-center w-full">
                                    {!isSectionStart && <div className="absolute -top-6 h-6 w-1 bg-purple-400/40"></div>}
                                    <button
                                        onClick={() => { playSound('click'); onSelectNode({ type: 'adv', id: advLessonId(n), lesson: n }); }}
                                        className={`relative w-full max-w-xs p-2 border-4 transition-all hover:scale-105 active:scale-95 text-left group flex items-center gap-3 shadow-xl ${isDone ? 'bg-purple-950 border-yellow-400' : 'bg-rpg-panel border-purple-400'}`}
                                    >
                                        <div className="w-14 h-14 flex-shrink-0 border-2 border-black overflow-hidden flex items-center justify-center bg-purple-900">
                                            <PixelArt.Chest />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-baseline">
                                                <h3 className={`font-pixel text-lg leading-tight ${isDone ? 'text-yellow-300' : 'text-rpg-bg'}`}>L{n < 10 ? '0' + n : n}</h3>
                                                <span className={`font-pixel text-sm tracking-widest ${isDone ? 'text-yellow-400' : 'text-purple-300'}`}>
                                                    {'★'.repeat(starCount)}{'☆'.repeat(ADV_CLEARS_TO_COMPLETE - starCount)}
                                                </span>
                                            </div>
                                            <p className={`font-retro text-[12px] mt-1 leading-snug truncate ${isDone ? 'text-purple-200' : 'text-gray-700'}`}>{title}</p>
                                        </div>
                                        {isDone && (
                                            <div className="text-yellow-400 font-pixel text-xl drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" title="通關 3 次達成！">✔</div>
                                        )}
                                        <ChevronRight className={isDone ? 'text-yellow-400' : 'text-rpg-bg'} size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    });
                })()}
                <div className="h-10"></div>
            </div>
        </div>
    );
};

// --- Helper for Rank Calculation (Supports new nested and legacy flat structure) ---
const calculateTotalRank = (record) => {
    if (!record) return { rank: '?', color: '#9ca3af' }; // Gray

    const weights = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    let sum = 0;

    ACHIEVEMENT_CATS.forEach(cat => {
        const grade = getGradeWithVocabFallback(record, cat);
        if (grade && weights[grade]) {
            sum += weights[grade];
        }
    });

    const avg = Math.ceil(sum / ACHIEVEMENT_CATS.length);

    const map = { 5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D', 0: '?' };
    const rank = map[avg] || '?';

    // Color Mapping (S=Gold, A=Orange, B=Blue, C=Green, D=Gray)
    const colors = {
        'S': '#fbbf24', // Gold
        'A': '#fb923c', // Orange
        'B': '#3b82f6', // Blue
        'C': '#10b981', // Green
        'D': '#9ca3af', // Gray
        '?': '#4b5563'  // Dark Gray
    };

    return { rank, color: colors[rank] };
};

const PasswordEntryModal = ({ onClose, onSuccess }) => {
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);

    const handleSubmit = () => {
        if (password === "1999") {
            playSound('success');
            onSuccess();
            onClose();
        } else {
            setError(true);
            playSound('wrong');
            setTimeout(() => setError(false), 500);
        }
    };

    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[120] backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border-4 border-indigo-500/50 p-6 rounded-xl shadow-2xl w-80 max-w-[90%] flex flex-col items-center gap-4 relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors"><XCircle size={24} /></button>

                <div className={`p-4 rounded-full mb-1 transition-all duration-300 ${error ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    <Lock size={40} className={error ? 'animate-shake' : ''} />
                </div>

                <div className="text-center">
                    <h3 className="font-pixel text-xl text-indigo-300 mb-1">TEACHER ACCESS</h3>
                    <p className="text-xs text-slate-500 font-retro">SECURE GATEWAY</p>
                </div>

                <div className="w-full relative my-2">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(false); }}
                        className={`w-full bg-slate-950 border-2 ${error ? 'border-red-500' : 'border-slate-700 focus:border-indigo-500'} rounded-lg p-3 text-center text-white font-pixel text-lg tracking-widest outline-none transition-all placeholder:text-slate-700`}
                        placeholder="••••"
                        maxLength={8}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                </div>

                <div className="flex gap-3 w-full">
                    <button onClick={onClose} className="flex-1 py-2 text-xs font-pixel text-slate-400 hover:text-white border border-transparent hover:border-slate-600 rounded transition-all">CANCEL</button>
                    <button onClick={handleSubmit} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-pixel text-xs rounded shadow-[0_4px_0_rgb(55,48,163)] active:shadow-none active:translate-y-[4px] transition-all">
                        UNLOCK
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdvancedJourneyView = ({ records = {}, advMeta = null, mistakeStats = {} }) => {
    const [expandedVolume, setExpandedVolume] = useState(null);
    const totalLessons = Number(advMeta?.totalLessons) || 0;
    const gradePoints = { S: 100, A: 90, B: 80, C: 70, D: 60, E: 0, '?': 0 };
    const gradeColors = { S: '#fbbf24', A: '#fb923c', B: '#60a5fa', C: '#34d399', D: '#9ca3af', E: '#6b7280', '?': '#6b7280' };

    const lessonRecords = Array.from({ length: totalLessons }, (_, index) => {
        const lesson = index + 1;
        return { lesson, record: records[advLessonId(lesson)] || {} };
    });
    const attemptedLessons = lessonRecords.filter(({ record }) =>
        (record.attempts || 0) > 0 || (record.clears || 0) > 0 || Boolean(record.bestGrade)
    );
    const completedLessons = lessonRecords.filter(({ record }) => (record.clears || 0) >= ADV_CLEARS_TO_COMPLETE).length;
    const earnedStars = lessonRecords.reduce((sum, { record }) => sum + Math.min(record.clears || 0, ADV_CLEARS_TO_COMPLETE), 0);
    const maxStars = totalLessons * ADV_CLEARS_TO_COMPLETE;
    const starProgress = maxStars > 0 ? earnedStars / maxStars : 0;
    const gradeCoverage = totalLessons > 0
        ? lessonRecords.reduce((sum, { record }) => sum + (gradePoints[record.bestGrade] || 0), 0) / (totalLessons * 100)
        : 0;
    const mastery = Math.round((starProgress * 0.6 + gradeCoverage * 0.4) * 100);
    const title = mastery >= 95 ? '單字大師'
        : mastery >= 80 ? '進階達人'
            : mastery >= 60 ? '菁英勇者'
                : mastery >= 40 ? '穩定挑戰者'
                    : mastery >= 20 ? '進階學徒'
                        : '初探者';
    const gradeDistribution = ['S', 'A', 'B', 'C', 'D', 'E'].reduce((counts, grade) => {
        counts[grade] = attemptedLessons.filter(({ record }) => record.bestGrade === grade).length;
        return counts;
    }, {});

    const accuracyHistory = lessonRecords
        .flatMap(({ lesson, record }) => (record.accuracyHistory || []).map(entry => ({ ...entry, lesson })))
        .filter(entry => Number.isFinite(Number(entry.accuracy)))
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    const recentTen = accuracyHistory.slice(0, 10);
    const recentAccuracy = recentTen.length > 0
        ? recentTen.reduce((sum, entry) => sum + Number(entry.accuracy), 0) / recentTen.length
        : null;
    const newestFive = accuracyHistory.slice(0, 5);
    const previousFive = accuracyHistory.slice(5, 10);
    const average = (entries) => entries.reduce((sum, entry) => sum + Number(entry.accuracy), 0) / entries.length;
    const trendDelta = newestFive.length === 5 && previousFive.length === 5
        ? average(newestFive) - average(previousFive)
        : null;
    const trend = trendDelta === null
        ? { label: '資料累積中', color: 'text-gray-400', symbol: '…' }
        : trendDelta >= 5
            ? { label: '進步中', color: 'text-green-300', symbol: '↑' }
            : trendDelta <= -5
                ? { label: '建議複習', color: 'text-red-300', symbol: '↓' }
                : { label: '表現穩定', color: 'text-blue-300', symbol: '→' };

    const advancedMistakes = Object.values(mistakeStats).filter(data =>
        data?.source === 'advanced' && Number.isFinite(Number(data?.lesson)) && (data.count || 0) > 0
    );
    const mistakeByLesson = advancedMistakes.reduce((groups, data) => {
        const lesson = Number(data.lesson);
        if (!groups[lesson]) groups[lesson] = { lesson, wordCount: 0, errorCount: 0 };
        groups[lesson].wordCount += 1;
        groups[lesson].errorCount += data.count || 0;
        return groups;
    }, {});
    const weakestLessons = Object.values(mistakeByLesson)
        .sort((a, b) => b.wordCount - a.wordCount || b.errorCount - a.errorCount || a.lesson - b.lesson)
        .slice(0, 3);
    const totalErrorCount = advancedMistakes.reduce((sum, data) => sum + (data.count || 0), 0);

    let recommendation = null;
    if (weakestLessons.length > 0) {
        recommendation = { lesson: weakestLessons[0].lesson, reason: '目前錯字最多，建議優先複習' };
    } else {
        const lowestAccuracy = attemptedLessons
            .filter(({ record }) => Number.isFinite(Number(record.lastAccuracy)))
            .sort((a, b) => Number(a.record.lastAccuracy) - Number(b.record.lastAccuracy))[0];
        if (lowestAccuracy) recommendation = { lesson: lowestAccuracy.lesson, reason: '近期正確率較低，適合再次挑戰' };
        else {
            const nextLesson = lessonRecords.find(({ record }) => (record.clears || 0) < ADV_CLEARS_TO_COMPLETE);
            if (nextLesson) recommendation = { lesson: nextLesson.lesson, reason: '繼續完成下一個尚未通關的篇章' };
        }
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return '資料累積中';
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return '資料累積中';
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    };

    const averageGrade = (volumeLessons) => {
        const played = volumeLessons.map(({ record }) => gradePoints[record.bestGrade] || 0).filter(score => score > 0);
        if (played.length === 0) return '?';
        const score = played.reduce((sum, value) => sum + value, 0) / played.length;
        if (score >= 95) return 'S';
        if (score >= 85) return 'A';
        if (score >= 75) return 'B';
        if (score >= 65) return 'C';
        return 'D';
    };

    if (totalLessons === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#160d2b]">
                <Book size={54} className="text-purple-400/50 mb-4" />
                <p className="font-pixel text-purple-200 text-sm">進階旅程準備中</p>
                <p className="font-retro text-gray-500 text-xs mt-2">進階目錄載入後會顯示能力報告</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 bg-[#160d2b] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
            <section className="mb-5 border-4 border-purple-500 bg-gradient-to-b from-purple-950 to-black p-4 shadow-[0_0_24px_rgba(168,85,247,0.25)]">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="font-pixel text-[9px] text-purple-300">ADVENTURER REPORT</p>
                        <h3 className="font-pixel text-sm text-white mt-1">冒險者能力報告</h3>
                    </div>
                    <div className="text-right">
                        <div className="font-pixel text-yellow-300 text-sm">{title}</div>
                        <div className="font-retro text-[10px] text-gray-400">進階掌握度 {mastery}%</div>
                    </div>
                </div>

                <div className="h-3 bg-black border border-purple-700 mb-4 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-400 transition-all" style={{ width: `${mastery}%` }}></div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/5 border border-purple-700/70 p-2">
                        <div className="font-retro text-[10px] text-gray-400">完成進度</div>
                        <div className="font-pixel text-sm text-white mt-1">{completedLessons}/{totalLessons} 課</div>
                        <div className="font-retro text-[10px] text-yellow-300 mt-1">★ {earnedStars}/{maxStars}</div>
                    </div>
                    <div className="bg-white/5 border border-purple-700/70 p-2">
                        <div className="font-retro text-[10px] text-gray-400">最近 10 次正確率</div>
                        <div className="font-pixel text-sm text-white mt-1">{recentAccuracy === null ? '累積中' : `${Math.round(recentAccuracy)}%`}</div>
                        <div className={`font-retro text-[10px] mt-1 ${trend.color}`}>{trend.symbol} {trend.label}</div>
                    </div>
                    <div className="bg-white/5 border border-purple-700/70 p-2">
                        <div className="font-retro text-[10px] text-gray-400">目前進階錯題</div>
                        <div className="font-pixel text-sm text-red-300 mt-1">{advancedMistakes.length} 字</div>
                        <div className="font-retro text-[10px] text-gray-400 mt-1">累積 {totalErrorCount} 次錯誤</div>
                    </div>
                    <div className="bg-white/5 border border-purple-700/70 p-2">
                        <div className="font-retro text-[10px] text-gray-400">已挑戰範圍</div>
                        <div className="font-pixel text-sm text-cyan-300 mt-1">{attemptedLessons.length} 課</div>
                        <div className="font-retro text-[10px] text-gray-400 mt-1">共 {accuracyHistory.length} 筆分析</div>
                    </div>
                </div>

                {weakestLessons.length > 0 && (
                    <div className="mb-3">
                        <div className="font-retro text-[10px] text-gray-400 mb-1">錯題較多的課次</div>
                        <div className="flex flex-wrap gap-2">
                            {weakestLessons.map(item => (
                                <span key={item.lesson} className="font-pixel text-[9px] text-red-200 bg-red-950 border border-red-700 px-2 py-1">
                                    L{item.lesson} · {item.wordCount} 字
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-3">
                    <div className="font-retro text-[10px] text-gray-400 mb-1">各課最佳評級分布</div>
                    <div className="grid grid-cols-6 gap-1">
                        {['S', 'A', 'B', 'C', 'D', 'E'].map(grade => (
                            <div key={grade} className="bg-black/50 border border-gray-700 py-1 text-center">
                                <div className="font-pixel text-[9px]" style={{ color: gradeColors[grade] }}>{grade}</div>
                                <div className="font-retro text-[10px] text-white mt-1">{gradeDistribution[grade]}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {recommendation && (
                    <div className="bg-yellow-950/50 border-2 border-yellow-600 p-2 flex gap-2 items-start">
                        <Lightbulb size={18} className="text-yellow-300 flex-shrink-0" />
                        <div>
                            <div className="font-pixel text-[10px] text-yellow-300">下一步：第 {recommendation.lesson} 課</div>
                            <div className="font-retro text-xs text-gray-300 mt-1">{recommendation.reason}</div>
                        </div>
                    </div>
                )}

                <p className="font-retro text-[9px] text-gray-600 mt-3 text-center">此稱號代表 App 內的進階學習進度，不是正式英文檢定等級。</p>
            </section>

            <div className="space-y-3 pb-10">
                {Array.from({ length: Math.ceil(totalLessons / ADV_LESSONS_PER_SECTION) }, (_, volumeIndex) => {
                    const start = volumeIndex * ADV_LESSONS_PER_SECTION;
                    const volumeLessons = lessonRecords.slice(start, Math.min(start + ADV_LESSONS_PER_SECTION, totalLessons));
                    const volumeStars = volumeLessons.reduce((sum, { record }) => sum + Math.min(record.clears || 0, ADV_CLEARS_TO_COMPLETE), 0);
                    const volumeCompleted = volumeLessons.filter(({ record }) => (record.clears || 0) >= ADV_CLEARS_TO_COMPLETE).length;
                    const grade = averageGrade(volumeLessons);
                    const isExpanded = expandedVolume === volumeIndex;
                    return (
                        <section key={volumeIndex} className="border-2 border-purple-700 bg-black/50">
                            <button
                                onClick={() => { playSound('click'); setExpandedVolume(isExpanded ? null : volumeIndex); }}
                                className="w-full p-3 flex items-center justify-between text-left hover:bg-purple-900/40 transition-colors"
                            >
                                <div>
                                    <div className="font-pixel text-xs text-purple-200">進階 第 {volumeIndex + 1} 卷</div>
                                    <div className="font-retro text-[10px] text-gray-400 mt-1">第 {volumeLessons[0].lesson}～{volumeLessons[volumeLessons.length - 1].lesson} 課 · 完成 {volumeCompleted}/{volumeLessons.length}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="font-pixel text-[10px] text-yellow-300">★ {volumeStars}/{volumeLessons.length * ADV_CLEARS_TO_COMPLETE}</div>
                                        <div className="font-pixel text-[10px] mt-1" style={{ color: gradeColors[grade] }}>AVG {grade}</div>
                                    </div>
                                    <ChevronRight size={18} className={`text-purple-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-purple-800 p-2 space-y-2">
                                    {volumeLessons.map(({ lesson, record }) => {
                                        const clears = Math.min(record.clears || 0, ADV_CLEARS_TO_COMPLETE);
                                        const hasPlayed = Object.keys(record).length > 0;
                                        const attempts = record.attempts ?? Math.max(record.clears || 0, 0);
                                        return (
                                            <div key={lesson} className={`p-2 border flex items-center justify-between ${hasPlayed ? 'bg-purple-950/50 border-purple-700' : 'bg-gray-900/50 border-gray-800 opacity-60'}`}>
                                                <div className="min-w-0 pr-2">
                                                    <div className="font-pixel text-[10px] text-white">L{String(lesson).padStart(3, '0')} · {advMeta?.titles?.[String(lesson)] || `進階單字 第 ${lesson} 課`}</div>
                                                    <div className="font-retro text-[10px] text-gray-400 mt-1">{hasPlayed ? `${attempts} 次挑戰 · ${formatDate(record.lastPlayed)}` : '尚未挑戰'}</div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className="font-pixel text-[11px] text-yellow-300">{'★'.repeat(clears)}{'☆'.repeat(ADV_CLEARS_TO_COMPLETE - clears)}</div>
                                                    <div className="font-pixel text-[9px] mt-1" style={{ color: gradeColors[record.bestGrade || '?'] }}>
                                                        {hasPlayed ? `${record.bestGrade || '?'} · ${record.bestScore ?? 0}` : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

const JourneyMode = ({ onBack, onViewTrialLog, records = {}, advMeta = null, mistakeStats = {} }) => {
    const [flippedCards, setFlippedCards] = useState({});
    const [showDashboard, setShowDashboard] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [activeTab, setActiveTab] = useState('main');

    const toggleFlip = (id) => {
        playSound('click');
        setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getMiniIcon = (type) => {
        switch (type) {
            case 'vocab':
            case 'vocabA':
            case 'vocabB': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M2 12H22M2 12V6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V12M2 12V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V12" stroke="currentColor" strokeWidth="2" fill="none" /></svg>;
            case 'equip': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 4L14 12L12 14L4 6L6 4Z" stroke="currentColor" strokeWidth="2" fill="none" /></svg>;
            case 'alchemy': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M10 2H14V6L19 12V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V12L10 6V2Z" stroke="currentColor" strokeWidth="2" fill="none" /></svg>;
            case 'scroll': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M4 4H20V20H4V4Z" stroke="currentColor" strokeWidth="2" fill="none" /></svg>;
            default: return null;
        }
    };

    const getCategoryLabel = (type) => {
        switch (type) {
            case 'vocab': return '寶箱';
            case 'vocabA': return '寶箱A';
            case 'vocabB': return '寶箱B';
            case 'equip': return '裝備';
            case 'alchemy': return '藥水';
            case 'scroll': return '捲軸';
            default: return '';
        }
    };

    const gradeColors = {
        'S': '#fbbf24', 'A': '#fb923c', 'B': '#3b82f6', 'C': '#10b981', 'D': '#9ca3af', '?': '#6b7280'
    };

    // Helper to get score/grade from record (supports new and legacy structure)
    const getCategoryData = (record, cat) => {
        // New structure: record.vocab = { score, grade }
        if (record[cat] && typeof record[cat] === 'object') {
            return { score: record[cat].score ?? null, grade: record[cat].grade || '?' };
        }
        // Legacy structure: record.vocabGrade, record.vocabScore
        const legacyGrade = record[`${cat}Grade`];
        const legacyScore = record[`${cat}Score`];
        if (legacyGrade || legacyScore) {
            return { score: legacyScore ?? null, grade: legacyGrade || '?' };
        }
        // 拆箱前的舊紀錄：寶箱 A/B 沿用原本的 vocab 成績
        if ((cat === 'vocabA' || cat === 'vocabB') && cat !== 'vocab') {
            return getCategoryData(record, 'vocab');
        }
        return { score: null, grade: '?' };
    };

    const formatLastPlayed = (timestamp) => {
        if (!timestamp) return null;
        try {
            const date = new Date(timestamp);
            return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        } catch {
            return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#201533]">
            <div className="bg-black/50 p-4 border-b-4 border-rpg-border flex items-center justify-between">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <h2 className="font-pixel text-white text-lg text-shadow flex gap-2 items-center"><Backpack size={18} /> 我的冒險旅程</h2>
                <RPGButton onClick={() => setShowPasswordModal(true)} color="dark" className="px-2"><Lock size={16} /></RPGButton>
            </div>
            {showPasswordModal && (
                <PasswordEntryModal
                    onClose={() => setShowPasswordModal(false)}
                    onSuccess={() => setShowDashboard(true)}
                />
            )}
            {showDashboard && <TeacherDashboard onClose={() => setShowDashboard(false)} />}

            <div className="flex bg-black/70 border-b-4 border-rpg-border">
                <button
                    onClick={() => { playSound('click'); setActiveTab('main'); }}
                    className={`flex-1 py-2 font-pixel text-xs transition-colors ${activeTab === 'main' ? 'bg-rpg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ⚔ 一般旅程
                </button>
                <button
                    onClick={() => { playSound('click'); setActiveTab('adv'); }}
                    className={`flex-1 py-2 font-pixel text-xs transition-colors ${activeTab === 'adv' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ✦ 進階旅程
                </button>
            </div>

            {activeTab === 'adv' ? (
                <AdvancedJourneyView records={records} advMeta={advMeta} mistakeStats={mistakeStats} />
            ) : (
                <>
            {/* 試煉日誌入口按鈕 */}
            <div className="px-4 pt-4 pb-2">
                <button
                    onClick={onViewTrialLog}
                    className="w-full bg-gradient-to-r from-red-900 to-red-700 border-4 border-red-500 p-3 flex items-center justify-center gap-2 hover:from-red-800 hover:to-red-600 transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-300" fill="currentColor">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                        <path d="M12 12L2 7V17L12 22L22 17V7L12 12Z" opacity="0.7" />
                    </svg>
                    <span className="font-pixel text-red-200 text-sm tracking-wider">試煉日誌</span>
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-300" fill="currentColor">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                        <path d="M12 12L2 7V17L12 22L22 17V7L12 12Z" opacity="0.7" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <div className="grid grid-cols-1 gap-6">
                    {/* Follow MAP_STRUCTURE order (same as world map) */}
                    {MAP_STRUCTURE.map((node) => {
                        const id = node.id;
                        const isBoss = node.type === 'boss';
                        const info = isBoss ? BOSS_INFO[id] : LEVEL_INFO[id];
                        const record = records[id] || {};
                        const isUnlocked = Object.keys(record).length > 0;
                        const levelNum = isBoss ? id : parseInt(id);
                        const isFlipped = flippedCards[id] || false;
                        const totalRank = isBoss ? { rank: record.rank || '?', color: '#ccc' } : calculateTotalRank(record);
                        const lastPlayed = formatLastPlayed(record.lastPlayed || record.timestamp);

                        const categories = ['vocabA', 'vocabB', 'equip', 'alchemy', 'scroll'];

                        return (
                            <div key={id} className={`relative transition-all duration-300 ${isUnlocked ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                                {/* Tape decoration */}
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-yellow-200/80 rotate-1 shadow-sm z-10"></div>

                                {/* Card Container with perspective */}
                                <div
                                    className="cursor-pointer"
                                    style={{ perspective: '1000px' }}
                                    onClick={() => isUnlocked && toggleFlip(id)}
                                >
                                    <div
                                        className="relative transition-transform duration-500"
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                        }}
                                    >
                                        {/* === FRONT SIDE === */}
                                        <div
                                            className={`p-3 shadow-xl ${isBoss ? 'bg-red-950 border-4 border-red-600' : 'bg-white'}`}
                                            style={{ backfaceVisibility: 'hidden' }}
                                        >
                                            {/* Image Area */}
                                            <div className={`aspect-video mb-3 border-2 border-gray-300 flex items-center justify-center overflow-hidden relative ${isBoss ? 'bg-black' : 'bg-gray-200'}`} style={{ backgroundColor: isBoss ? '#000' : getLevelColor(id) }}>
                                                {isUnlocked ? (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <div className="transform scale-150 w-12 h-12">
                                                            {isBoss ? <PixelArt.Castle /> : getLevelIcon(id)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full bg-gray-400 flex items-center justify-center">
                                                        <Lock size={32} className="text-gray-600" />
                                                    </div>
                                                )}

                                                {/* Total Rank Badge - Different for Boss */}
                                                {isUnlocked && !isBoss && (
                                                    <div className="absolute top-2 right-2 w-12 h-12 rounded-full border-4 bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-lg transform rotate-12" style={{ borderColor: totalRank.color }}>
                                                        <span className="font-pixel text-2xl" style={{ color: totalRank.color, textShadow: '2px 2px 0px black' }}>{totalRank.rank}</span>
                                                    </div>
                                                )}

                                                {/* BOSS Stamps */}
                                                {isBoss && record.bestStatus === 'COMPLETE' && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="border-8 border-yellow-500 text-yellow-500 font-pixel text-4xl p-2 transform -rotate-12 opacity-80 animate-pulse bg-black/50">COMPLETE</div>
                                                    </div>
                                                )}
                                                {isBoss && record.bestStatus === 'CLEAR' && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="border-8 border-green-500 text-green-500 font-pixel text-4xl p-2 transform -rotate-12 opacity-80 bg-black/50">CLEAR</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Title Area - Split Layout */}
                                            <div className="border-t-2 border-dashed border-gray-300 pt-2 flex justify-between items-end">
                                                {/* Left: Level Info */}
                                                <div className="flex-1">
                                                    <div className={`font-pixel text-xs ${isBoss ? 'text-red-400' : 'text-gray-500'}`}>{isBoss ? 'BOSS CHALLENGE' : `LEVEL ${levelNum < 10 ? '0' + levelNum : levelNum}`}</div>
                                                    <div className={`font-retro text-sm font-bold leading-tight truncate w-28 ${isBoss ? 'text-white' : 'text-black'}`}>{info.title}</div>
                                                </div>

                                                {/* Right: 2x2 Category Grid (Unit) or Boss Stats */}
                                                {isUnlocked && (
                                                    isBoss ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-pixel text-[10px] text-gray-400">Attempts</span>
                                                            <span className="font-pixel text-lg text-white">{record.successCount || 0}/5</span>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                            {categories.map(cat => {
                                                                const data = getCategoryData(record, cat);
                                                                const color = gradeColors[data.grade] || gradeColors['?'];
                                                                return (
                                                                    <div key={cat} className="flex items-center gap-1">
                                                                        <div style={{ color: color }} className="w-4 h-4">{getMiniIcon(cat)}</div>
                                                                        <span className="font-pixel text-[10px] font-bold" style={{ color: color, textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{data.grade}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        {/* === BACK SIDE === */}
                                        <div
                                            className="bg-[#2a1f3d] p-3 shadow-xl absolute inset-0 border-4 border-rpg-border"
                                            style={{
                                                backfaceVisibility: 'hidden',
                                                transform: 'rotateY(180deg)'
                                            }}
                                        >
                                            {/* Header */}
                                            <div className="text-center border-b border-gray-600 pb-2 mb-2">
                                                <div className="font-pixel text-[10px] text-gray-400">{isBoss ? info.title : `LEVEL ${levelNum < 10 ? '0' + levelNum : levelNum}`}</div>
                                                <div className="font-retro text-sm font-bold text-white leading-tight truncate">{isBoss ? 'CHALLENGE RECORD' : info.title}</div>
                                            </div>

                                            {/* Detailed Stats */}
                                            {isBoss ? (
                                                <div className="flex flex-col gap-2 my-3 text-white">
                                                    <div className="flex justify-between items-center bg-white/10 p-2 rounded">
                                                        <span className="font-pixel text-xs text-green-400">CLEARS (B+)</span>
                                                        <span className="font-pixel text-xl">{record.successCount || 0}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-white/10 p-2 rounded">
                                                        <span className="font-pixel text-xs text-yellow-400">PERFECT (S)</span>
                                                        <span className="font-pixel text-xl">{record.sCount || 0}</span>
                                                    </div>
                                                    <div className="text-center mt-2">
                                                        <span className="font-retro text-gray-400 text-xs">{record.bestStatus === 'Top' ? 'LEGENDARY!' : 'Keep Fighting!'}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2 my-3">
                                                    {categories.map(cat => {
                                                        const data = getCategoryData(record, cat);
                                                        const color = gradeColors[data.grade] || gradeColors['?'];
                                                        const scoreDisplay = data.score !== null ? data.score : '-';
                                                        const isLocked = data.grade === '?';

                                                        return (
                                                            <div key={cat} className={`flex items-center justify-between px-2 py-1 rounded ${isLocked ? 'bg-gray-800/50' : 'bg-black/40'}`}>
                                                                <div className="flex items-center gap-2" style={{ color: color }}>
                                                                    {getMiniIcon(cat)}
                                                                    <span className="font-retro text-xs text-gray-300">{getCategoryLabel(cat)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-pixel text-[11px] text-white">{scoreDisplay}</span>
                                                                    <span className="font-pixel text-sm font-bold" style={{ color: color, textShadow: '1px 1px 0px black' }}>{data.grade}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Total Rank Display (Unit Only) */}
                                            {!isBoss && (
                                                <div className="flex items-center justify-center gap-2 border-t border-gray-600 pt-2 mt-2">
                                                    <span className="font-pixel text-xs text-gray-400">TOTAL:</span>
                                                    <span className="font-pixel text-xl font-bold" style={{ color: totalRank.color, textShadow: '2px 2px 0px black' }}>{totalRank.rank}</span>
                                                </div>
                                            )}

                                            {/* Last Played Timestamp */}
                                            {lastPlayed && (
                                                <div className="text-center mt-2 pt-2 border-t border-gray-700">
                                                    <span className="font-pixel text-[9px] text-gray-500">Last Played: {lastPlayed}</span>
                                                </div>
                                            )}

                                            {/* Flip hint */}
                                            <div className="absolute bottom-1 right-2 font-pixel text-[8px] text-gray-500 animate-pulse">TAP TO FLIP</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="h-10"></div>
            </div>
                </>
            )}
        </div>
    );
};

// --- TrialLogView 組件：顯示最近 10 次試煉記錄 ---
const TrialLogView = ({ onBack, onRetry, trialHistory = [] }) => {
    // 計算歷史最高等級
    const getHighestRank = () => {
        if (!trialHistory || trialHistory.length === 0) return { rank: '?', color: '#9ca3af' };

        const weights = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0, '?': 0 };
        let maxWeight = 0;
        let bestRank = '?';

        trialHistory.forEach(record => {
            const weight = weights[record.rank] || 0;
            if (weight > maxWeight) {
                maxWeight = weight;
                bestRank = record.rank;
            }
        });

        const colors = {
            'S': '#fbbf24', 'A': '#fb923c', 'B': '#3b82f6',
            'C': '#10b981', 'D': '#9ca3af', 'E': '#6b7280', '?': '#4b5563'
        };

        return { rank: bestRank, color: colors[bestRank] };
    };

    const formatDate = (timestamp) => {
        try {
            const date = new Date(timestamp);
            return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        } catch {
            return 'N/A';
        }
    };

    const formatUnits = (units) => {
        if (!units || units.length === 0) return '';

        // 转换为数字并排序
        const sortedUnits = units.map(u => parseInt(u)).sort((a, b) => a - b);

        // 检查是否为连续序列
        const isContinuous = sortedUnits.every((num, idx) => {
            if (idx === 0) return true;
            return num === sortedUnits[idx - 1] + 1;
        });

        // 如果是连续序列，使用范围格式
        if (isContinuous && sortedUnits.length > 2) {
            return `Ch ${sortedUnits[0]}-${sortedUnits[sortedUnits.length - 1]}`;
        }

        // 否则使用点号连接格式
        // 如果超过 10 个，截断并加上 "..."
        if (sortedUnits.length > 10) {
            const first10 = sortedUnits.slice(0, 10);
            return `Ch ${first10.join('.')}...`;
        }

        return `Ch ${sortedUnits.join('.')}`;
    };

    const gradeColors = {
        'S': '#fbbf24', 'A': '#fb923c', 'B': '#3b82f6',
        'C': '#10b981', 'D': '#9ca3af', 'E': '#6b7280', '?': '#4b5563'
    };

    const highestRank = getHighestRank();
    const recentRecords = trialHistory.slice(0, 10); // 只顯示最近 10 筆

    // 計算歷史最高分數
    const highestScore = trialHistory.reduce((max, record) => Math.max(max, record.score || 0), 0);

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-purple-950 via-purple-900 to-purple-950">
            {/* 頂部區域：返回按鈕 + 歷史最高等級勳章 */}
            <div className="relative bg-black/50 p-4 border-b-4 border-yellow-500">
                {/* 返回按鈕 */}
                <button
                    onClick={onBack}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 p-2 rounded-full text-white hover:bg-red-600 transition-colors z-10"
                >
                    <ArrowLeft size={20} />
                </button>

                {/* 中間：歷史最高等級勳章 + 最高分數 */}
                <div className="flex flex-col items-center gap-2">
                    <h2 className="font-pixel text-yellow-400 text-lg text-shadow tracking-wider">試煉日誌</h2>
                    <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-lg border-2 border-yellow-600/50">
                        <Star size={20} className="text-yellow-400" />
                        <span className="font-pixel text-xs text-gray-300">歷史最高：</span>
                        <div
                            className="w-10 h-10 rounded-full border-4 flex items-center justify-center"
                            style={{ borderColor: highestRank.color }}
                        >
                            <span
                                className="font-pixel text-xl font-bold"
                                style={{ color: highestRank.color, textShadow: '2px 2px 0px black' }}
                            >
                                {highestRank.rank}
                            </span>
                        </div>
                        <span className="font-pixel text-xs text-gray-500">|</span>
                        <Coins size={16} className="text-yellow-400" />
                        <span
                            className="font-pixel text-lg font-bold text-yellow-400"
                            style={{ textShadow: '1px 1px 0px black' }}
                        >
                            {highestScore}
                        </span>
                    </div>
                </div>
            </div>

            {/* 記錄清單 */}
            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/escheresque.png')]">
                {recentRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Skull size={64} className="text-purple-400 opacity-50 mb-4" />
                        <p className="font-pixel text-gray-400 text-sm">尚無試煉記錄</p>
                        <p className="font-retro text-gray-500 text-xs mt-2">開始你的第一次挑戰吧！</p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-24">
                        {recentRecords.map((record, index) => {
                            const rankColor = gradeColors[record.rank] || gradeColors['?'];

                            return (
                                <div
                                    key={index}
                                    className="bg-gradient-to-r from-purple-900/80 to-purple-800/80 border-4 border-yellow-600 p-3 relative backdrop-blur-sm hover:scale-105 transition-transform"
                                >
                                    {/* 編號標籤 */}
                                    <div className="absolute -top-2 -left-2 bg-yellow-500 border-2 border-black w-8 h-8 flex items-center justify-center rounded-full">
                                        <span className="font-pixel text-xs text-black">#{index + 1}</span>
                                    </div>

                                    {/* 等級勳章 */}
                                    <div
                                        className="absolute -top-3 -right-3 w-12 h-12 rounded-full border-4 bg-black flex items-center justify-center shadow-lg transform rotate-12"
                                        style={{ borderColor: rankColor }}
                                    >
                                        <span
                                            className="font-pixel text-xl font-bold"
                                            style={{ color: rankColor, textShadow: '2px 2px 0px black' }}
                                        >
                                            {record.rank}
                                        </span>
                                    </div>

                                    {/* 記錄內容 */}
                                    <div className="space-y-2 pr-8">
                                        {/* 日期 */}
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-yellow-400" />
                                            <span className="font-pixel text-xs text-yellow-300">{formatDate(record.timestamp)}</span>
                                        </div>

                                        {/* 單元組合 */}
                                        <div className="flex items-start gap-2">
                                            <Book size={14} className="text-purple-300 mt-1" />
                                            <div className="flex-1">
                                                <span className="font-retro text-xs text-gray-300">挑戰範圍：</span>
                                                <p className="font-pixel text-[10px] text-white mt-1 leading-relaxed">
                                                    {formatUnits(record.units)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 分數 */}
                                        <div className="flex items-center gap-2">
                                            <Award size={14} className="text-yellow-400" />
                                            <span className="font-pixel text-xs text-white">分數：{record.score}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 底部：再次挑戰按鈕 */}
            <div className="absolute bottom-0 w-full p-4 bg-black/80 border-t-4 border-yellow-600">
                <button
                    onClick={onRetry}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 border-4 border-yellow-500 p-3 font-pixel text-white text-sm hover:from-red-500 hover:to-orange-500 transition-all active:translate-y-1 shadow-lg flex items-center justify-center gap-2"
                >
                    <Sword size={18} />
                    再次挑戰
                    <Sword size={18} />
                </button>
            </div>
        </div>
    );
};


// --- 錯題筆記本元件：顯示學生常錯單字 ---
const MistakeNotebook = ({ onBack, mistakeStats = {}, onClearMistakes, onRemoveMistake }) => {
    const [showConfirm, setShowConfirm] = useState(false); // 清空全部確認
    const [showSlashConfirm, setShowSlashConfirm] = useState(false); // 斬除個別確認
    const [pendingRemoveId, setPendingRemoveId] = useState(null); // 待刪除的單字 ID
    const [selectedUnit, setSelectedUnit] = useState('all'); // 新增：單元選擇狀態
    const [activeTab, setActiveTab] = useState('main'); // 'main' | 'adv'

    useEffect(() => {
        setSelectedUnit('all');
    }, [activeTab]);

    const isAdvancedMistake = (data = {}) => data.source === 'advanced' && Number.isFinite(Number(data.lesson));

    // 將 mistakeStats 轉換為陣列並排序（按錯誤次數由多到少）
    const sortedMistakes = Object.entries(mistakeStats)
        .filter(([, data]) => data.count > 0)
        .filter(([, data]) => activeTab === 'adv' ? isAdvancedMistake(data) : !isAdvancedMistake(data))
        .sort((a, b) => b[1].count - a[1].count);

    const availableUnits = activeTab === 'adv'
        ? [...new Set(sortedMistakes.map(([, data]) => Number(data.lesson)))].sort((a, b) => a - b)
        : Array.from({ length: 16 }, (_, i) => i + 1);

    // 根據選擇的單元過濾錯題
    const filteredMistakes = selectedUnit === 'all'
        ? sortedMistakes
        : sortedMistakes.filter(([, data]) => activeTab === 'adv'
            ? Number(data.lesson) === parseInt(selectedUnit, 10)
            : data.gameUnitId === parseInt(selectedUnit, 10));

    const totalMistakes = sortedMistakes.reduce((sum, [id, data]) => sum + data.count, 0);

    // 處理斬除按鈕點擊
    const handleSlashClick = (id) => {
        setPendingRemoveId(id);
        setShowSlashConfirm(true);
    };

    // 確認斬除
    const confirmSlash = () => {
        if (pendingRemoveId) {
            onRemoveMistake(pendingRemoveId);
            setPendingRemoveId(null);
        }
        setShowSlashConfirm(false);
    };

    // 取消斬除
    const cancelSlash = () => {
        setPendingRemoveId(null);
        setShowSlashConfirm(false);
    };

    return (
        <div className="flex flex-col h-full bg-black">
            {/* 頂部標題區 - 發紅光懸賞名單風格 */}
            <div className="bg-gradient-to-b from-red-900/50 to-black p-4 border-b-4 border-red-800 relative">
                {/* 紅光效果 */}
                <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none"></div>

                {/* 返回按鈕 */}
                <button
                    onClick={onBack}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 p-2 rounded-full text-white hover:bg-red-600 transition-colors z-10"
                >
                    <ArrowLeft size={20} />
                </button>

                {/* 標題 */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Skull size={24} className="text-red-500" />
                        <h2 className="font-pixel text-red-400 text-lg tracking-wider" style={{ textShadow: '0 0 10px rgba(255,0,0,0.5)' }}>
                            錯題筆記本
                        </h2>
                        <Skull size={24} className="text-red-500" />
                    </div>
                    <p className="font-retro text-xs text-gray-500">WANTED LIST</p>
                </div>

                {/* 統計 */}
                <div className="flex justify-center mt-2">
                    <div className="bg-black/60 px-4 py-1 rounded border border-red-800 flex items-center gap-2">
                        <span className="font-pixel text-xs text-gray-400">殘留魔物:</span>
                        <span className="font-pixel text-sm text-red-400" style={{ textShadow: '0 0 5px rgba(255,0,0,0.5)' }}>
                            {sortedMistakes.length} 字 / {totalMistakes} 次
                        </span>
                    </div>
                </div>
            </div>

            {/* 一般／進階錯題切換 */}
            <div className="flex bg-black/80 border-b-2 border-red-800">
                <button
                    onClick={() => { playSound('click'); setActiveTab('main'); }}
                    className={`flex-1 py-2 font-pixel text-xs transition-colors ${activeTab === 'main' ? 'bg-red-900 text-white' : 'text-gray-500 hover:text-gray-200'}`}
                >
                    ⚔ 一般錯題
                </button>
                <button
                    onClick={() => { playSound('click'); setActiveTab('adv'); }}
                    className={`flex-1 py-2 font-pixel text-xs transition-colors ${activeTab === 'adv' ? 'bg-purple-800 text-white' : 'text-gray-500 hover:text-gray-200'}`}
                >
                    ✦ 進階錯題
                </button>
            </div>

            {/* 單元切換標籤列 - 橫向可捲動 */}
            <div className="bg-black/60 p-2 border-b-2 border-red-800/50 overflow-x-auto whitespace-nowrap flex gap-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                {/* 全部 */}
                <button
                    onClick={() => setSelectedUnit('all')}
                    className={`px-3 py-1 font-pixel text-xs transition-colors flex-shrink-0 ${selectedUnit === 'all'
                        ? 'text-red-500 border-b-2 border-red-500'
                        : 'text-gray-400 hover:text-gray-200'
                        }`}
                >
                    全部
                </button>

                {/* 一般顯示 16 單元，進階只顯示目前有錯題的課次 */}
                {availableUnits.map(unitNum => (
                    <button
                        key={unitNum}
                        onClick={() => setSelectedUnit(unitNum.toString())}
                        className={`px-3 py-1 font-pixel text-xs transition-colors flex-shrink-0 ${selectedUnit === unitNum.toString()
                            ? 'text-red-500 border-b-2 border-red-500'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {activeTab === 'adv' ? `第 ${unitNum} 課` : `Unit ${unitNum}`}
                    </button>
                ))}
            </div>

            {/* 錯題清單 - 可捲動 */}
            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
                {sortedMistakes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <CheckCircle size={64} className="text-green-500 opacity-50 mb-4" />
                        <p className="font-pixel text-gray-400 text-sm">{activeTab === 'adv' ? '尚無進階錯題' : '尚無一般錯題'}</p>
                        <p className="font-retro text-gray-600 text-xs mt-2">太棒了！繼續保持！</p>
                    </div>
                ) : filteredMistakes.length === 0 ? (
                    // 選擇了特定單元但該單元無錯題
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <CheckCircle size={64} className="text-green-500 opacity-50 mb-4" />
                        <p className="font-pixel text-gray-400 text-sm">本{activeTab === 'adv' ? '課' : '單元'}無戰敗紀錄</p>
                        <p className="font-retro text-gray-600 text-xs mt-2">勇者繼續保持！</p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-20">
                        {filteredMistakes.map(([id, data], index) => (
                            <div
                                key={id}
                                className="bg-gradient-to-r from-gray-900 to-gray-800 border-2 border-red-800/50 p-3 relative hover:border-red-600 transition-colors"
                                style={{ boxShadow: '0 0 10px rgba(255,0,0,0.1)' }}
                            >
                                {/* 排名標籤 */}
                                <div className="absolute -top-2 -left-2 bg-red-800 border-2 border-black w-7 h-7 flex items-center justify-center rounded-full">
                                    <span className="font-pixel text-[10px] text-white">#{index + 1}</span>
                                </div>

                                {/* 骷髏頭計數 */}
                                <div className="absolute -top-2 -right-2 bg-black border-2 border-red-700 px-2 py-1 rounded flex items-center gap-1">
                                    <span className="text-lg">💀</span>
                                    <span className="font-pixel text-sm text-red-400">x{data.count}</span>
                                </div>

                                {/* 單字內容 */}
                                <div className="mt-2 ml-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-retro text-xl text-white font-bold">{data.word}</h3>
                                        <button
                                            onClick={() => speakText(data.word)}
                                            className="text-gray-400 hover:text-white p-1"
                                        >
                                            <Volume2 size={16} />
                                        </button>
                                    </div>
                                    <p className="font-retro text-sm text-gray-400 leading-relaxed">{data.chinese}</p>
                                </div>

                                {/* 個別刪除按鈕 - 右下角 */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // 防止觸發卡片其他點擊事件
                                        handleSlashClick(id);
                                    }}
                                    className="absolute bottom-2 right-2 text-[10px] font-pixel px-2 py-1 border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all animate-pulse"
                                >
                                    🗡️ 斬除
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 底部：清空紀錄按鈕 */}
            {sortedMistakes.length > 0 && (
                <div className="absolute bottom-0 w-full p-4 bg-black/90 border-t-4 border-red-800">
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border-4 border-gray-600 p-3 font-pixel text-gray-400 text-sm hover:from-red-900 hover:to-red-800 hover:border-red-600 hover:text-red-300 transition-all active:translate-y-1 flex items-center justify-center gap-2"
                    >
                        <XCircle size={16} />
                        清空{activeTab === 'adv' ? '進階' : '一般'}錯題
                    </button>
                </div>
            )}

            {/* 斬除確認對話框 */}
            {showSlashConfirm && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border-4 border-red-600 p-6 w-full max-w-xs text-center" style={{ boxShadow: '0 0 30px rgba(220,38,38,0.5)' }}>
                        <Sword size={48} className="text-red-500 mx-auto mb-4" />
                        <h3 className="font-pixel text-lg text-red-400 mb-2">[ 最終決斷 ]</h3>
                        <p className="font-retro text-sm text-gray-300 mb-6 leading-relaxed">
                            確認要斬除此單字魔物嗎？<br />
                            <span className="text-xs text-gray-500">(淨化後將從名單中永久消失)</span>
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={cancelSlash}
                                className="bg-gray-700 border-2 border-gray-500 px-4 py-2 font-pixel text-sm text-white hover:bg-gray-600 transition-colors"
                            >
                                [ 暫緩 ]
                            </button>
                            <button
                                onClick={confirmSlash}
                                className="bg-red-800 border-2 border-red-500 px-4 py-2 font-pixel text-sm text-white hover:bg-red-700 transition-colors"
                            >
                                [ 斬除 ]
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 清空全部確認對話框 */}
            {showConfirm && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border-4 border-red-700 p-6 w-full max-w-xs text-center" style={{ boxShadow: '0 0 30px rgba(255,0,0,0.3)' }}>
                        <Skull size={48} className="text-red-500 mx-auto mb-4" />
                        <h3 className="font-pixel text-lg text-white mb-2">確定要清空{activeTab === 'adv' ? '進階' : '一般'}錯題嗎?</h3>
                        <p className="font-retro text-sm text-gray-400 mb-6">另一個頁籤的錯題會保留，此操作無法復原</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="bg-gray-700 border-2 border-gray-500 px-4 py-2 font-pixel text-sm text-white hover:bg-gray-600"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => { setShowConfirm(false); onClearMistakes(activeTab); }}
                                className="bg-red-800 border-2 border-red-500 px-4 py-2 font-pixel text-sm text-white hover:bg-red-700"
                            >
                                確定清空
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ChallengeSetup = ({ onBack, onStart, advMeta = null }) => {
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [tab, setTab] = useState('main'); // 'main' | 'adv'

    const totalLessons = advMeta?.totalLessons || 0;
    const mainIds = Array.from({ length: 16 }, (_, i) => (i + 1).toString());
    const advIds = Array.from({ length: totalLessons }, (_, i) => advLessonId(i + 1));

    const toggleUnit = (id) => {
        if (selectedUnits.includes(id)) {
            setSelectedUnits(selectedUnits.filter(uid => uid !== id));
        } else {
            setSelectedUnits([...selectedUnits, id]);
        }
    };

    // 全選只切換「當前分頁」的項目
    const currentTabIds = tab === 'main' ? mainIds : advIds;
    const currentAllSelected = currentTabIds.length > 0 && currentTabIds.every(id => selectedUnits.includes(id));
    const toggleAll = () => {
        if (currentAllSelected) {
            setSelectedUnits(selectedUnits.filter(id => !currentTabIds.includes(id)));
        } else {
            const merged = new Set([...selectedUnits, ...currentTabIds]);
            setSelectedUnits(Array.from(merged));
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1a0f2e]">
            <div className="bg-black/50 p-4 border-b-4 border-rpg-border flex items-center justify-between z-10">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <h2 className="font-pixel text-white text-lg text-shadow text-red-500">終極試煉</h2>
                <div className="w-8"></div>
            </div>

            {/* 主線／進階頁籤 */}
            <div className="flex bg-black/60 border-b-4 border-rpg-border z-10">
                <button
                    onClick={() => { playSound('click'); setTab('main'); }}
                    className={`flex-1 py-2 font-pixel text-xs transition-colors ${tab === 'main' ? 'bg-rpg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ⚔ 主線冒險
                </button>
                <button
                    onClick={() => { playSound('click'); setTab('adv'); }}
                    className={`flex-1 py-2 font-pixel text-xs transition-colors ${tab === 'adv' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ✦ 進階篇章
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <div className="flex justify-between items-center mb-4 bg-black/40 p-2 rounded border border-gray-600 backdrop-blur-sm sticky top-0 z-10">
                    <p className="font-retro text-gray-300 text-sm">選擇試煉範圍：<span className="text-rpg-secondary">{selectedUnits.length}</span> {tab === 'adv' ? '課' : '章'}</p>
                    <button onClick={() => { playSound('click'); toggleAll(); }} className="text-xs font-pixel text-white bg-rpg-primary px-2 py-1 border-2 border-white hover:bg-red-400">
                        {currentAllSelected ? "取消全選" : "全選"}
                    </button>
                </div>

                {tab === 'adv' ? (
                    totalLessons === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="font-pixel text-purple-300 text-sm mb-2">✦ 進階篇章準備中</div>
                            <p className="font-retro text-gray-400 text-xs">老師尚未匯入進階單字書</p>
                        </div>
                    ) : (
                        <div className="space-y-7">
                            {Array.from({ length: Math.ceil(totalLessons / ADV_LESSONS_PER_SECTION) }, (_, sectionIndex) => {
                                const sectionIds = advIds.slice(sectionIndex * ADV_LESSONS_PER_SECTION, (sectionIndex + 1) * ADV_LESSONS_PER_SECTION);
                                return (
                                    <section key={sectionIndex}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-300/70 to-purple-300/70"></div>
                                            <div className="px-3 py-1 rounded-full bg-pink-100 text-purple-800 border-2 border-white shadow font-pixel text-[9px]">
                                                PHOTO STRIP {String(sectionIndex + 1).padStart(2, '0')}
                                            </div>
                                            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-pink-300/70 to-purple-300/70"></div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 px-1">
                                            {sectionIds.map((id, index) => {
                                                const lesson = parseInt(id.slice(4), 10);
                                                const isSelected = selectedUnits.includes(id);
                                                const title = advMeta?.titles?.[String(lesson)] || `進階單字 第 ${lesson} 課`;
                                                const rotation = index % 3 === 0 ? '-rotate-1' : index % 3 === 1 ? 'rotate-1' : 'rotate-0';
                                                return (
                                                    <button
                                                        key={id}
                                                        onClick={() => { playSound('click'); toggleUnit(id); }}
                                                        title={title}
                                                        className={`relative text-left transition-all duration-300 transform ${isSelected ? 'scale-105 z-10' : `${rotation} opacity-90 hover:opacity-100 hover:scale-105`}`}
                                                    >
                                                        <div className={`relative bg-[#fffafd] p-2 pb-3 shadow-[0_8px_18px_rgba(23,8,45,0.45)] border transition-all ${isSelected ? 'border-pink-300 ring-4 ring-purple-400 ring-offset-2 ring-offset-[#1a0f2e]' : 'border-white'}`}>
                                                            <div className="relative aspect-[4/3] overflow-hidden border border-pink-100 bg-gradient-to-br from-fuchsia-400 via-purple-500 to-indigo-600">
                                                                <div className="absolute -top-5 -left-4 w-14 h-14 rounded-full bg-pink-200/40"></div>
                                                                <div className="absolute -bottom-6 -right-5 w-20 h-20 rounded-full bg-cyan-200/25"></div>
                                                                <span className="absolute top-2 left-2 text-white/80 font-pixel text-[7px]">ADV PHOTO</span>
                                                                <span className="absolute top-1 right-2 text-yellow-200 text-lg rotate-12">✦</span>
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
                                                                    <span className="font-pixel text-[9px] opacity-80">LESSON</span>
                                                                    <span className="font-pixel text-2xl mt-1">{String(lesson).padStart(3, '0')}</span>
                                                                </div>
                                                                {isSelected && (
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-pink-500/25 backdrop-blur-[1px]">
                                                                        <div className="w-10 h-10 rounded-full bg-white text-purple-600 border-4 border-pink-200 flex items-center justify-center font-pixel text-xl shadow-lg">✔</div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="pt-2 px-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-pixel text-[8px] text-purple-500">SHOT #{String(lesson).padStart(3, '0')}</span>
                                                                    <span className="text-[11px]">♡ ✦</span>
                                                                </div>
                                                                <div className="font-retro text-xs font-bold text-gray-800 leading-tight line-clamp-1" title={title}>{title}</div>
                                                            </div>
                                                        </div>

                                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-pink-200/80 border border-white/60 shadow-sm rotate-2"></div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )
                ) : (
                <div className="grid grid-cols-2 gap-4">
                    {Object.entries(LEVEL_INFO).map(([id, info], index) => {
                        const isSelected = selectedUnits.includes(id);
                        const levelNum = parseInt(id);
                        const bgColor = getLevelColor(id);

                        return (
                            <div
                                key={id}
                                onClick={() => { playSound('click'); toggleUnit(id); }}
                                className={`relative transition-all duration-300 cursor-pointer transform ${isSelected ? 'scale-105 z-10' : 'scale-100 opacity-80 hover:opacity-100 hover:scale-105 z-0'}`}
                            >
                                <div className={`bg-white p-2 shadow-lg transition-all duration-300 ${isSelected ? 'rotate-1 ring-4 ring-rpg-secondary ring-offset-1 ring-offset-black' : (index % 2 === 0 ? '-rotate-1' : 'rotate-1')}`}>
                                    <div className="bg-gray-200 aspect-video mb-2 border border-gray-300 flex items-center justify-center overflow-hidden relative" style={{ backgroundColor: bgColor }}>
                                        <div className={`w-full h-full flex items-center justify-center ${id === '16' ? 'animate-pulse' : ''}`}>
                                            <div className="transform scale-100 w-12 h-12">
                                                {getLevelIcon(id)}
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-rpg-secondary/30 backdrop-blur-[1px]">
                                                <div className="font-pixel text-2xl text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] animate-bounce-pixel">
                                                    ✔
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-start border-t border-dashed border-gray-300 pt-1">
                                        <div className="flex justify-between w-full items-center mb-1">
                                            <span className="font-pixel text-[10px] text-gray-500">LV.{levelNum < 10 ? '0' + levelNum : levelNum}</span>
                                            <span className="font-pixel text-[8px] bg-gray-200 px-1 text-gray-600 rounded">{info.sub}</span>
                                        </div>
                                        <div className="font-retro text-xs font-bold text-black leading-tight line-clamp-1 w-full" title={info.title}>{info.title}</div>
                                    </div>
                                </div>

                                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 h-4 bg-red-800/80 rotate-1 shadow-sm border border-white/20"></div>
                            </div>
                        );
                    })}
                </div>
                )}

                <div className="h-24"></div>
            </div>

            <div className="p-4 bg-black/80 border-t-4 border-rpg-border absolute bottom-0 w-full z-20">
                <RPGButton
                    onClick={() => { if (selectedUnits.length > 0) onStart(selectedUnits); }}
                    color="primary"
                    className="w-full py-3 text-lg shadow-[0_0_15px_#ff0055]"
                    disabled={selectedUnits.length === 0}
                >
                    開始挑戰 ({selectedUnits.length})
                </RPGButton>
            </div>
        </div>
    );
};

const UnitHub = ({ unitId, onBack, onSelectCategory, difficulty, onChangeDifficulty }) => {
    const categories = [
        { id: 'vocab_a', label: '單字寶箱 A', icon: <PixelArt.Chest />, color: 'primary', desc: 'LOOT WORDS I' },
        { id: 'vocab_b', label: '單字寶箱 B', icon: <PixelArt.Chest />, color: 'primary', desc: 'LOOT WORDS II' },
        { id: 'collocation', label: '搭配裝備', icon: <PixelArt.SwordShield />, color: 'secondary', desc: 'EQUIPMENT' },
        { id: 'polysemy', label: '多義藥水', icon: <PixelArt.Potion />, color: 'accent', desc: 'ALCHEMY' },
        { id: 'sentences', label: '片語捲軸', icon: <PixelArt.Scroll />, color: 'success', desc: 'ANCIENT SCROLL' },
    ];

    // 簡單模式只開放「單字」與「片語」兩類（中間兩類題數太少）
    const visibleCategories = difficulty === 'easy'
        ? categories.filter(cat => cat.id === 'vocab_a' || cat.id === 'vocab_b' || cat.id === 'sentences')
        : categories;

    const info = LEVEL_INFO[unitId];

    return (
        <div className="flex flex-col h-full bg-rpg-bg">
            <div className="flex items-center justify-between p-4 border-b-4 border-rpg-border bg-black/30">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <div className="flex-1 text-center mx-2">
                    <h2 className="font-pixel text-white text-sm text-shadow leading-tight">{info?.title || `UNIT ${unitId}`}</h2>
                    <p className="font-retro text-[10px] text-gray-400">Level {unitId}</p>
                </div>
                <div className="w-8"></div>
            </div>
            <div className="flex-1 p-4 grid grid-cols-1 gap-4 content-start overflow-y-auto">
                {/* 難度選擇 */}
                <div className="flex flex-col items-center gap-2">
                    <div className="font-pixel text-gray-400 text-xs">- 選擇難度 -</div>
                    <div className="flex gap-3 w-full max-w-xs">
                        <button
                            onClick={() => { playSound('click'); onChangeDifficulty('easy'); }}
                            className={`flex-1 p-2 border-4 transition-all duration-200 flex flex-col items-center gap-1 ${
                                difficulty === 'easy'
                                    ? 'border-cyan-400 bg-cyan-900/60 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                                    : 'border-gray-600 bg-gray-800 hover:border-gray-400'
                            }`}
                        >
                            <span className={`font-pixel text-xs ${difficulty === 'easy' ? 'text-cyan-300' : 'text-gray-300'}`}>簡單模式</span>
                            <span className={`font-retro text-[10px] ${difficulty === 'easy' ? 'text-cyan-400/70' : 'text-gray-500'}`}>5命 · 評級上限B</span>
                        </button>
                        <button
                            onClick={() => { playSound('click'); onChangeDifficulty('hard'); }}
                            className={`flex-1 p-2 border-4 transition-all duration-200 flex flex-col items-center gap-1 ${
                                difficulty === 'hard'
                                    ? 'border-orange-400 bg-orange-900/60 scale-105 shadow-[0_0_15px_rgba(251,146,60,0.4)]'
                                    : 'border-gray-600 bg-gray-800 hover:border-gray-400'
                            }`}
                        >
                            <span className={`font-pixel text-xs ${difficulty === 'hard' ? 'text-orange-300' : 'text-gray-300'}`}>困難模式</span>
                            <span className={`font-retro text-[10px] ${difficulty === 'hard' ? 'text-orange-400/70' : 'text-gray-500'}`}>3命 · 完整題庫</span>
                        </button>
                    </div>
                </div>
                <div className="font-pixel text-center text-gray-400 text-xs mb-2">- SELECT YOUR LOOT -</div>
                {visibleCategories.map(cat => (
                    <button key={cat.id} onClick={() => { playSound('click'); onSelectCategory(cat.id); }} className={`group relative h-24 nes-border flex items-center px-4 gap-4 transition-all hover:brightness-110 active:translate-y-1 ${cat.color === 'primary' ? 'bg-[#5c3c2e]' : cat.color === 'secondary' ? 'bg-[#2e3c5c]' : cat.color === 'accent' ? 'bg-[#5c562e]' : 'bg-[#2e5c3c]'}`}>
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                        <div className="relative z-10 filter drop-shadow-lg group-hover:scale-110 transition-transform">
                            {cat.icon}
                        </div>
                        <div className="relative z-10 flex-1 text-left">
                            <h3 className="font-pixel text-lg text-white text-shadow">{cat.label}</h3>
                            <p className="font-retro text-xs text-yellow-200 tracking-widest opacity-80">{cat.desc}</p>
                        </div>
                        <ChevronRight className="text-white/50 group-hover:text-white" />
                    </button>
                ))}
            </div>
        </div>
    );
};

// 進階課程大廳：顯示通關進度（★x/3），提供學習與挑戰入口
const AdvLessonHub = ({ node, advMeta, record, onBack, onStudy, onStartQuiz }) => {
    const clears = record?.clears || 0;
    const starCount = Math.min(clears, ADV_CLEARS_TO_COMPLETE);
    const isDone = clears >= ADV_CLEARS_TO_COMPLETE;
    const title = advMeta?.titles?.[String(node?.lesson)] || `進階單字 第 ${node?.lesson} 課`;

    return (
        <div className="flex flex-col h-full bg-rpg-bg">
            <div className="flex items-center justify-between p-4 border-b-4 border-purple-400 bg-black/30">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <div className="flex-1 text-center mx-2">
                    <h2 className="font-pixel text-white text-sm text-shadow leading-tight">{title}</h2>
                    <p className="font-retro text-[10px] text-purple-300">ADVANCED LESSON {node?.lesson}</p>
                </div>
                <div className="w-8"></div>
            </div>
            <div className="flex-1 p-4 flex flex-col gap-4 content-start overflow-y-auto">
                {/* 通關進度 */}
                <div className="flex flex-col items-center gap-2 bg-black/40 border-4 border-purple-500/60 p-4">
                    <div className="font-pixel text-purple-300 text-xs">- 通關進度 -</div>
                    <div className={`font-pixel text-4xl tracking-widest ${isDone ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'text-purple-300'}`}>
                        {'★'.repeat(starCount)}{'☆'.repeat(ADV_CLEARS_TO_COMPLETE - starCount)}
                    </div>
                    <p className="font-retro text-xs text-gray-300">
                        {isDone ? '此課已完成！可繼續挑戰刷新紀錄' : `通關 ${ADV_CLEARS_TO_COMPLETE} 次即完成此課（目前 ${clears} / ${ADV_CLEARS_TO_COMPLETE}）`}
                    </p>
                    {record?.bestGrade && (
                        <p className="font-pixel text-[10px] text-gray-400">BEST: {record.bestScore ?? 0} 分 · RANK {record.bestGrade}</p>
                    )}
                </div>

                <button onClick={() => { playSound('click'); onStudy(); }} className="group relative h-24 nes-border flex items-center px-4 gap-4 transition-all hover:brightness-110 active:translate-y-1 bg-[#2e3c5c]">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    <div className="relative z-10 filter drop-shadow-lg group-hover:scale-110 transition-transform"><PixelArt.Scroll /></div>
                    <div className="relative z-10 flex-1 text-left">
                        <h3 className="font-pixel text-lg text-white text-shadow">學習模式</h3>
                        <p className="font-retro text-xs text-yellow-200 tracking-widest opacity-80">STUDY FIRST</p>
                    </div>
                    <ChevronRight className="text-white/50 group-hover:text-white" />
                </button>

                <button onClick={() => { playSound('click'); onStartQuiz(); }} className="group relative h-24 nes-border flex items-center px-4 gap-4 transition-all hover:brightness-110 active:translate-y-1 bg-[#5c2e4c]">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    <div className="relative z-10 filter drop-shadow-lg group-hover:scale-110 transition-transform"><PixelArt.Chest /></div>
                    <div className="relative z-10 flex-1 text-left">
                        <h3 className="font-pixel text-lg text-white text-shadow">開始挑戰</h3>
                        <p className="font-retro text-xs text-yellow-200 tracking-widest opacity-80">3 LIVES · FULL LESSON</p>
                    </div>
                    <ChevronRight className="text-white/50 group-hover:text-white" />
                </button>
            </div>
        </div>
    );
};

const StudyMode = ({ unitId, categoryId, data, lessonTitle, onBack, onStartQuiz }) => {
    const [viewMode, setViewMode] = useState('card');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const studyData = data[categoryId] || [];
    const isAdvanced = String(unitId).startsWith('adv_');

    const catTitles = { vocab: 'TREASURE', vocab_a: 'TREASURE A', vocab_b: 'TREASURE B', collocation: 'ARMORY', polysemy: 'ALCHEMY', sentences: 'SCROLLS' };
    const currentItem = studyData[currentIndex];
    const handleNext = () => { if (studyData.length === 0) return; setIsFlipped(false); setCurrentIndex((p) => (p + 1) % studyData.length); };
    const handlePrev = () => { if (studyData.length === 0) return; setIsFlipped(false); setCurrentIndex((p) => (p - 1 + studyData.length) % studyData.length); };
    const handleSpeak = (e, text) => { e.stopPropagation(); speakText(text); };

    return (
        <div className="flex flex-col h-full bg-rpg-bg overflow-hidden">
            {/* Header Bar */}
            <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 p-2 bg-black/50 border-b-2 border-rpg-border flex-shrink-0">
                <button onClick={() => { playSound('click'); onBack(); }} className="bg-black/40 border border-white/20 p-2 text-white hover:bg-red-500" title="返回上一頁"><ArrowLeft size={16} /></button>
                <div className="min-w-0 text-center">
                    <div className="text-white font-pixel text-[10px] truncate">{lessonTitle || catTitles[categoryId]}</div>
                    <div className="font-retro text-[9px] text-gray-400">{isAdvanced ? '先複習，再挑戰' : 'STUDY MODE'}</div>
                </div>
                <button
                    onClick={() => { playSound('click'); setViewMode(m => m === 'card' ? 'list' : 'card'); }}
                    className="text-rpg-panel hover:text-white flex items-center gap-1"
                    title={viewMode === 'card' ? '切換為列表模式' : '切換為卡片模式'}
                >
                    <span className="font-pixel text-[8px] opacity-70">{viewMode === 'card' ? 'LIST' : 'CARD'}</span>
                    {viewMode === 'card' ? <List size={20} /> : <Grid size={20} />}
                </button>
            </div>
            {/* Main Content Area */}
            {viewMode === 'list' ? (
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="w-full space-y-3 pb-10">
                        {studyData.map((item, idx) => (
                            <div key={idx} className="bg-rpg-panel border-4 border-rpg-border p-3 flex flex-col gap-2 relative">
                                <div className="flex justify-between items-start border-b-2 border-rpg-border pb-1">
                                    <h3 className="font-bold font-retro text-xl">{item.word}</h3>
                                    {item.part && item.part.trim() !== '' && (
                                        <span className="text-xs bg-black text-white px-1 font-pixel">{item.part}</span>
                                    )}
                                </div>
                                <p className="font-retro text-lg text-rpg-bg">{item.chinese}</p>
                                <button onClick={(e) => { handleSpeak(e, item.word); }} className="absolute top-2 right-12 text-black hover:text-rpg-primary"><Volume2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
                    {/* Progress Bar */}
                    <div className="w-full max-w-[320px] px-4 mb-4 flex-shrink-0">
                        <ProgressBar value={currentIndex + 1} max={studyData.length} label="EXP" color="bg-rpg-secondary" />
                    </div>
                    {/* Card Container - Fixed Size */}
                    <div
                        className="relative cursor-pointer flex-shrink-0"
                        style={{ width: '320px', height: '240px', perspective: '1000px' }}
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        <div
                            className="absolute inset-0 transition-transform duration-500"
                            style={{
                                transformStyle: 'preserve-3d',
                                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                            }}
                        >
                            {/* Front Face */}
                            <RPGBorder
                                className="bg-rpg-panel flex flex-col items-center justify-center"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backfaceVisibility: 'hidden',
                                    margin: 0
                                }}
                            >
                                <div className="absolute top-2 left-2 text-rpg-border opacity-50"><Star size={16} /></div>
                                <div className="absolute top-2 right-2 font-pixel text-[10px] text-rpg-border">{currentIndex + 1}/{studyData.length}</div>
                                <h2 className="text-2xl font-retro font-bold text-rpg-bg text-center">{currentItem?.word}</h2>
                                {currentItem?.part && currentItem.part.trim() !== '' ? (
                                    <span className="px-2 py-1 bg-black text-white font-pixel text-[10px] mt-2">{currentItem.part}</span>
                                ) : (
                                    <div className="h-[22px] mt-2"></div>
                                )}
                                <RPGButton onClick={(e) => handleSpeak(e, currentItem?.word)} color="primary" className="p-2 mt-4" silent><Volume2 size={16} /></RPGButton>
                                <div className="absolute bottom-2 text-[8px] font-pixel text-rpg-border animate-pulse">CLICK TO FLIP</div>
                            </RPGBorder>
                            {/* Back Face */}
                            <RPGBorder
                                className="bg-rpg-panel text-black flex flex-col items-center justify-center px-4"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                    margin: 0
                                }}
                            >
                                <div className="flex flex-col items-center justify-center w-full h-full p-4 text-center">
                                    <h3 className="text-xl font-retro text-black leading-relaxed">
                                        {currentItem?.chinese || currentItem?.word || '資料讀取中...'}
                                    </h3>
                                </div>
                            </RPGBorder>
                        </div>
                    </div>
                    {/* Navigation Buttons */}
                    <div className="flex gap-6 mt-4 flex-shrink-0">
                        <RPGButton onClick={handlePrev} color="neutral" className="w-12"><ChevronLeft /></RPGButton>
                        <RPGButton onClick={handleNext} color="neutral" className="w-12"><ChevronRight /></RPGButton>
                    </div>
                </div>
            )}
            <div className="flex-shrink-0 bg-black/70 border-t-4 border-rpg-border p-3">
                <div className="flex items-center justify-between mb-2 font-retro text-[10px] text-gray-400">
                    <span>{studyData.length > 0 ? `共 ${studyData.length} 個單字` : '本課尚無可用單字'}</span>
                    {isAdvanced && <span className="text-purple-300">挑戰 10 題 · 3 命</span>}
                </div>
                <RPGButton onClick={onStartQuiz} color="primary" disabled={studyData.length === 0} className="w-full py-3">
                    <Sword size={16} /> {isAdvanced ? '學完了，開始 10 題挑戰' : '開始挑戰'}
                </RPGButton>
            </div>
        </div>
    );
};

const BattleMode = ({ quizData, isBoss, isChallenge = false, difficulty = 'hard', questionLimit = 20, onComplete, onFlee, currentRecord = null }) => {
    // 所有模式都先顯示 menu 選擇作答模式
    const isEasy = difficulty === 'easy';
    const maxHp = isEasy ? 5 : 3; // 簡單模式 5 條命，困難模式維持 3 條
    const [status, setStatus] = useState('menu');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [score, setScore] = useState(0);
    const [hp, setHp] = useState(maxHp);
    const [feedback, setFeedback] = useState(null);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [battleLog, setBattleLog] = useState([]); // 戰鬥回顧記錄
    const [isSubmitting, setIsSubmitting] = useState(false); // 防止重复提交
    const [quizMode, setQuizMode] = useState(null); // 'standard' = 有發音, 'simple' = 無發音

    const MAX_TIME = 7.0;
    const [timeLeft, setTimeLeft] = useState(MAX_TIME);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!quizData) return;
        const generatedQuestions = quizData.map(item => {
            const otherItems = quizData.filter(i => i.id !== item.id);
            const distractors = shuffleArray(otherItems).slice(0, 3);
            const options = shuffleArray([item, ...distractors]);
            // Randomly decide mode: 'en-ch' (English Q, Chinese A) or 'ch-en' (Chinese Q, English A)
            const mode = Math.random() > 0.5 ? 'en-ch' : 'ch-en';
            return { target: item, options, mode };
        });
        const limit = Math.min(generatedQuestions.length, questionLimit);
        setQuestions(shuffleArray(generatedQuestions).slice(0, limit));
    }, [quizData, isBoss, questionLimit]);

    // 簡易 / 聽力模式：每題出現時自動播放正確單字的發音
    useEffect(() => {
        if (status === 'playing' && !feedback && questions.length > 0 && (quizMode === 'simple' || quizMode === 'listening')) {
            const currentQ = questions[currentQIndex];
            if (currentQ) {
                // 不管題目是 en-ch 還是 ch-en，都播放正確單字的英文發音
                speakText(currentQ.target.word);
            }
        }
    }, [status, currentQIndex, feedback, questions, quizMode]);

    useEffect(() => {
        if (status === 'playing' && !feedback && questions.length > 0 && !showQuitConfirm) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 0) { clearInterval(timerRef.current); handleTimeOut(); return 0; }
                    if (Math.floor(prev) < Math.floor(prev + 0.1) && prev < 4) playSound('tick');
                    return prev - 0.1;
                });
            }, 100);
        }
        return () => clearInterval(timerRef.current);
    }, [status, currentQIndex, feedback, showQuitConfirm, questions.length]);

    const handleTimeOut = () => {
        playSound('wrong');
        const currentQ = questions[currentQIndex];
        // 記錄超時未答
        setBattleLog(prev => [...prev, {
            questionNum: currentQIndex + 1,
            question: currentQ.mode === 'en-ch' ? currentQ.target.word : currentQ.target.chinese,
            questionAlt: currentQ.mode === 'en-ch' ? currentQ.target.chinese : currentQ.target.word,
            selectedAnswer: '未作答',
            correctAnswer: currentQ.mode === 'en-ch' ? currentQ.target.chinese : currentQ.target.word,
            isCorrect: false,
            pointsEarned: 0,
            isTimeout: true,
            targetId: currentQ.target.id,
            targetWord: currentQ.target.word,
            targetChinese: currentQ.target.chinese,
            targetBook: currentQ.target.book,
            targetUnit: currentQ.target.unit,
            targetSeries: currentQ.target.series,
            targetLesson: currentQ.target.lesson
        }]);
        setHp(h => h - 1);
        setFeedback('miss');
        nextQuestion(hp <= 1);
    };

    const isAnswerLocked = feedback !== null || showQuitConfirm;

    const handleAnswer = (selectedOption) => {
        if (isAnswerLocked) return;
        clearInterval(timerRef.current);
        const currentQ = questions[currentQIndex];
        const isCorrect = selectedOption.id === currentQ.target.id;

        let isDead = false;
        let pointsEarned = 0;

        if (isCorrect) {
            playSound('correct');
            // New logic: 100 pts if timeLeft >= 6 (first 1s), then scale based on 6s
            pointsEarned = 100;
            if (timeLeft < 6.0) {
                const scoreTime = Math.max(0, timeLeft);
                pointsEarned = Math.ceil((scoreTime / 6.0) * 100);
            }
            setScore(s => s + pointsEarned);
            setFeedback('hit');
        } else {
            playSound('wrong');
            setHp(h => h - 1);
            setFeedback('miss');
            if (hp <= 1) isDead = true;
        }

        // 記錄答題細節到 battleLog
        const selectedText = currentQ.mode === 'en-ch' ? selectedOption.chinese : selectedOption.word;
        const correctText = currentQ.mode === 'en-ch' ? currentQ.target.chinese : currentQ.target.word;
        setBattleLog(prev => [...prev, {
            questionNum: currentQIndex + 1,
            question: currentQ.mode === 'en-ch' ? currentQ.target.word : currentQ.target.chinese,
            questionAlt: currentQ.mode === 'en-ch' ? currentQ.target.chinese : currentQ.target.word,
            selectedAnswer: selectedText,
            correctAnswer: correctText,
            isCorrect: isCorrect,
            pointsEarned: pointsEarned,
            isTimeout: false,
            targetId: currentQ.target.id,
            targetWord: currentQ.target.word,
            targetChinese: currentQ.target.chinese,
            targetBook: currentQ.target.book,
            targetUnit: currentQ.target.unit,
            targetSeries: currentQ.target.series,
            targetLesson: currentQ.target.lesson
        }]);

        nextQuestion(isDead);
    };

    const nextQuestion = (isDead = false) => {
        setTimeout(() => {
            if (isDead) setStatus('gameover');
            else if (currentQIndex >= questions.length - 1) setStatus('victory');
            else { setCurrentQIndex(prev => prev + 1); setFeedback(null); setTimeLeft(MAX_TIME); }
        }, 1000);
    };

    const getRank = (finalScore) => {
        const maxPossible = questions.length * 100;
        const normalized = maxPossible > 0 ? (finalScore / maxPossible) * 1000 : 0;

        // 簡單模式評級上限為 B：分數再高也只給到 B（要拿 S/A 必須玩困難模式）
        if (!isEasy && normalized >= 900) return { rank: 'S', color: 'text-yellow-400', bg: 'bg-yellow-400', title: 'LEGENDARY!' };
        if (!isEasy && normalized >= 800) return { rank: 'A', color: 'text-orange-500', bg: 'bg-orange-500', title: 'EXCELLENT!' };
        if (normalized >= 700) return { rank: 'B', color: 'text-blue-400', bg: 'bg-blue-400', title: 'GREAT!' };
        if (normalized >= 600) return { rank: 'C', color: 'text-green-400', bg: 'bg-green-400', title: 'GOOD' };
        return { rank: 'D', color: 'text-gray-400', bg: 'bg-gray-400', title: 'TRY AGAIN' };
    };

    if (status === 'menu') {
        const isCleared = currentRecord?.bestStatus === 'CLEAR';
        const isCompleted = currentRecord?.bestStatus === 'COMPLETE';
        const successCount = currentRecord?.successCount || 0;
        const filledCount = Math.min(successCount, 5);

        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-4 bg-black/90">
                {isBoss ? <div className="animate-pulse"><PixelArt.MonsterBat /></div> : isChallenge ? <div className="animate-pulse"><PixelArt.MonsterBat /></div> : <PixelArt.MonsterSlime />}
                <h2 className="font-pixel text-xl text-white leading-loose">{isBoss ? "BOSS BATTLE" : isChallenge ? "終極試煉" : "MONSTER APPEARS"}<br /><span className="text-xs text-gray-400">{questions.length} Questions. 7 Seconds.</span></h2>

                {isEasy && (
                    <div className="font-pixel text-[10px] text-cyan-300 border-2 border-cyan-500/60 bg-cyan-900/30 px-3 py-1">簡單模式 · 5命 · 評級上限 B</div>
                )}

                {/* Boss Progress Checkboxes */}
                {isBoss && (
                    <div className="flex flex-col items-center gap-2 mb-1">
                        <div className="flex gap-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`w-8 h-8 border-4 ${i < filledCount ? 'bg-green-500 border-green-700' : 'bg-gray-800 border-gray-600'} flex items-center justify-center`}>
                                    {i < filledCount && <span className="text-white font-pixel">✔</span>}
                                </div>
                            ))}
                        </div>
                        <span className="font-pixel text-[10px] text-gray-400">CLEAR 5 TIMES (RANK B+) TO UNLOCK</span>
                    </div>
                )}

                {/* 模式選擇 */}
                <div className="w-full max-w-xs">
                    <div className="font-pixel text-xs text-gray-400 mb-2">- 選擇作答模式 -</div>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => { playSound('click'); setQuizMode('standard'); }}
                            className={`p-2 border-4 transition-all duration-200 flex flex-col items-center gap-1 ${
                                quizMode === 'standard'
                                    ? 'border-orange-400 bg-orange-900/60 scale-105 shadow-[0_0_15px_rgba(251,146,60,0.4)]'
                                    : 'border-gray-600 bg-gray-800 hover:border-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            <Sword size={20} className={quizMode === 'standard' ? 'text-orange-300' : 'text-gray-400'} />
                            <span className={`font-pixel text-xs ${quizMode === 'standard' ? 'text-orange-300' : 'text-gray-300'}`}>標準模式</span>
                            <span className={`font-retro text-[10px] leading-tight ${quizMode === 'standard' ? 'text-orange-400/70' : 'text-gray-500'}`}>純選擇題</span>
                        </button>
                        <button
                            onClick={() => { playSound('click'); setQuizMode('simple'); }}
                            className={`p-2 border-4 transition-all duration-200 flex flex-col items-center gap-1 ${
                                quizMode === 'simple'
                                    ? 'border-cyan-400 bg-cyan-900/60 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                                    : 'border-gray-600 bg-gray-800 hover:border-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            <Volume2 size={20} className={quizMode === 'simple' ? 'text-cyan-300' : 'text-gray-400'} />
                            <span className={`font-pixel text-xs ${quizMode === 'simple' ? 'text-cyan-300' : 'text-gray-300'}`}>簡易模式</span>
                            <span className={`font-retro text-[10px] leading-tight ${quizMode === 'simple' ? 'text-cyan-400/70' : 'text-gray-500'}`}>附帶發音</span>
                        </button>
                        <button
                            onClick={() => { playSound('click'); setQuizMode('listening'); }}
                            className={`p-2 border-4 transition-all duration-200 flex flex-col items-center gap-1 ${
                                quizMode === 'listening'
                                    ? 'border-purple-400 bg-purple-900/60 scale-105 shadow-[0_0_15px_rgba(192,132,252,0.4)]'
                                    : 'border-gray-600 bg-gray-800 hover:border-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            <Headphones size={20} className={quizMode === 'listening' ? 'text-purple-300' : 'text-gray-400'} />
                            <span className={`font-pixel text-xs ${quizMode === 'listening' ? 'text-purple-300' : 'text-gray-300'}`}>聽力模式</span>
                            <span className={`font-retro text-[10px] leading-tight ${quizMode === 'listening' ? 'text-purple-400/70' : 'text-gray-500'}`}>聽音選中文</span>
                        </button>
                    </div>
                </div>

                <RPGButton
                    onClick={() => {
                        // 聽力模式：所有題目統一為「聽英文發音、選中文」(en-ch)
                        if (quizMode === 'listening') {
                            setQuestions(prev => prev.map(q => ({ ...q, mode: 'en-ch' })));
                        }
                        setStatus('playing');
                    }}
                    color="primary"
                    className={`text-lg px-8 py-4 transition-all duration-300 ${quizMode ? 'opacity-100 translate-y-0' : 'opacity-30 pointer-events-none translate-y-2'}`}
                    disabled={!quizMode}
                >
                    FIGHT!
                </RPGButton>
                <button onClick={onFlee} className="text-gray-500 font-pixel text-xs hover:text-white">{isChallenge ? 'BACK' : 'RUN AWAY'}</button>
            </div>
        );
    }

    if (status === 'victory' || status === 'gameover') {
        const maxPossible = questions.length * 100;

        let rankData;
        if (status === 'gameover') {
            rankData = { rank: 'E', color: 'text-gray-500', bg: 'bg-rpg-primary', title: 'GAME OVER' };
        } else {
            rankData = getRank(score);
        }

        const ranks = [
            { label: 'S', min: Math.ceil(maxPossible * 0.9), color: 'text-yellow-400' },
            { label: 'A', min: Math.ceil(maxPossible * 0.8), color: 'text-orange-500' },
            { label: 'B', min: Math.ceil(maxPossible * 0.7), color: 'text-blue-400' },
            { label: 'C', min: Math.ceil(maxPossible * 0.6), color: 'text-green-400' },
            { label: 'D', min: 0, color: 'text-gray-400' },
            { label: 'E', min: '-', color: 'text-gray-600' }
        ];

        return (
            <div className="flex flex-col h-full text-center relative overflow-hidden">
                <div className={`absolute inset-0 ${rankData.bg} opacity-10 animate-pulse`}></div>

                {/* 頂部結果區域 */}
                <div className="flex-shrink-0 pt-4 px-4 z-10">
                    <div className="flex flex-col items-center gap-2 w-full max-w-xs mx-auto">
                        {status === 'victory' ? (
                            <>
                                <Award size={48} className="text-rpg-accent animate-bounce-pixel" />
                                <h2 className="font-pixel text-xl text-white">{rankData.title}</h2>
                                <div className={`font-pixel text-4xl ${rankData.color} text-shadow`}>RANK {rankData.rank}</div>
                            </>
                        ) : (
                            <>
                                <Skull size={48} className="text-gray-500" />
                                <h2 className="font-pixel text-lg text-white">DEFEATED...</h2>
                            </>
                        )}
                        <p className="font-retro text-base text-rpg-panel border-t border-b border-gray-600 py-1 w-full">SCORE: {score} / {maxPossible}</p>

                        {/* RANKING 表格 */}
                        <div className="w-full bg-black/50 border-2 border-rpg-border p-2 mt-1">
                            <h4 className="text-rpg-accent font-pixel text-[10px] mb-1">- RANKING -</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-pixel">
                                {ranks.map(r => {
                                    // 簡單模式評級上限 B：S/A 顯示為鎖定（拿不到）
                                    const isLocked = isEasy && (r.label === 'S' || r.label === 'A');
                                    return (
                                        <div key={r.label} className={`flex justify-between ${isLocked ? 'text-gray-600 opacity-60' : r.color} ${(!isLocked && rankData.rank === r.label) ? 'bg-white/20 px-1 rounded' : ''}`}>
                                            <span>RANK {r.label}</span>
                                            <span>{isLocked ? '🔒 LOCK' : `${r.min}+`}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* NEW RECORD 提示 */}
                        {(() => {
                            const rankOrder = { 'S': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1 };
                            const isNewRecord = !currentRecord ||
                                score > currentRecord.score ||
                                (score === currentRecord.score && rankOrder[rankData.rank] > rankOrder[currentRecord.rank]);

                            return isNewRecord ? (
                                <div className="animate-bounce-pixel text-yellow-300 font-pixel text-sm text-shadow drop-shadow-md border-2 border-yellow-500 bg-black/50 px-2 rounded">
                                    ✨ NEW RECORD! ✨
                                </div>
                            ) : null;
                        })()}
                    </div>
                </div>

                {/* 戰鬥回顧區域 - 可捲動 */}
                <div className="flex-1 overflow-hidden px-4 py-2 z-10">
                    <div className="w-full max-w-xs mx-auto h-full flex flex-col">
                        <h4 className="text-rpg-accent font-pixel text-xs mb-2 flex-shrink-0 border-b border-gray-600 pb-1">⚔ BATTLE RECAP ⚔</h4>
                        <div className="flex-1 overflow-y-auto bg-black/40 border-2 border-rpg-border rounded" style={{ maxHeight: '220px' }}>
                            <div className="p-2 space-y-2">
                                {battleLog.map((log, idx) => (
                                    <div key={idx} className={`p-2 rounded border-l-4 ${log.isCorrect ? 'border-green-500 bg-green-900/30' : 'border-red-500 bg-red-900/30'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 text-left">
                                                <div className="font-pixel text-[10px] text-gray-400">#{log.questionNum}</div>
                                                <div className="font-retro text-sm text-white leading-tight truncate" title={log.question}>{log.question}</div>
                                            </div>
                                            <div className={`font-pixel text-sm flex-shrink-0 ml-2 ${log.isCorrect ? 'text-green-400' : 'text-gray-500'}`}>
                                                {log.isCorrect ? `+${log.pointsEarned}` : '0'}
                                            </div>
                                        </div>
                                        <div className="mt-1 text-left">
                                            {log.isCorrect ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-green-400">●</span>
                                                    <span className="font-retro text-xs text-green-300 truncate">您選：{log.selectedAnswer}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-red-400">✗</span>
                                                        <span className="font-retro text-xs text-red-300 truncate">
                                                            您選：{log.isTimeout ? <span className="italic text-gray-400">{log.selectedAnswer}</span> : log.selectedAnswer}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-green-400">✓</span>
                                                        <span className="font-retro text-xs text-green-300 truncate">正解：{log.correctAnswer}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {battleLog.length === 0 && (
                                    <div className="text-gray-500 font-pixel text-xs py-4">No battle data</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 底部按鈕區域 */}
                <div className="flex-shrink-0 p-4 z-10 w-full max-w-xs mx-auto">
                    <div className="flex gap-3">
                        <RPGButton
                            onClick={() => {
                                if (isSubmitting) return;
                                setIsSubmitting(true);
                                onComplete({ score, rank: rankData.rank, battleLog, victory: status === 'victory' });
                            }}
                            disabled={isSubmitting}
                            color="neutral"
                            className="flex-1 py-3 tracking-normal"
                        >
                            {isSubmitting ? 'SAVING...' : 'CONTINUE'}
                        </RPGButton>
                        <RPGButton
                            onClick={() => {
                                if (isSubmitting) return;
                                setIsSubmitting(true);
                                // 先存檔，存完後重置戰鬥狀態
                                onComplete({ score, rank: rankData.rank, battleLog, victory: status === 'victory', retry: true });
                            }}
                            disabled={isSubmitting}
                            color="primary"
                            className="flex-1 py-3 tracking-normal"
                        >
                            {isSubmitting ? 'SAVING...' : 'RETRY'}
                        </RPGButton>
                    </div>
                </div>

                {/* Stamping Animation Logic for BOSS - Trigger only if we just hit 5 */}
                {(() => {
                    if (!isBoss || !currentRecord) return null;
                    const prevCount = currentRecord.successCount || 0;
                    const isSuccess = ['S', 'A', 'B'].includes(rankData.rank);
                    const newCount = isSuccess ? Math.min(prevCount + 1, 5) : prevCount;
                    const justFinished = isSuccess && prevCount === 4;

                    return (
                        <div className="absolute top-2 left-0 w-full flex flex-col items-center pointer-events-none z-20">
                            <div className="flex gap-2 mb-2">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={`w-5 h-5 border-2 transition-all duration-1000 ${i < newCount ? 'bg-green-500 border-green-300' : 'bg-gray-800 border-gray-600'} flex items-center justify-center`}>
                                        {i < newCount && <span className="text-white font-pixel text-[8px]">✔</span>}
                                    </div>
                                ))}
                            </div>
                            {justFinished && (
                                <div className="absolute top-8 animate-scale-in">
                                    <div className="border-6 border-green-500 text-green-500 font-pixel text-4xl p-2 transform -rotate-12 bg-black shadow-2xl">
                                        CLEAR!
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        );
    }

    if (questions.length === 0) return <div className="text-white text-center pt-20">Preparing Battle...</div>;
    const currentQ = questions[currentQIndex];
    if (!currentQ) return <div className="text-white text-center pt-20">Summoning...</div>;

    return (
        <div className="flex flex-col h-full relative bg-gray-900">
            {/* Top HUD */}
            <div className="flex justify-between items-center p-2 bg-black border-b-2 border-gray-700 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => { playSound('click'); setShowQuitConfirm(true); }} className="text-gray-400 hover:text-white transition-colors p-1" title="逃跑 (Flee)">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex gap-1 text-rpg-primary">
                        {[...Array(maxHp)].map((_, i) => <Heart key={i} size={20} fill={i < hp ? "currentColor" : "none"} className={i < hp ? "animate-pulse" : "opacity-30"} />)}
                    </div>
                </div>
                <div className="font-pixel text-rpg-accent text-lg flex items-center gap-2"><Coins size={16} /> {score}</div>
            </div>
            {/* Timer */}
            <div className="w-full h-4 bg-gray-800 border-b-2 border-gray-700 relative">
                <div className={`h-full transition-all duration-100 ease-linear ${timeLeft < 3 ? 'bg-red-600' : 'bg-yellow-400'}`} style={{ width: `${(timeLeft / MAX_TIME) * 100}%` }}></div>
                <span className="absolute top-0 right-1 text-[10px] text-white font-pixel leading-4">{timeLeft.toFixed(1)}s</span>
            </div>

            {/* Battle Scene */}
            <div className="flex-1 flex flex-col items-center justify-center relative p-4 overflow-hidden">
                {/* Monster Visualization */}
                <div className={`mb-4 transition-all duration-300 ${feedback === 'hit' ? 'opacity-0 scale-150 filter brightness-200' : 'opacity-100'}`}>
                    {(isBoss || isChallenge) ? <PixelArt.MonsterBat /> : <PixelArt.MonsterSlime />}
                </div>

                {/* Progress */}
                <div className="absolute top-2 text-gray-500 font-pixel text-[10px]">WAVE {currentQIndex + 1}/{questions.length}</div>

                {/* Question Box */}
                <div className={`relative w-full max-w-xs bg-black/80 border-4 border-rpg-panel p-4 text-center shadow-2xl backdrop-blur-sm transition-transform duration-100 ${feedback === 'hit' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'} ${feedback === 'miss' ? 'shake-effect border-red-500' : ''}`}>
                    {quizMode === 'listening' ? (
                        /* 聽力模式：不顯示單字，只放發音按鈕（點擊可重複播放） */
                        <button
                            onClick={(e) => { e.stopPropagation(); speakText(currentQ.target.word); }}
                            className="flex flex-col items-center gap-1 mx-auto text-purple-300 hover:text-purple-100 transition-colors py-2"
                            title="再聽一次"
                        >
                            <Headphones size={40} />
                            <span className="font-pixel text-[10px] text-gray-400">點擊再聽一次</span>
                        </button>
                    ) : (
                        <>
                            <h3 className="text-rpg-panel font-retro text-2xl md:text-3xl mb-1 text-shadow tracking-wider">
                                {currentQ.mode === 'en-ch' ? currentQ.target.word : currentQ.target.chinese}
                            </h3>
                            {/* 簡易模式：顯示發音按鈕可重複播放 */}
                            {quizMode === 'simple' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); speakText(currentQ.target.word); }}
                                    className="mt-1 text-cyan-400 hover:text-cyan-200 transition-colors p-1 inline-block"
                                    title="再聽一次"
                                >
                                    <Volume2 size={18} />
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Feedback Overlay */}
                {feedback === 'hit' && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><span className="font-pixel text-6xl text-yellow-300 text-shadow animate-bounce-pixel drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">CRITICAL!</span></div>}
                {feedback === 'miss' && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><span className="font-pixel text-6xl text-red-500 text-shadow drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">MISS!</span></div>}

            </div>

            {/* Options */}
            <div className="bg-black p-3 pb-6 border-t-4 border-rpg-border z-10">
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                    {currentQ.options.map((opt, i) => (
                        <button key={i} onClick={() => { playSound('click'); handleAnswer(opt); }} disabled={isAnswerLocked} className={`h-14 border-4 border-gray-600 bg-gray-800 text-white font-retro hover:bg-gray-700 active:translate-y-1 active:border-b-0 flex items-center justify-center text-center leading-tight px-2 transition-colors disabled:cursor-not-allowed ${currentQ.mode === 'en-ch' ? 'text-lg' : 'text-xl'} ${feedback !== null && opt.id === currentQ.target.id ? 'bg-green-600 border-green-400' : ''} ${feedback === 'miss' && opt.id !== currentQ.target.id ? 'opacity-50' : ''}`}>
                            {currentQ.mode === 'en-ch' ? opt.chinese : opt.word}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quit Confirmation Modal */}
            {showQuitConfirm && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <RPGBorder className="bg-rpg-panel p-6 w-full max-w-xs text-center shadow-2xl">
                        <h3 className="font-retro text-xl font-bold text-rpg-bg mb-6">你確定要離開戰鬥嗎?</h3>
                        <div className="flex gap-4 justify-center">
                            <RPGButton onClick={() => { playSound('click'); setShowQuitConfirm(false); }} color="neutral">取消</RPGButton>
                            <RPGButton onClick={() => { playSound('click'); onFlee(); }} color="primary">確定</RPGButton>
                        </div>
                    </RPGBorder>
                </div>
            )}
        </div>
    );
};

const App = () => {
    const [view, setView] = useState('login');
    const [userName, setUserName] = useState('');
    const [userData, setUserData] = useState(null); // { levelRecords: {}, ... }
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState('hard'); // 'easy' = 5命/僅單字+片語/評級上限B, 'hard' = 3命/現狀
    const [challengeUnits, setChallengeUnits] = useState([]);
    const [battleKey, setBattleKey] = useState(0); // 用來強制 BattleMode 重新掛載 (retry)

    // 進階書相關狀態
    const [advMeta, setAdvMeta] = useState(null);     // meta/advanced 目錄
    const [worldTab, setWorldTab] = useState('main'); // 'main' | 'adv'

    // New State for Async Loading
    const [loading, setLoading] = useState(false);
    const [authChecking, setAuthChecking] = useState(true); // Added to prevent double clicking during redirect login
    const [levelDataCache, setLevelDataCache] = useState({});

    // 老師後台相關狀態
    const [showTeacherDashboard, setShowTeacherDashboard] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

    // 學生姓名補登相關狀態
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [tempStudentName, setTempStudentName] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [isMuted, setIsMuted] = useState(false); // UI state for mute button
    const [volume, setVolumeState] = useState(50); // Volume state (0-100)

    useEffect(() => { document.body.classList.add('loaded'); }, []);

    useEffect(() => {
        let isMounted = true;

        // Ensure we wait for redirect processing before abandoning the loading screen
        getRedirectResult(auth)
            .then(() => {
                if (isMounted) setAuthChecking(false);
            })
            .catch(err => {
                console.error("Redirect login error:", err);
                if (isMounted) setAuthChecking(false);
            });

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && view === 'login') {
                handleLogin(user);
                if (isMounted) setAuthChecking(false);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Background Music Logic ---
    useEffect(() => {
        // Only play music if logged in (userName exists)
        if (!userName) {
            stopMusic();
            return;
        }

        // Determine which track to play based on view
        if (view === 'quiz' || view === 'challenge-quiz') {
            playMusic('challenge');
        } else {
            playMusic('lobby');
        }
    }, [view, userName]);

    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        setMute(newState);
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseInt(e.target.value, 10);
        setVolumeState(newVolume);
        setVolume(newVolume / 100);
    };

    const handleLogout = () => {
        playSound('click');
        signOut(auth).then(() => {
            setUserName('');
            setUserData(null);
            setCurrentUser(null);
            setView('login');
        }).catch(err => {
            console.error("Logout error", err);
        });
    };

    const handleLogin = async (user) => {
        setUserName(user.displayName);
        setCurrentUser(user);
        setLoading(true);
        const userRef = doc(db, 'users', user.uid);
        try {
            const userSnap = await getDoc(userRef);

            // 👇👇👇 新增這段：無論新舊帳號，都更新大頭貼 (因為使用者可能換過 Google 頭貼)
            await setDoc(userRef, {
                photoURL: user.photoURL || null, // 存入大頭貼
                email: user.email // 順便確保 Email 也是最新的
            }, { merge: true }); // merge: true 代表「只更新這些欄位，不要覆蓋其他成績」

            if (userSnap.exists()) {
                setUserData({ ...userSnap.data(), photoURL: user.photoURL }); // 更新本地狀態
            } else {
                const initialData = {
                    avgAccuracy: 0,
                    totalSessions: 0,
                    grades: { S: 0, A: 0, B: 0, C: 0, D: 0 },
                    levelRecords: {},
                    trialHistory: [],
                    photoURL: user.photoURL // 新帳號也要存
                };
                // setDoc with merge 上面已經做過了，這裡其實只要設定初始狀態給前端
                setUserData(initialData);
            }
            setView('map');
        } catch (e) {
            console.error("Error loading user data:", e);
            alert("載入資料失敗，請重試");
        } finally {
            setLoading(false);
        }
    };

    // 載入進階書目錄（登入後）
    useEffect(() => {
        if (!userName) return;
        fetchAdvancedMeta().then(setAdvMeta);
    }, [userName]);

    // 學生姓名補登檢查 - 監聽 user 和 userData
    useEffect(() => {
        if (currentUser && userData && !userData.studentName && !showNamePrompt) {
            // 預設帶入 Google 顯示名稱
            setTempStudentName(currentUser.displayName || '');
            setShowNamePrompt(true);
        }
    }, [currentUser, userData, showNamePrompt]);

    // 保存學生姓名
    const handleSaveStudentName = async () => {
        if (!tempStudentName.trim()) {
            alert('請輸入姓名');
            return;
        }
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                studentName: tempStudentName.trim(),
                email: currentUser.email
            });
            setUserData({ ...userData, studentName: tempStudentName.trim(), email: currentUser.email });
            setShowNamePrompt(false);
        } catch (e) {
            console.error("Failed to save student name:", e);
            alert('保存失敗,請重試');
        }
    };

    const handleBattleComplete = async (result) => {
        // result: { score, rank, battleLog }
        if (!auth.currentUser || !userData) return;

        // 準備一個變數來累積所有的變更
        let updatedUserData = { ...userData };
        const updatesForFirestore = {};
        const sessionLogs = result.battleLog || [];
        const sessionCorrectCount = sessionLogs.filter(log => log.isCorrect).length;
        const currentSessionAccuracy = sessionLogs.length > 0
            ? (sessionCorrectCount / sessionLogs.length) * 100
            : null;

        // ==========================================
        // 1. 【新增】計算平均準確率與練習次數 (修復 0% 問題)
        // ==========================================
        if (currentSessionAccuracy !== null) {
            // 取得舊的數據
            const oldTotal = updatedUserData.totalSessions || 0;
            const oldAvg = updatedUserData.avgAccuracy || 0;

            // 計算新的總次數
            const newTotal = oldTotal + 1;

            // 計算新的「累積平均準確率」 (公式：(舊平均 * 舊次數 + 新準確率) / 新次數)
            const newAvg = ((oldAvg * oldTotal) + currentSessionAccuracy) / newTotal;

            // 更新數據
            updatedUserData.avgAccuracy = newAvg;
            updatedUserData.totalSessions = newTotal;
            updatesForFirestore.avgAccuracy = newAvg;
            updatesForFirestore.totalSessions = newTotal;
        }

        // ==========================================
        // 2. 處理錯誤單字 (Mistake Stats)
        // ==========================================
        if (sessionLogs.length > 0) {
            const wrongAnswers = sessionLogs.filter(log => !log.isCorrect);
            if (wrongAnswers.length > 0) {
                const currentMistakeStats = { ...(updatedUserData.mistakeStats || {}) };

                const getGameUnitId = (book, unit) => {
                    for (let gameUnitId = 1; gameUnitId <= 16; gameUnitId++) {
                        const mapping = LEVEL_MAPPING[gameUnitId];
                        if (mapping && mapping.book === book && mapping.unit === unit) return gameUnitId;
                    }
                    return null;
                };

                wrongAnswers.forEach(log => {
                    if (log.targetId) {
                        const lesson = Number(log.targetLesson);
                        const isAdvanced = log.targetSeries === 'advanced' && Number.isFinite(lesson);
                        const key = isAdvanced ? `advanced:${lesson}:${log.targetId}` : log.targetId;
                        const gameUnitId = (log.targetBook && log.targetUnit)
                            ? getGameUnitId(log.targetBook, log.targetUnit)
                            : null;

                        if (currentMistakeStats[key]) {
                            currentMistakeStats[key].count += 1;
                            if (gameUnitId !== null) currentMistakeStats[key].gameUnitId = gameUnitId;
                            currentMistakeStats[key].lastWrongAt = new Date().toISOString();
                        } else {
                            currentMistakeStats[key] = {
                                count: 1,
                                word: log.targetWord || '',
                                chinese: log.targetChinese || '',
                                gameUnitId,
                                ...(isAdvanced ? { source: 'advanced', lesson } : { source: 'main' }),
                                lastWrongAt: new Date().toISOString()
                            };
                        }
                    }
                });
                updatedUserData.mistakeStats = currentMistakeStats;
                updatesForFirestore.mistakeStats = currentMistakeStats;
            }
        }

        // ==========================================
        // 3. 處理單元/BOSS 通關紀錄 (Level Records)
        // ==========================================
        const advancedSessionGroups = sessionLogs.reduce((groups, log) => {
            const lesson = Number(log.targetLesson);
            if (log.targetSeries !== 'advanced' || !Number.isFinite(lesson)) return groups;
            if (!groups[lesson]) groups[lesson] = [];
            groups[lesson].push(log);
            return groups;
        }, {});

        const withAdvancedAttempt = (prevRecord, logs) => {
            if (!logs || logs.length === 0) return prevRecord;
            const correct = logs.filter(log => log.isCorrect).length;
            const accuracy = (correct / logs.length) * 100;
            const timestamp = new Date().toISOString();
            const attemptEntry = {
                timestamp,
                correct,
                total: logs.length,
                accuracy
            };
            return {
                ...prevRecord,
                attempts: (prevRecord.attempts || 0) + 1,
                totalCorrect: (prevRecord.totalCorrect || 0) + correct,
                totalAnswered: (prevRecord.totalAnswered || 0) + logs.length,
                lastAccuracy: accuracy,
                bestAccuracy: Math.max(prevRecord.bestAccuracy || 0, accuracy),
                accuracyHistory: [attemptEntry, ...(prevRecord.accuracyHistory || [])].slice(0, 20),
                lastPlayed: timestamp,
                unlocked: true
            };
        };

        if (selectedNode && view !== 'challenge-quiz') {
            if (selectedNode.type === 'unit') {
                const levelId = selectedNode.id;
                const prevRecord = updatedUserData.levelRecords?.[levelId] || {};
                const categoryMap = { 'vocab': 'vocab', 'vocab_a': 'vocabA', 'vocab_b': 'vocabB', 'collocation': 'equip', 'polysemy': 'alchemy', 'sentences': 'scroll' };
                const catKey = categoryMap[selectedCategory || 'vocab_a'];

                let prevScore = 0;
                let prevGrade = '?';
                if (prevRecord[catKey] && typeof prevRecord[catKey] === 'object') {
                    prevScore = prevRecord[catKey].score || 0;
                    prevGrade = prevRecord[catKey].grade || '?';
                } else {
                    prevScore = prevRecord[`${catKey}Score`] || 0;
                    prevGrade = prevRecord[`${catKey}Grade`] || '?';
                }

                const rankOrder = { 'S': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, '?': 0 };

                let isImprovement = (result.score > prevScore) ||
                    (result.score === prevScore && rankOrder[result.rank] > rankOrder[prevGrade]) ||
                    (prevGrade === '?');

                if (isImprovement) {
                    const newRecord = {
                        ...prevRecord,
                        [catKey]: { score: result.score, grade: result.rank },
                        lastPlayed: new Date().toISOString(),
                        unlocked: true
                    };
                    delete newRecord[`${catKey}Grade`];
                    delete newRecord[`${catKey}Score`];
                    delete newRecord.timestamp;

                    const newLevelRecords = { ...updatedUserData.levelRecords, [levelId]: newRecord };
                    updatedUserData.levelRecords = newLevelRecords;
                    updatesForFirestore[`levelRecords.${levelId}`] = newRecord;
                }
            } else if (selectedNode.type === 'boss') {
                const bossId = selectedNode.id;
                const prevRecord = updatedUserData.levelRecords?.[bossId] || {};

                let successCount = prevRecord.successCount || 0;
                let sCount = prevRecord.sCount || 0;
                let bestStatus = prevRecord.bestStatus || 'NONE';

                if (['S', 'A', 'B'].includes(result.rank)) successCount += 1;
                if (result.rank === 'S') sCount += 1;

                if (sCount >= 5) bestStatus = 'COMPLETE';
                else if (successCount >= 5 && bestStatus !== 'COMPLETE') bestStatus = 'CLEAR';

                const newRecord = {
                    ...prevRecord,
                    successCount,
                    sCount,
                    bestStatus,
                    lastPlayed: new Date().toISOString(),
                    unlocked: true,
                    rank: result.rank,
                    score: Math.max(prevRecord.score || 0, result.score)
                };

                const newLevelRecords = { ...updatedUserData.levelRecords, [bossId]: newRecord };
                updatedUserData.levelRecords = newLevelRecords;
                updatesForFirestore[`levelRecords.${bossId}`] = newRecord;
            } else if (selectedNode.type === 'adv') {
                const levelId = selectedNode.id;
                const prevRecord = updatedUserData.levelRecords?.[levelId] || {};
                const performanceRecord = withAdvancedAttempt(
                    prevRecord,
                    advancedSessionGroups[selectedNode.lesson] || sessionLogs
                );
                const rankOrder = { 'S': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, '?': 0 };
                const clears = (prevRecord.clears || 0) + (result.victory ? 1 : 0);
                const bestGrade = (rankOrder[result.rank] || 0) > (rankOrder[prevRecord.bestGrade] || 0)
                    ? result.rank : (prevRecord.bestGrade || result.rank);
                const newRecord = {
                    ...performanceRecord,
                    clears,
                    bestScore: Math.max(prevRecord.bestScore || 0, result.score),
                    bestGrade,
                    lastPlayed: new Date().toISOString(),
                    unlocked: true
                };
                updatedUserData.levelRecords = { ...updatedUserData.levelRecords, [levelId]: newRecord };
                updatesForFirestore[`levelRecords.${levelId}`] = newRecord;
            }
        }

        // 終極試煉可混合一般／進階題目；只補進階課次的分析資料，不改變原試煉通關規則
        if (view === 'challenge-quiz') {
            Object.entries(advancedSessionGroups).forEach(([lesson, logs]) => {
                const levelId = advLessonId(lesson);
                const prevRecord = updatedUserData.levelRecords?.[levelId] || {};
                const newRecord = withAdvancedAttempt(prevRecord, logs);
                updatedUserData.levelRecords = { ...updatedUserData.levelRecords, [levelId]: newRecord };
                updatesForFirestore[`levelRecords.${levelId}`] = newRecord;
            });
        }

        // ==========================================
        // 4. 通用詳細歷史紀錄 (trialHistory)
        // ==========================================
        let historyUnitTitle = "";
        let historyType = "practice";
        let historyCategoryKey = null;
        let historyCategoryLabel = null;
        const historyCategoryLabels = {
            vocab: '單字',
            vocab_a: '單字A',
            vocab_b: '單字B',
            collocation: '搭配詞',
            polysemy: '多義字',
            sentences: '句子'
        };

        if (view === 'challenge-quiz') {
            historyType = "quiz";
            historyUnitTitle = challengeUnits.map(unitId => {
                if (String(unitId).startsWith('adv_')) return `進階 L${String(unitId).slice(4)}`;
                const info = LEVEL_INFO[unitId];
                return info ? `Level ${unitId < 10 ? '0' + unitId : unitId}: ${info.title}` : `Unit ${unitId}`;
            }).join(', ');
        } else if (selectedNode) {
            if (selectedNode.type === 'boss') {
                historyType = "quiz";
                historyUnitTitle = selectedNode.label || `BOSS ${selectedNode.id}`;
            } else if (selectedNode.type === 'adv') {
                historyType = "practice";
                historyUnitTitle = `進階 L${selectedNode.lesson}`;
                historyCategoryKey = 'vocab';
                historyCategoryLabel = '進階單字';
            } else {
                historyType = "practice";
                const unitId = selectedNode.id;
                const info = LEVEL_INFO[unitId];
                historyUnitTitle = info ? `Level ${unitId < 10 ? '0' + unitId : unitId}: ${info.title}` : `Unit ${unitId}`;
                historyCategoryKey = selectedCategory || 'vocab_a';
                historyCategoryLabel = historyCategoryLabels[historyCategoryKey] || null;
            }
        }

        if (historyUnitTitle) {
            const newTrialRecord = {
                timestamp: new Date().toISOString(),
                date: new Date().toISOString(),
                score: result.score,
                rank: result.rank,
                type: historyType,
                unit: historyUnitTitle,
                units: view === 'challenge-quiz' ? challengeUnits : [selectedNode?.id],
                correctCount: sessionCorrectCount,
                totalQuestions: sessionLogs.length,
                accuracy: currentSessionAccuracy,
                ...(historyCategoryKey ? { categoryKey: historyCategoryKey } : {}),
                ...(historyCategoryLabel ? { categoryLabel: historyCategoryLabel } : {})
            };

            const currentHistory = updatedUserData.trialHistory || [];
            const updatedHistory = [newTrialRecord, ...currentHistory];

            updatedUserData.trialHistory = updatedHistory;
            updatesForFirestore.trialHistory = updatedHistory;
        }

        // ==========================================
        // 5. 最終寫入
        // ==========================================
        setUserData(updatedUserData);
        if (result.retry) {
            // Retry: 不跳回地圖，直接重新掛載 BattleMode
            setBattleKey(prev => prev + 1);
        } else {
            setView('map');
        }

        try {
            if (Object.keys(updatesForFirestore).length > 0) {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, updatesForFirestore);
                console.log("所有資料儲存成功！準確率已更新。");
            }
        } catch (e) {
            console.error("儲存失敗:", e);
        }
    };

    const handleNodeSelect = async (node) => {
        setSelectedNode(node);

        // Fetch data if needed
        if (node.type === 'unit') {
            if (!levelDataCache[node.id]) {
                setLoading(true);
                try {
                    const data = await fetchLevelData(node.id);
                    if (data) setLevelDataCache(prev => ({ ...prev, [node.id]: data }));
                } catch (e) {
                    console.error("Fetch failed", e);
                } finally {
                    setLoading(false);
                }
            }
        } else if (node.type === 'boss') {
            setLoading(true);
            try {
                const neededIds = node.targetUnits;
                const promises = neededIds.map(async uid => {
                    if (!levelDataCache[uid]) {
                        return { id: uid, data: await fetchLevelData(uid) };
                    }
                    return null;
                });
                const results = await Promise.all(promises);
                let hasNew = false;
                const newCache = { ...levelDataCache };
                results.forEach(res => {
                    if (res && res.data) {
                        newCache[res.id] = res.data;
                        hasNew = true;
                    }
                });
                if (hasNew) setLevelDataCache(newCache);
            } catch (e) { console.error("Boss Fetch failed", e); }
            finally { setLoading(false); }
        } else if (node.type === 'adv') {
            if (!levelDataCache[node.id]) {
                setLoading(true);
                try {
                    const data = await fetchAdvancedLesson(node.lesson);
                    if (data) setLevelDataCache(prev => ({ ...prev, [node.id]: data }));
                } catch (e) { console.error("Fetch failed", e); }
                finally { setLoading(false); }
            }
        }

        if (node.type === 'boss') setView('quiz');
        else if (node.type === 'adv') {
            // 進階課直接進學習頁，挑戰成為學習完成後的單一下一步。
            setSelectedCategory('vocab');
            setView('study');
        } else setView('unit-hub');
    };

    const handleForceQuiz = () => setView('quiz');

    const handleStartChallenge = async (selectedIds) => {
        setChallengeUnits(selectedIds);
        playSound('start');

        // Fetch all needed
        setLoading(true);
        try {
            const promises = selectedIds.map(async uid => {
                if (!levelDataCache[uid]) {
                    const data = String(uid).startsWith('adv_')
                        ? await fetchAdvancedLesson(parseInt(String(uid).slice(4), 10))
                        : await fetchLevelData(uid);
                    return { id: uid, data };
                }
                return null;
            });
            const results = await Promise.all(promises);
            let hasNew = false;
            const newCache = { ...levelDataCache };
            results.forEach(res => {
                if (res && res.data) {
                    newCache[res.id] = res.data;
                    hasNew = true;
                }
            });
            if (hasNew) setLevelDataCache(newCache);

            setView('challenge-quiz');
        } catch (e) { console.error("Challenge Fetch failed", e); }
        finally { setLoading(false); }
    };

    /**
     * 依比例從各類別抽取題目
     * @param {Array} unitIds - 要抽取的單元 ID 陣列
     * @param {number} totalQuestions - 總題數
     * @returns {Array} - 混合的題目陣列
     * 
     * 比例分配: vocab 50%, collocation 20%, polysemy 15%, sentences 15%
     */
    const getMixedQuizData = (unitIds) => {
        // 收集所有類別的資料
        const allData = { vocab: [], collocation: [], polysemy: [], sentences: [] };

        unitIds.forEach(uid => {
            const content = levelDataCache[uid] || GAME_DATA[uid]?.content || {};
            if (content.vocab) allData.vocab = [...allData.vocab, ...content.vocab];
            if (content.collocation) allData.collocation = [...allData.collocation, ...content.collocation];
            if (content.polysemy) allData.polysemy = [...allData.polysemy, ...content.polysemy];
            if (content.sentences) allData.sentences = [...allData.sentences, ...content.sentences];
        });

        // 計算各類別可出的題目數量
        const totalAvailable = allData.vocab.length + allData.collocation.length +
            allData.polysemy.length + allData.sentences.length;

        if (totalAvailable === 0) return [];

        // 目標比例: vocab 50%, collocation 20%, polysemy 15%, sentences 15%
        const targetRatios = { vocab: 0.50, collocation: 0.20, polysemy: 0.15, sentences: 0.15 };

        // 計算每類別應抽取的數量 (基於各類別實際可用數量)
        const maxTotal = 20; // 最多 20 題
        const targetTotal = Math.min(totalAvailable, maxTotal);

        let finalPool = [];
        let remaining = targetTotal;

        // 按比例抽取，但不超過該類別的可用數量
        Object.keys(targetRatios).forEach(category => {
            const available = allData[category];
            if (available.length === 0 || remaining <= 0) return;

            // 計算此類別應抽幾題
            let targetCount = Math.round(targetTotal * targetRatios[category]);
            // 確保不超過現有數量
            targetCount = Math.min(targetCount, available.length, remaining);

            // 隨機抽取
            const shuffled = shuffleArray([...available]);
            const selected = shuffled.slice(0, targetCount);

            finalPool = [...finalPool, ...selected];
            remaining -= targetCount;
        });

        // 如果還有剩餘空位，從所有資料中補充
        if (remaining > 0) {
            const allItems = [...allData.vocab, ...allData.collocation,
            ...allData.polysemy, ...allData.sentences];
            const alreadySelected = new Set(finalPool.map(item => item.id));
            const unselected = allItems.filter(item => !alreadySelected.has(item.id));
            const shuffledUnselected = shuffleArray(unselected);
            const extra = shuffledUnselected.slice(0, remaining);
            finalPool = [...finalPool, ...extra];
        }

        // 最終打亂順序
        return shuffleArray(finalPool);
    };

    // 只清空目前頁籤的錯題，避免一般／進階互相誤刪
    const handleClearMistakes = async (scope = 'main') => {
        if (!auth.currentUser || !userData) return;
        try {
            const currentMistakeStats = { ...(userData.mistakeStats || {}) };
            const remainingMistakes = Object.fromEntries(
                Object.entries(currentMistakeStats).filter(([, data]) => {
                    const isAdvanced = data?.source === 'advanced' && Number.isFinite(Number(data?.lesson));
                    return scope === 'adv' ? !isAdvanced : isAdvanced;
                })
            );

            const updatedUserData = { ...userData, mistakeStats: remainingMistakes };
            setUserData(updatedUserData);

            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                mistakeStats: remainingMistakes
            });
        } catch (e) {
            console.error("Failed to clear mistakes:", e);
        }
    };

    const handleRemoveMistake = async (wordId) => {
        if (!auth.currentUser || !userData) return;
        try {
            // 建立新的 mistakeStats 副本，移除指定的 wordId
            const currentMistakeStats = { ...(userData.mistakeStats || {}) };
            delete currentMistakeStats[wordId];

            // 更新本地狀態
            const updatedUserData = { ...userData, mistakeStats: currentMistakeStats };
            setUserData(updatedUserData);

            // 更新 Firestore
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                mistakeStats: currentMistakeStats
            });
        } catch (e) {
            console.error("Failed to remove mistake:", e);
        }
    };

    const getQuizData = () => {
        // 終極試煉模式 - 使用混合出題
        if (view === 'challenge-quiz') {
            return getMixedQuizData(challengeUnits);
        }

        if (!selectedNode) return [];

        // 進階課模式 - 交給 BattleMode 每次隨機抽最多 10 題
        if (selectedNode.type === 'adv') {
            return levelDataCache[selectedNode.id]?.vocab || [];
        }

        // 一般單元模式 - 依據選擇的類別
        if (selectedNode.type === 'unit') {
            const content = levelDataCache[selectedNode.id] || GAME_DATA[selectedNode.id].content;
            const cat = selectedCategory || 'vocab_a';
            return content[cat];
        } else {
            // BOSS 模式 - 使用混合出題
            return getMixedQuizData(selectedNode.targetUnits);
        }
    };

    const renderContent = () => {
        // Show LoadingScreen if loading or checking initial auth
        if (loading || authChecking) return <LoadingScreen />;

        switch (view) {
            case 'login': return <LoginScreen onLogin={handleLogin} />;
            case 'map': return <WorldMap onLogout={handleLogout} onSelectNode={handleNodeSelect} onViewJourney={() => { playSound('click'); setView('journey'); }} onViewWeeklyReport={() => { playSound('click'); setView('weekly-report'); }} onUltimateChallenge={() => { playSound('click'); setView('challenge-setup'); }} onViewMistakeNotebook={() => { playSound('click'); setView('mistake-notebook'); }} records={userData?.levelRecords} advMeta={advMeta} activeTab={worldTab} onChangeTab={setWorldTab} />;
            case 'weekly-report': return <WeeklyReport onBack={() => { playSound('click'); setView('map'); }} currentUserId={currentUser?.uid} userData={userData} />;
            case 'mistake-notebook': return <MistakeNotebook onBack={() => { playSound('click'); setView('map'); }} mistakeStats={userData?.mistakeStats} onClearMistakes={handleClearMistakes} onRemoveMistake={handleRemoveMistake} />;
            case 'journey': return <JourneyMode onBack={() => { playSound('click'); setView('map'); }} onViewTrialLog={() => { playSound('click'); setView('trial-log'); }} records={userData?.levelRecords} advMeta={advMeta} mistakeStats={userData?.mistakeStats} />;
            case 'trial-log': return <TrialLogView onBack={() => { playSound('click'); setView('journey'); }} onRetry={() => { playSound('click'); setView('challenge-setup'); }} trialHistory={userData?.trialHistory} />;
            case 'challenge-setup': return <ChallengeSetup onBack={() => { playSound('click'); setView('map'); }} onStart={handleStartChallenge} advMeta={advMeta} />;
            case 'unit-hub': return <UnitHub unitId={selectedNode?.id} onBack={() => setView('map')} onSelectCategory={(cat) => { setSelectedCategory(cat); setView('study'); }} difficulty={selectedDifficulty} onChangeDifficulty={setSelectedDifficulty} />;
            case 'adv-hub': return <AdvLessonHub
                node={selectedNode}
                advMeta={advMeta}
                record={userData?.levelRecords?.[selectedNode?.id]}
                onBack={() => { playSound('click'); setView('map'); }}
                onStudy={() => { playSound('click'); setSelectedCategory('vocab'); setView('study'); }}
                onStartQuiz={() => { playSound('click'); setView('quiz'); }}
            />;
            case 'study': return <StudyMode
                unitId={selectedNode?.id}
                categoryId={selectedCategory}
                lessonTitle={selectedNode?.type === 'adv' ? (advMeta?.titles?.[String(selectedNode?.lesson)] || `進階單字 第 ${selectedNode?.lesson} 課`) : null}
                data={levelDataCache[selectedNode?.id] || GAME_DATA[selectedNode?.id]?.content || { vocab: [], vocab_a: [], vocab_b: [], collocation: [], polysemy: [], sentences: [] }}
                onBack={() => setView(selectedNode?.type === 'adv' ? 'map' : 'unit-hub')}
                onStartQuiz={handleForceQuiz}
            />;
            case 'quiz':
            case 'challenge-quiz':
                return <BattleMode key={battleKey} quizData={getQuizData()} isBoss={selectedNode?.type === 'boss'} isChallenge={view === 'challenge-quiz'} difficulty={(view === 'quiz' && selectedNode?.type === 'unit') ? selectedDifficulty : 'hard'} questionLimit={(view === 'quiz' && selectedNode?.type === 'adv') ? ADV_QUIZ_QUESTION_LIMIT : 20} onComplete={handleBattleComplete} onFlee={() => setView('map')} currentRecord={userData?.levelRecords?.[selectedNode?.id]} />;
            default: return <div>Error</div>;
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-800 p-4 rounded-xl shadow-2xl border-4 border-gray-600 relative">
                {/* 老師後台鎖頭按鈕 - 右上角 */}
                {/* 老師後台鎖頭按鈕 - 已移除 */}

                <div className="bg-rpg-bg w-full aspect-[9/16] sm:aspect-[3/4] rounded-lg border-4 border-black overflow-hidden relative shadow-inner">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>
                    <div className="relative z-0 h-full overflow-hidden">{renderContent()}</div>

                    {/* 老師後台面板 - 嵌入手機螢幕 */}
                    {showTeacherDashboard && (
                        <div className="absolute inset-0 z-[60]">
                            <TeacherDashboard onClose={() => setShowTeacherDashboard(false)} />
                        </div>
                    )}
                </div>
                <div className="mt-4 flex justify-between items-end px-4">
                    <div className="text-gray-500 font-pixel text-[10px]">{userName ? `HERO: ${userName}` : 'INSERT COIN'}</div>
                    <div className="flex gap-2 items-center">
                        {/* Volume Slider */}
                        <div className="flex items-center gap-1 mr-2 bg-gray-900/50 p-1 rounded-full border border-gray-700">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-16 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rpg-primary"
                                title="Music Volume"
                            />
                        </div>

                        {/* Music Toggle Button */}
                        <button
                            onClick={toggleMute}
                            className={`mr-8 p-2 rounded-full border-2 ${isMuted ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-rpg-primary border-red-400 text-white'} transition-all hover:scale-110 active:scale-95`}
                            title={isMuted ? "Unmute Music" : "Mute Music"}
                        >
                            {isMuted ? <Volume2 size={16} className="opacity-50" /> : <Volume2 size={16} />}
                        </button>
                        <div className="w-3 h-12 bg-gray-900 rounded-full transform -rotate-45 border border-gray-700"></div>
                        <div className="w-3 h-12 bg-gray-900 rounded-full transform -rotate-45 border border-gray-700"></div>
                    </div>
                </div>
            </div>

            {/* 學生姓名補登 Modal */}
            {showNamePrompt && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">歡迎!</h2>
                        <p className="text-slate-600 mb-4">請輸入您的姓名以繼續使用系統</p>
                        <input
                            type="text"
                            value={tempStudentName}
                            onChange={(e) => setTempStudentName(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg mb-4 text-lg focus:outline-none focus:border-indigo-500"
                            placeholder="請輸入姓名"
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveStudentName()}
                        />
                        <button
                            onClick={handleSaveStudentName}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            確認
                        </button>
                    </div>
                </div>
            )}

            {/* 老師後台密碼輸入 Modal */}
            {showPasswordPrompt && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-slate-800">老師後台</h2>
                            <button
                                onClick={() => setShowPasswordPrompt(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        <input
                            type="password"
                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg mb-4 text-lg focus:outline-none focus:border-indigo-500"
                            placeholder="請輸入密碼"
                            autoFocus
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    if (e.target.value === '1999') {
                                        setShowPasswordPrompt(false);
                                        setShowTeacherDashboard(true);
                                    } else {
                                        alert('密碼錯誤');
                                        e.target.value = '';
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* 老師後台密碼輸入 Modal */}
        </div>
    );
};




export default App;
