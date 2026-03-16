// Game Data Constants

export const LEVEL_INFO = {
    1: { title: "初學者的試煉之森", desc: "冒險的起點，裝備基礎武器。", sub: "CH 1-3" },
    2: { title: "史萊姆平原的遠征", desc: "第一次離開村莊，面對初級怪物。", sub: "CH 4-6" },
    3: { title: "迷霧峽谷的迷宮", desc: "開始遇到一些需要轉彎思考的挑戰。", sub: "CH 1-2" },
    4: { title: "古代遺跡的守護者", desc: "解開古老的謎題，獲得中階技能。", sub: "CH 3-4" },
    5: { title: "地下城：半獸人營地", desc: "本冊 BOSS，需整合前幾關能力。", sub: "CH 5-6" },
    6: { title: "極寒冰原的暴風雪", desc: "難度提升，環境變得嚴苛。", sub: "CH 1-2" },
    7: { title: "灼熱火山的赤炎龍", desc: "激烈的戰鬥，考驗抗壓性。", sub: "CH 3-4" },
    8: { title: "天空之城的雲端聖殿", desc: "掌握了飛行（高階技巧），俯瞰世界。", sub: "CH 5-6" },
    9: { title: "深淵魔域的入口", desc: "接近魔王，氣氛壓抑而嚴肅。", sub: "CH 1-2" },
    10: { title: "魔王城的最終迴廊", desc: "四天王等級的難題接踵而來。", sub: "CH 3-4" },
    11: { title: "英雄殿堂：榮耀加冕", desc: "擊敗魔王，成為凡間的英雄。", sub: "CH 5-6" },
    12: { title: "異次元的時空裂縫", desc: "進入更高的維度，凡間邏輯不再適用。", sub: "CH 1-2" },
    13: { title: "虛空巨獸的巢穴", desc: "面對不可名狀的強大存在。", sub: "CH 3-4" },
    14: { title: "諸神的黃昏戰場", desc: "與神話級別的對手交鋒。", sub: "CH 5-6" },
    15: { title: "創世神殿的階梯", desc: "接近世界的本源與真理。", sub: "CH 1-2" },
    16: { title: "宇宙終焉：新的起點", desc: "全破關卡，掌握了一切知識的盡頭。", sub: "CH 3-4" }
};

export const SECTION_HEADERS = {
    1: { title: "第一冊：啟程之卷", subtitle: "新手村與草原" },
    3: { title: "第二冊：探索之卷", subtitle: "荒野與遺跡" },
    6: { title: "第三冊：覺醒之卷", subtitle: "極端環境" },
    9: { title: "第四冊：傳說之卷", subtitle: "魔王城" },
    12: { title: "第五冊：神話之卷", subtitle: "異次元與神界 (DLC)" },
    15: { title: "第六冊：起源之卷", subtitle: "宇宙真理" }
};

export const GAME_DATA = {};
for (let i = 1; i <= 16; i++) {
    GAME_DATA[i] = {
        title: LEVEL_INFO[i] ? `Level ${i < 10 ? '0' + i : i}: ${LEVEL_INFO[i].title}` : `Unit ${i}`,
        content: { vocab: [], collocation: [], polysemy: [], sentences: [] }
    };
}

export const MAP_STRUCTURE = [
    { type: 'unit', id: 1 },
    { type: 'unit', id: 2 },
    { type: 'boss', id: 'b1', label: 'BOSS 1', targetUnits: [1, 2] },

    { type: 'unit', id: 3 },
    { type: 'unit', id: 4 },
    { type: 'unit', id: 5 },
    { type: 'boss', id: 'b2', label: 'BOSS 2', targetUnits: [3, 4, 5] },

    { type: 'unit', id: 6 },
    { type: 'unit', id: 7 },
    { type: 'unit', id: 8 },
    { type: 'boss', id: 'b3', label: 'BOSS 3', targetUnits: [6, 7, 8] },

    { type: 'unit', id: 9 },
    { type: 'unit', id: 10 },
    { type: 'unit', id: 11 },
    { type: 'boss', id: 'b4', label: 'BOSS 4', targetUnits: [9, 10, 11] },

    { type: 'unit', id: 12 },
    { type: 'unit', id: 13 },
    { type: 'unit', id: 14 },
    { type: 'boss', id: 'b5', label: 'BOSS 5', targetUnits: [12, 13, 14] },

    { type: 'unit', id: 15 },
    { type: 'unit', id: 16 },
    { type: 'boss', id: 'b6', label: 'FINAL BOSS', targetUnits: [15, 16] }
];

export const BOSS_INFO = {
    'b1': { title: "BOSS I: 森林守護者", desc: "第一冊的試煉總結", sub: "REC: LV 10" },
    'b2': { title: "BOSS II: 地下城主", desc: "第二冊的試煉總結", sub: "REC: LV 20" },
    'b3': { title: "BOSS III: 冰火巨人", desc: "第三冊的試煉總結", sub: "REC: LV 30" },
    'b4': { title: "BOSS IV: 魔王親衛", desc: "第四冊的試煉總結", sub: "REC: LV 40" },
    'b5': { title: "BOSS V: 虛空領主", desc: "第五冊的試煉總結", sub: "REC: LV 50" },
    'b6': { title: "FINAL BOSS: 創世神", desc: "最終試煉", sub: "REC: LV 60" }
};
