// 匯入進階單字書到 Firestore（vocabulary collection，series='advanced'）
// 用法：node scripts/import_advanced.js <輸入.json>
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
    addDoc, deleteDoc, doc, getDoc, setDoc
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

// 刪掉某一課的所有舊進階文件
async function clearLesson(lesson) {
    const q = query(
        collection(db, 'vocabulary'),
        where('series', '==', 'advanced'),
        where('lesson', '==', lesson)
    );
    const snapshot = await getDocs(q);
    let deleted = 0;
    for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'vocabulary', docSnap.id));
        deleted++;
    }
    return deleted;
}

async function countLesson(lesson) {
    const q = query(
        collection(db, 'vocabulary'),
        where('series', '==', 'advanced'),
        where('lesson', '==', lesson)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
}

async function main() {
    const inputPath = process.argv[2];
    if (!inputPath) {
        console.error('用法：node scripts/import_advanced.js <輸入.json>');
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

    for (const item of lessons) {
        const lesson = Number(item.lesson);
        if (!Number.isInteger(lesson) || lesson < 1) {
            console.error(`無效的 lesson：${JSON.stringify(item.lesson)}`);
            process.exit(1);
        }
        const words = Array.isArray(item.words) ? item.words : [];
        if (words.length === 0) {
            console.error(`第 ${lesson} 課沒有任何單字`);
            process.exit(1);
        }

        console.log(`\n== 第 ${lesson} 課 ==`);
        const deleted = await clearLesson(lesson);
        if (deleted > 0) console.log(`  清掉舊資料 ${deleted} 筆`);

        for (const w of words) {
            const word = (w.word || '').trim();
            const chinese = (w.chinese || '').trim();
            const pos = (w.pos || w.part || '').trim();
            if (!word) {
                console.error(`  第 ${lesson} 課有空白單字，中止`);
                process.exit(1);
            }
            await addDoc(collection(db, 'vocabulary'), {
                series: 'advanced',
                lesson,
                word,
                chinese,
                pos,
                category: '1. 單字'
            });
        }
        console.log(`  寫入 ${words.length} 個單字`);

        expectedCounts[lesson] = words.length;
        if (item.title) titles[String(lesson)] = String(item.title);
        if (lesson > maxLesson) maxLesson = lesson;
    }

    // 更新目錄 meta/advanced（totalLessons 取現有與本次最大值的較大者）
    const metaRef = doc(db, 'meta', 'advanced');
    let existingTotal = 0;
    try {
        const metaSnap = await getDoc(metaRef);
        if (metaSnap.exists()) existingTotal = metaSnap.data().totalLessons || 0;
    } catch { /* 目錄不存在時忽略 */ }
    const totalLessons = Math.max(existingTotal, maxLesson);

    await setDoc(metaRef, { totalLessons, titles }, { merge: true });
    console.log(`\n目錄 meta/advanced 已更新：totalLessons=${totalLessons}，本次寫入 ${Object.keys(titles).length} 個標題`);

    // read-back 驗證
    console.log('\n== 驗證 ==');
    let ok = true;
    for (const [lesson, expected] of Object.entries(expectedCounts)) {
        const actual = await countLesson(Number(lesson));
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
