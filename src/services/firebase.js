// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDKLMlppBBEjRpRUij3ahK0hrYBP9buCZA",
  authDomain: "level-up-choice-board-game.firebaseapp.com",
  projectId: "level-up-choice-board-game",
  storageBucket: "level-up-choice-board-game.firebasestorage.app",
  messagingSenderId: "805971118488",
  appId: "1:805971118488:web:9ab2e6e4e77ed79c9243ed",
  measurementId: "G-5X6Q4M0DBJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
