// Firebase Configuration for CryptoDash
// ✅ UPDATED WITH YOUR ACTUAL FIREBASE PROJECT CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyDkP5XFes5TelEo3CFF9mBvjhatOpA5Vck",
    authDomain: "cryptodash-ef1a5.firebaseapp.com",
    projectId: "cryptodash-ef1a5",
    storageBucket: "cryptodash-ef1a5.firebasestorage.app",
    messagingSenderId: "666063548404",
    appId: "1:666063548404:web:7d372a258802a0d19993a1",
    measurementId: "G-JZVGMX221H"
};

// Initialize Firebase only when Firebase library is available
function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('🔥 Firebase initialized successfully');
            return true;
        } else if (typeof firebase !== 'undefined' && firebase.apps.length) {
            console.log('🔥 Firebase already initialized');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

// Wait for Firebase to be available, then initialize
if (typeof firebase !== 'undefined') {
    initializeFirebase();
} else {
    // Wait for Firebase to load
    let checkCount = 0;
    const maxChecks = 50; // Wait up to 5 seconds
    const checkInterval = setInterval(() => {
        checkCount++;
        if (typeof firebase !== 'undefined') {
            clearInterval(checkInterval);
            if (initializeFirebase()) {
                // Initialize Firebase services after successful initialization
                window.auth = firebase.auth();
                window.db = firebase.firestore();
                
                // Configure authentication providers
                window.googleProvider = new firebase.auth.GoogleAuthProvider();
                window.googleProvider.addScope('email');
                window.googleProvider.addScope('profile');
            }
        } else if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            console.error('🔴 Firebase library failed to load after 5 seconds');
        }
    }, 100);
}

// Initialize Firebase services if Firebase is already available
if (typeof firebase !== 'undefined' && firebase.apps.length) {
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    
    // Configure authentication providers
    window.googleProvider = new firebase.auth.GoogleAuthProvider();
    window.googleProvider.addScope('email');
    window.googleProvider.addScope('profile');
}
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');
microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');
microsoftProvider.setCustomParameters({
    tenant: 'common'
});

const phoneProvider = new firebase.auth.PhoneAuthProvider();

// Configure Firestore settings for better performance (Updated for v10+)
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    ignoreUndefinedProperties: true,
    merge: true  // Prevent override warnings
});

// Enable offline persistence with modern cache settings
db.enablePersistence({
    synchronizeTabs: true // Allow multiple tabs
}).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('Multiple tabs open, using shared persistence mode.');
    } else if (err.code == 'unimplemented') {
        console.log('The current browser does not support offline persistence');
    }
});

// Configure authentication settings
auth.settings.appVerificationDisabledForTesting = false;

// Export for global use
window.firebase = firebase;
window.auth = auth;
window.db = db;

console.log('🔐 Firebase Authentication configured successfully');

// Authentication state listener (basic tracking only - no redirects)
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        console.log('User signed in:', user.email);
        // Note: Redirects are handled by login-script.js
    } else {
        currentUser = null;
        console.log('User signed out');
    }
});

// Export for use in other files
window.firebaseAuth = {
    auth,
    db,
    googleProvider,
    microsoftProvider,
    phoneProvider
};

console.log('🔥 Firebase initialized successfully with all providers!');
