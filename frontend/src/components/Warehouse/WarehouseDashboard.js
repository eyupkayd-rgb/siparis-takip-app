import React, { useState, useEffect } from 'react';
import { Package, Plus, CheckCircle, X, Loader2, AlertCircle, Building2, CreditCard, Phone, MapPin, User, Database, Barcode, QrCode, Scissors, PackagePlus, PackageCheck, Split, Cylinder, Component, Search, Ruler, AlertTriangle, Archive, BarChart3, Calculator, ClipboardCheck, Edit3, Settings, Trash2, Truck } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, onSnapshot } from "firebase/firestore";
import { db, appId } from '../../services/firebase';
import { getMaterialShortCode, logStockMovement, generateBarcode } from '../../utils/stockHelpers';
import StatusBadge from '../shared/StatusBadge';
import AttachmentManager from '../shared/AttachmentManager';
import SupplierCardModal from '../MasterData/SupplierCardModal';
import AddRawMaterialModal from '../MasterData/AddRawMaterialModal';
import DilimlemeModal from '../Stock/DilimlemeModal';
import EditStockRollModal from '../Stock/EditStockRollModal';

export default function WarehouseDashboard({ orders, isSuperAdmin, supplierCards, stockRolls, stockMovements }) {
  const rawMaterials = [
    "PP OPAK SARI PERGAMİN", "PP OPAK BEYAZ PERGAMİN", "PP OPAK PET",
    "KUŞE SARI PERGAMİN", "KUŞE BEYAZ PERGAMİN", "KUŞE PET", "KUŞE MAT",
    "PP METALİZE GOLD", "PP METALİZE SİLVER",
    "KUŞE METALİZE GOLD", "KUŞE METALİZE SİLVER",
    "PP ŞEFFAF", "PP ULTRA CLEAR", "PE OPAK",
    "LAMİNE TERMAL", "ECO TERMAL",
    "PET-G 40 MİC.", "PET-G 45 MİC.", "PET-G 50 MİC.",
    "PVC 40 MİC.", "PVC 45 MİC.", "PVC 50 MİC."
  ];
  
  const [activeTab, setActiveTab] = useState('raw');
  const [listMode, setListMode] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showAddRollModal, setShowAddRollModal] = useState(false);
  const [showDilimModal, setShowDilimModal] = useState(false);
  const [selectedJumboRoll, setSelectedJumboRoll] = useState(null);
  const [showStockTab, setShowStockTab] = useState(false);
  const [showStockMovements, setShowStockMovements] = useState(false);
  const [editingRoll, setEditingRoll] = useState(null);
  const [showEditRollModal, setShowEditRollModal] = useState(false);
  const [wData, setWData] = useState({
    materialStatus: '',
    slittingDate: '',
    shippingStatus: '',
    wastageRate: 0,
    issuedMeterage: 0
  });

  const activeOrder = selectedOrder ? (orders.find(o => o.id === selectedOrder.id) || selectedOrder) : null;

  // Filter by search
  const filterOrders = (orderList) => {
    if (!searchQuery) return orderList;
    return orderList.filter(order => 
      order.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const rawPending = filterOrders(orders.filter(o => 
    o.status === 'warehouse_raw_pending' || 
    o.status === 'warehouse_processing' || 
    ((o.status === 'planning_pending' || o.status === 'planned') && 
      o.warehouseData?.materialStatus === 'Dilimleme Aşamasında')
  ));
  
  const shippingPending = filterOrders(orders.filter(o => o.status === 'shipping_ready'));
  const currentList = listMode === 'all' ? filterOrders(orders) : (activeTab === 'raw' ? rawPending : shippingPending);

  useEffect(() => {
    if (selectedOrder && selectedOrder.warehouseData) {
      setWData({
        materialStatus: selectedOrder.warehouseData.materialStatus || '',
        slittingDate: selectedOrder.warehouseData.slittingDate || '',
        shippingStatus: selectedOrder.warehouseData.shippingStatus || '',
        wastageRate: selectedOrder.warehouseData.wastageRate || 0,
        issuedMeterage: selectedOrder.warehouseData.issuedMeterage || 0
      });
    } else {
      setWData({
        materialStatus: '',
        slittingDate: '',
        shippingStatus: '',
        wastageRate: 0,
        issuedMeterage: 0
      });
    }
  }, [selectedOrder]);

  // Auto-calculate issued meterage when wastage rate changes
  useEffect(() => {
    if (selectedOrder && selectedOrder.graphicsData?.meterage && activeTab === 'raw') {
      const rawMeterageStr = selectedOrder.graphicsData.meterage;
      const theoretical = parseFloat(rawMeterageStr.replace(/[^0-9.]/g, '')) || 0;
      const rate = parseFloat(wData.wastageRate) || 0;
      const totalIssued = Math.ceil(theoretical * (1 + rate / 100));
      
      setWData(prev => ({
        ...prev,
        issuedMeterage: totalIssued
      }));
    }
  }, [wData.wastageRate, selectedOrder?.graphicsData?.meterage, activeTab]);

  const handleDeleteRoll = async (rollId) => {
    if (!window.confirm('Bu bobini silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stock_rolls', rollId));
      alert('✅ Bobin silindi!');
    } catch (error) {
      console.error('Bobin silme hatası:', error);
      alert('❌ Hata: ' + error.message);
    }
  };

  const handleEditRoll = (roll) => {
    setEditingRoll(roll);
    setShowEditRollModal(true);
  };

  const handleRawMaterialSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      let updatePayload = {
        warehouseData: {
          ...selectedOrder.warehouseData,
          materialStatus: wData.materialStatus,
          slittingDate: wData.materialStatus === 'Dilimleme Aşamasında' ? wData.slittingDate : null,
          wastageRate: wData.wastageRate,
          issuedMeterage: wData.issuedMeterage
        }
      };

      if (listMode === 'pending') {
        let nextStatus = selectedOrder.status;
        if (selectedOrder.status === 'warehouse_raw_pending' || 
            selectedOrder.status === 'warehouse_processing' || 
            selectedOrder.status === 'planning_pending') {
          if (wData.materialStatus === 'Hazır' || wData.materialStatus === 'Dilimleme Aşamasında') {
            nextStatus = 'planning_pending';
          } else {
            nextStatus = 'warehouse_processing';
          }
        }
        updatePayload.status = nextStatus;
      } else {
        updatePayload.revisionAlert = "Depo (Hammadde) tarafından güncellendi";
      }

      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id),
        updatePayload
      );
      setSelectedOrder(null);
      setWData({
        materialStatus: '',
        slittingDate: '',
        shippingStatus: '',
        wastageRate: 0,
        issuedMeterage: 0
      });
    } catch (error) {
      console.error("Warehouse save error:", error);
      alert("Kayıt hatası: " + error.message);
    }
    setIsSaving(false);
  };

  const handleShippingSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      let updatePayload = {
        'warehouseData.shippingStatus': wData.shippingStatus,
        ...(listMode === 'pending' 
          ? { status: wData.shippingStatus === 'Sevk Edildi' ? 'completed' : 'shipping_ready' } 
          : { revisionAlert: "Depo (Sevkiyat) tarafından güncellendi" })
      };
      
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id),
        updatePayload
      );
      setSelectedOrder(null);
      setWData({
        materialStatus: '',
        slittingDate: '',
        shippingStatus: '',
        wastageRate: 0,
        issuedMeterage: 0
      });
    } catch (error) {
      console.error("Shipping save error:", error);
      alert("Kayıt hatası: " + error.message);
    }
    setIsSaving(false);
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("DİKKAT: Bu siparişi kalıcı olarak silmek üzeresiniz.")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
        if (selectedOrder?.id === orderId) setSelectedOrder(null);
      } catch (error) {
        alert("Silme hatası.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {showSupplierModal && (
        <SupplierCardModal
          onClose={() => setShowSupplierModal(false)}
          suppliers={supplierCards || []}
          onRefresh={() => {}}
        />
      )}
      
      {showAddRollModal && (
        <AddRawMaterialModal
          onClose={() => setShowAddRollModal(false)}
          suppliers={supplierCards || []}
          rawMaterialsList={rawMaterials}
          onRefresh={() => {}}
        />
      )}
      
      {showDilimModal && selectedJumboRoll && (
        <DilimlemeModal
          onClose={() => {
            setShowDilimModal(false);
            setSelectedJumboRoll(null);
          }}
          jumboRoll={selectedJumboRoll}
          onRefresh={() => {}}
        />
      )}
      
      {showEditRollModal && editingRoll && (
        <EditStockRollModal
          onClose={() => {
            setShowEditRollModal(false);
            setEditingRoll(null);
          }}
          roll={editingRoll}
          suppliers={supplierCards || []}
          onRefresh={() => {}}
        />
      )}

      {/* Header with Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Depo Yönetimi
          </h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">Hammadde, Stok ve Sevkiyat İşlemleri</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Hammadde İşlemleri butonu - sadece Stok veya Hareketler açık iken göster */}
          {(showStockTab || showStockMovements) && (
            <button
              onClick={() => {
                setShowStockTab(false);
                setShowStockMovements(false);
              }}
              className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-2 md:px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-1 md:gap-2 text-xs md:text-base hover:from-orange-700 hover:to-red-700"
            >
              <Package size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="hidden sm:inline">Hammadde İşlemleri</span>
              <span className="sm:hidden">Hammadde</span>
            </button>
          )}
          
          <button
            onClick={() => {
              setShowStockTab(true);
              setShowStockMovements(false);
            }}
            className={`px-2 md:px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-1 md:gap-2 text-xs md:text-base ${
              showStockTab && !showStockMovements
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Database size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="hidden sm:inline">Stok Yönetimi</span>
            <span className="sm:hidden">Stok</span>
          </button>
          
          <button
            onClick={() => {
              setShowStockMovements(true);
              setShowStockTab(false);
            }}
            className={`px-2 md:px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-1 md:gap-2 text-xs md:text-base ${
              showStockMovements
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="hidden sm:inline">Stok Hareketleri</span>
            <span className="sm:hidden">Hareketler</span>
          </button>
          
          <button
            onClick={() => setShowSupplierModal(true)}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-2 md:px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-1 md:gap-2 text-xs md:text-base"
          >
            <Truck size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="hidden sm:inline">Tedarikçiler</span>
            <span className="sm:hidden">Tedarik</span>
          </button>
          
          <button
            onClick={() => setShowAddRollModal(true)}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-2 md:px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-1 md:gap-2 text-xs md:text-base"
          >
            <PackagePlus size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="hidden sm:inline">Bobin Girişi</span>
            <span className="sm:hidden">Bobin</span>
          </button>
        </div>
      </div>

      {showStockTab ? (
        <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800">Bobin Stok Listesi</h3>
            <div className="text-sm text-gray-600">
              Toplam: <span className="font-bold text-lg">{stockRolls?.length || 0}</span> bobin
            </div>
          </div>
          
          {(!stockRolls || stockRolls.length === 0) ? (
            <div className="text-center py-16 text-gray-400">
              <Package size={80} className="mx-auto mb-4 opacity-30" />
              <p className="text-xl">Henüz bobin girişi yapılmamış</p>
              <p className="text-sm mt-2">Yukarıdaki &quot;Bobin Girişi&quot; butonuna tıklayarak başlayın</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-orange-200">
                  <tr>
                    <th className="p-3 text-left font-bold">Barkod</th>
                    <th className="p-3 text-left font-bold">Hammadde</th>
                    <th className="p-3 text-left font-bold">Tedarikçi</th>
                    <th className="p-3 text-center font-bold">En (cm)</th>
                    <th className="p-3 text-center font-bold">Uzunluk (m)</th>
                    <th className="p-3 text-center font-bold">m²</th>
                    <th className="p-3 text-center font-bold">Durum</th>
                    <th className="p-3 text-center font-bold">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRolls.map(roll => (
                    <tr key={roll.id} className="border-b border-gray-100 hover:bg-orange-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Barcode size={16} className="text-orange-600" />
                          <span className="font-mono font-bold">{roll.rollBarcode}</span>
                        </div>
                      </td>
                      <td className="p-3">{roll.materialName}</td>
                      <td className="p-3">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                          {roll.supplierPrefix}
                        </span> {roll.supplierName}
                      </td>
                      <td className="p-3 text-center font-bold">{roll.widthCM}</td>
                      <td className="p-3 text-center">
                        <span className={`font-bold ${roll.currentLength === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {roll.currentLength}
                        </span>
                        <span className="text-gray-400 text-xs"> / {roll.originalLength}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-blue-600">
                          {((roll.widthCM / 100) * roll.currentLength).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {roll.isDilim ? (
                          <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">Dilimlenmiş</span>
                        ) : roll.reservationId ? (
                          <div className="space-y-1">
                            <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs font-bold block">
                              ⚠️ Rezerve
                            </span>
                            {roll.reservedOrderNo && (
                              <span className="text-[10px] text-gray-600 block">
                                {roll.reservedOrderNo}
                              </span>
                            )}
                          </div>
                        ) : roll.currentLength === 0 ? (
                          <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs">Tükendi</span>
                        ) : roll.isJumbo ? (
                          <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs font-bold">JUMBO</span>
                        ) : (
                          <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">Mevcut</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-center">
                          {!roll.isDilim && roll.currentLength > 0 && !roll.reservationId && (
                            <button
                              onClick={() => {
                                setSelectedJumboRoll(roll);
                                setShowDilimModal(true);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                              title="Dilimle"
                            >
                              <Scissors size={14} />
                              {roll.isJumbo ? 'Jumbo' : 'Dilim'}
                            </button>
                          )}
                          <button
                            onClick={() => handleEditRoll(roll)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg text-xs"
                            title="Düzenle"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRoll(roll.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-xs"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : showStockMovements ? (
        <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 size={28} className="text-indigo-600" />
                Stok Hareketleri
              </h3>
              <p className="text-sm text-gray-600 mt-1">Tüm giriş, çıkış ve rezervasyon işlemleri</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Toplam: <span className="font-bold text-lg">{stockMovements?.length || 0}</span> hareket
              </div>
              {/* Super Admin: Tümünü Temizle Butonu */}
              {isSuperAdmin && stockMovements && stockMovements.length > 0 && (
                <button
                  onClick={async () => {
                    if (window.confirm(`⚠️ DİKKAT!\n\nTüm stok hareketleri (${stockMovements.length} kayıt) kalıcı olarak silinecek!\n\nBu işlem geri alınamaz. Devam etmek istiyor musunuz?`)) {
                      if (window.confirm('🔴 SON UYARI!\n\nBu işlem TÜM stok hareket kayıtlarını silecek. Emin misiniz?')) {
                        try {
                          for (const movement of stockMovements) {
                            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stock_movements', movement.id));
                          }
                          alert('✅ Tüm stok hareketleri başarıyla silindi!');
                        } catch (error) {
                          console.error('Silme hatası:', error);
                          alert('❌ Silme işlemi sırasında hata oluştu: ' + error.message);
                        }
                      }
                    }
                  }}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-all"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Tümünü Temizle</span>
                </button>
              )}
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-3 rounded-lg">
                  <PackagePlus size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">Toplam Giriş</p>
                  <p className="text-2xl font-bold text-green-900">
                    {stockMovements?.filter(m => m.type === 'GIRIS').length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border-2 border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500 p-3 rounded-lg">
                  <AlertCircle size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Rezervasyonlar</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {stockMovements?.filter(m => m.type === 'REZERVE').length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border-2 border-red-200">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-3 rounded-lg">
                  <Truck size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-red-700 font-medium">Sarfiyat</p>
                  <p className="text-2xl font-bold text-red-900">
                    {stockMovements?.filter(m => m.type === 'SARFIYAT').length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <Calculator size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">Toplam Metraj</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {(stockMovements?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0).toFixed(0)} m
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hareketler Listesi */}
          {(!stockMovements || stockMovements.length === 0) ? (
            <div className="text-center py-16 text-gray-400">
              <BarChart3 size={80} className="mx-auto mb-4 opacity-30" />
              <p className="text-xl">Henüz stok hareketi yok</p>
              <p className="text-sm mt-2">Bobin girişi, rezervasyon veya üretim işlemleri yapıldığında burada görünecek</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b-2 border-indigo-200">
                  <tr>
                    <th className="p-3 text-left font-bold">Tarih/Saat</th>
                    <th className="p-3 text-left font-bold">Tip</th>
                    <th className="p-3 text-left font-bold">Barkod</th>
                    <th className="p-3 text-left font-bold">Hammadde</th>
                    <th className="p-3 text-center font-bold">Miktar</th>
                    <th className="p-3 text-left font-bold">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.map(movement => {
                    const movementDate = new Date(movement.createdAt);
                    const typeColors = {
                      'GIRIS': 'bg-green-100 text-green-800',
                      'REZERVE': 'bg-yellow-100 text-yellow-800',
                      'SARFIYAT': 'bg-red-100 text-red-800'
                    };
                    
                    return (
                      <tr key={movement.id} className="border-b border-gray-100 hover:bg-indigo-50">
                        <td className="p-3">
                          <div className="text-xs text-gray-600">
                            {movementDate.toLocaleDateString('tr-TR')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {movementDate.toLocaleTimeString('tr-TR')}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${typeColors[movement.type] || 'bg-gray-100 text-gray-800'}`}>
                            {movement.type}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-xs">{movement.rollBarcode}</span>
                        </td>
                        <td className="p-3 text-xs">{movement.materialName}</td>
                        <td className="p-3 text-center">
                          <span className="font-bold">{movement.quantity}</span>
                          <span className="text-gray-500 ml-1">{movement.unit}</span>
                        </td>
                        <td className="p-3 text-xs text-gray-600">
                          {movement.description}
                          {movement.orderNo && (
                            <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px]">
                              {movement.orderNo}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-xl shadow-md border-2 border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Sipariş No, Ürün Adı veya Firma Adına Göre Ara..."
            className="input-field pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-gray-200 pb-4">
        <div className="flex space-x-4 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('raw');
              setSelectedOrder(null);
            }}
            className={`pb-3 px-6 font-bold whitespace-nowrap transition-all relative ${
              activeTab === 'raw'
                ? 'text-indigo-600 border-b-4 border-indigo-600'
                : 'text-gray-500 hover:text-indigo-500 border-b-4 border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <Archive size={20} />
              <span>Hammadde Girişi</span>
            </div>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('shipping');
              setSelectedOrder(null);
            }}
            className={`pb-3 px-6 font-bold whitespace-nowrap transition-all relative ${
              activeTab === 'shipping'
                ? 'text-green-600 border-b-4 border-green-600'
                : 'text-gray-500 hover:text-green-500 border-b-4 border-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <Truck size={20} />
              <span>Sevkiyat Yönetimi</span>
            </div>
          </button>
        </div>

        <div className="flex bg-white rounded-lg border-2 border-gray-200 p-1 shadow-sm">
          <button
            onClick={() => setListMode('pending')}
            className={`px-4 py-2 text-xs font-bold rounded transition-all ${
              listMode === 'pending'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Bekleyenler
          </button>
          <button
            onClick={() => setListMode('all')}
            className={`px-4 py-2 text-xs font-bold rounded transition-all ${
              listMode === 'all'
                ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Tüm İşler / Düzeltme
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Order List */}
        <div className="lg:col-span-1 space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2 mb-4">
            {activeTab === 'raw' ? (
              <>
                <Archive size={20} className="text-indigo-500" />
                <span>Hammadde İşlemleri</span>
              </>
            ) : (
              <>
                <Truck size={20} className="text-green-500" />
                <span>Sevkiyat İşlemleri</span>
              </>
            )}
            <span className="ml-auto text-sm bg-gray-100 px-3 py-1 rounded-full">
              {currentList.length}
            </span>
          </h3>

          {currentList.map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative group ${
                selectedOrder?.id === order.id
                  ? activeTab === 'raw'
                    ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-400 shadow-lg ring-2 ring-indigo-300'
                    : 'bg-gradient-to-r from-green-50 to-green-100 border-green-400 shadow-lg ring-2 ring-green-300'
                  : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              {isSuperAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOrder(order.id);
                  }}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Sil"
                >
                  <Trash2 size={16} />
                </button>
              )}

              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-800">{order.orderNo}</span>
                {order.warehouseData?.materialStatus && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    order.warehouseData.materialStatus === 'Dilimleme Aşamasında'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {order.warehouseData.materialStatus}
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-600 mb-1">{order.customer}</div>
              <div className="text-xs text-gray-500 mb-2">{order.product}</div>

              <div className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-bold mb-2">
                ⏰ Termin: {order.customerDeadline}
              </div>

              {/* Graphics Data Summary */}
              {order.graphicsData && (
                <div className="text-[10px] text-gray-500 space-y-1 border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span>Hammadde:</span>
                    <span className="font-bold text-gray-700">
                      {order.rawMaterial?.substring(0, 20)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kağıt Eni:</span>
                    <span className="font-bold text-indigo-700">
                      {order.graphicsData.paperWidth}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metraj (Net):</span>
                    <span className="font-bold text-indigo-700">
                      {order.graphicsData.meterage}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {currentList.length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-300">
              {activeTab === 'raw' ? <Archive size={48} className="mx-auto mb-3 opacity-20" /> : <Truck size={48} className="mx-auto mb-3 opacity-20" />}
              <p className="text-sm">Kayıt yok</p>
            </div>
          )}
        </div>

        {/* Right Panel - Warehouse Operations */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-gray-100 animate-slide-in">
              {/* Order Header */}
              <div className={`${activeTab === 'raw' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : 'bg-gradient-to-r from-green-500 to-green-600'} text-white p-6 rounded-xl shadow-lg mb-6 -mx-8 -mt-8`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{selectedOrder.orderNo}</h2>
                    <p className="text-white/90">{selectedOrder.customer} - {selectedOrder.product}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/70 uppercase tracking-wider mb-1">Termin</div>
                    <div className="text-xl font-bold">{selectedOrder.customerDeadline}</div>
                  </div>
                </div>
              </div>

              {/* Graphics Data Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl mb-6 border-2 border-blue-100">
                <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Settings size={16} />
                  Grafikten Gelen Veriler
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Hammadde</div>
                    <div className="font-bold text-gray-800 text-sm">
                      {selectedOrder.rawMaterial}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Kağıt Eni</div>
                    <div className="font-bold text-indigo-700 text-lg">
                      {selectedOrder.graphicsData?.paperWidth}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Net Metraj</div>
                    <div className="font-bold text-indigo-700 text-lg">
                      {selectedOrder.graphicsData?.meterage}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="mb-6">
                <AttachmentManager order={activeOrder} compact={true} />
              </div>

              {/* Forms */}
              {activeTab === 'raw' ? (
                <form onSubmit={handleRawMaterialSave} className="space-y-6">
                  <h4 className="font-bold text-xl text-indigo-600 flex items-center gap-2 border-b-2 border-indigo-100 pb-3">
                    <ClipboardCheck size={22} />
                    Hammadde Hazırlık & Fire Planı
                  </h4>

                  {/* Material Status */}
                  <div>
                    <label className="label">Hammadde Durumu</label>
                    <select
                      required
                      className="input-field"
                      value={wData.materialStatus}
                      onChange={e => setWData({ ...wData, materialStatus: e.target.value })}
                    >
                      <option value="">Seçiniz...</option>
                      <option>Stokta Yok</option>
                      <option>Hazır</option>
                      <option>Tedarik Ediliyor</option>
                      <option>Dilimleme Aşamasında</option>
                    </select>
                  </div>

                  {/* 📦 BOBIN REZERVASYON SİSTEMİ */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200">
                    <div className="flex items-center gap-3 mb-4">
                      <PackageCheck size={24} className="text-purple-600" />
                      <div>
                        <h4 className="text-lg font-bold text-purple-900">Bobin Rezervasyonu</h4>
                        <p className="text-xs text-purple-700">
                          Bu sipariş için hammadde bobini tahsis edin
                        </p>
                      </div>
                    </div>

                    {selectedOrder.rawMaterial && stockRolls && stockRolls.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-700">
                          <strong>Aranan Hammadde:</strong> {selectedOrder.rawMaterial}
                        </p>
                        
                        {/* Rezerve Edilmiş Bobinler */}
                        {selectedOrder.warehouseData?.reservedRolls && selectedOrder.warehouseData.reservedRolls.length > 0 && (
                          <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                            <h5 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                              <CheckCircle size={16} />
                              Rezerve Edilmiş Bobinler
                            </h5>
                            {selectedOrder.warehouseData.reservedRolls.map((res, idx) => (
                              <div key={idx} className="text-sm text-green-700 flex justify-between items-center mb-1">
                                <span>🏷️ {res.rollBarcode}</span>
                                <span className="font-bold">{res.reservedLength} m</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Mevcut Bobinler */}
                        <div className="space-y-2">
                          <h5 className="font-bold text-gray-800 text-sm">
                            Mevcut Bobinler: 
                            <span className="text-xs text-gray-500 ml-2">
                              (Toplam {stockRolls.filter(r => !r.isDilim && r.currentLength > 0 && !r.reservationId).length} bobin)
                            </span>
                          </h5>
                          {stockRolls
                            .filter(roll => {
                              // Temel filtreler
                              if (roll.isDilim || roll.currentLength <= 0 || roll.reservationId) {
                                return false;
                              }
                              
                              // Hammadde eşleşmesi (daha esnek)
                              const orderMaterial = (selectedOrder.rawMaterial || '').toLowerCase().trim();
                              const rollMaterial = (roll.materialName || '').toLowerCase().trim();
                              
                              // Tam eşleşme veya içerme kontrolü
                              return !orderMaterial || rollMaterial.includes(orderMaterial) || orderMaterial.includes(rollMaterial);
                            })
                            .sort((a, b) => b.currentLength - a.currentLength)
                            .map(roll => (
                              <div key={roll.id} className="bg-white p-3 rounded-lg border border-purple-200 flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="font-mono text-sm font-bold text-purple-700">{roll.rollBarcode}</div>
                                  <div className="text-xs text-gray-600">
                                    {roll.widthCM} cm × {roll.currentLength} m - {roll.supplierName}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const length = prompt(`Bu bobinden kaç metre rezerve edilsin?\n\nMevcut: ${roll.currentLength} m`);
                                    if (length && !isNaN(length) && parseFloat(length) > 0 && parseFloat(length) <= roll.currentLength) {
                                      try {
                                        // Mevcut warehouseData'yı al veya yeni oluştur
                                        const currentWarehouseData = selectedOrder.warehouseData || {};
                                        const reservedRolls = currentWarehouseData.reservedRolls || [];
                                        
                                        // Yeni rezervasyonu ekle
                                        const newReservation = {
                                          rollBarcode: roll.rollBarcode,
                                          rollId: roll.id,
                                          reservedLength: parseFloat(length),
                                          reservedAt: new Date().toISOString()
                                        };
                                        
                                        reservedRolls.push(newReservation);
                                        
                                        // warehouseData'yı tamamen güncelle
                                        const updatedWarehouseData = {
                                          ...currentWarehouseData,
                                          reservedRolls: reservedRolls
                                        };

                                        // Order'ı güncelle
                                        await updateDoc(
                                          doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id),
                                          { warehouseData: updatedWarehouseData }
                                        );

                                        // Bobini rezerve et VE kalan metrajı güncelle
                                        const reservedLength = parseFloat(length);
                                        const newCurrentLength = roll.currentLength - reservedLength;
                                        
                                        await updateDoc(
                                          doc(db, 'artifacts', appId, 'public', 'data', 'stock_rolls', roll.id),
                                          { 
                                            currentLength: Math.max(0, newCurrentLength), // Negatif olmasını önle
                                            reservationId: selectedOrder.id,
                                            reservedAt: new Date().toISOString(),
                                            reservedOrderNo: selectedOrder.orderNo,
                                            reservedLength: reservedLength
                                          }
                                        );

                                        // Stok hareketi kaydet
                                        await logStockMovement(db, appId, {
                                          type: 'REZERVE',
                                          rollBarcode: roll.rollBarcode,
                                          materialName: roll.materialName,
                                          supplierName: roll.supplierName,
                                          quantity: reservedLength,
                                          unit: 'm',
                                          description: `Sipariş rezervasyonu - ${selectedOrder.orderNo}`,
                                          referenceType: 'REZERVASYON',
                                          referenceId: selectedOrder.id,
                                          orderNo: selectedOrder.orderNo
                                        });

                                        alert(`✅ Bobin rezerve edildi!\n\nBarkod: ${roll.rollBarcode}\nRezerve: ${length} m\nKalan: ${newCurrentLength} m`);
                                        
                                        // Sayfayı yenile
                                        window.location.reload();
                                      } catch (error) {
                                        console.error('Rezervasyon hatası:', error);
                                        alert('❌ Hata: ' + error.message);
                                      }
                                    } else if (length) {
                                      alert('⚠️ Geçersiz miktar! Lütfen mevcut stoktan az veya eşit bir değer girin.');
                                    }
                                  }}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                                >
                                  Rezerve Et
                                </button>
                              </div>
                            ))}
                          
                          {stockRolls.filter(roll => {
                            if (roll.isDilim || roll.currentLength <= 0 || roll.reservationId) return false;
                            const orderMaterial = (selectedOrder.rawMaterial || '').toLowerCase().trim();
                            const rollMaterial = (roll.materialName || '').toLowerCase().trim();
                            return !orderMaterial || rollMaterial.includes(orderMaterial) || orderMaterial.includes(rollMaterial);
                          }).length === 0 && (
                            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200 text-center">
                              <p className="text-sm text-yellow-700">
                                ⚠️ Uygun bobin bulunamadı. 
                                <br />
                                <span className="text-xs">
                                  Hammadde: "{selectedOrder.rawMaterial}"
                                  <br />
                                  Lütfen yukarıdaki "Bobin Girişi" butonundan yeni bobin ekleyin.
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Package size={48} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Stok yok veya hammadde bilgisi eksik</p>
                        <p className="text-xs mt-2">Önce "Bobin Girişi" yapın</p>
                      </div>
                    )}
                  </div>

                  {/* 🔥 FIRE CALCULATION SECTION - HIGHLIGHT FEATURE */}
                  <div className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-6 rounded-2xl border-3 border-orange-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl shadow-md">
                        <Calculator size={24} className="text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-orange-900">
                          Fire Hesaplama Sistemi
                        </h4>
                        <p className="text-xs text-orange-700">
                          Üretime gönderilecek toplam metrajı hesaplayın
                        </p>
                      </div>
                    </div>

                    {/* Visual Flow Diagram */}
                    <div className="grid grid-cols-5 gap-2 items-center mb-6">
                      <div className="col-span-2 bg-white p-4 rounded-xl border-2 border-blue-300 text-center">
                        <div className="text-[10px] text-blue-600 font-bold uppercase mb-1">
                          Grafik Net Metraj
                        </div>
                        <div className="text-2xl font-bold text-blue-700">
                          {selectedOrder.graphicsData?.meterage?.replace(' mt', '') || '0'} mt
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <Plus size={20} className="text-orange-500 font-bold" />
                      </div>

                      <div className="col-span-2 bg-white p-4 rounded-xl border-2 border-green-300 text-center">
                        <div className="text-[10px] text-green-600 font-bold uppercase mb-1">
                          Depodan Çıkacak (Fire Dahil)
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          {wData.issuedMeterage} mt
                        </div>
                      </div>
                    </div>

                    {/* Fire Rate Input */}
                    <div className="bg-white p-5 rounded-xl border-2 border-orange-300">
                      <label className="label text-orange-800 font-bold flex items-center gap-2 mb-3">
                        <AlertTriangle size={18} />
                        Fire Oranı Belirleyin (%)
                      </label>

                      <div className="flex gap-4 items-center">
                        {/* Slider */}
                        <input
                          type="range"
                          min="0"
                          max="30"
                          step="1"
                          className="flex-1 h-3 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-full appearance-none cursor-pointer"
                          value={wData.wastageRate}
                          onChange={e => setWData({ ...wData, wastageRate: parseFloat(e.target.value) })}
                          style={{
                            background: `linear-gradient(to right, #86efac 0%, #fef08a ${(wData.wastageRate / 30) * 100}%, #fca5a5 100%)`
                          }}
                        />

                        {/* Number Input */}
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            step="0.5"
                            className="input-field pr-8 text-center font-bold text-lg"
                            value={wData.wastageRate}
                            onChange={e => setWData({ ...wData, wastageRate: parseFloat(e.target.value) || 0 })}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-600 font-bold">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Quick Select Buttons */}
                      <div className="flex gap-2 mt-4">
                        <span className="text-xs text-gray-600 font-bold">Hızlı Seçim:</span>
                        {[5, 10, 15, 20].map(rate => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setWData({ ...wData, wastageRate: rate })}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              wData.wastageRate === rate
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50'
                            }`}
                          >
                            %{rate}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculation Breakdown */}
                    <div className="mt-5 bg-white p-4 rounded-xl border-2 border-dashed border-orange-300">
                      <div className="text-xs font-bold text-orange-800 mb-3 uppercase tracking-wide">
                        📊 Hesaplama Detayı
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Net İhtiyaç:</span>
                          <span className="font-bold">
                            {selectedOrder.graphicsData?.meterage?.replace(' mt', '') || '0'} mt
                          </span>
                        </div>
                        <div className="flex justify-between text-orange-600">
                          <span>Fire Payı ({wData.wastageRate}%):</span>
                          <span className="font-bold">
                            +{Math.ceil((parseFloat(selectedOrder.graphicsData?.meterage?.replace(/[^0-9.]/g, '')) || 0) * (wData.wastageRate / 100))} mt
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t-2 border-orange-200 text-lg font-bold text-green-700">
                          <span>Üretime Verilecek:</span>
                          <span>{wData.issuedMeterage} mt</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                      <p className="text-xs text-yellow-800 italic">
                        💡 <strong>Not:</strong> Fire oranı, üretim sürecinde oluşabilecek kayıpları karşılamak için net metraj üzerine eklenir. Önerilen: %10-15
                      </p>
                    </div>
                  </div>

                  {/* Slitting Date (Conditional) */}
                  {wData.materialStatus === 'Dilimleme Aşamasında' && (
                    <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200 animate-in slide-in-from-top-2">
                      <label className="label text-yellow-800 font-bold">
                        Dilimleme Tarihi Belirtin
                      </label>
                      <input
                        required
                        type="date"
                        className="input-field border-yellow-300 focus:ring-yellow-500"
                        value={wData.slittingDate}
                        onChange={e => setWData({ ...wData, slittingDate: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    disabled={isSaving}
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={24} />
                        {listMode === 'all' ? 'Düzeltmeyi Kaydet' : 'Durumu Kaydet / Planlamaya İlet'}
                      </>
                    )}
                  </button>
                </form>
              ) : (
                // Shipping Form
                <form onSubmit={handleShippingSave} className="space-y-6">
                  <h4 className="font-bold text-xl text-green-600 flex items-center gap-2 border-b-2 border-green-100 pb-3">
                    <Truck size={22} />
                    Sevkiyat İşlemi
                  </h4>

                  <div>
                    <label className="label">Sevkiyat Durumu</label>
                    <select
                      required
                      className="input-field"
                      value={wData.shippingStatus}
                      onChange={e => setWData({ ...wData, shippingStatus: e.target.value })}
                    >
                      <option value="">Seçiniz...</option>
                      <option>Sevk Bekliyor</option>
                      <option>Sevk Edildi</option>
                    </select>
                  </div>

                  <button
                    disabled={isSaving}
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={24} />
                        {listMode === 'all' ? 'Düzeltmeyi Kaydet' : 'Sevkiyat Durumunu Güncelle'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-white p-16 rounded-2xl shadow-xl border-2 border-dashed border-gray-300 text-center">
              <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                {activeTab === 'raw' ? (
                  <Archive size={48} className="text-indigo-600" />
                ) : (
                  <Truck size={48} className="text-green-600" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                İşlem yapmak için sipariş seçin
              </h3>
              <p className="text-gray-500">
                Soldan bir sipariş kartına tıklayarak {activeTab === 'raw' ? 'hammadde' : 'sevkiyat'} işlemlerini yapabilirsiniz
              </p>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

