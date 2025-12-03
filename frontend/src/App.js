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

function AttachmentManager({ order, onAttachmentsChange, readOnly = false, compact = false }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);
  const attachments = order?.attachments || [];

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const maxSize = 450 * 1024;
    if (file.size > maxSize) {
      alert(`UYARI: Dosya boyutu çok büyük! (${(file.size / 1024).toFixed(0)}KB)\nLütfen ${(maxSize / 1024).toFixed(0)}KB altındaki dosyaları yükleyin.`);
      if(fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const newFile = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        data: reader.result,
        uploadedAt: new Date().toLocaleString('tr-TR')
      };
      
      const newAttachments = [...(order?.attachments || []), newFile];

      if (order && order.id && !onAttachmentsChange) {
        try {
          await updateDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id),
            { attachments: newAttachments }
          );
        } catch (error) {
          console.error("File upload error:", error);
          alert("Yükleme hatası");
        }
      } else if (onAttachmentsChange) {
        onAttachmentsChange(newAttachments);
      }
      
      setIsUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    };
    
    reader.onerror = () => {
      alert("Dosya okunamadı");
      setIsUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Dosyayı silmek istediğinize emin misiniz?")) return;
    
    const newAttachments = attachments.filter(f => f.id !== fileId);
    
    if (order && order.id && !onAttachmentsChange) {
      try {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id),
          { attachments: newAttachments }
        );
      } catch (error) {
        console.error("Delete error:", error);
      }
    } else if (onAttachmentsChange) {
      onAttachmentsChange(newAttachments);
    }
  };

  return (
    <div className={`bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border-2 border-slate-200 ${compact ? 'p-3' : 'p-5'} mt-4 transition-all duration-200 hover:border-slate-300`}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <Paperclip size={18} className="text-slate-600" />
          <span className="text-sm">Dosya Ekleri</span>
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
            {attachments?.length || 0}
          </span>
        </h4>
        
        {!readOnly && (
          <label className="cursor-pointer bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow">
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Yükleniyor...
              </>
            ) : (
              <>
                <Plus size={14} />
                Dosya Ekle
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        )}
      </div>
      
      {attachments && attachments.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachments.map(file => (
            <div
              key={file.id}
              className="relative group bg-white p-2 rounded-lg border-2 border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
            >
              <div
                className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden mb-2 group-hover:scale-105 transition-transform duration-200"
                onClick={() => setPreviewFile(file)}
              >
                {file.type.includes('image') ? (
                  <img
                    src={file.data}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText size={32} className="text-red-500 opacity-70" />
                )}
              </div>
              
              <div
                className="text-[10px] font-medium truncate text-slate-700 mb-1"
                title={file.name}
              >
                {file.name}
              </div>
              
              {!readOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:scale-110"
                  title="Sil"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/50">
          <Paperclip size={32} className="mx-auto mb-2 opacity-30" />
          <p className="italic">Henüz dosya eklenmemiş</p>
        </div>
      )}
      
      {previewFile && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-100 to-gray-100 border-b-2">
              <h3 className="font-bold text-slate-800 truncate flex-1">
                {previewFile.name}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50 p-4 flex items-center justify-center">
              {previewFile.type.includes('image') ? (
                <img
                  src={previewFile.data}
                  alt="Preview"
                  className="max-w-full max-h-[80vh] object-contain shadow-xl rounded-lg"
                />
              ) : (
                <iframe
                  src={previewFile.data}
                  className="w-full h-[80vh] border-2 rounded-lg shadow-xl"
                  title="PDF Preview"
                ></iframe>
              )}
            </div>
            
            <div className="p-4 bg-gradient-to-r from-slate-100 to-gray-100 border-t-2 flex justify-end gap-2">
              <a
                href={previewFile.data}
                download={previewFile.name}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Download size={16} />
                İndir
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

