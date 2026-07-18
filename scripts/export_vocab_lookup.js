// 匯出既有 Firestore 單字，供進階篇章資料生成器優先沿用中文與詞性。
// 用法：node scripts/export_vocab_lookup.js <輸出.json>

import { writeFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAfeRxb_HVaLU8UuJ20xgmGfxWWqMCKVvg",
    authDomain: "english-quest-95028.firebaseapp.com",
    projectId: "english-quest-95028",
    storageBucket: "english-quest-95028.firebasestorage.app",
    messagingSenderId: "657463040693",
    appId: "1:657463040693:web:3877c39a4621bf5bd57cfc"
};

const outputPath = process.argv[2];
if (!outputPath) {
    console.error('用法：node scripts/export_vocab_lookup.js <輸出.json>');
    process.exit(1);
}

const normalize = value => String(value || '').trim().toLowerCase();

function extractFields(data) {
    let chinese = String(data.chinese || data.details || '').trim();
    let pos = String(data.pos || data.part || '').trim();

    if (Array.isArray(data.definitions)) {
        if (!chinese) {
            chinese = data.definitions.map(item => item?.mean).filter(Boolean).join('；');
        }
        if (!pos) {
            pos = [...new Set(data.definitions.map(item => item?.pos).filter(Boolean))].join('/');
        }
    }

    return { chinese, pos };
}

async function main() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snapshot = await getDocs(collection(db, 'vocabulary'));
    const lookup = {};

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.series === 'advanced') return;

        const key = normalize(data.word || data.phrase);
        if (!key) return;

        const next = extractFields(data);
        const previous = lookup[key] || { chinese: '', pos: '' };
        if (!previous.chinese && next.chinese) previous.chinese = next.chinese;
        if (!previous.pos && next.pos) previous.pos = next.pos;
        lookup[key] = previous;
    });

    const sorted = Object.fromEntries(Object.entries(lookup).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(outputPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
    console.log(`已匯出 ${Object.keys(sorted).length} 個既有單字索引：${outputPath}`);
    process.exit(0);
}

main().catch(error => {
    console.error('匯出失敗：', error.message);
    process.exit(1);
});
