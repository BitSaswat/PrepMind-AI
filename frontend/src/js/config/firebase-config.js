// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#available-libraries
const firebaseConfig = {
  apiKey: "AIzaSyBdnYt0XQwlIHxc1ujCWSK709MccaOeIGk",
  authDomain: "prepmind-ai.firebaseapp.com",
  projectId: "prepmind-ai",
  storageBucket: "prepmind-ai.firebasestorage.app",
  messagingSenderId: "805167338998",
  appId: "1:805167338998:web:261cdb62a8e4c353a0a3d7",
  measurementId: "G-S6QZ94290X"
};

// Initialize Firebase
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, app };
