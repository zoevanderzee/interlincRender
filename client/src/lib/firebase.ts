
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBJJgw-5LbtcWg5dsga3nQxhk6rL2rep6o",
  authDomain: "interlinc-ebc14.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "interlinc-ebc14",
  storageBucket: "interlinc-ebc14.firebasestorage.app",
  messagingSenderId: "4075973687",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:4075973687:web:8319f9ce2d24bb7610a3b2",
  measurementId: "G-Z7RP649W89"
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
