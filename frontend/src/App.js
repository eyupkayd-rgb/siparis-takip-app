import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Printer, Calendar, CheckCircle, Clock, Plus, Package, Layout, Palette, Settings, ArrowRight, LogOut, Loader2, Archive, Truck, ClipboardCheck, AlertTriangle, ChevronLeft, ChevronRight, Grid, List, Layers, Calculator, Search, FileText, X, Pen, Sparkles, MessageSquare, Download, Lock, Mail, ShieldCheck, Monitor, Users, Check, Ban, Edit3, AlertCircle, Trash2, Box, Paperclip, Eye, File, Image, Key, Play, Square, ToggleLeft, StopCircle, BarChart3, History,  Split, Cylinder, Ruler, Component } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, signInWithCustomToken, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, addDoc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";

// ==========================================================================================
// 1. AYARLAR VE ADMİN YETKİSİ
// ==========================================================================================

// BURAYA KENDİ E-POSTA ADRESİNİZİ YAZIN (Süper Admin - Silme Yetkisi Olanlar)
const ADMIN_EMAILS = ["eyupkayd@gmail.com", "ukaydi.27@gmail.com", "rec.row27@gmail.com", "esenyakuppp@gmail.com"];

// Google AI Studio API Anahtarı (Environment Variable'dan al - Güvenlik İyileştirmesi)
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

// Önizleme ortamı kontrolü
try {
  if (typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(window.__firebase_config);
    appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
  }
} catch (error) { console.warn("Firebase config parse error:", error); }

// Firebase Başlatma
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- GEMINI API ---
async function callGemini(prompt) {
  if (!apiKey) {
    console.warn("Gemini API key not configured");
    return "API anahtarı yapılandırılmamış. Lütfen .env.local dosyasına REACT_APP_GEMINI_API_KEY ekleyin.";
  }
  
  try {
    const response = await fetch(
      \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=\${apiKey}\`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    );
    if (!response.ok) throw new Error("API Hatası");
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt alınamadı.";
  } catch (error) { 
    console.error("Gemini API error:", error);
    return "Yapay zeka bağlantı hatası."; 
  }
}

// ==========================================================================================
// YARDIMCI BİLEŞENLER (DOSYA YÖNETİMİ & ŞİFRE DEĞİŞTİRME)
// ==========================================================================================

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
            if (error.code === 'auth/wrong-password') alert("Mevcut şifrenizi yanlış girdiniz.");
            else if (error.code === 'auth/weak-password') alert("Yeni şifre çok zayıf. En az 6 karakter olmalı.");
            else alert("Hata oluştu: " + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Key className="text-blue-600"/> Şifre Değiştir</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Şifre</label><input required type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Mevcut şifreniz" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label><input required type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Yeni şifreniz (En az 6 karakter)" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
                    <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold transition-all flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin" size={20} /> : 'Şifreyi Güncelle'}</button>
                </form>
            </div>
        </div>
    );
}

function AttachmentManager({ order, onAttachmentsChange, readOnly = false, compact = false }) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const fileInputRef = useRef(null);
    const attachments = order?.attachments || (onAttachmentsChange ? [] : []); 

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Dosya boyutu kontrolü - İyileştirilmiş
        const maxSize = 450 * 1024; // 450KB
        if (file.size > maxSize) { 
            alert(\`UYARI: Dosya boyutu çok büyük! (\${(file.size / 1024).toFixed(0)}KB)\\nLütfen \${(maxSize / 1024).toFixed(0)}KB altındaki dosyaları yükleyin.\`); 
            if(fileInputRef.current) fileInputRef.current.value = "";
            return; 
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const newFile = { id: Date.now().toString(), name: file.name, type: file.type, data: reader.result, uploadedAt: new Date().toLocaleString('tr-TR') };
            const newAttachments = [...(order?.attachments || []), newFile];

            if (order && order.id && !onAttachmentsChange) {
                try { 
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { attachments: newAttachments }); 
                } 
                catch (error) { 
                    console.error("File upload error:", error);
                    alert("Yükleme sırasında hata oluştu."); 
                }
            } else if (onAttachmentsChange) { 
                onAttachmentsChange(newAttachments); 
            }
            setIsUploading(false); 
            if(fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.onerror = () => {
            console.error("File read error");
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
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { attachments: newAttachments }); 
            } catch (error) {
                console.error("Delete error:", error);
            }
        } 
        else if (onAttachmentsChange) { onAttachmentsChange(newAttachments); }
    };

    return (
        <div className={\`bg-slate-50 rounded-lg border border-slate-200 \${compact ? 'p-2' : 'p-4'} mt-4\`}>
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><Paperclip size={16} className="text-slate-500"/> Dosya Ekleri ({attachments?.length || 0})</h4>
                {!readOnly && (
                    <label className="cursor-pointer bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors">
                        {isUploading ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Dosya Ekle
                        <input type="file" ref={fileInputRef} accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading}/>
                    </label>
                )}
            </div>
            {attachments && attachments.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {attachments.map(file => (
                        <div key={file.id} className="relative group bg-white p-2 rounded border border-slate-200 hover:shadow-sm transition-all">
                            <div className="aspect-square bg-slate-100 rounded flex items-center justify-center cursor-pointer overflow-hidden mb-2" onClick={() => setPreviewFile(file)}>
                                {file.type.includes('image') ? (<img src={file.data} alt={file.name} className="w-full h-full object-cover" />) : (<FileText size={32} className="text-red-500 opacity-70" />)}
                            </div>
                            <div className="text-[10px] font-medium truncate text-slate-700 mb-1" title={file.name}>{file.name}</div>
                            {!readOnly && (<button onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="absolute top-1 right-1 bg-white text-red-500 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50" title="Sil"><X size={12} /></button>)}
                        </div>
                    ))}
                </div>
            ) : (<div className="text-center py-4 text-slate-400 text-xs italic border border-dashed border-slate-300 rounded">Henüz dosya eklenmemiş.</div>)}
            {previewFile && (
                <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewFile(null)}>
                    <div className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-3 bg-slate-100 border-b"><h3 className="font-bold text-slate-700 truncate flex-1">{previewFile.name}</h3><button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button></div>
                        <div className="flex-1 overflow-auto bg-slate-50 p-4 flex items-center justify-center">{previewFile.type.includes('image') ? (<img src={previewFile.data} alt="Preview" className="max-w-full max-h-[80vh] object-contain shadow-lg" />) : (<iframe src={previewFile.data} className="w-full h-[80vh] border rounded shadow-lg" title="PDF Preview"></iframe>)}</div>
                        <div className="p-3 bg-slate-100 border-t flex justify-end gap-2"><a href={previewFile.data} download={previewFile.name} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-2"><Download size={16}/> İndir</a></div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================================================================
// BUSINESS LOGIC (ERP ARCHITECTURE - PYTHONIC LOGIC IN JS)
// ==========================================================================================

// Level 2: Explosion Logic
const generateProductionJobs = (complexData) => {
    if (!complexData || !complexData.variants || complexData.variants.length === 0) return [];
    let jobs = [];
    
    complexData.variants.forEach((variant, idx) => {
        // Front Label (Always exists)
        jobs.push({
            id: \`job_\${Date.now()}_\${idx}_f\`,
            name: \`\${variant.name} - ÖN\`,
            quantity: variant.quantity,
            type: 'Front',
            variantName: variant.name,
            status: 'pending_mounting'
        });

        // Back Label Logic (Takım ise)
        if (complexData.isSet) {
            if (!complexData.commonBack) {
                // Unique back for each variant
                jobs.push({
                    id: \`job_\${Date.now()}_\${idx}_b\`,
                    name: \`\${variant.name} - ARKA\`,
                    quantity: variant.quantity,
                    type: 'Back',
                    variantName: variant.name,
                    status: 'pending_mounting'
                });
            }
        }
    });

    // Common Back Logic (Single job for all variants)
    if (complexData.isSet && complexData.commonBack) {
        const totalQty = complexData.variants.reduce((sum, v) => sum + parseInt(v.quantity || 0), 0);
        jobs.push({
            id: \`job_\${Date.now()}_common_b\`,
            name: \`ORTAK ARKA ETİKET\`,
            quantity: totalQty,
            type: 'Back_Common',
            variantName: 'All',
            status: 'pending_mounting'
        });
    }
    return jobs;
};

// Level 4: Calculation Logic
const calculatePlateMeterage = (plate) => {
    if (!plate.zStep || !plate.items.length) return 0;
    let maxMeterage = 0;
    
    plate.items.forEach(item => {
        const jobQty = parseInt(item.job.quantity);
        const lanes = parseInt(item.lanes);
        if (lanes > 0) {
            const requiredMeters = (jobQty / lanes) * (parseFloat(plate.zStep) / 1000);
            if (requiredMeters > maxMeterage) maxMeterage = requiredMeters;
        }
    });
    return Math.ceil(maxMeterage);
};

