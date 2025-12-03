import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  User, Printer, Calendar, CheckCircle, Clock, Plus, Package, Layout, 
  Palette, Settings, LogOut, Loader2, Archive, Truck, ClipboardCheck, 
  AlertTriangle, ChevronLeft, ChevronRight, Grid, List, Layers, Calculator, 
  FileText, X, Pen, Sparkles, MessageSquare, Download, Lock, Mail, 
  ShieldCheck, Monitor, Users, Check, Ban, Edit3, AlertCircle, Trash2, 
  Paperclip, Key, Play, StopCircle, BarChart3, History, Split, 
  Cylinder, Component 
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, sendPasswordResetEmail, updatePassword, 
  reauthenticateWithCredential, EmailAuthProvider, signInWithCustomToken, 
  signInAnonymously 
} from "firebase/auth";
import { 
  getFirestore, collection, doc, setDoc, getDoc, addDoc, 
  updateDoc, onSnapshot, deleteDoc 
} from "firebase/firestore";
import './App.css';

// ============================================================================
// 🔐 CONFIGURATION & ADMIN SETTINGS
// ============================================================================

const ADMIN_EMAILS = [
  "eyupkayd@gmail.com", 
  "ukaydi.27@gmail.com", 
  "rec.row27@gmail.com", 
  "esenyakuppp@gmail.com"
];

const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "";

const myLocalFirebaseConfig = {
  apiKey: "AIzaSyAThI1hzjCjr_g9KbI1VPaJgCUz995CmTM",
  authDomain: "bizim-uretim-takip.firebaseapp.com",
  projectId: "bizim-uretim-takip",
  storageBucket: "bizim-uretim-takip.firebasestorage.app",
  messagingSenderId: "71742965986",
  appId: "1:71742965986:web:8b0dfdce38d43243adf6bb",
  measurementId: "G-XRD6ZR3BDP"
};

let firebaseConfig = myLocalFirebaseConfig;
let appId = "siparis-takip-app";

try {
  if (typeof window !== 'undefined') {
    if (typeof window.__firebase_config !== 'undefined') {
      firebaseConfig = JSON.parse(window.__firebase_config);
    }
    if (typeof window.__app_id !== 'undefined') {
      appId = window.__app_id;
    }
  }
} catch (error) {
  console.warn("Firebase config parse warning:", error);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================================
// 🤖 AI API FUNCTION
// ============================================================================

async function callGemini(prompt) {
  if (!apiKey) {
    console.warn("Gemini API key not configured");
    return "API anahtarı yapılandırılmamış. .env.local dosyasına REACT_APP_GEMINI_API_KEY ekleyin.";
  }
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    if (!response.ok) throw new Error("API Error");
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt alınamadı.";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Yapay zeka bağlantı hatası.";
  }
}

// ============================================================================
// 🧩 HELPER COMPONENTS
// ============================================================================

function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const user = auth.currentUser;
    
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      alert("Şifreniz başarıyla güncellendi!");
      onClose();
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/wrong-password') {
        alert("Mevcut şifrenizi yanlış girdiniz.");
      } else if (error.code === 'auth/weak-password') {
        alert("Yeni şifre çok zayıf. En az 6 karakter olmalı.");
      } else {
        alert("Hata: " + error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl relative transform transition-all">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Key className="text-blue-600" size={24} />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Şifre Değiştir</h3>
        </div>
        
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Mevcut Şifre</label>
            <input
              required
              type="password"
              className="input-field"
              placeholder="Mevcut şifreniz"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>
          
          <div>
            <label className="label">Yeni Şifre</label>
            <input
              required
              type="password"
              className="input-field"
              placeholder="Yeni şifreniz (En az 6 karakter)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          
          <button 
            disabled={loading} 
            type="submit" 
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin inline mr-2" size={20} />
                Güncelleniyor...
              </>
            ) : (
              'Şifreyi Güncelle'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

