import React, { useState } from 'react';
import { Lock, Loader2, Mail } from 'lucide-react';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut 
} from "firebase/auth";
import { collection, doc, setDoc } from "firebase/firestore";
import { auth, db, appId, SUPER_ADMIN_EMAILS } from '../../services/firebase';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login error:", error);
      if (error.code === 'auth/wrong-password') {
        setError('Hatalı şifre.');
      } else if (error.code === 'auth/user-not-found') {
        setError('Bu email ile kayıtlı kullanıcı bulunamadı.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Geçersiz email adresi.');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Hatalı email veya şifre.');
      } else {
        setError('Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
      }
    }
    setIsLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email);
      const newProfile = {
        email: email,
        role: isSuperAdmin ? 'super_admin' : 'marketing',
        station: null,
        approved: isSuperAdmin,
        createdAt: new Date().toISOString(),
        displayName: email.split('@')[0]
      };
      
      const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userCredential.user.uid);
      await setDoc(userDocRef, newProfile);
      
      if (!isSuperAdmin) {
        await signOut(auth);
        setSuccessMessage('Kayıt başarılı! Hesabınız admin onayı bekliyor. Onaylandıktan sonra giriş yapabileceksiniz.');
        setMode('login');
        return;
      }
    } catch (error) {
      console.error("Register error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Bu email adresi zaten kullanılıyor.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Geçersiz email adresi.');
      } else if (error.code === 'auth/weak-password') {
        setError('Şifre çok zayıf. Daha güçlü bir şifre seçin.');
      } else {
        setError('Kayıt yapılamadı. Lütfen tekrar deneyin.');
      }
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Şifre sıfırlama linki email adresinize gönderildi.');
      setEmail('');
    } catch (error) {
      console.error("Forgot password error:", error);
      if (error.code === 'auth/user-not-found') {
        setError('Bu email ile kayıtlı kullanıcı bulunamadı.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Geçersiz email adresi.');
      } else {
        setError('İşlem başarısız. Lütfen tekrar deneyin.');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="text-white" size={40} />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {mode === 'login' ? 'Giriş Yap' : mode === 'register' ? 'Kayıt Ol' : 'Şifremi Unuttum'}
          </h2>
          <p className="text-gray-500 text-sm mt-2">Bulut Üretim Takip Sistemi</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {successMessage}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  className="input-field pl-10"
                  placeholder="ornek@firma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Şifre</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin inline mr-2" size={20} />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
            <div className="text-center space-y-2 text-sm">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Şifremi unuttum
              </button>
              <div className="text-gray-500">
                Hesabınız yok mu?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-purple-600 hover:text-purple-800 font-bold"
                >
                  Kayıt Ol
                </button>
              </div>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  className="input-field pl-10"
                  placeholder="ornek@firma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Şifre</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Şifre Tekrar</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="Şifrenizi tekrar girin"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin inline mr-2" size={20} />
                  Kayıt yapılıyor...
                </>
              ) : (
                'Kayıt Ol'
              )}
            </button>
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Giriş sayfasına dön
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  className="input-field pl-10"
                  placeholder="ornek@firma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Şifre sıfırlama linki email adresinize gönderilecektir.
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin inline mr-2" size={20} />
                  Gönderiliyor...
                </>
              ) : (
                'Link Gönder'
              )}
            </button>
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Giriş sayfasına dön
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}