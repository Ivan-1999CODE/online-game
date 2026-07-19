export const TRIVIA_GROUPS = [
    { id: 'english', label: '英文祕密', icon: '🔤', description: '單字、發音與英語文化' },
    { id: 'world', label: '世界探索', icon: '🌍', description: '動物、科學與世界地理' }
];

export const TRIVIA_CATEGORIES = [
    { id: 'word_origins', group: 'english', label: '單字由來', icon: '📜', color: 'text-yellow-300' },
    { id: 'spelling_sounds', group: 'english', label: '拼字與發音', icon: '🎧', color: 'text-cyan-300' },
    { id: 'english_culture', group: 'english', label: '英語文化', icon: '🗣️', color: 'text-purple-300' },
    { id: 'nature_animals', group: 'world', label: '動物與自然', icon: '🦋', color: 'text-green-300' },
    { id: 'science_space', group: 'world', label: '科學與太空', icon: '🚀', color: 'text-blue-300' },
    { id: 'world_places', group: 'world', label: '世界與地理', icon: '🗺️', color: 'text-orange-300' }
];

export const TRIVIA_SOURCES = {
    word_origins: { label: 'Merriam-Webster 與 Online Etymology Dictionary', url: 'https://www.merriam-webster.com/words-at-play' },
    spelling_sounds: { label: 'Cambridge Dictionary Pronunciation', url: 'https://dictionary.cambridge.org/grammar/british-grammar/pronunciation' },
    english_culture: { label: 'Cambridge Grammar：英式與美式英文', url: 'https://dictionary.cambridge.org/grammar/british-grammar/british-and-american-english' },
    nature_animals: { label: 'Smithsonian 與 NOAA 動物／海洋資料', url: 'https://oceanservice.noaa.gov/facts/' },
    science_space: { label: 'NASA Solar System Facts', url: 'https://science.nasa.gov/solar-system/solar-system-facts/' },
    world_places: { label: 'USGS 與 Encyclopaedia Britannica 地理資料', url: 'https://www.usgs.gov/science/science-explorer' }
};

export const TRIVIA_CARDS = [
    // 英文祕密：單字由來（20）
    { id: 'english-origin-01', group: 'english', category: 'word_origins', title: 'alphabet 的開頭', text: 'alphabet 這個字來自希臘字母表前兩個字母 alpha 和 beta。' },
    { id: 'english-origin-02', group: 'english', category: 'word_origins', title: 'emoji 不是 emotion', text: 'emoji 來自日文「繪」和「文字」，只是剛好看起來很像英文 emotion。' },
    { id: 'english-origin-03', group: 'english', category: 'word_origins', title: 'robot 原本是苦工', text: 'robot 來自捷克語 robota，帶有被迫勞動或苦工的意思。' },
    { id: 'english-origin-04', group: 'english', category: 'word_origins', title: 'quarantine 的 40', text: 'quarantine 和義大利語「四十天」有關，早期船隻會被隔離一段時間以防疾病傳播。' },
    { id: 'english-origin-05', group: 'english', category: 'word_origins', title: 'breakfast 在打破什麼？', text: 'breakfast 就是 break 加 fast，意思是結束一整夜沒有進食的狀態。' },
    { id: 'english-origin-06', group: 'english', category: 'word_origins', title: 'goodbye 的祝福', text: 'goodbye 是 God be with ye 逐漸縮短、變化而來的告別語。' },
    { id: 'english-origin-07', group: 'english', category: 'word_origins', title: 'sandwich 是人名', text: 'sandwich 以英國的 Sandwich 伯爵命名，後來成為夾餡麵包的名稱。' },
    { id: 'english-origin-08', group: 'english', category: 'word_origins', title: 'window 是風之眼', text: 'window 的早期字源和古北歐語的「風之眼」有關，形容牆上讓風與光進入的開口。' },
    { id: 'english-origin-09', group: 'english', category: 'word_origins', title: 'clue 原本是一團線', text: 'clue 以前也寫作 clew，原意是一團線；故事裡的線能帶人走出迷宮，後來變成「線索」。' },
    { id: 'english-origin-10', group: 'english', category: 'word_origins', title: 'muscle 像小老鼠', text: 'muscle 來自拉丁語「小老鼠」，古人覺得肌肉在皮膚下移動的樣子像老鼠。' },
    { id: 'english-origin-11', group: 'english', category: 'word_origins', title: 'companion 一起吃麵包', text: 'companion 的字源包含「一起」和「麵包」，原本指一起分享食物的人。' },
    { id: 'english-origin-12', group: 'english', category: 'word_origins', title: 'candidate 穿白衣', text: 'candidate 和拉丁語的「潔白」有關，古羅馬的候選人會穿著特別處理過的白袍。' },
    { id: 'english-origin-13', group: 'english', category: 'word_origins', title: 'disaster 是壞星象', text: 'disaster 的字源可拆成「不好的」和「星星」，反映古人把災禍和星象聯繫在一起。' },
    { id: 'english-origin-14', group: 'english', category: 'word_origins', title: '& 也有名字', text: '& 叫做 ampersand，它的形狀是拉丁文 et（and）長期連寫形成的。' },
    { id: 'english-origin-15', group: 'english', category: 'word_origins', title: '大小寫來自盒子', text: 'uppercase 和 lowercase 來自早期印刷工坊：大寫鉛字放在上層盒子，小寫放在下層盒子。' },
    { id: 'english-origin-16', group: 'english', category: 'word_origins', title: '先有水果才有顏色', text: '英文 orange 先是水果名稱，後來才成為橘色的顏色名稱。' },
    { id: 'english-origin-17', group: 'english', category: 'word_origins', title: '三組連續雙字母', text: 'bookkeeper 有 oo、kk、ee 三組連續的雙字母，是很少見的拼字。' },
    { id: 'english-origin-18', group: 'english', category: 'word_origins', title: '15 個字母不重複', text: 'uncopyrightable 有 15 個字母，而且沒有任何字母重複。' },
    { id: 'english-origin-19', group: 'english', category: 'word_origins', title: 'queue 只聽見一個字母', text: 'queue 的發音和字母 Q 相同，後面的 ueue 在現代英語發音中都沒有各自發聲。' },
    { id: 'english-origin-20', group: 'english', category: 'word_origins', title: '矛盾修辭本身也矛盾', text: 'oxymoron 指把看似矛盾的詞放在一起；它的希臘字源本身就有「敏銳」與「愚鈍」的組合。' },

    // 英文祕密：拼字與發音（15）
    { id: 'english-sound-01', group: 'english', category: 'spelling_sounds', title: '最常出現的弱母音', text: 'schwa 寫作 /ə/，常出現在沒有重音的音節，例如 about 的第一個音。' },
    { id: 'english-sound-02', group: 'english', category: 'spelling_sounds', title: '重音不只是大聲', text: '英文重音通常同時包含較清楚的母音、較長的時間和音高變化，不只是把聲音放大。' },
    { id: 'english-sound-03', group: 'english', category: 'spelling_sounds', title: 'REcord 與 reCORD', text: 'record 當名詞時常把重音放前面，當動詞時常放後面；重音可能幫助分辨詞性。' },
    { id: 'english-sound-04', group: 'english', category: 'spelling_sounds', title: '複數 s 有三種聲音', text: '英文複數字尾常讀成 /s/、/z/ 或 /ɪz/，要看前一個聲音，而不是只看字母。' },
    { id: 'english-sound-05', group: 'english', category: 'spelling_sounds', title: '過去式 ed 也有三種', text: '規則動詞的 -ed 常讀成 /t/、/d/ 或 /ɪd/，例如 worked、played、wanted。' },
    { id: 'english-sound-06', group: 'english', category: 'spelling_sounds', title: 'th 有兩種聲帶狀態', text: 'think 的 th 不振動聲帶，this 的 th 會振動；兩者的舌頭位置很接近。' },
    { id: 'english-sound-07', group: 'english', category: 'spelling_sounds', title: 'kn 的 k 通常沉默', text: 'know、knee、knife 開頭的 k 在現代英語通常不發音。' },
    { id: 'english-sound-08', group: 'english', category: 'spelling_sounds', title: 'mb 結尾的 b', text: 'lamb、climb、thumb 結尾的 b 通常不發音，但字母仍保留在拼字中。' },
    { id: 'english-sound-09', group: 'english', category: 'spelling_sounds', title: 'gh 最會變化', text: 'gh 在 night 中不發音，在 laugh 中可讀 /f/，在 ghost 中則是 /g/ 的一部分。' },
    { id: 'english-sound-10', group: 'english', category: 'spelling_sounds', title: 'c 的常見規律', text: 'c 在 e、i、y 前常讀 /s/，其他位置常讀 /k/，例如 city 和 cat。' },
    { id: 'english-sound-11', group: 'english', category: 'spelling_sounds', title: 'g 有規律也有例外', text: 'g 在 e、i、y 前常讀 /dʒ/，但 get、give 等常用字是明顯例外。' },
    { id: 'english-sound-12', group: 'english', category: 'spelling_sounds', title: 'ch 不只一種讀法', text: 'ch 在 chair 常讀 /tʃ/，在 chemistry 常讀 /k/，在 machine 常讀 /ʃ/。' },
    { id: 'english-sound-13', group: 'english', category: 'spelling_sounds', title: 'x 也能變聲', text: 'x 在 box 常讀 /ks/，在 exam 常讀 /gz/，在 xylophone 開頭常讀 /z/。' },
    { id: 'english-sound-14', group: 'english', category: 'spelling_sounds', title: 'oo 不保證同音', text: 'food 和 foot 都有 oo，但母音不同；英文拼字不能永遠直接預測發音。' },
    { id: 'english-sound-15', group: 'english', category: 'spelling_sounds', title: '同拼字也可能不同音', text: 'lead 可以是「帶領」/liːd/，也可以是金屬「鉛」/led/，要靠句子判斷。' },

    // 英文祕密：英語文化（15）
    { id: 'english-culture-01', group: 'english', category: 'english_culture', title: 'flat 與 apartment', text: '英式英文常說 flat，美式英文常說 apartment，兩者都可以表示公寓住宅。' },
    { id: 'english-culture-02', group: 'english', category: 'english_culture', title: 'lift 與 elevator', text: '英式英文常說 lift，美式英文常說 elevator。' },
    { id: 'english-culture-03', group: 'english', category: 'english_culture', title: 'chips 到底是哪一種？', text: '英國的 chips 通常是炸薯條；美國的 chips 通常是薄脆薯片。' },
    { id: 'english-culture-04', group: 'english', category: 'english_culture', title: '英國的 crisps', text: '英國人常用 crisps 指袋裝薄薯片，美國人通常稱它們 potato chips。' },
    { id: 'english-culture-05', group: 'english', category: 'english_culture', title: 'football 與 soccer', text: '世界許多地方的 football 指足球；在美國，football 通常指美式足球，足球常叫 soccer。' },
    { id: 'english-culture-06', group: 'english', category: 'english_culture', title: 'colour 和 color 都對', text: 'colour 常見於英式拼字，color 常見於美式拼字；差異不代表其中一個必然錯誤。' },
    { id: 'english-culture-07', group: 'english', category: 'english_culture', title: 'centre 和 center', text: 'centre 是常見英式拼字，center 是常見美式拼字。' },
    { id: 'english-culture-08', group: 'english', category: 'english_culture', title: 'travelled 和 traveled', text: '英式英文常寫 travelled，美式英文通常寫 traveled；兩邊的雙寫規則略有差異。' },
    { id: 'english-culture-09', group: 'english', category: 'english_culture', title: 'autumn 和 fall 都很老', text: 'autumn 和 fall 都能表示秋天；fall 並不是現代美國才新造出的詞。' },
    { id: 'english-culture-10', group: 'english', category: 'english_culture', title: 'pants 的英美差異', text: '美式英文的 pants 通常是長褲；英式英文的 pants 常指內褲，長褲常叫 trousers。' },
    { id: 'english-culture-11', group: 'english', category: 'english_culture', title: 'first floor 不一定同一層', text: '美國的 first floor 通常是地面層；英國常把地面層叫 ground floor，上一層才是 first floor。' },
    { id: 'english-culture-12', group: 'english', category: 'english_culture', title: 'biscuit 和 cookie', text: '英國的 biscuit 範圍包含許多甜脆點心；美國的 biscuit 也可能指一種鬆軟鹹麵包。' },
    { id: 'english-culture-13', group: 'english', category: 'english_culture', title: 'holiday 和 vacation', text: '英式英文常用 holiday 表示休假旅行；美式英文更常用 vacation。' },
    { id: 'english-culture-14', group: 'english', category: 'english_culture', title: 'queue 和 line', text: '排隊在英式英文常說 queue，在美式英文常說 stand in line 或 wait in line。' },
    { id: 'english-culture-15', group: 'english', category: 'english_culture', title: 'postcode 和 ZIP code', text: '英國地址使用 postcode；美國使用 ZIP code。' },

    // 世界探索：動物與自然（20）
    { id: 'world-nature-01', group: 'world', category: 'nature_animals', title: '章魚有三顆心臟', text: '章魚有三顆心臟，血液中的含銅蛋白讓牠們的血呈現藍色。' },
    { id: 'world-nature-02', group: 'world', category: 'nature_animals', title: '蜂鳥能向後飛', text: '蜂鳥特殊的翅膀轉動方式，讓牠們能懸停，也能真正向後飛行。' },
    { id: 'world-nature-03', group: 'world', category: 'nature_animals', title: '蝴蝶用腳品嚐', text: '蝴蝶腳部帶有味覺感受器，停在植物上時就能判斷是否適合產卵或進食。' },
    { id: 'world-nature-04', group: 'world', category: 'nature_animals', title: '海馬爸爸負責懷孕', text: '雌海馬把卵放入雄海馬的育兒袋，胚胎會在雄海馬體內發育後出生。' },
    { id: 'world-nature-05', group: 'world', category: 'nature_animals', title: '紅鶴的粉紅來自食物', text: '紅鶴吃下藻類與小型甲殼類中的色素，羽毛才會逐漸呈現粉紅或橘紅色。' },
    { id: 'world-nature-06', group: 'world', category: 'nature_animals', title: '北極熊其實是黑皮膚', text: '北極熊的皮膚是黑色，毛則大致透明；光線散射讓整身毛看起來像白色。' },
    { id: 'world-nature-07', group: 'world', category: 'nature_animals', title: '長頸鹿也只有七節頸椎', text: '長頸鹿和人類一樣通常有七節頸椎，只是每一節都拉得非常長。' },
    { id: 'world-nature-08', group: 'world', category: 'nature_animals', title: '海豚可以半腦睡覺', text: '海豚睡眠時能讓一側大腦休息、另一側保持警覺，以便呼吸與注意周遭。' },
    { id: 'world-nature-09', group: 'world', category: 'nature_animals', title: '烏鴉記得人臉', text: '研究發現烏鴉能長期辨認曾帶來威脅的人臉，也可能把警戒訊息傳給同伴。' },
    { id: 'world-nature-10', group: 'world', category: 'nature_animals', title: '六角恐龍很會再生', text: '六角恐龍（墨西哥鈍口螈）能再生四肢，也能修復部分脊髓、心臟等組織。' },
    { id: 'world-nature-11', group: 'world', category: 'nature_animals', title: '木蛙可以結冰後甦醒', text: '木蛙冬眠時身體的一部分能結冰，體內糖分會協助保護細胞，回暖後再恢復活動。' },
    { id: 'world-nature-12', group: 'world', category: 'nature_animals', title: '袋熊便便是方塊形', text: '袋熊的腸道會用不同速度與壓力塑形，使排出的糞便帶有近似方塊的形狀。' },
    { id: 'world-nature-13', group: 'world', category: 'nature_animals', title: '無尾熊也有指紋', text: '無尾熊指尖有細密紋路，外觀看起來和人類指紋非常相似。' },
    { id: 'world-nature-14', group: 'world', category: 'nature_animals', title: '鯊魚家族比樹木更早', text: '鯊魚祖先在約四億年前已經出現，比最早形成森林的大型樹木還早。' },
    { id: 'world-nature-15', group: 'world', category: 'nature_animals', title: '藍鯨是已知最大動物', text: '藍鯨是目前已知曾存在過體型最大的動物，體長可以超過 25 公尺。' },
    { id: 'world-nature-16', group: 'world', category: 'nature_animals', title: '企鵝爸爸站著孵蛋', text: '雄性皇帝企鵝會把蛋放在腳上，用腹部皮膚覆蓋，在寒冬中負責孵化。' },
    { id: 'world-nature-17', group: 'world', category: 'nature_animals', title: '海星沒有中央大腦', text: '海星沒有像人類一樣的中央大腦，而是利用環繞身體的神經網控制活動。' },
    { id: 'world-nature-18', group: 'world', category: 'nature_animals', title: '蜜蜂用舞蹈報路', text: '蜜蜂的搖擺舞能向同伴傳達食物大致方向與距離。' },
    { id: 'world-nature-19', group: 'world', category: 'nature_animals', title: '鴨嘴獸能感應電場', text: '鴨嘴獸閉上眼睛和耳朵潛水時，能用嘴部感受獵物肌肉產生的微弱電訊號。' },
    { id: 'world-nature-20', group: 'world', category: 'nature_animals', title: '獵豹不會像獅子大吼', text: '獵豹的喉部構造不同於獅子和老虎，牠們會發出呼嚕、啁啾等聲音，但不會真正咆哮。' },

    // 世界探索：科學與太空（15）
    { id: 'world-space-01', group: 'world', category: 'science_space', title: '金星才是最熱行星', text: '雖然水星離太陽最近，金星濃厚大氣造成的溫室效應讓它成為太陽系最熱的行星。' },
    { id: 'world-space-02', group: 'world', category: 'science_space', title: '金星的一天比一年久', text: '金星自轉非常慢，轉一圈所需時間比它繞太陽公轉一圈還長。' },
    { id: 'world-space-03', group: 'world', category: 'science_space', title: '水星一年只有 88 天', text: '水星只需要大約 88 個地球日，就能繞太陽完成一圈。' },
    { id: 'world-space-04', group: 'world', category: 'science_space', title: '天王星像躺著轉', text: '天王星的自轉軸傾斜接近 90 度，看起來就像側躺著繞太陽運行。' },
    { id: 'world-space-05', group: 'world', category: 'science_space', title: '太陽包辦幾乎全部質量', text: '太陽約占整個太陽系總質量的 99.8%，它的重力維繫著行星與小天體的軌道。' },
    { id: 'world-space-06', group: 'world', category: 'science_space', title: '陽光要旅行八分鐘', text: '太陽光抵達地球大約需要 8 分 20 秒，所以我們看到的是幾分鐘前的太陽。' },
    { id: 'world-space-07', group: 'world', category: 'science_space', title: '太陽系也在繞圈', text: '太陽系繞銀河系中心一圈約需 2.3 億年，這段時間也稱為一個銀河年。' },
    { id: 'world-space-08', group: 'world', category: 'science_space', title: '木星能裝進上千個地球', text: '如果把木星想成空心球體，內部空間大約能容納一千個地球。' },
    { id: 'world-space-09', group: 'world', category: 'science_space', title: '土星平均密度比水低', text: '土星整體平均密度低於液態水；但現實中沒有大到能讓土星漂浮的水池。' },
    { id: 'world-space-10', group: 'world', category: 'science_space', title: '火星有巨型火山', text: '火星的奧林帕斯山是太陽系已知最大的火山之一，高度約為聖母峰的兩倍多。' },
    { id: 'world-space-11', group: 'world', category: 'science_space', title: '真空中聽不到聲音', text: '聲音需要物質振動來傳播，太空近乎真空，因此不能像在空氣中一樣傳送聲音。' },
    { id: 'world-space-12', group: 'world', category: 'science_space', title: '月球每年離遠一點', text: '雷射測距顯示，月球平均每年離地球遠約 3.8 公分。' },
    { id: 'world-space-13', group: 'world', category: 'science_space', title: '太空站一天看很多次日出', text: '國際太空站大約 90 分鐘繞地球一圈，太空人一天能看到約 16 次日出與日落。' },
    { id: 'world-space-14', group: 'world', category: 'science_space', title: '月球腳印能留很久', text: '月球幾乎沒有會吹散痕跡的風雨，因此太空人的腳印可能保存非常久。' },
    { id: 'world-space-15', group: 'world', category: 'science_space', title: '兩顆行星沒有月亮', text: '太陽系八大行星中，只有水星和金星沒有天然衛星。' },

    // 世界探索：世界與地理（15）
    { id: 'world-place-01', group: 'world', category: 'world_places', title: '南極洲是最大沙漠', text: '沙漠是以降水稀少判斷，不是以溫度判斷；寒冷乾燥的南極洲因此是世界最大沙漠。' },
    { id: 'world-place-02', group: 'world', category: 'world_places', title: '非洲跨越四個半球', text: '赤道與本初子午線都穿過非洲，因此非洲同時位於東、西、南、北四個半球。' },
    { id: 'world-place-03', group: 'world', category: 'world_places', title: '太平洋最大也最深', text: '太平洋是地球面積最大的海洋，也包含已知最深的馬里亞納海溝。' },
    { id: 'world-place-04', group: 'world', category: 'world_places', title: '貝加爾湖深超過一公里', text: '俄羅斯的貝加爾湖是世界最深的湖泊，最深處超過 1,600 公尺。' },
    { id: 'world-place-05', group: 'world', category: 'world_places', title: '死海岸邊低於海平面', text: '死海沿岸是地球陸地表面最低的地區之一，位置低於平均海平面四百多公尺。' },
    { id: 'world-place-06', group: 'world', category: 'world_places', title: '聖母峰是海拔最高峰', text: '以平均海平面為基準，聖母峰是地球上海拔最高的山峰。' },
    { id: 'world-place-07', group: 'world', category: 'world_places', title: '從山腳量，冒納凱亞更高', text: '夏威夷冒納凱亞火山大部分藏在海面下；從海底山腳量到山頂，總高度超過聖母峰。' },
    { id: 'world-place-08', group: 'world', category: 'world_places', title: '賴索托被一國包圍', text: '賴索托整個國土都被南非包圍，是世界少數完全位於另一個國家內的主權國家。' },
    { id: 'world-place-09', group: 'world', category: 'world_places', title: '伊斯坦堡橫跨兩洲', text: '土耳其的伊斯坦堡分布在博斯普魯斯海峽兩岸，一側在歐洲、另一側在亞洲。' },
    { id: 'world-place-10', group: 'world', category: 'world_places', title: '巴拿馬運河連接兩大洋', text: '巴拿馬運河讓船隻能在大西洋與太平洋之間穿越，不必繞過南美洲南端。' },
    { id: 'world-place-11', group: 'world', category: 'world_places', title: '尼泊爾國旗不是四邊形', text: '尼泊爾是目前唯一使用非四邊形國旗的國家，旗面由兩個相疊的三角形組成。' },
    { id: 'world-place-12', group: 'world', category: 'world_places', title: '俄羅斯跨越 11 個時區', text: '俄羅斯國土橫跨歐亞大陸，官方時間劃分涵蓋 11 個時區。' },
    { id: 'world-place-13', group: 'world', category: 'world_places', title: '梵蒂岡是最小國家', text: '梵蒂岡城國位於羅馬市內，是世界上面積最小的獨立主權國家。' },
    { id: 'world-place-14', group: 'world', category: 'world_places', title: '換日線不是直線', text: '國際換日線大致沿著 180 度經線，但會彎曲繞過國家與島群，避免同一國出現兩個日期。' },
    { id: 'world-place-15', group: 'world', category: 'world_places', title: '赤道附近晝夜很平均', text: '靠近赤道的地區全年白天與黑夜長度變化較小，通常都接近 12 小時。' }
];

const LEGACY_TRIVIA_IDS = [
    ...Array.from({ length: 20 }, (_, index) => `words-${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: 20 }, (_, index) => `pronunciation-${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: 20 }, (_, index) => `usage-${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: 20 }, (_, index) => `world-${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: 20 }, (_, index) => `memory-${String(index + 1).padStart(2, '0')}`)
];

// 舊版若已有人抽到卡片，依原收藏冊順序搬到新版，避免更新後收藏數量消失。
export const TRIVIA_LEGACY_ID_MAP = Object.fromEntries(
    LEGACY_TRIVIA_IDS.map((legacyId, index) => [legacyId, TRIVIA_CARDS[index].id])
);
