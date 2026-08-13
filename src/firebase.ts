// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBubHK6iBjyddEDd8mgfMcVFOsbzVIFlhI",
  authDomain: "prenatal-dra-priscila.firebaseapp.com",
  projectId: "prenatal-dra-priscila",
  storageBucket: "prenatal-dra-priscila.firebasestorage.app",
  messagingSenderId: "915074931461",
  appId: "1:915074931461:web:82e7414d70a09d8fa6356c",
  measurementId: "G-NZT5QRYVNJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
