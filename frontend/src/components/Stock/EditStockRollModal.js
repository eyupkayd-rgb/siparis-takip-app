import React, { useState } from 'react';
import { Edit3, X, Loader2, CheckCircle } from 'lucide-react';
import { updateDoc, doc } from "firebase/firestore";
import { db, appId } from '../../services/firebase';

export default function EditStockRollModal({ onClose, roll, suppliers, onRefresh }) {
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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
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

