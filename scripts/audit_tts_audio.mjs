import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTtsInventory } from './tts_inventory.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, '..');
const audioRoot = join(projectRoot, 'public', 'audio', 'tts', 'library');
const outputDirectory = join(projectRoot, 'outputs');
const envPath = join(projectRoot, '.env');
const voices = ['marin', 'cedar'];
const args = process.argv.slice(2);

const getArg = (name) => {
    const prefix = `--${name}=`;
    return args.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? '';
};

const hasArg = (name) => args.includes(`--${name}`);
const selectedVoice = getArg('voice').toLowerCase();
const selectedWord = getArg('word').trim().toLowerCase();
const selectedLesson = getArg('lesson');
const requestedLimit = Math.max(0, Number(getArg('limit')) || 0);
const concurrency = Math.max(1, Math.min(10, Number(getArg('concurrency')) || 4));
const shouldTranscribe = hasArg('transcribe');
const allowAllTranscriptions = hasArg('all-transcriptions');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputBase = getArg('output') || join(outputDirectory, `tts-audit-${timestamp}`);

if (selectedVoice && !voices.includes(selectedVoice)) {
    throw new Error(`--voice 僅支援 ${voices.join(' 或 ')}`);
}

const loadEnvValue = (key) => {
    if (!existsSync(envPath)) return '';
    const line = readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .find(entry => entry.trim().startsWith(`${key}=`));
    if (!line) return '';
    return line.slice(line.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
};

const parseMp3 = (buffer) => {
    let offset = 0;
    if (buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'ID3') {
        const size = ((buffer[6] & 0x7f) << 21)
            | ((buffer[7] & 0x7f) << 14)
            | ((buffer[8] & 0x7f) << 7)
            | (buffer[9] & 0x7f);
        offset = 10 + size;
    }

    const bitrateTables = {
        '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
        '2-3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
    };
    const sampleRateTables = {
        1: [44100, 48000, 32000],
        2: [22050, 24000, 16000],
        2.5: [11025, 12000, 8000]
    };

    let frames = 0;
    let durationSeconds = 0;
    let firstBitrateKbps = 0;
    let firstSampleRate = 0;
    let scanOffset = offset;

    while (scanOffset + 4 <= buffer.length) {
        if (buffer[scanOffset] !== 0xff || (buffer[scanOffset + 1] & 0xe0) !== 0xe0) {
            scanOffset += 1;
            continue;
        }

        const versionBits = (buffer[scanOffset + 1] >> 3) & 0x03;
        const layerBits = (buffer[scanOffset + 1] >> 1) & 0x03;
        const bitrateIndex = (buffer[scanOffset + 2] >> 4) & 0x0f;
        const sampleRateIndex = (buffer[scanOffset + 2] >> 2) & 0x03;
        const padding = (buffer[scanOffset + 2] >> 1) & 0x01;
        const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : versionBits === 0 ? 2.5 : 0;
        const layer = layerBits === 1 ? 3 : 0;
        if (!version || layer !== 3 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
            scanOffset += 1;
            continue;
        }

        const tableKey = version === 1 ? '1-3' : '2-3';
        const bitrateKbps = bitrateTables[tableKey][bitrateIndex];
        const sampleRate = sampleRateTables[version][sampleRateIndex];
        const frameLength = Math.floor((version === 1 ? 144 : 72) * bitrateKbps * 1000 / sampleRate) + padding;
        if (frameLength <= 4 || scanOffset + frameLength > buffer.length + 1) {
            scanOffset += 1;
            continue;
        }

        frames += 1;
        durationSeconds += (version === 1 ? 1152 : 576) / sampleRate;
        firstBitrateKbps ||= bitrateKbps;
        firstSampleRate ||= sampleRate;
        scanOffset += frameLength;
    }

    return {
        valid: frames > 0,
        frames,
        durationSeconds: Number(durationSeconds.toFixed(3)),
        bitrateKbps: firstBitrateKbps,
        sampleRate: firstSampleRate
    };
};

const normalizeTranscript = (value) => String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const levenshtein = (left, right) => {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let row = 1; row <= left.length; row += 1) {
        let diagonal = previous[0];
        previous[0] = row;
        for (let column = 1; column <= right.length; column += 1) {
            const above = previous[column];
            previous[column] = Math.min(
                previous[column] + 1,
                previous[column - 1] + 1,
                diagonal + Number(left[row - 1] !== right[column - 1])
            );
            diagonal = above;
        }
    }
    return previous[right.length];
};

const compareTranscript = (expected, actual) => {
    const normalizedExpected = normalizeTranscript(expected);
    const normalizedActual = normalizeTranscript(actual);
    if (!normalizedActual) return { similarity: 0, semanticIssue: 'transcript-empty' };
    if (normalizedActual === normalizedExpected) return { similarity: 1, semanticIssue: '' };
    const maximumLength = Math.max(normalizedExpected.length, normalizedActual.length, 1);
    const similarity = 1 - (levenshtein(normalizedExpected, normalizedActual) / maximumLength);
    return {
        similarity: Number(similarity.toFixed(3)),
        semanticIssue: similarity >= 0.75 ? 'transcript-review' : 'transcript-mismatch'
    };
};

const inventory = buildTtsInventory(projectRoot);
let specs = inventory.specs.filter(spec => {
    if (selectedWord && spec.displayText.toLowerCase() !== selectedWord) return false;
    if (selectedLesson && !spec.occurrences.some(entry => String(entry.lesson) === selectedLesson)) return false;
    return true;
});

const selectedVoices = selectedVoice ? [selectedVoice] : voices;
let records = specs.flatMap(spec => selectedVoices.map(voice => {
    const filePath = join(audioRoot, voice, `${spec.stem}.mp3`);
    const record = {
        voice,
        specId: spec.id,
        stem: spec.stem,
        displayText: spec.displayText,
        expectedText: spec.spokenText,
        lessons: [...new Set(spec.occurrences.map(entry => entry.lesson).filter(Boolean))],
        occurrences: spec.occurrences.length,
        relativePath: filePath.slice(projectRoot.length + 1).replaceAll('\\', '/'),
        exists: existsSync(filePath),
        bytes: 0,
        durationSeconds: 0,
        bitrateKbps: 0,
        sampleRate: 0,
        staticIssues: [],
        transcript: '',
        similarity: null,
        semanticIssue: '',
        transcriptionError: ''
    };

    if (!record.exists) {
        record.staticIssues.push('missing-file');
        return record;
    }

    const buffer = readFileSync(filePath);
    record.bytes = buffer.length;
    if (buffer.length <= 500) record.staticIssues.push('file-too-small');
    const mp3 = parseMp3(buffer);
    record.durationSeconds = mp3.durationSeconds;
    record.bitrateKbps = mp3.bitrateKbps;
    record.sampleRate = mp3.sampleRate;
    if (!mp3.valid) record.staticIssues.push('invalid-mp3');
    if (mp3.valid && mp3.durationSeconds < 0.18) record.staticIssues.push('duration-too-short');
    if (mp3.valid && mp3.durationSeconds > 15) record.staticIssues.push('duration-too-long');
    return record;
}));

if (requestedLimit > 0) records = records.slice(0, requestedLimit);

if (shouldTranscribe && records.length > 100 && !requestedLimit && !allowAllTranscriptions) {
    throw new Error(
        `即將轉錄 ${records.length} 個音檔。請加 --limit=N 分批執行，`
        + '或明確加上 --all-transcriptions 允許全量 API 呼叫。'
    );
}

const transcribeRecord = async (record, apiKey) => {
    if (!record.exists || record.staticIssues.includes('invalid-mp3')) return;
    const filePath = join(projectRoot, record.relativePath);
    const form = new FormData();
    form.append('model', 'gpt-4o-mini-transcribe');
    form.append('language', 'en');
    form.append('response_format', 'json');
    form.append('file', new Blob([readFileSync(filePath)], { type: 'audio/mpeg' }), `${record.stem}.mp3`);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form
    });
    if (!response.ok) {
        const body = (await response.text()).replaceAll(apiKey, '[REDACTED]');
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 300)}`);
    }

    const result = await response.json();
    record.transcript = String(result.text ?? '').trim();
    Object.assign(record, compareTranscript(record.expectedText, record.transcript));
};

if (shouldTranscribe) {
    const apiKey = process.env.OPENAI_API_KEY || loadEnvValue('OPENAI_API_KEY');
    if (!apiKey) throw new Error('找不到 OPENAI_API_KEY，無法執行語意轉錄。');
    let nextIndex = 0;
    const worker = async () => {
        while (true) {
            const index = nextIndex;
            nextIndex += 1;
            if (index >= records.length) return;
            try {
                await transcribeRecord(records[index], apiKey);
            } catch (error) {
                records[index].transcriptionError = error.message;
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, records.length || 1) }, worker));
}

const issueRecords = records.filter(record =>
    record.staticIssues.length > 0 || record.semanticIssue || record.transcriptionError
);
const report = {
    generatedAt: new Date().toISOString(),
    filters: {
        voice: selectedVoice || 'all',
        word: selectedWord || 'all',
        lesson: selectedLesson || 'all',
        limit: requestedLimit || null,
        transcribe: shouldTranscribe
    },
    inventorySummary: inventory.sourceSummary,
    auditSummary: {
        checkedFiles: records.length,
        missingFiles: records.filter(record => record.staticIssues.includes('missing-file')).length,
        invalidMp3Files: records.filter(record => record.staticIssues.includes('invalid-mp3')).length,
        durationWarnings: records.filter(record =>
            record.staticIssues.some(issue => issue.startsWith('duration-'))
        ).length,
        transcribedFiles: records.filter(record => record.transcript || record.semanticIssue).length,
        emptyTranscripts: records.filter(record => record.semanticIssue === 'transcript-empty').length,
        transcriptMismatches: records.filter(record => record.semanticIssue === 'transcript-mismatch').length,
        transcriptReviews: records.filter(record => record.semanticIssue === 'transcript-review').length,
        transcriptionErrors: records.filter(record => record.transcriptionError).length,
        issueFiles: issueRecords.length
    },
    issues: issueRecords,
    records
};

const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
};
const csvColumns = [
    'voice', 'displayText', 'expectedText', 'transcript', 'similarity', 'semanticIssue',
    'staticIssues', 'transcriptionError', 'bytes', 'durationSeconds', 'lessons', 'relativePath'
];
const csv = [
    csvColumns.map(csvEscape).join(','),
    ...records.map(record => csvColumns.map(column => csvEscape(record[column])).join(','))
].join('\r\n');

mkdirSync(dirname(outputBase), { recursive: true });
writeFileSync(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(`${outputBase}.csv`, `\uFEFF${csv}\r\n`, 'utf8');

console.log(JSON.stringify({
    ...report.auditSummary,
    jsonReport: `${outputBase}.json`,
    csvReport: `${outputBase}.csv`
}, null, 2));

