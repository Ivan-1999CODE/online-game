import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTtsInventory } from './tts_inventory.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, '..');
const outputDirectory = join(projectRoot, 'outputs');
const audioRoot = join(projectRoot, 'public', 'audio', 'tts', 'library');
const args = process.argv.slice(2);
const voices = ['marin', 'cedar'];

const getArg = (name) => {
    const prefix = `--${name}=`;
    return args.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? '';
};

const selectedVoice = getArg('voice').toLowerCase();
const selectedWord = getArg('word').trim().toLowerCase();
const selectedLesson = getArg('lesson');
const port = Math.max(1024, Math.min(65535, Number(getArg('port')) || 4175));
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputBase = getArg('output') || join(outputDirectory, `tts-waveform-audit-${timestamp}`);

if (selectedVoice && !voices.includes(selectedVoice)) {
    throw new Error(`--voice 僅支援 ${voices.join(' 或 ')}`);
}

const inventory = buildTtsInventory(projectRoot);
const selectedVoices = selectedVoice ? [selectedVoice] : voices;
const records = inventory.specs
    .filter(spec => {
        if (selectedWord && spec.displayText.toLowerCase() !== selectedWord) return false;
        if (selectedLesson && !spec.occurrences.some(entry => String(entry.lesson) === selectedLesson)) {
            return false;
        }
        return true;
    })
    .flatMap(spec => selectedVoices.map(voice => {
        const relativePath = `${voice}/${spec.stem}.mp3`;
        return {
            voice,
            specId: spec.id,
            stem: spec.stem,
            displayText: spec.displayText,
            expectedText: spec.spokenText,
            lessons: [...new Set(spec.occurrences.map(entry => entry.lesson).filter(Boolean))],
            occurrences: spec.occurrences.length,
            relativePath,
            exists: existsSync(join(audioRoot, relativePath))
        };
    }));

const audioPaths = new Map(
    records
        .filter(record => record.exists)
        .map(record => [`/audio/${encodeURIComponent(record.voice)}/${encodeURIComponent(record.stem)}.mp3`,
            join(audioRoot, record.relativePath)])
);

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TTS waveform audit</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; }
    progress { width: min(40rem, 100%); height: 1.5rem; }
    pre { white-space: pre-wrap; background: #f3f4f6; padding: 1rem; border-radius: .5rem; }
  </style>
</head>
<body>
  <h1>TTS 本機波形稽核</h1>
  <progress id="progress" max="${records.length}" value="0"></progress>
  <p id="status">準備分析 ${records.length} 個音檔…</p>
  <pre id="result"></pre>
  <script>
    const sourceRecords = ${JSON.stringify(records)};
    const concurrency = 8;

    const analyzeRecord = async (context, record) => {
      if (!record.exists) return { ...record, issues: ['missing-file'] };
      const url = '/audio/' + encodeURIComponent(record.voice) + '/'
        + encodeURIComponent(record.stem) + '.mp3';
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const audio = await context.decodeAudioData(await response.arrayBuffer());
        const channel = audio.getChannelData(0);
        let sumSquares = 0;
        let peak = 0;
        let activeSamples = 0;
        let firstActive = -1;
        let lastActive = -1;
        const threshold = 0.01;
        for (let index = 0; index < channel.length; index += 1) {
          const magnitude = Math.abs(channel[index]);
          sumSquares += channel[index] * channel[index];
          peak = Math.max(peak, magnitude);
          if (magnitude >= threshold) {
            activeSamples += 1;
            if (firstActive < 0) firstActive = index;
            lastActive = index;
          }
        }
        const rms = Math.sqrt(sumSquares / Math.max(channel.length, 1));
        const firstActiveSeconds = firstActive < 0 ? null : firstActive / audio.sampleRate;
        const lastActiveSeconds = lastActive < 0 ? null : lastActive / audio.sampleRate;
        const trailingSilenceSeconds = lastActive < 0
          ? audio.duration
          : audio.duration - lastActiveSeconds;
        const issues = [];
        if (peak < 0.005 || rms < 0.001) issues.push('silent-or-near-silent');
        else if (peak < 0.02 || rms < 0.003) issues.push('very-quiet');
        if (peak >= 0.999) issues.push('possible-clipping');
        if (lastActive >= 0 && trailingSilenceSeconds < 0.015) issues.push('possible-tail-truncation');
        return {
          ...record,
          durationSeconds: Number(audio.duration.toFixed(4)),
          sampleRate: audio.sampleRate,
          rms: Number(rms.toFixed(8)),
          peak: Number(peak.toFixed(8)),
          activeRatio: Number((activeSamples / Math.max(channel.length, 1)).toFixed(6)),
          firstActiveSeconds: firstActiveSeconds === null ? null : Number(firstActiveSeconds.toFixed(4)),
          lastActiveSeconds: lastActiveSeconds === null ? null : Number(lastActiveSeconds.toFixed(4)),
          trailingSilenceSeconds: Number(trailingSilenceSeconds.toFixed(4)),
          issues
        };
      } catch (error) {
        return { ...record, issues: ['decode-error'], error: error.message };
      }
    };

    const run = async () => {
      const context = new AudioContext();
      const output = new Array(sourceRecords.length);
      let nextIndex = 0;
      let completed = 0;
      const progress = document.querySelector('#progress');
      const status = document.querySelector('#status');
      const worker = async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= sourceRecords.length) return;
          output[index] = await analyzeRecord(context, sourceRecords[index]);
          completed += 1;
          progress.value = completed;
          if (completed % 25 === 0 || completed === sourceRecords.length) {
            status.textContent = '已分析 ' + completed + ' / ' + sourceRecords.length;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, sourceRecords.length || 1) }, worker));
      await context.close();
      const response = await fetch('/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: output })
      });
      const summary = await response.json();
      status.textContent = '完成';
      document.querySelector('#result').textContent = JSON.stringify(summary, null, 2);
    };

    run().catch(error => {
      document.querySelector('#status').textContent = '分析失敗';
      document.querySelector('#result').textContent = JSON.stringify({ error: error.message }, null, 2);
    });
  </script>
</body>
</html>`;

const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
};

const saveReport = (resultRecords) => {
    const issueRecords = resultRecords.filter(record => record.issues?.length > 0);
    const summary = {
        checkedFiles: resultRecords.length,
        missingFiles: resultRecords.filter(record => record.issues?.includes('missing-file')).length,
        decodeErrors: resultRecords.filter(record => record.issues?.includes('decode-error')).length,
        silentOrNearSilent: resultRecords.filter(record =>
            record.issues?.includes('silent-or-near-silent')
        ).length,
        veryQuiet: resultRecords.filter(record => record.issues?.includes('very-quiet')).length,
        possibleClipping: resultRecords.filter(record => record.issues?.includes('possible-clipping')).length,
        possibleTailTruncation: resultRecords.filter(record =>
            record.issues?.includes('possible-tail-truncation')
        ).length,
        issueFiles: issueRecords.length
    };
    const report = {
        generatedAt: new Date().toISOString(),
        filters: {
            voice: selectedVoice || 'all',
            word: selectedWord || 'all',
            lesson: selectedLesson || 'all'
        },
        summary,
        issues: issueRecords,
        records: resultRecords
    };
    const columns = [
        'voice', 'displayText', 'expectedText', 'issues', 'error', 'durationSeconds',
        'rms', 'peak', 'activeRatio', 'firstActiveSeconds', 'lastActiveSeconds',
        'trailingSilenceSeconds', 'lessons', 'relativePath'
    ];
    const csv = [
        columns.map(csvEscape).join(','),
        ...resultRecords.map(record => columns.map(column => csvEscape(record[column])).join(','))
    ].join('\r\n');

    mkdirSync(dirname(outputBase), { recursive: true });
    writeFileSync(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    writeFileSync(`${outputBase}.csv`, `\uFEFF${csv}\r\n`, 'utf8');
    return {
        ...summary,
        jsonReport: `${outputBase}.json`,
        csvReport: `${outputBase}.csv`
    };
};

const server = createServer((request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (request.method === 'GET' && url.pathname === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(html);
        return;
    }

    if (request.method === 'GET' && audioPaths.has(url.pathname)) {
        response.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
        response.end(readFileSync(audioPaths.get(url.pathname)));
        return;
    }

    if (request.method === 'POST' && url.pathname === '/results') {
        let body = '';
        request.setEncoding('utf8');
        request.on('data', chunk => {
            body += chunk;
            if (body.length > 100 * 1024 * 1024) request.destroy();
        });
        request.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const summary = saveReport(payload.records || []);
                response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify(summary));
                console.log(JSON.stringify(summary, null, 2));
                setTimeout(() => server.close(), 100);
            } catch (error) {
                response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
});

server.listen(port, '127.0.0.1', () => {
    console.log(`本機波形稽核已準備： http://127.0.0.1:${port}/`);
    console.log(`待檢查音檔：${records.length}`);
});

