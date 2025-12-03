import React, { useState, useEffect } from 'react';
import { User, Printer, Calendar, CheckCircle, Clock, Plus, Package, Layout, Palette, Settings, ArrowRight, LogOut, Loader2, Archive, Truck, ClipboardCheck, AlertTriangle, ChevronLeft, ChevronRight, Grid, List, Layers, Calculator, Search, FileText, X, Pen, Sparkles, MessageSquare, Download } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, addDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

// ==========================================================================================
// ⚠️ ÖNEMLİ: BURAYI KENDİ BİLGİLERİNİZLE DOLDURUNUZ
// ==========================================================================================

// 1. ADIM: Google AI Studio API Key (Environment Variable - Güvenlik İyileştirmesi)
const apiKey = process.env.REACT_APP_GEMINI_API_KEY || ""; 

// 2. ADIM: Firebase Ayarları (Orijinal Projeden)
const myLocalFirebaseConfig = {
  apiKey: "AIzaSyAThI1hzjCjr_g9KbI1VPaJgCUz995CmTM",
  authDomain: "bizim-uretim-takip.firebaseapp.com",
  projectId: "bizim-uretim-takip",
  storageBucket: "bizim-uretim-takip.firebasestorage.app",
  messagingSenderId: "71742965986",
  appId: "1:71742965986:web:8b0dfdce38d43243adf6bb",
  measurementId: "G-XRD6ZR3BDP"
};

let firebaseConfig = myLocalFirebaseConfig;
let appId = "siparis-takip-app";

// Önizleme ortamı kontrolü
try {
  if (typeof window !== 'undefined') {
    if (typeof window.__firebase_config !== 'undefined') {
      firebaseConfig = JSON.parse(window.__firebase_config);
    }
    if (typeof window.__app_id !== 'undefined') {
      appId = window.__app_id;
    }
  }
} catch (error) {
  console.warn("Firebase config parse warning:", error);
}

// ==========================================================================================

// Firebase Başlatma (İyileştirilmiş)
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// --- GEMINI API FONKSİYONU (İyileştirilmiş) ---
async function callGemini(prompt) {
  if (!apiKey) {
    console.warn("Gemini API key not configured");
    return "API anahtarı yapılandırılmamış. .env.local dosyasına REACT_APP_GEMINI_API_KEY ekleyin.";
  }
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) throw new Error("API Hatası");
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt alınamadı.";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Yapay zeka bağlantısında hata oluştu.";
  }
}

export default function OrderApp() {
  const [orders, setOrders] = useState([]);
  const [userRole, setUserRole] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    if (!auth) {
        // Auth nesnesi oluşmadıysa (config hatası varsa)
        setConfigError(true);
        setLoading(false);
        return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Oturum açma hatası:", error);
        setLoading(false); 
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if(currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const ordersCollection = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubscribe = onSnapshot(ordersCollection, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedOrders.sort((a, b) => {
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Veri çekme hatası:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  if (configError) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-red-50 p-4 text-center">
              <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
                  <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Kurulum Tamamlanmadı</h2>
                  <p className="text-gray-600 mb-4">
                      Firebase ayarları yapılandırılmamış veya hatalı.
                  </p>
                  <div className="text-sm text-left bg-gray-100 p-4 rounded border border-gray-300 overflow-auto max-h-40">
                      <p className="font-bold mb-1">Çözüm (VS Code):</p>
                      <p>Kodun başındaki <code>firebaseConfig</code> bölümüne Firebase konsolundan aldığınız bilgileri yapıştırın.</p>
                      <br/>
                      <p className="font-bold mb-1">Önizleme Hatası:</p>
                      <p>Eğer bu hatayı önizleme ekranında alıyorsanız sayfayı yenileyin.</p>
                  </div>
              </div>
          </div>
      );
  }

  if (!userRole) {
    return <LoginScreen onLogin={setUserRole} loading={loading} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-2 rounded-lg"><Package size={20} /></div>
          <h1 className="text-xl font-bold text-gray-800">Üretim Takip v5.0</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            <User size={16} /><span>Giriş: {roleNames[userRole]}</span>
          </div>
          <button onClick={() => setUserRole(null)} className="flex items-center gap-1 text-gray-500 hover:text-red-600 transition-colors text-sm">
            <LogOut size={16} /> Çıkış
          </button>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto p-4 md:p-6">
        {userRole === 'marketing' && <MarketingDashboard orders={orders} />}
        {userRole === 'graphics' && <GraphicsDashboard orders={orders} />}
        {userRole === 'warehouse' && <WarehouseDashboard orders={orders} />}
        {userRole === 'planning' && <PlanningDashboard orders={orders} />}
        {userRole === 'archive' && <ArchiveDashboard orders={orders} />}
      </main>
    </div>
  );
}

const roleNames = { marketing: "Pazarlama Departmanı", graphics: "Grafik Tasarım", warehouse: "Depo ve Lojistik", planning: "Üretim Planlama", archive: "Arşiv ve Raporlama" };

function LoginScreen({ onLogin, loading }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            {loading ? <Loader2 className="animate-spin text-blue-600" size={32} /> : <Package size={32} className="text-blue-600" />}
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Bulut Takip Sistemi</h2>
          <p className="text-gray-500">{loading ? "Veritabanına bağlanılıyor..." : "Lütfen departmanınızı seçiniz"}</p>
        </div>
        {!loading && (
          <div className="grid grid-cols-1 gap-3">
            <RoleButton onClick={() => onLogin('marketing')} icon={<User />} color="blue" title="Pazarlama" desc="Sipariş Girişi" />
            <RoleButton onClick={() => onLogin('graphics')} icon={<Palette />} color="orange" title="Grafik" desc="Teknik Detaylar" />
            <RoleButton onClick={() => onLogin('warehouse')} icon={<Archive />} color="indigo" title="Depo" desc="Hammadde & Sevkiyat" />
            <RoleButton onClick={() => onLogin('planning')} icon={<Calendar />} color="green" title="Planlama" desc="Üretim Takvimi" />
            <RoleButton onClick={() => onLogin('archive')} icon={<FileText />} color="purple" title="Arşiv" desc="Geçmiş ve Raporlar" />
          </div>
        )}
      </div>
    </div>
  );
}

function RoleButton({ onClick, icon, color, title, desc }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200",
    orange: "bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200",
    indigo: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200",
    green: "bg-green-50 text-green-600 hover:bg-green-100 border-green-200",
    purple: "bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200",
  };
  return (
    <button onClick={onClick} className={`w-full flex items-center p-4 border rounded-xl transition-all group ${colorClasses[color]}`}>
      <div className={`p-2 rounded-lg mr-4 bg-white shadow-sm`}>{React.cloneElement(icon, { size: 20 })}</div>
      <div className="text-left"><div className="font-bold text-gray-800">{title}</div><div className="text-xs opacity-70">{desc}</div></div>
      <ArrowRight className="ml-auto opacity-50 group-hover:opacity-100" size={16} />
    </button>
  );
}

function MarketingDashboard({ orders }) {
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ orderNo: '', customer: '', product: '', type: 'Yeni', rawMaterial: '', qAmount: '', qUnit: 'Adet', customerDeadline: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ordersCollection = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
      const finalQuantity = `${formData.qAmount} ${formData.qUnit}`;
      await addDoc(ordersCollection, { ...formData, quantity: finalQuantity, status: 'graphics_pending', graphicsData: null, warehouseData: null, planningData: null, createdAt: new Date().toISOString() });
      setShowForm(false);
      setFormData({ orderNo: '', customer: '', product: '', type: 'Yeni', rawMaterial: '', qAmount: '', qUnit: 'Adet', customerDeadline: '' });
    } catch (error) { alert("Hata: " + error.message); }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div><h2 className="text-2xl font-bold text-gray-800">Sipariş Yönetimi</h2><p className="text-gray-500">Yeni sipariş oluşturun ve durumlarını takip edin.</p></div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">{showForm ? 'Listeye Dön' : <><Plus size={18} /> Yeni Sipariş Gir</>}</button>
      </div>
      {showForm ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Sipariş No" className="input-field" value={formData.orderNo} onChange={e => setFormData({...formData, orderNo: e.target.value})} />
            <input required placeholder="Firma Adı" className="input-field" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} />
            <input required placeholder="Ürün Adı" className="input-field" value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} />
            <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>Yeni</option><option>Tekrar</option><option>Numune</option></select>
            
            <select className="input-field" value={formData.rawMaterial} onChange={e => setFormData({...formData, rawMaterial: e.target.value})}>
              <option value="" disabled>Hammadde Seçin</option>
              <option>PP OPAK SARI PERGAMİN</option><option>PP OPAK BEYAZ PERGAMİN</option><option>PP OPAK PET</option><option>KUŞE SARI PERGAMİN</option><option>KUŞE BEYAZ PERGAMİN</option><option>KUŞE PET</option><option>KUŞE MAT</option><option>PP METALİZE GOLD</option><option>PP METALİZE SİLVER</option><option>KUŞE METALİZE GOLD</option><option>KUŞE METALİZE SİLVER</option><option>PP ŞEFFAF</option><option>PP ULTRA CLEAR</option><option>PE OPAK</option><option>LAMİNE TERMAL</option><option>ECO TERMAL</option><option>PET-G 40 MİC.</option><option>PET-G 45 MİC.</option><option>PET-G 50 MİC.</option><option>PVC 40 MİC.</option><option>PVC 45 MİC.</option><option>PVC 50 MİC.</option>
            </select>

            <div className="flex gap-2"><input required type="number" placeholder="Miktar" className="input-field flex-1" value={formData.qAmount} onChange={e => setFormData({...formData, qAmount: e.target.value})} /><select className="input-field w-28 bg-gray-50" value={formData.qUnit} onChange={e => setFormData({...formData, qUnit: e.target.value})}><option>Adet</option><option>Kg</option><option>Metre</option><option>Top</option></select></div>
            <input required type="date" className="input-field" value={formData.customerDeadline} onChange={e => setFormData({...formData, customerDeadline: e.target.value})} />
            <button disabled={isSaving} type="submit" className="md:col-span-2 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 flex justify-center items-center gap-2">{isSaving ? <Loader2 className="animate-spin" /> : 'Kaydet ve Grafiğe Gönder'}</button>
          </form>
        </div>
      ) : ( <OrderListTable orders={orders} /> )}
    </div>
  );
}

function GraphicsDashboard({ orders }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [gData, setGData] = useState({ machine: '', color: '', printType: '', zet: '', meterage: '', lamination: '', plateStatus: '', dieStatus: '', paperWidth: '', step: '', combinedInfo: '' });
  const pendingOrders = orders.filter(o => o.status === 'graphics_pending');

  useEffect(() => {
    if (selectedOrder && gData.step && gData.combinedInfo) {
        const qty = parseInt(selectedOrder.quantity) || 0;
        const step = parseFloat(gData.step) || 0;
        const combined = parseFloat(gData.combinedInfo) || 1;
        if (combined > 0 && step > 0 && qty > 0) {
            const calculatedMeterage = (qty * step) / combined / 1000;
            setGData(prev => ({ ...prev, meterage: calculatedMeterage.toFixed(2) + ' mt' }));
        }
    }
  }, [gData.step, gData.combinedInfo, selectedOrder]);
  
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id);
      await updateDoc(docRef, { status: 'warehouse_raw_pending', graphicsData: gData });
      setSelectedOrder(null);
      setGData({ machine: '', color: '', printType: '', zet: '', meterage: '', lamination: '', plateStatus: '', dieStatus: '', paperWidth: '', step: '', combinedInfo: '' });
    } catch (error) { console.error(error); }
    setIsSaving(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <h3 className="font-bold text-lg text-gray-700">Grafik Bekleyenler ({pendingOrders.length})</h3>
        <div className="space-y-3">
          {pendingOrders.map(order => ( <OrderCard key={order.id} order={order} isSelected={selectedOrder?.id === order.id} onClick={() => setSelectedOrder(order)} /> ))}
          {pendingOrders.length === 0 && <div className="text-gray-400 text-sm p-4 border dashed rounded">İş yok.</div>}
        </div>
      </div>
      <div className="lg:col-span-2">
        {selectedOrder ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600"><Palette /> Grafik & Teknik Detaylar</h3>
            <div className="bg-orange-50 p-3 rounded-lg mb-4 text-sm"><strong>Sipariş:</strong> {selectedOrder.orderNo} - {selectedOrder.product} <br/><strong>Hammadde:</strong> {selectedOrder.rawMaterial} ({selectedOrder.quantity})</div>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Makina</label>
                <select required className="input-field" value={gData.machine} onChange={e => setGData({...gData, machine: e.target.value})}>
                  <option value="">Seçiniz</option>
                  <option>BOBST M1 VİSİON</option>
                  <option>HİBRİT FLEXO</option>
                  <option>MÜHÜRLEME</option>
                </select>
              </div>
              <div><label className="label">Renkler</label><input required className="input-field" value={gData.color} onChange={e => setGData({...gData, color: e.target.value})} /></div>
              
              <div>
                <label className="label">Baskı Türü</label>
                <select required className="input-field" value={gData.printType} onChange={e => setGData({...gData, printType: e.target.value})}>
                  <option value="">Seçiniz</option>
                  <option>ALT BASKI</option>
                  <option>ÜST BASKI</option>
                  <option>BUGLET</option>
                  <option>CUPON</option>
                </select>
              </div>

              <div><label className="label">Zet</label><input required className="input-field" value={gData.zet} onChange={e => setGData({...gData, zet: e.target.value})} /></div>
              <div className="border-2 border-orange-200 rounded p-2 bg-orange-50"><label className="label font-bold text-orange-800">Kağıt Eni (Depo İçin Önemli)</label><input required className="input-field border-orange-300" placeholder="Örn: 30 CM" value={gData.paperWidth} onChange={e => setGData({...gData, paperWidth: e.target.value})} /></div>
              <div><label className="label">Adımlama (mm)</label><input required type="number" className="input-field" placeholder="Örn: 150" value={gData.step} onChange={e => setGData({...gData, step: e.target.value})} /></div>
              <div><label className="label">Kombine (Kaçlı?)</label><input required type="number" min="1" className="input-field" placeholder="Örn: 2" value={gData.combinedInfo} onChange={e => setGData({...gData, combinedInfo: e.target.value})} /></div>
              <div><label className="label flex items-center gap-1"><Calculator size={14}/> Metraj (Otomatik)</label><input required className="input-field bg-gray-100 font-bold text-indigo-700" value={gData.meterage} onChange={e => setGData({...gData, meterage: e.target.value})} /><p className="text-[10px] text-gray-400 mt-1">Formül: (Adet * Adımlama) / Kombine</p></div>
              
              <div>
                <label className="label">Laminasyon</label>
                <select required className="input-field" value={gData.lamination} onChange={e => setGData({...gData, lamination: e.target.value})}>
                  <option value="">Seçiniz</option>
                  <option>YOK</option>
                  <option>Kısmi Lak</option>
                  <option>Mat Selefon</option>
                  <option>Parlak Selefon</option>
                  <option>Mat Lak</option>
                  <option>Parlak Lak</option>
                  <option>Barkod Lak</option>
                </select>
              </div>

              <div><label className="label">Klişe</label><select required className="input-field" value={gData.plateStatus} onChange={e => setGData({...gData, plateStatus: e.target.value})}>
                  <option value="">Seçiniz</option>
                  <option>Mevcut</option>
                  <option>Sipariş Edildi</option>
              </select></div>
              
              <div>
                <label className="label">Bıçak</label>
                <select required className="input-field" value={gData.dieStatus} onChange={e => setGData({...gData, dieStatus: e.target.value})}>
                  <option value="">Seçiniz</option>
                  <option>Mevcut</option>
                  <option>Sipariş Edildi</option>
                  <option>BIÇAK GEREKTİRMİYOR</option>
                </select>
              </div>

              <button disabled={isSaving} type="submit" className="col-span-2 mt-4 bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700">{isSaving ? 'Kaydediliyor...' : 'Kaydet ve Depoya (Hammadde) Gönder'}</button>
            </form>
          </div>
        ) : ( <EmptyState message="İşlem yapmak için soldan sipariş seçin." /> )}
      </div>
    </div>
  );
}

function WarehouseDashboard({ orders }) {
  const [activeTab, setActiveTab] = useState('raw');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [wData, setWData] = useState({ materialStatus: '', slittingDate: '', shippingStatus: '' });

  useEffect(() => {
    if (selectedOrder && selectedOrder.warehouseData) {
        setWData({ materialStatus: selectedOrder.warehouseData.materialStatus || '', slittingDate: selectedOrder.warehouseData.slittingDate || '', shippingStatus: selectedOrder.warehouseData.shippingStatus || '' });
    } else { setWData({ materialStatus: '', slittingDate: '', shippingStatus: '' }); }
  }, [selectedOrder]);

  const rawPending = orders.filter(o => o.status === 'warehouse_raw_pending' || o.status === 'warehouse_processing' || ((o.status === 'planning_pending' || o.status === 'planned') && o.warehouseData?.materialStatus === 'Dilimleme Aşamasında'));
  const shippingPending = orders.filter(o => o.status === 'planned' || o.status === 'shipping_ready');

  const handleRawMaterialSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id);
      let nextStatus = selectedOrder.status; 
      if (selectedOrder.status === 'warehouse_raw_pending' || selectedOrder.status === 'warehouse_processing' || selectedOrder.status === 'planning_pending') {
          if (wData.materialStatus === 'Hazır' || wData.materialStatus === 'Dilimleme Aşamasında') { nextStatus = 'planning_pending'; } else { nextStatus = 'warehouse_processing'; }
      }
      await updateDoc(docRef, { status: nextStatus, warehouseData: { materialStatus: wData.materialStatus, slittingDate: wData.materialStatus === 'Dilimleme Aşamasında' ? wData.slittingDate : null } });
      setSelectedOrder(null);
      setWData({ materialStatus: '', slittingDate: '', shippingStatus: '' });
    } catch (error) { console.error(error); }
    setIsSaving(false);
  };

  const handleShippingSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id);
      await updateDoc(docRef, { status: wData.shippingStatus === 'Sevk Edildi' ? 'completed' : 'shipping_ready', 'warehouseData.shippingStatus': wData.shippingStatus });
      setSelectedOrder(null);
      setWData({ materialStatus: '', slittingDate: '', shippingStatus: '' });
    } catch (error) { console.error(error); }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-gray-200 pb-1">
        <button onClick={() => {setActiveTab('raw'); setSelectedOrder(null);}} className={`pb-2 px-4 font-bold ${activeTab === 'raw' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}>Hammadde Girişi ({rawPending.length})</button>
        <button onClick={() => {setActiveTab('shipping'); setSelectedOrder(null);}} className={`pb-2 px-4 font-bold ${activeTab === 'shipping' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-green-500'}`}>Sevkiyat Yönetimi ({shippingPending.length})</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {activeTab === 'raw' ? ( rawPending.length === 0 ? <div className="text-gray-400 p-4">Hammadde onayı bekleyen iş yok.</div> : rawPending.map(o => <OrderCard key={o.id} order={o} isSelected={selectedOrder?.id === o.id} onClick={() => setSelectedOrder(o)} />) ) : ( shippingPending.length === 0 ? <div className="text-gray-400 p-4">Sevkiyat bekleyen iş yok.</div> : shippingPending.map(o => <OrderCard key={o.id} order={o} isSelected={selectedOrder?.id === o.id} onClick={() => setSelectedOrder(o)} badgeColor="green" />) )}
        </div>
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <div className="flex justify-between items-start">
                  <div><h3 className="font-bold text-lg">{selectedOrder.orderNo}</h3><div className="text-gray-600">{selectedOrder.customer} - {selectedOrder.product}</div></div>
                  <div className="text-right"><div className="text-xs text-gray-500">Grafikten Gelen Veriler:</div><div className="font-bold text-indigo-700">Hammadde: {selectedOrder.rawMaterial}</div><div className="font-bold text-indigo-700">En: {selectedOrder.graphicsData?.paperWidth} | Metraj: {selectedOrder.graphicsData?.meterage}</div></div>
                </div>
              </div>
              {activeTab === 'raw' && (
                <form onSubmit={handleRawMaterialSave}>
                  <h4 className="font-bold text-indigo-600 mb-3 flex items-center gap-2"><ClipboardCheck /> Hammadde Durumu Belirle</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div><label className="label">Hammadde Durumu</label><select required className="input-field" value={wData.materialStatus} onChange={e => setWData({...wData, materialStatus: e.target.value})}><option value="">Seçiniz...</option><option>Stokta Yok</option><option>Hazır</option><option>Tedarik Ediliyor</option><option>Dilimleme Aşamasında</option></select><p className="text-xs text-gray-500 mt-1">Not: "Hazır" ve "Dilimleme" durumları Planlamaya düşer.</p></div>
                    {wData.materialStatus === 'Dilimleme Aşamasında' && ( <div className="bg-yellow-50 p-3 rounded border border-yellow-200 animation-fade-in"><label className="label text-yellow-800">Dilimleme Tarihi Belirtin</label><input required type="date" className="input-field" value={wData.slittingDate} onChange={e => setWData({...wData, slittingDate: e.target.value})} /></div> )}
                    <button disabled={isSaving} type="submit" className="mt-4 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700">{isSaving ? 'Kaydediliyor...' : (wData.materialStatus === 'Hazır' || wData.materialStatus === 'Dilimleme Aşamasında' ? 'Durumu Onayla & Planlamaya Gönder' : 'Durumu Kaydet (Depoda Beklet)')}</button>
                  </div>
                </form>
              )}
              {activeTab === 'shipping' && (
                <form onSubmit={handleShippingSave}>
                  <h4 className="font-bold text-green-600 mb-3 flex items-center gap-2"><Truck /> Sevkiyat İşlemi</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div><label className="label">Sevkiyat Durumu</label><select required className="input-field" value={wData.shippingStatus} onChange={e => setWData({...wData, shippingStatus: e.target.value})}><option value="">Seçiniz...</option><option>Sevk Bekliyor</option><option>Sevk Edildi</option></select></div>
                    <button disabled={isSaving} type="submit" className="mt-4 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">{isSaving ? 'İşleniyor...' : 'Sevkiyat Durumunu Güncelle'}</button>
                  </div>
                </form>
              )}
            </div>
          ) : ( <EmptyState message="İşlem yapmak için soldan bir kayıt seçin." /> )}
        </div>
      </div>
    </div>
  );
}

// --- 4. PLANLAMA EKRANI ---
function PlanningDashboard({ orders }) {
  const [pData, setPData] = useState({ startDate: '', startHour: '08:00', duration: 2 });
  const [selectedId, setSelectedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState('daily'); 
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");

  const selectedOrder = orders.find(o => o.id === selectedId);
  const isEditing = selectedOrder?.status === 'planned' || selectedOrder?.status === 'shipping_ready' || selectedOrder?.status === 'completed';

  const readyForPlanning = orders.filter(o => o.status === 'planning_pending');
  const plannedOrders = orders.filter(o => o.status === 'planned' || o.status === 'shipping_ready' || o.status === 'completed');
  const daysPlans = plannedOrders.filter(o => o.planningData?.startDate === viewDate);

  const handlePlan = async (e) => {
    e.preventDefault();
    if (!pData.startDate) return alert("Tarih seçin!");
    setIsSaving(true);
    try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedId);
        await updateDoc(docRef, { 
            status: 'planned', 
            planningData: { startDate: pData.startDate, startHour: pData.startHour, duration: pData.duration, productionDate: pData.startDate } 
        });
        setSelectedId(null);
        setPData({ startDate: '', startHour: '08:00', duration: 2 });
        setAiAdvice("");
    } catch (error) { console.error(error); }
    setIsSaving(false);
  };

  const handleEditPlan = (order) => {
      setSelectedId(order.id);
      setAiAdvice("");
      if (order.planningData) {
          setPData({
              startDate: order.planningData.startDate,
              startHour: order.planningData.startHour,
              duration: order.planningData.duration
          });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setSelectedId(null);
      setPData({ startDate: '', startHour: '08:00', duration: 2 });
      setAiAdvice("");
  };

  const handleAiEstimate = async () => {
    if (!selectedOrder) return;
    setIsAiLoading(true);
    const prompt = `
      Sen bir etiket ve matbaa üretim planlama uzmanısın. Aşağıdaki sipariş için sadece üretim süresini (saat cinsinden) hesapla.
      Sipariş Verileri:
      - Ürün: ${selectedOrder.product}, Miktar: ${selectedOrder.quantity}, Makina: ${selectedOrder.graphicsData?.machine || 'Belirtilmemiş'}, Baskı: ${selectedOrder.graphicsData?.printType || '-'}, Zet: ${selectedOrder.graphicsData?.zet || 'Standart'}
      Varsayımlar: BOBST M1 VİSİON Hızı: ~6000-10000 adet/saat, HİBRİT FLEXO Hızı: ~4000-6000 adet/saat, MÜHÜRLEME Hızı: ~3000-5000 adet/saat, Hazırlık: 1-2 saat
      Görev: Toplam süreyi (Hazırlık + Üretim) tam sayı saat olarak tahmin et.
      Yanıt Formatı (JSON): { "duration": 4, "reason": "Hazırlık 2 saat + baskı 2 saat." }
    `;
    const responseText = await callGemini(prompt);
    try {
        const jsonStr = responseText.replace(/```json|```/g, '').trim();
        const result = JSON.parse(jsonStr);
        if (result.duration) {
            setPData(prev => ({ ...prev, duration: result.duration }));
            setAiAdvice(result.reason);
        }
    } catch (e) { setAiAdvice("Tahmin oluşturulamadı."); }
    setIsAiLoading(false);
  };

  const shift1Hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  const shift2Hours = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00"];

  const getWeekDates = (baseDate) => {
    const current = new Date(baseDate);
    const day = current.getDay(); 
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d.toISOString().split('T')[0]);
    }
    return week;
  };

  const weekDates = getWeekDates(viewDate);
  const formatDateTR = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'numeric' });
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock className="text-red-500" /> Planlama Bekleyen ({readyForPlanning.length})</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {readyForPlanning.length === 0 && <div className="text-gray-400 p-4 bg-white border rounded">Bekleyen iş yok.</div>}
            {readyForPlanning.map(order => (
               <div key={order.id} onClick={() => setSelectedId(order.id)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedId === order.id ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'bg-white hover:bg-gray-50'}`}>
                 <div className="flex justify-between items-start mb-2">
                   <span className="font-bold text-sm">{order.orderNo}</span>
                   <span className={`text-[10px] px-1 py-0.5 rounded ${order.warehouseData?.materialStatus === 'Dilimleme Aşamasında' ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-indigo-800'}`}>{order.warehouseData?.materialStatus}</span>
                 </div>
                 <div className="mb-2 border-b border-gray-100 pb-2"><div className="text-xs font-semibold text-gray-700">{order.customer}</div><div className="text-xs text-gray-600">{order.product}</div><div className="text-xs text-red-600 font-bold mt-1">Termin: {order.customerDeadline}</div></div>
                 <div className="text-[10px] text-gray-500 space-y-1">
                    <div className="flex justify-between"><span>Makina:</span> <span className="font-semibold text-gray-700">{order.graphicsData?.machine}</span></div>
                    <div className="flex justify-between"><span>Baskı:</span> <span className="font-semibold text-gray-700">{order.graphicsData?.printType}</span></div>
                    <div className="flex justify-between"><span>Renk:</span> <span className="font-semibold text-gray-700">{order.graphicsData?.color}</span></div>
                    <div className="flex justify-between"><span>Zet:</span> <span className="font-semibold text-gray-700">{order.graphicsData?.zet}</span></div>
                    <div className="flex justify-between"><span>Kağıt Eni:</span> <span className="font-semibold text-gray-700">{order.graphicsData?.paperWidth}</span></div>
                    <div className="flex justify-between"><span>Metraj:</span> <span className="font-semibold text-gray-700">{order.graphicsData?.meterage}</span></div>
                    <div className="pt-1 mt-1 border-t border-gray-100">
                        <div>Laminasyon: {order.graphicsData?.lamination}</div>
                        <div>Klişe: {order.graphicsData?.plateStatus}</div>
                        <div>Bıçak: {order.graphicsData?.dieStatus}</div>
                        {order.graphicsData?.step && <div>Adım: {order.graphicsData?.step}</div>}
                    </div>
                 </div>
                 {order.graphicsData?.combinedInfo > 1 && ( <div className="mt-2 flex items-center gap-1 text-orange-600 text-[10px] font-bold bg-orange-50 p-1 rounded border border-orange-100 justify-center"><Layers size={12} /> {order.graphicsData.combinedInfo} li Kombine</div> )}
               </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-8 space-y-6">
          {selectedId ? (
             <div className={`p-6 rounded-xl shadow-sm border ${isEditing ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-white'}`}>
               <div className="flex justify-between items-start mb-4">
                   <div><h3 className={`font-bold ${isEditing ? 'text-blue-700' : 'text-green-700'}`}>{isEditing ? 'Planı Düzenle / Güncelle' : 'Seçili İş İçin Vardiya Ata'}</h3>{isEditing && <div className="text-xs text-blue-600 mt-1">Şu an <strong>{selectedOrder.orderNo}</strong> siparişini düzenliyorsunuz.</div>}</div>
                   {selectedId && ( <button onClick={handleCancelEdit} className="text-gray-500 hover:text-red-600 text-xs flex items-center gap-1"><X size={14} /> İptal / Vazgeç</button> )}
               </div>
               <form onSubmit={handlePlan} className="flex flex-wrap gap-4 items-end">
                 <div><label className="label">Tarih</label><input required type="date" className="input-field" value={pData.startDate} onChange={e => setPData({...pData, startDate: e.target.value})} /></div>
                 <div><label className="label">Başlangıç Saati</label><select className="input-field" value={pData.startHour} onChange={e => setPData({...pData, startHour: e.target.value})}>{[...shift1Hours, ...shift2Hours].filter(h => h !== "12:00").map(h => (<option key={h} value={h}>{h}</option>))}</select></div>
                 <div className="relative"><label className="label flex items-center gap-1">Süre (Saat) <button type="button" onClick={handleAiEstimate} disabled={isAiLoading} className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded hover:bg-purple-200 flex items-center gap-1 ml-2 border border-purple-300 transition-colors">{isAiLoading ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10}/>} AI Süre Tahmini</button></label><input required type="number" min="1" max="16" className="input-field w-32" value={pData.duration} onChange={e => setPData({...pData, duration: e.target.value === '' ? '' : parseInt(e.target.value)})} /></div>
                 <button disabled={isSaving} className={`${isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white px-6 py-2.5 rounded-lg font-bold`}>{isSaving ? '...' : (isEditing ? 'Planı Güncelle' : 'Planı Kaydet')}</button>
               </form>
               {aiAdvice && ( <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-800 flex items-start gap-2 animate-fade-in"><Sparkles size={14} className="mt-0.5 shrink-0" /><div><span className="font-bold">Yapay Zeka Analizi:</span> {aiAdvice}</div></div> )}
             </div>
          ) : ( <div className="bg-gray-50 p-6 rounded-xl border border-dashed text-center text-gray-500">Planlama yapmak veya düzenlemek için bir iş seçin.</div> )}
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-4 bg-gray-100 border-b flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-2"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar size={20} /> Çizelge</h3><div className="flex bg-white rounded-lg border border-gray-300 p-1 ml-4"><button onClick={() => setViewMode('daily')} className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 ${viewMode === 'daily' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}><List size={16} /> Günlük</button><button onClick={() => setViewMode('weekly')} className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 ${viewMode === 'weekly' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}><Grid size={16} /> Haftalık</button></div></div>
                <div className="flex items-center gap-2"><button onClick={() => {const d = new Date(viewDate); d.setDate(d.getDate() - (viewMode === 'weekly' ? 7 : 1)); setViewDate(d.toISOString().split('T')[0]);}} className="p-1 hover:bg-gray-200 rounded"><ChevronLeft size={20}/></button><input type="date" className="border rounded px-2 py-1 bg-white" value={viewDate} onChange={e => setViewDate(e.target.value)} /><button onClick={() => {const d = new Date(viewDate); d.setDate(d.getDate() + (viewMode === 'weekly' ? 7 : 1)); setViewDate(d.toISOString().split('T')[0]);}} className="p-1 hover:bg-gray-200 rounded"><ChevronRight size={20}/></button></div>
             </div>
             {viewMode === 'daily' && (
             <div className="p-4 overflow-x-auto">
               <div className="mb-6"><div className="flex items-center gap-2 mb-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">1. VARDİYA (08:00 - 17:00)</span></div>
                 <div className="flex border border-gray-200 rounded bg-gray-50 h-24 relative min-w-[800px]">
                    {shift1Hours.map((hour, index) => ( <div key={hour} className={`flex-1 border-r border-gray-200 relative ${hour === "12:00" ? "bg-gray-200" : ""}`}><span className="absolute top-1 left-1 text-[10px] font-bold text-gray-500">{hour}</span>{hour === "12:00" && <span className="absolute top-8 left-2 text-[10px] -rotate-45 text-gray-400 font-bold">MOLA</span>}
                        {daysPlans.map(plan => { if (plan.planningData.startHour === hour) { return ( <div key={plan.id} className="absolute top-5 left-0 right-0 mx-1 bg-blue-500 text-white text-[10px] p-1 rounded z-10 shadow-sm overflow-hidden whitespace-nowrap" style={{ width: `calc(${plan.planningData.duration * 100}% - 8px)` }}><span className="font-bold">{plan.orderNo}</span> - <span className="text-[9px]">{plan.product}</span></div> )} return null; })}</div> ))}
                 </div></div>
               <div><div className="flex items-center gap-2 mb-2"><span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-bold">2. VARDİYA (17:00 - 01:00)</span></div>
                 <div className="flex border border-gray-200 rounded bg-gray-50 h-24 relative min-w-[800px]">
                    {shift2Hours.map((hour) => ( <div key={hour} className="flex-1 border-r border-gray-200 relative"><span className="absolute top-1 left-1 text-[10px] font-bold text-gray-500">{hour}</span>
                        {daysPlans.map(plan => { if (plan.planningData.startHour === hour) { return ( <div key={plan.id} className="absolute top-5 left-0 right-0 mx-1 bg-indigo-500 text-white text-[10px] p-1 rounded z-10 shadow-sm overflow-hidden whitespace-nowrap" style={{ width: `calc(${plan.planningData.duration * 100}% - 8px)` }}><span className="font-bold">{plan.orderNo}</span> - <span className="text-[9px]">{plan.product}</span></div> )} return null; })}</div> ))}
                 </div></div>
             </div> )}
             {viewMode === 'weekly' && (
               <div className="p-4 overflow-x-auto"><div className="grid grid-cols-7 min-w-[1000px] border rounded-lg overflow-hidden">
                   {weekDates.map(dateStr => {
                     const daysOrders = plannedOrders.filter(o => o.planningData?.startDate === dateStr);
                     const shift1 = daysOrders.filter(o => parseInt(o.planningData.startHour.split(':')[0]) < 17);
                     const shift2 = daysOrders.filter(o => { const h = parseInt(o.planningData.startHour.split(':')[0]); return h >= 17 || h === 0; });
                     const isSelectedDay = dateStr === viewDate;
                     return ( <div key={dateStr} className={`border-r last:border-r-0 flex flex-col ${isSelectedDay ? 'bg-green-50' : 'bg-white'}`}><div onClick={() => {setViewDate(dateStr); setViewMode('daily');}} className={`p-2 text-center border-b font-bold text-sm cursor-pointer hover:bg-green-100 ${isSelectedDay ? 'text-green-800' : 'text-gray-700'}`}>{formatDateTR(dateStr)}</div><div className="flex-1 p-1 space-y-2 min-h-[200px]">
                           <div className="bg-blue-50 rounded p-1 border border-blue-100 min-h-[80px]"><div className="text-[10px] font-bold text-blue-800 mb-1 text-center">1. Vardiya</div>{shift1.map(o => ( <div key={o.id} className="bg-white border border-blue-200 rounded px-1 py-0.5 text-[10px] mb-1 truncate shadow-sm text-blue-900" title={`${o.orderNo} - ${o.customer}`}><span className="font-bold">{o.orderNo}</span> <span className="opacity-75">{o.product}</span></div> ))}</div>
                           <div className="bg-indigo-50 rounded p-1 border border-indigo-100 min-h-[80px]"><div className="text-[10px] font-bold text-indigo-800 mb-1 text-center">2. Vardiya</div>{shift2.map(o => ( <div key={o.id} className="bg-white border border-indigo-200 rounded px-1 py-0.5 text-[10px] mb-1 truncate shadow-sm text-indigo-900" title={`${o.orderNo} - ${o.customer}`}><span className="font-bold">{o.orderNo}</span> <span className="opacity-75">{o.product}</span></div> ))}</div></div></div> );
                   })}
                 </div></div> )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
             <div className="p-4 bg-gray-50 border-b"><h3 className="font-bold text-gray-800 flex items-center gap-2"><List size={20}/> Planlanan İşler Listesi</h3></div>
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600"><tr><th className="p-3">Tarih/Saat</th><th className="p-3">Sipariş</th><th className="p-3">Makina</th><th className="p-3">Durum</th><th className="p-3 text-right">İşlem</th></tr></thead>
                <tbody className="divide-y">
                  {plannedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50"><td className="p-3"><div className="font-bold text-gray-700">{order.planningData?.startDate}</div><div className="text-xs text-gray-500">{order.planningData?.startHour} ({order.planningData?.duration} saat)</div></td><td className="p-3"><div className="font-bold">{order.orderNo}</div><div className="text-xs text-gray-600">{order.customer} - {order.product}</div></td><td className="p-3 text-xs">{order.graphicsData?.machine}</td><td className="p-3"><StatusBadge status={order.status} /></td><td className="p-3 text-right"><button onClick={() => handleEditPlan(order)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded" title="Planı Düzenle"><Pen size={16} /></button></td></tr>
                  ))}
                  {plannedOrders.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-gray-400">Planlanmış iş bulunmamaktadır.</td></tr>}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 5. ARŞİV VE RAPORLAMA EKRANI ---
function ArchiveDashboard({ orders }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewType, setViewType] = useState('active');
  const [aiMessage, setAiMessage] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const activePlans = orders.filter(o => o.status === 'planned' || o.status === 'shipping_ready');
  const completedPlans = orders.filter(o => o.status === 'completed');

  const displayList = viewType === 'active' ? activePlans : completedPlans;

  const exportToExcel = () => {
    if (displayList.length === 0) return alert("Aktarılacak veri yok.");
    const headers = ["Sipariş No", "Müşteri", "Ürün", "Miktar", "Tarih", "Durum", "Makina", "Termin"];
    const rows = displayList.map(o => [o.orderNo, o.customer, o.product, o.quantity, o.createdAt?.split('T')[0], o.status, o.graphicsData?.machine || '-', o.customerDeadline].map(item => `"${item}"`).join(","));
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Uretim_Raporu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateMessage = async () => {
    if (!selectedOrder) return;
    setIsAiLoading(true);
    setAiMessage("");
    const prompt = `
      Aşağıdaki sipariş durumu için müşteriye gönderilecek nazik, kurumsal ve bilgilendirici bir WhatsApp mesajı taslağı hazırla (Türkçe).
      Müşteri: ${selectedOrder.customer}, Ürün: ${selectedOrder.product}, Sipariş No: ${selectedOrder.orderNo}, Durum: ${selectedOrder.status}, Termin: ${selectedOrder.customerDeadline}
    `;
    const text = await callGemini(prompt);
    setAiMessage(text);
    setIsAiLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Archive className="text-purple-600"/> Dijital Arşiv</h2>
         <div className="flex gap-2">
             <button onClick={exportToExcel} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"><Download size={16} /> Excel'e Aktar</button>
             <div className="flex bg-white rounded-lg border p-1"><button onClick={() => setViewType('active')} className={`px-4 py-2 rounded text-sm font-bold ${viewType === 'active' ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}>Aktif Planlananlar</button><button onClick={() => setViewType('completed')} className={`px-4 py-2 rounded text-sm font-bold ${viewType === 'completed' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>Tamamlananlar (Geçmiş)</button></div>
         </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-200px)] flex flex-col">
            <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex justify-between"><span>{viewType === 'active' ? 'Üretimdeki İşler' : 'Arşivlenmiş İşler'}</span><span className="bg-gray-200 text-gray-600 px-2 rounded text-xs flex items-center">{displayList.length}</span></div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
               {displayList.map(order => ( <div key={order.id} onClick={() => {setSelectedOrder(order); setAiMessage("");}} className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedOrder?.id === order.id ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'hover:bg-gray-50 border-gray-200'}`}><div className="flex justify-between"><span className="font-bold text-gray-800">{order.orderNo}</span><span className="text-xs text-gray-500">{order.createdAt?.split('T')[0]}</span></div><div className="text-sm mt-1">{order.customer}</div><div className="text-xs text-gray-400">{order.product}</div><div className="mt-2"><StatusBadge status={order.status} /></div></div> ))}
               {displayList.length === 0 && <div className="p-8 text-center text-gray-400">Kayıt bulunamadı.</div>}
            </div>
         </div>
         <div className="lg:col-span-2">
            {selectedOrder ? (
               <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden h-full flex flex-col">
                  <div className="bg-purple-600 p-6 text-white flex justify-between items-start shrink-0"><div><h3 className="text-2xl font-bold">{selectedOrder.orderNo}</h3><p className="opacity-90">{selectedOrder.customer} - {selectedOrder.product}</p></div><div className="text-right"><div className="text-xs opacity-75 uppercase tracking-wider">Oluşturulma Tarihi</div><div className="font-mono">{new Date(selectedOrder.createdAt).toLocaleDateString('tr-TR')}</div></div></div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto flex-1">
                     <section><h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 border-b pb-1">Sipariş Bilgileri</h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Sipariş Türü:</span> <span className="font-medium">{selectedOrder.type}</span></div><div className="flex justify-between"><span className="text-gray-500">Miktar:</span> <span className="font-medium">{selectedOrder.quantity}</span></div><div className="flex justify-between"><span className="text-gray-500">Hammadde:</span> <span className="font-medium">{selectedOrder.rawMaterial}</span></div><div className="flex justify-between"><span className="text-gray-500">Müşteri Termini:</span> <span className="font-bold text-red-600">{selectedOrder.customerDeadline}</span></div></div></section>
                     <section><h4 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3 border-b pb-1">Üretim Planı</h4>{selectedOrder.planningData ? ( <div className="bg-green-50 p-3 rounded border border-green-100 text-center"><div className="text-xs text-green-600">ÜRETİM TARİHİ</div><div className="text-xl font-bold text-green-800">{selectedOrder.planningData.startDate}</div><div className="text-sm text-green-700 mt-1">Saat: {selectedOrder.planningData.startHour} (Süre: {selectedOrder.planningData.duration} sa)</div></div> ) : ( <div className="text-sm text-gray-400 italic">Henüz planlanmadı.</div> )}</section>
                     <section><h4 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-3 border-b pb-1">Teknik Detaylar</h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Makina:</span> <span className="font-medium">{selectedOrder.graphicsData?.machine}</span></div><div className="flex justify-between"><span className="text-gray-500">Baskı/Renk:</span> <span className="font-medium">{selectedOrder.graphicsData?.printType} / {selectedOrder.graphicsData?.color}</span></div><div className="flex justify-between"><span className="text-gray-500">Zet / Adım:</span> <span className="font-medium">{selectedOrder.graphicsData?.zet} / {selectedOrder.graphicsData?.step}</span></div><div className="flex justify-between"><span className="text-gray-500">Kağıt Eni:</span> <span className="font-medium">{selectedOrder.graphicsData?.paperWidth}</span></div><div className="flex justify-between"><span className="text-gray-500">Laminasyon:</span> <span className="font-medium">{selectedOrder.graphicsData?.lamination}</span></div><div className="flex justify-between"><span className="text-gray-500">Klişe/Bıçak:</span> <span className="font-medium">{selectedOrder.graphicsData?.plateStatus} / {selectedOrder.graphicsData?.dieStatus}</span></div>{selectedOrder.graphicsData?.combinedInfo && <div className="bg-orange-50 p-2 rounded text-orange-800 text-xs mt-2"><strong>Kombine:</strong> {selectedOrder.graphicsData?.combinedInfo}-li</div>}</div></section>
                     <section><h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3 border-b pb-1">Depo ve Hammadde</h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Hammadde Durumu:</span> <span className="font-bold text-indigo-600">{selectedOrder.warehouseData?.materialStatus}</span></div>{selectedOrder.warehouseData?.slittingDate && <div className="flex justify-between"><span className="text-gray-500">Dilimleme Tarihi:</span> <span className="font-medium">{selectedOrder.warehouseData?.slittingDate}</span></div>}<div className="flex justify-between"><span className="text-gray-500">Sevkiyat Durumu:</span> <span className="font-bold text-green-600">{selectedOrder.warehouseData?.shippingStatus || '-'}</span></div></div></section>
                  </div>
                  <div className="p-4 border-t bg-gray-50"><h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Sparkles size={16} className="text-purple-600"/> Akıllı Asistan</h4><div className="flex gap-3 items-start"><button onClick={handleGenerateMessage} disabled={isAiLoading} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap flex items-center gap-2">{isAiLoading ? <Loader2 size={16} className="animate-spin"/> : <MessageSquare size={16}/>} Müşteri Mesajı Oluştur</button>{aiMessage && ( <div className="flex-1 bg-white border border-purple-200 p-3 rounded-lg text-sm text-gray-700 relative group"><p>{aiMessage}</p><button onClick={() => navigator.clipboard.writeText(aiMessage)} className="absolute top-2 right-2 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Kopyala</button></div> )}</div></div>
               </div>
            ) : ( <div className="bg-gray-50 h-full rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400"><FileText size={64} className="mb-4 opacity-20" /><p>Detaylarını görmek için listeden bir iş seçin.</p></div> )}
         </div>
      </div>
    </div>
  );
}

function OrderCard({ order, isSelected, onClick, badgeColor = "blue" }) {
  const badges = { blue: "bg-blue-100 text-blue-800", green: "bg-green-100 text-green-800", orange: "bg-orange-100 text-orange-800" };
  return (
    <div onClick={onClick} className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? `bg-${badgeColor}-50 border-${badgeColor}-400 shadow-md ring-1 ring-${badgeColor}-400` : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
      <div className="flex justify-between mb-1">
        <span className="font-bold text-gray-800">{order.orderNo}</span>
        <div className="flex gap-1">
            {order.status === 'warehouse_processing' && <span className="text-[10px] bg-purple-100 text-purple-800 px-1 py-0.5 rounded">İşlemde</span>}
            <span className={`text-xs px-2 py-1 rounded ${badges[badgeColor] || badges.blue}`}>{order.customerDeadline}</span>
        </div>
      </div>
      <div className="text-sm text-gray-600">{order.customer}</div>
      <div className="text-xs text-gray-400 mt-1">{order.product}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl h-full flex flex-col items-center justify-center text-gray-400 p-10"><Layout size={48} className="mb-4 opacity-20" /><p>{message}</p></div>
  );
}

function OrderListTable({ orders }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b"><tr><th className="p-4">Sipariş No</th><th className="p-4">Müşteri</th><th className="p-4">Ürün</th><th className="p-4">Durum</th></tr></thead>
          <tbody className="divide-y">
            {orders.map(order => ( 
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium">{order.orderNo}</td>
                <td className="p-4">{order.customer}</td>
                <td className="p-4">{order.product}</td>
                <td className="p-4"><StatusBadge status={order.status} /></td>
              </tr> 
            ))}
            {orders.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-gray-500">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    graphics_pending: { text: "Grafik Bekliyor", color: "bg-blue-100 text-blue-800" },
    warehouse_raw_pending: { text: "Hammadde Onayı", color: "bg-indigo-100 text-indigo-800" },
    warehouse_processing: { text: "Depo İşlemde", color: "bg-purple-100 text-purple-800" },
    planning_pending: { text: "Planlama Bekliyor", color: "bg-orange-100 text-orange-800" },
    planned: { text: "Üretimde", color: "bg-green-100 text-green-800" },
    shipping_ready: { text: "Sevk Bekliyor", color: "bg-yellow-100 text-yellow-800" },
    completed: { text: "Tamamlandı", color: "bg-gray-800 text-white" },
  };
  const s = map[status] || { text: status, color: "bg-gray-100" };
  return <span className={`px-2 py-1 rounded text-xs font-bold ${s.color}`}>{s.text}</span>;
}