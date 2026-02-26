import React, { useState, useEffect } from 'react';
import { Palette, Loader2, CheckCircle, X, Sparkles, MessageSquare, Download, AlertCircle, Calculator, Component, Cylinder, Paperclip, Plus, Ruler, Search, Settings, Trash2, RotateCw } from 'lucide-react';
import { updateDoc, doc } from "firebase/firestore";
import { db, appId } from '../../services/firebase';
import { callGemini } from '../../services/gemini';
import { generateProductionJobs, calculatePlateMeterage } from '../../utils/productionHelpers';
import StatusBadge from '../shared/StatusBadge';
import AttachmentManager from '../shared/AttachmentManager';
import WrapDirectionModal from './WrapDirectionModal';

export default function GraphicsDashboard({ orders, isSuperAdmin }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWrapModal, setShowWrapModal] = useState(false);
  const [gData, setGData] = useState({
    machine: '', color: '', printType: '', zet: '', meterage: '', 
    lamination: '', plateStatus: '', dieStatus: '', paperWidth: '', 
    step: '', combinedInfo: '', akisaGoreKacli: '', lfSize: '', clSize: '', perforation: '',
    layeringStatus: '', // Tabakalama durumu (Ambalaj için)
    wrapDirection: null, // Sarım yönü (POS1-8)
    notes: '' // Grafik notları
  });
  const [plateData, setPlateData] = useState([]);

  // Filter orders by search query
  const filterOrders = (orderList) => {
    if (!searchQuery) return orderList;
    return orderList.filter(order => 
      order.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const pendingOrders = filterOrders(orders.filter(o => o.status === 'graphics_pending'));
  const allOrders = filterOrders(orders);
  const activeOrder = selectedOrder ? (orders.find(o => o.id === selectedOrder.id) || selectedOrder) : null;

  useEffect(() => {
    if (selectedOrder) {
      if (selectedOrder.graphicsData) {
        setGData(selectedOrder.graphicsData);
      } else {
        setGData({
          machine: '', color: '', printType: '', zet: '', meterage: '',
          lamination: '', plateStatus: '', dieStatus: '', paperWidth: '',
          step: '', combinedInfo: '', akisaGoreKacli: '', lfSize: '', clSize: '', perforation: '',
          layeringStatus: '',
          wrapDirection: null,
          notes: ''
        });
      }
      if (selectedOrder.plates) {
        setPlateData(selectedOrder.plates);
      } else {
        setPlateData([]);
      }
    }
  }, [selectedOrder]);

  const addPlate = () => {
    setPlateData([...plateData, { 
      id: Date.now(), 
      name: `Klişe ${plateData.length + 1}`, 
      zStep: '', 
      items: [] 
    }]);
  };

  const updatePlate = (idx, field, value) => {
    const newPlates = [...plateData];
    newPlates[idx][field] = value;
    newPlates[idx].calculatedMeterage = calculatePlateMeterage(newPlates[idx]);
    setPlateData(newPlates);
  };

  const addItemToPlate = (plateIdx, job) => {
    const newPlates = [...plateData];
    if (!newPlates[plateIdx].items.some(i => i.job.id === job.id)) {
      newPlates[plateIdx].items.push({ job: job, lanes: 1 });
      newPlates[plateIdx].calculatedMeterage = calculatePlateMeterage(newPlates[plateIdx]);
      setPlateData(newPlates);
    }
  };

  const updateItemLanes = (plateIdx, itemIdx, lanes) => {
    const newPlates = [...plateData];
    newPlates[plateIdx].items[itemIdx].lanes = lanes;
    newPlates[plateIdx].calculatedMeterage = calculatePlateMeterage(newPlates[plateIdx]);
    setPlateData(newPlates);
  };

  // ZET ve Akışa Göre Kaçlı'dan otomatik adımlama hesaplama
  // Formül: (ZET × 3.175) / Akışa Göre Kaçlı = Adımlama (mm)
  const ZET_MULTIPLIER = 3.175; // Sabit değer
  
  useEffect(() => {
    if (gData.zet && gData.akisaGoreKacli) {
      const zetValue = parseFloat(gData.zet) || 0;
      const akisaGoreKacli = parseFloat(gData.akisaGoreKacli) || 1;
      if (zetValue > 0 && akisaGoreKacli > 0) {
        const calculatedStep = ((zetValue * ZET_MULTIPLIER) / akisaGoreKacli).toFixed(1);
        setGData(prev => ({
          ...prev,
          step: calculatedStep
        }));
      }
    }
  }, [gData.zet, gData.akisaGoreKacli]);

  // Metraj hesaplama: Adımlama × Adet / 1000 = Metraj (mt)
  useEffect(() => {
    if (selectedOrder && !selectedOrder.isComplex && gData.step) {
      const isAmbalajAdet = selectedOrder.category === 'Ambalaj' && 
        (selectedOrder.qUnit === 'Adet' || selectedOrder.quantity?.includes('Adet'));
      const isEtiket = selectedOrder.category !== 'Ambalaj';
      
      if (isEtiket || isAmbalajAdet) {
        const qty = parseInt(selectedOrder.quantity) || 0;
        const step = parseFloat(gData.step) || 0;
        if (step > 0 && qty > 0) {
          const meterage = (step * qty / 1000).toFixed(2);
          setGData(prev => ({
            ...prev,
            meterage: meterage + ' mt'
          }));
        }
      }
    }
  }, [gData.step, selectedOrder?.quantity, selectedOrder?.isComplex, selectedOrder?.category, selectedOrder?.qUnit]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let finalMeterage = gData.meterage;
      if (plateData.length > 0) {
        const totalPlateMeterage = plateData.reduce((sum, p) => sum + (p.calculatedMeterage || 0), 0);
        finalMeterage = totalPlateMeterage + ' mt (Toplam)';
      }

      // wrapDirection objesinden icon field'ini çıkar (Firestore serialization için)
      const cleanedGraphicsData = { ...gData, meterage: finalMeterage };
      if (cleanedGraphicsData.wrapDirection) {
        const { icon, ...serializableWrapDirection } = cleanedGraphicsData.wrapDirection;
        cleanedGraphicsData.wrapDirection = serializableWrapDirection;
      }

      const updatePayload = {
        graphicsData: cleanedGraphicsData,
        plates: plateData,
        ...(selectedOrder.status === 'graphics_pending' 
          ? { status: 'warehouse_raw_pending' } 
          : { revisionAlert: "Grafik tarafından güncellendi" })
      };

      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id),
        updatePayload
      );
      setSelectedOrder(null);
    } catch (error) {
      console.error("Graphics save error:", error);
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

  const isAmbalaj = selectedOrder?.category === 'Ambalaj';

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Wrap Direction Modal */}
      {showWrapModal && (
        <WrapDirectionModal
          currentDirection={gData.wrapDirection?.id || 'POS1'}
          onClose={() => setShowWrapModal(false)}
          onSelect={(direction) => {
            setGData({ ...gData, wrapDirection: direction });
          }}
        />
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Order List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex bg-white rounded-xl p-1 border-2 border-gray-200 mb-4 shadow-sm">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Bekleyenler
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Tüm İşler
          </button>
        </div>

        <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2">
          <Palette size={20} className="text-orange-500" />
          {activeTab === 'pending' ? 'Grafik Bekleyenler' : 'Tüm Siparişler'}
          <span className="ml-auto text-sm bg-gray-100 px-3 py-1 rounded-full">
            {(activeTab === 'pending' ? pendingOrders : allOrders).length}
          </span>
        </h3>

        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
          {(activeTab === 'pending' ? pendingOrders : allOrders).map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative group ${
                selectedOrder?.id === order.id
                  ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-400 shadow-lg ring-2 ring-orange-300'
                  : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'
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
                <div className="flex gap-1">
                  {order.attachments?.length > 0 && (
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Paperclip size={10} />
                      {order.attachments.length}
                    </span>
                  )}
                  {order.isComplex && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                      Varyant
                    </span>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-1">{order.customer}</div>
              <div className="text-xs text-gray-500 mb-2 flex justify-between">
                <span>{order.product}</span>
                {order.category === 'Ambalaj' && (
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">
                    Ambalaj
                  </span>
                )}
              </div>

              <div className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-bold">
                ⏰ Termin: {order.customerDeadline}
              </div>

              {order.revisionAlert && (
                <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 bg-orange-50 p-1.5 rounded border border-orange-200 font-bold">
                  <AlertCircle size={12} />
                  {order.revisionAlert}
                </div>
              )}
            </div>
          ))}

          {(activeTab === 'pending' ? pendingOrders : allOrders).length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <Palette size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Kayıt yok</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Technical Details Form */}
      <div className="lg:col-span-2">
        {selectedOrder ? (
          <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-gray-100 animate-slide-in">
            {/* Order Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg mb-6 -mx-8 -mt-8">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{selectedOrder.orderNo}</h2>
                  <p className="text-orange-100">{selectedOrder.customer} - {selectedOrder.product}</p>
                  <div className="mt-3 flex gap-2">
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">
                      {selectedOrder.quantity}
                    </span>
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">
                      {selectedOrder.category || 'Etiket'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-orange-100 uppercase tracking-wider mb-1">Termin</div>
                  <div className="text-xl font-bold">{selectedOrder.customerDeadline}</div>
                </div>
              </div>
            </div>

            {/* Complex Order - Job List */}
            {selectedOrder.isComplex && (
              <div className="mb-6 p-5 bg-purple-50 border-2 border-purple-200 rounded-xl">
                <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                  <Component size={18} />
                  Üretim İş Listesi (Patlatılmış)
                </h4>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {selectedOrder.generatedJobs?.map(job => (
                    <div
                      key={job.id}
                      className="bg-white p-2.5 rounded-lg border-2 border-purple-200 text-xs flex justify-between items-center hover:border-purple-400 transition-all"
                    >
                      <span className="font-bold text-purple-900">{job.name}</span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                        {job.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plate Planning (Complex Orders) */}
            {selectedOrder.isComplex && (
              <div className="mb-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2 text-lg">
                    <Cylinder size={20} className="text-slate-600" />
                    Klişe ve Bobin Planlama
                  </h4>
                  <button
                    type="button"
                    onClick={addPlate}
                    className="text-sm bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors border-2 border-slate-300"
                  >
                    <Plus size={16} />
                    Klişe Ekle
                  </button>
                </div>

                {plateData.map((plate, pIdx) => (
                  <div
                    key={plate.id}
                    className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 hover:border-slate-400 transition-all"
                  >
                    <div className="flex gap-4 mb-3 items-end">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block uppercase">
                          Klişe Adı
                        </label>
                        <input
                          className="input-field h-10 text-sm"
                          value={plate.name}
                          onChange={(e) => updatePlate(pIdx, 'name', e.target.value)}
                        />
                      </div>
                      <div className="w-28">
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block uppercase">
                          Z-Step (mm)
                        </label>
                        <input
                          type="number"
                          className="input-field h-10 text-sm"
                          value={plate.zStep}
                          onChange={(e) => updatePlate(pIdx, 'zStep', e.target.value)}
                          placeholder="340"
                        />
                      </div>
                      <div className="w-36 text-right">
                        <span className="text-[11px] font-bold text-slate-500 block uppercase mb-1">
                          Tahmini Bobin
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          {plate.calculatedMeterage || 0} mt
                        </span>
                      </div>
                    </div>

                    <div className="bg-white border-2 border-slate-200 rounded-lg p-3 min-h-[80px]">
                      <div className="text-[11px] text-slate-500 mb-2 font-bold uppercase">
                        Bu klişeye yerleştirilen işler:
                      </div>
                      {plate.items.map((item, iIdx) => (
                        <div
                          key={iIdx}
                          className="flex justify-between items-center text-xs border-b border-dashed border-slate-200 last:border-0 py-2"
                        >
                          <span className="font-medium">
                            {item.job.name} ({item.job.quantity})
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Kaçlı:</span>
                            <input
                              type="number"
                              className="w-14 border-2 border-gray-300 rounded px-2 py-1 font-bold"
                              value={item.lanes}
                              onChange={(e) => updateItemLanes(pIdx, iIdx, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="mt-3">
                        <select
                          className="text-xs w-full border-2 border-dashed border-purple-300 rounded-lg p-2 bg-purple-50 hover:bg-purple-100 transition-colors font-bold text-purple-700"
                          onChange={(e) => {
                            if (e.target.value) {
                              addItemToPlate(pIdx, JSON.parse(e.target.value));
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">+ İşi Klişeye Ekle...</option>
                          {selectedOrder.generatedJobs?.map(job => (
                            <option key={job.id} value={JSON.stringify(job)}>
                              {job.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Technical Details Form */}
            <form onSubmit={handleSave} className="space-y-6 border-t-2 border-dashed border-gray-200 pt-6">
              <h4 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Settings size={22} className="text-orange-500" />
                Teknik Detaylar
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Machine */}
                <div>
                  <label className="label">Makina</label>
                  <select
                    required
                    className="input-field"
                    value={gData.machine}
                    onChange={e => setGData({ ...gData, machine: e.target.value })}
                  >
                    <option value="">Seçiniz</option>
                    <option>BOBST M1 VİSİON</option>
                    <option>HİBRİT FLEXO</option>
                    <option>MÜHÜRLEME</option>
                  </select>
                </div>

                {/* Colors */}
                <div>
                  <label className="label">Renkler</label>
                  <input
                    required
                    className="input-field"
                    placeholder="Örn: 4+0, CMYK"
                    value={gData.color}
                    onChange={e => setGData({ ...gData, color: e.target.value })}
                  />
                </div>

                {/* Print Type */}
                <div>
                  <label className="label">Baskı Türü</label>
                  <select
                    required
                    className="input-field"
                    value={gData.printType}
                    onChange={e => setGData({ ...gData, printType: e.target.value })}
                  >
                    <option value="">Seçiniz</option>
                    <option>ALT BASKI</option>
                    <option>ÜST BASKI</option>
                    <option>BUGLET</option>
                    <option>CUPON</option>
                  </select>
                </div>

                {/* ZET - HER DURUMDA GÖRÜNÜR */}
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                  <label className="label text-yellow-800 font-bold flex items-center gap-2">
                    <Ruler size={16} />
                    Zet Bilgisi
                  </label>
                  <input
                    required
                    type="number"
                    className="input-field border-yellow-300 bg-white"
                    placeholder="Örn: 112"
                    value={gData.zet}
                    onChange={e => setGData({ ...gData, zet: e.target.value })}
                  />
                </div>

                {/* Paper Width - Important for Warehouse */}
                <div className="md:col-span-2 border-2 border-orange-200 rounded-lg p-3 bg-orange-50">
                  <label className="label font-bold text-orange-800">
                    Kağıt Eni (Depo İçin Önemli)
                  </label>
                  <input
                    required
                    className="input-field border-orange-300 bg-white"
                    placeholder="Örn: 30 CM"
                    value={gData.paperWidth}
                    onChange={e => setGData({ ...gData, paperWidth: e.target.value })}
                  />
                </div>

                {/* Combine Info (Normal Orders) */}
                {!selectedOrder.isComplex && (
                  <div>
                    <label className="label">Yanyana Kaçlı</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="input-field"
                      placeholder="Örn: 2"
                      value={gData.combinedInfo}
                      onChange={e => setGData({ ...gData, combinedInfo: e.target.value })}
                    />
                  </div>
                )}

                {/* Step & Meterage for Non-Ambalaj & Non-Complex */}
                {!isAmbalaj && !selectedOrder.isComplex && (
                  <>
                    <div>
                      <label className="label flex items-center gap-1">
                        <Calculator size={14} />
                        Adımlama (mm) - Otomatik
                      </label>
                      <input
                        required
                        type="number"
                        className="input-field bg-green-50 font-bold text-green-700"
                        placeholder="Hesaplanıyor..."
                        value={gData.step}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="label flex items-center gap-1">
                        <Calculator size={14} />
                        Metraj (Otomatik)
                      </label>
                      <input
                        required
                        className="input-field bg-gray-100 font-bold text-indigo-700"
                        value={gData.meterage}
                        readOnly
                      />
                    </div>
                  </>
                )}

                {/* Ambalaj Specific Fields */}
                {isAmbalaj && (
                  <>
                    {/* Adet bazlı sipariş ise Kombine ve Adımlama göster */}
                    {selectedOrder.qUnit === 'Adet' || selectedOrder.quantity?.includes('Adet') ? (
                      <div className="col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200 mb-4">
                        <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                          <Calculator size={18} />
                          Metraj Hesaplama (Adet Bazlı)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="label text-green-800">Yanyana Kaçlı</label>
                            <input
                              required
                              type="number"
                              className="input-field border-green-300"
                              placeholder="Örn: 4"
                              value={gData.combinedInfo}
                              onChange={e => setGData({ ...gData, combinedInfo: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="label text-green-800 flex items-center gap-1">
                              <Calculator size={14} />
                              Adımlama (mm) - Otomatik
                            </label>
                            <input
                              required
                              type="number"
                              className="input-field bg-green-100 font-bold text-green-700 border-green-300"
                              placeholder="Hesaplanıyor..."
                              value={gData.step}
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="label text-green-800 flex items-center gap-1">
                              <Calculator size={14} />
                              Metraj (Otomatik)
                            </label>
                            <input
                              readOnly
                              className="input-field bg-green-100 font-bold text-green-700 border-green-300"
                              value={gData.meterage}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* KG bazlı sipariş ise bilgi mesajı göster */
                      <div className="col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200 mb-4">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                          <AlertCircle size={18} />
                          KG Bazlı Sipariş
                        </h4>
                        <p className="text-sm text-blue-700">
                          Bu sipariş KG bazlı olduğu için metraj hesaplaması yapılmayacak. 
                          KG bilgisi Depo bölümünde girilecektir.
                        </p>
                        <div className="mt-3">
                          <label className="label text-blue-800">Sipariş Miktarı</label>
                          <input
                            readOnly
                            className="input-field bg-blue-100 font-bold text-blue-700 border-blue-300"
                            value={selectedOrder.quantity || ''}
                          />
                        </div>
                      </div>
                    )}

                    <div className="bg-purple-50 p-3 rounded-lg border-2 border-purple-200">
                      <label className="label text-purple-800 font-bold">LF Ölçüsü</label>
                      <input
                        required
                        className="input-field border-purple-300 bg-white"
                        placeholder="Örn: 120 mm"
                        value={gData.lfSize}
                        onChange={e => setGData({ ...gData, lfSize: e.target.value })}
                      />
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border-2 border-purple-200">
                      <label className="label text-purple-800 font-bold">CL Ölçüsü</label>
                      <input
                        required
                        className="input-field border-purple-300 bg-white"
                        placeholder="Örn: 90 mm"
                        value={gData.clSize}
                        onChange={e => setGData({ ...gData, clSize: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Perfore Bilgisi</label>
                      <input
                        required
                        className="input-field"
                        placeholder="Var/Yok veya Detay"
                        value={gData.perforation}
                        onChange={e => setGData({ ...gData, perforation: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Tabakalama Durumu</label>
                      <select
                        required
                        className="input-field"
                        value={gData.layeringStatus}
                        onChange={e => setGData({ ...gData, layeringStatus: e.target.value })}
                      >
                        <option value="">Seçiniz</option>
                        <option value="Var">Tabakalama Var</option>
                        <option value="Yok">Tabakalama Yok</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Sarım Yönü Seçimi - Tüm kategoriler için */}
                <div className="col-span-2">
                  <label className="label">Etiket/Ambalaj Sarım Yönü *</label>
                  <button
                    type="button"
                    onClick={() => setShowWrapModal(true)}
                    className={`
                      w-full p-4 rounded-xl border-2 text-left transition-all
                      ${gData.wrapDirection 
                        ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`
                          p-3 rounded-lg
                          ${gData.wrapDirection?.category === 'outward' 
                            ? 'bg-blue-600' 
                            : gData.wrapDirection?.category === 'inward'
                            ? 'bg-purple-600'
                            : 'bg-gray-400'
                          }
                        `}>
                          <RotateCw size={24} className="text-white" />
                        </div>
                        <div>
                          {gData.wrapDirection ? (
                            <>
                              <div className="font-bold text-gray-900">
                                {gData.wrapDirection.title}
                              </div>
                              <div className="text-sm text-gray-600">
                                {gData.wrapDirection.description}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-bold text-gray-700">
                                Sarım Yönü Seçin
                              </div>
                              <div className="text-sm text-gray-500">
                                Varsayılan: POS1 - Dışa Sarım / Yazı Başı Önde
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-blue-600 font-bold text-sm">
                        Değiştir →
                      </div>
                    </div>
                  </button>
                </div>

                {/* Lamination & Die (Non-Ambalaj) */}
                {!isAmbalaj && (
                  <>
                    <div>
                      <label className="label">Laminasyon</label>
                      <select
                        required
                        className="input-field"
                        value={gData.lamination}
                        onChange={e => setGData({ ...gData, lamination: e.target.value })}
                      >
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
                    <div>
                      <label className="label">Bıçak</label>
                      <select
                        required
                        className="input-field"
                        value={gData.dieStatus}
                        onChange={e => setGData({ ...gData, dieStatus: e.target.value })}
                      >
                        <option value="">Seçiniz</option>
                        <option>Mevcut</option>
                        <option>Sipariş Edildi</option>
                        <option>BIÇAK GEREKTİRMİYOR</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Plate Status */}
                <div>
                  <label className="label">Klişe</label>
                  <select
                    required
                    className="input-field"
                    value={gData.plateStatus}
                    onChange={e => setGData({ ...gData, plateStatus: e.target.value })}
                  >
                    <option value="">Seçiniz</option>
                    <option>Mevcut</option>
                    <option>Sipariş Edildi</option>
                  </select>
                </div>
              </div>

              {/* Attachments */}
              {/* Notes Field */}
              <div>
                <label className="label">Grafik Notları (Opsiyonel)</label>
                <textarea
                  className="input-field"
                  rows="3"
                  placeholder="Önemli teknik detaylar, uyarılar veya notlar..."
                  value={gData.notes}
                  onChange={e => setGData({ ...gData, notes: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <AttachmentManager order={activeOrder} />
              </div>

              {/* Submit Button */}
              <button
                disabled={isSaving}
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <CheckCircle size={24} />
                    {activeTab === 'all' ? 'Düzeltmeyi Kaydet' : 'Kaydet ve Depoya Gönder'}
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white p-16 rounded-2xl shadow-xl border-2 border-dashed border-gray-300 text-center">
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Palette size={48} className="text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              İşlem yapmak için sipariş seçin
            </h3>
            <p className="text-gray-500">
              Soldan bir sipariş kartına tıklayarak teknik detayları girebilirsiniz
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

