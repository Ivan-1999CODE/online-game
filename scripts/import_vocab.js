const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with the specific project ID
// This relies on Application Default Credentials (ADC) being available/configured 
// or the environment being authenticated via gcloud/firebase-tools
try {
    admin.initializeApp({
        projectId: 'english-quest-95028'
    });
    console.log('Firebase Admin initialized for project: english-quest-95028');
} catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    process.exit(1);
}

const db = getFirestore();

async function importData() {
    try {
        // Read data
        const dataPath = path.join(__dirname, '..', 'data.json');
        if (!fs.existsSync(dataPath)) {
            throw new Error(`Data file not found at ${dataPath}`);
        }
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const items = JSON.parse(rawData);

        console.log(`Found ${items.length} items to import.`);

        if (items.length === 0) {
            console.log('No items to import.');
            return;
        }

        // Process items
        // Add default fields: book: 1, unit: "1-3", errorCount: 0
        const processedItems = items.map(item => ({
            ...item,
            book: 1,
            unit: "1-3",
            errorCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }));

        // Batch write
        // Firestore batch limit is 500
        const BATCH_SIZE = 450;
        let batch = db.batch();
        let count = 0;
        let totalImported = 0;
        let batchCount = 0;

        const collectionRef = db.collection('vocabulary');

        console.log('Starting batch import...');

        for (const item of processedItems) {
            // Create a new matching document ref
            // We'll let Firestore generate IDs automatically
            const docRef = collectionRef.doc();
            batch.set(docRef, item);
            count++;

            if (count >= BATCH_SIZE) {
                process.stdout.write('.');
                await batch.commit();
                batchCount++;
                totalImported += count;
                count = 0;
                batch = db.batch(); // Start new batch
            }
        }

        // Commit final batch
        if (count > 0) {
            process.stdout.write('.');
            await batch.commit();
            totalImported += count;
        }

        console.log('\nImport complete!');
        console.log(`Total documents imported: ${totalImported}`);

    } catch (error) {
        console.error('Error during import:', error);
        process.exit(1);
    }
}

importData();
