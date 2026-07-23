const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function verifyData() {
    try {
        const querySnapshot = await getDocs(collection(db, 'vocabulary'));
        console.log(`Total documents found: ${querySnapshot.size}`);

        if (querySnapshot.empty) {
            console.log('No documents found!');
            process.exit(0);
        }

        let validCount = 0;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.book === 1 && data.unit === '1-3' && data.errorCount === 0) {
                validCount++;
            }
        });

        console.log(`Documents with correct tags (book: 1, unit: "1-3", errorCount: 0): ${validCount}`);

        // Sample one
        const sample = querySnapshot.docs[0].data();
        console.log('Sample document:', JSON.stringify(sample, null, 2));

        process.exit(0);

    } catch (error) {
        console.error('Error verifying data:', error);
        process.exit(1);
    }
}

verifyData();
