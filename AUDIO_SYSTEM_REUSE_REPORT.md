# 英文學習專案現行音訊系統整理報告

報告日期：2026-07-29（Asia/Taipei）

## 1. 報告範圍

本報告整理目前專案正在使用的 3 類音訊功能：

1. 英文發音：AI 預先產生的 MP3、裝置內建 TTS 備援、語音選擇與索引。
2. 音樂與音效：大廳／挑戰背景音樂，以及答題、點擊等合成音效。
3. 大小聲控制：背景音樂音量、靜音、瀏覽器自動播放限制與波形檢查。

主要依據：

- `src/utils/audio.js`：播放、TTS 備援、BGM、靜音、音量與合成音效。
- `src/App.jsx`：畫面狀態、播放時機、語音切換與音量 UI。
- `scripts/tts_inventory.mjs`：發音文字、特殊唸法、去重與索引規則。
- `scripts/generate_tts_all.mjs`：AI 語音批次產生與續跑機制。
- `src/constants/ttsAudioData.js`：執行階段的單字到音檔路徑索引。
- `scripts/audit_tts_audio.mjs`：MP3 結構、長度及選配語意轉錄檢查。
- `scripts/audit_tts_waveform_server.mjs`：靜音、過小聲、爆音及尾音截斷檢查。

## 2. 現行架構總覽

```text
教材 JSON
   │
   ▼
建立 TTS inventory
   ├─ 修正特殊句型與符號
   ├─ 指定同形異音／重音
   ├─ 依 spokenText + instruction 去重
   └─ 產生穩定雜湊檔名
   │
   ▼
OpenAI TTS 批次產生 marin / cedar MP3
   │
   ├─ public/audio/tts/library/marin/
   ├─ public/audio/tts/library/cedar/
   └─ src/constants/ttsAudioData.js
   │
   ▼
React 畫面取得 { marin, cedar } 音檔路徑
   │
   ▼
speakText()
   ├─ 優先播放指定 MP3
   └─ 缺檔／播放失敗時改用瀏覽器 speechSynthesis
```

背景音樂與音效是另一條獨立路徑：

```text
App 畫面狀態
   ├─ quiz / challenge-quiz → BATTLE.MP3
   └─ 其他登入後畫面       → HOME.MP3

音量滑桿 → setVolume(0～1) → Web Audio GainNode
                              └─ 不支援時改用 HTMLAudioElement.volume

UI 操作／答題事件 → playSound(type) → OscillatorNode + GainNode
```

## 3. 英文發音處理

### 3.1 播放端

`speakText(text, audioSources, scopeKey, voiceOverride)` 的處理順序如下：

1. 選擇 `marin` 或 `cedar`。
2. 若有預先產生的 MP3，先停止上一段發音，再播放新音檔。
3. MP3 不存在、載入失敗或 `play()` 被拒絕時，改用裝置內建 TTS。
4. 裝置 TTS 優先找非網路型的美式英文聲音，再退回任一英文聲音。
5. 裝置 TTS 語速固定為 `0.8`。

同一時間只保留一段英文發音，使用者連續點擊時不會讓多個單字疊在一起。語音偏好使用 `localStorage` 保存，key 格式為：

```text
englishQuestTtsVoice:<scopeKey>
```

目前 `scopeKey` 以課本單元或進階課程為單位，因此不同單元可以各自記住 `marin`／`cedar` 選擇。

### 3.2 發音資料前處理

教材顯示文字不一定適合直接送入 TTS，因此 inventory 先建立「畫面文字」與「實際朗讀文字」的分離層。

處理內容包括：

- 將 `+ n`、`+ v-ing`、人物佔位符等教學寫法改成自然英文。
- 將 `/` 代表的替代說法拆成有停頓的完整片語。
- 不朗讀括號、斜線、加號、省略號等符號。
- 對 `address`、`record`、`produce` 等名詞／動詞重音差異提供明確指令。
- 依中文意思判斷 `bow`、`close`、`present` 等同形異音。
- 對 `read`、`lead`、`wind`、`use` 等指定本教材需要的讀音。

音檔規格以以下內容建立 16 碼 SHA-256 識別碼：

```text
normalize(spokenText) + "\n" + normalize(instruction)
```

檔名則是：

```text
<可讀 slug>-<16 碼規格 ID>.mp3
```

這種做法有 3 個好處：

- 相同朗讀內容可以跨課程共用音檔。
- 發音指令有改動時，檔名會自然換版，不會誤用舊快取。
- 檔名仍保留可讀單字，方便人工查找。

執行階段先用「系列／冊／單元／類別／英文／中文」精確配對；只有當相同英文與中文只對應一種發音時，才使用簡化 fallback key，避免同形異音配錯檔。

### 3.3 批次產生

現行設定：

| 項目 | 設定 |
|---|---|
| 模型 | `gpt-4o-mini-tts` |
| 語音 | `marin`、`cedar` |
| 格式 | MP3 |
| 口音方向 | 清楚、自然的 General American English |
| 教學語速 | 略慢於一般語速 |
| 平行數 | 預設 6，限制於 1～8 |
| API 重試 | 最多 5 次，指數退避，最長等待 15 秒 |
| 檔案基本門檻 | 回應必須為 audio content type，且大於 500 bytes |

產生流程支援：

- `--dry-run`：只建立 inventory、索引與統計，不呼叫 TTS API。
- `--limit=N`：小批量試跑。
- `--concurrency=N`：調整 API 平行數。
- `--retry-report=<path>`：只重做波形報告中的靜音、過小聲或解碼失敗檔案。
- 既有有效檔案跳過。
- 以 `.tmp` 寫入後再 rename，避免中途留下半個 MP3。
- 每個音檔記錄 bytes、SHA-256、來源與完成時間，方便續跑和稽核。

### 3.4 現有資料規模

目前產生紀錄顯示：

| 指標 | 數量 |
|---|---:|
| 課本資料檔 | 16 |
| 課本項目 | 1,740 |
| 進階課程 | 133 |
| 進階項目 | 2,152 |
| 總教材項目 | 3,892 |
| 去重後發音規格 | 2,572 |
| 因去重而共用音檔的項目 | 1,320 |
| 索引碰撞 | 0 |
| 每個語音的 MP3 | 2,572 |
| 兩種語音合計 | 5,144 |
| TTS 音檔總大小 | 約 119.4 MB |

## 4. 背景音樂處理

### 4.1 曲目與切換

目前實際使用的檔案為：

| 類型 | 檔案 | 使用畫面 |
|---|---|---|
| 大廳音樂 | `/audio/HOME.MP3` | 登入後除測驗外的大多數畫面 |
| 挑戰音樂 | `/audio/BATTLE.MP3` | `quiz`、`challenge-quiz` |

兩首音樂共用一個 `HTMLAudioElement`，並設定 `loop = true`。切換畫面時由 React effect 呼叫 `playMusic(type)`；登出時呼叫 `stopMusic()`，暫停、歸零並清除目前曲目狀態。

### 4.2 行動裝置與自動播放

瀏覽器通常不允許網頁在沒有使用者操作時直接播放聲音。現行做法是在開始按鈕等使用者手勢中呼叫 `unlockAudio()`：

1. 建立或恢復 `AudioContext`。
2. 嘗試短暫播放 BGM。
3. 立即暫停並將時間歸零。

若仍被瀏覽器阻擋，程式只記錄訊息，不會讓整個畫面出錯。

### 4.3 BGM 播放圖

支援 Web Audio API 時：

```text
HTMLAudioElement
   → MediaElementAudioSourceNode
   → GainNode
   → AudioContext.destination
```

不支援或建立圖失敗時：

```text
HTMLAudioElement.volume = currentVolume
```

這個 fallback 讓舊瀏覽器仍可調整背景音樂大小。

## 5. 遊戲音效處理

`playSound(type)` 不使用音檔，而是即時建立 oscillator 和 gain envelope：

| 類型 | 波形／頻率概念 | 初始 gain | 時長 |
|---|---|---:|---:|
| `correct` | square，900 → 1,200 Hz | 0.10 | 0.4 秒 |
| `wrong` | sawtooth，150 → 50 Hz | 0.20 | 0.3 秒 |
| `click` | triangle，600 Hz | 0.05 | 0.1 秒 |
| `tick` | square，800 Hz | 0.05 | 0.05 秒 |
| `start` | sine，400 → 800 Hz | 0.10 | 0.3 秒 |
| `success` | triangle，500 → 1,000 Hz | 0.10 | 0.5 秒 |

這種方式不需要另外存放音效檔，所有效果都由程式即時產生。

## 6. 大小聲與靜音處理

### 6.1 現行行為

- UI 音量範圍為 `0～100`，預設 `50`。
- 傳入音訊模組前除以 100，轉為 `0～1`。
- `setVolume()` 會再次 clamp 到 `0～1`。
- Web Audio 模式直接設定 `GainNode.gain.value`。
- fallback 模式設定 `HTMLAudioElement.volume`。
- 靜音會暫停 BGM；解除靜音會嘗試接續播放。
- 調整滑桿時，若 BGM 應播放但處於暫停狀態，會嘗試恢復。

### 6.2 控制範圍

目前音量滑桿與靜音只控制 BGM：

| 音訊類型 | 受音量滑桿控制 | 受靜音按鈕控制 |
|---|---|---|
| 背景音樂 | 是 | 是 |
| AI 發音 MP3 | 否 | 否 |
| 裝置 TTS | 否 | 否 |
| 遊戲合成音效 | 否 | 否 |

因此目前 UI 的意思其實是「音樂音量」，不是「全站音量」。

### 6.3 波形與大小聲稽核

波形檢查會以第一聲道計算：

- RMS：整段平均能量。
- peak：最大取樣絕對值。
- active ratio：高於 `0.01` 的取樣比例。
- first／last active time：有效聲音起訖。
- trailing silence：結尾保留的靜音長度。

現行警示門檻：

| 問題 | 判定 |
|---|---|
| 幾乎靜音 | `peak < 0.005` 或 `RMS < 0.001` |
| 過小聲 | `peak < 0.02` 或 `RMS < 0.003` |
| 可能爆音 | `peak >= 0.999` |
| 可能截尾 | 尾端靜音少於 `0.015` 秒 |

最近一次完整報告檢查 5,144 個 TTS 音檔：

- 缺檔：0
- 解碼失敗：0
- 幾乎靜音：0
- 過小聲：0
- 可能爆音：0
- 可能截尾：4

4 個截尾警示都在 `marin`：`foreign`、`funny`、`greet`、`take care of`。這些是自動門檻警示，仍需人工聽音確認是否真的切到尾音。

MP3 靜態檢查另外會標記：

- 小於等於 500 bytes。
- 無法解析 MP3 frame。
- 短於 0.18 秒。
- 長於 15 秒。

語意轉錄檢查可用 `gpt-4o-mini-transcribe` 比對預期文字，字串相似度低於 `0.75` 視為 mismatch；不過現有 `kid` 樣本的線上轉錄紀錄是 `fetch failed`，不能視為已通過語意驗證。

## 7. 現行使用方式總結

目前專案的音訊功能分成 3 個部分：

1. **英文發音**
   - 優先播放預先產生的 `marin` 或 `cedar` MP3。
   - 使用者可在學習模式選擇語音，選擇結果依單元保存。
   - 音檔不存在或播放失敗時，改用瀏覽器內建英文 TTS。
   - 新的單字發音開始前，會先停止上一段發音。

2. **背景音樂與遊戲音效**
   - 一般登入後畫面循環播放 `HOME.MP3`。
   - 測驗與挑戰畫面循環播放 `BATTLE.MP3`。
   - 登出時停止音樂並回到開頭。
   - 點擊、答對、答錯、倒數、開始與成功音效由 Web Audio API 即時產生。

3. **音量與靜音**
   - 畫面提供 `0～100` 的背景音樂音量滑桿，預設為 `50`。
   - 支援 Web Audio API 時由 `GainNode` 控制音量。
   - 不支援時改用 `HTMLAudioElement.volume`。
   - 靜音按鈕會暫停背景音樂，解除靜音時繼續播放。
   - 音量與靜音目前只套用在背景音樂，不影響英文發音與遊戲音效。

TTS 音檔目前共有 2 種語音、5,144 個 MP3，並已透過檔案結構、長度與波形檢查確認音檔的基本可用性。

## 8. 其他專案要複製的兩個關鍵效果

### 8.1 為什麼網頁被滑掉時，音樂會暫停？

先說目前專案的實際情況：`src/utils/audio.js` **沒有**監聽 `visibilitychange`、`pagehide` 或 `beforeunload`。目前程式主動停止 BGM 的時機，主要是登出或尚未登入時由 `src/App.jsx` 呼叫 `stopMusic()`。

在 iPhone 上把 Safari 切到背景、切換 App、關閉分頁，或從 App 切換器滑掉瀏覽器時，音樂仍會停止，主要是以下原因：

1. BGM 是存在網頁 JavaScript 執行環境裡的單一 `HTMLAudioElement`。
2. 網頁進入背景後，iOS 可以暫停頁面、音訊或 `AudioContext`。
3. 分頁或瀏覽器程序被關閉時，整個 JavaScript 執行環境與音訊物件都會被銷毀，音樂自然停止。

所以，這個現象目前有一部分是 **iOS／瀏覽器的生命週期行為**，不是本專案完整保證的功能。不同瀏覽器版本、PWA 模式或裝置設定可能有不同結果。

另外要分清楚：「把頁面往下捲，讓音量滑桿離開畫面」不會觸發暫停；只有整個分頁變成隱藏、切換 App、關閉頁面或登出等情況，才可能停止。

若其他專案也需要穩定做到「離開網頁就暫停，回來時只恢復原本正在播放的音樂」，應主動監聽 Page Visibility API，不要只依賴 iOS 自動處理：

```js
let wasPlayingBeforeHidden = false;

const handleVisibilityChange = () => {
    if (document.hidden) {
        // 先記住離開前是否正在播放，再暫停；不要把進度歸零。
        wasPlayingBeforeHidden = !bgmAudio.paused && !isMuted;
        bgmAudio.pause();

        // Web Audio 可一併暫停，減少背景耗電。
        if (bgmAudioContext?.state === 'running') {
            bgmAudioContext.suspend().catch(() => {});
        }
        return;
    }

    // 只有離開前真的正在播放，回來時才恢復。
    if (wasPlayingBeforeHidden && !isMuted && currentTrackType) {
        bgmAudioContext?.resume().catch(() => {});
        bgmAudio.play().catch(error => {
            console.log('BGM resume was blocked:', error);
        });
    }

    wasPlayingBeforeHidden = false;
};

export const bindBgmPageLifecycle = () => {
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 回傳清理函式，方便 React component 卸載時移除 listener。
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
};
```

在 React App 的最上層只註冊一次：

```jsx
useEffect(() => {
    return bindBgmPageLifecycle();
}, []);
```

採用這種寫法時：

- `pause()` 只暫停，保留目前播放進度。
- `stopMusic()` 則是暫停後將 `currentTime` 歸零，適合登出或真正結束音樂時使用。
- 不要在頁面恢復可見時無條件 `play()`，否則使用者原本手動暫停或靜音，切回頁面後卻會突然播放。
- `play()` 與 `AudioContext.resume()` 都可能受到自動播放政策阻擋，因此要處理 Promise rejection。
- 行動瀏覽器不保證 `beforeunload`、`unload` 或 `pagehide` 每次都會觸發；控制背景暫停時應以 `visibilitychange` 為主。

### 8.2 iOS 的音量滑桿為什麼要用 `GainNode`？

一般桌面瀏覽器可以直接這樣調整音量：

```js
audio.volume = 0.5;
```

但 iOS Safari 對 `HTMLAudioElement.volume` 的程式控制長期有限制；音訊元素本身的音量可能固定視為 `1`，實際總輸出音量仍由 iPhone 的實體音量鍵控制。因此，若只把滑桿數值指定給 `audio.volume`，iPhone 上可能完全聽不出大小聲變化。

目前專案的解法是將音樂送進 Web Audio API：

```text
HTMLAudioElement
   → MediaElementAudioSourceNode
   → GainNode
   → AudioContext.destination
```

`HTMLAudioElement` 負責載入、循環、播放與暫停；`GainNode` 負責把這一條音訊訊號放大或縮小。現行滑桿的 `0～100` 會先轉成 `0～1`，再指定給 `gain.value`。

可移植到其他專案的最小版本如下：

```js
const bgmAudio = new Audio('/audio/HOME.MP3');
bgmAudio.loop = true;

let audioContext = null;
let sourceNode = null;
let gainNode = null;
let currentVolume = 0.5;

const ensureAudioGraph = () => {
    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return false;

    try {
        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (!gainNode) {
            gainNode = audioContext.createGain();
            gainNode.gain.value = currentVolume;
            gainNode.connect(audioContext.destination);
        }

        if (!sourceNode) {
            sourceNode = audioContext.createMediaElementSource(bgmAudio);
            sourceNode.connect(gainNode);
        }

        return true;
    } catch (error) {
        console.log('Web Audio setup failed:', error);
        return false;
    }
};

export const unlockAudio = async () => {
    // 必須由 click、touch 或 pointer 等使用者手勢直接觸發。
    if (!ensureAudioGraph()) return;

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
};

export const playBgm = async () => {
    if (ensureAudioGraph()) {
        // 音訊元素保持全音量，實際大小聲交給 GainNode。
        bgmAudio.volume = 1;
        gainNode.gain.value = currentVolume;

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    } else {
        // 桌面或不支援 Web Audio 的瀏覽器備援。
        bgmAudio.volume = currentVolume;
    }

    await bgmAudio.play();
};

export const setBgmVolume = (sliderValue) => {
    currentVolume = Math.max(0, Math.min(1, sliderValue / 100));

    if (ensureAudioGraph()) {
        bgmAudio.volume = 1;
        gainNode.gain.value = currentVolume;
    } else {
        bgmAudio.volume = currentVolume;
    }
};
```

React 音量滑桿：

```jsx
const [volume, setVolume] = useState(50);

const handleVolumeChange = event => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    setBgmVolume(nextVolume);
};

return (
    <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={volume}
        onChange={handleVolumeChange}
    />
);
```

第一次開始音樂的按鈕必須直接解鎖音訊：

```jsx
const handleStart = async () => {
    await unlockAudio();
    await playBgm();
};
```

移植時要特別注意：

1. 同一個 `HTMLAudioElement` 只能建立一次對應的 `MediaElementAudioSourceNode`，因此音樂、`AudioContext`、source 與 gain 都要保存成單例或 React `ref`，不能每次 render 都重建。
2. Web Audio 已啟用時，保持 `bgmAudio.volume = 1`，只調整 `gainNode.gain.value`。
3. iOS 的 `AudioContext` 必須在使用者點擊或觸控時建立或 `resume()`，不能只靠頁面載入後的 `useEffect`。
4. `gain` 使用 `0～1` 時是從靜音到原始音量。雖然 Web Audio 允許大於 `1`，但容易削波、失真，不建議一般 BGM 滑桿這樣做。
5. 若想避免快速拖動滑桿時產生突兀變化，可改用 `gainNode.gain.setTargetAtTime()` 做非常短的平滑過渡。

### 8.3 複製到其他專案的實作順序

1. 準備一個全專案共用的 `HTMLAudioElement`，不要每次 render 重建。
2. 用 `createMediaElementSource()` 將它接到 `GainNode`，再接到 `audioContext.destination`。
3. 音量滑桿把 `0～100` 轉成 `0～1`，更新 `GainNode.gain`。
4. 在開始、登入或「開啟音效」按鈕的使用者手勢中呼叫 `AudioContext.resume()`。
5. 用 `visibilitychange` 在頁面隱藏時 `pause()`，並記住離開前是否正在播放。
6. 頁面恢復可見時，只在「離開前原本有播放」且「目前未靜音」的情況下恢復。
7. 保留 `HTMLAudioElement.volume` 作為桌面舊瀏覽器的 fallback，但不要把它當成 iOS 的主要音量方案。

### 8.4 官方參考資料

- [MDN：Document `visibilitychange` event](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
- [MDN：Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [MDN：`AudioContext.createMediaElementSource()`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource)
- [Apple：Safari HTML5 Audio and Video Guide—iOS-Specific Considerations](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html)
- [Apple：Adding Sound to Canvas Animations](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/HTML-canvas-guide/AddingSoundtoCanvasAnimations/AddingSoundtoCanvasAnimations.html)
