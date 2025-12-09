import React, { useState } from 'react';
import { Calendar, Clock, Plus, CheckCircle, X, Loader2, Search, Trash2, ChevronLeft, ChevronRight, Component, Grid, Layers, List, Sparkles } from 'lucide-react';
import { updateDoc, doc } from "firebase/firestore";
import { db, appId } from '../../services/firebase';
import StatusBadge from '../shared/StatusBadge';

export default function PlanningDashboard({ orders, isSuperAdmin }) {
  const [pData, setPData] = useState({ startDate: '', startHour: '08:00', duration: 2 });
  const [selectedId, setSelectedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState('daily');
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");
  const [leftPanelTab, setLeftPanelTab] = useState('pending'); // 'pending' or 'planned'
  const [searchQuery, setSearchQuery] = useState('');
  const [productionFlow, setProductionFlow] = useState([]);
  
  // Mevcut istasyonlar (ProductionDashboard ile aynı)
  const availableStations = {
    // Etiket için
    'bobst_m1': { name: 'Bobst M1 Operatörü', category: 'Etiket', order: 1 },
    'etiket_qc': { name: 'Kalite Kontrol (Etiket)', category: 'Etiket', order: 2, isFinal: true },
    
    // Ambalaj için
    'bobst_m1_ambalaj': { name: 'Bobst M1 Operatörü', category: 'Ambalaj', order: 1 },
    'hibrit': { name: 'Hibrit Operatörü', category: 'Ambalaj', order: 1 },
    'muhürleme': { name: 'Mühürleme', category: 'Ambalaj', order: 2 },
    'sleeve_qc': { name: 'Sleeve Kalite Kontrol', category: 'Ambalaj', order: 3, isFinal: true },
    'tabakalama': { name: 'Tabakalama', category: 'Ambalaj', order: 4, optional: true }
  };

  const selectedOrder = orders.find(o => o.id === selectedId);
  const isEditing = selectedOrder?.status === 'planned' || 
                    selectedOrder?.status === 'shipping_ready' || 
                    selectedOrder?.status === 'completed';

  // Filter by search
  const filterOrders = (orderList) => {
    if (!searchQuery) return orderList;
    return orderList.filter(order => 
      order.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const readyForPlanning = filterOrders(orders.filter(o => o.status === 'planning_pending'));
  const plannedOrders = filterOrders(orders.filter(o => 
    o.status === 'planned' || 
    o.status === 'production_started' || 
    o.status === 'shipping_ready' || 
    o.status === 'completed'
  ));
  const daysPlans = plannedOrders.filter(o => o.planningData?.startDate === viewDate);

  const handlePlan = async (e) => {
    e.preventDefault();
    if (!pData.startDate) return alert("Tarih seçin!");
    if (productionFlow.length === 0) return alert("⚠️ En az bir istasyon seçmelisiniz!");
    
    setIsSaving(true);

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedId);
      await updateDoc(docRef, {
        status: 'planned',
        planningData: {
          startDate: pData.startDate,
          startHour: pData.startHour,
          duration: pData.duration,
          productionDate: pData.startDate,
          productionFlow: productionFlow // İstasyon akışını kaydet
        }
      });
      setSelectedId(null);
      setPData({ startDate: '', startHour: '08:00', duration: 2 });
      setProductionFlow([]);
      setAiAdvice("");
    } catch (error) {
      console.error("Planning save error:", error);
      alert("Hata: " + error.message);
    }
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
      setProductionFlow(order.planningData.productionFlow || []);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setSelectedId(null);
    setPData({ startDate: '', startHour: '08:00', duration: 2 });
    setProductionFlow([]);
    setAiAdvice("");
  };

  const handleAiEstimate = async () => {
    if (!selectedOrder) return;
    setIsAiLoading(true);
    
    const prompt = `Sen bir etiket ve matbaa üretim planlama uzmanısın. 
    Ürün: ${selectedOrder.product}, 
    Miktar: ${selectedOrder.quantity}, 
    Makina: ${selectedOrder.graphicsData?.machine || 'Belirtilmemiş'}, 
    Baskı: ${selectedOrder.graphicsData?.printType || '-'}, 
    Zet: ${selectedOrder.graphicsData?.zet || 'Standart'}, 
    Metraj: ${selectedOrder.warehouseData?.issuedMeterage || selectedOrder.graphicsData?.meterage || '-'}.
    
    Tahmini üretim süresini (Hazırlık + Üretim) saat cinsinden hesapla. 
    Yanıt Formatı (JSON): { "duration": 4, "reason": "Hazırlık 2 saat + baskı 2 saat." }`;

    const responseText = await callGemini(prompt);
    
    try {
      const jsonStr = responseText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(jsonStr);
      if (result.duration) {
        setPData(prev => ({ ...prev, duration: result.duration }));
        setAiAdvice(result.reason);
      }
    } catch (e) {
      setAiAdvice("Tahmin oluşturulamadı.");
    }
    setIsAiLoading(false);
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("DİKKAT: Bu siparişi kalıcı olarak silmek üzeresiniz.")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
        if (selectedId === orderId) setSelectedId(null);
      } catch (error) {
        alert("Silme hatası.");
      }
    }
  };

  const shift1Hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  const shift2Hours = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00"];

  // Status helper
  const getStatusInfo = (status) => {
    switch(status) {
      case 'planned':
        return { label: 'Planlandı', color: 'bg-blue-100 text-blue-800', icon: '📅' };
      case 'production_started':
        return { label: 'Üretimde', color: 'bg-green-100 text-green-800', icon: '⚙️' };
      case 'shipping_ready':
        return { label: 'Sevkiyat Hazır', color: 'bg-purple-100 text-purple-800', icon: '📦' };
      case 'completed':
        return { label: 'Tamamlandı', color: 'bg-gray-100 text-gray-800', icon: '✅' };
      default:
        return { label: 'Planlama Bekliyor', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' };
    }
  };

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
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-gray-200 pb-4 mb-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            Üretim Planlama
          </h2>
          <p className="text-gray-600 mt-1">
            Vardiya atamaları ve üretim takvimi
          </p>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Tabs for Pending & Planned */}
        <div className="lg:col-span-4">
          {/* Tab Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLeftPanelTab('pending')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                leftPanelTab === 'pending'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock size={18} />
              Planlama Bekleyen
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                leftPanelTab === 'pending' ? 'bg-white text-red-600' : 'bg-gray-300 text-gray-700'
              }`}>
                {readyForPlanning.length}
              </span>
            </button>
            <button
              onClick={() => setLeftPanelTab('planned')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                leftPanelTab === 'planned'
                  ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CheckCircle size={18} />
              Planlanan İşler
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                leftPanelTab === 'planned' ? 'bg-white text-green-600' : 'bg-gray-300 text-gray-700'
              }`}>
                {plannedOrders.length}
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {/* PENDING TAB */}
            {leftPanelTab === 'pending' && (
              <>
                {readyForPlanning.length === 0 && (
                  <div className="text-center py-8 text-gray-400 bg-white border-2 border-dashed rounded-xl">
                    <Clock size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Bekleyen iş yok.</p>
                  </div>
                )}

                {readyForPlanning.map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedId(order.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative group ${
                  selectedId === order.id
                    ? 'bg-gradient-to-r from-green-50 to-teal-50 border-green-500 shadow-xl ring-2 ring-green-300'
                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-green-300 shadow-sm hover:shadow-md'
                }`}
              >
                {isSuperAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOrder(order.id);
                    }}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {/* Order Header */}
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold text-gray-800 text-lg">{order.orderNo}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    order.warehouseData?.materialStatus === 'Dilimleme Aşamasında'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {order.warehouseData?.materialStatus}
                  </span>
                </div>

                {/* Company & Product */}
                <div className="mb-3 border-b border-gray-200 pb-2">
                  <div className="text-sm font-semibold text-gray-700">{order.customer}</div>
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    {order.product}
                    {order.category === 'Ambalaj' && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[9px] font-bold">
                        Ambalaj
                      </span>
                    )}
                  </div>
                </div>

                {/* CRITICAL: Customer Deadline - HIGHLIGHTED */}
                <div className="mb-3 bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-lg shadow-md">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">
                    ⏰ Müşteri Termin Tarihi
                  </div>
                  <div className="text-xl font-bold">
                    {order.customerDeadline}
                  </div>
                </div>

                {/* Technical Details Summary */}
                <div className="text-[10px] text-gray-500 space-y-1.5 bg-gray-50 p-3 rounded-lg">
                  <div className="font-bold text-gray-700 mb-2 border-b border-gray-300 pb-1">
                    📋 Teknik Detaylar
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Makina:</span>
                    <span className="font-semibold text-gray-800">
                      {order.graphicsData?.machine}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Baskı/Renk:</span>
                    <span className="font-semibold text-gray-800">
                      {order.graphicsData?.printType} / {order.graphicsData?.color}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>ZET:</span>
                    <span className="font-semibold text-gray-800">
                      {order.graphicsData?.zet}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Kağıt Eni:</span>
                    <span className="font-semibold text-gray-800">
                      {order.graphicsData?.paperWidth}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Kağıt Türü:</span>
                    <span className="font-semibold text-gray-800 text-[9px]">
                      {order.rawMaterial || '-'}
                    </span>
                  </div>

                  {/* CRITICAL: Warehouse Meterage (with Waste) */}
                  <div className="pt-2 mt-2 border-t-2 border-green-300 bg-green-50 -mx-3 px-3 py-2 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-green-800">Depo Metraj (Fire Dahil):</span>
                      <span className="font-bold text-green-700 text-sm">
                        {order.warehouseData?.issuedMeterage 
                          ? `${order.warehouseData.issuedMeterage} mt`
                          : order.graphicsData?.meterage || '-'}
                      </span>
                    </div>
                    {order.warehouseData?.wastageRate > 0 && (
                      <div className="text-[9px] text-green-600 mt-1">
                        (Fire: %{order.warehouseData.wastageRate})
                      </div>
                    )}
                  </div>

                  {/* Additional Details */}
                  {order.category === 'Ambalaj' ? (
                    <>
                      <div className="flex justify-between">
                        <span>LF/CL:</span>
                        <span className="font-bold">
                          {order.graphicsData?.lfSize} / {order.graphicsData?.clSize}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Perfore:</span>
                        <span>{order.graphicsData?.perforation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Klişe:</span>
                        <span>{order.graphicsData?.plateStatus}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>Laminasyon:</span>
                        <span>{order.graphicsData?.lamination}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bıçak:</span>
                        <span>{order.graphicsData?.dieStatus}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Combine Badge */}
                {order.graphicsData?.combinedInfo > 1 && (
                  <div className="mt-3 flex items-center gap-1 text-orange-600 text-[10px] font-bold bg-orange-50 p-2 rounded-lg border border-orange-200 justify-center">
                    <Layers size={12} />
                    {order.graphicsData.combinedInfo} li Kombine
                  </div>
                )}
              </div>
            ))}
              </>
            )}

            {/* PLANNED TAB */}
            {leftPanelTab === 'planned' && (
              <>
                {plannedOrders.length === 0 && (
                  <div className="text-center py-8 text-gray-400 bg-white border-2 border-dashed rounded-xl">
                    <CheckCircle size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Henüz planlanmış iş yok.</p>
                  </div>
                )}

                {plannedOrders.map(order => {
                  const statusInfo = getStatusInfo(order.status);
                  return (
                    <div
                      key={order.id}
                      onClick={() => handleEditPlan(order)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative group ${
                        selectedId === order.id
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 shadow-xl ring-2 ring-blue-300'
                          : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {isSuperAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
                          className="absolute top-2 right-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {/* Order Header with Status */}
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-gray-800 text-lg">{order.orderNo}</span>
                        <span className={`text-[10px] px-2 py-1 rounded font-bold ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>

                      {/* Company & Product */}
                      <div className="mb-3 border-b border-gray-200 pb-2">
                        <div className="text-sm font-semibold text-gray-700">{order.customer}</div>
                        <div className="text-xs text-gray-600">{order.product}</div>
                      </div>

                      {/* Planning Info Box */}
                      <div className="mb-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-lg shadow-md">
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">
                          📅 Planlanan Tarih & Saat
                        </div>
                        <div className="text-lg font-bold">
                          {order.planningData?.startDate} / {order.planningData?.startHour}
                        </div>
                        <div className="text-xs opacity-90 mt-1">
                          Süre: {order.planningData?.duration} saat
                        </div>
                      </div>

                      {/* Customer Deadline */}
                      <div className="mb-3 bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-lg shadow-md">
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mb-1">
                          ⏰ Müşteri Termin Tarihi
                        </div>
                        <div className="text-xl font-bold">
                          {order.customerDeadline}
                        </div>
                      </div>

                      {/* Technical Summary */}
                      <div className="text-[10px] text-gray-500 space-y-1.5 bg-gray-50 p-3 rounded-lg">
                        <div className="font-bold text-gray-700 mb-2 border-b border-gray-300 pb-1">
                          📋 Teknik Özet
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Makina:</span>
                          <span className="font-semibold text-gray-800">
                            {order.graphicsData?.machine}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Baskı:</span>
                          <span className="font-semibold text-gray-800">
                            {order.graphicsData?.printType}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Kağıt Türü:</span>
                          <span className="font-semibold text-gray-800 text-[9px]">
                            {order.rawMaterial || '-'}
                          </span>
                        </div>

                        {/* Warehouse Meterage */}
                        <div className="pt-2 mt-2 border-t-2 border-green-300 bg-green-50 -mx-3 px-3 py-2 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-green-800">Depo Metraj:</span>
                            <span className="font-bold text-green-700 text-sm">
                              {order.warehouseData?.issuedMeterage 
                                ? `${order.warehouseData.issuedMeterage} mt`
                                : order.graphicsData?.meterage || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Edit Button Hint */}
                      <div className="mt-3 text-center">
                        <span className="text-[10px] text-blue-600 font-bold">
                          Tıklayarak düzenleyin 📝
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Planning Form & Calendar */}
        <div className="lg:col-span-8 space-y-6">
          {selectedId ? (
            <div className={`p-8 rounded-2xl shadow-xl border-2 animate-slide-in ${
              isEditing 
                ? 'border-blue-200 bg-blue-50' 
                : 'border-green-200 bg-white'
            }`}>
              {/* Planning Form Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className={`text-2xl font-bold ${
                    isEditing ? 'text-blue-700' : 'text-green-700'
                  }`}>
                    {isEditing ? 'Planı Düzenle / Güncelle' : 'Seçili İş İçin Vardiya Ata'}
                  </h3>
                  {isEditing && (
                    <div className="text-sm text-blue-600 mt-1">
                      Şu an <strong>{selectedOrder.orderNo}</strong> siparişini düzenliyorsunuz.
                    </div>
                  )}
                </div>
                {selectedId && (
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-500 hover:text-red-600 text-sm flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-all"
                  >
                    <X size={16} />
                    İptal
                  </button>
                )}
              </div>

              {/* Selected Order Full Details */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl mb-6 border-2 border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Order Info */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Sipariş Bilgileri
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="font-bold text-lg text-gray-800">
                        {selectedOrder.orderNo}
                      </div>
                      <div className="text-gray-700">{selectedOrder.customer}</div>
                      <div className="text-gray-600">{selectedOrder.product}</div>
                      <div className="font-bold text-gray-800">{selectedOrder.quantity}</div>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Teknik Özellikler
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Makina:</span>
                        <span className="font-bold text-gray-800">
                          {selectedOrder.graphicsData?.machine}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Baskı:</span>
                        <span className="font-bold text-gray-800">
                          {selectedOrder.graphicsData?.printType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Renk:</span>
                        <span className="font-bold text-gray-800">
                          {selectedOrder.graphicsData?.color}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ZET:</span>
                        <span className="font-bold text-gray-800">
                          {selectedOrder.graphicsData?.zet}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kağıt Eni:</span>
                        <span className="font-bold text-gray-800">
                          {selectedOrder.graphicsData?.paperWidth}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kağıt Türü:</span>
                        <span className="font-bold text-gray-800 text-[10px]">
                          {selectedOrder.rawMaterial || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Critical Info */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Kritik Bilgiler
                    </h4>
                    
                    {/* Deadline - HIGHLIGHTED */}
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-lg shadow-md mb-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                        Müşteri Termin
                      </div>
                      <div className="text-xl font-bold">
                        {selectedOrder.customerDeadline}
                      </div>
                    </div>

                    {/* Warehouse Meterage - HIGHLIGHTED */}
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-lg shadow-md">
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                        Depo Metraj (Fire Dahil)
                      </div>
                      <div className="text-xl font-bold">
                        {selectedOrder.warehouseData?.issuedMeterage 
                          ? `${selectedOrder.warehouseData.issuedMeterage} mt`
                          : selectedOrder.graphicsData?.meterage || '-'}
                      </div>
                      {selectedOrder.warehouseData?.wastageRate > 0 && (
                        <div className="text-xs opacity-90 mt-1">
                          Fire Oranı: %{selectedOrder.warehouseData.wastageRate}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Planning Form */}
              <form onSubmit={handlePlan} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Date */}
                  <div>
                    <label className="label">Tarih</label>
                    <input
                      required
                      type="date"
                      className="input-field"
                      value={pData.startDate}
                      onChange={e => setPData({ ...pData, startDate: e.target.value })}
                    />
                  </div>

                  {/* Start Hour */}
                  <div>
                    <label className="label">Başlangıç Saati</label>
                    <select
                      className="input-field"
                      value={pData.startHour}
                      onChange={e => setPData({ ...pData, startHour: e.target.value })}
                    >
                      {[...shift1Hours, ...shift2Hours].filter(h => h !== "12:00").map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration with AI */}
                  <div className="relative">
                    <label className="label flex items-center gap-1">
                      Süre (Saat)
                      <button
                        type="button"
                        onClick={handleAiEstimate}
                        disabled={isAiLoading}
                        className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded hover:bg-purple-200 flex items-center gap-1 ml-2 border border-purple-300 transition-colors"
                      >
                        {isAiLoading ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Sparkles size={10} />
                        )}
                        AI Tahmin
                      </button>
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="16"
                      className="input-field"
                      value={pData.duration}
                      onChange={e => setPData({ 
                        ...pData, 
                        duration: e.target.value === '' ? '' : parseInt(e.target.value) 
                      })}
                    />
                  </div>
                </div>

                {/* İstasyon Akışı Seçimi */}
                <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                  <h4 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <Component size={20} />
                    Üretim İstasyon Akışı *
                  </h4>
                  <p className="text-sm text-indigo-700 mb-4">
                    Bu sipariş hangi istasyonlardan geçecek? Sırayla seçin:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {Object.entries(availableStations)
                      .filter(([key, station]) => {
                        // Seçili siparişin kategorisine göre filtrele
                        const selectedOrder = orders.find(o => o.id === selectedId);
                        if (!selectedOrder) return true;
                        return !station.category || station.category === selectedOrder.category;
                      })
                      .map(([key, station]) => {
                        const isSelected = productionFlow.includes(key);
                        const orderIndex = productionFlow.indexOf(key);
                        
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setProductionFlow(productionFlow.filter(s => s !== key));
                              } else {
                                setProductionFlow([...productionFlow, key]);
                              }
                            }}
                            className={`p-3 rounded-lg font-bold text-sm transition-all border-2 ${
                              isSelected
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-700 shadow-lg'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                            }`}
                          >
                            {isSelected && (
                              <span className="inline-block bg-white text-indigo-600 rounded-full w-6 h-6 text-xs leading-6 mr-2">
                                {orderIndex + 1}
                              </span>
                            )}
                            {station.name}
                            {station.isFinal && ' 🏁'}
                            {station.optional && ' (Opsiyonel)'}
                          </button>
                        );
                      })}
                  </div>

                  {productionFlow.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                      <p className="text-sm font-bold text-indigo-900 mb-2">Seçilen İstasyon Sırası:</p>
                      <div className="flex flex-wrap gap-2">
                        {productionFlow.map((stationKey, index) => (
                          <div key={stationKey} className="flex items-center gap-2 bg-indigo-100 px-3 py-1 rounded-full">
                            <span className="font-bold text-indigo-900">{index + 1}.</span>
                            <span className="text-indigo-700">{availableStations[stationKey].name}</span>
                            <button
                              type="button"
                              onClick={() => setProductionFlow(productionFlow.filter(s => s !== stationKey))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {productionFlow.length === 0 && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                      ⚠️ En az bir istasyon seçmelisiniz!
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  disabled={isSaving}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3 ${
                    isEditing
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={24} />
                      {isEditing ? 'Planı Güncelle' : 'Planı Kaydet'}
                    </>
                  )}
                </button>
              </form>

              {/* AI Advice */}
              {aiAdvice && (
                <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl text-sm text-purple-800 flex items-start gap-2 animate-in fade-in">
                  <Sparkles size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Yapay Zeka Analizi:</span> {aiAdvice}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl h-full flex flex-col items-center justify-center text-gray-400 p-12">
              <Calendar size={64} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Planlama yapmak veya düzenlemek için bir iş seçin</p>
            </div>
          )}

          {/* Calendar View */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-green-50 to-teal-50 border-b-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                <Calendar size={24} className="text-green-600" />
                Üretim Çizelgesi
              </h3>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-4">
                <div className="flex bg-white rounded-lg border-2 border-gray-300 p-1">
                  <button
                    onClick={() => setViewMode('daily')}
                    className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-1 transition-all ${
                      viewMode === 'daily'
                        ? 'bg-green-100 text-green-700 shadow'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <List size={16} />
                    Günlük
                  </button>
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-1 transition-all ${
                      viewMode === 'weekly'
                        ? 'bg-green-100 text-green-700 shadow'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Grid size={16} />
                    Haftalık
                  </button>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const d = new Date(viewDate);
                      d.setDate(d.getDate() - (viewMode === 'weekly' ? 7 : 1));
                      setViewDate(d.toISOString().split('T')[0]);
                    }}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <input
                    type="date"
                    className="border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-sm font-medium"
                    value={viewDate}
                    onChange={e => setViewDate(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      const d = new Date(viewDate);
                      d.setDate(d.getDate() + (viewMode === 'weekly' ? 7 : 1));
                      setViewDate(d.toISOString().split('T')[0]);
                    }}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Daily View */}
            {viewMode === 'daily' && (
              <div className="p-6 overflow-x-auto">
                {/* Shift 1 */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-bold">
                      1. VARDİYA (08:00 - 17:00)
                    </span>
                  </div>
                  <div className="flex border-2 border-gray-200 rounded-lg bg-gray-50 h-32 relative min-w-[800px]">
                    {shift1Hours.map((hour, index) => (
                      <div
                        key={hour}
                        className={`flex-1 border-r border-gray-200 relative ${
                          hour === "12:00" ? "bg-gray-200" : ""
                        }`}
                      >
                        <span className="absolute top-1 left-1 text-[10px] font-bold text-gray-500">
                          {hour}
                        </span>
                        {hour === "12:00" && (
                          <span className="absolute top-10 left-2 text-[10px] -rotate-45 text-gray-400 font-bold">
                            MOLA
                          </span>
                        )}
                        {daysPlans.map(plan => {
                          if (plan.planningData.startHour === hour) {
                            return (
                              <div
                                key={plan.id}
                                className="absolute top-6 left-0 right-0 mx-1 bg-blue-500 text-white text-[10px] p-2 rounded-lg z-10 shadow-md overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors"
                                title={`${plan.orderNo} - ${plan.product}`}
                                onClick={() => handleEditPlan(plan)}
                                style={{ width: `calc(${plan.planningData.duration * 100}% - 8px)` }}
                              >
                                <div className="font-bold">{plan.orderNo}</div>
                                <div className="text-[9px] opacity-90">{plan.product}</div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shift 2 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-lg text-sm font-bold">
                      2. VARDİYA (17:00 - 01:00)
                    </span>
                  </div>
                  <div className="flex border-2 border-gray-200 rounded-lg bg-gray-50 h-32 relative min-w-[800px]">
                    {shift2Hours.map(hour => (
                      <div key={hour} className="flex-1 border-r border-gray-200 relative">
                        <span className="absolute top-1 left-1 text-[10px] font-bold text-gray-500">
                          {hour}
                        </span>
                        {daysPlans.map(plan => {
                          if (plan.planningData.startHour === hour) {
                            return (
                              <div
                                key={plan.id}
                                className="absolute top-6 left-0 right-0 mx-1 bg-indigo-500 text-white text-[10px] p-2 rounded-lg z-10 shadow-md overflow-hidden cursor-pointer hover:bg-indigo-600 transition-colors"
                                title={`${plan.orderNo} - ${plan.product}`}
                                onClick={() => handleEditPlan(plan)}
                                style={{ width: `calc(${plan.planningData.duration * 100}% - 8px)` }}
                              >
                                <div className="font-bold">{plan.orderNo}</div>
                                <div className="text-[9px] opacity-90">{plan.product}</div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Weekly View */}
            {viewMode === 'weekly' && (
              <div className="p-6 overflow-x-auto">
                <div className="grid grid-cols-7 min-w-[1000px] border-2 rounded-lg overflow-hidden">
                  {weekDates.map(dateStr => {
                    const daysOrders = plannedOrders.filter(
                      o => o.planningData?.startDate === dateStr
                    );
                    const shift1 = daysOrders.filter(
                      o => parseInt(o.planningData.startHour.split(':')[0]) < 17
                    );
                    const shift2 = daysOrders.filter(o => {
                      const h = parseInt(o.planningData.startHour.split(':')[0]);
                      return h >= 17 || h === 0;
                    });
                    const isSelectedDay = dateStr === viewDate;

                    return (
                      <div
                        key={dateStr}
                        className={`border-r last:border-r-0 flex flex-col ${
                          isSelectedDay ? 'bg-green-50' : 'bg-white'
                        }`}
                      >
                        <div
                          onClick={() => {
                            setViewDate(dateStr);
                            setViewMode('daily');
                          }}
                          className={`p-3 text-center border-b font-bold text-sm cursor-pointer hover:bg-green-100 transition-colors ${
                            isSelectedDay ? 'text-green-800 bg-green-100' : 'text-gray-700'
                          }`}
                        >
                          {formatDateTR(dateStr)}
                        </div>
                        <div className="flex-1 p-2 space-y-2 min-h-[200px]">
                          {/* Shift 1 */}
                          <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 min-h-[90px]">
                            <div className="text-[10px] font-bold text-blue-800 mb-1 text-center">
                              1. Vardiya
                            </div>
                            {shift1.map(o => (
                              <div
                                key={o.id}
                                onClick={() => handleEditPlan(o)}
                                className="bg-white border border-blue-200 rounded px-2 py-1 text-[10px] mb-1 truncate shadow-sm text-blue-900 cursor-pointer hover:bg-blue-100 transition-colors"
                                title={`${o.orderNo} - ${o.customer}`}
                              >
                                <span className="font-bold">{o.orderNo}</span>
                                <span className="opacity-75 ml-1">{o.product}</span>
                              </div>
                            ))}
                          </div>

                          {/* Shift 2 */}
                          <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-100 min-h-[90px]">
                            <div className="text-[10px] font-bold text-indigo-800 mb-1 text-center">
                              2. Vardiya
                            </div>
                            {shift2.map(o => (
                              <div
                                key={o.id}
                                onClick={() => handleEditPlan(o)}
                                className="bg-white border border-indigo-200 rounded px-2 py-1 text-[10px] mb-1 truncate shadow-sm text-indigo-900 cursor-pointer hover:bg-indigo-100 transition-colors"
                                title={`${o.orderNo} - ${o.customer}`}
                              >
                                <span className="font-bold">{o.orderNo}</span>
                                <span className="opacity-75 ml-1">{o.product}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

