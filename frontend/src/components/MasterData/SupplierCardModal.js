import React, { useState } from 'react';
import { Database, X, Plus, CreditCard, User, Phone, Mail, Edit3, Trash2, Loader2, Truck, CheckCircle } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db, appId } from '../../services/firebase';

export default function SupplierCardModal({ onClose, suppliers, onRefresh }) {
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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-teal-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Truck className="text-white" size={28} />
            <h2 className="text-2xl font-bold text-white">Tedarikçi Kartları</h2>
          </div>
          <button
            type="button"
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

