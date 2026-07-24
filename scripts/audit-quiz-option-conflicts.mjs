import fs from 'node:fs';
import { normaliseChineseMeaning } from '../src/constants/quizOptionRules.js';

const DATA_FILE_PATTERN = /^data(?:_book\d+_units\d+-\d+|_advanced)?\.json$/;
const files = fs.readdirSync('.').filter(file => DATA_FILE_PATTERN.test(file));
const conflicts = [];

for (const file of files) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const scopes = file === 'data_advanced.json'
        ? data.map(lesson => ({ label: `Advanced lesson ${lesson.lesson}`, entries: lesson.words }))
        : [{ label: file, entries: data }];

    for (const { label, entries } of scopes) {
        const meanings = new Map();
        entries.forEach(entry => {
            const word = entry.word || entry.phrase;
            if (!word || !entry.chinese) return;
            const meaning = normaliseChineseMeaning(entry.chinese);
            meanings.set(meaning, [...(meanings.get(meaning) || []), word]);
        });
        meanings.forEach((words, meaning) => {
            if (new Set(words.map(word => word.toLowerCase())).size > 1) {
                conflicts.push({ label, meaning, words });
            }
        });
    }
}

console.log(`# Quiz option ambiguity audit\n\nFound **${conflicts.length}** exact or normalised Chinese-meaning conflicts within a quiz scope.\n`);
conflicts.forEach(({ label, meaning, words }) => console.log(`- ${label}: [${meaning}] - ${words.join(' / ')}`));
