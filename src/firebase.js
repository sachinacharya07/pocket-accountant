import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqoTL3nfzkWFMSJK7CUXc1JXCnwuhSDFQ",
  authDomain: "pocket-accountant-6b5e7.firebaseapp.com",
  projectId: "pocket-accountant-6b5e7",
  storageBucket: "pocket-accountant-6b5e7.firebasestorage.app",
  messagingSenderId: "28182622307",
  appId: "1:28182622307:web:bf3f2aa44d6de518ca8856",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
