import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// ============================================================================
// 🔐 CONFIGURATION & ADMIN SETTINGS
// ============================================================================

export const ADMIN_EMAILS = [
  "eyupkayd@gmail.com", 
  "ukaydi.27@gmail.com", 
  "rec.row27@gmail.com", 
  "esenyakuppp@gmail.com"
];

export const SUPER_ADMIN_EMAILS = ADMIN_EMAILS;

const myLocalFirebaseConfig = {
  apiKey: "AIzaSyAThI1hzjCjr_g9KbI1VPaJgCUz995CmTM",
  authDomain: "bizim-uretim-takip.firebaseapp.com",
  projectId: "bizim-uretim-takip",
  storageBucket: "bizim-uretim-takip.firebasestorage.app",
  messagingSenderId: "71742965986",
  appId: "1:71742965986:web:8b0dfdce38d43243adf6bb",
  measurementId: "G-XRD6ZR3BDP"
};

let firebaseConfig = myLocalFirebaseConfig;
let appId = "siparis-takip-app";

try {
  if (typeof window !== 'undefined') {
    if (typeof window.__firebase_config !== 'undefined') {
      firebaseConfig = JSON.parse(window.__firebase_config);
    }
    if (typeof window.__app_id !== 'undefined') {
      appId = window.__app_id;
    }
  }
} catch (error) {
  console.warn("Firebase config parse warning:", error);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence - optional, won't block if fails
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db, {
    synchronizeTabs: true // Multiple tab desteği
  })
    .then(() => {
      console.log('✅ Offline persistence enabled');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Offline persistence: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Offline persistence not supported by this browser');
      } else {
        console.warn('⚠️ Offline persistence failed:', err.message);
      }
      // Hata olsa bile uygulama çalışmaya devam eder (online mode)
    });
}

export { appId };
