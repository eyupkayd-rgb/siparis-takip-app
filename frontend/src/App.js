import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  User, Printer, Calendar, CheckCircle, Clock, Plus, Package, Layout, 
  Palette, Settings, LogOut, Loader2, Archive, Truck, ClipboardCheck, 
  AlertTriangle, ChevronLeft, ChevronRight, Grid, List, Layers, Calculator, 
  FileText, X, Pen, Sparkles, MessageSquare, Download, Lock, Mail, 
  ShieldCheck, Monitor, Users, Check, Ban, Edit3, AlertCircle, Trash2, 
  Paperclip, Key, Play, StopCircle, BarChart3, History, Split, 
  Cylinder, Component, Search, Ruler, LogIn, UserPlus, Database,
  Barcode, QrCode, Scissors, PackagePlus, PackageCheck, Building2,
  CreditCard, Phone, MapPin
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, sendPasswordResetEmail, updatePassword, 
  reauthenticateWithCredential, EmailAuthProvider, signInWithCustomToken, 
  signInAnonymously 
} from "firebase/auth";
import { 
  collection, doc, setDoc, getDoc, getDocs, addDoc, 
  updateDoc, onSnapshot, deleteDoc 
} from "firebase/firestore";
import './App.css';

// Import services
import { auth, db, appId, SUPER_ADMIN_EMAILS } from './services/firebase';
import { callGemini } from './services/gemini';

// Import utils
import { getMaterialShortCode, logStockMovement, generateBarcode } from './utils/stockHelpers';
import { generateProductionJobs, calculatePlateMeterage } from './utils/productionHelpers';

// Import shared components
import StatusBadge from './components/shared/StatusBadge';
import ChangePasswordModal from './components/shared/ChangePasswordModal';
import AttachmentManager from './components/shared/AttachmentManager';

// Import dashboard components
import ArchiveDashboard from './components/Archive/ArchiveDashboard';
import AuthScreen from './components/Auth/AuthScreen';
import AdminDashboard from './components/Admin/AdminDashboard';
import MarketingDashboard from './components/Marketing/MarketingDashboard';
import GraphicsDashboard from './components/Graphics/GraphicsDashboard';

// Legacy compatibility
const ADMIN_EMAILS = SUPER_ADMIN_EMAILS;

// ============================================================================
// 🧩 HELPER COMPONENTS (Utilities now imported from separate files)
// ============================================================================

// ============================================================================
// 🧩 HELPER COMPONENTS
// ============================================================================

// ==========================================================================================
// 🏢 MÜŞTERİ KART YÖNETİMİ (CUSTOMER CARD MANAGEMENT)
// ==========================================================================================

function CustomerCardModal({ onClose, customers, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    city: '',
    contactPerson: '',
    phone: '',
    email: ''
  });
  const [saving, setSaving] = useState(false);

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name || '',
      taxId: customer.taxId || '',
      city: customer.city || '',
      contactPerson: customer.contactPerson || '',
      phone: customer.phone || '',
      email: customer.email || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (customerId) => {
    if (!window.confirm('Bu müşteri kartını silmek istediğinize emin misiniz?')) return;
    
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customer_cards', customerId));
      alert('✅ Müşteri kartı silindi!');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Müşteri kartı silme hatası:', error);
      alert('❌ Hata: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingId) {
        // Güncelleme
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'customer_cards', editingId),
          {
            ...formData,
            updatedAt: new Date().toISOString()
          }
        );
        alert('✅ Müşteri kartı güncellendi!');
      } else {
        // Yeni ekleme
        const customersCollection = collection(db, 'artifacts', appId, 'public', 'data', 'customer_cards');
        await addDoc(customersCollection, {
          ...formData,
          createdAt: new Date().toISOString(),
          isApproved: true
        });
        alert('✅ Müşteri kartı oluşturuldu!');
      }
      
      setFormData({ name: '', taxId: '', city: '', contactPerson: '', phone: '', email: '' });
      setEditingId(null);
      setShowForm(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Müşteri kartı kaydetme hatası:', error);
      alert('❌ Hata: ' + error.message);
    }
    
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Building2 className="text-white" size={28} />
            <h2 className="text-2xl font-bold text-white">Müşteri Kartları</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!showForm ? (
            <>
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ name: '', taxId: '', city: '', contactPerson: '', phone: '', email: '' });
                  setShowForm(true);
                }}
                className="btn-primary mb-6 flex items-center gap-2"
              >
                <Plus size={20} />
                Yeni Müşteri Ekle
              </button>

              <div className="space-y-3">
                {customers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Building2 size={64} className="mx-auto mb-4 opacity-30" />
                    <p>Henüz müşteri kartı eklenmemiş</p>
                  </div>
                ) : (
                  customers.map(customer => (
                    <div
                      key={customer.id}
                      className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-100"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-800">{customer.name}</h3>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                            {customer.taxId && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <CreditCard size={16} />
                                <span>VKN: {customer.taxId}</span>
                              </div>
                            )}
                            {customer.city && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin size={16} />
                                <span>{customer.city}</span>
                              </div>
                            )}
                            {customer.contactPerson && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <User size={16} />
                                <span>{customer.contactPerson}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone size={16} />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                            title="Düzenle"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Müşteri Adı *</label>
                  <input
                    required
                    className="input-field"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Örn: ABC Gıda San. Tic. Ltd. Şti."
                  />
                </div>
                
                <div>
                  <label className="label">Vergi Kimlik No</label>
                  <input
                    className="input-field"
                    value={formData.taxId}
                    onChange={e => setFormData({...formData, taxId: e.target.value})}
                    placeholder="10 haneli VKN"
                    maxLength="10"
                  />
                </div>
                
                <div>
                  <label className="label">Şehir</label>
                  <input
                    className="input-field"
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    placeholder="Örn: İstanbul"
                  />
                </div>
                
                <div>
                  <label className="label">İletişim Kişisi</label>
                  <input
                    className="input-field"
                    value={formData.contactPerson}
                    onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                    placeholder="Yetkili kişi adı"
                  />
                </div>
                
                <div>
                  <label className="label">Telefon</label>
                  <input
                    className="input-field"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="0555 123 45 67"
                  />
                </div>
                
                <div>
                  <label className="label">E-posta</label>
                  <input
                    type="email"
                    className="input-field"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="ornek@firma.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ name: '', taxId: '', city: '', contactPerson: '', phone: '', email: '' });
                  }}
                  className="flex-1 btn-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {editingId ? 'Güncelleniyor...' : 'Kaydediliyor...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      {editingId ? 'Güncelle' : 'Kaydet'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================================================================
// 🏭 TEDARİKÇİ KART YÖNETİMİ (SUPPLIER CARD MANAGEMENT)
// ==========================================================================================

function SupplierCardModal({ onClose, suppliers, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    city: '',
    contactPerson: '',
    phone: '',
    prefix: '',
    materialTypes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleEdit = (supplier) => {
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name || '',
      taxId: supplier.taxId || '',
      city: supplier.city || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      prefix: supplier.prefix || '',
      materialTypes: supplier.materialTypes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (supplierId) => {
    if (!window.confirm('Bu tedarikçi kartını silmek istediğinize emin misiniz?')) return;
    
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'supplier_cards', supplierId));
      alert('✅ Tedarikçi kartı silindi!');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Tedarikçi kartı silme hatası:', error);
      alert('❌ Hata: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.prefix.length !== 2) {
      alert('⚠️ Prefix tam olarak 2 karakter olmalıdır!');
      return;
    }
    
    // Prefix benzersizlik kontrolü (düzenleme sırasında kendi prefix'i hariç)
    const existingPrefix = suppliers.find(s => 
      s.prefix?.toUpperCase() === formData.prefix.toUpperCase() && s.id !== editingId
    );
    if (existingPrefix) {
      alert(`⚠️ Bu prefix (${formData.prefix}) zaten "${existingPrefix.name}" tedarikçisine ait!`);
      return;
    }
    
    setSaving(true);
    
    try {
      if (editingId) {
        // Güncelleme
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'supplier_cards', editingId),
          {
            ...formData,
            prefix: formData.prefix.toUpperCase(),
            updatedAt: new Date().toISOString()
          }
        );
        alert('✅ Tedarikçi kartı güncellendi!');
      } else {
        // Yeni ekleme
        const suppliersCollection = collection(db, 'artifacts', appId, 'public', 'data', 'supplier_cards');
        await addDoc(suppliersCollection, {
          ...formData,
          prefix: formData.prefix.toUpperCase(),
          createdAt: new Date().toISOString()
        });
        alert('✅ Tedarikçi kartı oluşturuldu!');
      }
      
      setFormData({ name: '', taxId: '', city: '', contactPerson: '', phone: '', prefix: '', materialTypes: '' });
      setEditingId(null);
      setShowForm(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Tedarikçi kartı kaydetme hatası:', error);
      alert('❌ Hata: ' + error.message);
    }
    
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-teal-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Truck className="text-white" size={28} />
            <h2 className="text-2xl font-bold text-white">Tedarikçi Kartları</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!showForm ? (
            <>
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ name: '', taxId: '', city: '', contactPerson: '', phone: '', prefix: '', materialTypes: '' });
                  setShowForm(true);
                }}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg mb-6 flex items-center gap-2"
              >
                <Plus size={20} />
                Yeni Tedarikçi Ekle
              </button>

              <div className="space-y-3">
                {suppliers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Truck size={64} className="mx-auto mb-4 opacity-30" />
                    <p>Henüz tedarikçi kartı eklenmemiş</p>
                  </div>
                ) : (
                  suppliers.map(supplier => (
                    <div
                      key={supplier.id}
                      className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-xl border-2 border-green-100"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-800">{supplier.name}</h3>
                            <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-mono font-bold">
                              {supplier.prefix}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                            {supplier.taxId && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <CreditCard size={16} />
                                <span>VKN: {supplier.taxId}</span>
                              </div>
                            )}
                            {supplier.city && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin size={16} />
                                <span>{supplier.city}</span>
                              </div>
                            )}
                            {supplier.contactPerson && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <User size={16} />
                                <span>{supplier.contactPerson}</span>
                              </div>
                            )}
                            {supplier.phone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone size={16} />
                                <span>{supplier.phone}</span>
                              </div>
                            )}
                          </div>
                          {supplier.materialTypes && (
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-bold">Sağladığı Hammaddeler:</span> {supplier.materialTypes}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg"
                            title="Düzenle"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Tedarikçi Adı *</label>
                  <input
                    required
                    className="input-field"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Örn: XYZ Kimya A.Ş."
                  />
                </div>
                
                <div>
                  <label className="label">Barkod Prefix (2 Harf) *</label>
                  <input
                    required
                    className="input-field uppercase"
                    value={formData.prefix}
                    onChange={e => setFormData({...formData, prefix: e.target.value.toUpperCase()})}
                    placeholder="Örn: TA, TB, TC"
                    maxLength="2"
                    pattern="[A-Z]{2}"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ⚠️ Bu prefix barkod oluşturmak için kullanılır. Benzersiz olmalıdır.
                  </p>
                </div>
                
                <div>
                  <label className="label">Vergi Kimlik No</label>
                  <input
                    className="input-field"
                    value={formData.taxId}
                    onChange={e => setFormData({...formData, taxId: e.target.value})}
                    placeholder="10 haneli VKN"
                    maxLength="10"
                  />
                </div>
                
                <div>
                  <label className="label">Şehir</label>
                  <input
                    className="input-field"
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    placeholder="Örn: İstanbul"
                  />
                </div>
                
                <div>
                  <label className="label">İletişim Kişisi</label>
                  <input
                    className="input-field"
                    value={formData.contactPerson}
                    onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                    placeholder="Yetkili kişi adı"
                  />
                </div>
                
                <div>
                  <label className="label">Telefon</label>
                  <input
                    className="input-field"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="0555 123 45 67"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="label">Sağladığı Hammadde Türleri</label>
                  <textarea
                    className="input-field"
                    rows="2"
                    value={formData.materialTypes}
                    onChange={e => setFormData({...formData, materialTypes: e.target.value})}
                    placeholder="Örn: PP Opak, Kuşe, PET-G vs."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ name: '', taxId: '', city: '', contactPerson: '', phone: '', prefix: '', materialTypes: '' });
                  }}
                  className="flex-1 btn-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {editingId ? 'Güncelleniyor...' : 'Kaydediliyor...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      {editingId ? 'Güncelle' : 'Kaydet'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}


// ==========================================================================================
// 📦 BOBİN GİRİŞİ MODALI (ADD RAW MATERIAL MODAL)
// ==========================================================================================

function AddRawMaterialModal({ onClose, suppliers, rawMaterialsList, onRefresh }) {
  const [formData, setFormData] = useState({
    supplierId: '',
    materialName: '',
    widthCM: '',
    originalLength: '',
    isJumbo: false
  });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
      if (!selectedSupplier) {
        alert('⚠️ Lütfen geçerli bir tedarikçi seçin!');
        setSaving(false);
        return;
      }

      // Otomatik barkod oluştur
      const barcode = await generateBarcode(
        formData.materialName,
        selectedSupplier.prefix,
        db,
        appId
      );

      const rollsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'stock_rolls');
      await addDoc(rollsCollection, {
        rollBarcode: barcode,
        materialName: formData.materialName,
        supplierName: selectedSupplier.name,
        supplierId: formData.supplierId,
        supplierPrefix: selectedSupplier.prefix,
        widthCM: parseFloat(formData.widthCM),
        originalLength: parseFloat(formData.originalLength),
        currentLength: parseFloat(formData.originalLength),
        isJumbo: formData.isJumbo,
        isDilim: false,
        reservationId: null,
        createdAt: new Date().toISOString(),
        status: 'available'
      });

      // Stok hareketi kaydet
      await logStockMovement(db, appId, {
        type: 'GIRIS',
        rollBarcode: barcode,
        materialName: formData.materialName,
        supplierName: selectedSupplier.name,
        quantity: parseFloat(formData.originalLength),
        unit: 'm',
        description: `Yeni bobin girişi - ${formData.isJumbo ? 'JUMBO' : 'Normal'}`,
        referenceType: 'BOBIN_GIRIS'
      });

      alert(`✅ Bobin başarıyla eklendi!\nBarkod: ${barcode}`);
      setFormData({ supplierId: '', materialName: '', widthCM: '', originalLength: '', isJumbo: false });
      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error('Bobin kaydetme hatası:', error);
      alert('❌ Hata: ' + error.message);
    }

    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-3">
            <PackagePlus className="text-white" size={28} />
            <h2 className="text-2xl font-bold text-white">Yeni Bobin Girişi</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Tedarikçi *</label>
            <select
              required
              className="input-field"
              value={formData.supplierId}
              onChange={e => setFormData({...formData, supplierId: e.target.value})}
            >
              <option value="">-- Tedarikçi Seçin --</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  [{supplier.prefix}] {supplier.name}
                </option>
              ))}
            </select>
            {suppliers.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                ⚠️ Önce tedarikçi kartı oluşturmalısınız!
              </p>
            )}
          </div>

          <div>
            <label className="label">Hammadde Adı *</label>
            {!showCustomInput ? (
              <div className="space-y-2">
                <select
                  required
                  className="input-field"
                  value={formData.materialName}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setShowCustomInput(true);
                      setFormData({...formData, materialName: ''});
                    } else {
                      setFormData({...formData, materialName: e.target.value});
                    }
                  }}
                >
                  <option value="">-- Hammadde Seçin --</option>
                  {rawMaterialsList && rawMaterialsList.map((mat, idx) => (
                    <option key={idx} value={mat}>{mat}</option>
                  ))}
                  <option value="__custom__">➕ Yeni Hammadde Ekle</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  required
                  className="input-field"
                  value={formData.materialName}
                  onChange={e => setFormData({...formData, materialName: e.target.value})}
                  placeholder="Yeni hammadde adı"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setFormData({...formData, materialName: ''});
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ← Listeden seç
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">En (cm) *</label>
              <input
                required
                type="number"
                step="0.1"
                className="input-field"
                value={formData.widthCM}
                onChange={e => setFormData({...formData, widthCM: e.target.value})}
                placeholder="Örn: 100"
              />
            </div>

            <div>
              <label className="label">Uzunluk (metre) *</label>
              <input
                required
                type="number"
                step="0.1"
                className="input-field"
                value={formData.originalLength}
                onChange={e => setFormData({...formData, originalLength: e.target.value})}
                placeholder="Örn: 5000"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-orange-50 p-4 rounded-xl border-2 border-orange-200">
            <input
              type="checkbox"
              id="isJumbo"
              checked={formData.isJumbo}
              onChange={e => setFormData({...formData, isJumbo: e.target.checked})}
              className="w-5 h-5 text-orange-600"
            />
            <label htmlFor="isJumbo" className="font-bold text-gray-700 cursor-pointer">
              Bu bir Jumbo Bobin (Dilimlenebilir)
            </label>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
            <p className="text-sm text-gray-700">
              <strong className="text-blue-700">ℹ️ Bilgi:</strong> Barkod otomatik oluşturulacaktır.
              Format: <code className="bg-white px-2 py-1 rounded font-mono text-xs">TEDARİKÇİ-HAMMADDE-XXXX</code>
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving || suppliers.length === 0}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Barcode size={20} />
                  Bobini Sisteme Ekle
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================================================================
// ✂️ BOBİN DİLİMLEME MODALI (SLICING MODAL)
// ==========================================================================================

function DilimlemeModal({ onClose, jumboRoll, onRefresh }) {
  const [dilimler, setDilimler] = useState([{ width: '', length: '' }]);
  const [saving, setSaving] = useState(false);

  const addDilim = () => {
    setDilimler([...dilimler, { width: '', length: jumboRoll.currentLength }]);
  };

  const removeDilim = (index) => {
    setDilimler(dilimler.filter((_, i) => i !== index));
  };

  const updateDilim = (index, field, value) => {
    const newDilimler = [...dilimler];
    newDilimler[index][field] = value;
    setDilimler(newDilimler);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasyon
    const totalWidth = dilimler.reduce((sum, d) => sum + parseFloat(d.width || 0), 0);
    if (totalWidth > jumboRoll.widthCM) {
      alert(`⚠️ Toplam en (${totalWidth} cm) orijinal bobin eninden (${jumboRoll.widthCM} cm) büyük olamaz!`);
      return;
    }

    setSaving(true);

    try {
      const rollsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'stock_rolls');
      
      // Orijinal bobini kapat
      const jumboDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'stock_rolls', jumboRoll.id);
      await updateDoc(jumboDocRef, {
        currentLength: 0,
        isDilim: true,
        status: 'sliced',
        slicedAt: new Date().toISOString()
      });

      // Yeni dilimleri oluştur
      for (let i = 0; i < dilimler.length; i++) {
        const dilim = dilimler[i];
        const newBarcode = await generateBarcode(
          jumboRoll.materialName,
          jumboRoll.supplierPrefix,
          db,
          appId
        );

        const newLength = parseFloat(dilim.length || jumboRoll.currentLength);

        await addDoc(rollsCollection, {
          rollBarcode: newBarcode,
          materialName: jumboRoll.materialName,
          supplierName: jumboRoll.supplierName,
          supplierId: jumboRoll.supplierId,
          supplierPrefix: jumboRoll.supplierPrefix,
          widthCM: parseFloat(dilim.width),
          originalLength: newLength,
          currentLength: newLength,
          isJumbo: false,
          isDilim: false,
          parentBarcode: jumboRoll.rollBarcode,
          reservationId: null,
          createdAt: new Date().toISOString(),
          status: 'available'
        });

        // Stok hareketi kaydet
        await logStockMovement(db, appId, {
          type: 'GIRIS',
          rollBarcode: newBarcode,
          materialName: jumboRoll.materialName,
          supplierName: jumboRoll.supplierName,
          quantity: newLength,
          unit: 'm',
          description: `${jumboRoll.rollBarcode} bobininden dilimlenme - ${parseFloat(dilim.width)} cm × ${newLength} m`,
          referenceType: 'DILIMLEME',
          referenceId: jumboRoll.id,
          parentBarcode: jumboRoll.rollBarcode
        });
      }

      alert(`✅ Bobin başarıyla ${dilimler.length} parçaya dilimlenmiş oldu!\n\nOrijinal: ${jumboRoll.rollBarcode}\nYeni dilimler oluşturuldu.`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error('Dilimleme hatası:', error);
      alert('❌ Hata: ' + error.message);
    }

    setSaving(false);
  };

  if (!jumboRoll) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Scissors className="text-white" size={28} />
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {jumboRoll.isJumbo ? 'Jumbo Bobin' : 'Bobin'} Dilimleme
                </h2>
                <p className="text-white text-sm opacity-90">
                  {jumboRoll.rollBarcode} - {jumboRoll.materialName}
                </p>
                {jumboRoll.parentBarcode && (
                  <p className="text-white text-xs opacity-75">
                    Ana Bobin: {jumboRoll.parentBarcode}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200 mb-6">
            <h3 className="font-bold text-gray-800 mb-2">Orijinal Bobin Bilgileri</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">En:</span>
                <p className="font-bold text-lg">{jumboRoll.widthCM} cm</p>
              </div>
              <div>
                <span className="text-gray-600">Uzunluk:</span>
                <p className="font-bold text-lg">{jumboRoll.currentLength} m</p>
              </div>
              <div>
                <span className="text-gray-600">Tedarikçi:</span>
                <p className="font-bold">{jumboRoll.supplierName}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Dilimlenen Parçalar</h3>
                <button
                  type="button"
                  onClick={addDilim}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  Dilim Ekle
                </button>
              </div>

              {dilimler.map((dilim, index) => (
                <div
                  key={index}
                  className="bg-white border-2 border-gray-200 p-4 rounded-xl flex items-center gap-3"
                >
                  <span className="font-bold text-purple-600 text-lg w-8">
                    {index + 1}.
                  </span>
                  
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">En (cm) *</label>
                      <input
                        required
                        type="number"
                        step="0.1"
                        className="input-field"
                        value={dilim.width}
                        onChange={e => updateDilim(index, 'width', e.target.value)}
                        placeholder="Örn: 50"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Uzunluk (m)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input-field"
                        value={dilim.length}
                        onChange={e => updateDilim(index, 'length', e.target.value)}
                        placeholder={`Varsayılan: ${jumboRoll.currentLength}`}
                      />
                    </div>
                  </div>

                  {dilimler.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDilim(index)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200 mb-6">
              <p className="text-sm text-gray-700">
                <strong className="text-yellow-700">⚠️ Uyarı:</strong> Bu işlem geri alınamaz! 
                <br />
                • Orijinal bobin ({jumboRoll.widthCM} cm × {jumboRoll.currentLength} m) kapatılacak
                <br />
                • {dilimler.length} adet yeni bobin oluşturulacak
                <br />
                • Her yeni bobin için benzersiz barkod otomatik oluşturulacak
                <br />
                {jumboRoll.isJumbo ? (
                  <span>• Jumbo bobin dilimlenecek</span>
                ) : (
                  <span>• Daha önce dilimlenmiş bobin tekrar dilimlenecek (Ana bobin: {jumboRoll.parentBarcode || jumboRoll.rollBarcode})</span>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Dilimleniyor...
                  </>
                ) : (
                  <>
                    <Scissors size={20} />
                    Dilimlemeyi Tamamla ({dilimler.length} Parça)
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// ==========================================================================================
// ✏️ BOBİN DÜZENLEME MODALI (EDIT STOCK ROLL)
// ==========================================================================================

function EditStockRollModal({ onClose, roll, suppliers, onRefresh }) {
  const [formData, setFormData] = useState({
    widthCM: roll?.widthCM || '',
    currentLength: roll?.currentLength || '',
    originalLength: roll?.originalLength || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'stock_rolls', roll.id),
        {
          widthCM: parseFloat(formData.widthCM),
          currentLength: parseFloat(formData.currentLength),
          originalLength: parseFloat(formData.originalLength),
          updatedAt: new Date().toISOString()
        }
      );

      alert('✅ Bobin bilgileri güncellendi!');
      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error('Bobin güncelleme hatası:', error);
      alert('❌ Hata: ' + error.message);
    }

    setSaving(false);
  };

  if (!roll) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Edit3 className="text-white" size={28} />
              <div>
                <h2 className="text-2xl font-bold text-white">Bobin Düzenle</h2>
                <p className="text-white text-sm opacity-90">
                  {roll.rollBarcode} - {roll.materialName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200 mb-4">
            <p className="text-sm text-gray-700">
              <strong className="text-yellow-700">⚠️ Dikkat:</strong> Bu işlem bobin bilgilerini değiştirecektir. 
              Barkod, hammadde adı ve tedarikçi değiştirilemez.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">En (cm) *</label>
              <input
                required
                type="number"
                step="0.1"
                className="input-field"
                value={formData.widthCM}
                onChange={e => setFormData({...formData, widthCM: e.target.value})}
              />
            </div>

            <div>
              <label className="label">Mevcut Uzunluk (m) *</label>
              <input
                required
                type="number"
                step="0.1"
                className="input-field"
                value={formData.currentLength}
                onChange={e => setFormData({...formData, currentLength: e.target.value})}
              />
            </div>

            <div>
              <label className="label">Orijinal Uzunluk (m) *</label>
              <input
                required
                type="number"
                step="0.1"
                className="input-field"
                value={formData.originalLength}
                onChange={e => setFormData({...formData, originalLength: e.target.value})}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Barkod:</span>
                <p className="font-bold font-mono">{roll.rollBarcode}</p>
              </div>
              <div>
                <span className="text-gray-600">Hammadde:</span>
                <p className="font-bold">{roll.materialName}</p>
              </div>
              <div>
                <span className="text-gray-600">Tedarikçi:</span>
                <p className="font-bold">{roll.supplierName}</p>
              </div>
              <div>
                <span className="text-gray-600">Durum:</span>
                <p className="font-bold">
                  {roll.reservationId ? '⚠️ Rezerve' : roll.isJumbo ? 'Jumbo' : 'Normal'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Güncelleniyor...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Güncelle
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




// ChangePasswordModal and AttachmentManager now imported from components/shared

// ============================================================================
// 🧮 BUSINESS LOGIC (Now imported from utils)
// ============================================================================

// ============================================================================
// 📦 MARKETING DASHBOARD (FULL FEATURED)

// ============================================================================
// 📦 MARKETING & GRAPHICS DASHBOARDS - Now imported from separate components
// ============================================================================

// ============================================================================
// 🏭 WAREHOUSE DASHBOARD (FULL FEATURED WITH WASTE CALCULATION)
// ============================================================================

function WarehouseDashboard({ orders, isSuperAdmin, supplierCards, stockRolls, stockMovements }) {
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
  
  const [activeTab, setActiveTab] = useState('raw');
  const [listMode, setListMode] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showAddRollModal, setShowAddRollModal] = useState(false);
  const [showDilimModal, setShowDilimModal] = useState(false);
  const [selectedJumboRoll, setSelectedJumboRoll] = useState(null);
  const [showStockTab, setShowStockTab] = useState(false);
  const [showStockMovements, setShowStockMovements] = useState(false);
  const [editingRoll, setEditingRoll] = useState(null);
  const [showEditRollModal, setShowEditRollModal] = useState(false);
  const [wData, setWData] = useState({
    materialStatus: '',
    slittingDate: '',
    shippingStatus: '',
    wastageRate: 0,
    issuedMeterage: 0
  });

  const activeOrder = selectedOrder ? (orders.find(o => o.id === selectedOrder.id) || selectedOrder) : null;

  // Filter by search
  const filterOrders = (orderList) => {
    if (!searchQuery) return orderList;
    return orderList.filter(order => 
      order.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const rawPending = filterOrders(orders.filter(o => 
    o.status === 'warehouse_raw_pending' || 
    o.status === 'warehouse_processing' || 
    ((o.status === 'planning_pending' || o.status === 'planned') && 
      o.warehouseData?.materialStatus === 'Dilimleme Aşamasında')
  ));
  
  const shippingPending = filterOrders(orders.filter(o => o.status === 'shipping_ready'));
  const currentList = listMode === 'all' ? filterOrders(orders) : (activeTab === 'raw' ? rawPending : shippingPending);

  useEffect(() => {
    if (selectedOrder && selectedOrder.warehouseData) {
      setWData({
        materialStatus: selectedOrder.warehouseData.materialStatus || '',
        slittingDate: selectedOrder.warehouseData.slittingDate || '',
        shippingStatus: selectedOrder.warehouseData.shippingStatus || '',
        wastageRate: selectedOrder.warehouseData.wastageRate || 0,
        issuedMeterage: selectedOrder.warehouseData.issuedMeterage || 0
      });
    } else {
      setWData({
        materialStatus: '',
        slittingDate: '',
        shippingStatus: '',
        wastageRate: 0,
        issuedMeterage: 0
      });
    }
  }, [selectedOrder]);

  // Auto-calculate issued meterage when wastage rate changes
  useEffect(() => {
    if (selectedOrder && selectedOrder.graphicsData?.meterage && activeTab === 'raw') {
      const rawMeterageStr = selectedOrder.graphicsData.meterage;
      const theoretical = parseFloat(rawMeterageStr.replace(/[^0-9.]/g, '')) || 0;
      const rate = parseFloat(wData.wastageRate) || 0;
      const totalIssued = Math.ceil(theoretical * (1 + rate / 100));
      
      setWData(prev => ({
        ...prev,
        issuedMeterage: totalIssued
      }));
    }
  }, [wData.wastageRate, selectedOrder?.graphicsData?.meterage, activeTab]);

  const handleDeleteRoll = async (rollId) => {
    if (!window.confirm('Bu bobini silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stock_rolls', rollId));
      alert('✅ Bobin silindi!');
    } catch (error) {
      console.error('Bobin silme hatası:', error);
      alert('❌ Hata: ' + error.message);
    }
  };

  const handleEditRoll = (roll) => {
    setEditingRoll(roll);
    setShowEditRollModal(true);
  };

  const handleRawMaterialSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      let updatePayload = {
        warehouseData: {
          ...selectedOrder.warehouseData,
          materialStatus: wData.materialStatus,
          slittingDate: wData.materialStatus === 'Dilimleme Aşamasında' ? wData.slittingDate : null,
          wastageRate: wData.wastageRate,
          issuedMeterage: wData.issuedMeterage
        }
      };

      if (listMode === 'pending') {
        let nextStatus = selectedOrder.status;
        if (selectedOrder.status === 'warehouse_raw_pending' || 
            selectedOrder.status === 'warehouse_processing' || 
            selectedOrder.status === 'planning_pending') {
          if (wData.materialStatus === 'Hazır' || wData.materialStatus === 'Dilimleme Aşamasında') {
            nextStatus = 'planning_pending';
          } else {
            nextStatus = 'warehouse_processing';
          }
        }
        updatePayload.status = nextStatus;
      } else {
        updatePayload.revisionAlert = "Depo (Hammadde) tarafından güncellendi";
      }

      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id),
        updatePayload
      );
      setSelectedOrder(null);
      setWData({
        materialStatus: '',
        slittingDate: '',
        shippingStatus: '',
        wastageRate: 0,
        issuedMeterage: 0
      });
    } catch (error) {
      console.error("Warehouse save error:", error);
      alert("Kayıt hatası: " + error.message);
    }
    setIsSaving(false);
  };

  const handleShippingSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      let updatePayload = {
        'warehouseData.shippingStatus': wData.shippingStatus,
        ...(listMode === 'pending' 
          ? { status: wData.shippingStatus === 'Sevk Edildi' ? 'completed' : 'shipping_ready' } 
          : { revisionAlert: "Depo (Sevkiyat) tarafından güncellendi" })
      };
      
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id),
        updatePayload
      );
      setSelectedOrder(null);
      setWData({
        materialStatus: '',
        slittingDate: '',
        shippingStatus: '',
        wastageRate: 0,
        issuedMeterage: 0
      });
    } catch (error) {
      console.error("Shipping save error:", error);
      alert("Kayıt hatası: " + error.message);
    }
    setIsSaving(false);
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("DİKKAT: Bu siparişi kalıcı olarak silmek üzeresiniz.")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
        if (selectedOrder?.id === orderId) setSelectedOrder(null);
      } catch (error) {
        alert("Silme hatası.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {showSupplierModal && (
        <SupplierCardModal
          onClose={() => setShowSupplierModal(false)}
          suppliers={supplierCards || []}
          onRefresh={() => {}}
        />
      )}
      
      {showAddRollModal && (
        <AddRawMaterialModal
          onClose={() => setShowAddRollModal(false)}
          suppliers={supplierCards || []}
          rawMaterialsList={rawMaterials}
          onRefresh={() => {}}
        />
      )}
      
      {showDilimModal && selectedJumboRoll && (
        <DilimlemeModal
          onClose={() => {
            setShowDilimModal(false);
            setSelectedJumboRoll(null);
          }}
          jumboRoll={selectedJumboRoll}
          onRefresh={() => {}}
        />
      )}
      
      {showEditRollModal && editingRoll && (
        <EditStockRollModal
          onClose={() => {
            setShowEditRollModal(false);
            setEditingRoll(null);
          }}
          roll={editingRoll}
          suppliers={supplierCards || []}
          onRefresh={() => {}}
        />
      )}

      {/* Header with Action Buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Depo Yönetimi
          </h2>
          <p className="text-gray-600 mt-1">Hammadde, Stok ve Sevkiyat İşlemleri</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowStockTab(!showStockTab);
              setShowStockMovements(false);
            }}
            className={`px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 ${
              showStockTab && !showStockMovements
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-200'
            }`}
          >
            <Database size={18} />
            Stok Yönetimi
          </button>
          
          <button
            onClick={() => {
              setShowStockMovements(!showStockMovements);
              setShowStockTab(false);
            }}
            className={`px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 ${
              showStockMovements
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-200'
            }`}
          >
            <BarChart3 size={18} />
            Stok Hareketleri
          </button>
          
          <button
            onClick={() => setShowSupplierModal(true)}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2"
          >
            <Truck size={18} />
            Tedarikçiler
          </button>
          
          <button
            onClick={() => setShowAddRollModal(true)}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2"
          >
            <PackagePlus size={18} />
            Bobin Girişi
          </button>
        </div>
      </div>

      {showStockTab ? (
        <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800">Bobin Stok Listesi</h3>
            <div className="text-sm text-gray-600">
              Toplam: <span className="font-bold text-lg">{stockRolls?.length || 0}</span> bobin
            </div>
          </div>
          
          {(!stockRolls || stockRolls.length === 0) ? (
            <div className="text-center py-16 text-gray-400">
              <Package size={80} className="mx-auto mb-4 opacity-30" />
              <p className="text-xl">Henüz bobin girişi yapılmamış</p>
              <p className="text-sm mt-2">Yukarıdaki &quot;Bobin Girişi&quot; butonuna tıklayarak başlayın</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-200">
                  <tr>
                    <th className="p-3 text-left font-bold">Barkod</th>
                    <th className="p-3 text-left font-bold">Hammadde</th>
                    <th className="p-3 text-left font-bold">Tedarikçi</th>
                    <th className="p-3 text-center font-bold">En (cm)</th>
                    <th className="p-3 text-center font-bold">Uzunluk (m)</th>
                    <th className="p-3 text-center font-bold">m²</th>
                    <th className="p-3 text-center font-bold">Durum</th>
                    <th className="p-3 text-center font-bold">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRolls.map(roll => (
                    <tr key={roll.id} className="border-b border-gray-100 hover:bg-orange-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Barcode size={16} className="text-orange-600" />
                          <span className="font-mono font-bold">{roll.rollBarcode}</span>
                        </div>
                      </td>
                      <td className="p-3">{roll.materialName}</td>
                      <td className="p-3">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                          {roll.supplierPrefix}
                        </span> {roll.supplierName}
                      </td>
                      <td className="p-3 text-center font-bold">{roll.widthCM}</td>
                      <td className="p-3 text-center">
                        <span className={`font-bold ${roll.currentLength === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {roll.currentLength}
                        </span>
                        <span className="text-gray-400 text-xs"> / {roll.originalLength}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-blue-600">
                          {((roll.widthCM / 100) * roll.currentLength).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {roll.isDilim ? (
                          <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">Dilimlenmiş</span>
                        ) : roll.reservationId ? (
                          <div className="space-y-1">
                            <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs font-bold block">
                              ⚠️ Rezerve
                            </span>
                            {roll.reservedOrderNo && (
                              <span className="text-[10px] text-gray-600 block">
                                {roll.reservedOrderNo}
                              </span>
                            )}
                          </div>
                        ) : roll.currentLength === 0 ? (
                          <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs">Tükendi</span>
                        ) : roll.isJumbo ? (
                          <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs font-bold">JUMBO</span>
                        ) : (
                          <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">Mevcut</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-center">
                          {!roll.isDilim && roll.currentLength > 0 && !roll.reservationId && (
                            <button
                              onClick={() => {
                                setSelectedJumboRoll(roll);
                                setShowDilimModal(true);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                              title="Dilimle"
                            >
                              <Scissors size={14} />
                              {roll.isJumbo ? 'Jumbo' : 'Dilim'}
                            </button>
                          )}
                          <button
                            onClick={() => handleEditRoll(roll)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg text-xs"
                            title="Düzenle"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRoll(roll.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-xs"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : showStockMovements ? (
        <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 size={28} className="text-indigo-600" />
                Stok Hareketleri
              </h3>
              <p className="text-sm text-gray-600 mt-1">Tüm giriş, çıkış ve rezervasyon işlemleri</p>
            </div>
            <div className="text-sm text-gray-600">
              Toplam: <span className="font-bold text-lg">{stockMovements?.length || 0}</span> hareket
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-3 rounded-lg">
                  <PackagePlus size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">Toplam Giriş</p>
                  <p className="text-2xl font-bold text-green-900">
                    {stockMovements?.filter(m => m.type === 'GIRIS').length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border-2 border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500 p-3 rounded-lg">
                  <AlertCircle size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Rezervasyonlar</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {stockMovements?.filter(m => m.type === 'REZERVE').length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border-2 border-red-200">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-3 rounded-lg">
                  <Truck size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-red-700 font-medium">Sarfiyat</p>
                  <p className="text-2xl font-bold text-red-900">
                    {stockMovements?.filter(m => m.type === 'SARFIYAT').length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <Calculator size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">Toplam Metraj</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {(stockMovements?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0).toFixed(0)} m
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hareketler Listesi */}
          {(!stockMovements || stockMovements.length === 0) ? (
            <div className="text-center py-16 text-gray-400">
              <BarChart3 size={80} className="mx-auto mb-4 opacity-30" />
              <p className="text-xl">Henüz stok hareketi yok</p>
              <p className="text-sm mt-2">Bobin girişi, rezervasyon veya üretim işlemleri yapıldığında burada görünecek</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b-2 border-indigo-200">
                  <tr>
                    <th className="p-3 text-left font-bold">Tarih/Saat</th>
                    <th className="p-3 text-left font-bold">Tip</th>
                    <th className="p-3 text-left font-bold">Barkod</th>
                    <th className="p-3 text-left font-bold">Hammadde</th>
                    <th className="p-3 text-center font-bold">Miktar</th>
                    <th className="p-3 text-left font-bold">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.map(movement => {
                    const movementDate = new Date(movement.createdAt);
                    const typeColors = {
                      'GIRIS': 'bg-green-100 text-green-800',
                      'REZERVE': 'bg-yellow-100 text-yellow-800',
                      'SARFIYAT': 'bg-red-100 text-red-800'
                    };
                    
                    return (
                      <tr key={movement.id} className="border-b border-gray-100 hover:bg-indigo-50">
                        <td className="p-3">
                          <div className="text-xs text-gray-600">
                            {movementDate.toLocaleDateString('tr-TR')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {movementDate.toLocaleTimeString('tr-TR')}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${typeColors[movement.type] || 'bg-gray-100 text-gray-800'}`}>
                            {movement.type}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-xs">{movement.rollBarcode}</span>
                        </td>
                        <td className="p-3 text-xs">{movement.materialName}</td>
                        <td className="p-3 text-center">
                          <span className="font-bold">{movement.quantity}</span>
                          <span className="text-gray-500 ml-1">{movement.unit}</span>
                        </td>
                        <td className="p-3 text-xs text-gray-600">
                          {movement.description}
                          {movement.orderNo && (
                            <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px]">
                              {movement.orderNo}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-xl shadow-md border-2 border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Sipariş No, Ürün Adı veya Firma Adına Göre Ara..."
            className="input-field pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-gray-200 pb-4">
        <div className="flex space-x-4 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('raw');
              setSelectedOrder(null);
            }}
            className={`pb-3 px-6 font-bold whitespace-nowrap transition-all relative ${
              activeTab === 'raw'
                ? 'text-indigo-600 border-b-4 border-indigo-600'
                : 'text-gray-500 hover:text-indigo-500 border-b-4 border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <Archive size={20} />
              <span>Hammadde Girişi</span>
            </div>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('shipping');
              setSelectedOrder(null);
            }}
            className={`pb-3 px-6 font-bold whitespace-nowrap transition-all relative ${
              activeTab === 'shipping'
                ? 'text-green-600 border-b-4 border-green-600'
                : 'text-gray-500 hover:text-green-500 border-b-4 border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <Truck size={20} />
              <span>Sevkiyat Yönetimi</span>
            </div>
          </button>
        </div>

        <div className="flex bg-white rounded-lg border-2 border-gray-200 p-1 shadow-sm">
          <button
            onClick={() => setListMode('pending')}
            className={`px-4 py-2 text-xs font-bold rounded transition-all ${
              listMode === 'pending'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Bekleyenler
          </button>
          <button
            onClick={() => setListMode('all')}
            className={`px-4 py-2 text-xs font-bold rounded transition-all ${
              listMode === 'all'
                ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Tüm İşler / Düzeltme
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Order List */}
        <div className="lg:col-span-1 space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2 mb-4">
            {activeTab === 'raw' ? (
              <>
                <Archive size={20} className="text-indigo-500" />
                <span>Hammadde İşlemleri</span>
              </>
            ) : (
              <>
                <Truck size={20} className="text-green-500" />
                <span>Sevkiyat İşlemleri</span>
              </>
            )}
            <span className="ml-auto text-sm bg-gray-100 px-3 py-1 rounded-full">
              {currentList.length}
            </span>
          </h3>

          {currentList.map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative group ${
                selectedOrder?.id === order.id
                  ? activeTab === 'raw'
                    ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-400 shadow-lg ring-2 ring-indigo-300'
                    : 'bg-gradient-to-r from-green-50 to-green-100 border-green-400 shadow-lg ring-2 ring-green-300'
                  : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              {isSuperAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOrder(order.id);
                  }}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Sil"
                >
                  <Trash2 size={16} />
                </button>
              )}

              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-800">{order.orderNo}</span>
                {order.warehouseData?.materialStatus && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    order.warehouseData.materialStatus === 'Dilimleme Aşamasında'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {order.warehouseData.materialStatus}
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-600 mb-1">{order.customer}</div>
              <div className="text-xs text-gray-500 mb-2">{order.product}</div>

              <div className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-bold mb-2">
                ⏰ Termin: {order.customerDeadline}
              </div>

              {/* Graphics Data Summary */}
              {order.graphicsData && (
                <div className="text-[10px] text-gray-500 space-y-1 border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span>Hammadde:</span>
                    <span className="font-bold text-gray-700">
                      {order.rawMaterial?.substring(0, 20)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kağıt Eni:</span>
                    <span className="font-bold text-indigo-700">
                      {order.graphicsData.paperWidth}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metraj (Net):</span>
                    <span className="font-bold text-indigo-700">
                      {order.graphicsData.meterage}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {currentList.length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-300">
              {activeTab === 'raw' ? <Archive size={48} className="mx-auto mb-3 opacity-20" /> : <Truck size={48} className="mx-auto mb-3 opacity-20" />}
              <p className="text-sm">Kayıt yok</p>
            </div>
          )}
        </div>

        {/* Right Panel - Warehouse Operations */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-gray-100 animate-slide-in">
              {/* Order Header */}
              <div className={`${activeTab === 'raw' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : 'bg-gradient-to-r from-green-500 to-green-600'} text-white p-6 rounded-xl shadow-lg mb-6 -mx-8 -mt-8`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{selectedOrder.orderNo}</h2>
                    <p className="text-white/90">{selectedOrder.customer} - {selectedOrder.product}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/70 uppercase tracking-wider mb-1">Termin</div>
                    <div className="text-xl font-bold">{selectedOrder.customerDeadline}</div>
                  </div>
                </div>
              </div>

              {/* Graphics Data Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl mb-6 border-2 border-blue-100">
                <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Settings size={16} />
                  Grafikten Gelen Veriler
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Hammadde</div>
                    <div className="font-bold text-gray-800 text-sm">
                      {selectedOrder.rawMaterial}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Kağıt Eni</div>
                    <div className="font-bold text-indigo-700 text-lg">
                      {selectedOrder.graphicsData?.paperWidth}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Net Metraj</div>
                    <div className="font-bold text-indigo-700 text-lg">
                      {selectedOrder.graphicsData?.meterage}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="mb-6">
                <AttachmentManager order={activeOrder} compact={true} />
              </div>

              {/* Forms */}
              {activeTab === 'raw' ? (
                <form onSubmit={handleRawMaterialSave} className="space-y-6">
                  <h4 className="font-bold text-xl text-indigo-600 flex items-center gap-2 border-b-2 border-indigo-100 pb-3">
                    <ClipboardCheck size={22} />
                    Hammadde Hazırlık & Fire Planı
                  </h4>

                  {/* Material Status */}
                  <div>
                    <label className="label">Hammadde Durumu</label>
                    <select
                      required
                      className="input-field"
                      value={wData.materialStatus}
                      onChange={e => setWData({ ...wData, materialStatus: e.target.value })}
                    >
                      <option value="">Seçiniz...</option>
                      <option>Stokta Yok</option>
                      <option>Hazır</option>
                      <option>Tedarik Ediliyor</option>
                      <option>Dilimleme Aşamasında</option>
                    </select>
                  </div>

                  {/* 📦 BOBIN REZERVASYON SİSTEMİ */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200">
                    <div className="flex items-center gap-3 mb-4">
                      <PackageCheck size={24} className="text-purple-600" />
                      <div>
                        <h4 className="text-lg font-bold text-purple-900">Bobin Rezervasyonu</h4>
                        <p className="text-xs text-purple-700">
                          Bu sipariş için hammadde bobini tahsis edin
                        </p>
                      </div>
                    </div>

                    {selectedOrder.rawMaterial && stockRolls && stockRolls.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-700">
                          <strong>Aranan Hammadde:</strong> {selectedOrder.rawMaterial}
                        </p>
                        
                        {/* Rezerve Edilmiş Bobinler */}
                        {selectedOrder.warehouseData?.reservedRolls && selectedOrder.warehouseData.reservedRolls.length > 0 && (
                          <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                            <h5 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                              <CheckCircle size={16} />
                              Rezerve Edilmiş Bobinler
                            </h5>
                            {selectedOrder.warehouseData.reservedRolls.map((res, idx) => (
                              <div key={idx} className="text-sm text-green-700 flex justify-between items-center mb-1">
                                <span>🏷️ {res.rollBarcode}</span>
                                <span className="font-bold">{res.reservedLength} m</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Mevcut Bobinler */}
                        <div className="space-y-2">
                          <h5 className="font-bold text-gray-800 text-sm">
                            Mevcut Bobinler: 
                            <span className="text-xs text-gray-500 ml-2">
                              (Toplam {stockRolls.filter(r => !r.isDilim && r.currentLength > 0 && !r.reservationId).length} bobin)
                            </span>
                          </h5>
                          {stockRolls
                            .filter(roll => {
                              // Temel filtreler
                              if (roll.isDilim || roll.currentLength <= 0 || roll.reservationId) {
                                return false;
                              }
                              
                              // Hammadde eşleşmesi (daha esnek)
                              const orderMaterial = (selectedOrder.rawMaterial || '').toLowerCase().trim();
                              const rollMaterial = (roll.materialName || '').toLowerCase().trim();
                              
                              // Tam eşleşme veya içerme kontrolü
                              return !orderMaterial || rollMaterial.includes(orderMaterial) || orderMaterial.includes(rollMaterial);
                            })
                            .sort((a, b) => b.currentLength - a.currentLength)
                            .map(roll => (
                              <div key={roll.id} className="bg-white p-3 rounded-lg border border-purple-200 flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="font-mono text-sm font-bold text-purple-700">{roll.rollBarcode}</div>
                                  <div className="text-xs text-gray-600">
                                    {roll.widthCM} cm × {roll.currentLength} m - {roll.supplierName}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const length = prompt(`Bu bobinden kaç metre rezerve edilsin?\n\nMevcut: ${roll.currentLength} m`);
                                    if (length && !isNaN(length) && parseFloat(length) > 0 && parseFloat(length) <= roll.currentLength) {
                                      try {
                                        // Mevcut warehouseData'yı al veya yeni oluştur
                                        const currentWarehouseData = selectedOrder.warehouseData || {};
                                        const reservedRolls = currentWarehouseData.reservedRolls || [];
                                        
                                        // Yeni rezervasyonu ekle
                                        const newReservation = {
                                          rollBarcode: roll.rollBarcode,
                                          rollId: roll.id,
                                          reservedLength: parseFloat(length),
                                          reservedAt: new Date().toISOString()
                                        };
                                        
                                        reservedRolls.push(newReservation);
                                        
                                        // warehouseData'yı tamamen güncelle
                                        const updatedWarehouseData = {
                                          ...currentWarehouseData,
                                          reservedRolls: reservedRolls
                                        };

                                        // Order'ı güncelle
                                        await updateDoc(
                                          doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id),
                                          { warehouseData: updatedWarehouseData }
                                        );

                                        // Bobini rezerve et VE kalan metrajı güncelle
                                        const reservedLength = parseFloat(length);
                                        const newCurrentLength = roll.currentLength - reservedLength;
                                        
                                        await updateDoc(
                                          doc(db, 'artifacts', appId, 'public', 'data', 'stock_rolls', roll.id),
                                          { 
                                            currentLength: Math.max(0, newCurrentLength), // Negatif olmasını önle
                                            reservationId: selectedOrder.id,
                                            reservedAt: new Date().toISOString(),
                                            reservedOrderNo: selectedOrder.orderNo,
                                            reservedLength: reservedLength
                                          }
                                        );

                                        // Stok hareketi kaydet
                                        await logStockMovement(db, appId, {
                                          type: 'REZERVE',
                                          rollBarcode: roll.rollBarcode,
                                          materialName: roll.materialName,
                                          supplierName: roll.supplierName,
                                          quantity: reservedLength,
                                          unit: 'm',
                                          description: `Sipariş rezervasyonu - ${selectedOrder.orderNo}`,
                                          referenceType: 'REZERVASYON',
                                          referenceId: selectedOrder.id,
                                          orderNo: selectedOrder.orderNo
                                        });

                                        alert(`✅ Bobin rezerve edildi!\n\nBarkod: ${roll.rollBarcode}\nRezerve: ${length} m\nKalan: ${newCurrentLength} m`);
                                        
                                        // Sayfayı yenile
                                        window.location.reload();
                                      } catch (error) {
                                        console.error('Rezervasyon hatası:', error);
                                        alert('❌ Hata: ' + error.message);
                                      }
                                    } else if (length) {
                                      alert('⚠️ Geçersiz miktar! Lütfen mevcut stoktan az veya eşit bir değer girin.');
                                    }
                                  }}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                                >
                                  Rezerve Et
                                </button>
                              </div>
                            ))}
                          
                          {stockRolls.filter(roll => {
                            if (roll.isDilim || roll.currentLength <= 0 || roll.reservationId) return false;
                            const orderMaterial = (selectedOrder.rawMaterial || '').toLowerCase().trim();
                            const rollMaterial = (roll.materialName || '').toLowerCase().trim();
                            return !orderMaterial || rollMaterial.includes(orderMaterial) || orderMaterial.includes(rollMaterial);
                          }).length === 0 && (
                            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200 text-center">
                              <p className="text-sm text-yellow-700">
                                ⚠️ Uygun bobin bulunamadı. 
                                <br />
                                <span className="text-xs">
                                  Hammadde: "{selectedOrder.rawMaterial}"
                                  <br />
                                  Lütfen yukarıdaki "Bobin Girişi" butonundan yeni bobin ekleyin.
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Package size={48} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Stok yok veya hammadde bilgisi eksik</p>
                        <p className="text-xs mt-2">Önce "Bobin Girişi" yapın</p>
                      </div>
                    )}
                  </div>

                  {/* 🔥 FIRE CALCULATION SECTION - HIGHLIGHT FEATURE */}
                  <div className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-6 rounded-2xl border-3 border-orange-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl shadow-md">
                        <Calculator size={24} className="text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-orange-900">
                          Fire Hesaplama Sistemi
                        </h4>
                        <p className="text-xs text-orange-700">
                          Üretime gönderilecek toplam metrajı hesaplayın
                        </p>
                      </div>
                    </div>

                    {/* Visual Flow Diagram */}
                    <div className="grid grid-cols-5 gap-2 items-center mb-6">
                      <div className="col-span-2 bg-white p-4 rounded-xl border-2 border-blue-300 text-center">
                        <div className="text-[10px] text-blue-600 font-bold uppercase mb-1">
                          Grafik Net Metraj
                        </div>
                        <div className="text-2xl font-bold text-blue-700">
                          {selectedOrder.graphicsData?.meterage?.replace(' mt', '') || '0'} mt
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <Plus size={20} className="text-orange-500 font-bold" />
                      </div>

                      <div className="col-span-2 bg-white p-4 rounded-xl border-2 border-green-300 text-center">
                        <div className="text-[10px] text-green-600 font-bold uppercase mb-1">
                          Depodan Çıkacak (Fire Dahil)
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          {wData.issuedMeterage} mt
                        </div>
                      </div>
                    </div>

                    {/* Fire Rate Input */}
                    <div className="bg-white p-5 rounded-xl border-2 border-orange-300">
                      <label className="label text-orange-800 font-bold flex items-center gap-2 mb-3">
                        <AlertTriangle size={18} />
                        Fire Oranı Belirleyin (%)
                      </label>

                      <div className="flex gap-4 items-center">
                        {/* Slider */}
                        <input
                          type="range"
                          min="0"
                          max="30"
                          step="1"
                          className="flex-1 h-3 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-full appearance-none cursor-pointer"
                          value={wData.wastageRate}
                          onChange={e => setWData({ ...wData, wastageRate: parseFloat(e.target.value) })}
                          style={{
                            background: `linear-gradient(to right, #86efac 0%, #fef08a ${(wData.wastageRate / 30) * 100}%, #fca5a5 100%)`
                          }}
                        />

                        {/* Number Input */}
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            step="0.5"
                            className="input-field pr-8 text-center font-bold text-lg"
                            value={wData.wastageRate}
                            onChange={e => setWData({ ...wData, wastageRate: parseFloat(e.target.value) || 0 })}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-600 font-bold">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Quick Select Buttons */}
                      <div className="flex gap-2 mt-4">
                        <span className="text-xs text-gray-600 font-bold">Hızlı Seçim:</span>
                        {[5, 10, 15, 20].map(rate => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setWData({ ...wData, wastageRate: rate })}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              wData.wastageRate === rate
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50'
                            }`}
                          >
                            %{rate}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculation Breakdown */}
                    <div className="mt-5 bg-white p-4 rounded-xl border-2 border-dashed border-orange-300">
                      <div className="text-xs font-bold text-orange-800 mb-3 uppercase tracking-wide">
                        📊 Hesaplama Detayı
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Net İhtiyaç:</span>
                          <span className="font-bold">
                            {selectedOrder.graphicsData?.meterage?.replace(' mt', '') || '0'} mt
                          </span>
                        </div>
                        <div className="flex justify-between text-orange-600">
                          <span>Fire Payı ({wData.wastageRate}%):</span>
                          <span className="font-bold">
                            +{Math.ceil((parseFloat(selectedOrder.graphicsData?.meterage?.replace(/[^0-9.]/g, '')) || 0) * (wData.wastageRate / 100))} mt
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t-2 border-orange-200 text-lg font-bold text-green-700">
                          <span>Üretime Verilecek:</span>
                          <span>{wData.issuedMeterage} mt</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                      <p className="text-xs text-yellow-800 italic">
                        💡 <strong>Not:</strong> Fire oranı, üretim sürecinde oluşabilecek kayıpları karşılamak için net metraj üzerine eklenir. Önerilen: %10-15
                      </p>
                    </div>
                  </div>

                  {/* Slitting Date (Conditional) */}
                  {wData.materialStatus === 'Dilimleme Aşamasında' && (
                    <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200 animate-in slide-in-from-top-2">
                      <label className="label text-yellow-800 font-bold">
                        Dilimleme Tarihi Belirtin
                      </label>
                      <input
                        required
                        type="date"
                        className="input-field border-yellow-300 focus:ring-yellow-500"
                        value={wData.slittingDate}
                        onChange={e => setWData({ ...wData, slittingDate: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    disabled={isSaving}
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={24} />
                        {listMode === 'all' ? 'Düzeltmeyi Kaydet' : 'Durumu Kaydet / Planlamaya İlet'}
                      </>
                    )}
                  </button>
                </form>
              ) : (
                // Shipping Form
                <form onSubmit={handleShippingSave} className="space-y-6">
                  <h4 className="font-bold text-xl text-green-600 flex items-center gap-2 border-b-2 border-green-100 pb-3">
                    <Truck size={22} />
                    Sevkiyat İşlemi
                  </h4>

                  <div>
                    <label className="label">Sevkiyat Durumu</label>
                    <select
                      required
                      className="input-field"
                      value={wData.shippingStatus}
                      onChange={e => setWData({ ...wData, shippingStatus: e.target.value })}
                    >
                      <option value="">Seçiniz...</option>
                      <option>Sevk Bekliyor</option>
                      <option>Sevk Edildi</option>
                    </select>
                  </div>

                  <button
                    disabled={isSaving}
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={24} />
                        {listMode === 'all' ? 'Düzeltmeyi Kaydet' : 'Sevkiyat Durumunu Güncelle'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-white p-16 rounded-2xl shadow-xl border-2 border-dashed border-gray-300 text-center">
              <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                {activeTab === 'raw' ? (
                  <Archive size={48} className="text-indigo-600" />
                ) : (
                  <Truck size={48} className="text-green-600" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                İşlem yapmak için sipariş seçin
              </h3>
              <p className="text-gray-500">
                Soldan bir sipariş kartına tıklayarak {activeTab === 'raw' ? 'hammadde' : 'sevkiyat'} işlemlerini yapabilirsiniz
              </p>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// 📅 PLANNING DASHBOARD (FULL FEATURED)
// ============================================================================

function PlanningDashboard({ orders, isSuperAdmin }) {
  const [pData, setPData] = useState({ startDate: '', startHour: '08:00', duration: 2 });
  const [selectedId, setSelectedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState('daily');
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");
  const [leftPanelTab, setLeftPanelTab] = useState('pending'); // 'pending' or 'planned'
  const [searchQuery, setSearchQuery] = useState('');
  const [productionFlow, setProductionFlow] = useState([]);
  
  // Mevcut istasyonlar (ProductionDashboard ile aynı)
  const availableStations = {
    // Etiket için
    'bobst_m1': { name: 'Bobst M1 Operatörü', category: 'Etiket', order: 1 },
    'etiket_qc': { name: 'Kalite Kontrol (Etiket)', category: 'Etiket', order: 2, isFinal: true },
    
    // Ambalaj için
    'bobst_m1_ambalaj': { name: 'Bobst M1 Operatörü', category: 'Ambalaj', order: 1 },
    'hibrit': { name: 'Hibrit Operatörü', category: 'Ambalaj', order: 1 },
    'muhürleme': { name: 'Mühürleme', category: 'Ambalaj', order: 2 },
    'sleeve_qc': { name: 'Sleeve Kalite Kontrol', category: 'Ambalaj', order: 3, isFinal: true },
    'tabakalama': { name: 'Tabakalama', category: 'Ambalaj', order: 4, optional: true }
  };

  const selectedOrder = orders.find(o => o.id === selectedId);
  const isEditing = selectedOrder?.status === 'planned' || 
                    selectedOrder?.status === 'shipping_ready' || 
                    selectedOrder?.status === 'completed';

  // Filter by search
  const filterOrders = (orderList) => {
    if (!searchQuery) return orderList;
    return orderList.filter(order => 
      order.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const readyForPlanning = filterOrders(orders.filter(o => o.status === 'planning_pending'));
  const plannedOrders = filterOrders(orders.filter(o => 
    o.status === 'planned' || 
    o.status === 'production_started' || 
    o.status === 'shipping_ready' || 
    o.status === 'completed'
  ));
  const daysPlans = plannedOrders.filter(o => o.planningData?.startDate === viewDate);

  const handlePlan = async (e) => {
    e.preventDefault();
    if (!pData.startDate) return alert("Tarih seçin!");
    if (productionFlow.length === 0) return alert("⚠️ En az bir istasyon seçmelisiniz!");
    
    setIsSaving(true);

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedId);
      await updateDoc(docRef, {
        status: 'planned',
        planningData: {
          startDate: pData.startDate,
          startHour: pData.startHour,
          duration: pData.duration,
          productionDate: pData.startDate,
          productionFlow: productionFlow // İstasyon akışını kaydet
        }
      });
      setSelectedId(null);
      setPData({ startDate: '', startHour: '08:00', duration: 2 });
      setProductionFlow([]);
      setAiAdvice("");
    } catch (error) {
      console.error("Planning save error:", error);
      alert("Hata: " + error.message);
    }
    setIsSaving(false);
  };

  const handleEditPlan = (order) => {
    setSelectedId(order.id);
    setAiAdvice("");
    if (order.planningData) {
      setPData({
        startDate: order.planningData.startDate,
        startHour: order.planningData.startHour,
        duration: order.planningData.duration
      });
      setProductionFlow(order.planningData.productionFlow || []);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setSelectedId(null);
    setPData({ startDate: '', startHour: '08:00', duration: 2 });
    setProductionFlow([]);
    setAiAdvice("");
  };

  const handleAiEstimate = async () => {
    if (!selectedOrder) return;
    setIsAiLoading(true);
    
    const prompt = `Sen bir etiket ve matbaa üretim planlama uzmanısın. 
    Ürün: ${selectedOrder.product}, 
    Miktar: ${selectedOrder.quantity}, 
    Makina: ${selectedOrder.graphicsData?.machine || 'Belirtilmemiş'}, 
    Baskı: ${selectedOrder.graphicsData?.printType || '-'}, 
    Zet: ${selectedOrder.graphicsData?.zet || 'Standart'}, 
    Metraj: ${selectedOrder.warehouseData?.issuedMeterage || selectedOrder.graphicsData?.meterage || '-'}.
    
    Tahmini üretim süresini (Hazırlık + Üretim) saat cinsinden hesapla. 
    Yanıt Formatı (JSON): { "duration": 4, "reason": "Hazırlık 2 saat + baskı 2 saat." }`;

    const responseText = await callGemini(prompt);
    
    try {
      const jsonStr = responseText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(jsonStr);
      if (result.duration) {
        setPData(prev => ({ ...prev, duration: result.duration }));
        setAiAdvice(result.reason);
      }
    } catch (e) {
      setAiAdvice("Tahmin oluşturulamadı.");
    }
    setIsAiLoading(false);
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("DİKKAT: Bu siparişi kalıcı olarak silmek üzeresiniz.")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
        if (selectedId === orderId) setSelectedId(null);
      } catch (error) {
        alert("Silme hatası.");
      }
    }
  };

  const shift1Hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  const shift2Hours = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00"];

  // Status helper
  const getStatusInfo = (status) => {
    switch(status) {
      case 'planned':
        return { label: 'Planlandı', color: 'bg-blue-100 text-blue-800', icon: '📅' };
      case 'production_started':
        return { label: 'Üretimde', color: 'bg-green-100 text-green-800', icon: '⚙️' };
      case 'shipping_ready':
        return { label: 'Sevkiyat Hazır', color: 'bg-purple-100 text-purple-800', icon: '📦' };
      case 'completed':
        return { label: 'Tamamlandı', color: 'bg-gray-100 text-gray-800', icon: '✅' };
      default:
        return { label: 'Planlama Bekliyor', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' };
    }
  };

  const getWeekDates = (baseDate) => {
    const current = new Date(baseDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d.toISOString().split('T')[0]);
    }
    return week;
  };

  const weekDates = getWeekDates(viewDate);
  const formatDateTR = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'numeric' });
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-gray-200 pb-4 mb-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            Üretim Planlama
          </h2>
          <p className="text-gray-600 mt-1">
            Vardiya atamaları ve üretim takvimi
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-md border-2 border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Sipariş No, Ürün Adı veya Firma Adına Göre Ara..."
            className="input-field pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Tabs for Pending & Planned */}
        <div className="lg:col-span-4">
          {/* Tab Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLeftPanelTab('pending')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                leftPanelTab === 'pending'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock size={18} />
              Planlama Bekleyen
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                leftPanelTab === 'pending' ? 'bg-white text-red-600' : 'bg-gray-300 text-gray-700'
              }`}>
                {readyForPlanning.length}
              </span>
            </button>
            <button
              onClick={() => setLeftPanelTab('planned')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                leftPanelTab === 'planned'
                  ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CheckCircle size={18} />
              Planlanan İşler
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                leftPanelTab === 'planned' ? 'bg-white text-green-600' : 'bg-gray-300 text-gray-700'
              }`}>
                {plannedOrders.length}
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {/* PENDING TAB */}
            {leftPanelTab === 'pending' && (
              <>
                {readyForPlanning.length === 0 && (
                  <div className="text-center py-8 text-gray-400 bg-white border-2 border-dashed rounded-xl">
                    <Clock size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Bekleyen iş yok.</p>
                  </div>
                )}

                {readyForPlanning.map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedId(order.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative group ${
                  selectedId === order.id
                    ? 'bg-gradient-to-r from-green-50 to-teal-50 border-green-500 shadow-xl ring-2 ring-green-300'
                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-green-300 shadow-sm hover:shadow-md'
                }`}
              >
                {isSuperAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOrder(order.id);
                    }}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {/* Order Header */}
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold text-gray-800 text-lg">{order.orderNo}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    order.warehouseData?.materialStatus === 'Dilimleme Aşamasında'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {order.warehouseData?.materialStatus}
                  </span>
                </div>

                {/* Company & Product */}
                <div className="mb-3 border-b border-gray-200 pb-2">
                  <div className="text-sm font-semibold text-gray-700">{order.customer}</div>
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    {order.product}
                    {order.category === 'Ambalaj' && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[9px] font-bold">
                        Ambalaj
                      </span>
                    )}
                  </div>
                </div>

                {/* CRITICAL: Customer Deadline - HIGHLIGHTED */}
                <div className="mb-3 bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-lg shadow-md">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">
                    ⏰ Müşteri Termin Tarihi
                  </div>
                  <div className="text-xl font-bold">
                    {order.customerDeadline}
                  </div>
                </div>

                {/* Technical Details Summary */}
                <div className="text-[10px] text-gray-500 space-y-1.5 bg-gray-50 p-3 rounded-lg">
                  <div className="font-bold text-gray-700 mb-2 border-b border-gray-300 pb-1">
                    📋 Teknik Detaylar
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Makina:</span>
                    <span className="font-semibold text-gray-800">
                      {order.graphicsData?.machine}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Baskı/Renk:</span>
                    <span className="font-semibold text-gray-800">
                      {order.graphicsData?.printType} / {order.graphicsData?.color}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>ZET:</span>
                    <span className="font-semibold text-gray-800">
                      {order.graphicsData?.zet}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Kağıt Eni:</span>
                    <span className="font-semibold text-gray-800">
                      {order.graphicsData?.paperWidth}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Kağıt Türü:</span>
                    <span className="font-semibold text-gray-800 text-[9px]">
                      {order.rawMaterial || '-'}
                    </span>
                  </div>

                  {/* CRITICAL: Warehouse Meterage (with Waste) */}
                  <div className="pt-2 mt-2 border-t-2 border-green-300 bg-green-50 -mx-3 px-3 py-2 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-green-800">Depo Metraj (Fire Dahil):</span>
                      <span className="font-bold text-green-700 text-sm">
                        {order.warehouseData?.issuedMeterage 
                          ? `${order.warehouseData.issuedMeterage} mt`
                          : order.graphicsData?.meterage || '-'}
                      </span>
                    </div>
                    {order.warehouseData?.wastageRate > 0 && (
                      <div className="text-[9px] text-green-600 mt-1">
                        (Fire: %{order.warehouseData.wastageRate})
                      </div>
                    )}
                  </div>

                  {/* Additional Details */}
                  {order.category === 'Ambalaj' ? (
                    <>
                      <div className="flex justify-between">
                        <span>LF/CL:</span>
                        <span className="font-bold">
                          {order.graphicsData?.lfSize} / {order.graphicsData?.clSize}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Perfore:</span>
                        <span>{order.graphicsData?.perforation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Klişe:</span>
                        <span>{order.graphicsData?.plateStatus}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>Laminasyon:</span>
                        <span>{order.graphicsData?.lamination}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bıçak:</span>
                        <span>{order.graphicsData?.dieStatus}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Combine Badge */}
                {order.graphicsData?.combinedInfo > 1 && (
                  <div className="mt-3 flex items-center gap-1 text-orange-600 text-[10px] font-bold bg-orange-50 p-2 rounded-lg border border-orange-200 justify-center">
                    <Layers size={12} />
                    {order.graphicsData.combinedInfo} li Kombine
                  </div>
                )}
              </div>
            ))}
              </>
            )}

            {/* PLANNED TAB */}
            {leftPanelTab === 'planned' && (
              <>
                {plannedOrders.length === 0 && (
                  <div className="text-center py-8 text-gray-400 bg-white border-2 border-dashed rounded-xl">
                    <CheckCircle size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Henüz planlanmış iş yok.</p>
                  </div>
                )}

                {plannedOrders.map(order => {
                  const statusInfo = getStatusInfo(order.status);
                  return (
                    <div
                      key={order.id}
                      onClick={() => handleEditPlan(order)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative group ${
                        selectedId === order.id
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 shadow-xl ring-2 ring-blue-300'
                          : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {isSuperAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
                          className="absolute top-2 right-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {/* Order Header with Status */}
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-gray-800 text-lg">{order.orderNo}</span>
                        <span className={`text-[10px] px-2 py-1 rounded font-bold ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>

                      {/* Company & Product */}
                      <div className="mb-3 border-b border-gray-200 pb-2">
                        <div className="text-sm font-semibold text-gray-700">{order.customer}</div>
                        <div className="text-xs text-gray-600">{order.product}</div>
                      </div>

                      {/* Planning Info Box */}
                      <div className="mb-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-lg shadow-md">
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">
                          📅 Planlanan Tarih & Saat
                        </div>
                        <div className="text-lg font-bold">
                          {order.planningData?.startDate} / {order.planningData?.startHour}
                        </div>
                        <div className="text-xs opacity-90 mt-1">
                          Süre: {order.planningData?.duration} saat
                        </div>
                      </div>

                      {/* Customer Deadline */}
                      <div className="mb-3 bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-lg shadow-md">
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">
                          ⏰ Müşteri Termin Tarihi
                        </div>
                        <div className="text-xl font-bold">
                          {order.customerDeadline}
                        </div>
                      </div>

                      {/* Technical Summary */}
                      <div className="text-[10px] text-gray-500 space-y-1.5 bg-gray-50 p-3 rounded-lg">
                        <div className="font-bold text-gray-700 mb-2 border-b border-gray-300 pb-1">
                          📋 Teknik Özet
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Makina:</span>
                          <span className="font-semibold text-gray-800">
                            {order.graphicsData?.machine}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Baskı:</span>
                          <span className="font-semibold text-gray-800">
                            {order.graphicsData?.printType}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Kağıt Türü:</span>
                          <span className="font-semibold text-gray-800 text-[9px]">
                            {order.rawMaterial || '-'}
                          </span>
                        </div>

                        {/* Warehouse Meterage */}
                        <div className="pt-2 mt-2 border-t-2 border-green-300 bg-green-50 -mx-3 px-3 py-2 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-green-800">Depo Metraj:</span>
                            <span className="font-bold text-green-700 text-sm">
                              {order.warehouseData?.issuedMeterage 
                                ? `${order.warehouseData.issuedMeterage} mt`
                                : order.graphicsData?.meterage || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Edit Button Hint */}
                      <div className="mt-3 text-center">
                        <span className="text-[10px] text-blue-600 font-bold">
                          Tıklayarak düzenleyin 📝
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Planning Form & Calendar */}
        <div className="lg:col-span-8 space-y-6">
          {selectedId ? (
            <div className={`p-8 rounded-2xl shadow-xl border-2 animate-slide-in ${
              isEditing 
                ? 'border-blue-200 bg-blue-50' 
                : 'border-green-200 bg-white'
            }`}>
              {/* Planning Form Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className={`text-2xl font-bold ${
                    isEditing ? 'text-blue-700' : 'text-green-700'
                  }`}>
                    {isEditing ? 'Planı Düzenle / Güncelle' : 'Seçili İş İçin Vardiya Ata'}
                  </h3>
                  {isEditing && (
                    <div className="text-sm text-blue-600 mt-1">
                      Şu an <strong>{selectedOrder.orderNo}</strong> siparişini düzenliyorsunuz.
                    </div>
                  )}
                </div>
                {selectedId && (
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-500 hover:text-red-600 text-sm flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-all"
                  >
                    <X size={16} />
                    İptal
                  </button>
                )}
              </div>

              {/* Selected Order Full Details */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl mb-6 border-2 border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Order Info */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Sipariş Bilgileri
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="font-bold text-lg text-gray-800">
                        {selectedOrder.orderNo}
                      </div>
                      <div className="text-gray-700">{selectedOrder.customer}</div>
                      <div className="text-gray-600">{selectedOrder.product}</div>
                      <div className="font-bold text-gray-800">{selectedOrder.quantity}</div>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Teknik Özellikler
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Makina:</span>
                        <span className="font-bold text-gray-800">
                          {selectedOrder.graphicsData?.machine}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Baskı:</span>
                        <span className="font-bold text-gray-800">
                          {selectedOrder.graphicsData?.printType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Renk:</span>
                        <span className="font-bold text-gray-800">
                          {selectedOrder.graphicsData?.color}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ZET:</span>
                        <span className="font-bold text-gray-800">
                          {selectedOrder.graphicsData?.zet}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kağıt Eni:</span>
                        <span className="font-bold text-gray-800">
                          {selectedOrder.graphicsData?.paperWidth}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kağıt Türü:</span>
                        <span className="font-bold text-gray-800 text-[10px]">
                          {selectedOrder.rawMaterial || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Critical Info */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Kritik Bilgiler
                    </h4>
                    
                    {/* Deadline - HIGHLIGHTED */}
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-lg shadow-md mb-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                        Müşteri Termin
                      </div>
                      <div className="text-xl font-bold">
                        {selectedOrder.customerDeadline}
                      </div>
                    </div>

                    {/* Warehouse Meterage - HIGHLIGHTED */}
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-lg shadow-md">
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                        Depo Metraj (Fire Dahil)
                      </div>
                      <div className="text-xl font-bold">
                        {selectedOrder.warehouseData?.issuedMeterage 
                          ? `${selectedOrder.warehouseData.issuedMeterage} mt`
                          : selectedOrder.graphicsData?.meterage || '-'}
                      </div>
                      {selectedOrder.warehouseData?.wastageRate > 0 && (
                        <div className="text-xs opacity-90 mt-1">
                          Fire Oranı: %{selectedOrder.warehouseData.wastageRate}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Planning Form */}
              <form onSubmit={handlePlan} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Date */}
                  <div>
                    <label className="label">Tarih</label>
                    <input
                      required
                      type="date"
                      className="input-field"
                      value={pData.startDate}
                      onChange={e => setPData({ ...pData, startDate: e.target.value })}
                    />
                  </div>

                  {/* Start Hour */}
                  <div>
                    <label className="label">Başlangıç Saati</label>
                    <select
                      className="input-field"
                      value={pData.startHour}
                      onChange={e => setPData({ ...pData, startHour: e.target.value })}
                    >
                      {[...shift1Hours, ...shift2Hours].filter(h => h !== "12:00").map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration with AI */}
                  <div className="relative">
                    <label className="label flex items-center gap-1">
                      Süre (Saat)
                      <button
                        type="button"
                        onClick={handleAiEstimate}
                        disabled={isAiLoading}
                        className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded hover:bg-purple-200 flex items-center gap-1 ml-2 border border-purple-300 transition-colors"
                      >
                        {isAiLoading ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Sparkles size={10} />
                        )}
                        AI Tahmin
                      </button>
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="16"
                      className="input-field"
                      value={pData.duration}
                      onChange={e => setPData({ 
                        ...pData, 
                        duration: e.target.value === '' ? '' : parseInt(e.target.value) 
                      })}
                    />
                  </div>
                </div>

                {/* İstasyon Akışı Seçimi */}
                <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                  <h4 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <Component size={20} />
                    Üretim İstasyon Akışı *
                  </h4>
                  <p className="text-sm text-indigo-700 mb-4">
                    Bu sipariş hangi istasyonlardan geçecek? Sırayla seçin:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {Object.entries(availableStations)
                      .filter(([key, station]) => {
                        // Seçili siparişin kategorisine göre filtrele
                        const selectedOrder = orders.find(o => o.id === selectedId);
                        if (!selectedOrder) return true;
                        return !station.category || station.category === selectedOrder.category;
                      })
                      .map(([key, station]) => {
                        const isSelected = productionFlow.includes(key);
                        const orderIndex = productionFlow.indexOf(key);
                        
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setProductionFlow(productionFlow.filter(s => s !== key));
                              } else {
                                setProductionFlow([...productionFlow, key]);
                              }
                            }}
                            className={`p-3 rounded-lg font-bold text-sm transition-all border-2 ${
                              isSelected
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-700 shadow-lg'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                            }`}
                          >
                            {isSelected && (
                              <span className="inline-block bg-white text-indigo-600 rounded-full w-6 h-6 text-xs leading-6 mr-2">
                                {orderIndex + 1}
                              </span>
                            )}
                            {station.name}
                            {station.isFinal && ' 🏁'}
                            {station.optional && ' (Opsiyonel)'}
                          </button>
                        );
                      })}
                  </div>

                  {productionFlow.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                      <p className="text-sm font-bold text-indigo-900 mb-2">Seçilen İstasyon Sırası:</p>
                      <div className="flex flex-wrap gap-2">
                        {productionFlow.map((stationKey, index) => (
                          <div key={stationKey} className="flex items-center gap-2 bg-indigo-100 px-3 py-1 rounded-full">
                            <span className="font-bold text-indigo-900">{index + 1}.</span>
                            <span className="text-indigo-700">{availableStations[stationKey].name}</span>
                            <button
                              type="button"
                              onClick={() => setProductionFlow(productionFlow.filter(s => s !== stationKey))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {productionFlow.length === 0 && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                      ⚠️ En az bir istasyon seçmelisiniz!
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  disabled={isSaving}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3 ${
                    isEditing
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={24} />
                      {isEditing ? 'Planı Güncelle' : 'Planı Kaydet'}
                    </>
                  )}
                </button>
              </form>

              {/* AI Advice */}
              {aiAdvice && (
                <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl text-sm text-purple-800 flex items-start gap-2 animate-in fade-in">
                  <Sparkles size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Yapay Zeka Analizi:</span> {aiAdvice}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl h-full flex flex-col items-center justify-center text-gray-400 p-12">
              <Calendar size={64} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Planlama yapmak veya düzenlemek için bir iş seçin</p>
            </div>
          )}

          {/* Calendar View */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-green-50 to-teal-50 border-b-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                <Calendar size={24} className="text-green-600" />
                Üretim Çizelgesi
              </h3>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-4">
                <div className="flex bg-white rounded-lg border-2 border-gray-300 p-1">
                  <button
                    onClick={() => setViewMode('daily')}
                    className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-1 transition-all ${
                      viewMode === 'daily'
                        ? 'bg-green-100 text-green-700 shadow'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <List size={16} />
                    Günlük
                  </button>
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-1 transition-all ${
                      viewMode === 'weekly'
                        ? 'bg-green-100 text-green-700 shadow'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Grid size={16} />
                    Haftalık
                  </button>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const d = new Date(viewDate);
                      d.setDate(d.getDate() - (viewMode === 'weekly' ? 7 : 1));
                      setViewDate(d.toISOString().split('T')[0]);
                    }}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <input
                    type="date"
                    className="border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-sm font-medium"
                    value={viewDate}
                    onChange={e => setViewDate(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      const d = new Date(viewDate);
                      d.setDate(d.getDate() + (viewMode === 'weekly' ? 7 : 1));
                      setViewDate(d.toISOString().split('T')[0]);
                    }}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Daily View */}
            {viewMode === 'daily' && (
              <div className="p-6 overflow-x-auto">
                {/* Shift 1 */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-bold">
                      1. VARDİYA (08:00 - 17:00)
                    </span>
                  </div>
                  <div className="flex border-2 border-gray-200 rounded-lg bg-gray-50 h-32 relative min-w-[800px]">
                    {shift1Hours.map((hour, index) => (
                      <div
                        key={hour}
                        className={`flex-1 border-r border-gray-200 relative ${
                          hour === "12:00" ? "bg-gray-200" : ""
                        }`}
                      >
                        <span className="absolute top-1 left-1 text-[10px] font-bold text-gray-500">
                          {hour}
                        </span>
                        {hour === "12:00" && (
                          <span className="absolute top-10 left-2 text-[10px] -rotate-45 text-gray-400 font-bold">
                            MOLA
                          </span>
                        )}
                        {daysPlans.map(plan => {
                          if (plan.planningData.startHour === hour) {
                            return (
                              <div
                                key={plan.id}
                                className="absolute top-6 left-0 right-0 mx-1 bg-blue-500 text-white text-[10px] p-2 rounded-lg z-10 shadow-md overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors"
                                title={`${plan.orderNo} - ${plan.product}`}
                                onClick={() => handleEditPlan(plan)}
                                style={{ width: `calc(${plan.planningData.duration * 100}% - 8px)` }}
                              >
                                <div className="font-bold">{plan.orderNo}</div>
                                <div className="text-[9px] opacity-90">{plan.product}</div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shift 2 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-lg text-sm font-bold">
                      2. VARDİYA (17:00 - 01:00)
                    </span>
                  </div>
                  <div className="flex border-2 border-gray-200 rounded-lg bg-gray-50 h-32 relative min-w-[800px]">
                    {shift2Hours.map(hour => (
                      <div key={hour} className="flex-1 border-r border-gray-200 relative">
                        <span className="absolute top-1 left-1 text-[10px] font-bold text-gray-500">
                          {hour}
                        </span>
                        {daysPlans.map(plan => {
                          if (plan.planningData.startHour === hour) {
                            return (
                              <div
                                key={plan.id}
                                className="absolute top-6 left-0 right-0 mx-1 bg-indigo-500 text-white text-[10px] p-2 rounded-lg z-10 shadow-md overflow-hidden cursor-pointer hover:bg-indigo-600 transition-colors"
                                title={`${plan.orderNo} - ${plan.product}`}
                                onClick={() => handleEditPlan(plan)}
                                style={{ width: `calc(${plan.planningData.duration * 100}% - 8px)` }}
                              >
                                <div className="font-bold">{plan.orderNo}</div>
                                <div className="text-[9px] opacity-90">{plan.product}</div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Weekly View */}
            {viewMode === 'weekly' && (
              <div className="p-6 overflow-x-auto">
                <div className="grid grid-cols-7 min-w-[1000px] border-2 rounded-lg overflow-hidden">
                  {weekDates.map(dateStr => {
                    const daysOrders = plannedOrders.filter(
                      o => o.planningData?.startDate === dateStr
                    );
                    const shift1 = daysOrders.filter(
                      o => parseInt(o.planningData.startHour.split(':')[0]) < 17
                    );
                    const shift2 = daysOrders.filter(o => {
                      const h = parseInt(o.planningData.startHour.split(':')[0]);
                      return h >= 17 || h === 0;
                    });
                    const isSelectedDay = dateStr === viewDate;

                    return (
                      <div
                        key={dateStr}
                        className={`border-r last:border-r-0 flex flex-col ${
                          isSelectedDay ? 'bg-green-50' : 'bg-white'
                        }`}
                      >
                        <div
                          onClick={() => {
                            setViewDate(dateStr);
                            setViewMode('daily');
                          }}
                          className={`p-3 text-center border-b font-bold text-sm cursor-pointer hover:bg-green-100 transition-colors ${
                            isSelectedDay ? 'text-green-800 bg-green-100' : 'text-gray-700'
                          }`}
                        >
                          {formatDateTR(dateStr)}
                        </div>
                        <div className="flex-1 p-2 space-y-2 min-h-[200px]">
                          {/* Shift 1 */}
                          <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 min-h-[90px]">
                            <div className="text-[10px] font-bold text-blue-800 mb-1 text-center">
                              1. Vardiya
                            </div>
                            {shift1.map(o => (
                              <div
                                key={o.id}
                                onClick={() => handleEditPlan(o)}
                                className="bg-white border border-blue-200 rounded px-2 py-1 text-[10px] mb-1 truncate shadow-sm text-blue-900 cursor-pointer hover:bg-blue-100 transition-colors"
                                title={`${o.orderNo} - ${o.customer}`}
                              >
                                <span className="font-bold">{o.orderNo}</span>
                                <span className="opacity-75 ml-1">{o.product}</span>
                              </div>
                            ))}
                          </div>

                          {/* Shift 2 */}
                          <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-100 min-h-[90px]">
                            <div className="text-[10px] font-bold text-indigo-800 mb-1 text-center">
                              2. Vardiya
                            </div>
                            {shift2.map(o => (
                              <div
                                key={o.id}
                                onClick={() => handleEditPlan(o)}
                                className="bg-white border border-indigo-200 rounded px-2 py-1 text-[10px] mb-1 truncate shadow-sm text-indigo-900 cursor-pointer hover:bg-indigo-100 transition-colors"
                                title={`${o.orderNo} - ${o.customer}`}
                              >
                                <span className="font-bold">{o.orderNo}</span>
                                <span className="opacity-75 ml-1">{o.product}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 🏭 PRODUCTION DASHBOARD (STATION-BASED WORKFLOW)
// ============================================================================

function ProductionDashboard({ orders, isSuperAdmin, currentUser }) {
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stationData, setStationData] = useState({
    startTime: '',
    endTime: '',
    inputMeterage: '',
    outputMeterage: '',
    outputQuantity: '', // Adet veya KG (son istasyon için)
    notes: '',
    isStarted: false // İş başlatıldı mı
  });

  // Station definitions
  const stations = {
    // Etiket için
    'bobst_m1': { name: 'Bobst M1 Operatörü', category: 'Etiket', order: 1 },
    'etiket_qc': { name: 'Kalite Kontrol (Etiket)', category: 'Etiket', order: 2, isFinal: true },
    
    // Ambalaj için
    'bobst_m1_ambalaj': { name: 'Bobst M1 Operatörü', category: 'Ambalaj', order: 1 },
    'hibrit': { name: 'Hibrit Operatörü', category: 'Ambalaj', order: 1 },
    'muhürleme': { name: 'Mühürleme', category: 'Ambalaj', order: 2 },
    'sleeve_qc': { name: 'Sleeve Kalite Kontrol', category: 'Ambalaj', order: 3, isFinal: true },
    'tabakalama': { name: 'Tabakalama', category: 'Ambalaj', order: 4, optional: true }
  };

  // Get station list for current user
  const availableStations = Object.entries(stations).map(([id, info]) => ({
    id,
    ...info
  }));

  // Determine next station for an order
  const getNextStation = (order) => {
    if (!order.productionData || order.productionData.length === 0) {
      // İlk istasyon
      if (order.category === 'Etiket') {
        return 'bobst_m1';
      } else {
        // Ambalaj: Grafik'ten gelen makina bilgisine göre
        const machine = order.graphicsData?.machine;
        if (machine === 'BOBST M1 VISION') return 'bobst_m1_ambalaj';
        if (machine === 'HİBRİT') return 'hibrit';
        return 'bobst_m1_ambalaj'; // Default
      }
    }

    // Mevcut istasyondan sonraki istasyonu belirle
    const lastStation = order.productionData[order.productionData.length - 1];
    
    // Safety check
    if (!lastStation || !lastStation.station) {
      return null;
    }
    
    const category = order.category;

    if (category === 'Etiket') {
      if (lastStation.station === 'bobst_m1') return 'etiket_qc';
      return null; // Tamamlanmış
    } else {
      // Ambalaj akışı
      if (lastStation.station === 'bobst_m1_ambalaj' || lastStation.station === 'hibrit') {
        return 'muhürleme';
      }
      if (lastStation.station === 'muhürleme') {
        return 'sleeve_qc';
      }
      if (lastStation.station === 'sleeve_qc') {
        // Tabakalama var mı kontrol et
        if (order.graphicsData?.layeringStatus === 'Var') {
          return 'tabakalama';
        }
        return null; // Tamamlanmış
      }
      if (lastStation.station === 'tabakalama') {
        return null; // Tamamlanmış
      }
    }

    return null;
  };

  // Filter orders for selected station
  const getOrdersForStation = (stationId) => {
    let stationOrders = orders.filter(order => {
      // Only show planned and production_started orders
      if (order.status !== 'planned' && order.status !== 'production_started') {
        return false;
      }
      
      const nextStation = getNextStation(order);
      return nextStation === stationId;
    });

    // Apply search filter
    if (searchQuery) {
      stationOrders = stationOrders.filter(order =>
        order.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return stationOrders;
  };

  const filteredOrders = selectedStation ? getOrdersForStation(selectedStation) : [];

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setStationData({
      startTime: '',
      endTime: '',
      inputMeterage: order.warehouseData?.issuedMeterage || order.graphicsData?.meterage || '',
      outputMeterage: '',
      outputQuantity: '',
      notes: '',
      isStarted: false
    });
  };

  const handleStartWork = () => {
    // Rezervasyon kontrolü
    if (selectedOrder && (!selectedOrder.warehouseData?.reservedRolls || selectedOrder.warehouseData.reservedRolls.length === 0)) {
      const confirmed = window.confirm(
        '⚠️ Bu sipariş için rezerve edilmiş bobin bulunmamaktadır!\n\nYine de üretime başlamak istiyor musunuz?'
      );
      if (!confirmed) return;
    }
    
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setStationData({ ...stationData, startTime: now, isStarted: true });
  };

  const handleEndWork = () => {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setStationData({ ...stationData, endTime: now });
  };

  const handleSaveStation = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !selectedStation) return;

    setIsSaving(true);
    try {
      const stationInfo = stations[selectedStation];
      
      // SARFIYAT SİSTEMİ - İlk istasyonda bobin sarfiyatı yap
      if (selectedOrder.productionData?.length === 0 || !selectedOrder.productionData) {
        const reservedRolls = selectedOrder.warehouseData?.reservedRolls || [];
        
        if (reservedRolls.length > 0 && stationData.inputMeterage) {
          const consumedMeterage = parseFloat(stationData.inputMeterage);
          
          // İlk rezerve bobini seç
          const rollToConsume = reservedRolls[0];
          
          if (rollToConsume && rollToConsume.rollId) {
            try {
              // Bobinin mevcut durumunu al
              const rollDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stock_rolls', rollToConsume.rollId));
              
              if (rollDoc.exists()) {
                const rollData = rollDoc.data();
                const reservedLength = rollToConsume.reservedLength || 0;
                const actualConsumed = Math.min(consumedMeterage, reservedLength);
                const remaining = reservedLength - actualConsumed;
                
                // Rezervasyonu kaldır ve kalan metrajı geri ekle
                await updateDoc(
                  doc(db, 'artifacts', appId, 'public', 'data', 'stock_rolls', rollToConsume.rollId),
                  {
                    currentLength: rollData.currentLength + remaining, // Kullanılmayan kısmı geri ekle
                    reservationId: null, // Rezervasyonu kaldır
                    reservedLength: null,
                    reservedOrderNo: null,
                    reservedAt: null,
                    lastConsumedAt: new Date().toISOString(),
                    lastConsumedOrder: selectedOrder.orderNo,
                    lastConsumedAmount: actualConsumed
                  }
                );
                
                // Stok hareketi kaydet - Sarfiyat
                await logStockMovement(db, appId, {
                  type: 'SARFIYAT',
                  rollBarcode: rollToConsume.rollBarcode,
                  materialName: rollData.materialName || 'N/A',
                  supplierName: rollData.supplierName || 'N/A',
                  quantity: actualConsumed,
                  unit: 'm',
                  description: `Üretim sarfiyatı - ${selectedOrder.orderNo}`,
                  referenceType: 'URETIM',
                  referenceId: selectedOrder.id,
                  orderNo: selectedOrder.orderNo,
                  remainingReturned: remaining
                });
                
                console.log(`✅ Sarfiyat: ${rollToConsume.rollBarcode}`);
                console.log(`   Rezerve: ${reservedLength}m`);
                console.log(`   Kullanılan: ${actualConsumed}m`);
                console.log(`   Stoka iade: ${remaining}m`);
                console.log(`   Yeni stok: ${rollData.currentLength + remaining}m`);
              }
            } catch (rollError) {
              console.error('Bobin sarfiyat hatası:', rollError);
              // Devam et, sipariş kaydını engelleme
            }
          }
        }
      }
      
      const newStationData = {
        station: selectedStation,
        stationName: stationInfo.name,
        startTime: stationData.startTime,
        endTime: stationData.endTime,
        inputMeterage: stationData.inputMeterage,
        outputMeterage: stationData.outputMeterage,
        outputQuantity: stationInfo.isFinal ? stationData.outputQuantity : null,
        notes: stationData.notes,
        completedAt: new Date().toISOString(),
        completedBy: currentUser?.email || 'Unknown'
      };

      const existingProductionData = selectedOrder.productionData || [];
      const updatedProductionData = [...existingProductionData, newStationData];

      // Determine new status
      const nextStation = getNextStation(selectedOrder);
      let newStatus = 'production_started';
      
      if (!nextStation || (stationInfo.isFinal && selectedOrder.graphicsData?.layeringStatus !== 'Var') || 
          (selectedStation === 'tabakalama')) {
        // Son istasyon tamamlandı
        newStatus = 'shipping_ready';
      }

      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id);
      await updateDoc(docRef, {
        productionData: updatedProductionData,
        status: newStatus
      });

      setSelectedOrder(null);
      setStationData({
        startTime: '',
        endTime: '',
        inputMeterage: '',
        outputMeterage: '',
        outputQuantity: '',
        notes: '',
        isStarted: false
      });
    } catch (error) {
      console.error("Station save error:", error);
      alert("Hata: " + error.message);
    }
    setIsSaving(false);
  };

  const currentStationInfo = selectedStation ? stations[selectedStation] : null;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-gray-200 pb-4 mb-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Üretim Takibi
          </h2>
          <p className="text-gray-600 mt-1">
            İstasyon bazlı üretim akışı
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-md border-2 border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Sipariş No, Ürün Adı veya Firma Adına Göre Ara..."
            className="input-field pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Station Selector */}
      <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
        <label className="label">İstasyon Seçiniz</label>
        <select
          className="input-field text-lg"
          value={selectedStation}
          onChange={(e) => {
            setSelectedStation(e.target.value);
            setSelectedOrder(null);
          }}
        >
          <option value="">-- İstasyon Seçin --</option>
          <optgroup label="Etiket İstasyonları">
            <option value="bobst_m1">Bobst M1 Operatörü</option>
            <option value="etiket_qc">Kalite Kontrol (Etiket)</option>
          </optgroup>
          <optgroup label="Ambalaj İstasyonları">
            <option value="bobst_m1_ambalaj">Bobst M1 Operatörü (Ambalaj)</option>
            <option value="hibrit">Hibrit Operatörü</option>
            <option value="muhürleme">Mühürleme</option>
            <option value="sleeve_qc">Sleeve Kalite Kontrol</option>
            <option value="tabakalama">Tabakalama</option>
          </optgroup>
        </select>
      </div>

      {/* Orders for Selected Station */}
      {selectedStation && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Orders */}
          <div className="lg:col-span-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ClipboardCheck className="text-teal-500" size={24} />
              {currentStationInfo?.name} - İşler
              <span className="ml-auto text-sm bg-teal-100 text-teal-700 px-3 py-1 rounded-full">
                {filteredOrders.length}
              </span>
            </h3>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400 bg-white border-2 border-dashed rounded-xl">
                  <ClipboardCheck size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Bu istasyonda bekleyen iş yok.</p>
                </div>
              )}

              {filteredOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedOrder?.id === order.id
                      ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-500 shadow-xl ring-2 ring-teal-300'
                      : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-teal-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-800 text-lg">{order.orderNo}</span>
                    <span className="text-[10px] px-2 py-1 rounded font-bold bg-teal-100 text-teal-800">
                      {order.category}
                    </span>
                  </div>

                  {/* Customer & Product */}
                  <div className="mb-2 text-sm">
                    <div className="font-semibold text-gray-700">{order.customer}</div>
                    <div className="text-xs text-gray-600">{order.product}</div>
                  </div>

                  {/* Technical Info */}
                  <div className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded space-y-1">
                    <div className="flex justify-between">
                      <span>Makina:</span>
                      <span className="font-semibold">{order.graphicsData?.machine}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kağıt Türü:</span>
                      <span className="font-semibold text-[9px]">{order.rawMaterial}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Metraj:</span>
                      <span className="font-semibold text-green-700">
                        {order.warehouseData?.issuedMeterage || order.graphicsData?.meterage} mt
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Station Form */}
          <div className="lg:col-span-8">
            {selectedOrder ? (
              <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-teal-200">
                <h3 className="text-2xl font-bold text-teal-700 mb-6">
                  {currentStationInfo?.name} - İşlem Formu
                </h3>

                {/* Order Details */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl mb-6 border-2 border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                        Sipariş Bilgileri
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="font-bold text-lg">{selectedOrder.orderNo}</div>
                        <div className="text-gray-700">{selectedOrder.customer}</div>
                        <div className="text-gray-600">{selectedOrder.product}</div>
                        <div className="font-bold">{selectedOrder.quantity}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                        Teknik Detaylar
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div><strong>Makina:</strong> {selectedOrder.graphicsData?.machine}</div>
                        <div><strong>Baskı:</strong> {selectedOrder.graphicsData?.printType}</div>
                        <div><strong>Renk:</strong> {selectedOrder.graphicsData?.color}</div>
                        <div><strong>Kağıt Türü:</strong> {selectedOrder.rawMaterial}</div>
                      </div>
                      
                      {/* Rezerve Bobinler */}
                      {selectedOrder.warehouseData?.reservedRolls && selectedOrder.warehouseData.reservedRolls.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h5 className="text-xs font-bold text-purple-700 mb-1 flex items-center gap-1">
                            <PackageCheck size={12} />
                            Rezerve Bobinler
                          </h5>
                          {selectedOrder.warehouseData.reservedRolls.map((roll, idx) => (
                            <div key={idx} className="bg-purple-50 p-1 px-2 rounded text-[10px] mb-1">
                              <div className="font-mono font-bold">{roll.rollBarcode}</div>
                              <div className="text-gray-600">{roll.reservedLength} m</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                        Önceki Notlar
                      </h4>
                      <div className="text-xs space-y-1">
                        {selectedOrder.productionData && selectedOrder.productionData.length > 0 ? (
                          selectedOrder.productionData.map((pd, idx) => (
                            <div key={idx} className="bg-yellow-50 p-2 rounded border border-yellow-200">
                              <div className="font-bold">{pd.stationName}:</div>
                              <div className="text-gray-700">{pd.notes || 'Not yok'}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400">Henüz önceki işlem yok</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Start/End Buttons */}
                {!stationData.isStarted ? (
                  <button
                    type="button"
                    onClick={handleStartWork}
                    className="w-full py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  >
                    <Play size={24} />
                    İşe Başla
                  </button>
                ) : (
                  <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-green-800">✅ İş başlatıldı</span>
                      <span className="text-lg font-bold text-green-700">{stationData.startTime}</span>
                    </div>
                    {!stationData.endTime && (
                      <button
                        type="button"
                        onClick={handleEndWork}
                        className="w-full py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex justify-center items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                      >
                        <StopCircle size={20} />
                        İşi Bitir
                      </button>
                    )}
                    {stationData.endTime && (
                      <div className="text-center py-2 bg-red-100 rounded-lg border border-red-300">
                        <span className="text-sm font-bold text-red-800">Bitiş: {stationData.endTime}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Station Form */}
                <form onSubmit={handleSaveStation} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                      <label className="label">Giren Metraj (mt)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={stationData.inputMeterage}
                        onChange={e => setStationData({ ...stationData, inputMeterage: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="label">Çıkan Metraj (mt)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={stationData.outputMeterage}
                        onChange={e => setStationData({ ...stationData, outputMeterage: e.target.value })}
                      />
                    </div>

                    {currentStationInfo?.isFinal && (
                      <div className="md:col-span-2">
                        <label className="label">Çıkan Ürün Adedi veya KG</label>
                        <input
                          required
                          type="text"
                          className="input-field"
                          placeholder="Örn: 10000 Adet veya 250 KG"
                          value={stationData.outputQuantity}
                          onChange={e => setStationData({ ...stationData, outputQuantity: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="label">Notlar (Sonraki istasyona bilgi)</label>
                      <textarea
                        className="input-field"
                        rows="3"
                        placeholder="Önemli notlar, uyarılar veya bilgiler..."
                        value={stationData.notes}
                        onChange={e => setStationData({ ...stationData, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving || !stationData.endTime}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3 ${
                      !stationData.endTime 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800'
                    } text-white`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={24} />
                        İşlemi Tamamla ve Kaydet
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl h-full flex flex-col items-center justify-center text-gray-400 p-12">
                <Printer size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">İşlem yapmak için bir sipariş seçin</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// 📦 ARCHIVE DASHBOARD - Now imported from components/Archive
// ============================================================================


// ============================================================================
// 🔐 AUTH & ADMIN - Now imported from separate components
// ============================================================================
