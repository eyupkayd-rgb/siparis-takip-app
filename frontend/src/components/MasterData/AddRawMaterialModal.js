import React, { useState } from 'react';
import { PackagePlus, X, Loader2 } from 'lucide-react';
import { collection, addDoc } from "firebase/firestore";
import { db, appId } from '../../services/firebase';
import { generateBarcode, logStockMovement } from '../../utils/stockHelpers';

export default function AddRawMaterialModal({ onClose, suppliers, rawMaterialsList, onRefresh }) {
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

