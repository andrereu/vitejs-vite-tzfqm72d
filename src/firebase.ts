import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Importe o Auth

const firebaseConfig = {
  apiKey: "AIzaSyBdndR_Dl4Fqyop0C7bcj_Jd07oGnoYyuE",
  authDomain: "prenatal-dra-priscila.firebaseapp.com",
  projectId: "prenatal-dra-priscila",
  storageBucket: "prenatal-dra-priscila.firebasestorage.app",
  messagingSenderId: "915074931461",
  appId: "1:915074931461:web:82e7414d70a09d8fa6356c",
  measurementId: "G-NZT5QRYVNJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // Exporte o auth
