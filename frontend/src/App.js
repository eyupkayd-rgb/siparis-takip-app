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
import WarehouseDashboard from './components/Warehouse/WarehouseDashboard';
import PlanningDashboard from './components/Planning/PlanningDashboard';
import ProductionDashboard from './components/Production/ProductionDashboard';

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

// ============================================================================
// 🏭 WAREHOUSE, PLANNING & PRODUCTION DASHBOARDS - Now imported from separate components
// ============================================================================

// ============================================================================
// 📦 ARCHIVE DASHBOARD - Now imported from components/Archive
// ============================================================================


// ============================================================================
// 🔐 AUTH & ADMIN - Now imported from separate components
// ============================================================================

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================

export default function OrderApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [currentView, setCurrentView] = useState('marketing');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [customerCards, setCustomerCards] = useState([]);
  const [supplierCards, setSupplierCards] = useState([]);
  const [stockRolls, setStockRolls] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const profile = userDoc.data();
          if (profile.approved) {
            setUserProfile(profile);
            const roleViews = {
              super_admin: 'marketing',
              marketing: 'marketing',
              graphics: 'graphics',
              warehouse: 'warehouse',
              planning: 'planning',
              production: 'production'
            };
            setCurrentView(roleViews[profile.role] || 'marketing');
          } else {
            alert('Hesabınız henüz onaylanmamış. Lütfen yönetici ile iletişime geçin.');
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !userProfile) return;

    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      ordersData.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  useEffect(() => {
    if (!user || !userProfile) return;

    const customersRef = collection(db, 'artifacts', appId, 'public', 'data', 'customer_cards');
    const unsubscribeCustomers = onSnapshot(customersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomerCards(data);
    });

    const suppliersRef = collection(db, 'artifacts', appId, 'public', 'data', 'supplier_cards');
    const unsubscribeSuppliers = onSnapshot(suppliersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSupplierCards(data);
    });

    const stockRollsRef = collection(db, 'artifacts', appId, 'public', 'data', 'stock_rolls');
    const unsubscribeStockRolls = onSnapshot(stockRollsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStockRolls(data);
    });

    const stockMovementsRef = collection(db, 'artifacts', appId, 'public', 'data', 'stock_movements');
    const unsubscribeStockMovements = onSnapshot(stockMovementsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setStockMovements(data);
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeSuppliers();
      unsubscribeStockRolls();
      unsubscribeStockMovements();
    };
  }, [user, userProfile]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
        <Loader2 className="animate-spin text-white" size={64} />
      </div>
    );
  }

  if (!user || !userProfile) {
    return <AuthScreen />;
  }

  const isSuperAdmin = userProfile.role === 'super_admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <nav className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white p-4 shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="animate-pulse" />
            Sipariş Takip Sistemi
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm bg-white/10 px-3 py-1.5 rounded-lg">
              {userProfile.displayName || userProfile.email}
            </span>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-2"
            >
              <Key size={16} />
              Şifre Değiştir
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold transition flex items-center gap-2"
            >
              <LogOut size={18} />
              Çıkış
            </button>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 shadow-lg">
          <nav className="space-y-2">
            {(isSuperAdmin || userProfile.role === 'marketing') && (
              <button
                onClick={() => setCurrentView('marketing')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  currentView === 'marketing'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Layout size={20} />
                Pazarlama
              </button>
            )}

            {(isSuperAdmin || userProfile.role === 'graphics') && (
              <button
                onClick={() => setCurrentView('graphics')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  currentView === 'graphics'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Palette size={20} />
                Grafik
              </button>
            )}

            {(isSuperAdmin || userProfile.role === 'warehouse') && (
              <button
                onClick={() => setCurrentView('warehouse')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  currentView === 'warehouse'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Package size={20} />
                Depo
              </button>
            )}

            {(isSuperAdmin || userProfile.role === 'planning') && (
              <button
                onClick={() => setCurrentView('planning')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  currentView === 'planning'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Calendar size={20} />
                Planlama
              </button>
            )}

            {(isSuperAdmin || userProfile.role === 'production') && (
              <button
                onClick={() => setCurrentView('production')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  currentView === 'production'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Printer size={20} />
                Üretim
              </button>
            )}

            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setCurrentView('archive')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                    currentView === 'archive'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Archive size={20} />
                  Arşiv
                </button>

                <button
                  onClick={() => setCurrentView('admin')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                    currentView === 'admin'
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Users size={20} />
                  Yönetim
                </button>
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {currentView === 'marketing' && (
            <MarketingDashboard orders={orders} isSuperAdmin={isSuperAdmin} customerCards={customerCards} />
          )}
          {currentView === 'graphics' && (
            <GraphicsDashboard orders={orders} isSuperAdmin={isSuperAdmin} />
          )}
          {currentView === 'warehouse' && (
            <WarehouseDashboard
              orders={orders}
              isSuperAdmin={isSuperAdmin}
              supplierCards={supplierCards}
              stockRolls={stockRolls}
              stockMovements={stockMovements}
            />
          )}
          {currentView === 'planning' && (
            <PlanningDashboard orders={orders} isSuperAdmin={isSuperAdmin} />
          )}
          {currentView === 'production' && (
            <ProductionDashboard orders={orders} isSuperAdmin={isSuperAdmin} currentUser={userProfile} />
          )}
          {currentView === 'archive' && (
            <ArchiveDashboard orders={orders} isSuperAdmin={isSuperAdmin} />
          )}
          {currentView === 'admin' && <AdminDashboard />}
        </main>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}
