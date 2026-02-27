import React, { useState, useEffect } from 'react';
import { Users, Loader2, Edit3, Trash2, Check, Ban, AlertCircle, Database, Plus, UserPlus, X } from 'lucide-react';
import { collection, getDocs, updateDoc, deleteDoc, doc, addDoc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { db, appId, SUPER_ADMIN_EMAILS } from '../../services/firebase';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Operatör yönetimi state
  const [operators, setOperators] = useState([]);
  const [newOperatorName, setNewOperatorName] = useState('');
  const [isAddingOperator, setIsAddingOperator] = useState(false);

  // Migration: user_roles → users collection
  const handleMigrateUsers = async () => {
    if (!window.confirm('Eski kullanıcıları (user_roles) yeni sisteme (users) aktarmak istediğinizden emin misiniz?')) return;
    
    setIsMigrating(true);
    try {
      // Eski user_roles collection'ını oku
      const userRolesRef = collection(db, 'artifacts', appId, 'public', 'data', 'user_roles');
      const userRolesSnapshot = await getDocs(userRolesRef);
      
      let migratedCount = 0;
      
      for (const docSnap of userRolesSnapshot.docs) {
        const oldUserData = docSnap.data();
        const uid = docSnap.id;
        
        // Yeni users collection'ında kontrol et
        const newUserRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', uid);
        const newUserDoc = await getDoc(newUserRef);
        
        if (!newUserDoc.exists()) {
          // Yeni formatta kullanıcı oluştur
          // Eski rol mapping: graphics, marketing, warehouse, planning, production
          let mappedRole = oldUserData.role || 'marketing';
          
          // Eski sistemdeki roller ile yeni sistem arasında mapping
          if (!['marketing', 'graphics', 'warehouse', 'planning', 'production', 'archive'].includes(mappedRole)) {
            mappedRole = 'marketing'; // Bilinmeyen roller için default
          }
          
          const newUserData = {
            email: oldUserData.email,
            role: SUPER_ADMIN_EMAILS.includes(oldUserData.email) ? 'super_admin' : mappedRole,
            station: null,
            approved: true, // Eski kullanıcılar otomatik onaylı
            createdAt: oldUserData.createdAt || new Date().toISOString(),
            displayName: oldUserData.email?.split('@')[0] || 'User',
            // Eski rol bilgisini not olarak sakla
            oldRole: oldUserData.role
          };
          
          await setDoc(newUserRef, newUserData);
          migratedCount++;
        }
      }
      
      alert(`Migration tamamlandı! ${migratedCount} kullanıcı aktarıldı.`);
    } catch (error) {
      console.error("Migration error:", error);
      alert('Migration hatası: ' + error.message);
    }
    setIsMigrating(false);
  };

  // Role options (Departmanlar)
  const roles = [
    { id: 'super_admin', name: '👑 Super Admin', color: 'bg-red-100 text-red-800' },
    { id: 'marketing', name: '🔵 Pazarlama', color: 'bg-blue-100 text-blue-800' },
    { id: 'graphics', name: '🟠 Grafik', color: 'bg-orange-100 text-orange-800' },
    { id: 'warehouse', name: '🟣 Depo', color: 'bg-indigo-100 text-indigo-800' },
    { id: 'planning', name: '🟢 Planlama', color: 'bg-green-100 text-green-800' },
    { id: 'production', name: '🔷 Üretim', color: 'bg-teal-100 text-teal-800' },
    { id: 'archive', name: '🟡 Arşiv', color: 'bg-purple-100 text-purple-800' }
  ];

  // Station options (Sadece Üretim için)
  const stations = [
    { id: 'bobst_m1', name: 'Bobst M1 Operatörü (Etiket)' },
    { id: 'bobst_m1_ambalaj', name: 'Bobst M1 Operatörü (Ambalaj)' },
    { id: 'hibrit', name: 'Hibrit Operatörü' },
    { id: 'muhürleme', name: 'Mühürleme' },
    { id: 'etiket_qc', name: 'Kalite Kontrol (Etiket)' },
    { id: 'sleeve_qc', name: 'Sleeve Kalite Kontrol' },
    { id: 'tabakalama', name: 'Tabakalama' }
  ];

  // Fetch users
  useEffect(() => {
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setUsers(usersList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch operators
  useEffect(() => {
    const operatorsRef = collection(db, 'artifacts', appId, 'public', 'data', 'operators');
    const unsubscribe = onSnapshot(operatorsRef, (snapshot) => {
      const opList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      opList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
      setOperators(opList);
    });
    return () => unsubscribe();
  }, []);

  const handleAddOperator = async () => {
    const name = newOperatorName.trim();
    if (!name) return;
    if (operators.some(op => op.name.toLowerCase() === name.toLowerCase())) {
      alert('Bu operatör zaten mevcut.');
      return;
    }
    setIsAddingOperator(true);
    try {
      const operatorsRef = collection(db, 'artifacts', appId, 'public', 'data', 'operators');
      await addDoc(operatorsRef, { name, createdAt: new Date().toISOString() });
      setNewOperatorName('');
    } catch (error) {
      alert('Hata: ' + error.message);
    }
    setIsAddingOperator(false);
  };

  const handleDeleteOperator = async (opId, opName) => {
    if (!window.confirm(`"${opName}" operatörünü silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'operators', opId));
    } catch (error) {
      alert('Silme hatası: ' + error.message);
    }
  };

  const handleApprove = async (uid) => {
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', uid);
      await updateDoc(userRef, { approved: true });
      alert('Kullanıcı onaylandı!');
    } catch (error) {
      console.error("Approve error:", error);
      alert('Hata: ' + error.message);
    }
  };

  const handleReject = async (uid) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', uid);
      await deleteDoc(userRef);
      alert('Kullanıcı silindi.');
    } catch (error) {
      console.error("Delete error:", error);
      alert('Hata: ' + error.message);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', selectedUser.uid);
      const updateData = {
        role: selectedUser.role
      };
      
      // Sadece production rolündeyse istasyon ata
      if (selectedUser.role === 'production') {
        updateData.station = selectedUser.station;
      } else {
        updateData.station = null; // Diğer departmanlarda istasyon yok
      }
      
      await updateDoc(userRef, updateData);
      alert('Kullanıcı güncellendi!');
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Update error:", error);
      alert('Hata: ' + error.message);
    }
  };

  const pendingUsers = users.filter(u => !u.approved);
  const approvedUsers = users.filter(u => u.approved);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
            Kullanıcı Yönetimi
          </h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Kullanıcı onayları ve istasyon atamaları
          </p>
        </div>
        <button
          onClick={handleMigrateUsers}
          disabled={isMigrating}
          className="px-3 md:px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-all flex items-center gap-2 text-xs md:text-sm"
        >
          {isMigrating ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Migration...
            </>
          ) : (
            <>
              <Database size={16} />
              <span className="hidden sm:inline">Eski Kullanıcıları Güncelle</span>
              <span className="sm:hidden">Güncelle</span>
            </>
          )}
        </button>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
            <AlertCircle size={24} />
            Onay Bekleyen Kullanıcılar ({pendingUsers.length})
          </h3>
          <div className="space-y-3">
            {pendingUsers.map(user => (
              <div key={user.uid} className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-800">{user.email}</div>
                  <div className="text-xs text-gray-500">
                    Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(user.uid)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                  >
                    <Check size={16} />
                    Onayla
                  </button>
                  <button
                    onClick={() => handleReject(user.uid)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                  >
                    <Ban size={16} />
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Users */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={24} />
          Onaylı Kullanıcılar ({approvedUsers.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">İstasyon</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Kayıt Tarihi</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {approvedUsers.map(user => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                      roles.find(r => r.id === user.role)?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {roles.find(r => r.id === user.role)?.name || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.station ? (
                      <span className="text-green-700 font-semibold">
                        {stations.find(s => s.id === user.station)?.name || user.station}
                      </span>
                    ) : (
                      <span className="text-gray-400">Atanmadı</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all"
                        title="Düzenle"
                      >
                        <Edit3 size={14} />
                      </button>
                      {!SUPER_ADMIN_EMAILS.includes(user.email) && (
                        <button
                          onClick={() => handleReject(user.uid)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Kullanıcı Düzenle</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Kullanıcı: <strong>{selectedUser.email}</strong>
                </p>
              </div>
              
              {/* Rol Seçimi */}
              <div>
                <label className="label">Departman / Rol</label>
                <select
                  className="input-field"
                  value={selectedUser.role || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value, station: null })}
                  disabled={SUPER_ADMIN_EMAILS.includes(selectedUser.email)}
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                {SUPER_ADMIN_EMAILS.includes(selectedUser.email) && (
                  <p className="text-xs text-gray-500 mt-1">Super Admin rolü değiştirilemez</p>
                )}
              </div>
              
              {/* İstasyon Seçimi (Sadece Üretim için) */}
              {selectedUser.role === 'production' && (
                <div>
                  <label className="label">İstasyon (Üretim İçin)</label>
                  <select
                    className="input-field"
                    value={selectedUser.station || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, station: e.target.value })}
                  >
                    <option value="">İstasyon Seçiniz</option>
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>{station.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Üretim departmanında istasyon ataması zorunludur</p>
                </div>
              )}
              
              {selectedUser.role !== 'production' && selectedUser.role !== 'super_admin' && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    Bu departmanda istasyon ataması yapılmaz. Kullanıcı sadece <strong>{roles.find(r => r.id === selectedUser.role)?.name}</strong> modülüne erişebilir.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateUser}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all"
              >
                Kaydet
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition-all"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


