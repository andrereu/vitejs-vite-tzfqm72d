import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBubHK6iBjyddEDd8mgfMcVFOsbzVIFlhI",
  authDomain: "prenatal-dra-priscila.firebaseapp.com",
  projectId: "prenatal-dra-priscila",
  storageBucket: "prenatal-dra-priscila.firebasestorage.app",
  messagingSenderId: "915074931461",
  appId: "1:915074931461:web:82e7414d70a09d8fa6356c",
  measurementId: "G-NZT5QRYVNJ"
};

const app = initializeApp(firebaseConfig);

// Exportações do Firestore e Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Exportações para Login com Google
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup };
