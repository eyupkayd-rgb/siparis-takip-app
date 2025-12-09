import React, { useState } from 'react';
import { Plus, Sparkles, MessageSquare, Loader2, Edit3, Trash2, Search, Grid, List, Building2 } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db, appId } from '../../services/firebase';
import { callGemini } from '../../services/gemini';
import StatusBadge from '../shared/StatusBadge';
import AttachmentManager from '../shared/AttachmentManager';

export default function MarketingDashboard({ orders, isSuperAdmin, customerCards }) {
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  // Otomatik sipariş numarası oluştur
  const generateNextOrderNo = () => {
    if (orders.length === 0) return 'SP-0588';
    
    const orderNumbers = orders
      .map(o => o.orderNo)
      .filter(no => no && no.startsWith('SP-'))
      .map(no => parseInt(no.split('-')[1]))
      .filter(num => !isNaN(num));
    
    if (orderNumbers.length === 0) return 'SP-0588';
    
    const maxNum = Math.max(...orderNumbers);
    const nextNum = maxNum + 1;
    return `SP-${nextNum.toString().padStart(4, '0')}`;
  };
  
  const [formData, setFormData] = useState({
    orderNo: '', customer: '', product: '', category: 'Etiket', type: 'Yeni',
    rawMaterial: '', qAmount: '', qUnit: 'Adet', sheetStatus: '', 
    customerDeadline: '', attachments: [],
    isComplex: false, isSet: false, commonBack: false, variants: [],
    notes: '' // Not alanı eklendi
  });

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };
  
  // Textarea otomatik boyutlandırma
  const autoResizeTextarea = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
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
      const nextOrderNo = generateNextOrderNo();
      setFormData({
        orderNo: nextOrderNo, customer: '', product: '', category: 'Etiket', type: 'Yeni',
        rawMaterial: '', qAmount: '', qUnit: 'Adet', sheetStatus: '', 
        customerDeadline: '', attachments: [],
        isComplex: false, isSet: false, commonBack: false, variants: [],
        notes: ''
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
      variants: order.variants || [],
      notes: order.notes || ''
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
      {showCustomerModal && (
        <CustomerCardModal
          onClose={() => setShowCustomerModal(false)}
          customers={customerCards || []}
          onRefresh={() => {}}
        />
      )}

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
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowCustomerModal(true)}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2"
          >
            <Building2 size={18} />
            Müşteri Kartları
          </button>
          
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              const nextOrderNo = generateNextOrderNo();
              setFormData({
                orderNo: nextOrderNo, customer: '', product: '', category: 'Etiket', type: 'Yeni',
                rawMaterial: '', qAmount: '', qUnit: 'Adet', sheetStatus: '', 
                customerDeadline: '', attachments: [],
                isComplex: false, isSet: false, commonBack: false, variants: [],
                notes: ''
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
                <label className="label">Sipariş No {!editingId && <span className="text-xs text-green-600">(Otomatik)</span>}</label>
                <input
                  required
                  placeholder="Örn: SP-0588"
                  className="input-field bg-gray-50"
                  value={formData.orderNo}
                  readOnly={!editingId}
                  onChange={e => editingId && setFormData({...formData, orderNo: e.target.value})}
                />
              </div>
              
              <div>
                <label className="label">Firma Adı *</label>
                {customerCards && customerCards.length > 0 ? (
                  <select
                    required
                    className="input-field"
                    value={formData.customer}
                    onChange={e => setFormData({...formData, customer: e.target.value})}
                  >
                    <option value="">-- Müşteri Seçin --</option>
                    {customerCards.map(customer => (
                      <option key={customer.id} value={customer.name}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      required
                      placeholder="Müşteri firma adı"
                      className="input-field bg-yellow-50"
                      value={formData.customer}
                      onChange={e => setFormData({...formData, customer: e.target.value})}
                    />
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ Henüz müşteri kartı yok. Yukarıdan "Müşteri Kartları" butonuna tıklayarak ekleyin.
                    </p>
                  </div>
                )}
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
                  <div key={index} className="grid grid-cols-12 gap-2 items-start bg-white p-3 rounded-lg border border-purple-200">
                    <span className="text-sm font-bold text-purple-600 pt-2 col-span-1">
                      {index + 1}.
                    </span>
                    <textarea
                      required
                      placeholder="Varyant Adı (Örn: Elma, Portakal)"
                      className="input-field resize-none overflow-hidden col-span-9"
                      style={{ minHeight: '42px' }}
                      rows="1"
                      value={variant.name}
                      onChange={e => {
                        handleVariantChange(index, 'name', e.target.value);
                        autoResizeTextarea(e);
                      }}
                      onInput={autoResizeTextarea}
                    />
                    <input
                      required
                      type="number"
                      placeholder="Adet"
                      className="input-field col-span-1"
                      value={variant.quantity}
                      onChange={e => handleVariantChange(index, 'quantity', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors col-span-1"
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-3">
                  <label className="label">Ürün Adı</label>
                  <textarea
                    required
                    placeholder="Ürün ismi"
                    className="input-field resize-none overflow-hidden"
                    style={{ minHeight: '42px' }}
                    rows="1"
                    value={formData.product}
                    onChange={e => {
                      setFormData({...formData, product: e.target.value});
                      autoResizeTextarea(e);
                    }}
                    onInput={autoResizeTextarea}
                  />
                </div>
                
                <div className="md:col-span-2">
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
                      className="input-field w-auto px-2 bg-gray-50 text-sm"
                      style={{ width: 'fit-content', minWidth: '70px' }}
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

            {/* Notes Field */}
            <div>
              <label className="label">Notlar (Opsiyonel)</label>
              <textarea
                className="input-field"
                rows="3"
                placeholder="Önemli detaylar, özel talepler veya notlar..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
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
              <th className="p-4 font-bold w-32">Sipariş No</th>
              <th className="p-4 font-bold">Müşteri</th>
              <th className="p-4 font-bold">Ürün</th>
              <th className="p-4 font-bold w-40">Miktar</th>
              <th className="p-4 font-bold w-28">Tip</th>
              <th className="p-4 font-bold w-32">Termin</th>
              <th className="p-4 font-bold w-32">Planlama</th>
              <th className="p-4 font-bold w-36">Durum</th>
              <th className="p-4 font-bold text-right w-28">İşlem</th>
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
                  {order.planningData?.startDate ? (
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-semibold text-green-700">
                        📅 {order.planningData.startDate}
                      </div>
                      {order.planningData.startHour && (
                        <div className="text-[10px] text-gray-500">
                          🕐 {order.planningData.startHour}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Planlanmadı</span>
                  )}
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
// Main Application Component
// ============================================================================

