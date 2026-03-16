/**
 * 全冊詞性自動補完與清理腳本（Book 1-6）
 * 
 * 執行邏輯：
 * - [1. 單字]：根據中文意思推論詞性（n., v., adj., adv.）
 * - [2. 片語搭配字]：移除 part 欄位（不顯示詞性）
 * - [3. 片語 & 佳句]：移除 part 欄位（不顯示詞性）
 * - [4. 一字多義]：不處理，保持原有 definitions 結構
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, writeBatch, doc, deleteField } = require('firebase/firestore');

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

/**
 * 根據中文意思推論詞性
 * @param {string} chinese - 中文意思
 * @returns {string} - 詞性縮寫 (n., v., adj., adv.)
 */
function inferPartOfSpeech(chinese) {
    if (!chinese || typeof chinese !== 'string') {
        return 'n.'; // 預設為名詞
    }

    const trimmed = chinese.trim();

    // 副詞檢測：通常表示程度、方式、頻率等
    const adverbPatterns = [
        /^非常/, /^很/, /^極/, /^特別/, /^已經/, /^總是/, /^經常/, /^常常/,
        /^偶爾/, /^從不/, /^幾乎/, /^大概/, /^可能/, /^確實/, /^完全/,
        /地$/, // 結尾為「地」通常是副詞（如：慢慢地、快速地）
    ];

    for (const pattern of adverbPatterns) {
        if (pattern.test(trimmed)) {
            return 'adv.';
        }
    }

    // 形容詞檢測：結尾為「的」、或描述性質、狀態、特徵
    const adjectivePatterns = [
        /的$/, // 結尾為「的」
        /^.*性的?$/, // X性的 或 X性
        /好的?$/, /壞的?$/, /大的?$/, /小的?$/, /高的?$/, /低的?$/, /新的?$/, /舊的?$/, /快的?$/, /慢的?$/,
        /美麗/, /漂亮/, /帥/, /醜/, /乾淨/, /髒/, /整齊/, /凌亂/,
        /快樂/, /悲傷/, /生氣/, /害怕/, /興奮/, /無聊/, /開心/, /難過/,
        /聰明/, /愚笨/, /勇敢/, /膽小/, /善良/, /邪惡/,
        /便宜/, /昂貴/, /免費/,
        /困難/, /簡單/, /容易/, /複雜/,
        /重要/, /特別/, /普通/, /一般/,
        /熱/, /冷/, /溫暖/, /涼爽/, /濕/, /乾/,
        /輕/, /重/, /硬/, /軟/, /厚/, /薄/,
        /年輕/, /年老/, /老的?/, /年輕的?/,
        /安全/, /危險/,
        /乾淨/, /髒亂/,
        /有趣/, /無趣/,
        /健康/, /生病/,
        /忙/, /閒/,
        /強/, /弱/,
        /長/, /短/,
        /寬/, /窄/,
        /深/, /淺/,
        /亮/, /暗/,
        /濃/, /淡/,
        /飽/, /餓/,
        /遠/, /近/,
        /早/, /晚/,
        /多/, /少/,
        /滿/, /空/,
        /可愛/, /討厭/,
        /美味/, /難吃/,
        /正確/, /錯誤/,
        /真/, /假/,
        /好看/, /難看/,
        /精彩/, /無聊/,
    ];

    for (const pattern of adjectivePatterns) {
        if (pattern.test(trimmed)) {
            return 'adj.';
        }
    }

    // 動詞檢測：代表動作或行為
    const verbPatterns = [
        // 常見動詞結尾
        /^[去來走跑跳飛游爬滾躺坐站蹲]/,
        /^[吃喝吸吐咬嚼嘗]/,
        /^[看聽說讀寫唱講念]/,
        /^[打踢推拉抓握捏挖扔丟]/,
        /^[買賣租借換給送收付]/,
        /^[做作造修蓋建拆裝]/,
        /^[開關鎖敲按壓切割]/,
        /^[穿脫戴摘換披]/,
        /^[洗刷擦拖掃倒]/,
        /^[學教練習研究思考]/,
        /^[玩睡醒休息工作]/,
        /^[愛恨喜歡討厭擔心害怕]/,
        /^[笑哭叫喊]/,
        /^[生死活殺救]/,
        /^[找尋搜]/,
        /^[等待]/,
        /^[幫助]/,
        /^[選擇決定]/,
        /^[記住忘記]/,
        /^[相信懷疑]/,
        /^[同意反對]/,
        /^[接受拒絕]/,
        /^[開始結束完成]/,
        /^[成功失敗]/,
        /^[加入離開進入]/,
        /^[使用利用]/,
        /^[保護照顧]/,
        /^[提供準備]/,
        /^[介紹推薦]/,
        /^[解釋說明描述]/,
        /^[比較區分]/,
        /^[改變變化]/,
        /^[增加減少]/,
        /^[訂購預約]/,
        /^[申請報名註冊登入]/,
        // 動詞行為詞彙
        /做/, /作/, /吃/, /喝/, /看/, /聽/, /說/, /讀/, /寫/, /唱/,
        /走/, /跑/, /跳/, /飛/, /游/, /爬/, /滾/,
        /打/, /踢/, /推/, /拉/, /抓/, /握/, /扔/, /丟/, /拿/, /帶/,
        /買/, /賣/, /租/, /借/, /換/, /給/, /送/, /收/, /付/,
        /開/, /關/, /鎖/, /敲/, /按/, /壓/, /切/, /割/,
        /穿/, /脫/, /戴/, /摘/, /披/,
        /洗/, /刷/, /擦/, /拖/, /掃/, /倒/,
        /學/, /教/, /練/, /研究/, /思考/, /想/,
        /玩/, /睡/, /醒/, /休息/, /工作/,
        /愛/, /恨/, /喜歡/, /討厭/, /擔心/, /害怕/,
        /笑/, /哭/, /叫/, /喊/,
        /找/, /尋/, /搜/, /查/,
        /等/, /待/,
        /幫/, /助/,
        /選/, /擇/, /決/, /定/,
        /記/, /忘/,
        /信/, /疑/,
        /接受/, /拒絕/, /同意/, /反對/,
        /開始/, /結束/, /完成/,
        /成功/, /失敗/,
        /加入/, /離開/, /進入/, /出去/,
        /使用/, /利用/,
        /保護/, /照顧/,
        /提供/, /準備/,
        /介紹/, /推薦/,
        /解釋/, /說明/, /描述/,
        /比較/, /區分/,
        /改變/, /變化/,
        /增加/, /減少/,
        /訂購/, /預約/,
        /申請/, /報名/, /註冊/, /登入/,
        /遇見/, /發現/, /跟隨/, /遵守/, /叫醒/, /點燃/,
        /停車/, /掉落/, /歡迎/, /感謝/,
    ];

    for (const pattern of verbPatterns) {
        if (pattern.test(trimmed)) {
            return 'v.';
        }
    }

    // 預設為名詞：代表人、事、物
    return 'n.';
}

async function updateAllVocabulary() {
    try {
        console.log('開始執行全冊詞性補完與清理...');
        console.log('='.repeat(60));

        // 統計
        let stats = {
            vocabProcessed: 0,
            vocabUpdated: 0,
            collocationProcessed: 0,
            collocationRemoved: 0,
            sentencesProcessed: 0,
            sentencesRemoved: 0,
            polysemySkipped: 0,
            partStats: { 'n.': 0, 'v.': 0, 'adj.': 0, 'adv.': 0 }
        };

        // === 1. 處理「1. 單字」類別：補充詞性 ===
        console.log('\n[1/3] 處理「1. 單字」類別...');
        const vocabQuery = query(
            collection(db, 'vocabulary'),
            where('category', '==', '1. 單字')
        );

        const vocabSnapshot = await getDocs(vocabQuery);
        console.log(`  找到 ${vocabSnapshot.size} 個單字文件`);

        const BATCH_SIZE = 450;
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const docSnapshot of vocabSnapshot.docs) {
            const data = docSnapshot.data();

            // 確保 book 在 1-6 範圍內
            if (data.book < 1 || data.book > 6) {
                continue;
            }

            // 推論詞性
            const inferredPart = inferPartOfSpeech(data.chinese);

            // 更新文件
            const docRef = doc(db, 'vocabulary', docSnapshot.id);
            batch.update(docRef, { part: inferredPart });

            stats.vocabProcessed++;
            stats.partStats[inferredPart]++;
            batchCount++;

            // 顯示進度
            if (stats.vocabProcessed % 100 === 0) {
                process.stdout.write('.');
            }

            // 達到 batch 限制時提交
            if (batchCount >= BATCH_SIZE) {
                await batch.commit();
                stats.vocabUpdated += batchCount;
                batchCount = 0;
                batch = writeBatch(db);
            }
        }

        // 提交剩餘的 batch
        if (batchCount > 0) {
            await batch.commit();
            stats.vocabUpdated += batchCount;
            batchCount = 0;
            batch = writeBatch(db);
        }
        console.log(`\n  已更新 ${stats.vocabUpdated} 個單字的詞性`);

        // === 2. 處理「2. 片語搭配字」類別：移除 part ===
        console.log('\n[2/3] 處理「2. 片語搭配字」類別（移除 part）...');
        const collocationQuery = query(
            collection(db, 'vocabulary'),
            where('category', '==', '2. 片語搭配字')
        );

        const collocationSnapshot = await getDocs(collocationQuery);
        console.log(`  找到 ${collocationSnapshot.size} 個片語搭配字文件`);

        for (const docSnapshot of collocationSnapshot.docs) {
            const data = docSnapshot.data();

            // 確保 book 在 1-6 範圍內
            if (data.book < 1 || data.book > 6) {
                continue;
            }

            // 如果有 part 欄位，將其移除
            if (data.part !== undefined) {
                const docRef = doc(db, 'vocabulary', docSnapshot.id);
                batch.update(docRef, { part: deleteField() });
                stats.collocationRemoved++;
                batchCount++;
            }
            stats.collocationProcessed++;

            // 達到 batch 限制時提交
            if (batchCount >= BATCH_SIZE) {
                await batch.commit();
                batchCount = 0;
                batch = writeBatch(db);
            }
        }

        // 提交剩餘的 batch
        if (batchCount > 0) {
            await batch.commit();
            batchCount = 0;
            batch = writeBatch(db);
        }
        console.log(`  已從 ${stats.collocationRemoved} 個片語搭配字移除 part 欄位`);

        // === 3. 處理「3. 片語 & 佳句」類別：移除 part ===
        console.log('\n[3/3] 處理「3. 片語 & 佳句」類別（移除 part）...');
        const sentencesQuery = query(
            collection(db, 'vocabulary'),
            where('category', '==', '3. 片語 & 佳句')
        );

        const sentencesSnapshot = await getDocs(sentencesQuery);
        console.log(`  找到 ${sentencesSnapshot.size} 個片語佳句文件`);

        for (const docSnapshot of sentencesSnapshot.docs) {
            const data = docSnapshot.data();

            // 確保 book 在 1-6 範圍內
            if (data.book < 1 || data.book > 6) {
                continue;
            }

            // 如果有 part 欄位，將其移除
            if (data.part !== undefined) {
                const docRef = doc(db, 'vocabulary', docSnapshot.id);
                batch.update(docRef, { part: deleteField() });
                stats.sentencesRemoved++;
                batchCount++;
            }
            stats.sentencesProcessed++;

            // 達到 batch 限制時提交
            if (batchCount >= BATCH_SIZE) {
                await batch.commit();
                batchCount = 0;
                batch = writeBatch(db);
            }
        }

        // 提交剩餘的 batch
        if (batchCount > 0) {
            await batch.commit();
        }
        console.log(`  已從 ${stats.sentencesRemoved} 個片語佳句移除 part 欄位`);

        // === 4. 報告 4. 一字多義 跳過數量 ===
        console.log('\n[跳過] 「4. 一字多義」類別...');
        const polysemyQuery = query(
            collection(db, 'vocabulary'),
            where('category', '==', '4. 一字多義')
        );
        const polysemySnapshot = await getDocs(polysemyQuery);
        stats.polysemySkipped = polysemySnapshot.size;
        console.log(`  已跳過 ${stats.polysemySkipped} 個一字多義文件（保持原有 definitions 結構）`);

        // 最終報告
        console.log('\n' + '='.repeat(60));
        console.log('✅ 全冊詞性補完與清理完成！');
        console.log('');
        console.log('📊 處理統計:');
        console.log(`  【1. 單字】處理: ${stats.vocabProcessed} 個，更新: ${stats.vocabUpdated} 個`);
        console.log(`  【2. 片語搭配字】處理: ${stats.collocationProcessed} 個，移除 part: ${stats.collocationRemoved} 個`);
        console.log(`  【3. 片語 & 佳句】處理: ${stats.sentencesProcessed} 個，移除 part: ${stats.sentencesRemoved} 個`);
        console.log(`  【4. 一字多義】跳過: ${stats.polysemySkipped} 個`);
        console.log('');
        console.log('📈 詞性分佈統計（僅「1. 單字」）:');
        console.log(`  名詞 (n.): ${stats.partStats['n.']} 個`);
        console.log(`  動詞 (v.): ${stats.partStats['v.']} 個`);
        console.log(`  形容詞 (adj.): ${stats.partStats['adj.']} 個`);
        console.log(`  副詞 (adv.): ${stats.partStats['adv.']} 個`);

        process.exit(0);

    } catch (error) {
        console.error('❌ 處理過程中發生錯誤:', error);
        process.exit(1);
    }
}

// 執行更新
updateAllVocabulary();
