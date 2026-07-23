import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ────────────────────────────────────────────────────────
// Known wrong entries: key = "word::chinese_keyword", value = correct pos
// We match on BOTH word AND a substring of the chinese field to avoid
// accidentally patching homographs in DIFFERENT contexts.
// ────────────────────────────────────────────────────────
const PATCHES = [
    // ── multi-meaning words misclassified by auto-fix ──────────────────
    { word: 'study',   chineseIncludes: '書房',   correctPos: 'n.' },   // 書房 = n., not v.
    { word: 'light',   chineseIncludes: '燈',     correctPos: 'n.' },   // 燈 = n., not adj.
    { word: 'close',   chineseIncludes: '關',     correctPos: 'v.' },   // 關閉 = v., not adj.
    { word: 'station', chineseIncludes: '站',     correctPos: 'n.' },   // 車站 = n., not adj.
    { word: 'second',  chineseIncludes: '秒',     correctPos: 'n.' },   // 秒 = n., not adv.
    { word: 'spring',  chineseIncludes: '春',     correctPos: 'n.' },   // 春天 = n.  (also 泉水)
    { word: 'draw',    chineseIncludes: '畫',     correctPos: 'v.' },   // 畫 = v., not n.
    { word: 'past',    chineseIncludes: '過去',   correctPos: 'n.' },   // 過去(n.) when top-level; definitions array handles the rest
    { word: 'land',    chineseIncludes: '著陸',   correctPos: 'v.' },   // 著陸 = v.
    { word: 'turn',    chineseIncludes: '轉',     correctPos: 'v.' },   // 轉(向) = v.
    { word: 'park',    chineseIncludes: '停車',   correctPos: 'v.' },   // 停車 = v.
    { word: 'park',    chineseIncludes: '公園',   correctPos: 'n.' },   // 公園 = n.
    { word: 'watch',   chineseIncludes: '手錶',   correctPos: 'n.' },   // 手錶 = n., not v.
    { word: 'fall',    chineseIncludes: '秋',     correctPos: 'n.' },   // 秋天 = n. (top-level)
    { word: 'right',   chineseIncludes: '右',     correctPos: 'adj.' }, // 右(邊) = adj.
    { word: 'left',    chineseIncludes: '左',     correctPos: 'adj.' }, // 左(邊) = adj.
    { word: 'free',    chineseIncludes: '免費',   correctPos: 'adj.' }, // 免費的 = adj.
    { word: 'order',   chineseIncludes: '點餐',   correctPos: 'v.' },   // 點餐 = v.
    { word: 'order',   chineseIncludes: '命令',   correctPos: 'v.' },   // 命令 = v.
    { word: 'change',  chineseIncludes: '零錢',   correctPos: 'n.' },   // 零錢 = n.
    { word: 'control', chineseIncludes: '控制',   correctPos: 'v.' },   // 控制 = v.
    { word: 'play',    chineseIncludes: '玩',     correctPos: 'v.' },   // 玩 = v.
    { word: 'show',    chineseIncludes: '展示',   correctPos: 'v.' },   // 展示 = v.
    { word: 'smell',   chineseIncludes: '聞',     correctPos: 'v.' },   // 聞 = v.
    { word: 'taste',   chineseIncludes: '嚐',     correctPos: 'v.' },   // 嚐 = v.
    { word: 'sound',   chineseIncludes: '聽起來', correctPos: 'v.' },   // 聽起來 = link.v.
    { word: 'move',    chineseIncludes: '搬',     correctPos: 'v.' },   // 搬 = v.
    { word: 'pass',    chineseIncludes: '傳',     correctPos: 'v.' },   // 傳遞 = v.
    { word: 'miss',    chineseIncludes: '想念',   correctPos: 'v.' },   // 想念 = v.
    { word: 'cross',   chineseIncludes: '穿越',   correctPos: 'v.' },   // 穿越 = v.
    { word: 'set',     chineseIncludes: '設定',   correctPos: 'v.' },   // 設定 = v.
    { word: 'print',   chineseIncludes: '印',     correctPos: 'v.' },   // 印 = v.
    { word: 'copy',    chineseIncludes: '複製',   correctPos: 'v.' },   // 複製 = v.
    { word: 'rock',    chineseIncludes: '岩石',   correctPos: 'n.' },   // 岩石 = n., not n. (already n. usually—just a safety net)
    { word: 'train',   chineseIncludes: '訓練',   correctPos: 'v.' },   // 訓練 = v.
    { word: 'check',   chineseIncludes: '檢查',   correctPos: 'v.' },   // 檢查 = v.
    { word: 'enter',   chineseIncludes: '進入',   correctPos: 'v.' },   // 進入 = v.
    { word: 'answer',  chineseIncludes: '回答',   correctPos: 'v.' },   // 回答 = v.
    { word: 'mind',    chineseIncludes: '介意',   correctPos: 'v.' },   // 介意 = v.
    { word: 'mind',    chineseIncludes: '心智',   correctPos: 'n.' },   // 心智 = n.
    { word: 'place',   chineseIncludes: '放置',   correctPos: 'v.' },   // 放置 = v.
    { word: 'place',   chineseIncludes: '地方',   correctPos: 'n.' },   // 地方 = n.
    { word: 'trouble', chineseIncludes: '麻煩',   correctPos: 'n.' },   // 麻煩 = n.
    { word: 'interest',chineseIncludes: '興趣',   correctPos: 'n.' },   // 興趣 = n.
    { word: 'act',     chineseIncludes: '表演',   correctPos: 'v.' },   // 表演 = v.
    { word: 'act',     chineseIncludes: '行為',   correctPos: 'n.' },   // 行為 = n.
    { word: 'book',    chineseIncludes: '預',     correctPos: 'v.' },   // 預訂 = v.
    { word: 'water',   chineseIncludes: '澆',     correctPos: 'v.' },   // 澆水 = v.
    { word: 'work',    chineseIncludes: '作品',   correctPos: 'n.' },   // 作品 = n.
    { word: 'use',     chineseIncludes: '用途',   correctPos: 'n.' },   // 用途 = n.
    { word: 'use',     chineseIncludes: '使用',   correctPos: 'v.' },   // 使用 = v.
    { word: 'care',    chineseIncludes: '照顧',   correctPos: 'v.' },   // 照顧 = v.
    { word: 'care',    chineseIncludes: '關心',   correctPos: 'v.' },   // 關心 = v.
    { word: 'dance',   chineseIncludes: '跳舞',   correctPos: 'v.' },   // 跳舞 = v.
    { word: 'dance',   chineseIncludes: '舞蹈',   correctPos: 'n.' },   // 舞蹈 = n.
    { word: 'dream',   chineseIncludes: '夢想',   correctPos: 'n.' },   // 夢想 = n.
    { word: 'dream',   chineseIncludes: '做夢',   correctPos: 'v.' },   // 做夢 = v.
];

let totalFixed = 0;
const report = [];

const files = fs.readdirSync(ROOT).filter(f => f.startsWith('data_') && f.endsWith('.json'));

for (const filename of files) {
    const filepath = path.join(ROOT, filename);
    const items = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

    let changed = false;

    for (const item of items) {
        if (item.category !== '1. 單字') continue;
        if (!item.pos) continue;

        for (const patch of PATCHES) {
            if (
                item.word === patch.word &&
                item.chinese?.includes(patch.chineseIncludes) &&
                item.pos !== patch.correctPos
            ) {
                report.push({
                    file: filename,
                    word: item.word,
                    chinese: item.chinese,
                    oldPos: item.pos,
                    newPos: patch.correctPos,
                });
                item.pos = patch.correctPos;
                changed = true;
                totalFixed++;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(filepath, JSON.stringify(items, null, 4), 'utf-8');
        console.log(`  [PATCHED] ${filename}`);
    }
}

console.log(`\nTotal fixed: ${totalFixed}`);
if (report.length > 0) {
    console.log('\nChanges:');
    for (const r of report) {
        console.log(`  ${r.file}  ${r.word} (${r.chinese})  ${r.oldPos} → ${r.newPos}`);
    }
} else {
    console.log('No issues found - all POS are already correct.');
}
