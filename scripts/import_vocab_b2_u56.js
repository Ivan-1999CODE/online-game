const { initializeApp } = require('firebase/app');
const { getFirestore, collection, writeBatch, doc } = require('firebase/firestore');
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

async function importData() {
    try {
        const dataPath = path.join(__dirname, '..', 'data_book2_units5-6.json');
        if (!fs.existsSync(dataPath)) {
            throw new Error(`Data file not found at ${dataPath}`);
        }
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const items = JSON.parse(rawData);

        console.log(`Found ${items.length} items to import for Book 2 Units 5-6.`);

        if (items.length === 0) {
            console.log('No items to import.');
            return;
        }

        // Process items: Ensure book, unit, and errorCount are correctly set
        const processedItems = items.map(item => ({
            ...item,
            book: 2,
            unit: "5-6",
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
