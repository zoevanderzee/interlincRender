
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD5xafZSuzQ8DfnAjboO95MQ2unyjxINIw",
  authDomain: "interlinc-1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "interlinc-1",
  storageBucket: "interlinc-1.firebasestorage.app",
  messagingSenderId: "900417123937",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:900417123937:web:d040919e22266b35609c20",
  measurementId: "G-FPLSY4HSQJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics only if supported
let analytics: any = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  } else {
    console.log('Firebase Analytics not supported in this environment');
  }
}).catch((error) => {
  console.warn('Firebase Analytics support check failed:', error);
});

export { analytics };

export default app;
