import React, { useState, useEffect, useRef } from 'react';
import {
    Sword, Shield, Scroll, Skull, Coins, Heart, Star, ChevronLeft, ChevronRight,
    Volume2, Map as MapIcon, RefreshCw, XCircle, CheckCircle,
    HelpCircle, Backpack, Gem, Flame, Skull as SkullIcon, Book, User,
    List, Grid, ArrowLeft, Lightbulb, MessageCircle, Clock, Award, ShieldCheck, Home, Lock, LogOut, Headphones, CalendarDays, Search
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, FieldPath } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth, googleProvider } from './config/firebase';
import { speakText, playSound, shuffleArray, playMusic, stopMusic, setMute, getMuteStatus, setVolume, unlockAudio, getTtsPilotVoice, setTtsPilotVoice } from './utils/audio';
import { getTtsAudio } from './constants/ttsAudioData';
import TeacherDashboard from './components/TeacherDashboard.jsx';
import { TRIVIA_CARDS, TRIVIA_CATEGORIES, TRIVIA_GROUPS, TRIVIA_LEGACY_ID_MAP, TRIVIA_SOURCES } from './constants/triviaData';
import { hasAmbiguousTranslation, needsEnglishPrompt } from './constants/quizOptionRules';
import { getBattleTimerSnapshot } from './utils/battle-timer';
import phraseLibrary from './data/phraseLibrary.json';
import {
    PHRASE_CLEAR_TARGET,
    PHRASE_QUESTION_LIMIT,
    addPhraseAttempt,
    buildPhraseQuestions,
    getPhraseGrade,
    normalizePhraseProgress,
    selectSmartPhrases
} from './utils/phrase-library';
import {
    ARENA_TIER_ACTIVATION_WEEK_START,
    ARENA_TIERS,
    getArenaTier,
    normalizeArenaTierProgress,
    settleArenaTier
} from './utils/arena-tiers';
import {
    assignWeeklyArenaGroup,
    ensureWeeklyArenaGroupSimulation,
    fetchWeeklyArenaGroup
} from './utils/arena-group-service';
import {
    buildSharedArenaEntries,
    getSharedArenaStanding,
    sortArenaLeaderboard
} from './utils/arena-leaderboard';
import {
    fillArenaGroupForDisplay,
    maskArenaName as maskStudentName
} from './utils/arena-simulations';

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
    Scroll: ({ className = 'w-16 h-16 drop-shadow-md' }) => (
        <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
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
            const categoryStr = String(data.category);
            const item = {
                id: doc.id,
                word: data.word || data.phrase || '',
                chinese: data.chinese || '',
                part: data.pos || data.part || '',  // 支援新的 pos 欄位和舊的 part 欄位
                sentence: data.example || data.sentence || '',
                sentence_ch: data.sentence_ch || '',
                book: data.book || mapping.book,
                unit: data.unit || mapping.unit,
                category: categoryStr,
                audioScope: String(levelId)
            };
            const withAudio = (audioItem) => ({ ...audioItem, audio: getTtsAudio(audioItem) });

            if (categoryStr.includes("1") || categoryStr.includes("單字")) {
                categories.vocab.push(withAudio(item));
            } else if (categoryStr.includes("2") || categoryStr.includes("搭配字")) {
                // 搭配裝備：顯示完整片語，不是基礎動詞
                categories.collocation.push(withAudio({ ...item, word: data.phrase || data.word || '' }));
            } else if (categoryStr.includes("4") || categoryStr.includes("一字多義")) {
                // 支援 details 欄位、definitions[] 陣列格式和舊的單一 chinese 欄位
                let chineseStr = data.chinese || '';
                if (!chineseStr && data.details) {
                    chineseStr = data.details;
                }
                if (!chineseStr && data.definitions && Array.isArray(data.definitions)) {
                    chineseStr = data.definitions.map(d => `[${d.pos}] ${d.mean}`).join(' / ');
                }
                categories.polysemy.push(withAudio({
                    id: doc.id,
                    word: data.word,
                    chinese: chineseStr,
                    part: data.pos || data.part || '',
                    definitions: data.definitions || [],
                    book: data.book || mapping.book,
                    unit: data.unit || mapping.unit,
                    category: categoryStr,
                    audioScope: String(levelId)
                }));
            } else if (categoryStr.includes("3") || categoryStr.includes("片語") || categoryStr.includes("佳句")) {
                categories.sentences.push(withAudio(item));
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
const ADV_LESSONS_PER_SECTION = 10; // 進階地圖、旅程與終極試煉每 10 課一卷
const ADV_CLEARS_TO_COMPLETE = 3;   // 通關 3 次才算完成
const ADV_QUIZ_QUESTION_LIMIT = 10; // 進階課每次隨機抽最多 10 題
const ADV_PASSING_GRADES = ['S', 'A', 'B'];
const ADV_GRADE_ORDER = { B: 1, A: 2, S: 3 };
const BOSS_CLEAR_GRADES = ['S', 'A', 'B'];
const BOSS_CLEARS_REQUIRED = 5;

const PHRASE_PARTS = phraseLibrary.parts || [];
const PHRASE_GROUPS = PHRASE_PARTS.flatMap(part => part.groups || []);
const PHRASE_GROUP_BY_ID = new Map(PHRASE_GROUPS.map(group => [group.id, group]));
const PHRASE_PART_BY_ID = new Map(PHRASE_PARTS.map(part => [part.id, part]));
const withPhraseAudio = phrase => ({
    ...phrase,
    series: 'phrases',
    category: 'phrases',
    audioScope: `phrase_${phrase.groupId}`,
    audio: getTtsAudio(phrase)
});

const isPhraseChallengeSelection = (groupIds = []) => (
    groupIds.length > 0 && groupIds.every(groupId => PHRASE_GROUP_BY_ID.has(groupId))
);

const getPhraseChallengeData = (groupIds = []) => {
    const selectedPhrases = groupIds.flatMap(groupId => {
        const group = PHRASE_GROUP_BY_ID.get(groupId);
        return (group?.phrases || []).map(phrase => withPhraseAudio({
            ...phrase,
            groupTitle: group.title
        }));
    });
    return shuffleArray(selectedPhrases).slice(0, 20);
};

const getPhraseChallengeOptionPool = (groupIds = []) => {
    const partIds = new Set(groupIds
        .map(groupId => PHRASE_GROUP_BY_ID.get(groupId)?.partId)
        .filter(Boolean));
    return [...partIds].flatMap(partId => {
        const part = PHRASE_PART_BY_ID.get(partId);
        return (part?.groups || []).flatMap(group => group.phrases.map(phrase => withPhraseAudio({
            ...phrase,
            groupTitle: group.title
        })));
    });
};

const advLessonId = (lesson) => `adv_${lesson}`;
const getAdvancedQualifiedClears = (record = {}) => Math.max(
    0,
    Number(record.bPlusClears ?? record.clears) || 0
);
const getAdvancedStarGrades = (record = {}) => {
    const storedGrades = Array.isArray(record.starGrades)
        ? record.starGrades.filter(grade => ADV_PASSING_GRADES.includes(grade))
        : [];
    if (storedGrades.length > 0) {
        return [...storedGrades]
            .sort((a, b) => ADV_GRADE_ORDER[b] - ADV_GRADE_ORDER[a])
            .slice(0, ADV_CLEARS_TO_COMPLETE);
    }

    const legacyCount = Math.min(getAdvancedQualifiedClears(record), ADV_CLEARS_TO_COMPLETE);
    if (legacyCount <= 0) return [];
    const legacyGrades = Array.from({ length: legacyCount }, () => 'B');
    if (ADV_PASSING_GRADES.includes(record.bestGrade)) {
        legacyGrades[legacyGrades.length - 1] = record.bestGrade;
    }
    return legacyGrades.sort((a, b) => ADV_GRADE_ORDER[b] - ADV_GRADE_ORDER[a]);
};
const addAdvancedStarGrade = (record = {}, grade) => {
    const grades = getAdvancedStarGrades(record);
    if (!ADV_PASSING_GRADES.includes(grade)) return grades;

    if (grades.length < ADV_CLEARS_TO_COMPLETE) {
        return [...grades, grade]
            .sort((a, b) => ADV_GRADE_ORDER[b] - ADV_GRADE_ORDER[a]);
    }

    const worstGrade = grades[grades.length - 1];
    if (ADV_GRADE_ORDER[grade] <= ADV_GRADE_ORDER[worstGrade]) return grades;

    return [...grades.slice(0, -1), grade]
        .sort((a, b) => ADV_GRADE_ORDER[b] - ADV_GRADE_ORDER[a]);
};

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
            const item = {
                id: docSnap.id,
                word: data.word || '',
                chinese: data.chinese || '',
                part: data.pos || data.part || '',
                sentence: data.example || data.sentence || '',
                sentence_ch: data.sentence_ch || '',
                series: 'advanced',
                lesson,
                category: 'advanced',
                audioScope: `adv_${lesson}`
            };
            vocab.push({ ...item, audio: getTtsAudio(item) });
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

const RPGButton = ({ children, onClick, color = "primary", className = "", disabled = false, active = false, silent = false, type = "button", ...buttonProps }) => {
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
        <button {...buttonProps} type={type} onClick={(e) => { e.stopPropagation(); if (!disabled) { if (!silent) playSound('click'); onClick?.(e); } }} disabled={disabled} className={`border-2 border-black relative px-3 py-2 font-pixel text-xs sm:text-sm uppercase tracking-wide ${colors[color] || colors.neutral} ${activeStyle} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-transform active:translate-y-1 ${className}`}>
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
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[150] backdrop-blur-sm animate-in fade-in p-3 overflow-y-auto" onClick={onClose}>
        <div className="bg-slate-900 border-4 border-yellow-500/50 p-4 sm:p-6 rounded-xl shadow-2xl w-96 max-w-full max-h-full overflow-y-auto relative my-auto" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors"><XCircle size={24} /></button>
            <h3 className="font-pixel text-xl text-yellow-400 mb-4 text-center flex items-center justify-center gap-2">
                <Award size={24} /> 成就獲得指南
            </h3>

            <div className="space-y-3 font-retro text-sm text-gray-300">
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
                            <span>累計獲勝 <span className="text-white font-bold">{BOSS_CLEARS_REQUIRED} 次</span> (需 B 級以上)。</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-purple-300 font-bold min-w-[4rem]">進階課程:</span>
                            <span>取得 <span className="text-cyan-300 font-bold">B 級以上</span>才算通關，累積 3 次完成一課。</span>
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
                            <span>累計獲勝 <span className="text-white font-bold">{BOSS_CLEARS_REQUIRED} 次</span> (需 S 級)。</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-4 text-center">
                <RPGButton onClick={onClose} color="primary" className="w-full py-3">了解！</RPGButton>
            </div>
        </div>
    </div>
);

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ARENA_RIVAL_LIMIT = 7;
const ARENA_RETAINED_REAL_LIMIT = 5;
const ARENA_RESULT_VERSION = 1;
const ARENA_RANK_REWARD_COUNTS = { 1: 2, 2: 1, 3: 1 };
const ADVENTURE_MILESTONES = [3, 7, 14, 30, 60, 100, 150, 200, 365];
const CORRECT_WORD_MILESTONES = [50, 150, 500, 1000, 2000, 3000];
const LEGACY_WORD_MILESTONES = [50, 100, 250, 500, 1000];
const CHECK_IN_GRADES = ['B', 'A', 'S'];

const getArenaTierStyle = tierId => {
    const tier = getArenaTier(tierId);
    return {
        '--arena-primary': tier.colors.primary,
        '--arena-secondary': tier.colors.secondary,
        '--arena-glow': tier.colors.glow
    };
};

const ArenaTierEmblem = ({ tier: tierId }) => {
    const tier = getArenaTier(tierId);
    const tierIndex = ARENA_TIERS.findIndex(item => item.id === tier.id);
    const isMetalTier = ['bronze', 'silver', 'gold', 'platinum'].includes(tier.id);
    const rankMarks = Math.max(1, Math.min(4, tierIndex - 2));

    return (
        <span className="arena-tier-emblem" data-tier-emblem={tier.id}>
            <svg viewBox="0 0 72 80" role="presentation" focusable="false">
                {tier.id === 'warlord' && (
                    <>
                        <path className="arena-emblem-wing" d="M16 27 3 20l6 14-7 5 17 5M56 27l13-7-6 14 7 5-17 5" />
                        <path className="arena-emblem-crown" d="m20 18 5-12 11 9L47 6l5 12-6 6H26Z" />
                    </>
                )}
                {tier.id === 'diamond' ? (
                    <>
                        <path className="arena-emblem-diamond" d="m36 3 27 21-9 38-18 15-18-15-9-38Z" />
                        <path className="arena-emblem-diamond-inner" d="m36 10 17 17-6 29-11 12-11-12-6-29Z" />
                        <path className="arena-emblem-facet" d="m19 27 17 9 17-9M25 56l11-20 11 20M36 10v26" />
                    </>
                ) : (
                    <>
                        <path className="arena-emblem-shadow" d="M36 3 62 14v25c0 18-11 30-26 38C21 69 10 57 10 39V14Z" />
                        <path className="arena-emblem-shield" d="M36 6 58 16v22c0 15-9 26-22 34-13-8-22-19-22-34V16Z" />
                        <path className="arena-emblem-inner" d="M36 13 51 20v17c0 11-6 20-15 27-9-7-15-16-15-27V20Z" />
                    </>
                )}

                {tier.id === 'unranked' && (
                    <path className="arena-emblem-unranked" d="M27 28c1-7 16-8 18 0 2 8-9 8-9 15M36 51v2" />
                )}
                {tier.id === 'wood' && (
                    <>
                        <path className="arena-emblem-detail" d="M27 18c8 7-4 12 4 19s-3 14 3 24M44 18c-7 6 2 11-4 17s2 12-2 24" />
                        <path className="arena-emblem-detail" d="M23 31h8M41 45h8" />
                    </>
                )}
                {tier.id === 'stone' && (
                    <>
                        <path className="arena-emblem-detail" d="m22 22 14 13 15-12M36 35l-7 26M36 35l8 25M22 43l7 18M51 42l-7 18" />
                        <circle className="arena-emblem-rivet" cx="36" cy="35" r="3" />
                    </>
                )}
                {isMetalTier && (
                    <>
                        <path className="arena-emblem-blade" d="m27 47 18-22 3-5-5 3-19 21Z" />
                        <path className="arena-emblem-blade" d="m45 47-18-22-3-5 5 3 19 21Z" />
                        <path className="arena-emblem-detail" d="M24 48h24" />
                        {Array.from({ length: rankMarks }, (_, index) => (
                            <path
                                key={index}
                                className="arena-emblem-rank-mark"
                                d={`m${30 + (index * 4)} 57 1.7 3.4 3.8.6-2.7 2.7.6 3.8-3.4-1.8-3.4 1.8.6-3.8-2.7-2.7 3.8-.6Z`}
                            />
                        ))}
                    </>
                )}
                {tier.id === 'warlord' && (
                    <>
                        <path className="arena-emblem-blade" d="m24 53 23-31 4-4-2 6-21 32Z" />
                        <path className="arena-emblem-blade" d="m48 53-23-31-4-4 2 6 21 32Z" />
                        <path className="arena-emblem-flame" d="M36 24c9 9 9 17 0 25-9-8-9-16 0-25Zm0 8c-3 4-3 7 0 10 3-3 3-6 0-10Z" />
                    </>
                )}
                <path className="arena-emblem-highlight" d="M23 20 36 14" />
            </svg>
            <span className="arena-tier-emblem-glyph">{tier.badge}</span>
        </span>
    );
};

const ArenaTierBadge = ({ tier: tierId, size = 'md', showLabel = true, className = '' }) => {
    const tier = getArenaTier(tierId);
    return (
        <span
            className={`arena-tier-badge arena-tier-badge-${size} ${className}`}
            data-arena-frame={tier.frame}
            style={getArenaTierStyle(tier.id)}
            aria-label={`競技場階級：${tier.shortLabel}`}
        >
            <span className="arena-tier-badge-mark" aria-hidden="true">
                <ArenaTierEmblem tier={tier.id} />
            </span>
            {showLabel && <span className="arena-tier-badge-label">{tier.shortLabel}</span>}
        </span>
    );
};

const ArenaTierGuide = ({ currentTierId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentTier = getArenaTier(currentTierId);
    const formalTiers = ARENA_TIERS.filter(tier => tier.id !== 'unranked');
    const currentFormalIndex = formalTiers.findIndex(tier => tier.id === currentTier.id);
    const nextTier = currentFormalIndex >= 0 && currentFormalIndex < formalTiers.length - 1
        ? formalTiers[currentFormalIndex + 1]
        : null;
    const summary = currentTier.id === 'unranked'
        ? '完成一週競技，結算後從木牌開始'
        : nextTier
            ? `目前 ${currentTier.shortLabel} · 下一階 ${nextTier.shortLabel}`
            : '你已抵達最高排位：戰神';

    return (
        <section className={`arena-tier-guide ${isOpen ? 'is-open' : ''}`}>
            <button
                type="button"
                onClick={() => setIsOpen(open => !open)}
                className="arena-tier-guide-toggle"
                aria-expanded={isOpen}
                aria-controls="arena-tier-guide-content"
            >
                <span className="arena-tier-guide-icon" aria-hidden="true"><HelpCircle size={17} /></span>
                <span className="min-w-0 flex-1 text-left">
                    <span className="block font-pixel text-[10px] text-yellow-200">排位指南</span>
                    <span className="block font-retro text-[11px] text-gray-300 mt-1 truncate">{summary}</span>
                </span>
                <span className="font-retro text-[10px] text-cyan-200">{isOpen ? '收起' : '查看全部'}</span>
                <ChevronRight size={16} className={`arena-tier-guide-chevron ${isOpen ? 'is-open' : ''}`} aria-hidden="true" />
            </button>

            {isOpen && (
                <div id="arena-tier-guide-content" className="arena-tier-guide-content">
                    <div className="flex items-end justify-between gap-3 mb-3">
                        <div>
                            <h3 className="font-pixel text-[10px] text-yellow-200">全部排位</h3>
                            <p className="font-retro text-[10px] text-gray-400 mt-1">由低到高，共 8 個正式排位</p>
                        </div>
                        <span className="font-retro text-[9px] text-gray-500">每週最多移動一階</span>
                    </div>

                    <ol className="arena-tier-ladder" aria-label="英雄競技場排位由低到高">
                        {formalTiers.map((tier, index) => {
                            const isCurrent = tier.id === currentTier.id;
                            const isReached = currentFormalIndex >= index;
                            return (
                                <li
                                    key={tier.id}
                                    className={`arena-tier-ladder-item ${isCurrent ? 'is-current' : ''} ${isReached ? 'is-reached' : ''}`}
                                    data-arena-frame={tier.frame}
                                    style={getArenaTierStyle(tier.id)}
                                    aria-current={isCurrent ? 'step' : undefined}
                                >
                                    <span className="font-pixel text-[8px] text-gray-500">{index + 1}</span>
                                    <ArenaTierBadge tier={tier.id} size="sm" showLabel={false} />
                                    <span className="font-retro text-[11px] arena-tier-text">{tier.shortLabel}</span>
                                    {isCurrent && <span className="arena-tier-current-label">目前</span>}
                                </li>
                            );
                        })}
                    </ol>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                        <div className="arena-tier-rule-card is-promote">
                            <div className="font-pixel text-[10px]">↑ 升一階</div>
                            <div className="font-retro text-xs mt-2">每週小隊第 1～2 名</div>
                        </div>
                        <div className="arena-tier-rule-card is-hold">
                            <div className="font-pixel text-[10px]">— 維持</div>
                            <div className="font-retro text-xs mt-2">每週小隊第 3～6 名</div>
                        </div>
                        <div className="arena-tier-rule-card is-demote">
                            <div className="font-pixel text-[10px]">↓ 降一階</div>
                            <div className="font-retro text-xs mt-2">每週小隊第 7～8 名</div>
                        </div>
                    </div>

                    <div className="arena-tier-guide-notes font-retro text-[11px] text-gray-300">
                        <p><span className="text-yellow-200">首次定級：</span>一週內完成至少一場挑戰，週結算後成為木牌。</p>
                        <p><span className="text-cyan-200">未參賽保護：</span>第一週未參賽會保留排位；連續第二週起，每週降一階。</p>
                        <p><span className="text-purple-200">上下限：</span>木牌不會再降，戰神也不會再升；歷史最高排位不會因降階而消失。</p>
                    </div>
                </div>
            )}
        </section>
    );
};

const getArenaTierOutcomeText = data => {
    if (!data?.tierOutcome) return null;
    const before = getArenaTier(data.tierBefore);
    const after = getArenaTier(data.tierAfter);
    switch (data.tierOutcome) {
        case 'placement':
            return { title: `首次定級：${after.label}`, detail: '歡迎加入英雄競技場聯賽！' };
        case 'promoted':
            return { title: `${before.label} → ${after.label}`, detail: '成功升階！' };
        case 'demoted':
        case 'inactive-demoted':
            return { title: `${before.label} → ${after.label}`, detail: '下週再戰！' };
        case 'inactive-hold':
            return { title: `維持 ${after.label}`, detail: '本週未參賽，階級暫時保留。' };
        case 'unranked':
            return { title: '尚未定級', detail: '完成一週競技即可取得第一面牌位。' };
        default:
            return { title: `維持 ${after.label}`, detail: '本週階級維持不變。' };
    }
};

const ArenaTierResult = ({ data, className = '' }) => {
    const outcome = getArenaTierOutcomeText(data);
    if (!outcome) return null;
    return (
        <div
            className={`arena-tier-result ${className}`}
            data-arena-frame={getArenaTier(data.tierAfter).frame}
            style={getArenaTierStyle(data.tierAfter)}
        >
            <ArenaTierBadge tier={data.tierAfter} size="sm" showLabel={false} />
            <div className="min-w-0 text-left">
                <div className="font-pixel text-[10px] arena-tier-text">{outcome.title}</div>
                <div className="font-retro text-xs text-gray-300 mt-1">{outcome.detail}</div>
            </div>
        </div>
    );
};

const ArenaTierPreviewLab = () => {
    const previewParams = new URLSearchParams(window.location.search);
    const requestedTier = previewParams.get('tier');
    const initialTier = ARENA_TIERS.some(tier => tier.id === requestedTier)
        ? requestedTier
        : 'gold';
    const [selectedTierId, setSelectedTierId] = useState(initialTier);
    const selectedTier = getArenaTier(selectedTierId);
    const selectedTierIndex = ARENA_TIERS.findIndex(tier => tier.id === selectedTierId);
    const previousTier = ARENA_TIERS[Math.max(0, selectedTierIndex - 1)];
    const resultPreview = selectedTierId === 'unranked'
        ? {
            tierBefore: 'unranked',
            tierAfter: 'unranked',
            tierOutcome: 'unranked'
        }
        : {
            tierBefore: previousTier.id,
            tierAfter: selectedTierId,
            tierOutcome: selectedTierId === 'wood' ? 'placement' : 'promoted'
        };

    const selectTier = tierId => {
        setSelectedTierId(tierId);
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('tier', tierId);
        window.history.replaceState({}, '', nextUrl);
    };

    return (
        <div className="arena-preview-lab min-h-screen text-white p-3 sm:p-6">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <div className="font-pixel text-[10px] text-rpg-primary mb-2">ARENA VISUAL TEST</div>
                        <h1 className="font-display text-2xl sm:text-3xl text-yellow-300">英雄競技場 · 牌位畫面測試室</h1>
                        <p className="font-retro text-sm text-gray-300 mt-2">
                            只顯示測試資料，不登入、不讀取也不寫入學生資料。
                        </p>
                    </div>
                    <a
                        href="/"
                        className="self-start sm:self-auto border-2 border-gray-500 bg-gray-900 px-3 py-2 font-pixel text-[9px] hover:border-white"
                    >
                        返回登入頁
                    </a>
                </header>

                <section className="bg-black/35 border-2 border-gray-700 p-3 mb-4">
                    <div className="font-pixel text-[9px] text-gray-400 mb-3">選擇要測試的牌位</div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                        {ARENA_TIERS.map(tier => (
                            <button
                                key={tier.id}
                                type="button"
                                aria-pressed={tier.id === selectedTierId}
                                onClick={() => selectTier(tier.id)}
                                className={`arena-preview-tier-button ${tier.id === selectedTierId ? 'is-active' : ''}`}
                                style={getArenaTierStyle(tier.id)}
                            >
                                <ArenaTierBadge tier={tier.id} size="sm" />
                            </button>
                        ))}
                    </div>
                </section>

                <div
                    className="arena-tier-shell overflow-hidden"
                    data-arena-frame={selectedTier.frame}
                    data-preview-tier={selectedTier.id}
                    style={getArenaTierStyle(selectedTier.id)}
                >
                    <div className="arena-tier-header flex items-center justify-between gap-2 border-b-4 p-3">
                        <div className="min-w-0">
                            <div className="font-pixel text-[9px] text-gray-400">WEEKLY REPORT</div>
                            <div className="font-display text-xl truncate">每週戰報</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <ArenaTierBadge tier={selectedTier.id} size="sm" />
                            <button type="button" aria-label="測試日曆按鈕" className="weekly-report-calendar-button p-2">
                                <CalendarDays size={18} />
                            </button>
                            <button type="button" aria-label="測試登出按鈕" className="border-2 border-gray-500 bg-black/40 p-2">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="p-3 sm:px-5 sm:pt-5">
                        <ArenaTierGuide currentTierId={selectedTier.id} />
                    </div>

                    <div className="px-3 pb-3 sm:px-5 sm:pb-5 grid lg:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <section className="arena-tier-feature border-2 p-4">
                                <div className="font-pixel text-[9px] text-gray-400">本週階級</div>
                                <div className="flex items-center gap-3 mt-3">
                                    <ArenaTierBadge tier={selectedTier.id} size="lg" showLabel={false} />
                                    <div>
                                        <div className="arena-tier-text font-display text-2xl">{selectedTier.shortLabel}</div>
                                        <div className="font-retro text-sm text-gray-300 mt-1">本週累積 8,640 分</div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <div className="font-pixel text-[9px] text-gray-400 mb-2">地圖右上角入口</div>
                                <div
                                    className="arena-tier-record-card p-3 flex items-center gap-3"
                                    data-arena-frame={selectedTier.frame}
                                    style={getArenaTierStyle(selectedTier.id)}
                                >
                                    <ArenaTierBadge tier={selectedTier.id} size="sm" showLabel={false} />
                                    <div className="min-w-0">
                                        <div className="font-pixel text-[9px] text-white">每週戰報</div>
                                        <div className="arena-tier-text font-retro text-xs mt-1">本週 {selectedTier.shortLabel}</div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <div className="font-pixel text-[9px] text-gray-400 mb-2">週結算</div>
                                <ArenaTierResult data={resultPreview} />
                            </section>

                            <section>
                                <div className="font-pixel text-[9px] text-gray-400 mb-2">我的冒險旅程</div>
                                <div
                                    className="arena-tier-record-card p-3 flex items-center gap-3"
                                    data-arena-frame={selectedTier.frame}
                                    style={getArenaTierStyle(selectedTier.id)}
                                >
                                    <ArenaTierBadge tier={selectedTier.id} size="lg" showLabel={false} />
                                    <div className="min-w-0">
                                        <div className="font-pixel text-[9px] text-gray-400">HIGHEST ARENA TIER</div>
                                        <div className="arena-tier-text font-pixel text-xs mt-2">
                                            歷史最高排位 · {selectedTier.shortLabel}
                                        </div>
                                        <div className="font-retro text-xs text-gray-300 mt-1">
                                            {selectedTier.id === 'unranked' ? '完成一週競技後即可定級' : '首次達成：2026/08/10'}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <section className="arena-tier-panel border-2 bg-black/25">
                            <div className="p-3 border-b border-white/15">
                                <div className="font-pixel text-[9px] text-gray-400">英雄競技場排行榜</div>
                                <div className="font-retro text-sm mt-2">同階級 8 人小組 · 測試資料</div>
                            </div>
                            {[
                                { rank: 1, name: '火○小宇', score: 10280 },
                                { rank: 2, name: '陳○鍾', score: 8640, me: true },
                                { rank: 3, name: '暴○布丁', score: 7320 },
                                { rank: 4, name: '小○勇者', score: 5980 }
                            ].map(player => (
                                <div
                                    key={player.rank}
                                    className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 px-3 py-3 border-b border-white/10 ${player.me ? 'arena-tier-self' : ''}`}
                                >
                                    <div className="font-pixel text-xs text-center">{player.rank}</div>
                                    <div className="min-w-0 flex items-center gap-2">
                                        {player.me && <ArenaTierBadge tier={selectedTier.id} size="sm" showLabel={false} />}
                                        <span className="font-retro text-sm truncate">
                                            {player.name}{player.me ? ` · 你 · ${selectedTier.shortLabel}` : ''}
                                        </span>
                                    </div>
                                    <div className="font-pixel text-[9px] text-yellow-300">{player.score.toLocaleString()}</div>
                                </div>
                            ))}
                            <div className="p-3 font-retro text-xs text-gray-400">
                                自己的列會套用目前牌位顏色；其他玩家保持中性，避免排行榜太花。
                            </div>
                        </section>
                    </div>
                </div>

                <section className="mt-5">
                    <div className="font-pixel text-[9px] text-gray-400 mb-3">九種牌位快速比較</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {ARENA_TIERS.map(tier => (
                            <div
                                key={tier.id}
                                className="arena-tier-record-card p-3 min-h-[5.5rem] flex items-center justify-center"
                                data-arena-frame={tier.frame}
                                style={getArenaTierStyle(tier.id)}
                            >
                                <ArenaTierBadge tier={tier.id} />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

const SIMULATED_ARENA_NAMES = [
    '功課失蹤中', '暴走布丁', '鯊魚吃泡麵', '今天不想睡', '火箭小宇',
    '冰龍隊長', '閃電皮蛋', '傳說小蝦米', '奶茶半糖', '作業等等我',
    '隔壁小恐龍', '會飛的地瓜', '鉛筆不見了', '睡過頭勇者', '章魚燒隊長',
    '泡麵加顆蛋', '月亮追著我', '小熊不冬眠', '企鵝跑超快', '香蕉魔法師',
    'MangoBoss', 'SleepyKevin', 'DinoLeo', 'AmyGoGo', 'CocoCat',
    'HappyJason', 'RocketMia', 'SuperAndy', 'TinyTiger', 'PandaEmma',
    'Leo_777', 'Kevin哈哈', '小宇超強', '安安出發', '樂樂衝第一',
    '阿哲等等我', '米米愛冒險', '小晴放大招', '宇宙小涵', '辰辰不認輸',
    '草莓騎士', '巧克力忍者', '雞塊守門員', '飛天小饅頭', '雲朵收藏家',
    '貓咪開坦克', '恐龍寫功課', '飯糰大魔王', '週末才上線', '猜猜我是誰'
];
const SIMULATED_PERSONAS = [
    { id: 'steady', scoreRange: [450, 1200], sessions: [1, 2], weights: [0.12, 0.13, 0.14, 0.14, 0.15, 0.16, 0.16] },
    { id: 'diligent', scoreRange: [800, 1800], sessions: [1, 2], weights: [0.14, 0.15, 0.16, 0.16, 0.16, 0.12, 0.11] },
    { id: 'casual', scoreRange: [300, 900], sessions: [1, 1], weights: [0, 0.18, 0, 0.22, 0.16, 0, 0.44] },
    { id: 'weekend', scoreRange: [600, 1500], sessions: [1, 3], weights: [0, 0, 0.08, 0.09, 0.15, 0.33, 0.35] },
    { id: 'burst', scoreRange: [900, 2000], sessions: [2, 3], weights: [0, 0, 0.35, 0, 0.1, 0, 0.55] }
];

const getTaipeiDateKey = (value = Date.now()) => {
    const date = new Date(value);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(date);
};

const getAdvancedMapVolumes = (totalLessons) => {
    const safeTotal = Math.max(0, Number(totalLessons) || 0);
    if (safeTotal === 0) return [];

    return Array.from({ length: Math.ceil(safeTotal / ADV_LESSONS_PER_SECTION) }, (_, index) => {
        const start = index * ADV_LESSONS_PER_SECTION + 1;
        const end = Math.min((index + 1) * ADV_LESSONS_PER_SECTION, safeTotal);
        return {
            index,
            start,
            end,
            lessons: Array.from({ length: end - start + 1 }, (__, offset) => start + offset)
        };
    });
};

const searchAdvancedWords = async (searchTerm) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return [];

    const variants = Array.from(new Set([
        trimmed,
        trimmed.toLowerCase(),
        trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase(),
        trimmed.toUpperCase()
    ]));
    const snapshots = await Promise.all(variants.map(word =>
        getDocs(query(collection(db, 'vocabulary'), where('word', '==', word)))
    ));
    const matches = new Map();

    snapshots.forEach(snapshot => {
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const lesson = Number(data.lesson);
            if (data.series !== 'advanced' || !Number.isFinite(lesson)) return;
            matches.set(docSnap.id, {
                id: docSnap.id,
                lesson,
                word: data.word || trimmed,
                chinese: data.chinese || '',
                part: data.pos || data.part || ''
            });
        });
    });

    return Array.from(matches.values()).sort((a, b) => a.lesson - b.lesson || a.word.localeCompare(b.word));
};

const AdvancedStars = ({ grades = [], count = 0, size = 'md', label }) => {
    const normalizedGrades = grades
        .filter(grade => ADV_PASSING_GRADES.includes(grade))
        .slice(0, ADV_CLEARS_TO_COMPLETE);
    const fallbackCount = Math.min(Math.max(Number(count) || 0, 0), ADV_CLEARS_TO_COMPLETE);
    const visibleGrades = normalizedGrades.length > 0
        ? normalizedGrades
        : Array.from({ length: fallbackCount }, () => 'B');
    const earned = visibleGrades.length;
    const sizeClass = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
    const gradeClass = {
        B: 'advanced-star-b',
        A: 'advanced-star-a',
        S: 'advanced-star-s'
    };

    return (
        <span
            className="advanced-stars inline-flex items-center justify-center gap-1"
            role="img"
            aria-label={label || `已取得 ${earned} 顆星，共 ${ADV_CLEARS_TO_COMPLETE} 顆`}
        >
            {Array.from({ length: ADV_CLEARS_TO_COMPLETE }, (_, index) => {
                const grade = visibleGrades[index];
                return (
                    <Star
                        key={index}
                        aria-hidden="true"
                        className={`${sizeClass} advanced-star ${grade ? gradeClass[grade] : 'advanced-star-empty'}`}
                    />
                );
            })}
        </span>
    );
};

const dateKeyToTaipeiDayNumber = (dateKey) => {
    const [year, month, day] = String(dateKey || '').split('-').map(Number);
    if (![year, month, day].every(Number.isFinite)) return null;
    return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
};

const getDateKeyGap = (fromKey, toKey) => {
    const from = dateKeyToTaipeiDayNumber(fromKey);
    const to = dateKeyToTaipeiDayNumber(toKey);
    return from === null || to === null ? null : to - from;
};

const buildTrackerFromDates = (dates = []) => {
    const uniqueDates = [...new Set(dates.filter(Boolean))].sort();
    let bestStreak = 0;
    let runningStreak = 0;
    let previous = null;
    uniqueDates.forEach(dateKey => {
        const gap = previous ? getDateKeyGap(previous, dateKey) : null;
        runningStreak = gap === 1 ? runningStreak + 1 : 1;
        bestStreak = Math.max(bestStreak, runningStreak);
        previous = dateKey;
    });
    return {
        totalDays: uniqueDates.length,
        currentStreak: runningStreak,
        bestStreak,
        lastDate: uniqueDates[uniqueDates.length - 1] || null,
        dates: uniqueDates
    };
};

const addTrackerDay = (tracker = {}, dateKey = getTaipeiDateKey()) => {
    const priorDates = tracker.dates || [];
    const wasKnown = priorDates.includes(dateKey);
    const dates = [...new Set([...priorDates, dateKey])].sort();
    if (tracker.lastDate === dateKey) return { ...tracker, dates, changed: false };
    const gap = getDateKeyGap(tracker.lastDate, dateKey);
    const currentStreak = gap === 1 ? (tracker.currentStreak || 0) + 1 : 1;
    return {
        ...tracker,
        totalDays: Math.max(Number(tracker.totalDays) || 0, priorDates.length) + (wasKnown ? 0 : 1),
        currentStreak,
        bestStreak: Math.max(Number(tracker.bestStreak) || 0, currentStreak),
        lastDate: dateKey,
        dates,
        changed: true
    };
};

const stripTrackerFlag = ({ changed, ...tracker }) => tracker;

const countUniqueSLevels = (records = {}) => Object.values(records).filter(record => {
    if (!record || typeof record !== 'object') return false;
    if (record.bestGrade === 'S' || record.rank === 'S' || (Number(record.sCount) || 0) > 0) return true;
    return Object.values(record).some(value => value && typeof value === 'object' && value.grade === 'S');
}).length;

const ACHIEVEMENT_SECTIONS = [
    { id: 'adventure', title: '累積冒險', icon: '⚔️', unit: '天', milestones: ADVENTURE_MILESTONES, special: [30, 100, 200, 365] },
    { id: 'sRanks', title: 'S 級關卡', icon: '🏆', unit: '關', milestones: [1, 5, 10, 25, 50, 100], special: [25, 50, 100] },
    { id: 'words', title: '答對單字', icon: '🔤', unit: '個', milestones: CORRECT_WORD_MILESTONES, special: [500, 1000, 3000] },
    { id: 'trivia', title: '冷知識收藏', icon: '📚', unit: '張', milestones: [10, 25, 50, 100, 150, 200], special: [50, 100, 200] }
];

const getAchievementStats = (userData = {}) => ({
    adventure: Number(userData?.engagement?.adventure?.totalDays) || 0,
    sRanks: countUniqueSLevels(userData?.levelRecords || {}),
    words: new Set(userData?.correctWordIds || []).size,
    trivia: Object.keys(userData?.triviaCollection || {}).length
});

const getCorrectWordKey = (log = {}) => {
    if (!log.targetId) return null;
    if (log.targetSeries === 'phrases') return null;
    const lesson = Number(log.targetLesson);
    return log.targetSeries === 'advanced' && Number.isFinite(lesson)
        ? `advanced:${lesson}:${log.targetId}`
        : `main:${log.targetId}`;
};

const getAchievementRewardKey = (sectionId, milestone) => (
    sectionId === 'adventure' ? `milestone:${milestone}` : `achievement:${sectionId}:${milestone}`
);

const getAchievementTriviaRewards = (data = {}) => {
    const claims = data.triviaRewardClaims || {};
    const stats = getAchievementStats(data);
    const rewards = [];

    ACHIEVEMENT_SECTIONS.forEach(section => {
        section.milestones.forEach(milestone => {
            const key = getAchievementRewardKey(section.id, milestone);
            if (stats[section.id] >= milestone && !claims[key]) {
                rewards.push({
                    key,
                    label: `抽取「${section.title} ${milestone} ${section.unit}」獎勵`,
                    sourceLabel: `達成成就：${section.title} ${milestone} ${section.unit}`,
                    isSpecial: section.special.includes(milestone),
                    rewardType: 'achievement'
                });
            }
        });
    });

    const legacyWordCount = new Set(data.discoveredWordIds || []).size;
    LEGACY_WORD_MILESTONES.forEach(milestone => {
        const key = `achievement:legacyWords:${milestone}`;
        if (legacyWordCount >= milestone && !claims[key]) {
            rewards.push({
                key,
                label: `抽取「舊版探索單字 ${milestone} 個」獎勵`,
                sourceLabel: `舊版已達成：探索單字 ${milestone} 個`,
                isSpecial: [250, 500, 1000].includes(milestone),
                rewardType: 'achievement'
            });
        }
    });

    return rewards;
};

const getUpcomingAchievements = (userData = {}, limit = ACHIEVEMENT_SECTIONS.length) => {
    const stats = getAchievementStats(userData);
    return ACHIEVEMENT_SECTIONS.map(section => {
        const current = stats[section.id];
        const next = section.milestones.find(milestone => milestone > current);
        if (!next) return null;
        const previous = [...section.milestones].reverse().find(milestone => milestone <= current) || 0;
        const progress = next === previous ? 1 : (current - previous) / (next - previous);
        return {
            ...section,
            current,
            next,
            remaining: next - current,
            progress: Math.max(0, Math.min(progress, 1))
        };
    })
        .filter(Boolean)
        .sort((a, b) => b.progress - a.progress || a.remaining - b.remaining)
        .slice(0, limit);
};

const MAIN_UNIT_CATEGORY_KEYS = ['vocabA', 'vocabB', 'equip', 'alchemy', 'scroll'];
const MAIN_GRADE_MILESTONES = ['B', 'A', 'S'];
const MAIN_GRADE_ORDER = { '?': 0, E: 0, D: 0, C: 0, B: 1, A: 2, S: 3 };

const getStoredCategoryGrade = (record = {}, categoryKey) => {
    const categoryRecord = record?.[categoryKey];
    if (categoryRecord && typeof categoryRecord === 'object') return categoryRecord.grade || '?';
    return record?.[`${categoryKey}Grade`] || '?';
};

const getProgressTriviaRewards = (levelRecords = {}) => {
    const rewards = [];

    for (let unitId = 1; unitId <= 16; unitId += 1) {
        const record = levelRecords?.[unitId] || {};
        MAIN_GRADE_MILESTONES.forEach(grade => {
            const targetRank = MAIN_GRADE_ORDER[grade];
            const allCategoriesReached = MAIN_UNIT_CATEGORY_KEYS.every(categoryKey => (
                (MAIN_GRADE_ORDER[getStoredCategoryGrade(record, categoryKey)] || 0) >= targetRank
            ));
            if (allCategoriesReached) {
                rewards.push({
                    key: `progress:main:${unitId}:${grade}`,
                    label: `第 ${unitId} 章全項目 ${grade} 級獎勵`,
                    sourceLabel: `第 ${unitId} 章全項目首次達到 ${grade} 級`,
                    isSpecial: grade === 'S'
                });
            }
        });
    }

    for (let bossNumber = 1; bossNumber <= 6; bossNumber += 1) {
        const bossId = `b${bossNumber}`;
        const record = levelRecords?.[bossId] || {};
        if ((Number(record.successCount) || 0) >= BOSS_CLEARS_REQUIRED || ['CLEAR', 'COMPLETE'].includes(record.bestStatus)) {
            rewards.push({
                key: `progress:boss:${bossId}`,
                label: `${bossNumber === 6 ? '最終' : `第 ${bossNumber}`} Boss 通關獎勵`,
                sourceLabel: `${bossNumber === 6 ? '最終' : `第 ${bossNumber}`} Boss 首次通關`,
                isSpecial: true
            });
        }
    }

    Object.entries(levelRecords || {})
        .filter(([levelId, record]) => /^adv_\d+$/.test(String(levelId)) && getAdvancedQualifiedClears(record) >= ADV_CLEARS_TO_COMPLETE)
        .sort(([a], [b]) => Number(a.slice(4)) - Number(b.slice(4)))
        .forEach(([levelId]) => {
            const lesson = Number(levelId.slice(4));
            rewards.push({
                key: `progress:advanced:${lesson}:three-stars`,
                label: `進階第 ${lesson} 課三星獎勵`,
                sourceLabel: `進階第 ${lesson} 課首次取得三星`,
                isSpecial: true
            });
        });

    return rewards;
};

const getPendingProgressTriviaRewards = (data = {}) => {
    const claims = data.triviaRewardClaims || {};
    return getProgressTriviaRewards(data.levelRecords || {}).filter(reward => !claims[reward.key]);
};

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

const getTaipeiWeekRangeForValue = (value) => {
    const timestamp = value instanceof Date ? value.getTime() : Number(value);
    const shiftedDate = new Date((Number.isFinite(timestamp) ? timestamp : Date.now()) + TAIPEI_OFFSET_MS);
    const daysSinceMonday = (shiftedDate.getUTCDay() + 6) % 7;
    const mondayInTaipeiClock = Date.UTC(
        shiftedDate.getUTCFullYear(),
        shiftedDate.getUTCMonth(),
        shiftedDate.getUTCDate() - daysSinceMonday
    );
    const startMs = mondayInTaipeiClock - TAIPEI_OFFSET_MS;
    return { startMs, endMs: startMs + WEEK_MS };
};

const taipeiDateKeyToTimestamp = (dateKey) => {
    const [year, month, day] = String(dateKey || '').split('-').map(Number);
    if (![year, month, day].every(Number.isFinite)) return null;
    return Date.UTC(year, month - 1, day) - TAIPEI_OFFSET_MS;
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
        hasAccuracy: answered > 0 || accuracyValues.length > 0,
        activeDays,
        score: records.reduce((sum, record) => sum + (Number(record.score) || 0), 0)
    };
};

const getWeeklySessionScores = (history = [], range) => history
    .filter(record => {
        const time = getHistoryTime(record);
        return time !== null && time >= range.startMs && time < range.endMs;
    })
    .sort((a, b) => getHistoryTime(a) - getHistoryTime(b))
    .map(record => Number(record.score) || 0);

const toPublicArenaEntry = (student = {}) => ({
    id: student.userId || student.id,
    maskedName: student.maskedName || '神秘勇者',
    weekly: {
        score: Number(student.score) || 0,
        sessions: Number(student.sessions) || 0,
        accuracy: Number(student.accuracy) || 0,
        hasAccuracy: Boolean(student.hasAccuracy),
        activeDays: Number(student.activeDays) || 0,
        correct: 0,
        answered: 0
    }
});

const getQualifiedHistoryDates = (history = []) => [...new Set(history
    .filter(record => CHECK_IN_GRADES.includes(record?.rank))
    .map(getHistoryTime)
    .filter(time => time !== null)
    .map(getTaipeiDateKey))].sort();

const prepareEngagementOnLogin = (data = {}) => {
    const existing = data.engagement || {};
    if (Number(existing.version) >= 3 && existing.adventure) {
        return {
            engagement: existing,
            changed: false
        };
    }

    const qualifiedHistoryDates = getQualifiedHistoryDates(data.trialHistory || []);
    const rebuiltAdventure = buildTrackerFromDates(qualifiedHistoryDates);
    const legacyTotalDays = Math.max(
        Number(existing.login?.totalDays) || 0,
        Number(existing.adventure?.totalDays) || 0,
        rebuiltAdventure.totalDays
    );
    const adventure = {
        ...existing.adventure,
        ...rebuiltAdventure,
        totalDays: legacyTotalDays
    };
    return {
        engagement: {
            version: 3,
            adventure,
            migratedAt: new Date().toISOString()
        },
        changed: true
    };
};

const addQualifiedAdventureDay = (data = {}) => {
    const currentEngagement = data.engagement || prepareEngagementOnLogin(data).engagement;
    const adventureWithFlag = addTrackerDay(currentEngagement.adventure || {}, getTaipeiDateKey());
    return {
        engagement: {
            ...currentEngagement,
            adventure: stripTrackerFlag(adventureWithFlag)
        },
        changed: adventureWithFlag.changed
    };
};

const getWeeklyAdventureDays = (tracker = {}, range) => {
    const startKey = getTaipeiDateKey(range.startMs);
    const endKey = getTaipeiDateKey(range.endMs - 1);
    return (tracker.dates || []).filter(dateKey => dateKey >= startKey && dateKey <= endKey).length;
};

const roundArenaTarget = (score) => Math.ceil(Math.max(score + 500, score * 1.2, 500) / 100) * 100;

const getStableIndex = (seed, length) => {
    if (length <= 0) return -1;
    const hash = [...String(seed)].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) | 0, 7);
    return Math.abs(hash) % length;
};

const migrateTriviaProgress = (data = {}) => {
    let changed = false;
    const triviaCollection = Object.fromEntries(Object.entries(data.triviaCollection || {}).map(([cardId, unlock]) => {
        const migratedId = TRIVIA_LEGACY_ID_MAP[cardId] || cardId;
        if (migratedId !== cardId) changed = true;
        return [migratedId, unlock];
    }));
    const triviaRewardClaims = Object.fromEntries(Object.entries(data.triviaRewardClaims || {}).map(([rewardKey, claim]) => {
        const migratedCardId = TRIVIA_LEGACY_ID_MAP[claim?.cardId] || claim?.cardId;
        if (migratedCardId !== claim?.cardId) changed = true;
        return [rewardKey, { ...claim, cardId: migratedCardId }];
    }));
    return { triviaCollection, triviaRewardClaims, changed };
};

const getSeedNumber = (seed) => [...String(seed)].reduce(
    (value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0,
    2166136261
);

const createSeededRandom = (seed) => {
    let state = getSeedNumber(seed) || 1;
    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);

const getSimulatedSessionScore = ({ persona, referenceScore, dayWeight, random }) => {
    const [minScore, maxScore] = persona.scoreRange;
    const scoreReference = Math.max(Number(referenceScore) || 3000, 3000);
    // 3,000 分時為 0.8 倍，之後每翻倍增加 0.4 倍；不設上限，活躍玩家會遇到更強的對手。
    const referenceFactor = 0.8 + (Math.log2(scoreReference / 3000) * 0.4);
    const dayFactor = clampNumber(0.85 + dayWeight, 0.85, 1.25);
    const rawScore = (minScore + random() * (maxScore - minScore)) * referenceFactor * dayFactor;
    return Math.round(Math.max(rawScore, 300) / 10) * 10;
};

const buildSimulatedRivals = ({ count, weekStart, referenceScore, seed }) => {
    const random = createSeededRandom(`${seed}:${weekStart}:arena-v4`);
    const usedNames = new Set();

    return Array.from({ length: count }, (_, index) => {
        const persona = SIMULATED_PERSONAS[(index + Math.floor(random() * SIMULATED_PERSONAS.length)) % SIMULATED_PERSONAS.length];
        const availableNames = SIMULATED_ARENA_NAMES.filter(name => !usedNames.has(maskStudentName(name)));
        const namePool = availableNames.length > 0 ? availableNames : SIMULATED_ARENA_NAMES;
        const maskedName = maskStudentName(namePool[Math.floor(random() * namePool.length)]);
        usedNames.add(maskedName);
        const updates = [];

        persona.weights.forEach((weight, dayIndex) => {
            if (weight <= 0) return;
            const [minSessions, maxSessions] = persona.sessions;
            const sessionCount = minSessions + Math.floor(random() * (maxSessions - minSessions + 1));
            Array.from({ length: sessionCount }).forEach((_, sessionIndex) => {
                const hour = 7 + Math.floor(random() * 16);
                const minute = Math.floor(random() * 60);
                updates.push({
                    atMs: weekStart + (dayIndex * DAY_MS) + (hour * 60 + minute) * 60 * 1000 + sessionIndex,
                    score: getSimulatedSessionScore({ persona, referenceScore, dayWeight: weight, random })
                });
            });
        });

        return {
            id: `arena-${weekStart}-${getSeedNumber(`${seed}:${index}`).toString(36)}`,
            maskedName,
            persona: persona.id,
            accuracy: Math.round(68 + random() * 27),
            activityResponseRate: 0.3 + random() * 0.4,
            activityScoreRate: 0.8 + random() * 0.35,
            updates: updates.sort((a, b) => a.atMs - b.atMs)
        };
    });
};

const getSimulatedArenaEntry = (rival, asOfMs = Date.now(), playerStats = {}) => {
    const completedUpdates = (rival.updates || []).filter(update => Number(update.atMs) <= asOfMs);
    const playerSessionScores = Array.isArray(playerStats.sessionScores)
        ? playerStats.sessionScores.map(score => Math.max(Number(score) || 0, 0))
        : [];
    const activityResponseRate = Number(rival.activityResponseRate) || 0.5;
    const activityScoreRate = Number(rival.activityScoreRate) || 0.95;
    const responsiveSessionCount = Math.floor(playerSessionScores.length * activityResponseRate);
    const responseRandom = createSeededRandom(`${rival.id}:activity-response-v1`);
    const responsiveScore = Array.from({ length: responsiveSessionCount }).reduce((sum, _, index) => {
        const sourceIndex = Math.min(
            playerSessionScores.length - 1,
            Math.max(0, Math.ceil((index + 1) / activityResponseRate) - 1)
        );
        const scoreVariation = 0.9 + responseRandom() * 0.2;
        const sessionScore = Math.max(300, playerSessionScores[sourceIndex] * activityScoreRate * scoreVariation);
        return sum + Math.round(sessionScore / 10) * 10;
    }, 0);
    const completedScore = completedUpdates.reduce((sum, update) => sum + (Number(update.score) || 0), 0);
    const activeDays = new Set(completedUpdates.map(update => getTaipeiDateKey(update.atMs))).size;
    return {
        id: rival.id,
        maskedName: maskStudentName(rival.maskedName),
        simulated: true,
        weekly: {
            score: completedScore + responsiveScore,
            sessions: completedUpdates.length + responsiveSessionCount,
            accuracy: Number(rival.accuracy) || 0,
            hasAccuracy: completedUpdates.length + responsiveSessionCount > 0,
            activeDays: Math.max(activeDays, Math.min(Number(playerStats.activeDays) || 0, responsiveSessionCount)),
            correct: 0,
            answered: 0
        }
    };
};

const buildArenaRoster = (entries, currentUserId, currentScore, options = {}) => {
    const others = entries.filter(entry => entry.id !== currentUserId && entry.weekly.sessions > 0);
    const matchScore = Math.max(Number(currentScore) || 0, Number(options.referenceScore) || 0);
    const maximumReachableGap = Math.max(1000, matchScore * 0.35);
    const reachableOthers = others.filter(entry => (
        entry.weekly.score <= currentScore
        || entry.weekly.score - currentScore <= maximumReachableGap
    ));
    const reachableIds = new Set(reachableOthers.map(entry => entry.id));
    const retainedIds = (options.previousRoster?.rivalIds || [])
        .filter(id => reachableIds.has(id))
        .slice(0, ARENA_RETAINED_REAL_LIMIT);
    const previousRivalIds = new Set(options.previousRoster?.rivalIds || []);
    const selected = retainedIds
        .map(id => reachableOthers.find(entry => entry.id === id))
        .filter(Boolean);
    if (selected.length < ARENA_RIVAL_LIMIT) {
        const selectedIds = new Set(selected.map(entry => entry.id));
        const sortByDistance = (a, b) => Math.abs(a.weekly.score - currentScore) - Math.abs(b.weekly.score - currentScore);
        const freshOpponents = reachableOthers
            .filter(entry => !selectedIds.has(entry.id) && !previousRivalIds.has(entry.id))
            .sort(sortByDistance);
        const returningOpponents = reachableOthers
            .filter(entry => !selectedIds.has(entry.id) && previousRivalIds.has(entry.id))
            .sort(sortByDistance);
        const remaining = [...freshOpponents, ...returningOpponents];
        selected.push(...remaining.slice(0, ARENA_RIVAL_LIMIT - selected.length));
    }
    const rivalIds = selected.slice(0, ARENA_RIVAL_LIMIT).map(entry => entry.id);
    const simulatedRivals = buildSimulatedRivals({
        count: Math.max(0, ARENA_RIVAL_LIMIT - rivalIds.length),
        weekStart: options.weekStart,
        referenceScore: options.referenceScore,
        seed: options.seed || currentUserId
    });
    return {
        version: 5,
        rivalIds,
        simulatedRivals,
        targetScore: roundArenaTarget(currentScore),
        createdAt: new Date().toISOString()
    };
};

const getBonusGoal = (currentStats, previousStats) => {
    if (previousStats.sessions > 0) {
        return {
            id: 'beat-last-week',
            label: '超越上週戰力',
            current: currentStats.score,
            target: previousStats.score + 1,
            complete: currentStats.score > previousStats.score
        };
    }
    return {
        id: 'seven-challenges',
        label: '本週完成 7 場挑戰',
        current: currentStats.sessions,
        target: 7,
        complete: currentStats.sessions >= 7
    };
};

const getWeeklyPendingRewards = (data = {}, range = getTaipeiWeekRange(0)) => {
    const history = data.trialHistory || [];
    const currentStats = getWeeklyStats(history, range);
    const previousStats = getWeeklyStats(history, {
        startMs: range.startMs - WEEK_MS,
        endMs: range.startMs
    });
    const weeklyAdventureDays = getWeeklyAdventureDays(data.engagement?.adventure || {}, range);
    const bonusGoal = getBonusGoal(currentStats, previousStats);
    const claims = data.triviaRewardClaims || {};
    const rewards = [];
    const basicRewardKey = `${range.startMs}:basic`;
    const bonusRewardKey = `${range.startMs}:bonus`;

    if (weeklyAdventureDays >= 3 && !claims[basicRewardKey]) {
        rewards.push({
            key: basicRewardKey,
            label: '抽取本週冷知識',
            sourceLabel: '本週完成 3 天冒險打卡',
            isSpecial: false,
            rewardType: 'weekly'
        });
    }
    if (bonusGoal.complete && !claims[bonusRewardKey]) {
        rewards.push({
            key: bonusRewardKey,
            label: '抽取加碼冷知識',
            sourceLabel: bonusGoal.label,
            isSpecial: false,
            rewardType: 'weekly'
        });
    }
    return { rewards, weeklyAdventureDays, bonusGoal };
};

const getAllWeeklyPendingRewards = (data = {}) => {
    const weekStarts = new Set([getTaipeiWeekRange(0).startMs]);
    (data.trialHistory || []).forEach(record => {
        const timestamp = getHistoryTime(record);
        if (timestamp !== null) weekStarts.add(getTaipeiWeekRangeForValue(timestamp).startMs);
    });
    (data.engagement?.adventure?.dates || []).forEach(dateKey => {
        const timestamp = taipeiDateKeyToTimestamp(dateKey);
        if (timestamp !== null) weekStarts.add(getTaipeiWeekRangeForValue(timestamp).startMs);
    });

    return [...weekStarts]
        .sort((a, b) => a - b)
        .flatMap(startMs => getWeeklyPendingRewards(data, { startMs, endMs: startMs + WEEK_MS }).rewards);
};

const getPendingArenaTriviaRewards = (data = {}) => {
    const claims = data.triviaRewardClaims || {};
    return Object.values(data.weeklyArenaResults || {})
        .filter(result => result?.participated && Number(result.rewardCount) > 0)
        .sort((a, b) => Number(a.weekStart) - Number(b.weekStart))
        .flatMap(result => Array.from({ length: Number(result.rewardCount) }, (_, index) => {
            const rewardNumber = index + 1;
            const key = `arena:${result.weekStart}:rank:${result.rank}:reward:${rewardNumber}`;
            if (claims[key]) return null;
            return {
                key,
                label: `抽取上週競技場第 ${result.rank} 名獎勵${result.rewardCount > 1 ? `（${rewardNumber}/${result.rewardCount}）` : ''}`,
                sourceLabel: `上週競技小隊第 ${result.rank} 名`,
                isSpecial: Number(result.rank) === 1,
                rewardType: 'arena'
            };
        }))
        .filter(Boolean);
};

const getAllPendingTriviaRewards = (data = {}) => {
    const rewards = [
        ...getAllWeeklyPendingRewards(data),
        ...getPendingArenaTriviaRewards(data),
        ...getPendingProgressTriviaRewards(data),
        ...getAchievementTriviaRewards(data)
    ];
    const seen = new Set();
    return rewards.filter(reward => {
        if (!reward?.key || seen.has(reward.key)) return false;
        seen.add(reward.key);
        return true;
    });
};

const getPendingRewardSummary = (data = {}) => {
    const range = getTaipeiWeekRange(0);
    const weekly = getWeeklyPendingRewards(data, range);
    const pendingRewards = getAllPendingTriviaRewards(data);
    return {
        range,
        weeklyAdventureDays: weekly.weeklyAdventureDays,
        weeklyRewards: weekly.rewards,
        pendingRewards,
        totalPendingCount: pendingRewards.length
    };
};

const formatWeekRange = ({ startMs, endMs }) => {
    const formatter = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric'
    });
    return `${formatter.format(new Date(startMs))}－${formatter.format(new Date(endMs - 1))}`;
};

const syncWeeklyLeaderboard = async ({ userId, studentName, history, userData }) => {
    if (!userId) return;
    const range = getTaipeiWeekRange(0);
    const weekly = getWeeklyStats(history || [], range);
    if (weekly.sessions === 0) return;
    const assignment = userData?.weeklyArenaGroupAssignments?.[String(range.startMs)];
    await setDoc(doc(db, 'weeklyLeaderboard', `${range.startMs}_${userId}`), {
        userId,
        weekStart: range.startMs,
        maskedName: maskStudentName(studentName),
        groupId: assignment?.groupId || null,
        tier: assignment?.tier || normalizeArenaTierProgress(userData?.arenaTierProgress).currentTier,
        score: weekly.score,
        sessions: weekly.sessions,
        accuracy: weekly.hasAccuracy ? weekly.accuracy : null,
        hasAccuracy: weekly.hasAccuracy,
        activeDays: weekly.activeDays,
        updatedAt: new Date().toISOString()
    }, { merge: true });
};

const fetchWeeklyLeaderboardEntries = async (range) => {
    const leaderboardQuery = query(collection(db, 'weeklyLeaderboard'), where('weekStart', '==', range.startMs));
    const snapshot = await getDocs(leaderboardQuery);
    return snapshot.docs.map(studentDoc => toPublicArenaEntry({ id: studentDoc.id, ...studentDoc.data() }));
};

const isStoredArenaRosterValid = (roster) => (
    Number(roster?.version) >= 5 && Array.isArray(roster?.simulatedRivals) && Array.isArray(roster?.rivalIds)
);

const getArenaEntriesForRoster = ({ userId, userData, range, roster, publicEntries, asOfMs }) => {
    const currentStats = getWeeklyStats(userData.trialHistory || [], range);
    const sessionScores = getWeeklySessionScores(userData.trialHistory || [], range);
    const selfEntry = {
        id: userId,
        maskedName: maskStudentName(userData.studentName),
        weekly: currentStats
    };
    const rivalIdSet = new Set(roster.rivalIds || []);
    const simulatedEntries = (roster.simulatedRivals || []).map(rival => (
        getSimulatedArenaEntry(rival, asOfMs, {
            sessionScores,
            activeDays: currentStats.activeDays
        })
    ));
    return [
        selfEntry,
        ...publicEntries.filter(student => student.id !== userId && rivalIdSet.has(student.id)),
        ...simulatedEntries
    ];
};

const calculateWeeklyArenaResult = ({ userId, userData, range, roster, publicEntries }) => {
    const currentStats = getWeeklyStats(userData.trialHistory || [], range);
    const participated = currentStats.sessions > 0;
    const arenaEntries = getArenaEntriesForRoster({
        userId,
        userData,
        range,
        roster,
        publicEntries,
        asOfMs: range.endMs - 1
    });
    const leaderboard = sortArenaLeaderboard(arenaEntries);
    const calculatedRank = leaderboard.findIndex(student => student.id === userId) + 1;
    const rank = participated && calculatedRank > 0 ? calculatedRank : null;
    return {
        version: ARENA_RESULT_VERSION,
        weekStart: range.startMs,
        weekEnd: range.endMs,
        participated,
        rank,
        score: currentStats.score,
        participantCount: arenaEntries.length,
        rewardCount: rank ? (ARENA_RANK_REWARD_COUNTS[rank] || 0) : 0,
        settledAt: new Date().toISOString(),
        seenAt: null
    };
};

const PhraseMarks = ({ record = {}, size = 'md', label }) => {
    const progress = normalizePhraseProgress(record);
    const sizeClass = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';
    const gradeClass = {
        S: 'border-yellow-300 bg-yellow-500/25 text-yellow-300',
        A: 'border-green-300 bg-green-500/25 text-green-300',
        B: 'border-blue-300 bg-blue-500/25 text-blue-300'
    };

    return (
        <span
            className="inline-flex items-center gap-1"
            role="img"
            aria-label={label || `有效通關 ${progress.clears} 次，最佳勾勾 ${progress.grades.join('、') || '尚無'}`}
        >
            {Array.from({ length: PHRASE_CLEAR_TARGET }, (_, index) => {
                const grade = progress.grades[index];
                return (
                    <span
                        key={index}
                        aria-hidden="true"
                        className={`${sizeClass} border-2 flex items-center justify-center ${grade ? gradeClass[grade] : 'border-gray-600 bg-black/30 text-gray-700'}`}
                    >
                        {grade && <CheckCircle className="w-[85%] h-[85%]" strokeWidth={3} />}
                    </span>
                );
            })}
        </span>
    );
};

const calculateSharedWeeklyArenaResult = ({
    userId,
    userData,
    range,
    group,
    publicEntries
}) => {
    const currentStats = getWeeklyStats(userData.trialHistory || [], range);
    const participated = currentStats.sessions > 0;
    const currentUserEntry = {
        id: userId,
        maskedName: maskStudentName(userData.studentName),
        weekly: currentStats
    };
    const arenaEntries = buildSharedArenaEntries({
        group,
        publicEntries,
        currentUserId: userId,
        currentUserEntry,
        asOfMs: range.endMs - 1
    });
    const standing = getSharedArenaStanding({
        entries: arenaEntries,
        userId,
        participated
    });
    return {
        version: ARENA_RESULT_VERSION,
        weekStart: range.startMs,
        weekEnd: range.endMs,
        participated,
        rank: standing.rank,
        score: standing.score,
        participantCount: standing.participantCount,
        rewardCount: standing.rank ? (ARENA_RANK_REWARD_COUNTS[standing.rank] || 0) : 0,
        settledAt: new Date().toISOString(),
        seenAt: null,
        groupId: group.groupId,
        tier: group.tier,
        sharedLeaderboard: true
    };
};

const calculateArenaFallbackResult = ({ userData, range }) => {
    const currentStats = getWeeklyStats(userData.trialHistory || [], range);
    return {
        version: ARENA_RESULT_VERSION,
        weekStart: range.startMs,
        weekEnd: range.endMs,
        participated: currentStats.sessions > 0,
        rank: null,
        score: currentStats.score,
        participantCount: 0,
        rewardCount: 0,
        settledAt: new Date().toISOString(),
        seenAt: null,
        settlementFallback: true,
        notificationEligible: false
    };
};

const trimNumericKeyedRecords = (records = {}, limit = 8) => Object.fromEntries(
    Object.entries(records)
        .sort(([a], [b]) => Number(b) - Number(a))
        .slice(0, limit)
);

const prepareWeeklyArenaOnLogin = async ({ userId, userData }) => {
    const currentRange = getTaipeiWeekRange(0);
    const rewardStartWeek = Number(userData.weeklyArenaRewardStartWeek) || currentRange.startMs;
    let rosters = { ...(userData.weeklyArenaRosters || {}) };
    let results = { ...(userData.weeklyArenaResults || {}) };
    let arenaTierProgress = normalizeArenaTierProgress(userData.arenaTierProgress);
    let groupAssignments = { ...(userData.weeklyArenaGroupAssignments || {}) };

    const legacyUnsettledWeekStarts = Object.keys(rosters)
        .map(Number)
        .filter(weekStart => (
            Number.isFinite(weekStart)
            && weekStart >= rewardStartWeek
            && weekStart < currentRange.startMs
            && (Number(results[String(weekStart)]?.version) || 0) < ARENA_RESULT_VERSION
            && isStoredArenaRosterValid(rosters[String(weekStart)])
        ));

    const tierCatchUpStart = arenaTierProgress.lastSettledWeek === null
        ? ARENA_TIER_ACTIVATION_WEEK_START
        : arenaTierProgress.lastSettledWeek + WEEK_MS;
    const tierWeekStarts = [];
    for (
        let weekStart = tierCatchUpStart;
        weekStart < currentRange.startMs;
        weekStart += WEEK_MS
    ) {
        tierWeekStarts.push(weekStart);
    }
    const unsettledWeekStarts = [...new Set([
        ...legacyUnsettledWeekStarts,
        ...tierWeekStarts
    ])].sort((a, b) => a - b);

    for (const weekStart of unsettledWeekStarts) {
        const range = { startMs: weekStart, endMs: weekStart + WEEK_MS };
        try {
            const existingResult = results[String(weekStart)];
            let arenaResult = existingResult;
            if ((Number(existingResult?.version) || 0) < ARENA_RESULT_VERSION) {
                const groupAssignment = groupAssignments[String(weekStart)];
                const roster = rosters[String(weekStart)];
                if (
                    weekStart >= ARENA_TIER_ACTIVATION_WEEK_START
                    && groupAssignment?.groupId
                ) {
                    const sharedGroup = await ensureWeeklyArenaGroupSimulation({
                        db,
                        groupId: groupAssignment.groupId
                    });
                    const publicEntries = await fetchWeeklyLeaderboardEntries(range);
                    arenaResult = calculateSharedWeeklyArenaResult({
                        userId,
                        userData,
                        range,
                        group: sharedGroup,
                        publicEntries
                    });
                } else if (isStoredArenaRosterValid(roster)) {
                    const publicEntries = await fetchWeeklyLeaderboardEntries(range);
                    arenaResult = calculateWeeklyArenaResult({
                        userId,
                        userData,
                        range,
                        roster,
                        publicEntries
                    });
                } else {
                    arenaResult = calculateArenaFallbackResult({ userData, range });
                }
            }
            if (
                weekStart >= ARENA_TIER_ACTIVATION_WEEK_START
                && (Number(arenaResult?.tierVersion) || 0) < 1
            ) {
                const tierResult = settleArenaTier({
                    progress: arenaTierProgress,
                    participated: arenaResult.participated,
                    rank: arenaResult.rank,
                    weekStart,
                    settledAt: arenaResult.settledAt
                });
                arenaTierProgress = tierResult.progress;
                arenaResult = {
                    ...arenaResult,
                    ...tierResult.settlement
                };
            }
            results[String(weekStart)] = arenaResult;
        } catch (error) {
            console.warn(`競技場 ${formatWeekRange(range)} 結算失敗，將於下次登入重試。`, error);
        }
    }

    const currentRosterKey = String(currentRange.startMs);
    if (
        currentRange.startMs < ARENA_TIER_ACTIVATION_WEEK_START
        && !isStoredArenaRosterValid(rosters[currentRosterKey])
    ) {
        try {
            const publicEntries = await fetchWeeklyLeaderboardEntries(currentRange);
            const currentStats = getWeeklyStats(userData.trialHistory || [], currentRange);
            const previousStats = getWeeklyStats(userData.trialHistory || [], {
                startMs: currentRange.startMs - WEEK_MS,
                endMs: currentRange.startMs
            });
            const selfEntry = {
                id: userId,
                maskedName: maskStudentName(userData.studentName),
                weekly: currentStats
            };
            rosters[currentRosterKey] = buildArenaRoster(
                [selfEntry, ...publicEntries.filter(student => student.id !== userId)],
                userId,
                currentStats.score,
                {
                    previousRoster: rosters[String(currentRange.startMs - WEEK_MS)],
                    weekStart: currentRange.startMs,
                    referenceScore: Math.max(currentStats.score, previousStats.score),
                    seed: `${userId}:${currentRange.startMs}`
                }
            );
        } catch (error) {
            console.warn('本週競技小隊建立失敗，將於下次登入重試。', error);
        }
    }

    if (currentRange.startMs >= ARENA_TIER_ACTIVATION_WEEK_START) {
        try {
            let assignment = groupAssignments[currentRosterKey];
            if (!assignment) {
                const previousRange = {
                    startMs: currentRange.startMs - WEEK_MS,
                    endMs: currentRange.startMs
                };
                const previousStats = getWeeklyStats(userData.trialHistory || [], previousRange);
                assignment = await assignWeeklyArenaGroup({
                    db,
                    userId,
                    maskedName: maskStudentName(userData.studentName),
                    weekStart: currentRange.startMs,
                    tier: arenaTierProgress.currentTier,
                    activityStats: previousStats
                });
            }
            const sharedGroup = await ensureWeeklyArenaGroupSimulation({
                db,
                groupId: assignment.groupId
            });
            groupAssignments[currentRosterKey] = {
                ...assignment,
                groupStatus: sharedGroup.status,
                simulationVersion: Number(sharedGroup.simulationVersion) || 0,
                simulatedMemberCount: Number(sharedGroup.simulatedMemberCount) || 0
            };
        } catch (error) {
            console.warn('本週同階級競技小組或共享模擬玩家建立失敗，將於下次登入重試。', error);
        }
    }

    const completedResults = Object.values(results)
        .filter(result => Number(result?.weekStart) < currentRange.startMs)
        .sort((a, b) => Number(b.weekStart) - Number(a.weekStart));
    const newestResult = completedResults.find(result => result.notificationEligible !== false) || null;
    const notification = newestResult && !newestResult.seenAt ? newestResult : null;
    const skippedUnseenResults = completedResults.filter(result => (
        !result.seenAt && result.weekStart !== notification?.weekStart
    ));
    if (skippedUnseenResults.length > 0) {
        const skippedAt = new Date().toISOString();
        skippedUnseenResults.forEach(result => {
            results[String(result.weekStart)] = {
                ...result,
                seenAt: skippedAt,
                notificationSkipped: true
            };
        });
    }

    rosters = trimNumericKeyedRecords(rosters, 8);
    results = trimNumericKeyedRecords(results, 16);
    groupAssignments = trimNumericKeyedRecords(groupAssignments, 8);
    return {
        userData: {
            ...userData,
            weeklyArenaRewardStartWeek: rewardStartWeek,
            weeklyArenaRosters: rosters,
            weeklyArenaResults: results,
            arenaTierProgress,
            weeklyArenaGroupAssignments: groupAssignments
        },
        notification
    };
};

const TriviaAlbum = ({ onBack, userData, onClaimTrivia }) => {
    const [activeGroup, setActiveGroup] = useState('english');
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedCard, setSelectedCard] = useState(null);
    const [showTeacherPassword, setShowTeacherPassword] = useState(false);
    const [teacherPassword, setTeacherPassword] = useState('');
    const [teacherError, setTeacherError] = useState(false);
    const [teacherPreview, setTeacherPreview] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [drawBlocked, setDrawBlocked] = useState(false);
    const [showOwnedOnly, setShowOwnedOnly] = useState(false);
    const collection = userData?.triviaCollection || {};
    const ownedCount = Object.keys(collection).length;
    const pendingRewards = getAllPendingTriviaRewards(userData);
    const reward = pendingRewards[0] || null;
    const groupCategories = TRIVIA_CATEGORIES.filter(category => category.group === activeGroup);
    const visibleCards = TRIVIA_CARDS.filter(card => (
        card.group === activeGroup
        && (activeCategory === 'all' || card.category === activeCategory)
        && (!showOwnedOnly || Boolean(collection[card.id]))
    ));

    const changeGroup = groupId => {
        setActiveGroup(groupId);
        setActiveCategory('all');
        setSelectedCard(null);
    };

    const openTeacherPrompt = () => {
        if (teacherPreview) {
            setTeacherPreview(false);
            setSelectedCard(null);
            return;
        }
        setTeacherPassword('');
        setTeacherError(false);
        setShowTeacherPassword(true);
    };

    const confirmTeacherPassword = event => {
        event.preventDefault();
        if (teacherPassword !== '1999') {
            setTeacherError(true);
            return;
        }
        setTeacherPreview(true);
        setShowTeacherPassword(false);
        setTeacherPassword('');
        setTeacherError(false);
    };

    const drawPendingReward = async () => {
        if (!reward || isClaiming || drawBlocked || !onClaimTrivia) return;
        setIsClaiming(true);
        try {
            const card = await onClaimTrivia(reward);
            if (card) {
                setSelectedCard(card);
                setDrawBlocked(false);
                playSound('success');
            } else {
                setDrawBlocked(true);
            }
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#171229] text-white">
            <div className="flex items-center justify-between p-3 border-b-4 border-amber-500/70 bg-black/50">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <div className="text-center">
                    <h2 className="font-pixel text-sm text-amber-300">冷知識收藏冊</h2>
                    <p className="font-retro text-[10px] text-gray-400">KNOWLEDGE ALBUM</p>
                    <p className="font-retro text-[10px] leading-none text-gray-400">{ownedCount} / {TRIVIA_CARDS.length}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setShowOwnedOnly(current => !current)}
                        aria-pressed={showOwnedOnly}
                        className={`h-9 px-2 flex items-center gap-1 border-2 font-retro text-[10px] whitespace-nowrap transition-colors ${showOwnedOnly ? 'bg-amber-500 border-yellow-200 text-black' : 'bg-black/40 border-gray-600 text-gray-300 hover:border-amber-400 hover:text-amber-200'}`}
                        title="只顯示已擁有的冷知識"
                    >
                        <CheckCircle size={14} /> 已擁有
                    </button>
                    <button onClick={openTeacherPrompt} className={`w-9 h-9 flex items-center justify-center border-2 ${teacherPreview ? 'bg-green-700 border-green-300' : 'bg-amber-950/60 border-amber-500/50'} text-xl hover:scale-105`} title={teacherPreview ? '退出教師預覽' : '教師預覽'}>📚</button>
                </div>
            </div>

            {teacherPreview && (
                <div className="bg-green-900/80 border-b-2 border-green-400 px-3 py-2 text-center font-pixel text-[9px] text-green-100">
                    教師預覽 · 全部卡片已展開（不影響學生收藏）
                </div>
            )}

            <section className={`mx-2 mt-2 border-4 p-3 ${reward ? 'border-yellow-400 bg-gradient-to-r from-purple-950 to-amber-950' : 'border-gray-700 bg-black/35'}`}>
                <div className="flex items-center gap-3">
                    <div className="relative shrink-0 text-3xl" aria-hidden="true">
                        🎁
                        {pendingRewards.length > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 border border-white text-white font-pixel text-[8px] flex items-center justify-center">
                                {pendingRewards.length > 99 ? '99+' : pendingRewards.length}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className={`font-pixel text-[10px] ${reward ? 'text-yellow-300' : 'text-gray-400'}`}>
                            {reward ? `待抽取獎勵 ${pendingRewards.length} 次` : '目前沒有待抽卡'}
                        </h3>
                        <p className="font-retro text-[10px] text-gray-300 mt-1 truncate">
                            {reward ? reward.sourceLabel : '完成每日任務與成就，就能獲得新的冷知識。'}
                        </p>
                        {pendingRewards.length > 1 && (
                            <p className="font-retro text-[9px] text-amber-200 mt-1">另外還有 {pendingRewards.length - 1} 次獎勵等你抽取</p>
                        )}
                    </div>
                    <RPGButton
                        onClick={drawPendingReward}
                        color={reward && !drawBlocked ? 'success' : 'dark'}
                        disabled={!reward || isClaiming || drawBlocked}
                        className="shrink-0 px-3 whitespace-nowrap"
                    >
                        {isClaiming ? '抽取中' : reward ? '抽一張' : '已領完'}
                    </RPGButton>
                </div>
                {drawBlocked && (
                    <p className="font-retro text-[10px] text-yellow-100 mt-3 border border-yellow-500/40 bg-black/30 p-2">
                        現有冷知識已全部收藏；抽卡次數會保留，新增卡片後可以繼續抽。
                    </p>
                )}
            </section>

            <div className="grid grid-cols-2 gap-2 p-2 bg-[#251b3d] border-b border-white/10">
                {TRIVIA_GROUPS.map(group => (
                    <button key={group.id} onClick={() => changeGroup(group.id)} className={`p-2 border-2 text-left ${activeGroup === group.id ? 'bg-amber-500 text-black border-yellow-200' : 'bg-black/30 text-gray-300 border-gray-700'}`}>
                        <div className="font-pixel text-[10px]">{group.icon} {group.label}</div>
                        <div className="font-retro text-[9px] mt-1 opacity-70">{group.description}</div>
                    </button>
                ))}
            </div>

            <div className="flex gap-2 overflow-x-auto p-2 bg-black/40 border-b border-white/10 flex-shrink-0">
                <button onClick={() => setActiveCategory('all')} className={`px-3 py-2 whitespace-nowrap border-2 font-retro text-xs ${activeCategory === 'all' ? 'bg-amber-500 text-black border-yellow-200' : 'bg-black/30 text-gray-400 border-gray-700'}`}>全部</button>
                {groupCategories.map(category => (
                    <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`px-3 py-2 whitespace-nowrap border-2 font-retro text-xs ${activeCategory === category.id ? 'bg-purple-600 text-white border-purple-300' : 'bg-black/30 text-gray-400 border-gray-700'}`}>
                        {category.icon} {category.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                {visibleCards.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 pb-6">
                        {visibleCards.map(card => {
                            const unlock = collection[card.id];
                            const category = TRIVIA_CATEGORIES.find(item => item.id === card.category);
                            const canInspect = Boolean(unlock) || teacherPreview;
                            const cardNumber = TRIVIA_CARDS.findIndex(item => item.id === card.id) + 1;
                            return (
                                <button
                                    key={card.id}
                                    onClick={() => canInspect && setSelectedCard(card)}
                                    disabled={!canInspect}
                                    className={`aspect-[3/4] border-2 p-1 flex flex-col items-center justify-center gap-1 transition-all ${unlock ? 'bg-gradient-to-b from-amber-100 to-amber-300 border-yellow-500 text-black hover:scale-105' : teacherPreview ? 'bg-gradient-to-b from-green-950 to-purple-950 border-green-500 text-white hover:scale-105' : 'bg-black/40 border-gray-700 text-gray-600'}`}
                                    title={canInspect ? card.title : `尚未解鎖 ${card.id}`}
                                >
                                    <span className="font-pixel text-[8px]">#{String(cardNumber).padStart(3, '0')}</span>
                                    <span className={`text-xl ${canInspect ? '' : 'grayscale opacity-30'}`}>{canInspect ? category?.icon : '❔'}</span>
                                    <span className="font-retro text-[9px] leading-tight line-clamp-2">{canInspect ? card.title : '未解鎖'}</span>
                                    {unlock?.isSpecial && <span className="font-pixel text-[7px] text-purple-700">SPECIAL</span>}
                                    {!unlock && teacherPreview && <span className="font-pixel text-[6px] text-green-300">PREVIEW</span>}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="min-h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-700 bg-black/20 px-4 text-center">
                        <Book size={28} className="text-gray-600" />
                        <p className="font-retro text-xs text-gray-400">這個分類還沒有已擁有的冷知識</p>
                        <button
                            type="button"
                            onClick={() => setShowOwnedOnly(false)}
                            className="border-2 border-amber-500/70 bg-amber-950/50 px-3 py-2 font-retro text-[10px] text-amber-200 hover:bg-amber-900"
                        >
                            顯示全部卡片
                        </button>
                    </div>
                )}
            </div>

            {selectedCard && (() => {
                const unlock = collection[selectedCard.id];
                const category = TRIVIA_CATEGORIES.find(item => item.id === selectedCard.category);
                const source = TRIVIA_SOURCES[selectedCard.category];
                return (
                    <div className="absolute inset-0 z-50 bg-black/85 flex items-center justify-center p-5" onClick={() => setSelectedCard(null)}>
                        <div className={`w-full max-w-xs border-4 p-5 text-center ${unlock?.isSpecial ? 'bg-gradient-to-b from-purple-950 to-amber-950 border-yellow-400' : 'bg-[#2d2347] border-amber-500'}`} onClick={event => event.stopPropagation()}>
                            <div className="text-5xl mb-3">{category?.icon}</div>
                            <div className="font-pixel text-[9px] text-amber-300 mb-2">{category?.label} · {selectedCard.id}</div>
                            <h3 className="font-pixel text-sm text-white mb-4 leading-relaxed">{selectedCard.title}</h3>
                            <p className="font-retro text-base text-gray-200 leading-relaxed">{selectedCard.text}</p>
                            <div className="mt-4 pt-3 border-t border-white/10 font-retro text-[10px] text-gray-400 space-y-1">
                                <p>取得方式：{unlock?.sourceLabel || (teacherPreview ? '教師預覽（尚未解鎖）' : '冒險獎勵')}</p>
                                <p>資料核對：{source?.label || '教學資料'}</p>
                                {source?.url && <a href={source.url} target="_blank" rel="noreferrer" className="inline-block text-cyan-300 underline">查看核對來源</a>}
                            </div>
                            <RPGButton onClick={() => setSelectedCard(null)} color="accent" className="w-full mt-4">收回收藏冊</RPGButton>
                        </div>
                    </div>
                );
            })()}

            {showTeacherPassword && (
                <div className="absolute inset-0 z-[70] bg-black/85 flex items-center justify-center p-5" onClick={() => setShowTeacherPassword(false)}>
                    <form onSubmit={confirmTeacherPassword} className="w-full max-w-xs bg-[#2d2347] border-4 border-amber-500 p-5 text-center" onClick={event => event.stopPropagation()}>
                        <div className="text-4xl mb-3">📚</div>
                        <h3 className="font-pixel text-xs text-amber-300">教師預覽</h3>
                        <p className="font-retro text-xs text-gray-300 mt-2">輸入教師密碼即可查看全部 {TRIVIA_CARDS.length} 張卡片</p>
                        <input autoFocus type="password" inputMode="numeric" maxLength={4} value={teacherPassword} onChange={event => { setTeacherPassword(event.target.value); setTeacherError(false); }} className="w-full mt-4 bg-black/50 border-2 border-gray-500 p-3 text-center font-pixel text-lg tracking-[0.4em] text-white" aria-label="教師預覽密碼" />
                        {teacherError && <p className="font-retro text-xs text-red-300 mt-2">密碼不正確</p>}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <RPGButton type="button" onClick={() => setShowTeacherPassword(false)} color="dark">取消</RPGButton>
                            <RPGButton type="submit" color="success">確認</RPGButton>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const WeeklyReport = ({ onBack, onOpenAlbum, onViewLoginCalendar, currentUserId, userData, onSaveArenaRoster }) => {
    const [period, setPeriod] = useState('current');
    const [students, setStudents] = useState([]);
    const [sharedGroup, setSharedGroup] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const rosterSaveRequestedRef = useRef(false);
    const range = getTaipeiWeekRange(period === 'current' ? 0 : -1);
    const rosterKey = String(range.startMs);
    const groupAssignment = userData?.weeklyArenaGroupAssignments?.[rosterKey] || null;
    const currentArenaTier = getArenaTier(
        normalizeArenaTierProgress(userData?.arenaTierProgress).currentTier
    );

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        setLoadError(false);
        setSharedGroup(null);
        const leaderboardQuery = query(collection(db, 'weeklyLeaderboard'), where('weekStart', '==', range.startMs));
        const groupPromise = groupAssignment?.groupId
            ? ensureWeeklyArenaGroupSimulation({ db, groupId: groupAssignment.groupId })
                .catch(async error => {
                    console.warn('共享競技小組整理失敗，改以唯讀方式載入。', error);
                    return fetchWeeklyArenaGroup({ db, groupId: groupAssignment.groupId });
                })
            : Promise.resolve(null);
        Promise.all([getDocs(leaderboardQuery), groupPromise])
            .then(([snapshot, loadedGroup]) => {
                if (!active) return;
                const loaded = snapshot.docs.map(studentDoc => ({ id: studentDoc.id, ...studentDoc.data() }));
                setStudents(loaded);
                setSharedGroup(loadedGroup);
                if (groupAssignment?.groupId && !loadedGroup) setLoadError(true);
            })
            .catch(error => {
                console.error('讀取每週排行榜失敗', error);
                if (active) setLoadError(true);
            })
            .finally(() => { if (active) setIsLoading(false); });
        return () => { active = false; };
    }, [range.startMs, groupAssignment?.groupId]);

    const currentStats = getWeeklyStats(userData?.trialHistory || [], range);
    const previousStats = getWeeklyStats(userData?.trialHistory || [], getTaipeiWeekRange(-1));
    const publicEntries = students.map(toPublicArenaEntry);
    const selfEntry = { id: currentUserId, maskedName: maskStudentName(userData?.studentName), weekly: currentStats };
    const entriesWithSelf = [selfEntry, ...publicEntries.filter(student => student.id !== currentUserId)];
    const storedRoster = userData?.weeklyArenaRosters?.[rosterKey];
    const priorRoster = userData?.weeklyArenaRosters?.[String(range.startMs - WEEK_MS)];
    const proposedRoster = buildArenaRoster(entriesWithSelf, currentUserId, currentStats.score, {
        previousRoster: storedRoster || priorRoster,
        weekStart: range.startMs,
        referenceScore: Math.max(currentStats.score, previousStats.score),
        seed: `${currentUserId}:${range.startMs}`
    });
    const storedRosterIsCurrent = isStoredArenaRosterValid(storedRoster);
    const activeRoster = storedRosterIsCurrent ? storedRoster : proposedRoster;
    const usesSharedGroup = Boolean(
        range.startMs >= ARENA_TIER_ACTIVATION_WEEK_START
        && groupAssignment?.groupId
        && sharedGroup
    );
    const displayGroup = usesSharedGroup ? fillArenaGroupForDisplay(sharedGroup) : sharedGroup;
    const arenaEntries = usesSharedGroup
        ? buildSharedArenaEntries({
            group: displayGroup,
            publicEntries,
            currentUserId,
            currentUserEntry: selfEntry,
            asOfMs: Math.min(Date.now(), range.endMs - 1)
        })
        : getArenaEntriesForRoster({
            userId: currentUserId,
            userData,
            range,
            roster: activeRoster,
            publicEntries,
            asOfMs: Math.min(Date.now(), range.endMs - 1)
        });
    const leaderboard = sortArenaLeaderboard(arenaEntries);
    const currentRank = leaderboard.findIndex(student => student.id === currentUserId) + 1;
    const settledResult = userData?.weeklyArenaResults?.[rosterKey] || null;
    const studentsWithAccuracy = arenaEntries.filter(student => student.weekly.hasAccuracy);
    const classAverage = arenaEntries.length > 0 ? {
        score: arenaEntries.reduce((sum, student) => sum + student.weekly.score, 0) / arenaEntries.length,
        correct: arenaEntries.reduce((sum, student) => sum + student.weekly.correct, 0) / arenaEntries.length,
        sessions: arenaEntries.reduce((sum, student) => sum + student.weekly.sessions, 0) / arenaEntries.length,
        accuracy: studentsWithAccuracy.length > 0
            ? studentsWithAccuracy.reduce((sum, student) => sum + student.weekly.accuracy, 0) / studentsWithAccuracy.length
            : null
    } : { score: 0, correct: 0, sessions: 0, accuracy: null };
    const comparisonRows = [
        { label: '累積戰力', mine: currentStats.score, average: classAverage.score, suffix: ' 分' },
        { label: '挑戰場次', mine: currentStats.sessions, average: classAverage.sessions, suffix: ' 場' },
        { label: '答題準確率', mine: currentStats.hasAccuracy ? currentStats.accuracy : null, average: classAverage.accuracy, suffix: '%' }
    ];
    const currentIndex = Math.max(0, currentRank - 1);
    const nextOpponent = currentIndex > 0 ? leaderboard[currentIndex - 1] : null;
    const isChampion = currentRank === 1 && currentStats.sessions > 0;
    const championTarget = usesSharedGroup
        ? Math.max(currentStats.score, Number(nextOpponent?.weekly.score) || 0)
        : (Number(activeRoster.targetScore) || roundArenaTarget(currentStats.score));
    const pendingRewards = getAllPendingTriviaRewards(userData);
    const todayCheckedIn = (userData?.engagement?.adventure?.dates || []).includes(getTaipeiDateKey());
    const upcomingAchievement = getUpcomingAchievements(userData, 1)[0] || null;

    useEffect(() => {
        if (
            period !== 'current'
            || range.startMs >= ARENA_TIER_ACTIVATION_WEEK_START
            || isLoading
            || loadError
            || storedRosterIsCurrent
            || !onSaveArenaRoster
            || rosterSaveRequestedRef.current
        ) return;
        rosterSaveRequestedRef.current = true;
        onSaveArenaRoster(range.startMs, proposedRoster);
    }, [period, isLoading, loadError, storedRosterIsCurrent, onSaveArenaRoster, range.startMs, proposedRoster]);

    return (
        <div
            className="arena-tier-shell flex flex-col h-full text-white"
            data-arena-frame={currentArenaTier.frame}
            style={getArenaTierStyle(currentArenaTier.id)}
        >
            <div className="arena-tier-header flex items-center justify-between p-3 border-b-4">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <div className="text-center">
                    <h2 className="arena-tier-text font-pixel text-sm">每週冒險戰報</h2>
                    <p className="font-retro text-[10px] text-gray-300">{currentArenaTier.shortLabel} · WEEKLY REPORT</p>
                </div>
                <div className="flex items-center gap-1">
                    <ArenaTierBadge tier={currentArenaTier.id} size="sm" showLabel={false} />
                    <button onClick={onViewLoginCalendar} className="weekly-report-calendar-button w-8 h-8 flex items-center justify-center" title="冒險打卡日曆" aria-label="打開冒險打卡日曆">
                        <CalendarDays size={17} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 bg-black/50 border-b-2 border-yellow-500/30">
                <button onClick={() => setPeriod('current')} style={period === 'current' ? { backgroundColor: currentArenaTier.colors.primary, color: '#09050f' } : undefined} className={`py-2 font-pixel text-[10px] ${period === 'current' ? '' : 'text-gray-400'}`}>本週累積</button>
                <button onClick={() => setPeriod('previous')} style={period === 'previous' ? { backgroundColor: currentArenaTier.colors.secondary, color: currentArenaTier.colors.glow } : undefined} className={`py-2 font-pixel text-[10px] ${period === 'previous' ? '' : 'text-gray-400'}`}>上週結算</button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                <ArenaTierGuide currentTierId={currentArenaTier.id} />

                <section className="border-4 border-cyan-400/60 bg-gradient-to-br from-cyan-950/80 to-purple-950/80 p-3 shadow-xl">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-pixel text-xs text-cyan-300">本日打卡</h3>
                        <button onClick={onViewLoginCalendar} className="font-retro text-[10px] text-cyan-300 hover:text-white">
                            查看日曆 ›
                        </button>
                    </div>
                    <p className="font-retro text-[10px] text-gray-400 mb-3">台北時間每日計算一次</p>
                    <div className={`border-2 p-3 text-center ${todayCheckedIn ? 'border-green-400 bg-green-950/50' : 'border-yellow-400 bg-yellow-950/35'}`}>
                        <div className={`font-pixel text-2xl ${todayCheckedIn ? 'text-green-300' : 'text-yellow-300'}`}>{todayCheckedIn ? '1 / 1' : '0 / 1'}</div>
                        <div className="font-retro text-[10px] text-gray-200 mt-2">{todayCheckedIn ? '今日打卡已完成' : '今日尚未完成打卡'}</div>
                    </div>
                    <p className={`font-retro text-[11px] mt-3 leading-relaxed ${todayCheckedIn ? 'text-green-200' : 'text-yellow-100'}`}>
                        {todayCheckedIn ? '✓ 今日已完成一場遊戲並取得 B 級以上。' : '完成一場遊戲並取得 B 級以上，即可完成今日打卡。'}
                    </p>
                    {todayCheckedIn && upcomingAchievement && (
                        <div className="mt-3 border-2 border-purple-400/50 bg-black/35 p-3">
                            <div className="font-pixel text-[9px] text-purple-300">最接近完成的成就</div>
                            <div className="font-retro text-xs text-white mt-2">
                                {upcomingAchievement.icon} {upcomingAchievement.title}還差 {upcomingAchievement.remaining} {upcomingAchievement.unit}
                            </div>
                            <div className="font-pixel text-[10px] text-cyan-300 mt-2">{upcomingAchievement.current} / {upcomingAchievement.next}</div>
                        </div>
                    )}
                </section>

                <section className="arena-tier-feature border-4 p-4 shadow-xl">
                    <div className="flex justify-between items-start gap-3">
                        <div>
                            <p className="font-pixel text-[10px] text-yellow-300">{period === 'current' ? '本週累積戰力' : '上週最終戰績'}</p>
                            <p className="font-retro text-[11px] text-gray-300 mt-1">{formatWeekRange(range)} · 週一至週日</p>
                        </div>
                        <div className="text-right">
                            <div className="font-pixel text-3xl text-yellow-300">{currentStats.score}</div>
                            <div className="font-retro text-[10px] text-yellow-100">累積戰力</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="bg-black/35 border border-white/10 p-2"><div className="font-pixel text-lg text-cyan-300">{currentStats.sessions}</div><div className="font-retro text-[10px] text-gray-300">挑戰場次</div></div>
                        <div className="bg-black/35 border border-white/10 p-2"><div className="font-pixel text-lg text-green-300">{currentStats.hasAccuracy ? `${Math.round(currentStats.accuracy)}%` : '—'}</div><div className="font-retro text-[10px] text-gray-300">準確率</div></div>
                        <div className="bg-black/35 border border-white/10 p-2"><div className="font-pixel text-lg text-purple-300">{currentStats.activeDays}</div><div className="font-retro text-[10px] text-gray-300">活躍天數</div></div>
                    </div>
                    <p className="font-retro text-[10px] text-gray-400 mt-3">
                        {period === 'current' ? '每週一 00:00 重新累積，週日 23:59 結算。' : '排行依每場分數加總；同分時依準確率與挑戰場次排序。'}
                    </p>
                </section>

                {period === 'previous' && settledResult && (
                    <section className="border-4 border-blue-500/60 bg-gradient-to-br from-blue-950/80 to-purple-950/70 p-4 text-center">
                        <div className="font-pixel text-[9px] text-blue-300">上週固定競技小隊結算</div>
                        {settledResult.participated ? (
                            <>
                                <div className="font-pixel text-3xl text-white mt-3">第 {settledResult.rank} 名</div>
                                <div className="font-retro text-xs text-gray-300 mt-2">
                                    {settledResult.score} 分 · 共 {settledResult.participantCount} 人
                                </div>
                                <div className="font-retro text-xs text-amber-300 mt-2">
                                    {settledResult.rewardCount > 0
                                        ? `獲得 ${settledResult.rewardCount} 次冷知識抽卡`
                                        : '本週沒有額外抽卡獎勵'}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="font-pixel text-lg text-gray-300 mt-3">上週未參賽</div>
                                <div className="font-retro text-xs text-gray-500 mt-2">沒有產生競技小隊名次</div>
                            </>
                        )}
                        <ArenaTierResult data={settledResult} className="mt-4" />
                    </section>
                )}

                <section className="border-2 border-purple-400/50 bg-black/30 p-3">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-pixel text-xs text-purple-200">我和同級冒險者</h3>
                        <span className="font-retro text-[10px] text-gray-400">{arenaEntries.length} 人競技小隊</span>
                    </div>
                    <div className="space-y-3">
                        {comparisonRows.map(row => {
                            const mineValue = row.mine ?? 0;
                            const averageValue = row.average ?? 0;
                            const scale = Math.max(mineValue, averageValue, 1);
                            const formatValue = value => value === null ? '—' : `${Math.round(value)}${row.suffix}`;
                            return (
                                <div key={row.label}>
                                    <div className="flex justify-between font-retro text-[11px] mb-1">
                                        <span>{row.label}</span>
                                        <span className="text-cyan-300">我 {formatValue(row.mine)} · 小隊平均 {formatValue(row.average)}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-2 bg-black/70"><div className="h-full bg-cyan-400" style={{ width: `${(mineValue / scale) * 100}%` }}></div></div>
                                        <div className="h-1 bg-black/70"><div className="h-full bg-purple-400" style={{ width: `${(averageValue / scale) * 100}%` }}></div></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="arena-tier-panel border-2 bg-black/30 overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b border-yellow-500/30">
                        <div>
                            <h3 className="font-pixel text-xs text-yellow-300">英雄競技場</h3>
                            <p className="font-retro text-[9px] text-gray-400 mt-1">為保護隱私，競技場名稱一律使用代稱顯示。</p>
                            <p className="font-retro text-[8px] text-gray-600 mt-0.5">
                                {usesSharedGroup ? '同階級玩家共用同一張排行榜與結算結果' : '系統會依照近期冒險進度，安排實力接近的對手'}
                            </p>
                        </div>
                        <span className="font-retro text-[10px] text-gray-400">{usesSharedGroup ? '同階聯賽' : '本週對手固定'}</span>
                    </div>
                    {isLoading ? (
                        <div className="p-5 text-center font-retro text-sm text-gray-400 animate-pulse">載入班級戰績...</div>
                    ) : loadError ? (
                        <div className="p-5 text-center font-retro text-sm text-gray-400">目前無法讀取競技場，個人戰報仍可正常使用。</div>
                    ) : currentStats.sessions === 0 && leaderboard.length <= 1 ? (
                        <div className="p-5 text-center font-retro text-sm text-gray-400">這一週還沒有人完成挑戰，搶下第一名吧！</div>
                    ) : (
                        <div>
                            {leaderboard.map((student, index) => {
                                const isMe = student.id === currentUserId;
                                return (
                                    <div key={student.id} className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 px-3 py-2 border-b border-white/10 ${isMe ? 'arena-tier-self' : ''}`}>
                                        <span className={`font-pixel text-sm ${index < 3 ? 'text-yellow-300' : 'text-gray-400'}`}>#{index + 1}</span>
                                        <div className="min-w-0 flex items-center gap-2">
                                            {isMe && <ArenaTierBadge tier={currentArenaTier.id} size="sm" showLabel={false} />}
                                            <div className="min-w-0"><div className="font-retro text-sm truncate">{isMe ? `我 · ${currentArenaTier.shortLabel}` : student.maskedName}</div><div className="font-retro text-[9px] text-gray-500">{student.weekly.hasAccuracy ? `準確率 ${Math.round(student.weekly.accuracy)}%` : `${student.weekly.sessions} 場挑戰`}</div></div>
                                        </div>
                                        <span className="font-pixel text-xs text-yellow-300">{student.weekly.score} 分</span>
                                    </div>
                                );
                            })}
                            <div className={`p-3 border-t-2 ${isChampion ? 'bg-yellow-950/50 border-yellow-500/50' : 'bg-purple-950/40 border-purple-500/40'}`}>
                                {isChampion ? (
                                    <>
                                        <div className="font-pixel text-[10px] text-yellow-300">👑 守擂中 · 第一名屬於你</div>
                                        <p className="font-retro text-xs text-gray-300 mt-1">
                                            {currentStats.score >= championTarget ? `本週越級目標 ${championTarget} 分已達成！本週門檻不會再提高。` : `本週越級目標：${championTarget} 分（還差 ${championTarget - currentStats.score} 分）`}
                                        </p>
                                    </>
                                ) : nextOpponent ? (
                                    <>
                                        <div className="font-pixel text-[10px] text-purple-300">下一位對手：{nextOpponent.maskedName}</div>
                                        <p className="font-retro text-xs text-gray-300 mt-1">再獲得 {Math.max(0, nextOpponent.weekly.score - currentStats.score + 1)} 分即可超越</p>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    )}
                </section>

                <section className={`border-4 p-4 text-center ${pendingRewards.length > 0 ? 'border-amber-400/60 bg-amber-950/35' : 'border-gray-600 bg-black/30'}`}>
                    <div className="text-3xl mb-2">📚</div>
                    <h3 className="font-pixel text-xs text-amber-300">冷知識收藏冊</h3>
                    <p className="font-retro text-xs text-gray-300 mt-2">
                        {pendingRewards.length > 0
                            ? `有 ${pendingRewards.length} 次待抽獎勵，請到收藏冊抽取。`
                            : '目前沒有待抽獎勵，可以到收藏冊看看已收集的冷知識。'}
                    </p>
                    <RPGButton onClick={onOpenAlbum} color={pendingRewards.length > 0 ? 'success' : 'accent'} className="w-full mt-3">
                        <Book size={14} /> {pendingRewards.length > 0 ? '前往收藏冊抽卡' : '查看冷知識收藏冊'}
                    </RPGButton>
                </section>
            </div>
        </div>
    );
};

const LoginStampModal = ({ data, onClose }) => {
    if (!data) return null;
    const totalDays = Number(data.totalDays) || 0;
    const reachedMilestone = ADVENTURE_MILESTONES.includes(totalDays) ? totalDays : null;
    const nextMilestone = ADVENTURE_MILESTONES.find(milestone => milestone > totalDays);
    const dateLabel = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei', month: 'long', day: 'numeric', weekday: 'short'
    }).format(new Date());
    return (
        <div className="absolute inset-0 z-[80] bg-black/80 flex items-center justify-center p-5" onClick={onClose}>
            <div className="login-stamp-card w-full max-w-xs border-4 border-cyan-300 bg-gradient-to-b from-[#fff8dc] to-[#ead7a4] text-[#2d2347] p-5 text-center shadow-2xl" onClick={event => event.stopPropagation()}>
                <div className="mx-auto w-20 border-4 border-[#2d2347] bg-white shadow-lg">
                    <div className="bg-red-600 text-white font-pixel text-[8px] py-1">TODAY</div>
                    <div className="font-pixel text-2xl py-3">{new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', day: '2-digit' }).format(new Date())}</div>
                </div>
                <p className="font-retro text-sm mt-2">{dateLabel}</p>
                <div className="login-stamp-mark mx-auto my-4 w-28 h-28 rounded-full border-[6px] border-red-600 text-red-600 flex flex-col items-center justify-center -rotate-12 bg-white/40">
                    <span className="font-pixel text-[10px]">CHECK IN</span>
                    <span className="font-retro text-xl font-bold mt-1">打卡成功</span>
                </div>
                <h3 className="font-pixel text-sm text-purple-800">今日冒險打卡成功！</h3>
                <div className="border-2 border-amber-700 bg-white/60 p-3 mt-4">
                    <div className="font-pixel text-2xl">{totalDays}</div>
                    <div className="font-retro text-sm">已累積冒險 {totalDays} 天</div>
                </div>
                <p className="font-retro text-sm font-bold text-purple-800 mt-3">
                    {reachedMilestone
                        ? `達成「累積冒險 ${reachedMilestone} 天」！抽卡已放入每週戰報。`
                        : nextMilestone
                            ? `再冒險 ${nextMilestone - totalDays} 天即可取得下一枚徽章`
                            : '所有累積冒險徽章都已解鎖！'}
                </p>
                <button
                    onClick={onClose}
                    className="mt-5 w-full min-h-12 border-4 border-[#2d2347] bg-gradient-to-b from-red-500 to-red-700 text-white shadow-[4px_4px_0_#2d2347] active:translate-x-1 active:translate-y-1 active:shadow-none transition-transform font-retro font-bold text-base flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-cyan-500/60"
                >
                    <Sword size={18} aria-hidden="true" />
                    收下今日印章
                    <ChevronRight size={18} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
};

const WeeklyArenaSettlementModal = ({ data, onPrimary, onLater }) => {
    const [revealed, setRevealed] = useState(false);
    if (!data) return null;

    const rankMessages = {
        1: { icon: '👑', title: '小隊冠軍！', color: 'text-yellow-300' },
        2: { icon: '🥈', title: '勇者亞軍！', color: 'text-slate-200' },
        3: { icon: '🥉', title: '躋身前三名！', color: 'text-orange-300' }
    };
    const rankMessage = rankMessages[data.rank] || {
        icon: '⚔️',
        title: `上週競技小隊第 ${data.rank} 名`,
        color: 'text-blue-300'
    };
    const rangeLabel = formatWeekRange({ startMs: data.weekStart, endMs: data.weekEnd });
    const settlementTier = getArenaTier(data.tierAfter || data.tier || 'unranked');

    return (
        <div className="absolute inset-0 z-[90] bg-black/85 flex items-center justify-center p-5">
            <div
                className="arena-tier-shell w-full max-w-xs text-white p-5 text-center"
                data-arena-frame={settlementTier.frame}
                style={getArenaTierStyle(settlementTier.id)}
            >
                {!revealed ? (
                    <>
                        <div className="flex justify-center mb-4"><ArenaTierBadge tier={settlementTier.id} size="lg" /></div>
                        <p className="arena-tier-text font-pixel text-[9px]">{rangeLabel}</p>
                        <h3 className="font-pixel text-sm text-white mt-3 leading-relaxed">上週競技場已結算！</h3>
                        <p className="font-retro text-sm text-gray-300 mt-3 leading-relaxed">
                            點擊查看你在競技小隊中的最終名次
                        </p>
                        <RPGButton onClick={() => setRevealed(true)} color="primary" className="w-full mt-5 py-3">
                            揭曉名次
                        </RPGButton>
                    </>
                ) : (
                    <>
                        {data.participated ? (
                            <>
                                <div className="text-6xl mb-3">{rankMessage.icon}</div>
                                <p className={`font-pixel text-sm leading-relaxed ${rankMessage.color}`}>{rankMessage.title}</p>
                                <div className="font-pixel text-4xl text-white mt-4">第 {data.rank} 名</div>
                                <p className="font-retro text-sm text-gray-300 mt-3">
                                    上週累積 {data.score} 分 · 共 {data.participantCount} 人
                                </p>
                                {data.rewardCount > 0 ? (
                                    <div className="border-2 border-amber-400 bg-amber-950/50 p-3 mt-4">
                                        <div className="font-pixel text-lg text-amber-300">+{data.rewardCount} 次</div>
                                        <div className="font-retro text-xs text-amber-100 mt-1">冷知識抽卡獎勵</div>
                                    </div>
                                ) : (
                                    <p className="font-retro text-sm text-blue-200 mt-4">
                                        新的一週已開始，再向前三名發起挑戰吧！
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="text-6xl mb-3">🌙</div>
                                <h3 className="font-pixel text-lg text-gray-300">上週未參賽</h3>
                                <p className="font-retro text-sm text-gray-400 mt-3 leading-relaxed">
                                    上週沒有完成挑戰，因此不顯示競技小隊名次。
                                </p>
                            </>
                        )}
                        <ArenaTierResult data={data} className="mt-4" />

                        <div className="grid grid-cols-1 gap-2 mt-5">
                            <RPGButton onClick={onPrimary} color={data.rewardCount > 0 ? 'success' : 'accent'} className="w-full py-3">
                                {data.rewardCount > 0 ? '前往收藏冊抽卡' : '查看上週戰報'}
                            </RPGButton>
                            <button onClick={onLater} className="w-full min-h-11 border-2 border-blue-500/60 bg-black/30 text-blue-200 hover:bg-blue-950 font-retro text-sm">
                                {data.rewardCount > 0 ? '稍後再抽' : '開始本週冒險'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const LoginCalendar = ({ onBack, userData }) => {
    const todayKey = getTaipeiDateKey();
    const [todayYear, todayMonth] = todayKey.split('-').map(Number);
    const [visibleMonth, setVisibleMonth] = useState({ year: todayYear, month: todayMonth - 1 });
    const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
    const adventureDates = new Set(userData?.engagement?.adventure?.dates || []);
    const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + 1, 0)).getUTCDate();
    const calendarCells = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
    ];
    while (calendarCells.length % 7 !== 0) calendarCells.push(null);

    const changeMonth = delta => {
        const target = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + delta, 1));
        setVisibleMonth({ year: target.getUTCFullYear(), month: target.getUTCMonth() });
        setSelectedDateKey(null);
    };
    const returnToToday = () => {
        setVisibleMonth({ year: todayYear, month: todayMonth - 1 });
        setSelectedDateKey(todayKey);
    };
    const formatCalendarDate = dateKey => {
        if (!dateKey) return '';
        const [year, month, day] = dateKey.split('-').map(Number);
        return new Intl.DateTimeFormat('zh-TW', {
            timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        }).format(new Date(Date.UTC(year, month - 1, day)));
    };

    return (
        <div className="flex flex-col h-full bg-[#171229] text-white">
            <div className="flex items-center justify-between p-3 border-b-4 border-cyan-500/60 bg-black/50">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <div className="text-center">
                    <h2 className="font-pixel text-sm text-cyan-300">冒險打卡日曆</h2>
                    <p className="font-retro text-[10px] text-gray-400">ADVENTURE CHECK-IN · 台北時間</p>
                </div>
                <CalendarDays size={23} className="text-cyan-300" />
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                <section className="border-4 border-cyan-500/50 bg-[#24173a] shadow-xl">
                    <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 p-3 border-b-2 border-cyan-500/30 bg-black/30">
                        <button onClick={() => changeMonth(-1)} className="h-9 border-2 border-gray-600 bg-black/40 hover:bg-cyan-900 flex items-center justify-center" aria-label="上個月"><ChevronLeft size={18} /></button>
                        <button onClick={returnToToday} className="font-pixel text-xs text-cyan-200 hover:text-white" title="回到今天">{visibleMonth.year} 年 {visibleMonth.month + 1} 月</button>
                        <button onClick={() => changeMonth(1)} className="h-9 border-2 border-gray-600 bg-black/40 hover:bg-cyan-900 flex items-center justify-center" aria-label="下個月"><ChevronRight size={18} /></button>
                    </div>

                    <div className="grid grid-cols-7 border-b border-white/10 bg-black/20">
                        {['日', '一', '二', '三', '四', '五', '六'].map(weekday => (
                            <div key={weekday} className="py-2 text-center font-pixel text-[9px] text-gray-400">{weekday}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-white/10">
                        {calendarCells.map((day, index) => {
                            if (!day) return <div key={`empty-${index}`} className="min-h-14 bg-[#16121f]" aria-hidden="true"></div>;
                            const dateKey = `${visibleMonth.year}-${String(visibleMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const adventured = adventureDates.has(dateKey);
                            const selected = selectedDateKey === dateKey;
                            const isToday = dateKey === todayKey;
                            return (
                                <button
                                    key={dateKey}
                                    onClick={() => setSelectedDateKey(dateKey)}
                                    className={`relative min-h-14 p-1 flex flex-col items-center justify-start transition-colors ${adventured ? 'bg-[#efe0b6] text-[#2d2347] hover:bg-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'} ${selected ? 'ring-2 ring-inset ring-cyan-300' : ''}`}
                                    aria-label={`${formatCalendarDate(dateKey)}，${adventured ? '今日打卡已完成' : '今日尚未完成打卡'}`}
                                >
                                    <span className={`font-pixel text-[9px] ${isToday ? 'underline decoration-2 underline-offset-2' : ''}`}>{day}</span>
                                    {adventured && <span className="calendar-stamp mt-1 text-red-700 font-pixel text-[6px] leading-none border-2 border-red-700 rounded-full px-1 py-1 -rotate-12">CHECK<br />IN</span>}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <div className="mt-3 border-2 border-white/15 bg-black/35 p-3 min-h-24">
                    {selectedDateKey ? (
                        <>
                            <div className="font-pixel text-[10px] text-cyan-300">{formatCalendarDate(selectedDateKey)}</div>
                            <div className="mt-3 flex flex-wrap gap-2 font-retro text-xs">
                                <span className={`border px-2 py-1 ${adventureDates.has(selectedDateKey) ? 'border-cyan-400 bg-cyan-950/50 text-cyan-200' : 'border-gray-600 bg-gray-900 text-gray-500'}`}>{adventureDates.has(selectedDateKey) ? '✓ 今日打卡已完成' : '今日尚未完成打卡'}</span>
                            </div>
                        </>
                    ) : <p className="font-retro text-xs text-gray-500">點擊日期查看冒險打卡紀錄。</p>}
                </div>
                <p className="font-retro text-[10px] text-gray-500 mt-3 leading-relaxed">當天完成一場遊戲並取得 B 級以上，即可打卡；每天最多計算一次。</p>
            </div>
        </div>
    );
};

const AchievementHall = ({ onBack, userData }) => {
    const stats = getAchievementStats(userData);
    const claims = userData?.triviaRewardClaims || {};
    const legacyWordCount = new Set(userData?.discoveredWordIds || []).size;
    const legacyUnlocked = LEGACY_WORD_MILESTONES.filter(milestone => legacyWordCount >= milestone);

    return (
        <div className="flex flex-col h-full bg-[#171229] text-white">
            <div className="flex items-center justify-between p-3 border-b-4 border-cyan-500/60 bg-black/50">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <div className="text-center"><h2 className="font-pixel text-sm text-cyan-300">英雄徽章館</h2><p className="font-retro text-[10px] text-gray-400">HERO BADGE HALL</p></div>
                <ShieldCheck size={23} className="text-blue-400" />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <p className="font-retro text-xs text-gray-300 border-2 border-cyan-500/30 bg-cyan-950/30 p-3">
                    每達成一個成就，就會獲得 1 次冷知識抽卡；抽卡統一放在每週戰報最底下。
                </p>
                <div className="grid grid-cols-3 gap-2 font-retro text-[10px] text-center">
                    <div className="border border-purple-300 bg-purple-800/70 py-2 text-white">✓ 已達成</div>
                    <div className="border border-cyan-300 bg-cyan-950/70 py-2 text-cyan-100">● 進行中</div>
                    <div className="border border-gray-700 bg-black/50 py-2 text-gray-500">🔒 未達成</div>
                </div>
                {ACHIEVEMENT_SECTIONS.map(section => {
                    const current = stats[section.id];
                    const next = section.milestones.find(value => value > current);
                    const progress = next ? Math.min((current / next) * 100, 100) : 100;
                    return (
                        <section key={section.id} className="border-2 border-white/15 bg-black/30 p-3">
                            <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-pixel text-[11px] text-yellow-300">{section.icon} {section.title}</h3>
                                    <p className="font-retro text-[10px] text-gray-400 mt-1">目前 {current} {section.unit}{next ? ` · 下一個 ${next}` : ' · 全部完成'}</p>
                                </div>
                                <span className="font-pixel text-xl text-cyan-300">{current}</span>
                            </div>
                            <div className="mt-3">
                                <div className="flex justify-between font-retro text-[10px] text-gray-300 mb-1">
                                    <span>{next ? `進行中 ${current} / ${next}` : '所有里程碑已完成'}</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-3 bg-black/70 border border-white/15">
                                    <div className="h-full bg-gradient-to-r from-cyan-500 via-purple-400 to-yellow-300 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {section.milestones.map(milestone => {
                                    const unlocked = current >= milestone;
                                    const inProgress = !unlocked && milestone === next;
                                    const isSpecial = section.special.includes(milestone);
                                    const rewardKey = getAchievementRewardKey(section.id, milestone);
                                    const rewardClaimed = Boolean(claims[rewardKey]);
                                    return (
                                        <div key={milestone} className={`aspect-square border-2 flex flex-col items-center justify-center text-center mt-3 ${unlocked ? isSpecial ? 'achievement-special border-yellow-300 text-yellow-100' : 'bg-purple-800/70 border-purple-300 text-white' : inProgress ? 'bg-cyan-950/70 border-cyan-300 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.35)]' : 'bg-black/50 border-gray-700 text-gray-600'}`} title={`${section.title} ${milestone} ${section.unit}`}>
                                            <span className={`text-xl ${unlocked || inProgress ? '' : 'grayscale opacity-30'}`}>{unlocked || inProgress ? section.icon : '🔒'}</span>
                                            <span className="font-pixel text-[8px] mt-1">{milestone}</span>
                                            {unlocked && <span className="font-retro text-[7px] mt-1">{rewardClaimed ? '✓ 已抽卡' : '🎫 待抽卡'}</span>}
                                            {inProgress && <span className="font-retro text-[7px] mt-1 text-cyan-200">進行中</span>}
                                            {!inProgress && isSpecial && <span className="font-pixel text-[5px] mt-0.5">SPECIAL</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
                {legacyUnlocked.length > 0 && (
                    <section className="border-2 border-amber-500/40 bg-amber-950/15 p-3">
                        <div className="flex justify-between items-start gap-3">
                            <div>
                                <h3 className="font-pixel text-[11px] text-amber-300">📜 舊版探索單字</h3>
                                <p className="font-retro text-[10px] text-gray-400 mt-1">過去已取得的徽章永久保留；新版改由答對單字累積。</p>
                            </div>
                            <span className="font-pixel text-xl text-amber-300">{legacyWordCount}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-3">
                            {legacyUnlocked.map(milestone => {
                                const rewardClaimed = Boolean(claims[`achievement:legacyWords:${milestone}`]);
                                return (
                                    <div key={milestone} className="aspect-square border-2 border-purple-300 bg-purple-800/70 text-white flex flex-col items-center justify-center text-center">
                                        <span className="text-xl">🔤</span>
                                        <span className="font-pixel text-[8px] mt-1">{milestone}</span>
                                        <span className="font-retro text-[7px] mt-1">{rewardClaimed ? '✓ 已抽卡' : '🎫 待抽卡'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

const PhraseLibraryMap = ({ progressByGroup = {}, onSelectGroup }) => {
    const [expandedPart, setExpandedPart] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const queryText = searchTerm.trim().toLocaleLowerCase('en');
    const searchResults = queryText
        ? PHRASE_PARTS.flatMap(part => part.groups.flatMap(group => group.phrases
            .filter(phrase => `${phrase.word} ${phrase.chinese}`.toLocaleLowerCase('en').includes(queryText))
            .map(phrase => ({ part, group, phrase }))))
        : [];

    return (
        <div className="space-y-4">
            <div className="max-w-xs mx-auto border-4 border-teal-500 bg-[#102c31] p-3 shadow-[4px_4px_0_#071416]">
                <label htmlFor="phrase-library-search" className="font-pixel text-[10px] text-teal-200 flex items-center gap-2 mb-2">
                    <Search size={14} /> 搜尋完整片語庫
                </label>
                <input
                    id="phrase-library-search"
                    type="search"
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    placeholder="輸入英文或中文..."
                    className="w-full bg-black/60 border-2 border-teal-400 px-3 py-2 text-white font-retro text-base outline-none focus:border-yellow-300"
                />
                <p className="font-retro text-[10px] text-teal-100/70 mt-2">9 個 Part · 75 個群組 · 830 筆片語</p>
            </div>

            {queryText ? (
                <div className="max-w-xs mx-auto space-y-2">
                    <div className="font-pixel text-[10px] text-teal-200">找到 {searchResults.length} 筆</div>
                    {searchResults.length === 0 ? (
                        <div className="border-2 border-gray-700 bg-black/40 p-6 text-center font-retro text-gray-400">找不到符合的片語</div>
                    ) : searchResults.slice(0, 80).map(({ part, group, phrase }) => (
                        <button
                            key={phrase.id}
                            onClick={() => { playSound('click'); onSelectGroup(group, part); }}
                            className="w-full border-2 border-teal-700 bg-black/55 hover:bg-teal-950 p-3 text-left flex items-center gap-3"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="font-retro text-base text-white font-bold truncate">{phrase.word}</div>
                                <div className="font-retro text-sm text-teal-200 truncate">{phrase.chinese}</div>
                                <div className="font-pixel text-[8px] text-gray-500 mt-1 truncate">{group.title}</div>
                            </div>
                            <ChevronRight size={18} className="text-teal-300 shrink-0" />
                        </button>
                    ))}
                    {searchResults.length > 80 && (
                        <p className="font-retro text-xs text-center text-gray-400">結果較多，請輸入更完整的關鍵字。</p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {PHRASE_PARTS.map(part => {
                        const isExpanded = expandedPart === part.id;
                        const completedGroups = part.groups.filter(group => normalizePhraseProgress(progressByGroup[group.id]).completed).length;
                        return (
                            <section key={part.id} className="max-w-xs mx-auto">
                                <button
                                    onClick={() => {
                                        playSound('click');
                                        setExpandedPart(isExpanded ? null : part.id);
                                    }}
                                    aria-expanded={isExpanded}
                                    className="w-full border-4 border-teal-700 bg-gradient-to-b from-[#d8f2ec] to-[#8fc9bf] text-[#123b3b] p-3 flex items-center gap-3 text-left shadow-[4px_4px_0_#071416] active:translate-y-1"
                                >
                                    <Book size={28} className="shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-pixel text-[10px] leading-relaxed">{part.title}</h3>
                                        <p className="font-retro text-xs mt-1">完成 {completedGroups}/{part.groups.length} 群組</p>
                                    </div>
                                    <ChevronRight size={20} className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>

                                {isExpanded && (
                                    <div className="pt-3 space-y-3">
                                        {part.groups.map(group => {
                                            const progress = normalizePhraseProgress(progressByGroup[group.id]);
                                            return (
                                                <button
                                                    key={group.id}
                                                    onClick={() => { playSound('click'); onSelectGroup(group, part); }}
                                                    className={`w-full border-4 p-3 text-left flex items-center gap-3 shadow-lg transition-transform hover:scale-[1.01] active:scale-95 ${progress.completed ? 'border-yellow-400 bg-teal-950' : 'border-teal-700 bg-[#173b42]'}`}
                                                >
                                                    <div className="relative w-12 h-12 shrink-0 flex items-center justify-center" title={`${group.phraseCount} 筆片語`}>
                                                        <PixelArt.Scroll className="w-12 h-12 drop-shadow-md" />
                                                        <span className="absolute -right-1 -bottom-1 min-w-5 h-5 px-1 border-2 border-teal-200 bg-teal-950 text-teal-100 font-pixel text-[7px] leading-none flex items-center justify-center">
                                                            {group.phraseCount}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className={`font-pixel text-[10px] leading-relaxed ${progress.completed ? 'text-yellow-300' : 'text-white'}`}>{group.title}</h4>
                                                        <div className="mt-2 flex items-center justify-between gap-2">
                                                            <PhraseMarks record={progress} size="sm" />
                                                            <span className="font-retro text-[10px] text-gray-400">通關 {progress.clears} 次</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-teal-300 shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const WorldMap = ({ onSelectNode, onViewJourney, onViewWeeklyReport, onOpenAchievements, onOpenAlbum, rewardSummary = {}, userData, onUltimateChallenge, onViewMistakeNotebook, onLogout, records = {}, advMeta = null, activeTab = 'main', onChangeTab }) => {
    const [showGuide, setShowGuide] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [expandedAdvVolume, setExpandedAdvVolume] = useState(null);
    const [showAdvSearch, setShowAdvSearch] = useState(false);
    const [advSearchTerm, setAdvSearchTerm] = useState('');
    const [advSearchResults, setAdvSearchResults] = useState(null);
    const [isAdvSearching, setIsAdvSearching] = useState(false);
    const [advSearchError, setAdvSearchError] = useState('');
    const deferredTriviaCount = rewardSummary.totalPendingCount || 0;
    const upcomingAchievement = getUpcomingAchievements(userData, 1)[0] || null;
    const todayCheckedIn = (userData?.engagement?.adventure?.dates || []).includes(getTaipeiDateKey());
    const currentArenaTier = getArenaTier(
        normalizeArenaTierProgress(userData?.arenaTierProgress).currentTier
    );
    const reportSummary = !todayCheckedIn
        ? '📅 本日打卡　0 / 1'
        : upcomingAchievement
            ? `${upcomingAchievement.icon} ${upcomingAchievement.title}還差 ${upcomingAchievement.remaining} ${upcomingAchievement.unit}　${upcomingAchievement.current} / ${upcomingAchievement.next}`
            : '所有徽章都已解鎖！';

    const closeAdvancedSearch = () => {
        setShowAdvSearch(false);
        setAdvSearchTerm('');
        setAdvSearchResults(null);
        setAdvSearchError('');
    };

    const handleAdvancedSearch = async (event) => {
        event.preventDefault();
        const term = advSearchTerm.trim();
        if (!term || isAdvSearching) return;

        setIsAdvSearching(true);
        setAdvSearchError('');
        setAdvSearchResults(null);
        try {
            setAdvSearchResults(await searchAdvancedWords(term));
        } catch (error) {
            console.error('Advanced word search failed:', error);
            setAdvSearchError('搜尋失敗，請檢查網路後再試一次。');
        } finally {
            setIsAdvSearching(false);
        }
    };

    return (
        <div className="relative flex flex-col h-full bg-[#3d2963]">
            {showGuide && <AchievementGuide onClose={() => setShowGuide(false)} />}
            {showAdvSearch && (
                <div className="absolute inset-0 z-[140] bg-black/85 backdrop-blur-sm flex items-start justify-center p-4 pt-12" onClick={closeAdvancedSearch}>
                    <div className="w-full max-w-sm bg-[#171229] border-4 border-purple-400 shadow-[6px_6px_0_#09050f] p-4" onClick={event => event.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-pixel text-sm text-purple-200">搜尋進階單字</h3>
                                <p className="font-retro text-[11px] text-gray-400 mt-1">輸入完整英文單字，找到後直接前往該課</p>
                            </div>
                            <button onClick={closeAdvancedSearch} className="text-gray-500 hover:text-white p-1" aria-label="關閉搜尋">
                                <XCircle size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleAdvancedSearch} className="flex gap-2">
                            <input
                                type="search"
                                value={advSearchTerm}
                                onChange={event => setAdvSearchTerm(event.target.value)}
                                placeholder="例如：adventure"
                                autoFocus
                                className="min-w-0 flex-1 bg-black/60 border-2 border-purple-500 px-3 py-2 text-white font-retro text-base outline-none focus:border-yellow-300"
                            />
                            <RPGButton type="submit" color="secondary" className="px-3" disabled={!advSearchTerm.trim() || isAdvSearching} aria-label="搜尋">
                                <Search size={18} />
                            </RPGButton>
                        </form>

                        <div className="mt-4 max-h-72 overflow-y-auto">
                            {isAdvSearching && (
                                <div className="py-8 text-center font-pixel text-xs text-purple-200 animate-pulse">SEARCHING...</div>
                            )}
                            {advSearchError && (
                                <div className="border-2 border-red-700 bg-red-950/50 p-3 font-retro text-sm text-red-200">{advSearchError}</div>
                            )}
                            {!isAdvSearching && advSearchResults?.length === 0 && (
                                <div className="border-2 border-gray-700 bg-black/30 p-4 text-center">
                                    <p className="font-pixel text-xs text-gray-300">找不到這個單字</p>
                                    <p className="font-retro text-xs text-gray-500 mt-2">請確認拼字，搜尋目前需輸入完整單字。</p>
                                </div>
                            )}
                            {!isAdvSearching && advSearchResults?.map(result => (
                                <button
                                    key={result.id}
                                    onClick={() => {
                                        playSound('click');
                                        closeAdvancedSearch();
                                        onSelectNode({ type: 'adv', id: advLessonId(result.lesson), lesson: result.lesson });
                                    }}
                                    className="w-full mb-2 border-2 border-purple-600 bg-purple-950/60 hover:bg-purple-900 p-3 flex items-center gap-3 text-left transition-colors"
                                >
                                    <div className="w-12 h-12 shrink-0 border-2 border-purple-300 bg-black/40 flex items-center justify-center font-pixel text-xs text-yellow-300">
                                        L{String(result.lesson).padStart(3, '0')}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-pixel text-xs text-white truncate">{result.word}</div>
                                        <div className="font-retro text-sm text-purple-200 mt-1 truncate">{result.part} {result.chinese}</div>
                                    </div>
                                    <ChevronRight size={18} className="shrink-0 text-purple-300" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
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
                    <button onClick={onOpenAlbum} className="relative text-amber-300 hover:text-white p-1" title={deferredTriviaCount > 0 ? `有 ${deferredTriviaCount} 次待抽卡，請到每週戰報抽取` : '冷知識收藏冊'}>
                        <Lightbulb size={21} />
                        {deferredTriviaCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white font-pixel text-[7px] flex items-center justify-center border border-white">{deferredTriviaCount > 99 ? '99+' : deferredTriviaCount}</span>}
                    </button>
                    <button onClick={onOpenAchievements} className="text-blue-400 hover:text-white p-1" title="英雄徽章館" aria-label="打開英雄徽章館">
                        <ShieldCheck size={21} />
                    </button>
                    <button onClick={onViewMistakeNotebook} className="text-red-400 hover:text-red-300 p-1" title="錯題筆記本">
                        <Book size={20} />
                    </button>
                    <button onClick={onViewJourney} className="text-rpg-accent hover:text-white p-1" title="我的冒險旅程">
                        <Backpack size={20} />
                    </button>
                </div>
            </div>
            {/* 主線 / 進階 / 完整片語庫切換 */}
            <div className="flex bg-black/60 border-b-4 border-rpg-border z-10">
                <button
                    onClick={() => { playSound('click'); onChangeTab && onChangeTab('main'); }}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${activeTab === 'main' ? 'bg-rpg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ⚔ 主線冒險
                </button>
                <button
                    onClick={() => { playSound('click'); onChangeTab && onChangeTab('adv'); }}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${activeTab === 'adv' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ✦ 進階篇章
                </button>
                <button
                    onClick={() => { playSound('click'); onChangeTab && onChangeTab('phrases'); }}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${activeTab === 'phrases' ? 'bg-teal-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ▣ 完整片語庫
                </button>
            </div>
            <div className="world-status-row bg-[#171229] border-b-2 border-yellow-500/35 px-2 py-2 flex items-center gap-2 z-10">
                <button
                    onClick={onViewWeeklyReport}
                    className="arena-tier-record-card relative flex-1 min-w-0 px-2 py-2 text-left transition-colors"
                    data-arena-frame={currentArenaTier.frame}
                    style={getArenaTierStyle(currentArenaTier.id)}
                    aria-label={`開啟每週戰報，本週階級 ${currentArenaTier.shortLabel}，${reportSummary}`}
                >
                    <div className="flex items-center gap-2">
                        <ArenaTierBadge tier={currentArenaTier.id} size="sm" showLabel={false} />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-pixel text-[9px] arena-tier-text">每週戰報</span>
                                <span className="font-pixel text-[8px] arena-tier-text">本週 {currentArenaTier.shortLabel}</span>
                            </div>
                            <div className="font-retro text-[11px] text-yellow-100 truncate mt-1" aria-label="近期即將完成的成就">
                                {reportSummary}
                            </div>
                        </div>
                    </div>
                </button>
                <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="shrink-0 h-full min-h-11 px-3 bg-[#1a1a1a] border-2 border-[#444] hover:bg-red-900 transition-colors flex flex-col items-center justify-center gap-1"
                    title="登出"
                    aria-label="登出"
                >
                    <LogOut size={16} color="#ddd" />
                    <span className="font-retro text-[9px] text-gray-300">登出</span>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto relative p-4 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]">
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
                    return (
                        <div>
                            <div className="w-full max-w-xs h-10 mx-auto mb-2 flex items-center justify-end">
                                <button
                                    onClick={() => {
                                        playSound('click');
                                        setShowAdvSearch(true);
                                    }}
                                    className="w-9 h-9 rounded-full border-2 border-slate-600 bg-black/85 text-purple-200 hover:bg-purple-950 hover:text-white shadow-[0_3px_8px_rgba(0,0,0,0.7)] flex items-center justify-center transition-transform active:scale-95"
                                    title="搜尋進階單字"
                                    aria-label="搜尋進階單字"
                                >
                                    <Search size={16} />
                                </button>
                            </div>

                            <div className="space-y-4">
                            {getAdvancedMapVolumes(totalLessons).map(volume => {
                                const isExpanded = expandedAdvVolume === volume.index;
                                const completedLessons = volume.lessons.filter(lesson =>
                                    getAdvancedQualifiedClears(records[advLessonId(lesson)] || {}) >= ADV_CLEARS_TO_COMPLETE
                                ).length;
                                const isVolumeComplete = completedLessons === volume.lessons.length;

                                return (
                                    <section key={volume.index} className="w-full flex flex-col items-center">
                                        <div className="relative w-full max-w-xs">
                                            <button
                                                onClick={() => {
                                                    playSound('click');
                                                    setExpandedAdvVolume(isExpanded ? null : volume.index);
                                                }}
                                                className="relative w-full border-4 border-[#4a3c31] bg-gradient-to-b from-[#f6e7bd] via-[#e3ce9c] to-[#caa66f] text-[#291b3f] shadow-[4px_4px_0_#160d24] px-4 py-3 flex items-center gap-3 text-left transition-transform active:translate-y-1 active:shadow-[2px_2px_0_#160d24]"
                                                aria-expanded={isExpanded}
                                            >
                                                <div className="absolute -left-2 top-1 bottom-1 w-3 rounded-full border-2 border-[#4a3c31] bg-[#b8894e]" aria-hidden="true"></div>
                                                <div className="absolute -right-2 top-1 bottom-1 w-3 rounded-full border-2 border-[#4a3c31] bg-[#b8894e]" aria-hidden="true"></div>
                                                <Scroll size={28} className="shrink-0 text-purple-900" />
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-pixel text-sm">進階 第 {volume.index + 1} 卷</h3>
                                                    <p className="font-retro text-[11px] mt-1">Lesson {volume.start} - {volume.end} · 完成 {completedLessons}/{volume.lessons.length}</p>
                                                </div>
                                                {isVolumeComplete && (
                                                    <span
                                                        className="shrink-0 rounded-full border-2 border-green-800 bg-green-100 p-1 text-green-800 shadow-[1px_1px_0_rgba(41,27,63,0.45)]"
                                                        title="本卷已完成"
                                                        aria-label={`進階第 ${volume.index + 1} 卷已完成`}
                                                    >
                                                        <CheckCircle size={22} strokeWidth={3} aria-hidden="true" />
                                                    </span>
                                                )}
                                                <ChevronRight size={20} className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="w-full pt-5 space-y-6 flex flex-col items-center">
                                                {volume.lessons.map((lesson, lessonIndex) => {
                                                    const record = records[advLessonId(lesson)] || {};
                                                    const clears = getAdvancedQualifiedClears(record);
                                                    const starCount = Math.min(clears, ADV_CLEARS_TO_COMPLETE);
                                                    const isDone = clears >= ADV_CLEARS_TO_COMPLETE;
                                                    const title = advMeta?.titles?.[String(lesson)] || `進階單字 第 ${lesson} 課`;

                                                    return (
                                                        <div key={lesson} className="relative flex justify-center w-full">
                                                            {lessonIndex > 0 && <div className="absolute -top-6 h-6 w-1 bg-purple-400/40"></div>}
                                                            <button
                                                                onClick={() => { playSound('click'); onSelectNode({ type: 'adv', id: advLessonId(lesson), lesson }); }}
                                                                className={`relative w-full max-w-xs p-2 border-4 transition-all hover:scale-[1.02] active:scale-95 text-left group flex items-center gap-3 shadow-xl ${isDone ? 'bg-purple-950 border-yellow-400' : 'bg-gradient-to-b from-[#d8dce5] to-[#aeb8c9] border-[#596579]'}`}
                                                            >
                                                                <div className="w-14 h-14 flex-shrink-0 border-2 border-black overflow-hidden flex items-center justify-center bg-purple-900">
                                                                    <PixelArt.Chest />
                                                                </div>
                                                                <div className="flex-1 overflow-hidden">
                                                                    <div className="flex justify-between items-baseline">
                                                                        <h3 className={`font-pixel text-lg leading-tight ${isDone ? 'text-yellow-300' : 'text-rpg-bg'}`}>L{String(lesson).padStart(3, '0')}</h3>
                                                                        <AdvancedStars grades={getAdvancedStarGrades(record)} count={starCount} size="sm" label={`第 ${lesson} 課已取得 ${starCount} 顆星`} />
                                                                    </div>
                                                                    <p className={`font-retro text-[12px] mt-1 leading-snug truncate ${isDone ? 'text-purple-200' : 'text-[#342d3d]'}`}>{title}</p>
                                                                </div>
                                                                {isDone && (
                                                                    <div className="text-yellow-400 font-pixel text-xl drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" title="通關 3 次達成！">✔</div>
                                                                )}
                                                                <ChevronRight className={isDone ? 'text-yellow-400' : 'text-rpg-bg'} size={16} />
                                                            </button>
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
                })()}
                {activeTab === 'phrases' && (
                    <PhraseLibraryMap
                        progressByGroup={userData?.phraseProgress || {}}
                        onSelectGroup={(group, part) => onSelectNode({ type: 'phrase', id: group.id, partId: part.id })}
                    />
                )}
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
        (record.attempts || 0) > 0 || getAdvancedQualifiedClears(record) > 0 || Boolean(record.bestGrade)
    );
    const completedLessons = lessonRecords.filter(({ record }) => getAdvancedQualifiedClears(record) >= ADV_CLEARS_TO_COMPLETE).length;
    const earnedStars = lessonRecords.reduce((sum, { record }) => sum + Math.min(getAdvancedQualifiedClears(record), ADV_CLEARS_TO_COMPLETE), 0);
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
            const nextLesson = lessonRecords.find(({ record }) => getAdvancedQualifiedClears(record) < ADV_CLEARS_TO_COMPLETE);
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
                    const volumeStars = volumeLessons.reduce((sum, { record }) => sum + Math.min(getAdvancedQualifiedClears(record), ADV_CLEARS_TO_COMPLETE), 0);
                    const volumeCompleted = volumeLessons.filter(({ record }) => getAdvancedQualifiedClears(record) >= ADV_CLEARS_TO_COMPLETE).length;
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
                                        const clears = Math.min(getAdvancedQualifiedClears(record), ADV_CLEARS_TO_COMPLETE);
                                        const hasPlayed = Object.keys(record).length > 0;
                                        const attempts = record.attempts ?? Math.max(record.clears || 0, clears, 0);
                                        return (
                                            <div key={lesson} className={`p-2 border flex items-center justify-between ${hasPlayed ? 'bg-purple-950/50 border-purple-700' : 'bg-gray-900/50 border-gray-800 opacity-60'}`}>
                                                <div className="min-w-0 pr-2">
                                                    <div className="font-pixel text-[10px] text-white">L{String(lesson).padStart(3, '0')} · {advMeta?.titles?.[String(lesson)] || `進階單字 第 ${lesson} 課`}</div>
                                                    <div className="font-retro text-[10px] text-gray-400 mt-1">{hasPlayed ? `${attempts} 次挑戰 · ${formatDate(record.lastPlayed)}` : '尚未挑戰'}</div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <AdvancedStars grades={getAdvancedStarGrades(record)} count={clears} size="sm" label={`第 ${lesson} 課已取得 ${clears} 顆星`} />
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

const PhraseJourneyView = ({ progressByGroup = {}, mistakeStats = {} }) => {
    const [expandedPart, setExpandedPart] = useState(null);
    const gradePoints = { S: 100, A: 90, B: 80, '?': 0 };
    const gradeColors = { S: '#fde047', A: '#86efac', B: '#93c5fd', '?': '#6b7280' };
    const groupRecords = PHRASE_GROUPS.map(group => ({
        group,
        progress: normalizePhraseProgress(progressByGroup[group.id])
    }));
    const attemptedGroups = groupRecords.filter(({ progress }) => progress.attempts > 0);
    const completedGroups = groupRecords.filter(({ progress }) => progress.completed);
    const totalAttempts = groupRecords.reduce((sum, { progress }) => sum + progress.attempts, 0);
    const totalClears = groupRecords.reduce((sum, { progress }) => sum + progress.clears, 0);
    const earnedMarks = groupRecords.reduce((sum, { progress }) => sum + Math.min(progress.clears, PHRASE_CLEAR_TARGET), 0);
    const maxMarks = PHRASE_GROUPS.length * PHRASE_CLEAR_TARGET;
    const markProgress = maxMarks > 0 ? earnedMarks / maxMarks : 0;
    const gradeCoverage = PHRASE_GROUPS.length > 0
        ? groupRecords.reduce((sum, { progress }) => sum + (gradePoints[progress.bestGrade] || 0), 0) / (PHRASE_GROUPS.length * 100)
        : 0;
    const mastery = Math.round((markProgress * 0.65 + gradeCoverage * 0.35) * 100);
    const title = mastery >= 95 ? '片語宗師'
        : mastery >= 80 ? '片語達人'
            : mastery >= 60 ? '片語高手'
                : mastery >= 40 ? '穩定挑戰者'
                    : mastery >= 20 ? '片語學徒'
                        : '片語探索者';
    const passRate = totalAttempts > 0 ? Math.round((totalClears / totalAttempts) * 100) : null;
    const gradeDistribution = ['S', 'A', 'B'].reduce((counts, grade) => {
        counts[grade] = attemptedGroups.filter(({ progress }) => progress.bestGrade === grade).length;
        return counts;
    }, {});
    const ungradedCount = attemptedGroups.filter(({ progress }) => !progress.bestGrade).length;

    const phraseMistakes = Object.values(mistakeStats).filter(data =>
        data?.source === 'phrases' && Boolean(data?.groupId) && (data.count || 0) > 0
    );
    const mistakesByGroup = phraseMistakes.reduce((groups, data) => {
        const groupId = data.groupId;
        if (!groups[groupId]) groups[groupId] = { groupId, phraseCount: 0, errorCount: 0 };
        groups[groupId].phraseCount += 1;
        groups[groupId].errorCount += Number(data.count) || 0;
        return groups;
    }, {});
    const weakestGroups = Object.values(mistakesByGroup)
        .map(item => ({ ...item, group: PHRASE_GROUP_BY_ID.get(item.groupId) }))
        .filter(item => item.group)
        .sort((a, b) => b.phraseCount - a.phraseCount || b.errorCount - a.errorCount)
        .slice(0, 3);
    const totalErrorCount = phraseMistakes.reduce((sum, data) => sum + (Number(data.count) || 0), 0);

    const nearCompletion = groupRecords
        .filter(({ progress }) => progress.attempts > 0 && !progress.completed)
        .sort((a, b) => b.progress.clears - a.progress.clears || b.progress.bestScore - a.progress.bestScore)[0];
    const firstUnattempted = groupRecords.find(({ progress }) => progress.attempts === 0);
    const recommendation = weakestGroups.length > 0
        ? { group: weakestGroups[0].group, reason: `目前有 ${weakestGroups[0].phraseCount} 筆錯題，建議優先複習後再挑戰` }
        : nearCompletion
            ? { group: nearCompletion.group, reason: `已取得 ${Math.min(nearCompletion.progress.clears, PHRASE_CLEAR_TARGET)}/${PHRASE_CLEAR_TARGET} 個勾勾，最接近完成` }
            : firstUnattempted
                ? { group: firstUnattempted.group, reason: '從尚未挑戰的群組繼續擴大片語範圍' }
                : null;

    const formatDate = (timestamp) => {
        if (!timestamp) return '尚未挑戰';
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return '資料累積中';
        return new Intl.DateTimeFormat('zh-TW', {
            timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(date);
    };

    const averageGrade = (groups) => {
        const played = groups
            .map(group => gradePoints[normalizePhraseProgress(progressByGroup[group.id]).bestGrade] || 0)
            .filter(score => score > 0);
        if (played.length === 0) return '?';
        const score = played.reduce((sum, value) => sum + value, 0) / played.length;
        if (score >= 95) return 'S';
        if (score >= 85) return 'A';
        return 'B';
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 bg-[#071f25] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
            <section className="mb-5 border-4 border-teal-500 bg-gradient-to-b from-teal-950 to-black p-4 shadow-[0_0_24px_rgba(20,184,166,0.25)]">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p className="font-pixel text-[9px] text-teal-300">PHRASE PROFICIENCY REPORT</p>
                        <h3 className="font-pixel text-sm text-white mt-1">片語能力分析</h3>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="font-pixel text-yellow-300 text-sm">{title}</div>
                        <div className="font-retro text-[10px] text-gray-400">片語掌握度 {mastery}%</div>
                    </div>
                </div>

                <div className="h-3 bg-black border border-teal-700 mb-4 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-yellow-400 transition-all" style={{ width: `${mastery}%` }}></div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/5 border border-teal-700/70 p-2">
                        <div className="font-retro text-[10px] text-gray-400">完成進度</div>
                        <div className="font-pixel text-sm text-white mt-1">{completedGroups.length}/{PHRASE_GROUPS.length} 群組</div>
                        <div className="font-retro text-[10px] text-yellow-300 mt-1">✓ {earnedMarks}/{maxMarks} 勾勾</div>
                    </div>
                    <div className="bg-white/5 border border-teal-700/70 p-2">
                        <div className="font-retro text-[10px] text-gray-400">有效通關率</div>
                        <div className="font-pixel text-sm text-white mt-1">{passRate === null ? '累積中' : `${passRate}%`}</div>
                        <div className="font-retro text-[10px] text-gray-400 mt-1">{totalClears}/{totalAttempts} 次達 B 以上</div>
                    </div>
                    <div className="bg-white/5 border border-teal-700/70 p-2">
                        <div className="font-retro text-[10px] text-gray-400">目前片語錯題</div>
                        <div className="font-pixel text-sm text-red-300 mt-1">{phraseMistakes.length} 筆</div>
                        <div className="font-retro text-[10px] text-gray-400 mt-1">累積 {totalErrorCount} 次錯誤</div>
                    </div>
                    <div className="bg-white/5 border border-teal-700/70 p-2">
                        <div className="font-retro text-[10px] text-gray-400">已挑戰範圍</div>
                        <div className="font-pixel text-sm text-cyan-300 mt-1">{attemptedGroups.length} 群組</div>
                        <div className="font-retro text-[10px] text-gray-400 mt-1">共 {totalAttempts} 次挑戰</div>
                    </div>
                </div>

                {weakestGroups.length > 0 && (
                    <div className="mb-3">
                        <div className="font-retro text-[10px] text-gray-400 mb-1">錯題較集中的群組</div>
                        <div className="flex flex-wrap gap-2">
                            {weakestGroups.map(item => (
                                <span key={item.groupId} className="font-pixel text-[9px] text-red-200 bg-red-950 border border-red-700 px-2 py-1">
                                    {item.group.title} · {item.phraseCount} 筆
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-3">
                    <div className="font-retro text-[10px] text-gray-400 mb-1">群組最佳評級分布</div>
                    <div className="grid grid-cols-4 gap-1">
                        {['S', 'A', 'B'].map(grade => (
                            <div key={grade} className="bg-black/50 border border-gray-700 py-1 text-center">
                                <div className="font-pixel text-[9px]" style={{ color: gradeColors[grade] }}>{grade}</div>
                                <div className="font-retro text-[10px] text-white mt-1">{gradeDistribution[grade]}</div>
                            </div>
                        ))}
                        <div className="bg-black/50 border border-gray-700 py-1 text-center">
                            <div className="font-pixel text-[9px] text-gray-500">—</div>
                            <div className="font-retro text-[10px] text-white mt-1">{ungradedCount}</div>
                        </div>
                    </div>
                </div>

                {recommendation && (
                    <div className="bg-yellow-950/50 border-2 border-yellow-600 p-2 flex gap-2 items-start">
                        <Lightbulb size={18} className="text-yellow-300 flex-shrink-0" />
                        <div>
                            <div className="font-pixel text-[10px] text-yellow-300">下一步：{recommendation.group.title}</div>
                            <div className="font-retro text-xs text-gray-300 mt-1">{recommendation.reason}</div>
                        </div>
                    </div>
                )}

                <p className="font-retro text-[9px] text-gray-600 mt-3 text-center">掌握度綜合勾勾完成率與各群組最佳評級計算，供學習規劃參考。</p>
            </section>

            <div className="space-y-3 pb-10">
                {PHRASE_PARTS.map((part, partIndex) => {
                    const partGroups = part.groups || [];
                    const partProgress = partGroups.map(group => normalizePhraseProgress(progressByGroup[group.id]));
                    const partAttempted = partProgress.filter(progress => progress.attempts > 0).length;
                    const partCompleted = partProgress.filter(progress => progress.completed).length;
                    const partMarks = partProgress.reduce((sum, progress) => sum + Math.min(progress.clears, PHRASE_CLEAR_TARGET), 0);
                    const grade = averageGrade(partGroups);
                    const isExpanded = expandedPart === part.id;
                    return (
                        <section key={part.id} className="border-2 border-teal-700 bg-black/50">
                            <button
                                onClick={() => { playSound('click'); setExpandedPart(isExpanded ? null : part.id); }}
                                className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-teal-900/40 transition-colors"
                            >
                                <div className="min-w-0">
                                    <div className="font-pixel text-[10px] text-teal-200 leading-relaxed">PART {String(partIndex + 1).padStart(2, '0')}</div>
                                    <div className="font-retro text-[10px] text-gray-400 mt-1 truncate">{part.title} · 完成 {partCompleted}/{partGroups.length}</div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-right">
                                        <div className="font-pixel text-[9px] text-yellow-300">✓ {partMarks}/{partGroups.length * PHRASE_CLEAR_TARGET}</div>
                                        <div className="font-pixel text-[9px] mt-1" style={{ color: gradeColors[grade] }}>AVG {grade}</div>
                                    </div>
                                    <ChevronRight size={18} className={`text-teal-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-teal-800 p-2 space-y-2">
                                    <div className="font-retro text-[9px] text-teal-300 px-1">已挑戰 {partAttempted}/{partGroups.length} 群組</div>
                                    {partGroups.map(group => {
                                        const progress = normalizePhraseProgress(progressByGroup[group.id]);
                                        const hasPlayed = progress.attempts > 0;
                                        return (
                                            <div key={group.id} className={`p-2 border flex items-center justify-between gap-2 ${hasPlayed ? 'bg-teal-950/50 border-teal-700' : 'bg-gray-900/50 border-gray-800 opacity-60'}`}>
                                                <div className="min-w-0 pr-1">
                                                    <div className={`font-pixel text-[10px] leading-relaxed ${progress.completed ? 'text-yellow-300' : 'text-white'}`}>{group.title}</div>
                                                    <div className="font-retro text-[10px] text-gray-400 mt-1">
                                                        {hasPlayed ? `${progress.attempts} 次挑戰 · 最高 ${progress.bestScore} 分 · ${formatDate(progress.lastPlayedAt)}` : '尚未挑戰'}
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <PhraseMarks record={progress} size="sm" />
                                                    <div className="font-pixel text-[9px] mt-1" style={{ color: gradeColors[progress.bestGrade || '?'] }}>
                                                        {hasPlayed ? `BEST ${progress.bestGrade || '—'}` : '—'}
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

const JourneyMode = ({ onBack, onViewTrialLog, records = {}, advMeta = null, mistakeStats = {}, phraseProgress = {}, arenaTierProgress = {} }) => {
    const [flippedCards, setFlippedCards] = useState({});
    const [showDashboard, setShowDashboard] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [activeTab, setActiveTab] = useState('main');
    const normalizedArenaProgress = normalizeArenaTierProgress(arenaTierProgress);
    const highestArenaTier = getArenaTier(normalizedArenaProgress.highestTier);
    const highestTierDate = normalizedArenaProgress.highestTierReachedAt
        ? new Intl.DateTimeFormat('zh-TW', {
            timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric'
        }).format(new Date(normalizedArenaProgress.highestTierReachedAt))
        : null;

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
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${activeTab === 'main' ? 'bg-rpg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ⚔ 一般旅程
                </button>
                <button
                    onClick={() => { playSound('click'); setActiveTab('adv'); }}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${activeTab === 'adv' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ✦ 進階旅程
                </button>
                <button
                    onClick={() => { playSound('click'); setActiveTab('phrases'); }}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${activeTab === 'phrases' ? 'bg-teal-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ▣ 片語旅程
                </button>
            </div>

            {activeTab === 'phrases' ? (
                <PhraseJourneyView progressByGroup={phraseProgress} mistakeStats={mistakeStats} />
            ) : activeTab === 'adv' ? (
                <AdvancedJourneyView records={records} advMeta={advMeta} mistakeStats={mistakeStats} />
            ) : (
                <>
            <div className="flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
            {/* 試煉日誌入口按鈕 */}
            <div className="px-4 pt-4 pb-2">
                <div
                    className="arena-tier-record-card mb-3 p-3"
                    data-arena-frame={highestArenaTier.frame}
                    style={getArenaTierStyle(highestArenaTier.id)}
                    aria-label={`英雄競技場歷史最高排位：${highestArenaTier.shortLabel}`}
                >
                    <div className="relative z-[1] flex items-center gap-3">
                        <ArenaTierBadge tier={highestArenaTier.id} size="lg" showLabel={false} />
                        <div className="min-w-0 flex-1">
                            <div className="font-pixel text-[9px] text-gray-300">英雄競技場</div>
                            <div className="arena-tier-text font-pixel text-sm mt-1">歷史最高排位 · {highestArenaTier.shortLabel}</div>
                            <div className="font-retro text-[10px] text-gray-400 mt-2">
                                {highestTierDate ? `首次達成：${highestTierDate}` : '完成第一次每週結算後即可定級'}
                            </div>
                        </div>
                    </div>
                </div>
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

            <div className="p-4">
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
                                                            <span className="font-pixel text-lg text-white">{record.successCount || 0}/{BOSS_CLEARS_REQUIRED}</span>
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
    const [activeTab, setActiveTab] = useState('main'); // 'main' | 'adv' | 'phrases'

    useEffect(() => {
        setSelectedUnit('all');
    }, [activeTab]);

    const isAdvancedMistake = (data = {}) => data.source === 'advanced' && Number.isFinite(Number(data.lesson));
    const isPhraseMistake = (data = {}) => data.source === 'phrases' && Boolean(data.groupId);

    // 將 mistakeStats 轉換為陣列並排序（按錯誤次數由多到少）
    const sortedMistakes = Object.entries(mistakeStats)
        .filter(([, data]) => data.count > 0)
        .filter(([, data]) => {
            if (activeTab === 'adv') return isAdvancedMistake(data);
            if (activeTab === 'phrases') return isPhraseMistake(data);
            return !isAdvancedMistake(data) && !isPhraseMistake(data);
        })
        .sort((a, b) => b[1].count - a[1].count);

    const availableUnits = activeTab === 'adv'
        ? [...new Set(sortedMistakes.map(([, data]) => Number(data.lesson)))].sort((a, b) => a - b)
            .map(value => ({ value: String(value), label: `第 ${value} 課` }))
        : activeTab === 'phrases'
            ? [...new Map(sortedMistakes.map(([, data]) => [data.groupId, data.groupTitle || data.groupId])).entries()]
                .map(([value, label]) => ({ value, label }))
            : Array.from({ length: 16 }, (_, i) => ({ value: String(i + 1), label: `Unit ${i + 1}` }));

    // 根據選擇的單元過濾錯題
    const filteredMistakes = selectedUnit === 'all'
        ? sortedMistakes
        : sortedMistakes.filter(([, data]) => {
            if (activeTab === 'adv') return Number(data.lesson) === parseInt(selectedUnit, 10);
            if (activeTab === 'phrases') return data.groupId === selectedUnit;
            return data.gameUnitId === parseInt(selectedUnit, 10);
        });

    const totalMistakes = sortedMistakes.reduce((sum, [id, data]) => sum + data.count, 0);
    const activeScopeLabel = activeTab === 'adv' ? '進階' : activeTab === 'phrases' ? '片語' : '一般';

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
                            {sortedMistakes.length} {activeTab === 'phrases' ? '筆' : '字'} / {totalMistakes} 次
                        </span>
                    </div>
                </div>
            </div>

            {/* 一般／進階／片語錯題切換 */}
            <div className="flex bg-black/80 border-b-2 border-red-800">
                <button
                    onClick={() => { playSound('click'); setActiveTab('main'); }}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${activeTab === 'main' ? 'bg-red-900 text-white' : 'text-gray-500 hover:text-gray-200'}`}
                >
                    ⚔ 一般錯題
                </button>
                <button
                    onClick={() => { playSound('click'); setActiveTab('adv'); }}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${activeTab === 'adv' ? 'bg-purple-800 text-white' : 'text-gray-500 hover:text-gray-200'}`}
                >
                    ✦ 進階錯題
                </button>
                <button
                    onClick={() => { playSound('click'); setActiveTab('phrases'); }}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${activeTab === 'phrases' ? 'bg-teal-800 text-white' : 'text-gray-500 hover:text-gray-200'}`}
                >
                    ▣ 片語錯題
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

                {/* 一般顯示 16 單元，進階與片語只顯示目前有錯題的群組 */}
                {availableUnits.map(unit => (
                    <button
                        key={unit.value}
                        onClick={() => setSelectedUnit(unit.value)}
                        className={`px-3 py-1 font-pixel text-xs transition-colors flex-shrink-0 ${selectedUnit === unit.value
                            ? 'text-red-500 border-b-2 border-red-500'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {unit.label}
                    </button>
                ))}
            </div>

            {/* 錯題清單 - 可捲動 */}
            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
                {sortedMistakes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <CheckCircle size={64} className="text-green-500 opacity-50 mb-4" />
                        <p className="font-pixel text-gray-400 text-sm">尚無{activeScopeLabel}錯題</p>
                        <p className="font-retro text-gray-600 text-xs mt-2">太棒了！繼續保持！</p>
                    </div>
                ) : filteredMistakes.length === 0 ? (
                    // 選擇了特定單元但該單元無錯題
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <CheckCircle size={64} className="text-green-500 opacity-50 mb-4" />
                        <p className="font-pixel text-gray-400 text-sm">本{activeTab === 'phrases' ? '群組' : activeTab === 'adv' ? '課' : '單元'}無戰敗紀錄</p>
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
                                    {data.source === 'phrases' && (
                                        <p className="font-pixel text-[8px] text-teal-400 mt-2 pr-16">{data.groupTitle || data.groupId}</p>
                                    )}
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
                        清空{activeScopeLabel}錯題
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
                        <h3 className="font-pixel text-lg text-white mb-2">確定要清空{activeScopeLabel}錯題嗎?</h3>
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
    const [tab, setTab] = useState('main'); // 'main' | 'adv' | 'phrases'

    const totalLessons = advMeta?.totalLessons || 0;
    const mainIds = Array.from({ length: 16 }, (_, i) => (i + 1).toString());
    const advIds = Array.from({ length: totalLessons }, (_, i) => advLessonId(i + 1));
    const phraseIds = PHRASE_GROUPS.map(group => group.id);

    const toggleUnit = (id) => {
        setSelectedUnits(current => current.includes(id)
            ? current.filter(uid => uid !== id)
            : [...current, id]
        );
    };

    const changeTab = (nextTab) => {
        playSound('click');
        setTab(nextTab);
        setSelectedUnits(current => nextTab === 'phrases'
            ? current.filter(id => PHRASE_GROUP_BY_ID.has(id))
            : current.filter(id => !PHRASE_GROUP_BY_ID.has(id))
        );
    };

    // 全選只切換「當前分頁」的項目
    const currentTabIds = tab === 'main' ? mainIds : tab === 'adv' ? advIds : phraseIds;
    const currentAllSelected = currentTabIds.length > 0 && currentTabIds.every(id => selectedUnits.includes(id));
    const toggleAll = () => {
        setSelectedUnits(current => {
            const allSelected = currentTabIds.length > 0 && currentTabIds.every(id => current.includes(id));
            if (allSelected) return current.filter(id => !currentTabIds.includes(id));

            return Array.from(new Set([...current, ...currentTabIds]));
        });
    };

    // 進階篇章每 10 課為一卷，可快速切換整卷選取狀態
    const toggleSection = (sectionIds) => {
        setSelectedUnits(current => {
            const allSelected = sectionIds.every(id => current.includes(id));
            if (allSelected) return current.filter(id => !sectionIds.includes(id));

            return Array.from(new Set([...current, ...sectionIds]));
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#1a0f2e]">
            <div className="bg-black/50 p-4 border-b-4 border-rpg-border flex items-center justify-between z-10">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <h2 className="font-pixel text-white text-lg text-shadow text-red-500">終極試煉</h2>
                <div className="w-8"></div>
            </div>

            {/* 主線／進階／片語頁籤 */}
            <div className="flex bg-black/60 border-b-4 border-rpg-border z-10">
                <button
                    onClick={() => changeTab('main')}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${tab === 'main' ? 'bg-rpg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ⚔ 主線冒險
                </button>
                <button
                    onClick={() => changeTab('adv')}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${tab === 'adv' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ✦ 進階篇章
                </button>
                <button
                    onClick={() => changeTab('phrases')}
                    className={`min-w-0 flex-1 py-2 px-1 font-pixel text-[9px] sm:text-xs transition-colors ${tab === 'phrases' ? 'bg-teal-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    ▣ 片語模式
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <div className="flex justify-between items-center mb-4 bg-black/40 p-2 rounded border border-gray-600 backdrop-blur-sm sticky top-0 z-10">
                    <p className="font-retro text-gray-300 text-sm">選擇試煉範圍：<span className="text-rpg-secondary">{selectedUnits.length}</span> {tab === 'phrases' ? '群組' : tab === 'adv' ? '課' : '章'}</p>
                    <button onClick={() => { playSound('click'); toggleAll(); }} className="text-xs font-pixel text-white bg-rpg-primary px-2 py-1 border-2 border-white hover:bg-red-400">
                        {currentAllSelected ? "取消全選" : "全選"}
                    </button>
                </div>

                {tab === 'phrases' ? (
                    <div className="space-y-6">
                        {PHRASE_PARTS.map(part => {
                            const partIds = part.groups.map(group => group.id);
                            const selectedCount = partIds.filter(id => selectedUnits.includes(id)).length;
                            const allSelected = selectedCount === partIds.length;
                            return (
                                <section key={part.id} className="border-2 border-teal-700 bg-black/35 p-3">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div className="min-w-0">
                                            <h3 className="font-pixel text-[10px] leading-relaxed text-teal-200">{part.title}</h3>
                                            <p className="font-retro text-[10px] text-gray-400 mt-1">已選 {selectedCount}/{part.groups.length} 群組</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { playSound('click'); toggleSection(partIds); }}
                                            className={`shrink-0 border-2 px-2 py-1 font-pixel text-[8px] ${allSelected ? 'border-teal-200 bg-teal-700 text-white' : 'border-teal-600 bg-black/50 text-teal-200'}`}
                                        >
                                            {allSelected ? '取消本 Part' : '全選本 Part'}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {part.groups.map(group => {
                                            const isSelected = selectedUnits.includes(group.id);
                                            return (
                                                <button
                                                    key={group.id}
                                                    type="button"
                                                    onClick={() => { playSound('click'); toggleUnit(group.id); }}
                                                    className={`w-full border-2 p-2 flex items-center gap-3 text-left transition-all active:scale-[0.98] ${isSelected ? 'border-yellow-300 bg-teal-900 ring-2 ring-yellow-300/40' : 'border-teal-800 bg-[#102c31] hover:border-teal-500'}`}
                                                    aria-pressed={isSelected}
                                                >
                                                    <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                                                        <PixelArt.Scroll className="w-11 h-11 drop-shadow-md" />
                                                        {isSelected && <CheckCircle size={18} className="absolute -right-1 -bottom-1 text-yellow-300 bg-teal-950" strokeWidth={3} />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className={`font-pixel text-[9px] leading-relaxed ${isSelected ? 'text-yellow-200' : 'text-white'}`}>{group.title}</div>
                                                        <div className="font-retro text-[10px] text-teal-200 mt-1">{group.phraseCount} 筆片語</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                ) : tab === 'adv' ? (
                    totalLessons === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="font-pixel text-purple-300 text-sm mb-2">✦ 進階篇章準備中</div>
                            <p className="font-retro text-gray-400 text-xs">老師尚未匯入進階單字書</p>
                        </div>
                    ) : (
                        <div className="space-y-7">
                            {Array.from({ length: Math.ceil(totalLessons / ADV_LESSONS_PER_SECTION) }, (_, sectionIndex) => {
                                const sectionIds = advIds.slice(sectionIndex * ADV_LESSONS_PER_SECTION, (sectionIndex + 1) * ADV_LESSONS_PER_SECTION);
                                const sectionSelectedCount = sectionIds.filter(id => selectedUnits.includes(id)).length;
                                const sectionAllSelected = sectionSelectedCount === sectionIds.length;
                                const sectionPartiallySelected = sectionSelectedCount > 0 && !sectionAllSelected;
                                return (
                                    <section key={sectionIndex}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-300/70 to-purple-300/70"></div>
                                            <div className="px-3 py-1 rounded-full bg-pink-100 text-purple-800 border-2 border-white shadow font-pixel text-[9px]">
                                                PHOTO STRIP {String(sectionIndex + 1).padStart(2, '0')}
                                            </div>
                                            <div className="flex flex-1 items-center gap-2">
                                                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-pink-300/70 to-purple-300/70"></div>
                                                <button
                                                    type="button"
                                                    onClick={() => { playSound('click'); toggleSection(sectionIds); }}
                                                    aria-label={`${sectionAllSelected ? '取消選取' : '選取'}進階第 ${sectionIndex + 1} 卷全部 ${sectionIds.length} 課`}
                                                    aria-pressed={sectionAllSelected}
                                                    title={sectionAllSelected ? '取消本卷全選' : '本卷全選'}
                                                    className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border-2 px-2 py-1 shadow transition-all active:scale-95 ${
                                                        sectionAllSelected
                                                            ? 'border-pink-200 bg-purple-600 text-white'
                                                            : sectionPartiallySelected
                                                                ? 'border-purple-300 bg-pink-100 text-purple-800'
                                                                : 'border-purple-300/70 bg-black/40 text-pink-100 hover:bg-purple-900/70'
                                                    }`}
                                                >
                                                    <span className={`flex h-5 w-5 items-center justify-center rounded border-2 font-pixel text-xs ${
                                                        sectionAllSelected
                                                            ? 'border-white bg-pink-400 text-white'
                                                            : sectionPartiallySelected
                                                                ? 'border-purple-500 bg-white text-purple-700'
                                                                : 'border-pink-200 bg-white/10 text-transparent'
                                                    }`}>
                                                        {sectionAllSelected ? '✔' : sectionPartiallySelected ? '−' : '·'}
                                                    </span>
                                                    <span className="font-pixel text-[8px] whitespace-nowrap">本卷 {sectionSelectedCount}/{sectionIds.length}</span>
                                                </button>
                                            </div>
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
    const clears = getAdvancedQualifiedClears(record);
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
                    <AdvancedStars grades={getAdvancedStarGrades(record)} count={starCount} size="lg" label={`目前已取得 ${starCount} 顆星`} />
                    <p className="font-retro text-xs text-gray-300">
                        {isDone ? '此課已完成！可繼續挑戰刷新紀錄' : `取得 B 級以上才算通關；累積 ${ADV_CLEARS_TO_COMPLETE} 次完成此課（目前 ${clears} / ${ADV_CLEARS_TO_COMPLETE}）`}
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
    const [pilotVoice, setPilotVoice] = useState(() => getTtsPilotVoice(unitId));
    const studyData = data[categoryId] || [];
    const isAdvanced = String(unitId).startsWith('adv_');
    const hasAiAudio = studyData.some(item => item?.audio?.marin && item?.audio?.cedar);

    useEffect(() => {
        setPilotVoice(getTtsPilotVoice(unitId));
    }, [unitId]);

    const catTitles = { vocab: 'TREASURE', vocab_a: 'TREASURE A', vocab_b: 'TREASURE B', collocation: 'ARMORY', polysemy: 'ALCHEMY', sentences: 'SCROLLS' };
    const currentItem = studyData[currentIndex];
    const handleNext = () => { if (studyData.length === 0) return; setIsFlipped(false); setCurrentIndex((p) => (p + 1) % studyData.length); };
    const handlePrev = () => { if (studyData.length === 0) return; setIsFlipped(false); setCurrentIndex((p) => (p - 1 + studyData.length) % studyData.length); };
    const handleSpeak = (e, item) => {
        e.stopPropagation();
        speakText(item?.word, item?.audio, unitId, pilotVoice);
    };
    const handlePilotVoiceChange = (voice) => {
        setPilotVoice(setTtsPilotVoice(voice, unitId));
    };

    return (
        <div className="flex flex-col h-full bg-rpg-bg overflow-hidden">
            {/* Header Bar */}
            <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 p-2 bg-black/50 border-b-2 border-rpg-border flex-shrink-0">
                <RPGButton onClick={onBack} color="dark" className="px-2" title="返回上一頁" aria-label="返回上一頁">
                    <ArrowLeft size={16} />
                </RPGButton>
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
            {hasAiAudio && (
                <div className="flex-shrink-0 border-b-2 border-cyan-500/40 bg-cyan-950/40 px-3 py-2">
                    <div className="flex items-center justify-center gap-2">
                        <span className="font-retro text-xs text-cyan-100">AI 語音選擇</span>
                        {['marin', 'cedar'].map(voice => (
                            <button
                                key={voice}
                                type="button"
                                onClick={() => handlePilotVoiceChange(voice)}
                                className={`min-h-9 border-2 px-3 font-pixel text-[9px] uppercase transition-colors ${
                                    pilotVoice === voice
                                        ? 'border-cyan-300 bg-cyan-700 text-white'
                                        : 'border-cyan-700 bg-black/40 text-cyan-200 hover:border-cyan-400'
                                }`}
                                aria-pressed={pilotVoice === voice}
                            >
                                {voice}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {/* Main Content Area */}
            {viewMode === 'list' ? (
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="w-full space-y-3 pb-10">
                        {studyData.map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-rpg-panel border-4 border-rpg-border p-3 flex flex-col gap-2 cursor-pointer transition-colors hover:bg-[#fff1be] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rpg-primary"
                                onClick={(e) => handleSpeak(e, item)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSpeak(e, item);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`播放 ${item.word} 的發音`}
                            >
                                <div className="flex justify-between items-start border-b-2 border-rpg-border pb-1">
                                    <h3 className="font-bold font-retro text-xl">{item.word}</h3>
                                    {item.part && item.part.trim() !== '' && (
                                        <span className="text-xs bg-black text-white px-1 font-pixel">{item.part}</span>
                                    )}
                                </div>
                                <p className="font-retro text-lg text-rpg-bg">{item.chinese}</p>
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
                                <RPGButton onClick={(e) => handleSpeak(e, currentItem)} color="primary" className="p-2 mt-4" silent><Volume2 size={16} /></RPGButton>
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
                        <RPGButton onClick={handlePrev} color="neutral" className="w-12"><ChevronLeft /><span className="sr-only">上一張</span></RPGButton>
                        <RPGButton onClick={handleNext} color="neutral" className="w-12"><ChevronRight /><span className="sr-only">下一張</span></RPGButton>
                    </div>
                </div>
            )}
            <div className="flex-shrink-0 bg-black/70 border-t-4 border-rpg-border p-3">
                <RPGButton onClick={onStartQuiz} color="primary" disabled={studyData.length === 0} className="w-full py-3">
                    <Sword size={16} /> {isAdvanced ? '學完了，開始 10 題挑戰' : '開始挑戰'}
                </RPGButton>
            </div>
        </div>
    );
};

const PhraseGroupStudy = ({ group, part, onBack, onStartQuiz }) => {
    const [viewMode, setViewMode] = useState('card');
    const [currentIndex, setCurrentIndex] = useState(0);
    const phrases = group?.phrases || [];
    const currentPhrase = phrases[currentIndex];

    const speakPhrase = (phrase) => {
        if (!phrase) return;
        playSound('click');
        const audioItem = withPhraseAudio(phrase);
        speakText(audioItem.word, audioItem.audio, audioItem.audioScope);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#123b3b] to-[#081b24]">
            <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 p-3 border-b-4 border-teal-500 bg-black/35 flex-shrink-0">
                <RPGButton onClick={onBack} color="dark" className="px-2"><ArrowLeft size={16} /></RPGButton>
                <div className="min-w-0 text-center">
                    <h2 className="font-pixel text-[11px] text-white leading-relaxed truncate">{group?.title}</h2>
                    <p className="font-retro text-[10px] text-teal-200 truncate">{part?.title}</p>
                </div>
                <button
                    type="button"
                    onClick={() => { playSound('click'); setViewMode(mode => mode === 'card' ? 'list' : 'card'); }}
                    className="text-teal-200 hover:text-white flex items-center gap-1"
                    title={viewMode === 'card' ? '切換為列表模式' : '切換為卡片模式'}
                    aria-label={viewMode === 'card' ? '切換為列表模式' : '切換為卡片模式'}
                >
                    <span className="font-pixel text-[8px] opacity-70">{viewMode === 'card' ? 'LIST' : 'CARD'}</span>
                    {viewMode === 'card' ? <List size={20} /> : <Grid size={20} />}
                </button>
            </div>

            {viewMode === 'list' ? (
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    <div className="w-full space-y-3 pb-10">
                        {phrases.map((phrase, index) => (
                            <button
                                key={phrase.id || index}
                                type="button"
                                onClick={() => speakPhrase(phrase)}
                                className="w-full border-4 border-teal-300 bg-[#e7f8f3] text-[#102c31] shadow-[4px_4px_0_#061316] p-3 text-left transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                                aria-label={`播放 ${phrase.word} 的發音`}
                            >
                                <div className="flex items-start justify-between gap-3 border-b-2 border-teal-700/50 pb-1">
                                    <h3 className="font-retro text-xl font-bold leading-relaxed break-words">{phrase.word}</h3>
                                    <span className="font-pixel text-[8px] text-teal-700 shrink-0">{index + 1}/{phrases.length}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 pt-2">
                                    <p className="font-retro text-lg leading-relaxed text-teal-900">{phrase.chinese}</p>
                                    <Volume2 size={18} className="text-teal-700 shrink-0" aria-hidden="true" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
                    <div className="font-pixel text-[10px] text-teal-200 mb-3">{currentIndex + 1} / {phrases.length}</div>
                    <div className="w-full max-w-xs min-h-64 border-4 border-teal-300 bg-[#e7f8f3] text-[#102c31] shadow-[6px_6px_0_#061316] p-5 flex flex-col items-center justify-center text-center relative">
                        <Book size={34} className="text-teal-700 mb-4" />
                        <h3 className="font-retro text-2xl font-bold leading-relaxed break-words">{currentPhrase?.word || '資料讀取中...'}</h3>
                        <div className="w-16 border-t-2 border-teal-600/40 my-4"></div>
                        <p className="font-retro text-xl leading-relaxed text-teal-900">{currentPhrase?.chinese}</p>
                        <button
                            onClick={() => speakPhrase(currentPhrase)}
                            className="mt-5 border-2 border-teal-700 bg-teal-800 text-white p-2 hover:bg-teal-700"
                            aria-label={`播放 ${currentPhrase?.word || ''} 發音`}
                        >
                            <Volume2 size={20} />
                        </button>
                    </div>

                    <div className="flex gap-6 mt-5">
                        <RPGButton
                            onClick={() => setCurrentIndex(index => (index - 1 + phrases.length) % phrases.length)}
                            color="neutral"
                            className="w-14"
                            disabled={phrases.length <= 1}
                        >
                            <ChevronLeft /><span className="sr-only">上一張</span>
                        </RPGButton>
                        <RPGButton
                            onClick={() => setCurrentIndex(index => (index + 1) % phrases.length)}
                            color="neutral"
                            className="w-14"
                            disabled={phrases.length <= 1}
                        >
                            <ChevronRight /><span className="sr-only">下一張</span>
                        </RPGButton>
                    </div>
                </div>
            )}

            <div className="flex-shrink-0 bg-black/70 border-t-4 border-teal-600 p-3">
                <RPGButton onClick={onStartQuiz} color="primary" disabled={phrases.length === 0} className="w-full py-3">
                    <Sword size={16} /> 開始最多 {PHRASE_QUESTION_LIMIT} 題挑戰
                </RPGButton>
            </div>
        </div>
    );
};

const BattleMode = ({ quizData, optionPool = null, isBoss, isChallenge = false, isPhrase = false, difficulty = 'hard', questionLimit = 20, onComplete, onFlee, currentRecord = null }) => {
    // 所有模式都先顯示 menu 選擇作答模式
    const isEasy = !isPhrase && difficulty === 'easy';
    const maxHp = isPhrase ? 3 : (isEasy ? 5 : 3); // 片語固定 3 條命
    const [status, setStatus] = useState('menu');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [questionBuildError, setQuestionBuildError] = useState('');
    const [score, setScore] = useState(0);
    const [hp, setHp] = useState(maxHp);
    const [feedback, setFeedback] = useState(null);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [battleLog, setBattleLog] = useState([]); // 戰鬥回顧記錄
    const [isSubmitting, setIsSubmitting] = useState(false); // 防止重复提交
    const [quizMode, setQuizMode] = useState(null); // 'standard' = 有發音, 'simple' = 無發音

    // Keep one voice for the whole question so automatic playback and replay match.
    // Cedar is the male voice; Marin is the female voice.
    const quizPronunciationVoice = currentQIndex % 2 === 0 ? 'cedar' : 'marin';

    const MAX_TIME = 7.0;
    const [timeLeft, setTimeLeft] = useState(MAX_TIME);
    const timerRef = useRef(null);
    const questionDeadlineRef = useRef(null);
    const timeoutHandledRef = useRef(false);
    const lastTickSecondRef = useRef(null);

    useEffect(() => {
        if (!Array.isArray(quizData) || quizData.length === 0) {
            setQuestions([]);
            setQuestionBuildError(isPhrase
                ? '找不到可用的題目，請返回片語列表後再試一次。'
                : '找不到可用的題目，請返回上一頁後再試一次。');
            return;
        }
        try {
            setQuestionBuildError('');
            if (isPhrase) {
                const phraseQuestions = buildPhraseQuestions({
                    selectedPhrases: quizData,
                    groupPhrases: quizData,
                    partPhrases: Array.isArray(optionPool) && optionPool.length > 0 ? optionPool : quizData
                });
                if (phraseQuestions.length === 0) throw new Error('片語題組為空');
                setQuestions(phraseQuestions);
                return;
            }
            const generatedQuestions = quizData.flatMap(item => {
                const otherItems = quizData.filter(i => i.id !== item.id);
                // A direct translation question is unfair when two choices have the
                // same (or near-identical) Chinese meaning. Prefer unambiguous
                // distractors, regardless of the chapter the words came from.
                const eligibleDistractors = otherItems.filter(option => !hasAmbiguousTranslation(item, option));
                if (eligibleDistractors.length < 3) return [];
                const distractors = shuffleArray(eligibleDistractors).slice(0, 3);
                const options = shuffleArray([item, ...distractors]);
                // Randomly decide mode: 'en-ch' (English Q, Chinese A) or 'ch-en' (Chinese Q, English A)
                const hasAmbiguousChinesePrompt = otherItems.some(option => hasAmbiguousTranslation(item, option));
                const mode = needsEnglishPrompt(item) || hasAmbiguousChinesePrompt || Math.random() > 0.5
                    ? 'en-ch'
                    : 'ch-en';
                return [{ target: item, options, mode }];
            });
            const limit = Math.min(generatedQuestions.length, questionLimit);
            const nextQuestions = shuffleArray(generatedQuestions).slice(0, limit);
            if (nextQuestions.length === 0) throw new Error('找不到足夠的有效選項');
            setQuestions(nextQuestions);
        } catch (error) {
            console.error('Battle question setup failed:', error);
            setQuestions([]);
            setQuestionBuildError('題目建立失敗，請返回上一頁後重新開始。');
        }
    }, [quizData, optionPool, isBoss, isPhrase, questionLimit]);

    // 簡易 / 聽力模式：每題出現時自動播放正確單字的發音
    useEffect(() => {
        if (status === 'playing' && !feedback && questions.length > 0 && (quizMode === 'simple' || quizMode === 'listening')) {
            const currentQ = questions[currentQIndex];
            if (currentQ) {
                // 不管題目是 en-ch 還是 ch-en，都播放正確單字的英文發音
                speakText(
                    currentQ.target.word,
                    currentQ.target.audio,
                    currentQ.target.audioScope,
                    quizPronunciationVoice
                );
            }
        }
    }, [status, currentQIndex, feedback, questions, quizMode, quizPronunciationVoice]);

    useEffect(() => {
        if (status === 'playing' && !feedback && questions.length > 0) {
            questionDeadlineRef.current = Date.now() + (MAX_TIME * 1000);
            timeoutHandledRef.current = false;
            lastTickSecondRef.current = Math.ceil(MAX_TIME);
            setTimeLeft(MAX_TIME);
        } else {
            questionDeadlineRef.current = null;
        }
    }, [status, currentQIndex, feedback, questions.length]);

    useEffect(() => {
        if (status === 'playing' && !feedback && questions.length > 0) {
            const updateTimer = () => {
                const snapshot = getBattleTimerSnapshot({
                    deadlineMs: questionDeadlineRef.current,
                    isPauseOpen: showQuitConfirm
                });

                setTimeLeft(snapshot.secondsLeft);

                if (snapshot.expired) {
                    clearInterval(timerRef.current);
                    if (!showQuitConfirm) handleTimeOut();
                    return false;
                }

                const nextTickSecond = Math.ceil(snapshot.secondsLeft);
                if (nextTickSecond < lastTickSecondRef.current && nextTickSecond > 0 && nextTickSecond < 4) {
                    playSound('tick');
                }
                lastTickSecondRef.current = nextTickSecond;
                return true;
            };

            if (updateTimer()) timerRef.current = setInterval(updateTimer, 100);
        }
        return () => clearInterval(timerRef.current);
    }, [status, currentQIndex, feedback, showQuitConfirm, questions.length]);

    const handleTimeOut = () => {
        if (timeoutHandledRef.current) return;
        timeoutHandledRef.current = true;
        clearInterval(timerRef.current);
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
            targetLesson: currentQ.target.lesson,
            targetGroupId: currentQ.target.groupId,
            targetPartId: currentQ.target.partId,
            targetGroupTitle: currentQ.target.groupTitle
        }]);
        setHp(h => h - 1);
        setFeedback('miss');
        nextQuestion(hp <= 1);
    };

    const isAnswerLocked = feedback !== null || showQuitConfirm;

    const handleAnswer = (selectedOption) => {
        if (isAnswerLocked) return;
        const answerTimer = getBattleTimerSnapshot({
            deadlineMs: questionDeadlineRef.current
        });
        if (answerTimer.expired) {
            setTimeLeft(0);
            handleTimeOut();
            return;
        }
        clearInterval(timerRef.current);
        timeoutHandledRef.current = true;
        setTimeLeft(answerTimer.secondsLeft);
        const currentQ = questions[currentQIndex];
        const isCorrect = selectedOption.id === currentQ.target.id;

        let isDead = false;
        let pointsEarned = 0;

        if (isCorrect) {
            playSound('correct');
            // 片語模式答對固定 100 分；其他模式維持速度計分。
            pointsEarned = 100;
            if (!isPhrase && answerTimer.secondsLeft < 6.0) {
                const scoreTime = Math.max(0, answerTimer.secondsLeft);
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
            targetLesson: currentQ.target.lesson,
            targetGroupId: currentQ.target.groupId,
            targetPartId: currentQ.target.partId,
            targetGroupTitle: currentQ.target.groupTitle
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

    const handleResumeFromQuitConfirm = () => {
        playSound('click');
        const resumeTimer = getBattleTimerSnapshot({
            deadlineMs: questionDeadlineRef.current
        });
        setShowQuitConfirm(false);

        if (resumeTimer.expired) {
            setTimeLeft(0);
            handleTimeOut();
        } else {
            setTimeLeft(resumeTimer.secondsLeft);
        }
    };

    const getRank = (finalScore) => {
        const maxPossible = questions.length * 100;
        if (isPhrase) {
            const rank = getPhraseGrade({
                correct: Math.round(finalScore / 100),
                total: questions.length,
                completed: true
            });
            if (rank === 'S') return { rank, color: 'text-yellow-300', bg: 'bg-yellow-400', title: 'PERFECT CHECK!' };
            if (rank === 'A') return { rank, color: 'text-green-300', bg: 'bg-green-500', title: 'GREEN CHECK!' };
            if (rank === 'B') return { rank, color: 'text-blue-300', bg: 'bg-blue-500', title: 'BLUE CHECK!' };
            return { rank: null, color: 'text-gray-400', bg: 'bg-gray-600', title: 'KEEP TRAINING' };
        }
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
        const filledCount = Math.min(successCount, BOSS_CLEARS_REQUIRED);

        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-4 bg-black/90">
                {isPhrase ? <div className="w-24 h-24"><PixelArt.Book /></div> : isBoss ? <div className="animate-pulse"><PixelArt.MonsterBat /></div> : isChallenge ? <div className="animate-pulse"><PixelArt.MonsterBat /></div> : <PixelArt.MonsterSlime />}
                <h2 className="font-pixel text-xl text-white leading-loose">{isPhrase ? (isChallenge ? '片語試煉' : '片語挑戰') : isBoss ? "BOSS BATTLE" : isChallenge ? "終極試煉" : "MONSTER APPEARS"}<br /><span className="text-xs text-gray-400">{questions.length} Questions. 7 Seconds.</span></h2>

                {isEasy && (
                    <div className="font-pixel text-[10px] text-cyan-300 border-2 border-cyan-500/60 bg-cyan-900/30 px-3 py-1">簡單模式 · 5命 · 評級上限 B</div>
                )}

                {isPhrase && (
                    <div className="flex flex-col items-center gap-2 border-2 border-teal-600 bg-teal-950/40 p-3 w-full max-w-xs">
                        {!isChallenge && <PhraseMarks record={currentRecord} />}
                        <span className="font-retro text-xs text-teal-100">
                            {isChallenge ? '固定 3 命 · 最多 20 題 · 記錄於試煉日誌' : '固定 3 命 · 答對 100 分 · B 以上累積通關'}
                        </span>
                    </div>
                )}

                {questionBuildError && (
                    <div className="w-full max-w-xs border-2 border-red-500 bg-red-950/60 p-3 font-retro text-sm text-red-100">
                        {questionBuildError}
                    </div>
                )}

                {/* Boss Progress Checkboxes */}
                {isBoss && (
                    <div className="flex flex-col items-center gap-2 mb-1">
                        <div className="flex gap-2">
                            {Array.from({ length: BOSS_CLEARS_REQUIRED }).map((_, i) => (
                                <div key={i} className={`w-8 h-8 border-4 ${i < filledCount ? 'bg-green-500 border-green-700' : 'bg-gray-800 border-gray-600'} flex items-center justify-center`}>
                                    {i < filledCount && <span className="text-white font-pixel">✔</span>}
                                </div>
                            ))}
                        </div>
                        <span className="font-pixel text-[10px] text-gray-400">CLEAR {BOSS_CLEARS_REQUIRED} TIMES (RANK B+) TO UNLOCK</span>
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
                        if (questions.length === 0 || questionBuildError) return;
                        // 聽力模式：所有題目統一為「聽英文發音、選中文」(en-ch)
                        if (quizMode === 'listening') {
                            setQuestions(prev => prev.map(q => ({ ...q, mode: 'en-ch' })));
                        }
                        setStatus('playing');
                    }}
                    color="primary"
                    className={`text-lg px-8 py-4 transition-all duration-300 ${quizMode && questions.length > 0 && !questionBuildError ? 'opacity-100 translate-y-0' : 'opacity-30 pointer-events-none translate-y-2'}`}
                    disabled={!quizMode || questions.length === 0 || Boolean(questionBuildError)}
                >
                    FIGHT!
                </RPGButton>
                <button onClick={onFlee} className="text-gray-500 font-pixel text-xs hover:text-white">{isChallenge || isPhrase ? 'BACK' : 'RUN AWAY'}</button>
            </div>
        );
    }

    if (status === 'victory' || status === 'gameover') {
        const maxPossible = questions.length * 100;

        let rankData;
        if (status === 'gameover') {
            rankData = { rank: isPhrase ? null : 'E', color: 'text-gray-500', bg: 'bg-rpg-primary', title: 'GAME OVER' };
        } else {
            rankData = getRank(score);
        }

        const ranks = isPhrase ? [
            { label: 'S', min: maxPossible, color: 'text-yellow-300' },
            { label: 'A', min: Math.ceil(maxPossible * 0.9), color: 'text-green-300' },
            { label: 'B', min: Math.ceil(maxPossible * 0.8), color: 'text-blue-300' }
        ] : [
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
                                <div className={`font-pixel text-4xl ${rankData.color} text-shadow`}>{isPhrase ? `CHECK ${rankData.rank || '-'}` : `RANK ${rankData.rank}`}</div>
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
                                score > (isPhrase ? currentRecord.bestScore : currentRecord.score) ||
                                (score === (isPhrase ? currentRecord.bestScore : currentRecord.score) && rankOrder[rankData.rank] > rankOrder[isPhrase ? currentRecord.bestGrade : currentRecord.rank]);

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
                                onComplete({
                                    score,
                                    rank: rankData.rank,
                                    battleLog,
                                    victory: status === 'victory',
                                    completed: status === 'victory',
                                    correctCount: battleLog.filter(log => log.isCorrect).length
                                });
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
                                onComplete({
                                    score,
                                    rank: rankData.rank,
                                    battleLog,
                                    victory: status === 'victory',
                                    completed: status === 'victory',
                                    correctCount: battleLog.filter(log => log.isCorrect).length,
                                    retry: true
                                });
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
                    const isSuccess = BOSS_CLEAR_GRADES.includes(rankData.rank);
                    const newCount = isSuccess ? Math.min(prevCount + 1, BOSS_CLEARS_REQUIRED) : prevCount;
                    const justFinished = isSuccess && prevCount === BOSS_CLEARS_REQUIRED - 1;

                    return (
                        <div className="absolute top-2 left-0 w-full flex flex-col items-center pointer-events-none z-20">
                            <div className="flex gap-2 mb-2">
                                {Array.from({ length: BOSS_CLEARS_REQUIRED }).map((_, i) => (
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
                    <RPGButton onClick={() => setShowQuitConfirm(true)} color="dark" className="px-2 py-2" title="返回" disabled={feedback !== null}>
                        <ArrowLeft size={20} />
                    </RPGButton>
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
                            onClick={(e) => {
                                e.stopPropagation();
                                speakText(
                                    currentQ.target.word,
                                    currentQ.target.audio,
                                    currentQ.target.audioScope,
                                    quizPronunciationVoice
                                );
                            }}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        speakText(
                                            currentQ.target.word,
                                            currentQ.target.audio,
                                            currentQ.target.audioScope,
                                            quizPronunciationVoice
                                        );
                                    }}
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
                            <RPGButton onClick={handleResumeFromQuitConfirm} color="neutral">取消</RPGButton>
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
    const [worldTab, setWorldTab] = useState('main'); // 'main' | 'adv' | 'phrases'

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
    const [loginStampData, setLoginStampData] = useState(null);
    const [weeklyArenaSettlement, setWeeklyArenaSettlement] = useState(null);
    const [triviaAlbumBackView, setTriviaAlbumBackView] = useState('map');

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
        if (view === 'quiz' || view === 'challenge-quiz' || view === 'phrase-quiz') {
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
            setLoginStampData(null);
            setWeeklyArenaSettlement(null);
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
            const baseData = userSnap.exists() ? userSnap.data() : {
                avgAccuracy: 0,
                totalSessions: 0,
                grades: { S: 0, A: 0, B: 0, C: 0, D: 0 },
                levelRecords: {},
                trialHistory: [],
                triviaCollection: {},
                triviaRewardClaims: {},
                weeklyArenaRosters: {},
                weeklyArenaResults: {},
                arenaTierProgress: normalizeArenaTierProgress(),
                weeklyArenaGroupAssignments: {},
                discoveredWordIds: [],
                correctWordIds: [],
                phraseProgress: {}
            };
            const triviaMigration = migrateTriviaProgress(baseData);
            const migratedBaseData = {
                ...baseData,
                triviaCollection: triviaMigration.triviaCollection,
                triviaRewardClaims: triviaMigration.triviaRewardClaims
            };
            const engagementResult = prepareEngagementOnLogin(migratedBaseData);
            const hydratedData = {
                ...migratedBaseData,
                engagement: engagementResult.engagement,
                photoURL: user.photoURL || null,
                email: user.email
            };
            let preparedData = hydratedData;
            let settlementNotification = null;
            try {
                const arenaPreparation = await prepareWeeklyArenaOnLogin({
                    userId: user.uid,
                    userData: hydratedData
                });
                preparedData = arenaPreparation.userData;
                settlementNotification = arenaPreparation.notification;
            } catch (error) {
                console.warn('競技場登入結算暫時無法完成，將於下次登入重試。', error);
            }

            await setDoc(userRef, {
                photoURL: preparedData.photoURL,
                email: preparedData.email,
                engagement: preparedData.engagement,
                ...(triviaMigration.changed ? {
                    triviaCollection: triviaMigration.triviaCollection,
                    triviaRewardClaims: triviaMigration.triviaRewardClaims
                } : {}),
                ...(!userSnap.exists() ? migratedBaseData : {}),
                ...(Number.isFinite(Number(preparedData.weeklyArenaRewardStartWeek)) ? {
                    weeklyArenaRewardStartWeek: Number(preparedData.weeklyArenaRewardStartWeek)
                } : {}),
                weeklyArenaRosters: preparedData.weeklyArenaRosters || {},
                weeklyArenaResults: preparedData.weeklyArenaResults || {},
                arenaTierProgress: normalizeArenaTierProgress(preparedData.arenaTierProgress),
                weeklyArenaGroupAssignments: preparedData.weeklyArenaGroupAssignments || {}
            }, { merge: true });

            setUserData(preparedData);
            setWeeklyArenaSettlement(settlementNotification);
            setView('map');
        } catch (e) {
            console.error("Error loading user data:", e);
            alert("載入資料失敗，請重試");
        } finally {
            setLoading(false);
        }
    };

    const handleWeeklyArenaSettlementAction = (destination = 'map') => {
        if (!weeklyArenaSettlement || !auth.currentUser) return;
        const weekKey = String(weeklyArenaSettlement.weekStart);
        const seenAt = new Date().toISOString();
        setUserData(previousData => {
            if (!previousData) return previousData;
            return {
                ...previousData,
                weeklyArenaResults: {
                    ...(previousData.weeklyArenaResults || {}),
                    [weekKey]: {
                        ...(previousData.weeklyArenaResults?.[weekKey] || weeklyArenaSettlement),
                        seenAt
                    }
                }
            };
        });
        setWeeklyArenaSettlement(null);
        updateDoc(
            doc(db, 'users', auth.currentUser.uid),
            new FieldPath('weeklyArenaResults', weekKey, 'seenAt'),
            seenAt
        ).catch(error => {
            console.warn('上週競技場結算已讀狀態保存失敗，將於下次操作重試。', error);
        });

        if (destination === 'trivia-album') {
            setTriviaAlbumBackView('map');
            setView('trivia-album');
        } else if (destination === 'weekly-report') {
            setView('weekly-report');
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

    const handleSaveArenaRoster = async (weekStart, roster) => {
        if (!auth.currentUser || !userData) return;
        const rosterKey = String(weekStart);
        const existingRoster = userData.weeklyArenaRosters?.[rosterKey];
        if (existingRoster?.version >= roster?.version) return;
        const nextRosters = {
            ...(userData.weeklyArenaRosters || {}),
            [rosterKey]: roster
        };
        const trimmedRosters = Object.fromEntries(
            Object.entries(nextRosters)
                .sort(([a], [b]) => Number(b) - Number(a))
                .slice(0, 8)
        );
        setUserData(previousData => previousData ? {
            ...previousData,
            weeklyArenaRosters: trimmedRosters
        } : previousData);
        try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                weeklyArenaRosters: trimmedRosters
            });
        } catch (error) {
            console.error('英雄競技場名單保存失敗:', error);
        }
    };

    const handleClaimTrivia = async ({ key, sourceLabel, isSpecial = false }) => {
        if (!auth.currentUser || !userData || !key) return null;
        const existingClaim = userData.triviaRewardClaims?.[key];
        if (existingClaim?.cardId) {
            return TRIVIA_CARDS.find(card => card.id === existingClaim.cardId) || null;
        }
        const collection = { ...(userData.triviaCollection || {}) };
        const availableCards = TRIVIA_CARDS.filter(card => !collection[card.id]);
        if (availableCards.length === 0) return null;
        const selectedCard = availableCards[getStableIndex(`${auth.currentUser.uid}:${key}`, availableCards.length)];
        const unlockedAt = new Date().toISOString();
        collection[selectedCard.id] = {
            unlockedAt,
            sourceLabel,
            rewardKey: key,
            isSpecial
        };
        const rewardClaims = {
            ...(userData.triviaRewardClaims || {}),
            [key]: { cardId: selectedCard.id, claimedAt: unlockedAt }
        };
        const updatedUserData = {
            ...userData,
            triviaCollection: collection,
            triviaRewardClaims: rewardClaims
        };
        try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                triviaCollection: collection,
                triviaRewardClaims: rewardClaims
            });
            setUserData(updatedUserData);
            return selectedCard;
        } catch (error) {
            console.error('冷知識收藏保存失敗:', error);
            return null;
        }
    };

    const handleBattleComplete = async (result) => {
        // result: { score, rank, battleLog }
        if (!auth.currentUser || !userData) return;

        let updatedUserData = { ...userData };
        const updatesForFirestore = {};
        const sessionLogs = result.battleLog || [];
        const sessionCorrectCount = sessionLogs.filter(log => log.isCorrect).length;
        const currentSessionAccuracy = sessionLogs.length > 0
            ? (sessionCorrectCount / sessionLogs.length) * 100
            : null;

        // 片語庫使用完全獨立的進度與統計，不納入主線成就、打卡、試煉或每週戰報。
        const isPhraseSession = view === 'phrase-quiz' && selectedNode?.type === 'phrase';
        if (isPhraseSession) {
            const group = PHRASE_GROUP_BY_ID.get(selectedNode.id);
            const playedAt = new Date().toISOString();
            const grade = getPhraseGrade({
                correct: sessionCorrectCount,
                total: sessionLogs.length,
                completed: Boolean(result.completed)
            });
            const previousProgress = updatedUserData.phraseProgress?.[selectedNode.id] || {};
            const nextProgress = addPhraseAttempt(previousProgress, {
                grade,
                score: result.score,
                askedPhraseIds: sessionLogs.map(log => log.targetId),
                playedAt
            });
            if (group && nextProgress.seenPhraseIds.length >= group.phrases.length) {
                nextProgress.seenPhraseIds = [];
            }
            updatedUserData.phraseProgress = {
                ...(updatedUserData.phraseProgress || {}),
                [selectedNode.id]: nextProgress
            };
            updatesForFirestore.phraseProgress = updatedUserData.phraseProgress;

            const wrongAnswers = sessionLogs.filter(log => !log.isCorrect && log.targetId);
            if (wrongAnswers.length > 0) {
                const currentMistakeStats = { ...(updatedUserData.mistakeStats || {}) };
                wrongAnswers.forEach(log => {
                    const groupId = log.targetGroupId || selectedNode.id;
                    const key = `phrases:${groupId}:${log.targetId}`;
                    const previous = currentMistakeStats[key] || {};
                    currentMistakeStats[key] = {
                        ...previous,
                        count: (Number(previous.count) || 0) + 1,
                        word: log.targetWord || '',
                        chinese: log.targetChinese || '',
                        source: 'phrases',
                        groupId,
                        groupTitle: log.targetGroupTitle || group?.title || groupId,
                        partId: log.targetPartId || selectedNode.partId,
                        phraseId: log.targetId,
                        lastWrongAt: playedAt
                    };
                });
                updatedUserData.mistakeStats = currentMistakeStats;
                updatesForFirestore.mistakeStats = currentMistakeStats;
            }

            setUserData(updatedUserData);
            if (result.retry) setBattleKey(previous => previous + 1);
            else setView('phrase-study');

            try {
                await updateDoc(doc(db, 'users', auth.currentUser.uid), updatesForFirestore);
            } catch (error) {
                console.error('片語進度儲存失敗:', error);
            }
            return;
        }

        const correctWordIds = new Set(updatedUserData.correctWordIds || []);
        const previousCorrectWordCount = correctWordIds.size;
        sessionLogs.filter(log => log.isCorrect).forEach(log => {
            const wordKey = getCorrectWordKey(log);
            if (wordKey) correctWordIds.add(wordKey);
        });
        if (correctWordIds.size !== previousCorrectWordCount) {
            updatedUserData.correctWordIds = [...correctWordIds];
            updatesForFirestore.correctWordIds = updatedUserData.correctWordIds;
        }

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
                        const isPhrase = log.targetSeries === 'phrases' && Boolean(log.targetGroupId);
                        const key = isAdvanced
                            ? `advanced:${lesson}:${log.targetId}`
                            : isPhrase
                                ? `phrases:${log.targetGroupId}:${log.targetId}`
                                : log.targetId;
                        const gameUnitId = (log.targetBook && log.targetUnit)
                            ? getGameUnitId(log.targetBook, log.targetUnit)
                            : null;

                        if (currentMistakeStats[key]) {
                            currentMistakeStats[key].count += 1;
                            if (gameUnitId !== null) currentMistakeStats[key].gameUnitId = gameUnitId;
                            currentMistakeStats[key].lastWrongAt = new Date().toISOString();
                            if (isPhrase) {
                                currentMistakeStats[key].source = 'phrases';
                                currentMistakeStats[key].groupId = log.targetGroupId;
                                currentMistakeStats[key].groupTitle = log.targetGroupTitle || log.targetGroupId;
                                currentMistakeStats[key].partId = log.targetPartId || null;
                                currentMistakeStats[key].phraseId = log.targetId;
                            }
                        } else {
                            currentMistakeStats[key] = {
                                count: 1,
                                word: log.targetWord || '',
                                chinese: log.targetChinese || '',
                                gameUnitId,
                                ...(isAdvanced
                                    ? { source: 'advanced', lesson }
                                    : isPhrase
                                        ? {
                                            source: 'phrases',
                                            groupId: log.targetGroupId,
                                            groupTitle: log.targetGroupTitle || log.targetGroupId,
                                            partId: log.targetPartId || null,
                                            phraseId: log.targetId
                                        }
                                        : { source: 'main' }),
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

                if (BOSS_CLEAR_GRADES.includes(result.rank)) successCount += 1;
                if (result.rank === 'S') sCount += 1;

                if (sCount >= BOSS_CLEARS_REQUIRED) bestStatus = 'COMPLETE';
                else if (successCount >= BOSS_CLEARS_REQUIRED && bestStatus !== 'COMPLETE') bestStatus = 'CLEAR';

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
                const previousQualifiedClears = getAdvancedQualifiedClears(prevRecord);
                const bPlusClears = previousQualifiedClears + (
                    result.victory && ADV_PASSING_GRADES.includes(result.rank) ? 1 : 0
                );
                const starGrades = result.victory && ADV_PASSING_GRADES.includes(result.rank)
                    ? addAdvancedStarGrade(prevRecord, result.rank)
                    : getAdvancedStarGrades(prevRecord);
                const bestGrade = (rankOrder[result.rank] || 0) > (rankOrder[prevRecord.bestGrade] || 0)
                    ? result.rank : (prevRecord.bestGrade || result.rank);
                const newRecord = {
                    ...performanceRecord,
                    clears,
                    bPlusClears,
                    starGrades,
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
                const phraseGroup = PHRASE_GROUP_BY_ID.get(unitId);
                if (phraseGroup) return `片語 ${phraseGroup.title}`;
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

        // 冒險打卡只有一種：當天完成一場 B 級以上戰鬥才計入，並同步增加累積冒險天數。
        if (CHECK_IN_GRADES.includes(result.rank)) {
            const adventureResult = addQualifiedAdventureDay(updatedUserData);
            if (adventureResult.changed) {
                updatedUserData.engagement = adventureResult.engagement;
                updatesForFirestore.engagement = adventureResult.engagement;
                setLoginStampData({
                    totalDays: adventureResult.engagement.adventure.totalDays || 1
                });
            }
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

        try {
            await syncWeeklyLeaderboard({
                userId: auth.currentUser.uid,
                studentName: updatedUserData.studentName || userName,
                history: updatedUserData.trialHistory || [],
                userData: updatedUserData
            });
        } catch (e) {
            // 公開排行榜只存匿名摘要；即使規則尚未開放，也不影響個人成績保存。
            console.warn("每週排行榜摘要同步失敗:", e);
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
        } else if (node.type === 'phrase') setView('phrase-study');
        else setView('unit-hub');
    };

    const handleForceQuiz = () => setView('quiz');

    const handleStartChallenge = async (selectedIds) => {
        const nextChallengeUnits = [...selectedIds];
        setChallengeUnits(nextChallengeUnits);
        playSound('start');

        // 片語資料已經隨程式載入，不需要再進入一般／進階題庫的非同步
        // loading 流程。直接切換可避免測驗畫面被 LoadingScreen 蓋掉或切回。
        if (isPhraseChallengeSelection(nextChallengeUnits)) {
            setLoading(false);
            setView('challenge-quiz');
            return;
        }

        // Fetch all needed
        setLoading(true);
        try {
            const promises = nextChallengeUnits.map(async uid => {
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
                    const isPhrase = data?.source === 'phrases' && Boolean(data?.groupId);
                    if (scope === 'adv') return !isAdvanced;
                    if (scope === 'phrases') return !isPhrase;
                    return isAdvanced || isPhrase;
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

    const getPhraseBattleData = () => {
        if (selectedNode?.type !== 'phrase') return [];
        const group = PHRASE_GROUP_BY_ID.get(selectedNode.id);
        if (!group) return [];
        const progress = normalizePhraseProgress(userData?.phraseProgress?.[group.id]);
        const wrongPhraseIds = Object.values(userData?.mistakeStats || {})
            .filter(data => data?.source === 'phrases' && data.groupId === group.id && data.count > 0)
            .map(data => data.phraseId);
        const phrases = group.phrases.map(phrase => withPhraseAudio({ ...phrase, groupTitle: group.title }));
        return selectSmartPhrases(phrases, {
            seenPhraseIds: progress.seenPhraseIds,
            wrongPhraseIds,
            limit: PHRASE_QUESTION_LIMIT
        });
    };

    const getPhraseOptionPool = () => {
        if (selectedNode?.type !== 'phrase') return [];
        const part = PHRASE_PART_BY_ID.get(selectedNode.partId);
        return (part?.groups || []).flatMap(group => group.phrases.map(phrase => withPhraseAudio({
            ...phrase,
            groupTitle: group.title
        })));
    };

    const getQuizData = () => {
        // 終極試煉模式 - 使用混合出題
        if (view === 'challenge-quiz') {
            return isPhraseChallengeSelection(challengeUnits)
                ? getPhraseChallengeData(challengeUnits)
                : getMixedQuizData(challengeUnits);
        }

        if (!selectedNode) return [];

        if (selectedNode.type === 'phrase') return getPhraseBattleData();

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
            case 'map': return <WorldMap onLogout={handleLogout} onSelectNode={handleNodeSelect} onViewJourney={() => { playSound('click'); setView('journey'); }} onViewWeeklyReport={() => { playSound('click'); setView('weekly-report'); }} onOpenAchievements={() => { playSound('click'); setView('achievement-hall'); }} onOpenAlbum={() => { playSound('click'); setTriviaAlbumBackView('map'); setView('trivia-album'); }} rewardSummary={getPendingRewardSummary(userData)} userData={userData} onUltimateChallenge={() => { playSound('click'); setView('challenge-setup'); }} onViewMistakeNotebook={() => { playSound('click'); setView('mistake-notebook'); }} records={userData?.levelRecords} advMeta={advMeta} activeTab={worldTab} onChangeTab={setWorldTab} />;
            case 'weekly-report': return <WeeklyReport
                onBack={() => { playSound('click'); setView('map'); }}
                onOpenAlbum={() => { playSound('click'); setTriviaAlbumBackView('weekly-report'); setView('trivia-album'); }}
                onViewLoginCalendar={() => { playSound('click'); setView('login-calendar'); }}
                currentUserId={currentUser?.uid}
                userData={userData}
                onSaveArenaRoster={handleSaveArenaRoster}
            />;
            case 'trivia-album': return <TriviaAlbum onBack={() => { playSound('click'); setView(triviaAlbumBackView); }} userData={userData} onClaimTrivia={handleClaimTrivia} />;
            case 'login-calendar': return <LoginCalendar onBack={() => { playSound('click'); setView('weekly-report'); }} userData={userData} />;
            case 'achievement-hall': return <AchievementHall onBack={() => { playSound('click'); setView('map'); }} userData={userData} />;
            case 'mistake-notebook': return <MistakeNotebook onBack={() => { playSound('click'); setView('map'); }} mistakeStats={userData?.mistakeStats} onClearMistakes={handleClearMistakes} onRemoveMistake={handleRemoveMistake} />;
            case 'journey': return <JourneyMode onBack={() => { playSound('click'); setView('map'); }} onViewTrialLog={() => { playSound('click'); setView('trial-log'); }} records={userData?.levelRecords} advMeta={advMeta} mistakeStats={userData?.mistakeStats} phraseProgress={userData?.phraseProgress} arenaTierProgress={userData?.arenaTierProgress} />;
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
            case 'phrase-study': {
                const group = PHRASE_GROUP_BY_ID.get(selectedNode?.id);
                const part = PHRASE_PART_BY_ID.get(selectedNode?.partId);
                if (!group || !part) return <div className="text-white text-center pt-20">找不到片語群組</div>;
                return <PhraseGroupStudy
                    group={group}
                    part={part}
                    onBack={() => { playSound('click'); setWorldTab('phrases'); setView('map'); }}
                    onStartQuiz={() => { playSound('start'); setView('phrase-quiz'); }}
                />;
            }
            case 'phrase-quiz':
                return <BattleMode
                    key={battleKey}
                    quizData={getQuizData()}
                    optionPool={getPhraseOptionPool()}
                    isPhrase
                    difficulty="hard"
                    questionLimit={PHRASE_QUESTION_LIMIT}
                    onComplete={handleBattleComplete}
                    onFlee={() => setView('phrase-study')}
                    currentRecord={userData?.phraseProgress?.[selectedNode?.id]}
                />;
            case 'quiz':
            case 'challenge-quiz': {
                const isPhraseChallenge = view === 'challenge-quiz' && isPhraseChallengeSelection(challengeUnits);
                return <BattleMode
                    key={battleKey}
                    quizData={getQuizData()}
                    optionPool={isPhraseChallenge ? getPhraseChallengeOptionPool(challengeUnits) : null}
                    isBoss={selectedNode?.type === 'boss'}
                    isChallenge={view === 'challenge-quiz'}
                    isPhrase={isPhraseChallenge}
                    difficulty={(view === 'quiz' && selectedNode?.type === 'unit') ? selectedDifficulty : 'hard'}
                    questionLimit={(view === 'quiz' && selectedNode?.type === 'adv') ? ADV_QUIZ_QUESTION_LIMIT : 20}
                    onComplete={handleBattleComplete}
                    onFlee={() => setView('map')}
                    currentRecord={isPhraseChallenge ? null : userData?.levelRecords?.[selectedNode?.id]}
                />;
            }
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

                    <LoginStampModal data={loginStampData} onClose={() => setLoginStampData(null)} />
                    <WeeklyArenaSettlementModal
                        key={weeklyArenaSettlement?.weekStart || 'no-settlement'}
                        data={weeklyArenaSettlement}
                        onPrimary={() => handleWeeklyArenaSettlementAction(
                            weeklyArenaSettlement?.rewardCount > 0 ? 'trivia-album' : 'weekly-report'
                        )}
                        onLater={() => handleWeeklyArenaSettlementAction('map')}
                    />

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




const PhraseLibraryPreviewLab = () => {
    const firstGroup = PHRASE_GROUPS[0];
    const secondGroup = PHRASE_GROUPS[1];
    const [screen, setScreen] = useState('map');
    const [previewTab, setPreviewTab] = useState('phrases');
    const [selectedPhraseNode, setSelectedPhraseNode] = useState(null);
    const [previewChallengeUnits, setPreviewChallengeUnits] = useState([]);
    const [previewBattleKey, setPreviewBattleKey] = useState(0);
    const [previewProgress, setPreviewProgress] = useState({
        [firstGroup.id]: {
            attempts: 3,
            clears: 3,
            grades: ['S', 'A', 'B'],
            bestScore: Math.min(firstGroup.phraseCount, 10) * 100,
            bestGrade: 'S',
            completed: true,
            seenPhraseIds: [],
            lastPlayedAt: new Date().toISOString()
        },
        [secondGroup.id]: {
            attempts: 1,
            clears: 1,
            grades: ['B'],
            bestScore: Math.ceil(Math.min(secondGroup.phraseCount, 10) * 0.8) * 100,
            bestGrade: 'B',
            completed: false,
            seenPhraseIds: [],
            lastPlayedAt: new Date().toISOString()
        }
    });

    const selectedGroup = PHRASE_GROUP_BY_ID.get(selectedPhraseNode?.id);
    const selectedPart = PHRASE_PART_BY_ID.get(selectedPhraseNode?.partId);
    const previewQuizData = selectedGroup
        ? selectSmartPhrases(selectedGroup.phrases.map(phrase => withPhraseAudio({ ...phrase, groupTitle: selectedGroup.title })), {
            seenPhraseIds: normalizePhraseProgress(previewProgress[selectedGroup.id]).seenPhraseIds,
            limit: PHRASE_QUESTION_LIMIT
        })
        : [];
    const previewOptionPool = selectedPart
        ? selectedPart.groups.flatMap(group => group.phrases.map(phrase => withPhraseAudio({ ...phrase, groupTitle: group.title })))
        : [];
    const previewChallengeQuizData = isPhraseChallengeSelection(previewChallengeUnits)
        ? getPhraseChallengeData(previewChallengeUnits)
        : [];
    const previewChallengeOptionPool = isPhraseChallengeSelection(previewChallengeUnits)
        ? getPhraseChallengeOptionPool(previewChallengeUnits)
        : [];
    const previewPhraseMistakes = {
        [`phrases:${firstGroup.id}:${firstGroup.phrases[0].id}`]: {
            count: 2,
            word: firstGroup.phrases[0].word,
            chinese: firstGroup.phrases[0].chinese,
            source: 'phrases',
            groupId: firstGroup.id,
            groupTitle: firstGroup.title,
            partId: firstGroup.partId,
            phraseId: firstGroup.phrases[0].id
        }
    };

    const handlePreviewComplete = result => {
        if (!selectedGroup) return;
        const correct = result.battleLog.filter(log => log.isCorrect).length;
        const grade = getPhraseGrade({ correct, total: result.battleLog.length, completed: result.completed });
        const nextProgress = addPhraseAttempt(previewProgress[selectedGroup.id], {
            grade,
            score: result.score,
            askedPhraseIds: result.battleLog.map(log => log.targetId)
        });
        if (nextProgress.seenPhraseIds.length >= selectedGroup.phrases.length) nextProgress.seenPhraseIds = [];
        setPreviewProgress(current => ({ ...current, [selectedGroup.id]: nextProgress }));
        if (result.retry) setPreviewBattleKey(key => key + 1);
        else setScreen('study');
    };

    const handlePreviewChallengeComplete = result => {
        if (result.retry) setPreviewBattleKey(key => key + 1);
        else setScreen('challenge');
    };

    let content;
    if (screen === 'challenge') {
        content = <ChallengeSetup
            advMeta={{ totalLessons: 0 }}
            onBack={() => setScreen('map')}
            onStart={selectedIds => {
                setPreviewChallengeUnits([...selectedIds]);
                setScreen('challenge-battle');
            }}
        />;
    } else if (screen === 'challenge-battle' && isPhraseChallengeSelection(previewChallengeUnits)) {
        content = <BattleMode
            key={previewBattleKey}
            quizData={previewChallengeQuizData}
            optionPool={previewChallengeOptionPool}
            isChallenge
            isPhrase
            questionLimit={20}
            onComplete={handlePreviewChallengeComplete}
            onFlee={() => setScreen('challenge')}
        />;
    } else if (screen === 'journey') {
        content = <JourneyMode
            onBack={() => setScreen('map')}
            onViewTrialLog={() => {}}
            records={{}}
            phraseProgress={previewProgress}
            mistakeStats={previewPhraseMistakes}
        />;
    } else if (screen === 'mistakes') {
        content = <MistakeNotebook
            onBack={() => setScreen('map')}
            mistakeStats={previewPhraseMistakes}
            onClearMistakes={() => {}}
            onRemoveMistake={() => {}}
        />;
    } else if (screen === 'study' && selectedGroup && selectedPart) {
        content = <PhraseGroupStudy
            group={selectedGroup}
            part={selectedPart}
            record={previewProgress[selectedGroup.id]}
            onBack={() => setScreen('map')}
            onStartQuiz={() => setScreen('battle')}
        />;
    } else if (screen === 'battle' && selectedGroup) {
        content = <BattleMode
            key={previewBattleKey}
            quizData={previewQuizData}
            optionPool={previewOptionPool}
            isPhrase
            questionLimit={PHRASE_QUESTION_LIMIT}
            onComplete={handlePreviewComplete}
            onFlee={() => setScreen('study')}
            currentRecord={previewProgress[selectedGroup.id]}
        />;
    } else {
        content = <WorldMap
            onLogout={() => {}}
            onSelectNode={node => {
                if (node.type !== 'phrase') return;
                setSelectedPhraseNode(node);
                setScreen('study');
            }}
            onViewJourney={() => setScreen('journey')}
            onViewWeeklyReport={() => {}}
            onOpenAchievements={() => {}}
            onOpenAlbum={() => {}}
            onUltimateChallenge={() => setScreen('challenge')}
            onViewMistakeNotebook={() => setScreen('mistakes')}
            userData={{ phraseProgress: previewProgress }}
            records={{}}
            activeTab={previewTab}
            onChangeTab={setPreviewTab}
        />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-800 p-4 rounded-xl shadow-2xl border-4 border-gray-600">
                <div className="bg-rpg-bg w-full aspect-[9/16] sm:aspect-[3/4] rounded-lg border-4 border-black overflow-hidden relative shadow-inner">
                    <div className="relative h-full overflow-hidden">{content}</div>
                </div>
            </div>
        </div>
    );
};

const RootApp = () => {
    const isArenaPreview = new URLSearchParams(window.location.search).get('arena-preview') === '1';
    const isPhrasePreview = new URLSearchParams(window.location.search).get('phrase-preview') === '1';
    if (isArenaPreview) return <ArenaTierPreviewLab />;
    if (isPhrasePreview) return <PhraseLibraryPreviewLab />;
    return <App />;
};

export default RootApp;
