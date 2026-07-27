import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, '..');
const envPath = join(projectRoot, '.env');
const dataPath = join(projectRoot, 'data_advanced.json');
const outputRoot = join(projectRoot, 'public', 'audio', 'tts', 'advanced', 'lesson-133');
const logPath = join(outputRoot, 'generation-log.json');
const voices = ['marin', 'cedar'];
const model = 'gpt-4o-mini-tts';

const filenames = new Map([
    ['after', '001-after'],
    ['although', '002-although'],
    ['and', '003-and'],
    ['as', '004-as'],
    ['because', '005-because'],
    ['before', '006-before'],
    ['but', '007-but'],
    ['either or', '008-either-or'],
    ['if', '009-if'],
    ['neither nor', '010-neither-nor'],
    ['or', '011-or'],
    ['since', '012-since'],
    ['so', '013-so'],
    ['so... that', '014-so-that'],
    ['then', '015-then'],
    ['when', '016-when'],
    ['while', '017-while']
]);

const loadEnvValue = (key) => {
    if (!existsSync(envPath)) return '';
    const line = readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .find(entry => entry.trim().startsWith(`${key}=`));
    if (!line) return '';

    const rawValue = line.slice(line.indexOf('=') + 1).trim();
    return rawValue.replace(/^(['"])(.*)\1$/, '$2');
};

const apiKey = process.env.OPENAI_API_KEY || loadEnvValue('OPENAI_API_KEY');
if (!apiKey) {
    throw new Error('找不到 OPENAI_API_KEY；請確認專案根目錄的 .env 已設定。');
}

const advancedData = JSON.parse(readFileSync(dataPath, 'utf8'));
const lesson = advancedData.find(entry => Number(entry.lesson) === 133);
if (!lesson?.words?.length) {
    throw new Error('data_advanced.json 找不到第 133 課資料。');
}

const words = [...lesson.words].sort((a, b) => a.word.localeCompare(b.word));
const unmappedWords = words.filter(item => !filenames.has(item.word.toLowerCase()));
if (unmappedWords.length > 0 || words.length !== filenames.size) {
    throw new Error(`第 133 課資料與音檔清單不一致：${unmappedWords.map(item => item.word).join(', ') || '數量不同'}`);
}

mkdirSync(outputRoot, { recursive: true });

const emptyLog = {
    lesson: 133,
    model,
    voices,
    disclosure: '本課英文發音由 AI 語音產生',
    items: {}
};
let generationLog = existsSync(logPath)
    ? JSON.parse(readFileSync(logPath, 'utf8'))
    : emptyLog;

const saveLog = () => {
    const temporaryPath = `${logPath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(generationLog, null, 2)}\n`, 'utf8');
    renameSync(temporaryPath, logPath);
};

const getInstructions = (word) => {
    const shared = [
        'Pronounce only the supplied English vocabulary item.',
        'Use clear, natural General American English for Taiwanese English learners.',
        'Use a calm teaching voice at a slightly slower-than-normal pace.',
        'Do not add an introduction, definition, example, spelling, or commentary.'
    ];

    if (word === 'so... that') {
        shared.push('Say “so”, make a short natural pause, then say “that”; do not pronounce the punctuation.');
    } else if (word === 'either or') {
        shared.push('Treat it as the grammatical pair “either ... or”, using the American EE-ther pronunciation and a short pause between the two words.');
    } else if (word === 'neither nor') {
        shared.push('Treat it as the grammatical pair “neither ... nor”, using the American NEE-ther pronunciation and a short pause between the two words.');
    }

    return shared.join(' ');
};

const isCompletedFile = (filePath) => existsSync(filePath) && statSync(filePath).size > 500;

for (const item of words) {
    const word = item.word.toLowerCase();
    const filename = filenames.get(word);

    for (const voice of voices) {
        const voiceDirectory = join(outputRoot, voice);
        const filePath = join(voiceDirectory, `${filename}.mp3`);
        const logKey = `${voice}:${word}`;
        mkdirSync(voiceDirectory, { recursive: true });

        if (isCompletedFile(filePath)) {
            const buffer = readFileSync(filePath);
            generationLog.items[logKey] = {
                word: item.word,
                chinese: item.chinese,
                part: item.pos,
                voice,
                file: `./${voice}/${filename}.mp3`,
                status: 'completed',
                bytes: buffer.length,
                sha256: createHash('sha256').update(buffer).digest('hex'),
                completedAt: generationLog.items[logKey]?.completedAt || null
            };
            saveLog();
            console.log(`略過已完成：${voice} / ${item.word}`);
            continue;
        }

        console.log(`產生中：${voice} / ${item.word}`);
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                voice,
                input: item.word,
                instructions: getInstructions(word),
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const body = await response.text();
            const safeMessage = body.replaceAll(apiKey, '[REDACTED]');
            throw new Error(`OpenAI TTS 失敗（${response.status}，${voice} / ${item.word}）：${safeMessage.slice(0, 500)}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const buffer = Buffer.from(await response.arrayBuffer());
        if (!contentType.includes('audio') || buffer.length <= 500) {
            throw new Error(`收到的音檔格式異常（${voice} / ${item.word}，${contentType || '無 Content-Type'}，${buffer.length} bytes）。`);
        }

        const temporaryPath = `${filePath}.tmp`;
        writeFileSync(temporaryPath, buffer);
        renameSync(temporaryPath, filePath);
        generationLog.items[logKey] = {
            word: item.word,
            chinese: item.chinese,
            part: item.pos,
            voice,
            file: `./${voice}/${filename}.mp3`,
            status: 'completed',
            bytes: buffer.length,
            sha256: createHash('sha256').update(buffer).digest('hex'),
            completedAt: new Date().toISOString()
        };
        saveLog();
    }
}

const completedCount = Object.values(generationLog.items).filter(item => item.status === 'completed').length;
console.log(`完成：${completedCount}/${words.length * voices.length} 個音檔。`);
