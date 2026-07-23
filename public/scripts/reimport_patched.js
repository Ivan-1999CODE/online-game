import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const firebaseConfig = {
    apiKey: "AIzaSyAfeRxb_HVaLU8UuJ20xgmGfxWWqMCKVvg",
    authDomain: "english-quest-95028.firebaseapp.com",
    projectId: "english-quest-95028",
    storageBucket: "english-quest-95028.firebasestorage.app",
    messagingSenderId: "657463040693",
    appId: "1:657463040693:web:3877c39a4621bf5bd57cfc",
};

// Only re-import files that were patched by patch_pos.js
const FILES = [
    { file: 'data_book1_units4-6.json', book: 1, unit: '4-6' },
    { file: 'data_book3_units5-6.json', book: 3, unit: '5-6' },
    { file: 'data_book4_units1-2.json', book: 4, unit: '1-2' },
    { file: 'data_book4_units5-6.json', book: 4, unit: '5-6' },
    { file: 'data_book6_units3-4.json', book: 6, unit: '3-4' },
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanAndImport(mapping) {
    const collectionRef = collection(db, 'vocabulary');

    // Delete old docs for this book/unit
    console.log(`  Cleaning book=${mapping.book} unit=${mapping.unit}...`);
    const q = query(collectionRef,
        where('book', '==', mapping.book),
        where('unit', '==', mapping.unit)
    );
    const snapshot = await getDocs(q);
    if (snapshot.size > 0) {
        const deleteBatch = writeBatch(db);
        snapshot.forEach(d => deleteBatch.delete(d.ref));
        await deleteBatch.commit();
    }
    console.log(`  Deleted ${snapshot.size} old docs`);

    // Read JSON
    const filePath = path.join(__dirname, '..', mapping.file);
    const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Batch insert
    const BATCH_SIZE = 400;
    let batch = writeBatch(db);
    let count = 0;
    let total = 0;

    for (const item of items) {
        const docRef = doc(collectionRef);
        batch.set(docRef, {
            ...item,
            book: mapping.book,
            unit: mapping.unit,
            errorCount: item.errorCount || 0,
            createdAt: new Date()
        });
        count++;
        if (count >= BATCH_SIZE) {
            await batch.commit();
            process.stdout.write('.');
            total += count;
            count = 0;
            batch = writeBatch(db);
        }
    }
    if (count > 0) {
        await batch.commit();
        process.stdout.write('.');
        total += count;
    }
    console.log(`\n  Imported ${total} docs`);
}

async function main() {
    for (const mapping of FILES) {
        console.log(`\n[${mapping.file}]`);
        await cleanAndImport(mapping);
    }
    console.log('\nAll done!');
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
