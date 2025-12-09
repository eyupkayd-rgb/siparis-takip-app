import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  User, Printer, Calendar, CheckCircle, Clock, Plus, Package, Layout, 
  Palette, Settings, LogOut, Loader2, Archive, Truck, ClipboardCheck, 
  AlertTriangle, ChevronLeft, ChevronRight, Grid, List, Layers, Calculator, 
  FileText, X, Pen, Sparkles, MessageSquare, Download, Lock, Mail, 
  ShieldCheck, Monitor, Users, Check, Ban, Edit3, AlertCircle, Trash2, 
  Paperclip, Key, Play, StopCircle, BarChart3, History, Split, 
  Cylinder, Component, Search, Ruler, LogIn, UserPlus, Database,
  Barcode, QrCode, Scissors, PackagePlus, PackageCheck, Building2,
  CreditCard, Phone, MapPin
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, sendPasswordResetEmail, updatePassword, 
  reauthenticateWithCredential, EmailAuthProvider, signInWithCustomToken, 
  signInAnonymously 
} from "firebase/auth";
import { 
  collection, doc, setDoc, getDoc, getDocs, addDoc, 
  updateDoc, onSnapshot, deleteDoc 
} from "firebase/firestore";
import './App.css';

// Import services
import { auth, db, appId, SUPER_ADMIN_EMAILS } from './services/firebase';
import { callGemini } from './services/gemini';

// Import utils
import { getMaterialShortCode, logStockMovement, generateBarcode } from './utils/stockHelpers';
import { generateProductionJobs, calculatePlateMeterage } from './utils/productionHelpers';

// Import shared components
import StatusBadge from './components/shared/StatusBadge';
import ChangePasswordModal from './components/shared/ChangePasswordModal';
import AttachmentManager from './components/shared/AttachmentManager';

// Import modal components
import CustomerCardModal from './components/MasterData/CustomerCardModal';
import SupplierCardModal from './components/MasterData/SupplierCardModal';
import AddRawMaterialModal from './components/MasterData/AddRawMaterialModal';
import DilimlemeModal from './components/Stock/DilimlemeModal';
import EditStockRollModal from './components/Stock/EditStockRollModal';

// Import dashboard components
import ArchiveDashboard from './components/Archive/ArchiveDashboard';
import AuthScreen from './components/Auth/AuthScreen';
import AdminDashboard from './components/Admin/AdminDashboard';
import MarketingDashboard from './components/Marketing/MarketingDashboard';
import GraphicsDashboard from './components/Graphics/GraphicsDashboard';
import WarehouseDashboard from './components/Warehouse/WarehouseDashboard';
import PlanningDashboard from './components/Planning/PlanningDashboard';
import ProductionDashboard from './components/Production/ProductionDashboard';

// Legacy compatibility
const ADMIN_EMAILS = SUPER_ADMIN_EMAILS;

// ============================================================================
// 🧩 HELPER COMPONENTS (Utilities now imported from separate files)
// ============================================================================

// ============================================================================

// ============================================================================
// MODAL COMPONENTS - Now imported from MasterData and Stock folders
// ============================================================================

// ============================================================================
// 📦 MARKETING DASHBOARD (FULL FEATURED)

// ============================================================================
// 📦 MARKETING & GRAPHICS DASHBOARDS - Now imported from separate components
// ============================================================================

// ============================================================================

// ============================================================================
// 🏭 WAREHOUSE, PLANNING & PRODUCTION DASHBOARDS - Now imported from separate components
// ============================================================================

// ============================================================================
// 📦 ARCHIVE DASHBOARD - Now imported from components/Archive
// ============================================================================


// ============================================================================
// 🔐 AUTH & ADMIN - Now imported from separate components
// ============================================================================

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================

export default function OrderApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [currentView, setCurrentView] = useState('marketing');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [customerCards, setCustomerCards] = useState([]);
  const [supplierCards, setSupplierCards] = useState([]);
  const [stockRolls, setStockRolls] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const profile = userDoc.data();
          if (profile.approved) {
            setUserProfile(profile);
            const roleViews = {
              super_admin: 'marketing',
              marketing: 'marketing',
              graphics: 'graphics',
              warehouse: 'warehouse',
              planning: 'planning',
              production: 'production'
            };
            setCurrentView(roleViews[profile.role] || 'marketing');
          } else {
            alert('Hesabınız henüz onaylanmamış. Lütfen yönetici ile iletişime geçin.');
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !userProfile) return;

    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      ordersData.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  useEffect(() => {
    if (!user || !userProfile) return;

    const customersRef = collection(db, 'artifacts', appId, 'public', 'data', 'customer_cards');
    const unsubscribeCustomers = onSnapshot(customersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomerCards(data);
    });

    const suppliersRef = collection(db, 'artifacts', appId, 'public', 'data', 'supplier_cards');
    const unsubscribeSuppliers = onSnapshot(suppliersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSupplierCards(data);
    });

    const stockRollsRef = collection(db, 'artifacts', appId, 'public', 'data', 'stock_rolls');
    const unsubscribeStockRolls = onSnapshot(stockRollsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStockRolls(data);
    });

    const stockMovementsRef = collection(db, 'artifacts', appId, 'public', 'data', 'stock_movements');
    const unsubscribeStockMovements = onSnapshot(stockMovementsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setStockMovements(data);
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeSuppliers();
      unsubscribeStockRolls();
      unsubscribeStockMovements();
    };
  }, [user, userProfile]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
        <Loader2 className="animate-spin text-white" size={64} />
      </div>
    );
  }

  if (!user || !userProfile) {
    return <AuthScreen />;
  }

  const isSuperAdmin = userProfile.role === 'super_admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <nav className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white p-4 shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="animate-pulse" />
            Sipariş Takip Sistemi
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm bg-white/10 px-3 py-1.5 rounded-lg">
              {userProfile.displayName || userProfile.email}
            </span>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-2"
            >
              <Key size={16} />
              Şifre Değiştir
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold transition flex items-center gap-2"
            >
              <LogOut size={18} />
              Çıkış
            </button>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 shadow-lg">
          <nav className="space-y-2">
            {(isSuperAdmin || userProfile.role === 'marketing') && (
              <button
                onClick={() => setCurrentView('marketing')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  currentView === 'marketing'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Layout size={20} />
                Pazarlama
              </button>
            )}

            {(isSuperAdmin || userProfile.role === 'graphics') && (
              <button
                onClick={() => setCurrentView('graphics')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  currentView === 'graphics'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Palette size={20} />
                Grafik
              </button>
            )}

            {(isSuperAdmin || userProfile.role === 'warehouse') && (
              <button
                onClick={() => setCurrentView('warehouse')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  currentView === 'warehouse'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Package size={20} />
                Depo
              </button>
            )}

            {(isSuperAdmin || userProfile.role === 'planning') && (
              <button
                onClick={() => setCurrentView('planning')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  currentView === 'planning'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Calendar size={20} />
                Planlama
              </button>
            )}

            {(isSuperAdmin || userProfile.role === 'production') && (
              <button
                onClick={() => setCurrentView('production')}
                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  currentView === 'production'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Printer size={20} />
                Üretim
              </button>
            )}

            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setCurrentView('archive')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                    currentView === 'archive'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Archive size={20} />
                  Arşiv
                </button>

                <button
                  onClick={() => setCurrentView('admin')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                    currentView === 'admin'
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Users size={20} />
                  Yönetim
                </button>
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {currentView === 'marketing' && (
            <MarketingDashboard orders={orders} isSuperAdmin={isSuperAdmin} customerCards={customerCards} />
          )}
          {currentView === 'graphics' && (
            <GraphicsDashboard orders={orders} isSuperAdmin={isSuperAdmin} />
          )}
          {currentView === 'warehouse' && (
            <WarehouseDashboard
              orders={orders}
              isSuperAdmin={isSuperAdmin}
              supplierCards={supplierCards}
              stockRolls={stockRolls}
              stockMovements={stockMovements}
            />
          )}
          {currentView === 'planning' && (
            <PlanningDashboard orders={orders} isSuperAdmin={isSuperAdmin} />
          )}
          {currentView === 'production' && (
            <ProductionDashboard orders={orders} isSuperAdmin={isSuperAdmin} currentUser={userProfile} />
          )}
          {currentView === 'archive' && (
            <ArchiveDashboard orders={orders} isSuperAdmin={isSuperAdmin} />
          )}
          {currentView === 'admin' && <AdminDashboard />}
        </main>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}
