import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCH9vv_HKWhbe_sPLWMW9s3oZPYBHO5B5w",
  authDomain: "creativ-linc.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "creativ-linc",
  storageBucket: "creativ-linc.firebasestorage.app",
  messagingSenderId: "684839076927",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:684839076927:web:9b24e9decaf0592b79e48a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;