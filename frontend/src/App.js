import React, { useState, useEffect, useRef } from 'react';
import { User, Printer, Calendar, CheckCircle, Clock, Plus, Package, Layout, Palette, Settings, ArrowRight, LogOut, Loader2, Archive, Truck, ClipboardCheck, AlertTriangle, ChevronLeft, ChevronRight, Grid, List, Layers, Calculator, Search, FileText, X, Pen, Sparkles, MessageSquare, Download, Lock, Mail, ShieldCheck, Monitor, Users, Check, Ban, Edit3, AlertCircle, Trash2, Box, Paperclip, Eye, File, Image, Key, Play, Square, ToggleLeft, StopCircle, BarChart3, History,  Split, Cylinder, Ruler, Component } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, signInWithCustomToken, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, addDoc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";

// ==========================================================================================
// 1. AYARLAR VE ADMİN YETKİSİ
// ==========================================================================================

// BURAYA KENDİ E-POSTA ADRESİNİZİ YAZIN (Süper Admin - Silme Yetkisi Olanlar)
const ADMIN_EMAILS = ["eyupkayd@gmail.com", "ukaydi.27@gmail.com", "rec.row27@gmail.com", "esenyakuppp@gmail.com"];

// Google AI Studio API Anahtarı (Environment Variable - Güvenlik İyileştirmesi!)
const apiKey = process.env.REACT_APP_GEMINI_API_KEY || ""; 

// Firebase Ayarları
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

// Önizleme ortamı kontrolü - İyileştirilmiş
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
  console.warn("Firebase config initialization warning:", error); 
}

// Firebase Başlatma
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);