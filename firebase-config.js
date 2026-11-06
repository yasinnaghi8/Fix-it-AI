import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ⚠️ حط الـ Config بتاعك هنا (اللي بيبدأ بـ apiKey) ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyDLxCa6EcOu_jCoB4f0wyq-gFSiudehgPM",
  authDomain: "fixit-ai-naghi.firebaseapp.com",
  projectId: "fixit-ai-naghi",
  storageBucket: "fixit-ai-naghi.firebasestorage.app",
  messagingSenderId: "581173241560",
  appId: "1:581173241560:web:c9a2983be8245e323799ad",
  measurementId: "G-7ZRKL2RQ6F"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// تصدير الدوال عشان نستخدمها في الملفات التانية
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseFunctions = {
    GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    sendPasswordResetEmail, onAuthStateChanged, signOut, collection, addDoc, query, where, 
    orderBy, getDocs, deleteDoc, doc, updateDoc, getDoc
};