const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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
        const q = query(
            collection(db, 'vocabulary'),
            where('unit', '==', '1-2'),
            where('book', '==', 3)
        );

        const querySnapshot = await getDocs(q);
        console.log(`\nDocuments found with book=3 and unit="1-2": ${querySnapshot.size}`);

        if (querySnapshot.empty) {
            console.log('No documents found!');
            process.exit(0);
        }

        let correctCount = 0;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.book === 3 && data.unit === '1-2' && data.errorCount === 0) {
                correctCount++;
            }
        });

        console.log(`Documents with correct tags (book: 3, unit: "1-2", errorCount: 0): ${correctCount}`);

        if (correctCount === querySnapshot.size) {
            console.log('VERIFICATION SUCCESSFUL: All imported documents have correct tags.');
        } else {
            console.warn(`WARNING: Only ${correctCount} out of ${querySnapshot.size} documents have correct tags.`);
        }

        process.exit(0);

    } catch (error) {
        console.error('Error verifying data:', error);
        process.exit(1);
    }
}

verifyData();
