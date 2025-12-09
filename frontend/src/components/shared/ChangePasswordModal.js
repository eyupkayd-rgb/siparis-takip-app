import React, { useState } from 'react';
import { X, Key, Loader2 } from 'lucide-react';
import { auth } from '../../services/firebase';
import { 
  updatePassword, reauthenticateWithCredential, EmailAuthProvider 
} from "firebase/auth";

export default function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const user = auth.currentUser;
    
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      alert("Şifreniz başarıyla güncellendi!");
      onClose();
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/wrong-password') {
        alert("Mevcut şifrenizi yanlış girdiniz.");
      } else if (error.code === 'auth/weak-password') {
        alert("Yeni şifre çok zayıf. En az 6 karakter olmalı.");
      } else {
        alert("Hata: " + error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl relative transform transition-all">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Key className="text-blue-600" size={24} />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Şifre Değiştir</h3>
        </div>
        
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Mevcut Şifre</label>
            <input
              required
              type="password"
              className="input-field"
              placeholder="Mevcut şifreniz"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>
          
          <div>
            <label className="label">Yeni Şifre</label>
            <input
              required
              type="password"
              className="input-field"
              placeholder="Yeni şifreniz (En az 6 karakter)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          
          <button 
            disabled={loading} 
            type="submit" 
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin inline mr-2" size={20} />
                Güncelleniyor...
              </>
            ) : (
              'Şifreyi Güncelle'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
