// 從 Firebase 抓取 vocabulary collection 的單字，匯出成 Excel（.xlsx）
// 用法：node scripts/export_vocab_xlsx.js
// 輸出：vocab_export.xlsx（每一冊一個工作表，欄位：單元、單字、中文）

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import XLSX from 'xlsx';

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

async function main() {
    console.log('正在從 Firestore 抓取 vocabulary collection...');
    const snapshot = await getDocs(collection(db, 'vocabulary'));
    console.log(`共抓到 ${snapshot.size} 筆資料`);

    // 只取「單字」類別（category 含 "1" 或 "單字"）
    const words = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        const cat = String(d.category || '');
        if (!cat.includes('1') && !cat.includes('單字')) return;
        words.push({
            book: d.book || 0,
            unit: String(d.unit || ''),
            word: d.word || d.phrase || '',
            chinese: d.chinese || ''
        });
    });
    console.log(`其中單字類共 ${words.length} 筆`);

    // 依 冊 → 單元 → 字母 排序
    words.sort((a, b) =>
        a.book - b.book ||
        a.unit.localeCompare(b.unit, undefined, { numeric: true }) ||
        a.word.localeCompare(b.word)
    );

    // 每一冊一個工作表
    const wb = XLSX.utils.book_new();
    const books = [...new Set(words.map(w => w.book))];
    for (const book of books) {
        const rows = words
            .filter(w => w.book === book)
            .map(w => ({ 單元: w.unit, 單字: w.word, 中文: w.chinese }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 8 }, { wch: 24 }, { wch: 36 }];
        XLSX.utils.book_append_sheet(wb, ws, `第${book}冊`);
        console.log(`  第${book}冊：${rows.length} 個單字`);
    }

    const outFile = 'vocab_export.xlsx';
    XLSX.writeFile(wb, outFile);
    console.log(`已輸出：${outFile}`);
    process.exit(0);
}

main().catch(err => {
    console.error('匯出失敗：', err.message);
    process.exit(1);
});
