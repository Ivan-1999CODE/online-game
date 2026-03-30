import React, { useState, useEffect, useRef } from 'react';
import {
    Sword, Shield, Scroll, Skull, Coins, Heart, Star, ChevronLeft, ChevronRight,
    Volume2, Map as MapIcon, RefreshCw, XCircle, CheckCircle,
    HelpCircle, Backpack, Gem, Flame, Skull as SkullIcon, Book, User,
    List, Grid, ArrowLeft, Lightbulb, MessageCircle, Clock, Award, Home, Lock, LogOut
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from 'firebase/auth';
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
                // 支援 definitions[] 陣列格式和舊的單一 chinese 欄位
                let chineseStr = data.chinese || '';
                if (!chineseStr && data.definitions && Array.isArray(data.definitions)) {
                    chineseStr = data.definitions.map(d => `[${d.pos}] ${d.mean}`).join(' / ');
                }
                categories.polysemy.push({ id: doc.id, word: data.word, chinese: chineseStr, definitions: data.definitions || [], book: data.book || mapping.book, unit: data.unit || mapping.unit });
            } else if (categoryStr.includes("3") || categoryStr.includes("片語") || categoryStr.includes("佳句")) {
                categories.sentences.push(item);
            }
        });
        return categories;
    } catch (err) {
        console.error("Error fetching data:", err);
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
        content: { vocab: [], collocation: [], polysemy: [], sentences: [] }
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
const getUnitAchievementStatus = (record) => {
    if (!record) return null;
    const cats = ['vocab', 'equip', 'alchemy', 'scroll'];
    const grades = cats.map(c => {
        // New structure: record[c] = { score, grade }
        if (record[c] && typeof record[c] === 'object') return record[c].grade;
        // Legacy: record[c + 'Grade']
        if (record[`${c}Grade`]) return record[`${c}Grade`];
        return null;
    });

    // If any category is missing (null or undefined), achievement not possible
    if (grades.some(g => !g)) return null;

    const isAllS = grades.every(g => g === 'S');
    if (isAllS) return 'COMPLETE';

    const rankWeights = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0, '?': 0 };
    const isAllClear = grades.every(g => rankWeights[g] && rankWeights[g] >= 4); // >= A
    if (isAllClear) return 'CLEAR';

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
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        try {
            if (isInAppBrowser || isMobile) {
                // Use redirect for in-app browsers and mobile devices where popups are problematic
                await signInWithRedirect(auth, googleProvider);
            } else {
                // Use popup for desktop
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

const WorldMap = ({ onSelectNode, onViewJourney, onUltimateChallenge, onViewMistakeNotebook, onLogout, records = {} }) => {
    const [showGuide, setShowGuide] = useState(false);

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
                    <button onClick={onViewMistakeNotebook} className="text-red-400 hover:text-red-300 p-1 mb-6" title="錯題筆記本">
                        <Book size={20} />
                    </button>
                    <div className="flex flex-col gap-0.5 items-center">
                        <button onClick={onViewJourney} className="text-rpg-accent hover:text-white p-1" title="我的冒險旅程">
                            <Backpack size={20} />
                        </button>
                        <button onClick={onLogout} className="bg-[#1a1a1a] p-1.5 rounded-full border-2 border-[#333] hover:bg-red-900 transition-colors shadow-black shadow-sm" title="登出">
                            <LogOut size={14} color="#aaa" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]">
                {MAP_STRUCTURE.map((node, index) => {
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
                                                    <div className="w-6 h-6 border-2 border-gray-400 rounded bg-black/20" title="Complete all categories with A rank or higher"></div>
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
                                            </div>
                                        );
                                    })()}
                                    <ChevronRight className={isBoss ? 'text-red-500' : 'text-rpg-bg'} size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
                <div className="h-10"></div>
            </div>
        </div>
    );
};

// --- Helper for Rank Calculation (Supports new nested and legacy flat structure) ---
const calculateTotalRank = (record) => {
    if (!record) return { rank: '?', color: '#9ca3af' }; // Gray

    const weights = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const categories = ['vocab', 'equip', 'alchemy', 'scroll'];
    let sum = 0;

    categories.forEach(cat => {
        let grade = null;
        // New structure: record.vocab.grade
        if (record[cat] && typeof record[cat] === 'object' && record[cat].grade) {
            grade = record[cat].grade;
        }
        // Legacy structure: record.vocabGrade
        else if (record[`${cat}Grade`]) {
            grade = record[`${cat}Grade`];
        }

        if (grade && weights[grade]) {
            sum += weights[grade];
        }
    });

    // Formula: ceil(sum / 4)
    const avg = Math.ceil(sum / 4);

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

const JourneyMode = ({ onBack, onViewTrialLog, records = {} }) => {
    const [flippedCards, setFlippedCards] = useState({});
    const [showDashboard, setShowDashboard] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const toggleFlip = (id) => {
        playSound('click');
        setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getMiniIcon = (type) => {
        switch (type) {
            case 'vocab': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M2 12H22M2 12V6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V12M2 12V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V12" stroke="currentColor" strokeWidth="2" fill="none" /></svg>;
            case 'equip': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 4L14 12L12 14L4 6L6 4Z" stroke="currentColor" strokeWidth="2" fill="none" /></svg>;
            case 'alchemy': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M10 2H14V6L19 12V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V12L10 6V2Z" stroke="currentColor" strokeWidth="2" fill="none" /></svg>;
            case 'scroll': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M4 4H20V20H4V4Z" stroke="currentColor" strokeWidth="2" fill="none" /></svg>;
            default: return null;
        }
    };

    const getCategoryLabel = (type) => {
        switch (type) {
            case 'vocab': return '寶箱';
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
                    {/* Merge Unit and Boss cards */}
                    {[...Object.entries(LEVEL_INFO), ...Object.entries(BOSS_INFO)].map(([id, info]) => {
                        const isBoss = id.startsWith('b');
                        const record = records[id] || {};
                        const isUnlocked = Object.keys(record).length > 0;
                        const levelNum = isBoss ? id : parseInt(id);
                        const isFlipped = flippedCards[id] || false;
                        const totalRank = isBoss ? { rank: record.rank || '?', color: '#ccc' } : calculateTotalRank(record);
                        const lastPlayed = formatLastPlayed(record.lastPlayed || record.timestamp);

                        const categories = ['vocab', 'equip', 'alchemy', 'scroll'];

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
                                                        <span className="font-pixel text-xs text-green-400">CLEARS (A+)</span>
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

    // 將 mistakeStats 轉換為陣列並排序（按錯誤次數由多到少）
    const sortedMistakes = Object.entries(mistakeStats)
        .filter(([id, data]) => data.count > 0)
        .sort((a, b) => b[1].count - a[1].count);

    // 根據選擇的單元過濾錯題
    const filteredMistakes = selectedUnit === 'all'
        ? sortedMistakes
        : sortedMistakes.filter(([id, data]) => data.gameUnitId === parseInt(selectedUnit));

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
                        <span className="font-pixel text-lg text-red-400" style={{ textShadow: '0 0 5px rgba(255,0,0,0.5)' }}>
                            {totalMistakes}
                        </span>
                    </div>
                </div>
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

                {/* Unit 1 - 16 */}
                {Array.from({ length: 16 }, (_, i) => i + 1).map(unitNum => (
                    <button
                        key={unitNum}
                        onClick={() => setSelectedUnit(unitNum.toString())}
                        className={`px-3 py-1 font-pixel text-xs transition-colors flex-shrink-0 ${selectedUnit === unitNum.toString()
                            ? 'text-red-500 border-b-2 border-red-500'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        Unit {unitNum}
                    </button>
                ))}
            </div>

            {/* 錯題清單 - 可捲動 */}
            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
                {sortedMistakes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <CheckCircle size={64} className="text-green-500 opacity-50 mb-4" />
                        <p className="font-pixel text-gray-400 text-sm">尚無錯題記錄</p>
                        <p className="font-retro text-gray-600 text-xs mt-2">太棒了！繼續保持！</p>
                    </div>
                ) : filteredMistakes.length === 0 ? (
                    // 選擇了特定單元但該單元無錯題
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <CheckCircle size={64} className="text-green-500 opacity-50 mb-4" />
                        <p className="font-pixel text-gray-400 text-sm">本單元無戰敗紀錄</p>
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
                        清空紀錄
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
                        <h3 className="font-pixel text-lg text-white mb-2">確定要清空嗎?</h3>
                        <p className="font-retro text-sm text-gray-400 mb-6">此操作無法復原</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="bg-gray-700 border-2 border-gray-500 px-4 py-2 font-pixel text-sm text-white hover:bg-gray-600"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => { setShowConfirm(false); onClearMistakes(); }}
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

const ChallengeSetup = ({ onBack, onStart }) => {
    const [selectedUnits, setSelectedUnits] = useState([]);

    const toggleUnit = (id) => {
        if (selectedUnits.includes(id)) {
            setSelectedUnits(selectedUnits.filter(uid => uid !== id));
        } else {
            setSelectedUnits([...selectedUnits, id]);
        }
    };

    const toggleAll = () => {
        if (selectedUnits.length === 16) {
            setSelectedUnits([]);
        } else {
            setSelectedUnits(Array.from({ length: 16 }, (_, i) => (i + 1).toString()));
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1a0f2e]">
            <div className="bg-black/50 p-4 border-b-4 border-rpg-border flex items-center justify-between z-10">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <h2 className="font-pixel text-white text-lg text-shadow text-red-500">終極試煉</h2>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <div className="flex justify-between items-center mb-4 bg-black/40 p-2 rounded border border-gray-600 backdrop-blur-sm sticky top-0 z-10">
                    <p className="font-retro text-gray-300 text-sm">選擇試煉範圍：<span className="text-rpg-secondary">{selectedUnits.length}</span> 章</p>
                    <button onClick={() => { playSound('click'); toggleAll(); }} className="text-xs font-pixel text-white bg-rpg-primary px-2 py-1 border-2 border-white hover:bg-red-400">
                        {selectedUnits.length === 16 ? "取消全選" : "全選"}
                    </button>
                </div>

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

const UnitHub = ({ unitId, onBack, onSelectCategory }) => {
    const categories = [
        { id: 'vocab', label: '單字寶箱', icon: <PixelArt.Chest />, color: 'primary', desc: 'LOOT WORDS' },
        { id: 'collocation', label: '搭配裝備', icon: <PixelArt.SwordShield />, color: 'secondary', desc: 'EQUIPMENT' },
        { id: 'polysemy', label: '多義藥水', icon: <PixelArt.Potion />, color: 'accent', desc: 'ALCHEMY' },
        { id: 'sentences', label: '片語捲軸', icon: <PixelArt.Scroll />, color: 'success', desc: 'ANCIENT SCROLL' },
    ];

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
                <div className="font-pixel text-center text-gray-400 text-xs mb-2">- SELECT YOUR LOOT -</div>
                {categories.map(cat => (
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

const StudyMode = ({ unitId, categoryId, data, onBack, onStartQuiz }) => {
    const [viewMode, setViewMode] = useState('card');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const studyData = data[categoryId] || [];

    const catTitles = { vocab: 'TREASURE', collocation: 'ARMORY', polysemy: 'ALCHEMY', sentences: 'SCROLLS' };
    const currentItem = studyData[currentIndex];
    const handleNext = () => { setIsFlipped(false); setCurrentIndex((p) => (p + 1) % studyData.length); };
    const handlePrev = () => { setIsFlipped(false); setCurrentIndex((p) => (p - 1 + studyData.length) % studyData.length); };
    const handleSpeak = (e, text) => { e.stopPropagation(); speakText(text); };

    return (
        <div className="flex flex-col h-full bg-rpg-bg overflow-hidden">
            {/* Header Bar */}
            <div className="flex items-center justify-between p-2 bg-black/50 border-b-2 border-rpg-border flex-shrink-0">
                <RPGButton onClick={onStartQuiz} color="primary" className="gap-1 animate-pulse"><Sword size={14} /> FIGHT</RPGButton>
                <div className="text-white font-pixel text-xs">{catTitles[categoryId]}</div>
                <button
                    onClick={() => { playSound('click'); setViewMode(m => m === 'card' ? 'list' : 'card'); }}
                    className="text-rpg-panel hover:text-white flex items-center gap-1"
                    title={viewMode === 'card' ? '切換為列表模式' : '切換為卡片模式'}
                >
                    <span className="font-pixel text-[8px] opacity-70">{viewMode === 'card' ? 'LIST' : 'CARD'}</span>
                    {viewMode === 'card' ? <List size={20} /> : <Grid size={20} />}
                </button>
            </div>
            {/* Back Button */}
            <div className="absolute top-20 left-2 z-20">
                <button onClick={() => { playSound('click'); onBack(); }} className="bg-black/50 p-2 rounded-full text-white hover:bg-red-500"><ArrowLeft size={16} /></button>
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
        </div>
    );
};

const BattleMode = ({ quizData, isBoss, isChallenge = false, onComplete, onFlee, currentRecord = null }) => {
    // 終極試煉直接開始，BOSS 和一般關卡顯示 menu
    const [status, setStatus] = useState(isChallenge ? 'playing' : 'menu');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [score, setScore] = useState(0);
    const [hp, setHp] = useState(3);
    const [feedback, setFeedback] = useState(null);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [battleLog, setBattleLog] = useState([]); // 戰鬥回顧記錄
    const [isSubmitting, setIsSubmitting] = useState(false); // 防止重复提交

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
        // If more than 20, take 20. If <= 20, take all of them.
        const limit = generatedQuestions.length > 20 ? 20 : generatedQuestions.length;
        setQuestions(shuffleArray(generatedQuestions).slice(0, limit));
    }, [quizData, isBoss]);

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
            targetUnit: currentQ.target.unit
        }]);
        setHp(h => h - 1);
        setFeedback('miss');
        nextQuestion(hp <= 1);
    };

    const handleAnswer = (selectedOption) => {
        if (feedback) return;
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
            targetUnit: currentQ.target.unit
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

        if (normalized >= 900) return { rank: 'S', color: 'text-yellow-400', bg: 'bg-yellow-400', title: 'LEGENDARY!' };
        if (normalized >= 800) return { rank: 'A', color: 'text-orange-500', bg: 'bg-orange-500', title: 'EXCELLENT!' };
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
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-4 bg-black/90">
                {isBoss ? <div className="animate-pulse"><PixelArt.MonsterBat /></div> : <PixelArt.MonsterSlime />}
                <h2 className="font-pixel text-xl text-white leading-loose">{isBoss ? "BOSS BATTLE" : "MONSTER APPEARS"}<br /><span className="text-xs text-gray-400">{questions.length} Questions. 7 Seconds.</span></h2>

                {/* Boss Progress Checkboxes */}
                {isBoss && (
                    <div className="flex flex-col items-center gap-2 mb-2">
                        <div className="flex gap-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`w-8 h-8 border-4 ${i < filledCount ? 'bg-green-500 border-green-700' : 'bg-gray-800 border-gray-600'} flex items-center justify-center`}>
                                    {i < filledCount && <span className="text-white font-pixel">✔</span>}
                                </div>
                            ))}
                        </div>
                        <span className="font-pixel text-[10px] text-gray-400">CLEAR 5 TIMES (RANK A+) TO UNLOCK</span>
                    </div>
                )}

                <RPGButton onClick={() => setStatus('playing')} color="primary" className="text-lg px-8 py-4">FIGHT!</RPGButton>
                <button onClick={onFlee} className="text-gray-500 font-pixel text-xs hover:text-white mt-4">RUN AWAY</button>
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
                                {ranks.map(r => (
                                    <div key={r.label} className={`flex justify-between ${r.color} ${rankData.rank === r.label ? 'bg-white/20 px-1 rounded' : ''}`}>
                                        <span>RANK {r.label}</span>
                                        <span>{r.min}+</span>
                                    </div>
                                ))}
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
                    <RPGButton
                        onClick={() => {
                            if (isSubmitting) return; // 如果正在提交，直接返回
                            setIsSubmitting(true); // 设置为提交中
                            onComplete({ score, rank: rankData.rank, battleLog });
                        }}
                        disabled={isSubmitting}
                        color="neutral"
                        className="w-full py-3"
                    >
                        {isSubmitting ? 'SAVING...' : 'CONTINUE'}
                    </RPGButton>
                </div>

                {/* Stamping Animation Logic for BOSS - Trigger only if we just hit 5 */}
                {(() => {
                    if (!isBoss || !currentRecord) return null;
                    const prevCount = currentRecord.successCount || 0;
                    const isSuccess = ['S', 'A'].includes(rankData.rank);
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
                        {[...Array(3)].map((_, i) => <Heart key={i} size={20} fill={i < hp ? "currentColor" : "none"} className={i < hp ? "animate-pulse" : "opacity-30"} />)}
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
                    <h3 className="text-rpg-panel font-retro text-2xl md:text-3xl mb-1 text-shadow tracking-wider">
                        {currentQ.mode === 'en-ch' ? currentQ.target.word : currentQ.target.chinese}
                    </h3>
                </div>

                {/* Feedback Overlay */}
                {feedback === 'hit' && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><span className="font-pixel text-6xl text-yellow-300 text-shadow animate-bounce-pixel drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">CRITICAL!</span></div>}
                {feedback === 'miss' && <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"><span className="font-pixel text-6xl text-red-500 text-shadow drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">MISS!</span></div>}

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

            {/* Options */}
            <div className="bg-black p-3 pb-6 border-t-4 border-rpg-border z-10">
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                    {currentQ.options.map((opt, i) => (
                        <button key={i} onClick={() => { playSound('click'); handleAnswer(opt); }} disabled={feedback !== null} className={`h-14 border-4 border-gray-600 bg-gray-800 text-white font-retro hover:bg-gray-700 active:translate-y-1 active:border-b-0 flex items-center justify-center text-center leading-tight px-2 transition-colors ${currentQ.mode === 'en-ch' ? 'text-lg' : 'text-xl'} ${feedback !== null && opt.id === currentQ.target.id ? 'bg-green-600 border-green-400' : ''} ${feedback === 'miss' && opt.id !== currentQ.target.id ? 'opacity-50' : ''}`}>
                            {currentQ.mode === 'en-ch' ? opt.chinese : opt.word}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [view, setView] = useState('login');
    const [userName, setUserName] = useState('');
    const [userData, setUserData] = useState(null); // { levelRecords: {}, ... }
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [challengeUnits, setChallengeUnits] = useState([]);

    // New State for Async Loading
    const [loading, setLoading] = useState(false);
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
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && view === 'login') {
                handleLogin(user);
            }
        });
        return () => unsubscribe();
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

        // ==========================================
        // 1. 【新增】計算平均準確率與練習次數 (修復 0% 問題)
        // ==========================================
        if (result.battleLog && result.battleLog.length > 0) {
            // 計算「這一場」的準確率
            const correctCount = result.battleLog.filter(log => log.isCorrect).length;
            const currentSessionAccuracy = (correctCount / result.battleLog.length) * 100;

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
        if (result.battleLog) {
            const wrongAnswers = result.battleLog.filter(log => !log.isCorrect);
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
                        const key = log.targetId;
                        const gameUnitId = (log.targetBook && log.targetUnit)
                            ? getGameUnitId(log.targetBook, log.targetUnit)
                            : null;

                        if (currentMistakeStats[key]) {
                            currentMistakeStats[key].count += 1;
                            if (gameUnitId !== null) currentMistakeStats[key].gameUnitId = gameUnitId;
                        } else {
                            currentMistakeStats[key] = {
                                count: 1,
                                word: log.targetWord || '',
                                chinese: log.targetChinese || '',
                                gameUnitId: gameUnitId
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
        if (selectedNode) {
            if (selectedNode.type === 'unit') {
                const levelId = selectedNode.id;
                const prevRecord = updatedUserData.levelRecords?.[levelId] || {};
                const categoryMap = { 'vocab': 'vocab', 'collocation': 'equip', 'polysemy': 'alchemy', 'sentences': 'scroll' };
                const catKey = categoryMap[selectedCategory || 'vocab'];

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

                if (['S', 'A'].includes(result.rank)) successCount += 1;
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
            }
        }

        // ==========================================
        // 4. 通用詳細歷史紀錄 (trialHistory)
        // ==========================================
        let historyUnitTitle = "";
        let historyType = "practice";

        if (view === 'challenge-quiz') {
            historyType = "quiz";
            historyUnitTitle = challengeUnits.map(unitId => {
                const info = LEVEL_INFO[unitId];
                return info ? `Level ${unitId < 10 ? '0' + unitId : unitId}: ${info.title}` : `Unit ${unitId}`;
            }).join(', ');
        } else if (selectedNode) {
            if (selectedNode.type === 'boss') {
                historyType = "quiz";
                historyUnitTitle = selectedNode.label || `BOSS ${selectedNode.id}`;
            } else {
                historyType = "practice";
                const unitId = selectedNode.id;
                const info = LEVEL_INFO[unitId];
                historyUnitTitle = info ? `Level ${unitId < 10 ? '0' + unitId : unitId}: ${info.title}` : `Unit ${unitId}`;
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
                units: view === 'challenge-quiz' ? challengeUnits : [selectedNode?.id]
            };

            const currentHistory = updatedUserData.trialHistory || [];
            const updatedHistory = [newTrialRecord, ...currentHistory].slice(0, 20);

            updatedUserData.trialHistory = updatedHistory;
            updatesForFirestore.trialHistory = updatedHistory;
        }

        // ==========================================
        // 5. 最終寫入
        // ==========================================
        setUserData(updatedUserData);
        setView('map');

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
        }

        if (node.type === 'boss') setView('quiz');
        else setView('unit-hub');
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

    // 清空錯題紀錄
    const handleClearMistakes = async () => {
        if (!auth.currentUser || !userData) return;
        try {
            // 更新本地狀態
            const updatedUserData = { ...userData, mistakeStats: {} };
            setUserData(updatedUserData);

            // 更新 Firestore
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                mistakeStats: {}
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

        // 一般單元模式 - 依據選擇的類別
        if (selectedNode.type === 'unit') {
            const content = levelDataCache[selectedNode.id] || GAME_DATA[selectedNode.id].content;
            const cat = selectedCategory || 'vocab';
            return content[cat];
        } else {
            // BOSS 模式 - 使用混合出題
            return getMixedQuizData(selectedNode.targetUnits);
        }
    };

    const renderContent = () => {
        // Show LoadingScreen if loading
        if (loading) return <LoadingScreen />;

        switch (view) {
            case 'login': return <LoginScreen onLogin={handleLogin} />;
            case 'map': return <WorldMap onLogout={handleLogout} onSelectNode={handleNodeSelect} onViewJourney={() => { playSound('click'); setView('journey'); }} onUltimateChallenge={() => { playSound('click'); setView('challenge-setup'); }} onViewMistakeNotebook={() => { playSound('click'); setView('mistake-notebook'); }} records={userData?.levelRecords} />;
            case 'mistake-notebook': return <MistakeNotebook onBack={() => { playSound('click'); setView('map'); }} mistakeStats={userData?.mistakeStats} onClearMistakes={handleClearMistakes} onRemoveMistake={handleRemoveMistake} />;
            case 'journey': return <JourneyMode onBack={() => { playSound('click'); setView('map'); }} onViewTrialLog={() => { playSound('click'); setView('trial-log'); }} records={userData?.levelRecords} />;
            case 'trial-log': return <TrialLogView onBack={() => { playSound('click'); setView('journey'); }} onRetry={() => { playSound('click'); setView('challenge-setup'); }} trialHistory={userData?.trialHistory} />;
            case 'challenge-setup': return <ChallengeSetup onBack={() => { playSound('click'); setView('map'); }} onStart={handleStartChallenge} />;
            case 'unit-hub': return <UnitHub unitId={selectedNode?.id} onBack={() => setView('map')} onSelectCategory={(cat) => { setSelectedCategory(cat); setView('study'); }} />;
            case 'study': return <StudyMode unitId={selectedNode?.id} categoryId={selectedCategory} data={levelDataCache[selectedNode?.id] || GAME_DATA[selectedNode?.id].content} onBack={() => setView('unit-hub')} onStartQuiz={handleForceQuiz} />;
            case 'quiz':
            case 'challenge-quiz':
                return <BattleMode quizData={getQuizData()} isBoss={selectedNode?.type === 'boss'} isChallenge={view === 'challenge-quiz'} onComplete={handleBattleComplete} onFlee={() => setView('map')} currentRecord={userData?.levelRecords?.[selectedNode?.id]} />;
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
