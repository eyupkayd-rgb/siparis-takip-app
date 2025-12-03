import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  User, Printer, Calendar, CheckCircle, Clock, Plus, Package, Layout, 
  Palette, Settings, LogOut, Loader2, Archive, Truck, ClipboardCheck, 
  AlertTriangle, ChevronLeft, ChevronRight, Grid, List, Layers, Calculator, 
  FileText, X, Pen, Sparkles, MessageSquare, Download, Lock, Mail, 
  ShieldCheck, Monitor, Users, Check, Ban, Edit3, AlertCircle, Trash2, 
  Paperclip, Key, Play, StopCircle, BarChart3, History, Split, 
  Cylinder, Component, Search 
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

// ============================================================================
// 🧮 BUSINESS LOGIC (ERP Architecture)
// ============================================================================

const generateProductionJobs = (complexData) => {
  if (!complexData || !complexData.variants || complexData.variants.length === 0) return [];
  let jobs = [];
  
  complexData.variants.forEach((variant, idx) => {
    jobs.push({
      id: `job_${Date.now()}_${idx}_f`,
      name: `${variant.name} - ÖN`,
      quantity: variant.quantity,
      type: 'Front',
      variantName: variant.name,
      status: 'pending_mounting'
    });

    if (complexData.isSet && !complexData.commonBack) {
      jobs.push({
        id: `job_${Date.now()}_${idx}_b`,
        name: `${variant.name} - ARKA`,
        quantity: variant.quantity,
        type: 'Back',
        variantName: variant.name,
        status: 'pending_mounting'
      });
    }
  });

  if (complexData.isSet && complexData.commonBack) {
    const totalQty = complexData.variants.reduce((sum, v) => sum + parseInt(v.quantity || 0), 0);
    jobs.push({
      id: `job_${Date.now()}_common_b`,
      name: `ORTAK ARKA ETİKET`,
      quantity: totalQty,
      type: 'Back_Common',
      variantName: 'All',
      status: 'pending_mounting'
    });
  }
  return jobs;
};

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

// ============================================================================
// 📊 STATUS BADGE COMPONENT
// ============================================================================

function StatusBadge({ status }) {
  const statusMap = {
    graphics_pending: { text: "Grafik Bekliyor", color: "bg-blue-500", icon: Palette },
    warehouse_raw_pending: { text: "Hammadde Onayı", color: "bg-indigo-500", icon: Archive },
    warehouse_processing: { text: "Depo İşlemde", color: "bg-purple-500", icon: Package },
    planning_pending: { text: "Planlama Bekliyor", color: "bg-orange-500", icon: Calendar },
    planned: { text: "Planlandı", color: "bg-green-500", icon: CheckCircle },
    production_started: { text: "Üretimde", color: "bg-teal-500", icon: Printer },
    shipping_ready: { text: "Sevk Bekliyor", color: "bg-yellow-500", icon: Truck },
    completed: { text: "Tamamlandı", color: "bg-gray-800", icon: Check }
  };
  
  const s = statusMap[status] || { text: status, color: "bg-gray-400", icon: AlertCircle };
  const Icon = s.icon;
  
  return (
    <span className={`${s.color} text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm`}>
      <Icon size={14} />
      {s.text}
    </span>
  );
}

// ============================================================================
// 📦 MARKETING DASHBOARD (FULL FEATURED)
// ============================================================================

function MarketingDashboard({ orders, isSuperAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    orderNo: '', customer: '', product: '', category: 'Etiket', type: 'Yeni',
    rawMaterial: '', qAmount: '', qUnit: 'Adet', sheetStatus: '', 
    customerDeadline: '', attachments: [],
    isComplex: false, isSet: false, commonBack: false, variants: []
  });

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  const addVariant = () => {
    setFormData({ 
      ...formData, 
      variants: [...formData.variants, { name: '', quantity: '' }] 
    });
  };

  const removeVariant = (index) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const ordersCollection = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
      
      const finalQuantity = formData.isComplex 
        ? formData.variants.reduce((sum, v) => sum + parseInt(v.quantity || 0), 0) + ' Adet (Toplam)' 
        : `${formData.qAmount} ${formData.qUnit}`;
      
      const generatedJobs = formData.isComplex ? generateProductionJobs(formData) : [];

      const payload = { 
        ...formData, 
        quantity: finalQuantity, 
        generatedJobs: generatedJobs,
        revisionAlert: editingId ? "Pazarlama tarafından güncellendi" : null 
      };
      
      if (editingId) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'orders', editingId), 
          payload
        );
      } else {
        await addDoc(ordersCollection, { 
          ...payload, 
          status: 'graphics_pending', 
          graphicsData: null, 
          warehouseData: null, 
          planningData: null, 
          productionData: null, 
          createdAt: new Date().toISOString() 
        });
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
        orderNo: '', customer: '', product: '', category: 'Etiket', type: 'Yeni',
        rawMaterial: '', qAmount: '', qUnit: 'Adet', sheetStatus: '', 
        customerDeadline: '', attachments: [],
        isComplex: false, isSet: false, commonBack: false, variants: []
      });
    } catch (error) {
      console.error("Order save error:", error);
      alert("Hata: " + error.message);
    }
    setIsSaving(false);
  };

  const handleEdit = (order) => {
    setEditingId(order.id);
    const [amount, unit] = (order.quantity || "0 Adet").split(" ");
    setFormData({
      orderNo: order.orderNo || '', 
      customer: order.customer || '', 
      product: order.product || '',
      category: order.category || 'Etiket', 
      type: order.type || 'Yeni', 
      rawMaterial: order.rawMaterial || '',
      qAmount: amount, 
      qUnit: unit || 'Adet', 
      sheetStatus: order.sheetStatus || '', 
      customerDeadline: order.customerDeadline || '',
      attachments: order.attachments || [],
      isComplex: order.isComplex || false,
      isSet: order.isSet || false,
      commonBack: order.commonBack || false,
      variants: order.variants || []
    });
    setShowForm(true);
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("DİKKAT: Bu siparişi kalıcı olarak silmek üzeresiniz.")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
      } catch (error) {
        alert("Silme işlemi başarısız oldu.");
      }
    }
  };

  const rawMaterials = [
    "PP OPAK SARI PERGAMİN", "PP OPAK BEYAZ PERGAMİN", "PP OPAK PET",
    "KUŞE SARI PERGAMİN", "KUŞE BEYAZ PERGAMİN", "KUŞE PET", "KUŞE MAT",
    "PP METALİZE GOLD", "PP METALİZE SİLVER",
    "KUŞE METALİZE GOLD", "KUŞE METALİZE SİLVER",
    "PP ŞEFFAF", "PP ULTRA CLEAR", "PE OPAK",
    "LAMİNE TERMAL", "ECO TERMAL",
    "PET-G 40 MİC.", "PET-G 45 MİC.", "PET-G 50 MİC.",
    "PVC 40 MİC.", "PVC 45 MİC.", "PVC 50 MİC."
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Sipariş Yönetimi
          </h2>
          <p className="text-gray-600 mt-1">
            Yeni sipariş oluşturun veya mevcutları düzenleyin
          </p>
        </div>
        
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              orderNo: '', customer: '', product: '', category: 'Etiket', type: 'Yeni',
              rawMaterial: '', qAmount: '', qUnit: 'Adet', sheetStatus: '', 
              customerDeadline: '', attachments: [],
              isComplex: false, isSet: false, commonBack: false, variants: []
            });
          }}
          className="btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl"
        >
          {showForm ? (
            <>
              <X size={18} />
              Listeye Dön
            </>
          ) : (
            <>
              <Plus size={18} />
              Yeni Sipariş Gir
            </>
          )}
        </button>
      </div>

      {showForm ? (
        <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-gray-100 animate-slide-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <Package size={24} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">
              {editingId ? 'Siparişi Düzenle' : 'Yeni Sipariş Oluştur'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl border-2 border-blue-100">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-bold text-blue-900">
                  📦 Sipariş Kategorisi & Tipi
                </label>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm">
                  <span className="text-xs font-bold text-purple-700">
                    Gelişmiş Sipariş (Varyant/Takım)
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, isComplex: !formData.isComplex})}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.isComplex ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                      formData.isComplex ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-3 rounded-lg border-2 border-transparent hover:border-blue-300 transition-all">
                  <input
                    type="radio"
                    name="category"
                    value="Etiket"
                    checked={formData.category === 'Etiket'}
                    onChange={() => setFormData({...formData, category: 'Etiket', sheetStatus: ''})}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="font-bold text-gray-700">📄 Etiket Siparişi</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-3 rounded-lg border-2 border-transparent hover:border-blue-300 transition-all">
                  <input
                    type="radio"
                    name="category"
                    value="Ambalaj"
                    checked={formData.category === 'Ambalaj'}
                    onChange={() => setFormData({...formData, category: 'Ambalaj'})}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="font-bold text-gray-700">📦 Ambalaj Siparişi</span>
                </label>
              </div>
            </div>

            {/* Basic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Sipariş No</label>
                <input
                  required
                  placeholder="Örn: SIP-2024-001"
                  className="input-field"
                  value={formData.orderNo}
                  onChange={e => setFormData({...formData, orderNo: e.target.value})}
                />
              </div>
              
              <div>
                <label className="label">Firma Adı</label>
                <input
                  required
                  placeholder="Müşteri firma adı"
                  className="input-field"
                  value={formData.customer}
                  onChange={e => setFormData({...formData, customer: e.target.value})}
                />
              </div>
            </div>

            {/* Complex Order (Variants) */}
            {formData.isComplex ? (
              <div className="bg-purple-50 p-5 rounded-xl border-2 border-purple-200 space-y-4">
                <div className="flex gap-4 items-center">
                  <h4 className="font-bold text-purple-800 flex items-center gap-2">
                    <Split size={18} />
                    Varyant / Çeşit Yönetimi
                  </h4>
                  <label className="flex items-center gap-2 text-xs cursor-pointer bg-white px-3 py-2 rounded-lg border border-purple-200">
                    <input
                      type="checkbox"
                      checked={formData.isSet}
                      onChange={e => setFormData({...formData, isSet: e.target.checked})}
                    />
                    <span className="font-bold">Takım (Ön+Arka)</span>
                  </label>
                  {formData.isSet && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer bg-white px-3 py-2 rounded-lg border border-purple-200">
                      <input
                        type="checkbox"
                        checked={formData.commonBack}
                        onChange={e => setFormData({...formData, commonBack: e.target.checked})}
                      />
                      <span className="font-bold">Ortak Arka Etiket</span>
                    </label>
                  )}
                </div>
                
                {formData.variants.map((variant, index) => (
                  <div key={index} className="flex gap-2 items-center bg-white p-3 rounded-lg border border-purple-200">
                    <span className="text-sm font-bold text-purple-600 w-8">
                      {index + 1}.
                    </span>
                    <input
                      required
                      placeholder="Varyant Adı (Örn: Elma, Portakal)"
                      className="input-field flex-1"
                      value={variant.name}
                      onChange={e => handleVariantChange(index, 'name', e.target.value)}
                    />
                    <input
                      required
                      type="number"
                      placeholder="Adet"
                      className="input-field w-32"
                      value={variant.quantity}
                      onChange={e => handleVariantChange(index, 'quantity', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-sm font-bold text-purple-600 hover:text-purple-800 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-dashed border-purple-300 hover:border-purple-400 transition-all"
                >
                  <Plus size={16} />
                  Varyant Ekle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Ürün Adı</label>
                  <input
                    required
                    placeholder="Ürün ismi"
                    className="input-field"
                    value={formData.product}
                    onChange={e => setFormData({...formData, product: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="label">Miktar</label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="number"
                      placeholder="Miktar"
                      className="input-field flex-1"
                      value={formData.qAmount}
                      onChange={e => setFormData({...formData, qAmount: e.target.value})}
                    />
                    <select
                      className="input-field w-28 bg-gray-50"
                      value={formData.qUnit}
                      onChange={e => setFormData({...formData, qUnit: e.target.value})}
                    >
                      <option>Adet</option>
                      <option>Kg</option>
                      <option>Metre</option>
                      <option>Top</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Rest of the fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Sipariş Türü</label>
                <select
                  className="input-field"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option>Yeni</option>
                  <option>Tekrar</option>
                  <option>Numune</option>
                </select>
              </div>
              
              <div>
                <label className="label">Hammadde</label>
                <select
                  className="input-field"
                  value={formData.rawMaterial}
                  onChange={e => setFormData({...formData, rawMaterial: e.target.value})}
                >
                  <option value="" disabled>Hammadde Seçin</option>
                  {rawMaterials.map(mat => (
                    <option key={mat} value={mat}>{mat}</option>
                  ))}
                </select>
              </div>
              
              {formData.category === 'Ambalaj' && (
                <div className="animate-in fade-in">
                  <label className="label">Tabaka Durumu</label>
                  <select
                    className="input-field border-blue-300 bg-blue-50"
                    value={formData.sheetStatus}
                    onChange={e => setFormData({...formData, sheetStatus: e.target.value})}
                  >
                    <option value="">Seçiniz</option>
                    <option>Var</option>
                    <option>Yok</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="label">Müşteri Termin Tarihi</label>
                <input
                  required
                  type="date"
                  className="input-field"
                  value={formData.customerDeadline}
                  onChange={e => setFormData({...formData, customerDeadline: e.target.value})}
                />
              </div>
            </div>

            {/* Attachments */}
            <AttachmentManager
              order={editingId ? { id: editingId, attachments: formData.attachments } : null}
              onAttachmentsChange={(newAtt) => setFormData({...formData, attachments: newAtt})}
            />

            {/* Submit Button */}
            <button
              disabled={isSaving}
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <CheckCircle size={24} />
                  {editingId ? 'Değişiklikleri Kaydet' : 'Kaydet ve Grafiğe Gönder'}
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <OrderListTable
          orders={orders}
          onEdit={handleEdit}
          onDelete={handleDeleteOrder}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}

// ============================================================================
// 📋 ORDER LIST TABLE COMPONENT
// ============================================================================

function OrderListTable({ orders, onEdit, onDelete, isSuperAdmin }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden">
      {/* Search & Filter Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b-2 border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Sipariş no, firma veya ürün ara..."
              className="input-field pl-12 w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="input-field md:w-64"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">🔍 Tüm Durumlar</option>
            <option value="graphics_pending">📐 Grafik Bekliyor</option>
            <option value="warehouse_raw_pending">📦 Hammadde Onayı</option>
            <option value="planning_pending">📅 Planlama Bekliyor</option>
            <option value="planned">✅ Planlandı</option>
            <option value="production_started">⚙️ Üretimde</option>
            <option value="shipping_ready">🚚 Sevk Bekliyor</option>
            <option value="completed">✔️ Tamamlandı</option>
          </select>
        </div>
        
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <span className="font-bold">{filteredOrders.length}</span>
          <span>sipariş gösteriliyor</span>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-b-2 border-gray-200">
            <tr>
              <th className="p-4 font-bold">Sipariş No</th>
              <th className="p-4 font-bold">Müşteri</th>
              <th className="p-4 font-bold">Ürün</th>
              <th className="p-4 font-bold">Miktar</th>
              <th className="p-4 font-bold">Tip</th>
              <th className="p-4 font-bold">Termin</th>
              <th className="p-4 font-bold">Durum</th>
              <th className="p-4 font-bold text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.map(order => (
              <tr
                key={order.id}
                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 group"
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="font-bold text-gray-800">{order.orderNo}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-gray-700">{order.customer}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{order.product}</span>
                    {order.isComplex && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">
                        Varyant
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 font-medium">{order.quantity}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    order.category === 'Ambalaj' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.category || 'Etiket'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-xs text-gray-500">{order.customerDeadline}</div>
                </td>
                <td className="p-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(order)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}
                    {isSuperAdmin && onDelete && (
                      <button
                        onClick={() => onDelete(order.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="8" className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4 text-gray-400">
                    <Package size={64} className="opacity-20" />
                    <p className="text-lg font-medium">Sipariş bulunamadı</p>
                    <p className="text-sm">Yeni sipariş eklemek için yukarıdaki butonu kullanın</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// 🏠 MAIN APP COMPONENT
// ============================================================================

export default function OrderApp() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(null);

  const isSuperAdmin = user && ADMIN_EMAILS.includes(user.email);

  // Auth initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window !== 'undefined' && typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
          await signInWithCustomToken(auth, window.__initial_auth_token);
        } else {
          try {
            await signInAnonymously(auth);
          } catch (anonError) {
            console.warn("Anonymous auth failed:", anonError);
            setUser({ uid: 'test-user', isAnonymous: true });
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Auth error:", error);
        setUser({ uid: 'test-user', isAnonymous: true });
        setLoading(false);
      }
    };
    
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // TEST MODE: Everyone gets admin role
        setUserRole('admin');
        setLoading(false);
      } else {
        setUserRole(null);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Fetch orders
  useEffect(() => {
    if (!user || !db) return;
    
    const ordersCollection = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubscribe = onSnapshot(
      ordersCollection,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedOrders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setOrders(fetchedOrders);
      },
      (error) => {
        console.error("Orders fetch error:", error);
      }
    );
    
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    setUserRole(null);
    setActiveDepartment(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={64} />
          <p className="text-gray-600 text-lg font-medium">Sistem yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-blue-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Personel Girişi</h2>
            <p className="text-gray-500 text-sm mt-1">Bulut Üretim Takip Sistemi</p>
          </div>
          <div className="text-center text-gray-500">
            <p>Sistem yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Department Selection Menu
  if (!activeDepartment) {
    const departments = [
      { id: 'marketing', name: 'Pazarlama', desc: 'Sipariş Girişi', icon: User, color: 'from-blue-500 to-blue-600' },
      { id: 'graphics', name: 'Grafik', desc: 'Teknik Detaylar', icon: Palette, color: 'from-orange-500 to-orange-600' },
      { id: 'warehouse', name: 'Depo', desc: 'Hammadde & Sevkiyat', icon: Archive, color: 'from-indigo-500 to-indigo-600' },
      { id: 'planning', name: 'Planlama', desc: 'Üretim Takvimi', icon: Calendar, color: 'from-green-500 to-green-600' },
      { id: 'archive', name: 'Arşiv', desc: 'Geçmiş ve Raporlar', icon: FileText, color: 'from-purple-500 to-purple-600' }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-12 animate-in fade-in">
            <div className="bg-white/10 backdrop-blur-lg w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Package size={40} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-3">
              Bulut Takip Sistemi
            </h1>
            <p className="text-blue-100 text-lg">
              Lütfen departmanınızı seçiniz
            </p>
          </div>

          {/* Department Cards */}
          <div className="grid gap-4 animate-in fade-in duration-500">
            {departments.map((dept, index) => {
              const Icon = dept.icon;
              return (
                <button
                  key={dept.id}
                  onClick={() => setActiveDepartment(dept.id)}
                  className="group bg-white/10 backdrop-blur-lg hover:bg-white/20 p-6 rounded-2xl border-2 border-white/20 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl text-left"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`bg-gradient-to-br ${dept.color} p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={28} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {dept.name}
                      </h3>
                      <p className="text-blue-100 text-sm">
                        {dept.desc}
                      </p>
                    </div>
                    <ChevronRight className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" size={24} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <button
              onClick={handleLogout}
              className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-2 mx-auto transition-colors"
            >
              <LogOut size={16} />
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveDepartment(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Ana Menüye Dön"
            >
              <ChevronLeft size={24} className="text-gray-600" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-2 rounded-xl shadow-lg">
                <Package size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Üretim Takip v7.0 (Modern)
                </h1>
                <p className="text-xs text-gray-500">
                  {activeDepartment === 'marketing' && 'Pazarlama Departmanı'}
                  {activeDepartment === 'graphics' && 'Grafik Departmanı'}
                  {activeDepartment === 'warehouse' && 'Depo Departmanı'}
                  {activeDepartment === 'planning' && 'Planlama Departmanı'}
                  {activeDepartment === 'archive' && 'Arşiv Departmanı'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full">
              <User size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {user.isAnonymous ? 'Test User' : user.email}
              </span>
            </div>
            
            <button
              onClick={() => setShowPasswordModal(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Şifre Değiştir"
            >
              <Key size={20} />
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-6">
        {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
        
        {activeDepartment === 'marketing' && (
          <MarketingDashboard orders={orders} isSuperAdmin={isSuperAdmin} />
        )}
        
        {activeDepartment === 'graphics' && (
          <div className="bg-white p-12 rounded-2xl shadow-xl text-center">
            <Palette size={64} className="mx-auto mb-4 text-orange-500 opacity-50" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Grafik Modülü</h2>
            <p className="text-gray-600">Yakında eklenecek...</p>
          </div>
        )}
        
        {activeDepartment === 'warehouse' && (
          <div className="bg-white p-12 rounded-2xl shadow-xl text-center">
            <Archive size={64} className="mx-auto mb-4 text-indigo-500 opacity-50" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Depo Modülü</h2>
            <p className="text-gray-600">Yakında eklenecek...</p>
          </div>
        )}
        
        {activeDepartment === 'planning' && (
          <div className="bg-white p-12 rounded-2xl shadow-xl text-center">
            <Calendar size={64} className="mx-auto mb-4 text-green-500 opacity-50" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Planlama Modülü</h2>
            <p className="text-gray-600">Yakında eklenecek...</p>
          </div>
        )}
        
        {activeDepartment === 'archive' && (
          <div className="bg-white p-12 rounded-2xl shadow-xl text-center">
            <FileText size={64} className="mx-auto mb-4 text-purple-500 opacity-50" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Arşiv Modülü</h2>
            <p className="text-gray-600">Yakında eklenecek...</p>
          </div>
        )}
      </main>
    </div>
  );
}
