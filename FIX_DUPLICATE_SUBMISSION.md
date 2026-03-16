# 修正：防止試煉結算重複提交問題

## 問題描述
在試煉模式完成後的結算畫面，快速多次點擊「CONTINUE」按鈕會產生多筆成績記錄，導致：
1. trialHistory 陣列中出現重複記錄
2. 可能導致 Firestore 多次寫入
3. 影響資料正確性

## 解決方案

### 實作方法：防抖動機制
使用 React state 實現按鈕防重複點擊：

#### 1. 添加狀態變數
```javascript
const [isSubmitting, setIsSubmitting] = useState(false); // 防止重复提交
```

#### 2. 修改按鈕邏輯
```javascript
<RPGButton 
    onClick={() => {
        if (isSubmitting) return; // 如果正在提交，直接返回
        setIsSubmitting(true); // 設置為提交中
        onComplete({ score, rank: rankData.rank });
    }} 
    disabled={isSubmitting}
    color="neutral" 
    className="z-10 w-full py-3"
>
    {isSubmitting ? 'SAVING...' : 'CONTINUE'}
</RPGButton>
```

### 工作原理

#### 狀態變化流程
```
初始狀態：isSubmitting = false
         ↓
用戶點擊 CONTINUE
         ↓
檢查：isSubmitting 是否為 true？
   - 是 → 直接返回（忽略點擊）
   - 否 → 繼續處理
         ↓
設置：isSubmitting = true
         ↓
調用：onComplete() 儲存資料
         ↓
離開：轉換視圖到地圖
         ↓
組件卸載（狀態重置）
```

#### 保護機制
1. **點擊攔截**：第一次點擊後，`isSubmitting` 變為 `true`
2. **後續點擊**：檢測到 `isSubmitting = true`，直接返回不執行
3. **按鈕禁用**：`disabled={isSubmitting}` 視覺上禁用按鈕
4. **文字反饋**：顯示 "SAVING..." 讓用戶知道正在處理

## 修改的檔案
- `index.html`（BattleMode 組件）

## 修改位置
- **第 1459 行**：添加 `isSubmitting` 狀態
- **第 1618-1629 行**：修改 CONTINUE 按鈕邏輯

## 測試步驟

### 測試案例 1：正常點擊
1. 完成一次試煉
2. 在結算畫面單擊一次 CONTINUE
3. **預期結果**：
   - 按鈕文字變為 "SAVING..."
   - 只產生 1 筆記錄
   - 正常返回地圖

### 測試案例 2：快速多次點擊
1. 完成一次試煉
2. 在結算畫面**快速連續點擊** CONTINUE 按鈕 5-10 次
3. **預期結果**：
   - 第一次點擊後按鈕變為禁用狀態
   - 只產生 1 筆記錄
   - 後續點擊被忽略
   - 正常返回地圖

### 測試案例 3：驗證記錄數量
1. 完成 3 次試煉，每次都快速多次點擊 CONTINUE
2. 進入「試煉日誌」查看
3. **預期結果**：
   - 只顯示 3 筆記錄
   - 沒有重複記錄

## 驗證方法

### 方法 1：查看試煉日誌
```
1. 登入遊戲
2. 完成一次試煉（快速多次點擊 CONTINUE）
3. 進入「我的冒險旅程」→「試煉日誌」
4. 檢查是否只有 1 筆新記錄
```

### 方法 2：檢查 Firestore
```
1. 打開 Firebase Console
2. 進入 Firestore Database
3. 導航到：users/{your-uid}/trialHistory
4. 確認陣列中沒有重複的時間戳記錄
```

### 方法 3：使用瀏覽器開發者工具
```javascript
// 在 Console 中執行
// 完成試煉後，在點擊 CONTINUE 前
console.log('Before:', userData.trialHistory.length);

// 快速多次點擊 CONTINUE

// 查看結果
console.log('After:', userData.trialHistory.length);
// 預期：只增加 1
```

## 技術細節

### 為什麼不用 debounce/throttle？
1. **狀態方案更直觀**：使用 React 狀態管理更符合組件邏輯
2. **不需要額外庫**：不需要引入 lodash 等第三方庫
3. **立即反饋**：用戶點擊後立即看到按鈕禁用和文字變化
4. **完全阻止**：確保 100% 阻止重複提交，而不是延遲執行

### 其他考慮的方案

#### 方案 A：使用 lodash debounce
```javascript
// 需要引入額外的庫
import debounce from 'lodash/debounce';
const handleSubmit = debounce(() => onComplete({ score, rank }), 300);
```
❌ 缺點：需要額外依賴，可能在延遲期間內仍允許多次點擊

#### 方案 B：使用 useRef
```javascript
const isSubmittingRef = useRef(false);
// 在 onClick 中檢查
if (isSubmittingRef.current) return;
isSubmittingRef.current = true;
```
❌ 缺點：無法觸發 UI 更新（按鈕不會顯示為禁用）

#### 方案 C：當前方案（useState）
```javascript
const [isSubmitting, setIsSubmitting] = useState(false);
```
✅ 優點：
- 觸發 UI 更新
- 不需要額外依賴
- 邏輯清晰
- 視覺反饋好

## 相關問題預防

### 其他可能需要防重複點擊的位置
以下位置建議使用相同機制：

1. ✅ **BattleMode CONTINUE 按鈕**（已修正）
2. 🔍 **ChallengeSetup 開始挑戰按鈕**（可能需要）
3. 🔍 **登入按鈕**（如果有網路延遲）
4. 🔍 **其他可能觸發 Firestore 寫入的按鈕**

## 注意事項

### 組件卸載
- 當用戶點擊 CONTINUE 後，組件會被卸載（切換到地圖視圖）
- 狀態會自動重置，下次進入戰鬥時 `isSubmitting` 重新為 `false`
- 不需要手動重置狀態

### 錯誤處理
如果 `onComplete` 執行失敗（例如網路錯誤），用戶可能被卡在 "SAVING..." 狀態。建議未來改進：
```javascript
try {
    await onComplete({ score, rank: rankData.rank });
} catch (error) {
    setIsSubmitting(false); // 重置狀態允許重試
    alert('保存失敗，請重試');
}
```

## 修正完成時間
- 修正時間：2026-01-20 14:36
- 測試狀態：待用戶驗證

## 驗收標準
- [x] 添加 `isSubmitting` 狀態
- [x] 修改 CONTINUE 按鈕邏輯
- [x] 添加 disabled 屬性
- [x] 添加視覺反饋（SAVING...）
- [ ] 用戶測試：快速多次點擊不會產生重複記錄
- [ ] 用戶測試：正常單次點擊功能正常
- [ ] 用戶測試：試煉日誌顯示正確數量的記錄
