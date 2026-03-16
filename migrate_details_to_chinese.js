/**
 * 資料遷移腳本：將 "4. 一字多義" 類別中的 details 欄位轉換為 chinese 欄位
 * 
 * 轉換邏輯：
 * - 原始格式："形: 好的 / 形: 晴朗的 / 名: 罰款"
 * - 目標格式："好的 (形容詞); 晴朗的 (形容詞); 罰款 (名詞)"
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc, deleteField } = require('firebase/firestore');

// Firebase 設定
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

// 詞性縮寫對照表
const posMapping = {
    '形': '形容詞',
    '名': '名詞',
    '動': '動詞',
    '副': '副詞',
    '介': '介詞',
    '連': '連接詞',
    '代': '代名詞',
    '感': '感嘆詞'
};

/**
 * 將 details 格式轉換為 chinese 格式
 * @param {string} details - 原始 details 字串 (例如: "形: 好的 / 形: 晴朗的 / 名: 罰款")
 * @returns {string} - 轉換後的 chinese 字串 (例如: "好的 (形容詞); 晴朗的 (形容詞); 罰款 (名詞)")
 */
function convertDetailsToChinese(details) {
    if (!details || typeof details !== 'string') {
        return '';
    }

    // 分割各個定義 (以 " / " 分隔)
    const definitions = details.split(' / ').map(def => def.trim()).filter(def => def);

    const converted = definitions.map(def => {
        // 格式: "形: 好的" 或 "名: 罰款"
        const match = def.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            const posShort = match[1].trim();
            const meaning = match[2].trim();
            const posFull = posMapping[posShort] || posShort;
            return `${meaning} (${posFull})`;
        }
        return def; // 如果格式不匹配，保留原樣
    });

    return converted.join('; ');
}

async function migrateDetailsToChinesе() {
    console.log('🚀 開始資料遷移：details → chinese');
    console.log('='.repeat(50));

    try {
        // 查詢所有 "4. 一字多義" 類別的文件
        const q = query(
            collection(db, 'vocabulary'),
            where('category', '==', '4. 一字多義')
        );

        const snapshot = await getDocs(q);
        console.log(`📊 共找到 ${snapshot.size} 筆 "4. 一字多義" 資料`);

        let updatedCount = 0;
        let skippedCount = 0;
        const updatePromises = [];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const docPath = docSnap.ref.path;

            // 檢查是否有 details 但沒有 chinese
            if (data.details && !data.chinese) {
                const newChinese = convertDetailsToChinese(data.details);

                console.log(`\n📝 更新文件: ${docPath}`);
                console.log(`   單字: ${data.word}`);
                console.log(`   原始 details: "${data.details}"`);
                console.log(`   轉換後 chinese: "${newChinese}"`);

                // 建立更新 Promise
                const updatePromise = updateDoc(doc(db, 'vocabulary', docSnap.id), {
                    chinese: newChinese,
                    details: deleteField()  // 刪除 details 欄位
                }).then(() => {
                    console.log(`   ✅ 更新成功!`);
                }).catch(err => {
                    console.log(`   ❌ 更新失敗: ${err.message}`);
                });

                updatePromises.push(updatePromise);
                updatedCount++;
            } else if (data.chinese) {
                skippedCount++;
            } else {
                console.log(`\n⚠️ 文件 ${docPath} (${data.word}) 沒有 details 也沒有 chinese`);
            }
        });

        // 等待所有更新完成
        await Promise.all(updatePromises);

        console.log('\n' + '='.repeat(50));
        console.log('📊 遷移統計：');
        console.log(`   ✅ 更新: ${updatedCount} 筆`);
        console.log(`   ⏭️ 跳過 (已有 chinese): ${skippedCount} 筆`);
        console.log('🎉 遷移完成!');

    } catch (error) {
        console.error('❌ 遷移過程發生錯誤:', error);
        throw error;
    }
}

// 執行遷移
migrateDetailsToChinesе()
    .then(() => {
        console.log('\n👋 腳本執行完畢');
        process.exit(0);
    })
    .catch(err => {
        console.error('腳本執行失敗:', err);
        process.exit(1);
    });
