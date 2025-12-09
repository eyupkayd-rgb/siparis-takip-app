import React, { useState, useRef } from 'react';
import { Paperclip, Plus, Loader2, X, FileText, Download } from 'lucide-react';
import { doc, updateDoc } from "firebase/firestore";
import { db, appId } from '../../services/firebase';

export default function AttachmentManager({ order, onAttachmentsChange, readOnly = false, compact = false }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);
  const attachments = order?.attachments || [];

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const maxSize = 450 * 1024;
    if (file.size > maxSize) {
      alert(`UYARI: Dosya boyutu çok büyük! (${(file.size / 1024).toFixed(0)}KB)\nLütfen ${(maxSize / 1024).toFixed(0)}KB altındaki dosyaları yükleyin.`);
      if(fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const newFile = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        data: reader.result,
        uploadedAt: new Date().toLocaleString('tr-TR')
      };
      
      const newAttachments = [...(order?.attachments || []), newFile];

      if (order && order.id && !onAttachmentsChange) {
        try {
          await updateDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id),
            { attachments: newAttachments }
          );
        } catch (error) {
          console.error("File upload error:", error);
          alert("Yükleme hatası");
        }
      } else if (onAttachmentsChange) {
        onAttachmentsChange(newAttachments);
      }
      
      setIsUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    };
    
    reader.onerror = () => {
      alert("Dosya okunamadı");
      setIsUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Dosyayı silmek istediğinize emin misiniz?")) return;
    
    const newAttachments = attachments.filter(f => f.id !== fileId);
    
    if (order && order.id && !onAttachmentsChange) {
      try {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id),
          { attachments: newAttachments }
        );
      } catch (error) {
        console.error("Delete error:", error);
      }
    } else if (onAttachmentsChange) {
      onAttachmentsChange(newAttachments);
    }
  };

  return (
    <div className={`bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border-2 border-slate-200 ${compact ? 'p-3' : 'p-5'} mt-4 transition-all duration-200 hover:border-slate-300`}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <Paperclip size={18} className="text-slate-600" />
          <span className="text-sm">Dosya Ekleri</span>
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
            {attachments?.length || 0}
          </span>
        </h4>
        
        {!readOnly && (
          <label className="cursor-pointer bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow">
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Yükleniyor...
              </>
            ) : (
              <>
                <Plus size={14} />
                Dosya Ekle
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        )}
      </div>
      
      {attachments && attachments.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachments.map(file => (
            <div
              key={file.id}
              className="relative group bg-white p-2 rounded-lg border-2 border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
            >
              <div
                className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden mb-2 group-hover:scale-105 transition-transform duration-200"
                onClick={() => setPreviewFile(file)}
              >
                {file.type.includes('image') ? (
                  <img
                    src={file.data}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText size={32} className="text-red-500 opacity-70" />
                )}
              </div>
              
              <div
                className="text-[10px] font-medium truncate text-slate-700 mb-1"
                title={file.name}
              >
                {file.name}
              </div>
              
              {!readOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:scale-110"
                  title="Sil"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/50">
          <Paperclip size={32} className="mx-auto mb-2 opacity-30" />
          <p className="italic">Henüz dosya eklenmemiş</p>
        </div>
      )}
      
      {previewFile && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-100 to-gray-100 border-b-2">
              <h3 className="font-bold text-slate-800 truncate flex-1">
                {previewFile.name}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50 p-4 flex items-center justify-center">
              {previewFile.type.includes('image') ? (
                <img
                  src={previewFile.data}
                  alt="Preview"
                  className="max-w-full max-h-[80vh] object-contain shadow-xl rounded-lg"
                />
              ) : (
                <iframe
                  src={previewFile.data}
                  className="w-full h-[80vh] border-2 rounded-lg shadow-xl"
                  title="PDF Preview"
                ></iframe>
              )}
            </div>
            
            <div className="p-4 bg-gradient-to-r from-slate-100 to-gray-100 border-t-2 flex justify-end gap-2">
              <a
                href={previewFile.data}
                download={previewFile.name}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Download size={16} />
                İndir
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
