import React, { useState } from 'react';
import { Building2, X, Plus, User, CreditCard, Phone, MapPin, Mail, Edit3, Trash2, Loader2 } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db, appId } from '../../services/firebase';

export default function CustomerCardModal({ onClose, customers, onRefresh }) {
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
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'customer_cards', editingId),
          {
            ...formData,
            updatedAt: new Date().toISOString()
          }
        );
        alert('✅ Müşteri kartı güncellendi!');
      } else {
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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Building2 className="text-white" size={28} />
            <h2 className="text-2xl font-bold text-white">Müşteri Kartları</h2>
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
                            {customer.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail size={16} />
                                <span>{customer.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition"
                            title="Düzenle"
                          >
                            <Edit3 size={16} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition"
                            title="Sil"
                          >
                            <Trash2 size={16} className="text-red-600" />
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
              <div>
                <label className="label">Firma Adı *</label>
                <input
                  required
                  type="text"
                  className="input-field"
                  placeholder="ABC Şirketi A.Ş."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Vergi Kimlik No</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="1234567890"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Şehir</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="İstanbul"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="label">İlgili Kişi</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ahmet Yılmaz"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="0532 123 45 67"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="info@firma.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Kaydediliyor...
                    </>
                  ) : (
                    editingId ? 'Güncelle' : 'Kaydet'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ name: '', taxId: '', city: '', contactPerson: '', phone: '', email: '' });
                  }}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition"
                >
                  İptal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}