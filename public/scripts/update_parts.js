/**
 * 一次性自動化腳本：為 vocabulary 集合中 1-6 冊 「1. 單字」 類別資料補充詞性 (part) 欄位
 * 
 * 推論邏輯：
 * - 結尾為「的」或描述性質 → adj.
 * - 代表動作或行為 → v.
 * - 代表人、事、物或結尾無「的」→ n.
 * - 代表程度或修飾動作 → adv.
 * 
 * 注意：不會動到「4. 一字多義」的資料，它們已經有 definitions 結構了
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, writeBatch, doc } = require('firebase/firestore');

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

async function updatePartsOfSpeech() {
    try {
        console.log('開始更新詞性...');
        console.log('='.repeat(50));

        // 統計
        let totalProcessed = 0;
        let totalUpdated = 0;
        let stats = { 'n.': 0, 'v.': 0, 'adj.': 0, 'adv.': 0 };

        // 查詢所有 category 為 "1. 單字" 的文件
        const q = query(
            collection(db, 'vocabulary'),
            where('category', '==', '1. 單字')
        );

        const snapshot = await getDocs(q);
        console.log(`找到 ${snapshot.size} 個「1. 單字」類別的文件`);
        console.log('');

        // Batch update - Firestore client SDK 的 batch 限制是 500
        const BATCH_SIZE = 450;
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const docSnapshot of snapshot.docs) {
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

            totalProcessed++;
            stats[inferredPart]++;
            batchCount++;

            // 顯示進度（每 100 個顯示一次）
            if (totalProcessed % 100 === 0) {
                console.log(`處理進度: ${totalProcessed} / ${snapshot.size}`);
            }

            // 達到 batch 限制時提交
            if (batchCount >= BATCH_SIZE) {
                process.stdout.write('.');
                await batch.commit();
                totalUpdated += batchCount;
                batchCount = 0;
                batch = writeBatch(db);
            }
        }

        // 提交剩餘的 batch
        if (batchCount > 0) {
            process.stdout.write('.');
            await batch.commit();
            totalUpdated += batchCount;
        }

        console.log('\n');
        console.log('='.repeat(50));
        console.log('更新完成！');
        console.log('');
        console.log(`總處理文件數: ${totalProcessed}`);
        console.log(`成功更新文件數: ${totalUpdated}`);
        console.log('');
        console.log('詞性分佈統計:');
        console.log(`  名詞 (n.): ${stats['n.']} 個`);
        console.log(`  動詞 (v.): ${stats['v.']} 個`);
        console.log(`  形容詞 (adj.): ${stats['adj.']} 個`);
        console.log(`  副詞 (adv.): ${stats['adv.']} 個`);

        process.exit(0);

    } catch (error) {
        console.error('更新過程中發生錯誤:', error);
        process.exit(1);
    }
}

// 執行更新
updatePartsOfSpeech();
