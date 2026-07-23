// 匯入進階單字書到 Firestore（vocabulary collection，series='advanced'）
// 用法：node scripts/import_advanced.js <輸入.json> [--dry-run]
//
// 輸入格式：
// [
//   {
//     "lesson": 1,
//     "title": "篇章標題（可省略）",
//     "words": [ { "word": "abandon", "chinese": "拋棄；放棄", "pos": "v." } ]
//   }
// ]
//
// 行為：
//   1. 對每個 lesson 先刪掉舊的 series=='advanced' && lesson==N 文件（可重複執行、覆蓋修正）。
//   2. 逐字寫入 { series:'advanced', lesson, word, chinese, pos, category:'1. 單字' }。
//   3. merge 更新 meta/advanced 的 totalLessons 與 titles。
//   4. read-back 驗證每課筆數，數量不符報錯 exit 1。

import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import {
    getFirestore, collection, query, where, getDocs,
    doc, getDoc, setDoc, writeBatch
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAfeRxb_HVaLU8UuJ20xgmGfxWWqMCKVvg",
    authDomain: "english-quest-95028.firebaseapp.com",
    projectId: "english-quest-95028",
    storageBucket: "english-quest-95028.firebasestorage.app",
    messagingSenderId: "657463040693",
    appId: "1:657463040693:web:3877c39a4621bf5bd57cfc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BATCH_LIMIT = 400;

async function commitOperations(db, operations) {
    for (let start = 0; start < operations.length; start += BATCH_LIMIT) {
        const batch = writeBatch(db);
        for (const operation of operations.slice(start, start + BATCH_LIMIT)) {
            if (operation.type === 'delete') batch.delete(operation.ref);
            else batch.set(operation.ref, operation.data);
        }
        await batch.commit();
    }
}

// 一次查詢所有進階資料，只刪除本次輸入涵蓋的課次
async function clearLessons(lessons) {
    const q = query(
        collection(db, 'vocabulary'),
        where('series', '==', 'advanced')
    );
    const snapshot = await getDocs(q);
    const operations = snapshot.docs
        .filter(docSnap => lessons.has(Number(docSnap.data().lesson)))
        .map(docSnap => ({ type: 'delete', ref: docSnap.ref }));
    await commitOperations(db, operations);
    return operations.length;
}

async function countLessons() {
    const q = query(
        collection(db, 'vocabulary'),
        where('series', '==', 'advanced')
    );
    const snapshot = await getDocs(q);
    const counts = {};
    snapshot.forEach(docSnap => {
        const lesson = Number(docSnap.data().lesson);
        counts[lesson] = (counts[lesson] || 0) + 1;
    });
    return counts;
}

async function main() {
    const cliArgs = process.argv.slice(2);
    const dryRun = cliArgs.includes('--dry-run');
    const inputPath = cliArgs.find(arg => arg !== '--dry-run');
    if (!inputPath) {
        console.error('用法：node scripts/import_advanced.js <輸入.json> [--dry-run]');
        process.exit(1);
    }

    let lessons;
    try {
        lessons = JSON.parse(readFileSync(inputPath, 'utf8'));
    } catch (e) {
        console.error(`讀取／解析 ${inputPath} 失敗：`, e.message);
        process.exit(1);
    }
    if (!Array.isArray(lessons)) {
        console.error('輸入必須是課次陣列');
        process.exit(1);
    }

    const titles = {};
    let maxLesson = 0;
    const expectedCounts = {}; // lesson -> 預期字數
    const lessonNumbers = new Set();
    const writeOperations = [];

    for (const item of lessons) {
        const lesson = Number(item.lesson);
        if (!Number.isInteger(lesson) || lesson < 1) {
            console.error(`無效的 lesson：${JSON.stringify(item.lesson)}`);
            process.exit(1);
        }
        if (lessonNumbers.has(lesson)) {
            console.error(`lesson 重複：${lesson}`);
            process.exit(1);
        }
        lessonNumbers.add(lesson);
        const words = Array.isArray(item.words) ? item.words : [];
        if (words.length === 0) {
            console.error(`第 ${lesson} 課沒有任何單字`);
            process.exit(1);
        }
        const seenWords = new Set();
        for (const w of words) {
            const word = (w.word || '').trim();
            const chinese = (w.chinese || '').trim();
            const pos = (w.pos || w.part || '').trim();
            if (!word || !chinese || !pos) {
                console.error(`第 ${lesson} 課資料不完整：${JSON.stringify({ word, chinese, pos })}`);
                process.exit(1);
            }
            const normalized = word.toLowerCase();
            if (seenWords.has(normalized)) {
                console.error(`第 ${lesson} 課有重複單字：${word}`);
                process.exit(1);
            }
            seenWords.add(normalized);
            writeOperations.push({
                type: 'set',
                ref: doc(collection(db, 'vocabulary')),
                data: { series: 'advanced', lesson, word, chinese, pos, category: '1. 單字' }
            });
        }

        expectedCounts[lesson] = words.length;
        if (item.title) titles[String(lesson)] = String(item.title);
        if (lesson > maxLesson) maxLesson = lesson;
    }

    console.log(`準備匯入 ${lessonNumbers.size} 課、${writeOperations.length} 筆單字`);
    if (dryRun) {
        console.log('Dry run 驗證通過；未連線或修改 Firestore。');
        process.exit(0);
    }
    const deleted = await clearLessons(lessonNumbers);
    if (deleted > 0) console.log(`清掉本次課次舊資料 ${deleted} 筆`);
    await commitOperations(db, writeOperations);
    console.log(`分批寫入 ${writeOperations.length} 筆單字`);

    // 更新目錄 meta/advanced（totalLessons 取現有與本次最大值的較大者）
    const metaRef = doc(db, 'meta', 'advanced');
    let existingTotal = 0;
    try {
        const metaSnap = await getDoc(metaRef);
        if (metaSnap.exists()) existingTotal = metaSnap.data().totalLessons || 0;
    } catch { /* 目錄不存在時忽略 */ }
    const totalLessons = Math.max(existingTotal, maxLesson);

    const metaUpdate = { totalLessons };
    if (Object.keys(titles).length > 0) metaUpdate.titles = titles;
    await setDoc(metaRef, metaUpdate, { merge: true });
    console.log(`\n目錄 meta/advanced 已更新：totalLessons=${totalLessons}，本次寫入 ${Object.keys(titles).length} 個標題`);

    // read-back 驗證
    console.log('\n== 驗證 ==');
    let ok = true;
    const actualCounts = await countLessons();
    for (const [lesson, expected] of Object.entries(expectedCounts)) {
        const actual = actualCounts[Number(lesson)] || 0;
        console.log(`  第 ${lesson} 課：預期 ${expected}，實際 ${actual} ${actual === expected ? '✔' : '✗'}`);
        if (actual !== expected) ok = false;
    }

    if (!ok) {
        console.error('\n驗證失敗：筆數不符');
        process.exit(1);
    }
    console.log('\n全部匯入完成並驗證通過。');
    process.exit(0);
}

main().catch(err => {
    console.error('匯入失敗：', err.message);
    process.exit(1);
});
