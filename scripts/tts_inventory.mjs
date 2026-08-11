import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const normalizeText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const normalizeKeyPart = (value) => normalizeText(value).toLowerCase();

const SPECIAL_SPOKEN_OVERRIDES = new Map(Object.entries({
    'have problems + with n / (in) v-ing': 'have problems with something. Or, have problems doing something.',
    'be busy + v-ing / with n': 'be busy doing something. Or, be busy with something.',
    'thanks for + v-ing / n': 'thanks for doing something. Or, thanks for something.',
    'decide on + n': 'decide on something.',
    "do / try one's best": "do one's best. Or, try one's best.",
    "do one's / the shopping": "do one's shopping. Or, do the shopping.",
    'feel like + v-ing': 'feel like doing something.',
    'give / lend... a hand': 'give someone a hand. Or, lend someone a hand.',
    'keep / stop from...': 'keep someone from doing something. Or, stop someone from doing something.',
    'move away / to...': 'move away. Or, move to somewhere.',
    "take place / one's place": "take place. Or, take one's place.",
    "can't help but + v": "can't help but do something.",
    'do + 人 + good': 'do someone good.',
    'share + 物 + with + 人': 'share something with someone.',
    'all night / all day long': 'all night long. Or, all day long.',
    'answer / pick up the phone': 'answer the phone. Or, pick up the phone.',
    'be angry at / with': 'be angry at someone. Or, be angry with someone.',
    'be happy with / about': 'be happy with something. Or, be happy about something.',
    'be mad at / with': 'be mad at someone. Or, be mad with someone.',
    'borrow from / lend to': 'borrow from someone. Or, lend to someone.',
    'catch / have a cold': 'catch a cold. Or, have a cold.',
    'dream about / of': 'dream about something. Or, dream of something.',
    'face the problem / music': 'face the problem. Or, face the music.',
    'fall down / over': 'fall down. Or, fall over.',
    'from now / then on': 'from now on. Or, from then on.',
    'get / be lost': 'get lost. Or, be lost.',
    'get on / surf the internet': 'get on the Internet. Or, surf the Internet.',
    'have / go on a picnic': 'have a picnic. Or, go on a picnic.',
    'have / had to': 'have to. Or, had to.',
    'have / hold a party': 'have a party. Or, hold a party.',
    'have / take a seat': 'have a seat. Or, take a seat.',
    'hear of / from': 'hear of someone. Or, hear from someone.',
    'keep / stay in touch': 'keep in touch. Or, stay in touch.',
    'once / twice a year': 'once a year. Or, twice a year.',
    'take a break / rest': 'take a break. Or, take a rest.',
    'take a look / nap / walk / bath': 'take a look. Or, take a nap. Or, take a walk. Or, take a bath.',
    'take action / up': 'take action. Or, take up something.',
    'take out the trash / garbage': 'take out the trash. Or, take out the garbage.',
    'take seriously / hard': 'take something seriously. Or, take something hard.',
    'take turns / notes / pictures': 'take turns. Or, take notes. Or, take pictures.',
    'turn around / over': 'turn around. Or, turn over.',
    'turn right / left': 'turn right. Or, turn left.',
    'wash / do the dishes': 'wash the dishes. Or, do the dishes.',
    'give... a big hand': 'give someone a big hand.',
    'hang... out': 'hang something out.',
    'keep... in mind': 'keep something in mind.',
    'in a... way': 'in a certain way.',
    'on... team': 'on a team.',
    'so... that': 'so. That.',
    'come (on) in.': 'Come on in.',
    "i couldn't agree (with you) more.": "I couldn't agree with you more.",
    'take (the) medicine': 'take the medicine.',
    'shoe(s)': 'shoes.',
    'sock(s)': 'socks.',
    'glove(s)': 'gloves.',
    'chopstick(s)': 'chopsticks.',
    'centimeter (cm)': 'centimeter. Or, C M.',
    'kilogram (kg)': 'kilogram. Or, K G.',
    'television (tv)': 'television. Or, T V.',
    'pe/physical education': 'P E. Or, physical education.',
    'anything to eat / drink?': 'Anything to eat, or drink?',
    'refrigerator (fridge)': 'refrigerator. Or, fridge.',
    'airplane (plane)': 'airplane. Or, plane.',
    'airplane/plane': 'airplane. Or, plane.',
    'bicycle (bike)': 'bicycle. Or, bike.',
    'mailman (mail carrier)': 'mailman. Or, mail carrier.',
    'fries (french fries)': 'fries. Or, French fries.',
    'someone (somebody)': 'someone. Or, somebody.',
    'anyone (anybody)': 'anyone. Or, anybody.',
    'everyone (everybody)': 'everyone. Or, everybody.',
    "it's a deal. / let's make a deal.": "It's a deal. Or, let's make a deal.",
    'of course / of course not.': 'Of course. Or, of course not.',
    'thank goodness / god.': 'Thank goodness. Or, thank God.',
    "what's up? / what's wrong?": "What's up? Or, what's wrong?",
    'wait a minute / moment.': 'Wait a minute. Or, wait a moment.'
}));

const CONTRAST_PRONUNCIATIONS = {
    address: {
        spokenText: 'address. Address.',
        instruction: 'Pronounce the first “address” as a noun with first-syllable stress, then the second as a verb with second-syllable stress.'
    },
    decrease: {
        spokenText: 'decrease. Decrease.',
        instruction: 'Pronounce the first “decrease” as a noun with first-syllable stress, then the second as a verb with second-syllable stress.'
    },
    entrance: {
        spokenText: 'entrance. Entrance.',
        instruction: 'Pronounce the first “entrance” as the noun meaning an entryway, then the second as the verb meaning to captivate, with second-syllable stress.'
    },
    increase: {
        spokenText: 'increase. Increase.',
        instruction: 'Pronounce the first “increase” as a noun with first-syllable stress, then the second as a verb with second-syllable stress.'
    },
    object: {
        spokenText: 'object. Object.',
        instruction: 'Pronounce the first “object” as a noun with first-syllable stress, then the second as a verb with second-syllable stress.'
    },
    produce: {
        spokenText: 'produce. Produce.',
        instruction: 'Pronounce the first “produce” as the noun for farm products, then the second as the verb meaning to create.'
    },
    progress: {
        spokenText: 'progress. Progress.',
        instruction: 'Pronounce the first “progress” as a noun with first-syllable stress, then the second as a verb with second-syllable stress.'
    },
    record: {
        spokenText: 'record. Record.',
        instruction: 'Pronounce the first “record” as a noun or adjective with first-syllable stress, then the second as a verb with second-syllable stress.'
    },
    refuse: {
        spokenText: 'refuse. Refuse.',
        instruction: 'Pronounce the first “refuse” as the verb meaning to decline, then the second as the noun meaning waste.'
    }
};

const SINGLE_PRONUNCIATION_GUIDANCE = {
    desert: 'Pronounce “desert” as the noun meaning a dry region, with first-syllable stress.',
    does: 'Pronounce “does” as the third-person form of “do”, rhyming with “buzz”.',
    house: 'Pronounce “house” as the noun, ending with an unvoiced S sound.',
    lead: 'Pronounce “lead” as the verb meaning to guide, rhyming with “need”.',
    live: 'Pronounce “live” as the verb meaning to reside, rhyming with “give”.',
    minute: 'Pronounce “minute” as the noun meaning sixty seconds.',
    read: 'Pronounce “read” in the present-tense form, rhyming with “need”.',
    row: 'Pronounce “row” as a line of things, rhyming with “go”.',
    subject: 'Pronounce “subject” as the noun for a school topic, with first-syllable stress.',
    tear: 'Pronounce “tear” as a teardrop, rhyming with “near”.',
    use: 'Pronounce “use” as a verb, ending with a Z sound.',
    wind: 'Pronounce “wind” as moving air, rhyming with “pinned”.'
};

const getRuntimeChinese = (row) => {
    if (normalizeText(row.chinese)) return normalizeText(row.chinese);
    if (normalizeText(row.details)) return normalizeText(row.details);
    if (Array.isArray(row.definitions)) {
        return row.definitions
            .map(definition => `[${normalizeText(definition.pos)}] ${normalizeText(definition.mean)}`)
            .join(' / ');
    }
    return '';
};

const getDisplayText = (row) => {
    const category = normalizeText(row.category);
    return normalizeText(category.includes('2') ? row.phrase || row.word : row.word || row.phrase);
};

const makeEntryKey = (entry) => {
    const location = entry.series === 'advanced'
        ? `advanced|${entry.lesson}`
        : entry.series === 'phrases'
            ? `phrases|${entry.groupId}`
            : `textbook|${entry.book}|${entry.unit}`;
    return [
        location,
        normalizeKeyPart(entry.category),
        normalizeKeyPart(entry.word),
        normalizeKeyPart(entry.chinese)
    ].join('|');
};

const makeFallbackKey = (entry) => [
    normalizeKeyPart(entry.word),
    normalizeKeyPart(entry.chinese)
].join('|');

const getSpecialSpokenText = (displayText) => {
    const normalized = normalizeKeyPart(displayText);
    const override = SPECIAL_SPOKEN_OVERRIDES.get(normalized);
    if (override) return override;

    let spoken = normalizeText(displayText);
    spoken = spoken
        .replace(/\+\s*V-ing\b/gi, 'doing something')
        .replace(/\+\s*V\b/gi, 'do something')
        .replace(/\+\s*N\b/gi, 'something')
        .replace(/\+\s*人/g, 'someone')
        .replace(/\+\s*物/g, 'something')
        .replace(/\s*\+\s*/g, ' ')
        .replace(/(\w+)\(s\)/gi, '$1s')
        .replace(/\s*\/\s*/g, ', or ')
        .replace(/\.{2,}/g, ' ')
        .replace(/\s+([?.!,])/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();

    const aliasMatch = spoken.match(/^(.+?)\s+\(([^)]+)\)([.!?]?)$/);
    if (aliasMatch) {
        spoken = `${aliasMatch[1]}. Or, ${aliasMatch[2]}${aliasMatch[3] || '.'}`;
    } else {
        spoken = spoken.replace(/[()]/g, '');
    }

    return spoken;
};

const resolvePronunciation = (entry) => {
    const word = normalizeKeyPart(entry.word);
    const chinese = normalizeText(entry.chinese);

    if (word === 'bow') {
        const includesGesture = chinese.includes('鞠躬');
        const includesRibbonOrWeapon = chinese.includes('蝴蝶結') || chinese.includes('弓');
        if (includesGesture && includesRibbonOrWeapon) {
            return {
                spokenText: 'bow. Bow.',
                instruction: 'Pronounce the first “bow” as the action of bending forward, rhyming with “how”, then the second as a ribbon or weapon, rhyming with “go”.'
            };
        }
        return {
            spokenText: entry.word,
            instruction: includesGesture
                ? 'Pronounce “bow” as the action of bending forward, rhyming with “how”.'
                : 'Pronounce “bow” as a ribbon or weapon, rhyming with “go”.'
        };
    }

    if (word === 'close') {
        const includesVerb = chinese.includes('關');
        const includesNear = chinese.includes('接近') || chinese.includes('親近') || chinese.includes('靠近');
        if (includesVerb && includesNear) {
            return {
                spokenText: 'close. Close.',
                instruction: 'Pronounce the first “close” as the adjective or adverb meaning near, ending with an unvoiced S sound, then the second as the verb meaning shut, ending with a Z sound.'
            };
        }
        return {
            spokenText: entry.word,
            instruction: includesVerb
                ? 'Pronounce “close” as the verb meaning shut, ending with a Z sound.'
                : 'Pronounce “close” as the adjective or adverb meaning near, ending with an unvoiced S sound.'
        };
    }

    if (word === 'present') {
        if (chinese.includes('展現')) {
            return {
                spokenText: 'present. Present.',
                instruction: 'Pronounce the first “present” as the noun meaning a gift, with first-syllable stress, then the second as the verb meaning to show, with second-syllable stress.'
            };
        }
        return {
            spokenText: entry.word,
            instruction: 'Pronounce “present” as the adjective or noun with first-syllable stress.'
        };
    }

    if (CONTRAST_PRONUNCIATIONS[word]) return CONTRAST_PRONUNCIATIONS[word];
    if (SINGLE_PRONUNCIATION_GUIDANCE[word]) {
        return { spokenText: entry.word, instruction: SINGLE_PRONUNCIATION_GUIDANCE[word] };
    }

    const isSpecial = /[+/()[\]]|\.{2,}/.test(entry.word) || /[人物]/.test(entry.word);
    return {
        spokenText: isSpecial ? getSpecialSpokenText(entry.word) : entry.word,
        instruction: isSpecial
            ? 'Read the vocabulary pattern naturally. Say each alternative with a short pause. Do not pronounce punctuation marks, slashes, plus signs, parentheses, or ellipses.'
            : ''
    };
};

const makeSpecId = ({ spokenText, instruction }) => createHash('sha256')
    .update(`${normalizeKeyPart(spokenText)}\n${normalizeText(instruction)}`)
    .digest('hex')
    .slice(0, 16);

const slugify = (value) => normalizeKeyPart(value)
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'vocabulary';

export const buildTtsInventory = (projectRoot) => {
    const entries = [];
    const textbookPattern = /^data(?:_book\d+_units\d+-\d+)?\.json$/;
    const textbookFiles = readdirSync(projectRoot)
        .filter(filename => textbookPattern.test(filename))
        .sort((a, b) => a.localeCompare(b, 'en'));

    for (const filename of textbookFiles) {
        const rows = JSON.parse(readFileSync(join(projectRoot, filename), 'utf8'));
        rows.forEach((row, index) => {
            const word = getDisplayText(row);
            if (!word) return;
            entries.push({
                series: 'textbook',
                sourceFile: filename,
                sourceIndex: index + 1,
                book: row.book ?? '',
                unit: row.unit ?? '',
                lesson: '',
                category: normalizeText(row.category),
                word,
                chinese: getRuntimeChinese(row),
                part: normalizeText(row.pos || row.part)
            });
        });
    }

    const advancedLessons = JSON.parse(readFileSync(join(projectRoot, 'data_advanced.json'), 'utf8'));
    advancedLessons.forEach(lessonRow => {
        (lessonRow.words || []).forEach((row, index) => {
            const word = normalizeText(row.word);
            if (!word) return;
            entries.push({
                series: 'advanced',
                sourceFile: 'data_advanced.json',
                sourceIndex: index + 1,
                book: '',
                unit: '',
                lesson: lessonRow.lesson,
                category: 'advanced',
                word,
                chinese: normalizeText(row.chinese),
                part: normalizeText(row.pos)
            });
        });
    });

    const phraseLibrary = JSON.parse(
        readFileSync(join(projectRoot, 'src', 'data', 'phraseLibrary.json'), 'utf8')
    );
    (phraseLibrary.parts || []).forEach(part => {
        (part.groups || []).forEach(group => {
            (group.phrases || []).forEach((phrase, index) => {
                const word = normalizeText(phrase.word);
                if (!word) return;
                entries.push({
                    series: 'phrases',
                    sourceFile: 'src/data/phraseLibrary.json',
                    sourceIndex: index + 1,
                    book: '',
                    unit: '',
                    lesson: '',
                    partId: part.id,
                    groupId: group.id,
                    category: 'phrases',
                    word,
                    chinese: normalizeText(phrase.chinese),
                    part: ''
                });
            });
        });
    });

    const specs = new Map();
    const entryMappings = new Map();
    const fallbackCandidates = new Map();
    const entryKeyCollisions = [];

    entries.forEach(entry => {
        const pronunciation = resolvePronunciation(entry);
        const specId = makeSpecId(pronunciation);
        const stem = `${slugify(entry.word)}-${specId}`;
        const spec = {
            id: specId,
            stem,
            displayText: entry.word,
            spokenText: normalizeText(pronunciation.spokenText),
            instruction: normalizeText(pronunciation.instruction),
            occurrences: []
        };
        const existingSpec = specs.get(specId);
        if (existingSpec) {
            existingSpec.occurrences.push(entry);
        } else {
            spec.occurrences.push(entry);
            specs.set(specId, spec);
        }

        const entryKey = makeEntryKey(entry);
        const existingStem = entryMappings.get(entryKey);
        if (existingStem && existingStem !== stem) {
            entryKeyCollisions.push({ entryKey, existingStem, stem, entry });
        }
        entryMappings.set(entryKey, stem);

        const fallbackKey = makeFallbackKey(entry);
        if (!fallbackCandidates.has(fallbackKey)) fallbackCandidates.set(fallbackKey, new Set());
        fallbackCandidates.get(fallbackKey).add(stem);
    });

    const fallbackMappings = new Map(
        [...fallbackCandidates.entries()]
            .filter(([, stems]) => stems.size === 1)
            .map(([key, stems]) => [key, [...stems][0]])
    );

    return {
        entries,
        specs: [...specs.values()].sort((a, b) => a.stem.localeCompare(b.stem, 'en')),
        entryMappings: new Map([...entryMappings.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'))),
        fallbackMappings: new Map([...fallbackMappings.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'))),
        entryKeyCollisions,
        sourceSummary: {
            textbookFiles: textbookFiles.length,
            textbookEntries: entries.filter(entry => entry.series === 'textbook').length,
            advancedLessons: advancedLessons.length,
            advancedEntries: entries.filter(entry => entry.series === 'advanced').length,
            phraseParts: (phraseLibrary.parts || []).length,
            phraseGroups: (phraseLibrary.parts || []).reduce(
                (count, part) => count + (part.groups || []).length,
                0
            ),
            phraseEntries: entries.filter(entry => entry.series === 'phrases').length,
            totalEntries: entries.length,
            uniqueAudioSpecs: specs.size,
            reusableEntries: entries.length - specs.size,
            entryKeyCollisions: entryKeyCollisions.length
        }
    };
};

export const buildRuntimeEntryKey = makeEntryKey;
export const buildRuntimeFallbackKey = makeFallbackKey;
