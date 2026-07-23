const { initializeApp } = require('firebase/app');
const { getFirestore, collection, writeBatch, doc, query, where, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
    apiKey: "AIzaSyAfeRxb_HVaLU8UuJ20xgmGfxWWqMCKVvg",
    authDomain: "english-quest-95028.firebaseapp.com",
    projectId: "english-quest-95028",
    storageBucket: "english-quest-95028.firebasestorage.app",
    messagingSenderId: "657463040693",
    appId: "1:657463040693:web:3877c39a4621bf5bd57cfc",
    measurementId: "G-76L3ENZSXZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function validateItems(items) {
    console.log('Validating data structure...');
    let errors = [];

    items.forEach((item, index) => {
        // Validate "4. 一字多義"
        if (item.category === "4. 一字多義") {
            if (!item.definitions || !Array.isArray(item.definitions) || item.definitions.length === 0) {
                errors.push(`Item ${index} (${item.word}): Missing or invalid 'definitions' array.`);
            } else {
                item.definitions.forEach((def, dIdx) => {
                    if (!def.pos || !def.mean || !def.example) {
                        errors.push(`Item ${index} (${item.word}) Definition ${dIdx}: Missing pos, mean, or example.`);
                    }
                });
            }
        }

        // Validate "3. 片語 & 佳句"
        if (item.category === "3. 片語 & 佳句") {
            if (!item.phrase) errors.push(`Item ${index}: Missing 'phrase'.`);
            if (!item.group) errors.push(`Item ${index}: Missing 'group' tag.`);
        }
    });

    if (errors.length > 0) {
        console.error('Validation Errors:', errors);
        throw new Error('Data validation failed.');
    }
    console.log('Validation passed.');
}

async function cleanOldData() {
    console.log('Cleaning old data for Book 6 Unit 3-4...');
    const q = query(
        collection(db, 'vocabulary'),
        where('book', '==', 6),
        where('unit', '==', '3-4')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log('No old data found.');
        return;
    }

    console.log(`Found ${snapshot.size} old documents to delete.`);

    const BATCH_SIZE = 450;
    let batch = writeBatch(db);
    let count = 0;
    let totalDeleted = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;

        if (count >= BATCH_SIZE) {
            await batch.commit();
            totalDeleted += count;
            count = 0;
            batch = writeBatch(db);
            process.stdout.write('x');
        }
    }

    if (count > 0) {
        await batch.commit();
        totalDeleted += count;
    }
    console.log(`\nDeleted ${totalDeleted} old documents.`);
}

async function importData() {
    try {
        const dataPath = path.join(__dirname, '..', 'data_book6_units3-4.json');
        if (!fs.existsSync(dataPath)) {
            throw new Error(`Data file not found at ${dataPath}`);
        }
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const items = JSON.parse(rawData);

        console.log(`Found ${items.length} items to import for Book 6 Units 3-4.`);

        if (items.length === 0) {
            console.log('No items to import.');
            return;
        }

        // Step 1: Validate
        await validateItems(items);

        // Step 2: Clean old data
        await cleanOldData();

        // Process items: Ensure book, unit, and errorCount are correctly set
        const processedItems = items.map(item => ({
            ...item,
            book: 6,
            unit: "3-4",
            errorCount: 0,
            createdAt: new Date()
        }));

        const BATCH_SIZE = 450;
        let batch = writeBatch(db);
        let count = 0;
        let totalImported = 0;

        const collectionRef = collection(db, 'vocabulary');

        console.log('Starting batch import...');

        for (const item of processedItems) {
            const docRef = doc(collectionRef);
            batch.set(docRef, item);
            count++;

            if (count >= BATCH_SIZE) {
                process.stdout.write('.');
                await batch.commit();
                totalImported += count;
                count = 0;
                batch = writeBatch(db);
            }
        }

        if (count > 0) {
            process.stdout.write('.');
            await batch.commit();
            totalImported += count;
        }

        console.log('\nImport complete!');
        console.log(`Total documents imported: ${totalImported}`);
        process.exit(0);

    } catch (error) {
        console.error('Error during import:', error);
        process.exit(1);
    }
}

importData();
