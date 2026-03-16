import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Level to Book/Unit mapping
export const LEVEL_MAPPING = {
    1: { book: 1, unit: "1-3" }, 2: { book: 1, unit: "4-6" },
    3: { book: 2, unit: "1-2" }, 4: { book: 2, unit: "3-4" }, 5: { book: 2, unit: "5-6" },
    6: { book: 3, unit: "1-2" }, 7: { book: 3, unit: "3-4" }, 8: { book: 3, unit: "5-6" },
    9: { book: 4, unit: "1-2" }, 10: { book: 4, unit: "3-4" }, 11: { book: 4, unit: "5-6" },
    12: { book: 5, unit: "1-2" }, 13: { book: 5, unit: "3-4" }, 14: { book: 5, unit: "5-6" },
    15: { book: 6, unit: "1-2" }, 16: { book: 6, unit: "3-4" }
};

// Fetch level data from Firestore vocabulary collection
export const fetchLevelData = async (levelId) => {
    const mapping = LEVEL_MAPPING[levelId];
    if (!mapping) return null;

    try {
        const q = query(
            collection(db, 'vocabulary'),
            where('book', '==', mapping.book),
            where('unit', '==', mapping.unit)
        );
        const snapshot = await getDocs(q);

        const categories = { vocab: [], collocation: [], polysemy: [], sentences: [] };

        snapshot.forEach(doc => {
            const data = doc.data();
            const item = {
                id: doc.id,
                word: data.word || data.phrase || '',
                chinese: data.chinese || '',
                part: data.part || '',
                sentence: data.example || data.sentence || '',
                sentence_ch: data.sentence_ch || '',
                book: data.book || mapping.book,
                unit: data.unit || mapping.unit
            };

            const categoryStr = String(data.category);
            if (categoryStr.includes("1") || categoryStr.includes("單字")) {
                categories.vocab.push(item);
            } else if (categoryStr.includes("2") || categoryStr.includes("搭配字")) {
                categories.collocation.push(item);
            } else if (categoryStr.includes("4") || categoryStr.includes("一字多義")) {
                categories.polysemy.push({
                    id: doc.id,
                    word: data.word,
                    chinese: data.chinese,
                    book: data.book || mapping.book,
                    unit: data.unit || mapping.unit
                });
            } else if (categoryStr.includes("3") || categoryStr.includes("片語") || categoryStr.includes("佳句")) {
                categories.sentences.push(item);
            }
        });
        return categories;
    } catch (err) {
        console.error("Error fetching data:", err);
        return null;
    }
};
