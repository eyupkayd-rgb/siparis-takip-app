import React, { useState } from 'react';
import { Scissors, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db, appId } from '../../services/firebase';
import { generateBarcode, logStockMovement } from '../../utils/stockHelpers';

export default function DilimlemeModal({ onClose, jumboRoll, onRefresh }) {
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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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

