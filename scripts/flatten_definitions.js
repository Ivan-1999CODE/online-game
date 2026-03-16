/**
 * 一次性自動化腳本：將 vocabulary 集合中「一字多義 (category 包含 4 或 一字多義)」類別的 definitions 陣列扁平化為 chinese 欄位字串
 * 
 * 任務目標：
 * 1. 篩選 (Scope): category 欄位包含 "4" 或 "一字多義" 的文件
 * 2. 轉換 (Transformation): 讀取 definitions 陣列，格式化為 "意思 (詞性)"，並用 "; " 合併
 * 3. 儲存 (Save): 存入 chinese 欄位 (字串類型)
 * 4. 清理 (Cleanup): 刪除 definitions 欄位
 * 5. 檢查 (Check): 確保 word 欄位存在
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, deleteField } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAfeRxb_HVaLU8UuJ20xgmGfxWWqMCKVvg",
    authDomain: "english-quest-95028.firebaseapp.com",
    projectId: "english-quest-95028",
    storageBucket: "english-quest-95028.firebasestorage.app",
    messagingSenderId: "657463040693",
    appId: "1:657463040693:web:3877c39a4621bf5bd57cfc",
    measurementId: "G-76L3ENZSXZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('Firebase initialized for project: english-quest-95028');

async function flattenDefinitions() {
    try {
        console.log('開始執行多義字扁平化作業...');
        console.log('篩選條件: category 包含 "4" 或 "一字多義"');
        console.log('='.repeat(50));

        // 讀取所有 vocabulary 文件進行篩選 (Firestore 不支援 contains 查詢)
        const q = collection(db, 'vocabulary');
        const snapshot = await getDocs(q);

        console.log(`資料庫中共有 ${snapshot.size} 筆 vocabulary 文件`);

        let targets = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const cat = data.category ? String(data.category) : "";

            // 條件檢查：category 包含 "4" 或 "一字多義"
            if (cat.includes("4") || cat.includes("一字多義")) {
                targets.push({ id: docSnap.id, data: data, ref: docSnap.ref });
            }
        });

        console.log(`符合篩選條件的文件數: ${targets.length}`);

        if (targets.length === 0) {
            console.log("未發現需處理的文件，程式結束。");
            process.exit(0);
        }

        const BATCH_SIZE = 450;
        let batch = writeBatch(db);
        let batchCount = 0;
        let totalUpdated = 0;

        for (const item of targets) {
            const { id, data, ref } = item;

            // 檢查 definitions 是否存在且為陣列
            if (!Array.isArray(data.definitions)) {
                console.warn(`[跳過] 文件ID: ${id} (Word: ${data.word}) - 符合 category 但 definitions 不是陣列或不存在`);
                continue;
            }

            if (data.definitions.length === 0) {
                console.warn(`[跳過] 文件ID: ${id} (Word: ${data.word}) - definitions 陣列為空`);
                continue;
            }

            // 轉換邏輯
            // 格式：意思 (詞性)
            const parts = data.definitions.map(def => {
                const mean = def.mean || "";
                const pos = def.pos || "";
                // 如果缺少其中一個，仍然儘量保留
                if (!pos) return mean;
                if (!mean) return `(${pos})`;
                return `${mean} (${pos})`;
            });

            // 合併字串
            const flattenedChinese = parts.join("; ");

            // 準備更新資料
            const updateData = {
                chinese: flattenedChinese,
                definitions: deleteField() // 刪除舊欄位
            };

            // 確保 word 欄位存在
            if (!data.word) {
                console.log(`[修正] 文件ID: ${id} 缺少 word 欄位，使用 ID 補上`);
                updateData.word = id;
            }

            // 加入 Batch
            batch.update(ref, updateData);
            batchCount++;

            // 顯示預覽 (前 3 筆)
            if (totalUpdated + batchCount <= 3) {
                console.log(`[預覽轉換] ${data.word}:`);
                console.log(`  原 definitions:`, JSON.stringify(data.definitions));
                console.log(`  新 chinese: "${flattenedChinese}"`);
                console.log('-'.repeat(30));
            }

            if (batchCount >= BATCH_SIZE) {
                process.stdout.write('.'); // 進度點
                await batch.commit();
                totalUpdated += batchCount;
                batchCount = 0;
                batch = writeBatch(db);
            }
        }

        // 提交剩餘的
        if (batchCount > 0) {
            process.stdout.write('.');
            await batch.commit();
            totalUpdated += batchCount;
        }

        console.log('\n' + '='.repeat(50));
        console.log(`作業完成！`);
        console.log(`總共更新文件數: ${totalUpdated}`);

        process.exit(0);

    } catch (error) {
        console.error('執行過程中發生嚴重錯誤:', error);
        process.exit(1);
    }
}

flattenDefinitions();
