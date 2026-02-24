import React, { useState } from 'react';
import { X, RotateCw, RotateCcw, ArrowUp, ArrowDown, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

// 8 Sarım Yönü Pozisyonu
const WRAP_DIRECTIONS = [
  {
    id: 'POS1',
    category: 'outward',
    title: 'Dışa Sarım - Yazı Başı Önde',
    description: 'Rulodan dışa doğru, ABC düz okunur',
    icon: ArrowUp,
    color: 'blue',
    rotation: 0,
    imageUrl: 'https://customer-assets.emergentagent.com/job_labelflow-12/artifacts/8u33bkju_Gemini_Generated_Image_t18w3yt18w3yt18w.png'
  },
  {
    id: 'POS2',
    category: 'outward',
    title: 'Dışa Sarım - Yazı Sonu Önde',
    description: 'Rulodan dışa doğru, ABC ters (CBA)',
    icon: ArrowDown,
    color: 'blue',
    rotation: 180,
    imageUrl: 'https://customer-assets.emergentagent.com/job_labelflow-12/artifacts/u4ql49wf_yaz%C4%B1%20sonu.png'
  },
  {
    id: 'POS3',
    category: 'outward',
    title: 'Dışa Sarım - Sağ Taraf Önde',
    description: 'Rulodan dışa doğru, 90° sağa',
    icon: ArrowRight,
    color: 'blue',
    rotation: 90,
    imageUrl: null
  },
  {
    id: 'POS4',
    category: 'outward',
    title: 'Dışa Sarım - Sol Taraf Önde',
    description: 'Rulodan dışa doğru, 90° sola',
    icon: ArrowLeft,
    color: 'blue',
    rotation: -90,
    imageUrl: null
  },
  {
    id: 'POS5',
    category: 'inward',
    title: 'İçe Sarım - Yazı Başı Önde',
    description: 'Rulodan içe doğru, ABC düz okunur',
    icon: ArrowUp,
    color: 'purple',
    rotation: 0,
    imageUrl: null
  },
  {
    id: 'POS6',
    category: 'inward',
    title: 'İçe Sarım - Yazı Sonu Önde',
    description: 'Rulodan içe doğru, ABC ters (CBA)',
    icon: ArrowDown,
    color: 'purple',
    rotation: 180,
    imageUrl: null
  },
  {
    id: 'POS7',
    category: 'inward',
    title: 'İçe Sarım - Sağ Taraf Önde',
    description: 'Rulodan içe doğru, 90° sağa',
    icon: ArrowRight,
    color: 'purple',
    rotation: 90,
    imageUrl: null
  },
  {
    id: 'POS8',
    category: 'inward',
    title: 'İçe Sarım - Sol Taraf Önde',
    description: 'Rulodan içe doğru, 90° sola',
    icon: ArrowLeft,
    color: 'purple',
    rotation: -90,
    imageUrl: null
  }
];

export default function WrapDirectionModal({ onClose, currentDirection, onSelect }) {
  const [selected, setSelected] = useState(currentDirection || 'POS1');
  const [hoveredId, setHoveredId] = useState(null);

  const selectedItem = WRAP_DIRECTIONS.find(d => d.id === selected);

  const handleSelect = (id) => {
    setSelected(id);
  };

  const handleConfirm = () => {
    const direction = WRAP_DIRECTIONS.find(d => d.id === selected);
    // Icon'u çıkar (Firestore serialization için)
    const { icon, ...serializableDirection } = direction;
    onSelect(serializableDirection);
    onClose();
  };

  const outwardDirections = WRAP_DIRECTIONS.filter(d => d.category === 'outward');
  const inwardDirections = WRAP_DIRECTIONS.filter(d => d.category === 'inward');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <RotateCw size={28} />
              Etiket/Ambalaj Sarım Yönü Seçimi
            </h2>
            <p className="text-purple-100 text-sm mt-1">
              Üretim için doğru sarım yönünü seçin
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Dışa Sarım */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <RotateCw size={20} className="text-blue-600" />
              <h3 className="text-xl font-bold text-blue-900">DIŞA SARIM (Outward)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {outwardDirections.map((direction) => {
                const Icon = direction.icon;
                const isSelected = selected === direction.id;
                const isHovered = hoveredId === direction.id;

                return (
                  <button
                    key={direction.id}
                    onClick={() => handleSelect(direction.id)}
                    onMouseEnter={() => setHoveredId(direction.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`
                      relative p-6 rounded-xl border-4 transition-all duration-200
                      ${isSelected 
                        ? 'border-blue-600 bg-blue-50 shadow-lg scale-105' 
                        : isHovered
                        ? 'border-blue-300 bg-blue-50 shadow-md scale-102'
                        : 'border-gray-200 hover:border-blue-200 bg-white'
                      }
                    `}
                  >
                    {/* Seçim Onay İşareti */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                        <CheckCircle size={20} />
                      </div>
                    )}

                    {/* Icon Container */}
                    <div className="flex flex-col items-center gap-2">
                      <div className={`
                        w-40 h-40 rounded-xl flex items-center justify-center overflow-hidden
                        bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300
                      `}>
                        {/* Eğer imageUrl varsa görseli göster, yoksa placeholder */}
                        {direction.imageUrl ? (
                          <img 
                            src={direction.imageUrl} 
                            alt={direction.title}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="relative">
                            <RotateCw size={40} className="text-blue-600" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Icon 
                                size={24} 
                                className="text-blue-800"
                                style={{ transform: `rotate(${direction.rotation}deg)` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Başlık */}
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-800 leading-tight">
                          {direction.title.split(' - ')[1]}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* İçe Sarım */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw size={20} className="text-purple-600" />
              <h3 className="text-xl font-bold text-purple-900">İÇE SARIM (Inward)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {inwardDirections.map((direction) => {
                const Icon = direction.icon;
                const isSelected = selected === direction.id;
                const isHovered = hoveredId === direction.id;

                return (
                  <button
                    key={direction.id}
                    onClick={() => handleSelect(direction.id)}
                    onMouseEnter={() => setHoveredId(direction.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`
                      relative p-6 rounded-xl border-4 transition-all duration-200
                      ${isSelected 
                        ? 'border-purple-600 bg-purple-50 shadow-lg scale-105' 
                        : isHovered
                        ? 'border-purple-300 bg-purple-50 shadow-md scale-102'
                        : 'border-gray-200 hover:border-purple-200 bg-white'
                      }
                    `}
                  >
                    {/* Seçim Onay İşareti */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 bg-purple-600 text-white rounded-full p-1 shadow-lg">
                        <CheckCircle size={20} />
                      </div>
                    )}

                    {/* Icon Container */}
                    <div className="flex flex-col items-center gap-3">
                      <div className={`
                        w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden
                        bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-300
                      `}>
                        {/* Eğer imageUrl varsa görseli göster, yoksa placeholder */}
                        {direction.imageUrl ? (
                          <img 
                            src={direction.imageUrl} 
                            alt={direction.title}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="relative">
                            <RotateCcw size={40} className="text-purple-600" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Icon 
                                size={24} 
                                className="text-purple-800"
                                style={{ transform: `rotate(${direction.rotation}deg)` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Pozisyon Numarası */}
                      <div className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                        {direction.id}
                      </div>

                      {/* Başlık */}
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-800 leading-tight">
                          {direction.title.split(' - ')[1]}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seçim Bilgisi */}
          {selectedItem && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200">
              <div className="flex items-start gap-4">
                <div className={`
                  p-3 rounded-lg
                  ${selectedItem.category === 'outward' 
                    ? 'bg-blue-600' 
                    : 'bg-purple-600'
                  }
                `}>
                  <CheckCircle size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">Seçili Sarım Yönü:</div>
                  <div className="text-xl font-bold text-gray-900">{selectedItem.title}</div>
                  <div className="text-sm text-gray-600 mt-2">{selectedItem.description}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-2xl border-t-2 border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition shadow-lg flex items-center gap-2"
          >
            <CheckCircle size={20} />
            Seçimi Onayla
          </button>
        </div>
      </div>
    </div>
  );
}

// Export constants for use in other components
export { WRAP_DIRECTIONS };
