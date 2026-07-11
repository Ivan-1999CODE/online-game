# 規劃書：進階書地圖分頁 + 單字寶箱 A/B 拆分 + 終極試煉擴充

> 交接對象：下一個執行的 AI（或人工）。
> 撰寫日期：2026-07-11。
> **重要：本規劃的前半部分已經實作在目前的 working tree 裡（未 commit），`npm run build` 已驗證可編譯。請先讀「三、已完成的改動」，不要重做，接續「四、剩餘工作」即可。**

---

## 一、背景與目標

這是一個 RPG 風格的英文單字學習 App（React + Vite + Firebase Firestore，專案 `english-quest-95028`）。現有內容為六冊課本、16 個關卡（`LEVEL_MAPPING` 對照 book/unit），每關有四類題庫：單字寶箱（vocab）、搭配裝備（collocation）、多義藥水（polysemy）、片語捲軸（sentences）。戰鬥一次從題庫隨機抽最多 20 題。

本次要做三件事：

1. **單字寶箱拆成 A/B 兩箱**：每關單字約 70–80 個，只抽 20 題導致覆蓋率靠運氣。拆成 A/B（依字母序切半）讓學生能確實練完整個範圍。
2. **進階書獨立地圖分頁**：老師買了一本新的進階單字書，約 100 課、每課約 20 字。在世界地圖上方加「主線冒險／進階篇章」頁籤，進階地圖**一課一關**（20 字剛好對上一場 20 題，無抽樣漏字），每 10 課一「卷」做視覺分段。**每課通關 3 次才算完成**（顯示 ★★★）。
3. **終極試煉（自選測驗）加進階範圍**：ChallengeSetup 加主線／進階頁籤，可混選出題。

### 已定案的設計決策（不要重新討論）

| 決策 | 內容 |
|------|------|
| 進階資料存放 | 同一個 `vocabulary` collection，加 `series: "advanced"` 與 `lesson: <數字>` 欄位；舊資料完全不動 |
| 進階目錄 | Firestore 文件 `meta/advanced`：`{ totalLessons: <數字>, titles: { "1": "篇章名", ... } }`，由匯入腳本維護，前端動態讀取 |
| 關卡 ID | 進階第 N 課的 levelRecords key 與快取 key 都是 `adv_${N}`（helper：`advLessonId(n)`） |
| 通關定義 | 一場戰鬥打完所有題目且沒死（BattleMode `status === 'victory'`）記 1 次 clear；3 次完成。困難模式（3 命）固定，無簡單模式 |
| A/B 切法 | 依 `word` 字母序排序後切半（`Math.ceil(len/2)`），切法固定、可對照課本 |
| 舊紀錄相容 | 學生舊的 `record.vocab` 成績在 A/B 沒有新紀錄時作為兩箱的 fallback 顯示與計算 |
| levelRecords 新 key | 單字寶箱 A/B 的成績存 `vocabA` / `vocabB`（category id 是 `vocab_a` / `vocab_b`，注意兩種命名的對應） |

---

## 二、資料模型

### 進階單字文件（`vocabulary` collection）

```json
{
  "series": "advanced",
  "lesson": 1,
  "word": "abandon",
  "chinese": "拋棄；放棄",
  "pos": "v.",
  "category": "1. 單字"
}
```

### 進階目錄（`meta/advanced` 文件）

```json
{
  "totalLessons": 100,
  "titles": { "1": "People & Family", "2": "School Life" }
}
```

### 進階關卡紀錄（`users/{uid}.levelRecords["adv_N"]`）

```json
{
  "clears": 2,
  "bestScore": 180,
  "bestGrade": "A",
  "lastPlayed": "ISO 時間",
  "unlocked": true
}
```

---

## 三、已完成的改動（在 working tree，請勿重做）

以下都已改好且 `npm run build` 通過：

### `src/App.jsx`

1. **`fetchLevelData`**（約 L188）：回傳前把 `categories.vocab` 依字母序切成 `vocab_a` / `vocab_b`（`vocab` 完整保留，BOSS 與終極試煉混題仍用它）。
2. **進階資料層**（緊接在 `fetchLevelData` 後）：
   - 常數 `ADV_LESSONS_PER_SECTION = 10`、`ADV_CLEARS_TO_COMPLETE = 3`、helper `advLessonId(n)`
   - `fetchAdvancedMeta()` → 讀 `meta/advanced`
   - `fetchAdvancedLesson(lesson)` → query `series=='advanced' && lesson==N`，回傳 `{ vocab, vocab_a: [], vocab_b: [], collocation: [], polysemy: [], sentences: [] }`
3. **`GAME_DATA` 初始 content** 加了 `vocab_a: [], vocab_b: []`（`src/constants/gameData.js` 同步改了）。
4. **成就與總評**：新增 `getGradeWithVocabFallback(record, cat)` 與 `ACHIEVEMENT_CATS = ['vocabA','vocabB','equip','alchemy','scroll']`；`getUnitAchievementStatus` 與 `calculateTotalRank` 都改用它們（除數變 5）。
5. **`WorldMap`**：新 props `advMeta / activeTab / onChangeTab`；header 下方加「⚔ 主線冒險｜✦ 進階篇章」頁籤；主線列表包在 `activeTab === 'main'`；進階分頁已完整實作（無資料顯示 COMING SOON；有資料則每 10 課一卷、每課顯示 ★ 進度、3 次通關顯示金框＋✔）。
6. **`JourneyMode`**：`getMiniIcon`/`getCategoryLabel` 支援 `vocabA`/`vocabB`（寶箱A／寶箱B）；`getCategoryData` 有 legacy vocab fallback；卡片類別陣列改為 5 類。
7. **`UnitHub`**：寶箱按鈕拆成「單字寶箱 A」（id `vocab_a`）與「單字寶箱 B」（id `vocab_b`）；簡單模式過濾條件已更新。
8. **`AdvLessonHub` 元件**（新增，在 `StudyMode` 之前）：顯示 ★x/3 通關進度、BEST 成績、「學習模式」與「開始挑戰」按鈕。props：`{ node, advMeta, record, onBack, onStudy, onStartQuiz }`。**尚未接進 renderContent**。
9. **`StudyMode` `catTitles`**、**`handleBattleComplete` 的 `categoryMap`**（`vocab_a→vocabA`、`vocab_b→vocabB`）、**`historyCategoryLabels`**（單字A/單字B）、`getQuizData` 與 historyCategoryKey 的預設值 `'vocab_a'`——都已更新。

### `src/components/TeacherDashboard.jsx`

- `CATEGORY_DEFS` 改 5 類（vocabA/vocabB/equip/alchemy/scroll，含 historyKey `vocab_a`/`vocab_b`）
- `TOTAL_TASKS` 94 → 110（16×5＋6×5）
- `getCategoryData` 加 legacy vocab fallback

### `scripts/export_vocab_xlsx.js`（與本功能無關）

從 Firebase 匯出單字成 `vocab_export.xlsx` 的腳本，已完成並驗證，不用動。

---

## 四、剩餘工作（依序執行）

### 4.1 App 元件狀態接線（`src/App.jsx` 的 `App` 元件，約 L2470 起）

在 state 區新增：

```js
const [advMeta, setAdvMeta] = useState(null);   // meta/advanced 目錄
const [worldTab, setWorldTab] = useState('main'); // 'main' | 'adv'
```

登入後載入目錄（放在其他 useEffect 附近）：

```js
useEffect(() => {
    if (!userName) return;
    fetchAdvancedMeta().then(setAdvMeta);
}, [userName]);
```

`renderContent` 的 `case 'map'` 傳入新 props：

```jsx
<WorldMap ... advMeta={advMeta} activeTab={worldTab} onChangeTab={setWorldTab} />
```

### 4.2 `handleNodeSelect` 支援 adv 節點

在 boss 分支後加：

```js
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
```

尾端路由改為：

```js
if (node.type === 'boss') setView('quiz');
else if (node.type === 'adv') setView('adv-hub');
else setView('unit-hub');
```

### 4.3 `renderContent` 新增 `adv-hub`，並讓 `study`/`quiz` 對 adv 安全

```jsx
case 'adv-hub': return <AdvLessonHub
    node={selectedNode}
    advMeta={advMeta}
    record={userData?.levelRecords?.[selectedNode?.id]}
    onBack={() => { playSound('click'); setView('map'); }}
    onStudy={() => { playSound('click'); setSelectedCategory('vocab'); setView('study'); }}
    onStartQuiz={() => { playSound('click'); setView('quiz'); }}
/>;
```

`case 'study'` 現在寫 `GAME_DATA[selectedNode?.id].content`，adv id 不在 GAME_DATA 會炸，改成：

```js
data={levelDataCache[selectedNode?.id] || GAME_DATA[selectedNode?.id]?.content || { vocab: [], vocab_a: [], vocab_b: [], collocation: [], polysemy: [], sentences: [] }}
```

另外 `StudyMode` 的返回鍵 `onBack={() => setView('unit-hub')}` 對 adv 應回 `adv-hub`：改成 `onBack={() => setView(selectedNode?.type === 'adv' ? 'adv-hub' : 'unit-hub')}`。

`case 'quiz'`（BattleMode）難度條件改為（讓 adv 固定困難模式 3 命）：

```js
difficulty={(view === 'quiz' && selectedNode?.type === 'unit') ? selectedDifficulty : 'hard'}
```

`getQuizData()` 在 `if (selectedNode.type === 'unit')` 前面加：

```js
if (selectedNode.type === 'adv') {
    return levelDataCache[selectedNode.id]?.vocab || [];
}
```

### 4.4 `BattleMode` 回傳 victory 旗標

結算畫面兩顆按鈕（CONTINUE 與 RETRY，搜尋 `onComplete({ score, rank: rankData.rank, battleLog`）都加上：

```js
onComplete({ score, rank: rankData.rank, battleLog, victory: status === 'victory' });
// RETRY 那顆保留 retry: true
```

### 4.5 `handleBattleComplete` 記錄進階通關

第 3 段（Level Records）在 `else if (selectedNode.type === 'boss')` 之後加：

```js
} else if (selectedNode.type === 'adv') {
    const levelId = selectedNode.id;
    const prevRecord = updatedUserData.levelRecords?.[levelId] || {};
    const rankOrder = { 'S': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, '?': 0 };
    const clears = (prevRecord.clears || 0) + (result.victory ? 1 : 0);
    const bestGrade = (rankOrder[result.rank] || 0) > (rankOrder[prevRecord.bestGrade] || 0)
        ? result.rank : (prevRecord.bestGrade || result.rank);
    const newRecord = {
        ...prevRecord,
        clears,
        bestScore: Math.max(prevRecord.bestScore || 0, result.score),
        bestGrade,
        lastPlayed: new Date().toISOString(),
        unlocked: true
    };
    updatedUserData.levelRecords = { ...updatedUserData.levelRecords, [levelId]: newRecord };
    updatesForFirestore[`levelRecords.${levelId}`] = newRecord;
}
```

第 4 段（trialHistory）在 `if (selectedNode.type === 'boss')` 之後、一般 unit 的 `else` 之前加：

```js
} else if (selectedNode.type === 'adv') {
    historyType = "practice";
    historyUnitTitle = `進階 L${selectedNode.lesson}`;
    historyCategoryKey = 'vocab';
    historyCategoryLabel = '進階單字';
}
```

### 4.6 終極試煉（ChallengeSetup）加進階頁籤

`ChallengeSetup`（搜尋 `const ChallengeSetup`）：

- 新 prop `advMeta`；`renderContent` 的 `case 'challenge-setup'` 傳入。
- 加 `const [tab, setTab] = useState('main')`，UI 同 WorldMap 的頁籤樣式。
- 主線分頁維持現有 16 關卡拍立得選擇；進階分頁改為緊湊格子（`grid-cols-4`），每格顯示 `L1`…`L{totalLessons}` 與已選狀態，id 用 `adv_1` 格式。`advMeta` 為空時顯示「進階篇章準備中」。
- 「全選」只切換**當前分頁**的項目（主線 16 個或進階全部課次），選取數顯示 `selectedUnits.length` 不變。

`handleStartChallenge` 的抓取改成：

```js
const promises = selectedIds.map(async uid => {
    if (!levelDataCache[uid]) {
        const data = String(uid).startsWith('adv_')
            ? await fetchAdvancedLesson(parseInt(String(uid).slice(4), 10))
            : await fetchLevelData(uid);
        return { id: uid, data };
    }
    return null;
});
```

`handleBattleComplete` 的 challenge 標題組字（`challengeUnits.map(...)`）加 adv 處理：

```js
if (String(unitId).startsWith('adv_')) return `進階 L${String(unitId).slice(4)}`;
```

`getMixedQuizData` 不用改（進階 content 只有 vocab，比例分配會自動用 vocab 補滿）。

### 4.7 匯入腳本 `scripts/import_advanced.js`

Node ESM（專案 `"type": "module"`），用 firebase client SDK（config 抄 `src/config/firebase.js`，寫法參考 `scripts/export_vocab_xlsx.js`）。

- 用法：`node scripts/import_advanced.js <輸入.json>`
- 輸入格式（之後拍照辨識也產出這個格式）：

```json
[
  {
    "lesson": 1,
    "title": "篇章標題（可省略）",
    "words": [ { "word": "abandon", "chinese": "拋棄；放棄", "pos": "v." } ]
  }
]
```

- 行為：
  1. 對每個 lesson：先查 `series=='advanced' && lesson==N` 的舊文件全部刪除（可重複執行、覆蓋修正）。
  2. 逐字寫入：`{ series: 'advanced', lesson, word, chinese, pos, category: '1. 單字' }`。
  3. 用 `setDoc(doc(db,'meta','advanced'), {...}, { merge: true })` 更新 `totalLessons`（取現有值與本次最大 lesson 的較大者）與 `titles`（merge）。
  4. 結尾 read-back 驗證：重新 query 每課筆數並列印，數量不符要報錯（exit 1）。
- 另建 `data_advanced_sample.json`：2 課 × 20 個範例進階單字（可自行編，標題註明「範例」），供端到端驗證；真書資料進來後直接重跑匯入即可覆蓋。

### 4.8 驗證清單（宣告完成前逐項執行）

依 CORE_RULES：宣告完成前必須用產出以外的手段驗證。

1. `npm run build` 通過。
2. 開 dev server 實測主線：關卡大廳顯示「單字寶箱 A / B」兩顆；簡單模式顯示 A、B、捲軸三顆；打完 A 箱，Firestore `levelRecords.{n}.vocabA` 有成績；冒險旅程卡片顯示寶箱A/寶箱B 兩列；教師後台類別欄顯示單字A/單字B。
3. 跑 `node scripts/import_advanced.js data_advanced_sample.json`，重新整理後「進階篇章」分頁出現第 1 卷與課次節點。
4. 進階課：學習模式可翻卡；挑戰打贏一次 → 星星變 ★☆☆、`levelRecords.adv_1.clears == 1`；打滿 3 次 → 金框＋✔。戰死（HP 歸零）不增加 clears。
5. 終極試煉：混選主線 1 關＋進階 1 課，出題包含兩邊單字；試煉日誌標題含「進階 L1」。
6. 舊紀錄相容：找一個已有 `vocab` 成績的測試帳號，確認冒險旅程 A/B 兩列顯示舊成績、地圖成就勾勾邏輯正常。

---

## 五、注意事項與風險

- **教師後台進度百分比會整體下降**：分母從 94 變 110，屬預期行為，跟老師（Ivan）說明即可。
- **舊生的單字成績**：拆箱後沿用為 A/B 兩箱的 fallback；學生重打 A 或 B 後以新成績為準。
- **Firestore 索引**：`series==X && lesson==N` 是雙等值查詢，通常不需複合索引；若 console 出現帶連結的 index 錯誤，點連結建立即可。
- **Firestore 安全規則**：確認登入使用者可讀 `meta/advanced`；匯入腳本需要 `vocabulary` 與 `meta` 的寫入權限（現有匯入腳本同樣模式可行，代表規則已允許）。
- **`src/utils/firebase-utils.js` 是死程式碼**（無任何 import），本次不用動它，之後可清掉。
- **git 狀態**：working tree 還有一批已刪除的舊匯入腳本與 `vocab_export.xlsx` 等未 commit 的雜項，commit 時請把功能改動與清理分開處理。

## 六、後續（不在本次範圍）

- 拍照辨識新書單字：拍每課 1–2 張照片丟給 AI（Claude）辨識，輸出 4.7 的 JSON 格式，人工過目後跑匯入腳本。不要自建 OCR。
- 錯題／未見過的字加權抽題（補主線覆蓋率的進一步優化）。
- 進階課數多達百課時，可再加「跳到第 X 卷」快捷導航。
