import React, { useState } from 'react';
import { Printer, Play, StopCircle, CheckCircle, X, Loader2, AlertCircle, BarChart3, ClipboardCheck, PackageCheck, Search, User } from 'lucide-react';
import { updateDoc, doc } from "firebase/firestore";
import { db, appId } from '../../services/firebase';
import { logStockMovement } from '../../utils/stockHelpers';
import StatusBadge from '../shared/StatusBadge';

export default function ProductionDashboard({ orders, isSuperAdmin, currentUser }) {
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stationData, setStationData] = useState({
    startTime: '',
    endTime: '',
    inputMeterage: '',
    outputMeterage: '',
    outputQuantity: '', // Adet veya KG (son istasyon için)
    notes: '',
    isStarted: false, // İş başlatıldı mı
    operatorName: '' // Operatör ismi
  });

  // Operatör listesi
  const operators = [
    'Ahmet Yılmaz',
    'Mehmet Demir',
    'Ali Kaya',
    'Mustafa Çelik',
    'Hasan Şahin',
    'Hüseyin Yıldız',
    'İbrahim Öztürk',
    'Osman Aydın',
    'Fatih Arslan',
    'Emre Doğan'
  ];

  // Station definitions
  const stations = {
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

  // Get station list for current user
  const availableStations = Object.entries(stations).map(([id, info]) => ({
    id,
    ...info
  }));

  // Determine next station for an order
  const getNextStation = (order) => {
    if (!order.productionData || order.productionData.length === 0) {
      // İlk istasyon
      if (order.category === 'Etiket') {
        return 'bobst_m1';
      } else {
        // Ambalaj: Grafik'ten gelen makina bilgisine göre
        const machine = order.graphicsData?.machine;
        if (machine === 'BOBST M1 VISION') return 'bobst_m1_ambalaj';
        if (machine === 'HİBRİT') return 'hibrit';
        return 'bobst_m1_ambalaj'; // Default
      }
    }

    // Mevcut istasyondan sonraki istasyonu belirle
    const lastStation = order.productionData[order.productionData.length - 1];
    
    // Safety check
    if (!lastStation || !lastStation.station) {
      return null;
    }
    
    const category = order.category;

    if (category === 'Etiket') {
      if (lastStation.station === 'bobst_m1') return 'etiket_qc';
      return null; // Tamamlanmış
    } else {
      // Ambalaj akışı
      if (lastStation.station === 'bobst_m1_ambalaj' || lastStation.station === 'hibrit') {
        return 'muhürleme';
      }
      if (lastStation.station === 'muhürleme') {
        return 'sleeve_qc';
      }
      if (lastStation.station === 'sleeve_qc') {
        // Tabakalama var mı kontrol et
        if (order.graphicsData?.layeringStatus === 'Var') {
          return 'tabakalama';
        }
        return null; // Tamamlanmış
      }
      if (lastStation.station === 'tabakalama') {
        return null; // Tamamlanmış
      }
    }

    return null;
  };

  // Filter orders for selected station
  const getOrdersForStation = (stationId) => {
    let stationOrders = orders.filter(order => {
      // Only show planned and production_started orders
      if (order.status !== 'planned' && order.status !== 'production_started') {
        return false;
      }
      
      const nextStation = getNextStation(order);
      return nextStation === stationId;
    });

    // Apply search filter
    if (searchQuery) {
      stationOrders = stationOrders.filter(order =>
        order.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return stationOrders;
  };

  const filteredOrders = selectedStation ? getOrdersForStation(selectedStation) : [];

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    
    // Kademeli metre aktarımı: Önceki istasyonun çıkış metresi = Mevcut istasyonun giriş metresi
    let initialInputMeterage = '';
    
    const productionData = order.productionData || [];
    
    if (productionData.length === 0) {
      // İlk istasyon: Depodan çıkan metraj veya grafik metrajı
      initialInputMeterage = order.warehouseData?.issuedMeterage || order.graphicsData?.meterage || '';
    } else {
      // Sonraki istasyonlar: Bir önceki istasyonun çıkış metrajını al
      const lastStationData = productionData[productionData.length - 1];
      initialInputMeterage = lastStationData?.outputMeterage || '';
    }
    
    setStationData({
      startTime: '',
      endTime: '',
      inputMeterage: initialInputMeterage,
      outputMeterage: '',
      outputQuantity: '',
      notes: '',
      isStarted: false,
      operatorName: ''
    });
  };

  const handleStartWork = () => {
    // Rezervasyon kontrolü
    if (selectedOrder && (!selectedOrder.warehouseData?.reservedRolls || selectedOrder.warehouseData.reservedRolls.length === 0)) {
      const confirmed = window.confirm(
        '⚠️ Bu sipariş için rezerve edilmiş bobin bulunmamaktadır!\n\nYine de üretime başlamak istiyor musunuz?'
      );
      if (!confirmed) return;
    }
    
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setStationData({ ...stationData, startTime: now, isStarted: true });
  };

  const handleEndWork = () => {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setStationData({ ...stationData, endTime: now });
  };

  const handleSaveStation = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !selectedStation) return;

    setIsSaving(true);
    try {
      const stationInfo = stations[selectedStation];
      
      // SARFIYAT SİSTEMİ - İlk istasyonda bobin sarfiyatı yap
      if (selectedOrder.productionData?.length === 0 || !selectedOrder.productionData) {
        const reservedRolls = selectedOrder.warehouseData?.reservedRolls || [];
        
        if (reservedRolls.length > 0 && stationData.inputMeterage) {
          const consumedMeterage = parseFloat(stationData.inputMeterage);
          
          // İlk rezerve bobini seç
          const rollToConsume = reservedRolls[0];
          
          if (rollToConsume && rollToConsume.rollId) {
            try {
              // Bobinin mevcut durumunu al
              const rollDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stock_rolls', rollToConsume.rollId));
              
              if (rollDoc.exists()) {
                const rollData = rollDoc.data();
                const reservedLength = rollToConsume.reservedLength || 0;
                const actualConsumed = Math.min(consumedMeterage, reservedLength);
                const remaining = reservedLength - actualConsumed;
                
                // Rezervasyonu kaldır ve kalan metrajı geri ekle
                await updateDoc(
                  doc(db, 'artifacts', appId, 'public', 'data', 'stock_rolls', rollToConsume.rollId),
                  {
                    currentLength: rollData.currentLength + remaining, // Kullanılmayan kısmı geri ekle
                    reservationId: null, // Rezervasyonu kaldır
                    reservedLength: null,
                    reservedOrderNo: null,
                    reservedAt: null,
                    lastConsumedAt: new Date().toISOString(),
                    lastConsumedOrder: selectedOrder.orderNo,
                    lastConsumedAmount: actualConsumed
                  }
                );
                
                // Stok hareketi kaydet - Sarfiyat
                await logStockMovement(db, appId, {
                  type: 'SARFIYAT',
                  rollBarcode: rollToConsume.rollBarcode,
                  materialName: rollData.materialName || 'N/A',
                  supplierName: rollData.supplierName || 'N/A',
                  quantity: actualConsumed,
                  unit: 'm',
                  description: `Üretim sarfiyatı - ${selectedOrder.orderNo}`,
                  referenceType: 'URETIM',
                  referenceId: selectedOrder.id,
                  orderNo: selectedOrder.orderNo,
                  remainingReturned: remaining
                });
                
                console.log(`✅ Sarfiyat: ${rollToConsume.rollBarcode}`);
                console.log(`   Rezerve: ${reservedLength}m`);
                console.log(`   Kullanılan: ${actualConsumed}m`);
                console.log(`   Stoka iade: ${remaining}m`);
                console.log(`   Yeni stok: ${rollData.currentLength + remaining}m`);
              }
            } catch (rollError) {
              console.error('Bobin sarfiyat hatası:', rollError);
              // Devam et, sipariş kaydını engelleme
            }
          }
        }
      }
      
      const newStationData = {
        station: selectedStation,
        stationName: stationInfo.name,
        operatorName: stationData.operatorName, // Operatör ismi
        startTime: stationData.startTime,
        endTime: stationData.endTime,
        inputMeterage: stationData.inputMeterage,
        outputMeterage: stationData.outputMeterage,
        outputQuantity: stationInfo.isFinal ? stationData.outputQuantity : null,
        notes: stationData.notes,
        completedAt: new Date().toISOString(),
        completedBy: currentUser?.email || 'Unknown'
      };

      const existingProductionData = selectedOrder.productionData || [];
      const updatedProductionData = [...existingProductionData, newStationData];

      // Determine new status
      const nextStation = getNextStation(selectedOrder);
      let newStatus = 'production_started';
      
      if (!nextStation || (stationInfo.isFinal && selectedOrder.graphicsData?.layeringStatus !== 'Var') || 
          (selectedStation === 'tabakalama')) {
        // Son istasyon tamamlandı
        newStatus = 'shipping_ready';
      }

      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', selectedOrder.id);
      await updateDoc(docRef, {
        productionData: updatedProductionData,
        status: newStatus
      });

      setSelectedOrder(null);
      setStationData({
        startTime: '',
        endTime: '',
        inputMeterage: '',
        outputMeterage: '',
        outputQuantity: '',
        notes: '',
        isStarted: false
      });
    } catch (error) {
      console.error("Station save error:", error);
      alert("Hata: " + error.message);
    }
    setIsSaving(false);
  };

  const currentStationInfo = selectedStation ? stations[selectedStation] : null;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-gray-200 pb-4 mb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Üretim Takibi
          </h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            İstasyon bazlı üretim akışı
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

      {/* Station Selector */}
      <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
        <label className="label">İstasyon Seçiniz</label>
        <select
          className="input-field text-lg"
          value={selectedStation}
          onChange={(e) => {
            setSelectedStation(e.target.value);
            setSelectedOrder(null);
          }}
        >
          <option value="">-- İstasyon Seçin --</option>
          <optgroup label="Etiket İstasyonları">
            <option value="bobst_m1">Bobst M1 Operatörü</option>
            <option value="etiket_qc">Kalite Kontrol (Etiket)</option>
          </optgroup>
          <optgroup label="Ambalaj İstasyonları">
            <option value="bobst_m1_ambalaj">Bobst M1 Operatörü (Ambalaj)</option>
            <option value="hibrit">Hibrit Operatörü</option>
            <option value="muhürleme">Mühürleme</option>
            <option value="sleeve_qc">Sleeve Kalite Kontrol</option>
            <option value="tabakalama">Tabakalama</option>
          </optgroup>
        </select>
      </div>

      {/* Orders for Selected Station */}
      {selectedStation && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Orders */}
          <div className="lg:col-span-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ClipboardCheck className="text-teal-500" size={24} />
              {currentStationInfo?.name} - İşler
              <span className="ml-auto text-sm bg-teal-100 text-teal-700 px-3 py-1 rounded-full">
                {filteredOrders.length}
              </span>
            </h3>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400 bg-white border-2 border-dashed rounded-xl">
                  <ClipboardCheck size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Bu istasyonda bekleyen iş yok.</p>
                </div>
              )}

              {filteredOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedOrder?.id === order.id
                      ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-500 shadow-xl ring-2 ring-teal-300'
                      : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-teal-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-800 text-lg">{order.orderNo}</span>
                    <span className="text-[10px] px-2 py-1 rounded font-bold bg-teal-100 text-teal-800">
                      {order.category}
                    </span>
                  </div>

                  {/* Customer & Product */}
                  <div className="mb-2 text-sm">
                    <div className="font-semibold text-gray-700">{order.customer}</div>
                    <div className="text-xs text-gray-600">{order.product}</div>
                  </div>

                  {/* Technical Info */}
                  <div className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded space-y-1">
                    <div className="flex justify-between">
                      <span>Makina:</span>
                      <span className="font-semibold">{order.graphicsData?.machine}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kağıt Türü:</span>
                      <span className="font-semibold text-[9px]">{order.rawMaterial}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Metraj:</span>
                      <span className="font-semibold text-green-700">
                        {order.warehouseData?.issuedMeterage || order.graphicsData?.meterage} mt
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Station Form */}
          <div className="lg:col-span-8">
            {selectedOrder ? (
              <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-teal-200">
                <h3 className="text-2xl font-bold text-teal-700 mb-6">
                  {currentStationInfo?.name} - İşlem Formu
                </h3>

                {/* Order Details */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl mb-6 border-2 border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                        Sipariş Bilgileri
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="font-bold text-lg">{selectedOrder.orderNo}</div>
                        <div className="text-gray-700">{selectedOrder.customer}</div>
                        <div className="text-gray-600">{selectedOrder.product}</div>
                        <div className="font-bold">{selectedOrder.quantity}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                        Teknik Detaylar
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div><strong>Makina:</strong> {selectedOrder.graphicsData?.machine}</div>
                        <div><strong>Baskı:</strong> {selectedOrder.graphicsData?.printType}</div>
                        <div><strong>Renk:</strong> {selectedOrder.graphicsData?.color}</div>
                        <div><strong>Kağıt Türü:</strong> {selectedOrder.rawMaterial}</div>
                      </div>
                      
                      {/* Rezerve Bobinler */}
                      {selectedOrder.warehouseData?.reservedRolls && selectedOrder.warehouseData.reservedRolls.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h5 className="text-xs font-bold text-purple-700 mb-1 flex items-center gap-1">
                            <PackageCheck size={12} />
                            Rezerve Bobinler
                          </h5>
                          {selectedOrder.warehouseData.reservedRolls.map((roll, idx) => (
                            <div key={idx} className="bg-purple-50 p-1 px-2 rounded text-[10px] mb-1">
                              <div className="font-mono font-bold">{roll.rollBarcode}</div>
                              <div className="text-gray-600">{roll.reservedLength} m</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                        Önceki Notlar
                      </h4>
                      <div className="text-xs space-y-1">
                        {selectedOrder.productionData && selectedOrder.productionData.length > 0 ? (
                          selectedOrder.productionData.map((pd, idx) => (
                            <div key={idx} className="bg-yellow-50 p-2 rounded border border-yellow-200">
                              <div className="font-bold">{pd.stationName}:</div>
                              <div className="text-gray-700">{pd.notes || 'Not yok'}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400">Henüz önceki işlem yok</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Start/End Buttons */}
                {!stationData.isStarted ? (
                  <button
                    type="button"
                    onClick={handleStartWork}
                    className="w-full py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  >
                    <Play size={24} />
                    İşe Başla
                  </button>
                ) : (
                  <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-green-800">✅ İş başlatıldı</span>
                      <span className="text-lg font-bold text-green-700">{stationData.startTime}</span>
                    </div>
                    {!stationData.endTime && (
                      <button
                        type="button"
                        onClick={handleEndWork}
                        className="w-full py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex justify-center items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                      >
                        <StopCircle size={20} />
                        İşi Bitir
                      </button>
                    )}
                    {stationData.endTime && (
                      <div className="text-center py-2 bg-red-100 rounded-lg border border-red-300">
                        <span className="text-sm font-bold text-red-800">Bitiş: {stationData.endTime}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Station Form */}
                <form onSubmit={handleSaveStation} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                      <label className="label">Giren Metraj (mt)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={stationData.inputMeterage}
                        onChange={e => setStationData({ ...stationData, inputMeterage: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="label">Çıkan Metraj (mt)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={stationData.outputMeterage}
                        onChange={e => setStationData({ ...stationData, outputMeterage: e.target.value })}
                      />
                    </div>

                    {currentStationInfo?.isFinal && (
                      <div className="md:col-span-2">
                        <label className="label">Çıkan Ürün Adedi veya KG</label>
                        <input
                          required
                          type="text"
                          className="input-field"
                          placeholder="Örn: 10000 Adet veya 250 KG"
                          value={stationData.outputQuantity}
                          onChange={e => setStationData({ ...stationData, outputQuantity: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="label">Notlar (Sonraki istasyona bilgi)</label>
                      <textarea
                        className="input-field"
                        rows="3"
                        placeholder="Önemli notlar, uyarılar veya bilgiler..."
                        value={stationData.notes}
                        onChange={e => setStationData({ ...stationData, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving || !stationData.endTime}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3 ${
                      !stationData.endTime 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800'
                    } text-white`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={24} />
                        İşlemi Tamamla ve Kaydet
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl h-full flex flex-col items-center justify-center text-gray-400 p-12">
                <Printer size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">İşlem yapmak için bir sipariş seçin</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


