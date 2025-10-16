
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDR7mHT4DmeAswwzaupV3DivWUcvGK9XBU",
  authDomain: "interlinc-78576.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "interlinc-78576",
  storageBucket: "interlinc-78576.firebasestorage.app",
  messagingSenderId: "1049882668599",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1049882668599:web:22ef374662c2ceade819b2",
  measurementId: "G-F2LWZWPGVN"
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
