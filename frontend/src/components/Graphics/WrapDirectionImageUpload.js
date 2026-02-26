import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Check, Crop, Trash2, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import Cropper from 'react-easy-crop';

function getCroppedImg(imageSrc, pixelCrop) {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height
      );
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    image.src = imageSrc;
  });
}

export default function WrapDirectionImageUpload({ currentImage, onImageChange }) {
  const [showCropper, setShowCropper] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fileInputRef = useRef(null);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir görsel dosyası seçin.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    const croppedBase64 = await getCroppedImg(rawImage, croppedAreaPixels);
    onImageChange(croppedBase64);
    setShowCropper(false);
    setRawImage(null);
  };

  const handleRemove = () => {
    onImageChange(null);
  };

  return (
    <div className="col-span-2" data-testid="wrap-direction-upload">
      <label className="label mb-2">Sarım Yönü Görseli</label>

      {currentImage ? (
        <div className="relative group border-2 border-blue-300 rounded-xl overflow-hidden bg-blue-50 inline-block">
          <img
            src={currentImage}
            alt="Sarım Yönü"
            className="max-h-48 w-auto object-contain"
            data-testid="wrap-direction-preview"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-blue-700 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow-lg"
              data-testid="wrap-direction-change-btn"
            >
              <Crop size={16} /> Değiştir
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="bg-white text-red-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow-lg"
              data-testid="wrap-direction-remove-btn"
            >
              <Trash2 size={16} /> Kaldır
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-8 flex flex-col items-center gap-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
          data-testid="wrap-direction-upload-btn"
        >
          <div className="bg-gray-100 p-4 rounded-full">
            <Upload size={28} />
          </div>
          <span className="font-bold text-sm">Sarım Yönü Görseli Yükle</span>
          <span className="text-xs text-gray-400">PNG, JPG (max 5MB)</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Crop Modal */}
      {showCropper && rawImage && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Crop size={20} />
                Görseli Kırp
              </h3>
              <button
                type="button"
                onClick={() => { setShowCropper(false); setRawImage(null); }}
                className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative w-full h-[400px] bg-gray-900">
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="p-4 flex items-center gap-4 border-t border-gray-200">
              <ZoomOut size={18} className="text-gray-500" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <ZoomIn size={18} className="text-gray-500" />
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowCropper(false); setRawImage(null); }}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition shadow-lg flex items-center gap-2"
                data-testid="wrap-direction-crop-confirm"
              >
                <Check size={18} />
                Kırp ve Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
