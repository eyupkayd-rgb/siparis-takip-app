import React, { useState } from 'react';
import { Download, Search, History } from 'lucide-react';

export default function ArchiveDashboard({ orders, isSuperAdmin }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintView, setShowPrintView] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const handleExportPDF = (order) => {
    const allCards = document.querySelectorAll('.order-card');
    const selectedCard = document.querySelector(`[data-order-id="${order.id}"]`);
    
    allCards.forEach(card => {
      if (card !== selectedCard) {
        card.style.display = 'none';
      }
    });
    
    if (selectedCard) {
      selectedCard.classList.add('print-content');
    }
    
    setTimeout(() => {
      window.print();
      
      setTimeout(() => {
        allCards.forEach(card => {
          card.style.display = '';
        });
        if (selectedCard) {
          selectedCard.classList.remove('print-content');
        }
      }, 500);
    }, 100);
  };

  const calculateFireAnalysis = (order) => {
    const expectedQty = parseInt(order.quantity) || 0;
    
    let actualOutput = 0;
    if (order.productionData && Array.isArray(order.productionData) && order.productionData.length > 0) {
      const finalStation = order.productionData[order.productionData.length - 1];
      if (finalStation.outputQuantity) {
        const match = finalStation.outputQuantity.match(/(\d+)/);
        if (match) {
          actualOutput = parseInt(match[1]);
        }
      }
    }

    const firePercentage = expectedQty > 0 
      ? ((expectedQty - actualOutput) / expectedQty) * 100 
      : 0;

    let status = 'normal';
    let color = 'text-gray-700 bg-gray-100';
    let icon = '⚪';
    
    if (actualOutput > expectedQty) {
      status = 'excellent';
      color = 'text-green-700 bg-green-100';
      icon = '🟢';
    } else if (actualOutput === expectedQty) {
      status = 'normal';
      color = 'text-yellow-700 bg-yellow-100';
      icon = '🟡';
    } else if (actualOutput < expectedQty && actualOutput > 0) {
      status = 'problem';
      color = 'text-red-700 bg-red-100';
      icon = '🔴';
    }

    return {
      expectedQty,
      actualOutput,
      firePercentage: firePercentage.toFixed(2),
      status,
      color,
      icon
    };
  };

  const filteredOrders = orders.filter(order => {
    let statusMatch = true;
    if (filterStatus === 'completed') {
      statusMatch = order.status === 'shipping_ready' || order.status === 'completed';
    } else if (filterStatus === 'incomplete') {
      statusMatch = order.status !== 'shipping_ready' && order.status !== 'completed';
    }

    let searchMatch = true;
    if (searchQuery) {
      searchMatch = 
        order.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product?.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return statusMatch && searchMatch;
  });

  const calculateStationFire = (order) => {
    if (!order.productionData || !Array.isArray(order.productionData) || order.productionData.length === 0) {
      return [];
    }

    return order.productionData.map((station, index) => {
      const inputMt = parseFloat(station.inputMeterage) || 0;
      const outputMt = parseFloat(station.outputMeterage) || 0;
      const fireMt = inputMt - outputMt;
      const firePercent = inputMt > 0 ? (fireMt / inputMt) * 100 : 0;

      return {
        stationName: station.stationName,
        inputMt,
        outputMt,
        fireMt,
        firePercent: firePercent.toFixed(2),
        notes: station.notes,
        startTime: station.startTime,
        endTime: station.endTime,
        completedAt: station.completedAt
      };
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-gray-200 pb-4 mb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Arşiv & Raporlama
          </h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Tüm siparişlerin detaylı geçmişi ve fire analizi
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="btn-primary flex items-center gap-2 text-sm md:text-base px-3 md:px-4"
        >
          <Download size={16} className="md:w-[18px] md:h-[18px]" />
          <span className="hidden sm:inline">PDF İndir</span>
          <span className="sm:hidden">İndir</span>
        </button>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2 md:gap-3">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 md:px-6 py-2 md:py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${
            filterStatus === 'all'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="hidden sm:inline">Tümü</span>
          <span className="sm:hidden">Tüm</span> ({orders.length})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`px-3 md:px-6 py-2 md:py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${
            filterStatus === 'completed'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="hidden sm:inline">Tamamlananlar</span>
          <span className="sm:hidden">Tamam</span> ({orders.filter(o => o.status === 'shipping_ready' || o.status === 'completed').length})
        </button>
        <button
          onClick={() => setFilterStatus('incomplete')}
          className={`px-3 md:px-6 py-2 md:py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${
            filterStatus === 'incomplete'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="hidden sm:inline">Devam Edenler</span>
          <span className="sm:hidden">Devam</span> ({orders.filter(o => o.status !== 'shipping_ready' && o.status !== 'completed').length})
        </button>
      </div>

      {/* Orders Grid */}
      <div className="space-y-6">
        {filteredOrders.map(order => {
          const fireAnalysis = calculateFireAnalysis(order);
          const stationFire = calculateStationFire(order);
          const totalInputMt = stationFire.reduce((sum, s) => sum + s.inputMt, 0);
          const totalOutputMt = stationFire.reduce((sum, s) => sum + s.outputMt, 0);
          const totalFire = totalInputMt - totalOutputMt;
          const totalFirePercent = totalInputMt > 0 ? (totalFire / totalInputMt) * 100 : 0;
          const isExpanded = expandedOrder === order.id;

          return (
            <div
              key={order.id}
              data-order-id={order.id}
              className="order-card bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden print:break-inside-avoid"
            >
              {/* Main Header Card - Purple Background */}
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold mb-3">{order.orderNo}</h3>
                    <div className="space-y-1 text-sm opacity-90">
                      <div className="leading-relaxed">
                        {order.customer} - {order.product}
                      </div>
                      {order.productDescription && (
                        <div className="text-xs opacity-80">{order.productDescription}</div>
                      )}
                      <div className="text-xs">
                        {order.category} {order.quantity && `• ${order.quantity} Adet`}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="text-xs opacity-80">Oluşturulma Tarihi</div>
                      <div className="text-sm font-semibold">{order.createdAt || new Date().toLocaleDateString('tr-TR')}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportPDF(order);
                      }}
                      className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 print:hidden backdrop-blur-sm"
                      title="PDF olarak indir"
                    >
                      <Download size={14} />
                      PDF İNDİR
                    </button>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6 space-y-6">
                {/* Sipariş Bilgileri Section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-3 pb-2 border-b border-gray-200">
                    Sipariş Bilgileri
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Kategori:</div>
                      <div className="text-sm font-semibold text-purple-600">{order.category || 'Belirtilmemiş'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Sipariş Türü:</div>
                      <div className="text-sm font-semibold text-gray-800">{order.orderType || 'Yeni'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Miktar:</div>
                      <div className="text-sm font-semibold text-gray-800">{order.quantity || '-'} Adet (Toplam)</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Hammadde:</div>
                      <div className="text-sm font-semibold text-gray-800">{order.rawMaterial || 'Belirtilmemiş'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Müşteri Termini:</div>
                      <div className="text-sm font-semibold text-red-600">{order.customerDeadline || '-'}</div>
                    </div>
                    {order.orderNote && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <div className="text-xs text-gray-500">Sipariş Notu:</div>
                        <div className="text-sm text-gray-700 italic">{order.orderNote}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Üretim Planı Section */}
                {order.planningData && (
                  <div>
                    <h4 className="text-sm font-bold text-orange-500 uppercase mb-3">Üretim Planı</h4>
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                      <div className="text-sm text-green-700 font-semibold mb-2">Üretim Tarihi</div>
                      <div className="text-3xl font-bold text-green-700 mb-1">
                        {order.planningData.startDate || 'Belirtilmemiş'}
                      </div>
                      {order.planningData.startHour && (
                        <div className="text-sm text-green-600">
                          Saat: {order.planningData.startHour} {order.planningData.duration && `(Süre: ${order.planningData.duration})`}
                        </div>
                      )}
                      {order.planningData.stationWorkflow && order.planningData.stationWorkflow.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <div className="text-xs text-green-700 font-semibold mb-2">İş Akışı:</div>
                          <div className="flex flex-wrap gap-2">
                            {order.planningData.stationWorkflow.map((station, idx) => (
                              <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                {idx + 1}. {station}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Teknik Detaylar Section */}
                <div>
                  <h4 className="text-sm font-bold text-orange-500 uppercase mb-3 pb-2 border-b border-gray-200">
                    Teknik Detaylar
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {order.productionData && order.productionData.length > 0 && order.productionData[0].machineName && (
                      <div>
                        <div className="text-xs text-gray-500">Makina:</div>
                        <div className="text-sm font-semibold text-gray-800">{order.productionData[0].machineName}</div>
                      </div>
                    )}
                    {order.printColor && (
                      <div>
                        <div className="text-xs text-gray-500">Baskı/Renk:</div>
                        <div className="text-sm font-semibold text-gray-800">{order.printColor}</div>
                      </div>
                    )}
                    {order.technicalSpecs?.zet && order.technicalSpecs?.step && (
                      <div>
                        <div className="text-xs text-gray-500">Zet / Adım:</div>
                        <div className="text-sm font-semibold text-gray-800">
                          {order.technicalSpecs.zet} / {order.technicalSpecs.step}
                        </div>
                      </div>
                    )}
                    {order.paperWidth && (
                      <div>
                        <div className="text-xs text-gray-500">Kağıt Eni:</div>
                        <div className="text-sm font-semibold text-gray-800">{order.paperWidth} mm</div>
                      </div>
                    )}
                    {order.combine && (
                      <div className="bg-orange-50 px-3 py-2 rounded-lg">
                        <div className="text-xs text-gray-500">Kombine:</div>
                        <div className="text-sm font-semibold text-orange-700">{order.combine}</div>
                      </div>
                    )}
                    {order.lamination !== undefined && (
                      <div>
                        <div className="text-xs text-gray-500">Laminasyon:</div>
                        <div className="text-sm font-semibold text-gray-800">
                          {order.lamination ? 'VAR' : 'YOK'}
                        </div>
                      </div>
                    )}
                    {order.clicheDie && (
                      <div>
                        <div className="text-xs text-gray-500">Klişe/Bıçak:</div>
                        <div className="text-sm font-semibold text-gray-800">{order.clicheDie}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Üretim Durumu: Kalite Kontrol Section */}
                {stationFire.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">
                      Üretim Durumu: Kalite Kontrol
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stationFire.map((station, idx) => (
                        <div key={idx} className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="font-bold text-gray-800 mb-2">{station.stationName}</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Üretilen:</span>
                              <span className="font-semibold text-gray-800">{station.outputMt} mt</span>
                            </div>
                            {station.completedAt && (
                              <div className="text-xs text-gray-500">
                                Tarih: {new Date(station.completedAt).toLocaleDateString('tr-TR')}
                              </div>
                            )}
                            {station.outputMt > 0 && (
                              <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-green-200">
                                ({station.outputMt * 1000} Adet)
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fire Analizi - Detailed */}
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">Fire Analizi</h4>
                  
                  {/* Summary Box */}
                  <div className={`p-4 rounded-xl mb-4 ${fireAnalysis.color} border-2 ${
                    fireAnalysis.status === 'excellent' ? 'border-green-300' :
                    fireAnalysis.status === 'problem' ? 'border-red-300' : 'border-yellow-300'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg font-bold">Genel Durum</div>
                      <div className="text-3xl">{fireAnalysis.icon}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-xs opacity-70">Beklenen Miktar:</div>
                        <div className="text-2xl font-bold">{fireAnalysis.expectedQty}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-70">Çıkan Miktar:</div>
                        <div className="text-2xl font-bold">{fireAnalysis.actualOutput || '-'}</div>
                      </div>
                    </div>
                    {fireAnalysis.actualOutput > 0 && (
                      <div className="pt-3 border-t border-current">
                        <div className="text-sm font-semibold">
                          {fireAnalysis.actualOutput > fireAnalysis.expectedQty ? (
                            <span>✅ {Math.abs(fireAnalysis.firePercentage)}% fazla üretim yapıldı</span>
                          ) : fireAnalysis.actualOutput < fireAnalysis.expectedQty ? (
                            <span>⚠️ {fireAnalysis.firePercentage}% fire oluştu</span>
                          ) : (
                            <span>✔️ Tam hedef miktar üretildi</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Station Details */}
                  {stationFire.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-600 mb-2">İstasyon Bazlı Detay:</div>
                      {stationFire.map((station, idx) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold text-gray-800 text-sm">{station.stationName}</div>
                            <div className={`text-xs font-bold px-2 py-1 rounded ${
                              parseFloat(station.firePercent) > 10 ? 'bg-red-100 text-red-700' : 
                              parseFloat(station.firePercent) > 5 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              Fire: {station.firePercent}%
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>
                              <div className="text-gray-500">Giren:</div>
                              <div className="font-semibold text-gray-800">{station.inputMt} mt</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Çıkan:</div>
                              <div className="font-semibold text-gray-800">{station.outputMt} mt</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Fire:</div>
                              <div className="font-semibold text-red-600">{station.fireMt.toFixed(2)} mt</div>
                            </div>
                          </div>
                          {station.notes && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600 italic">
                              Not: {station.notes}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Total Fire Summary */}
                      <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-3 font-bold">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-800">TOPLAM FİRE:</span>
                          <div className="text-right">
                            <div className="text-lg text-purple-700">{totalFire.toFixed(2)} mt</div>
                            <div className="text-xs text-purple-600">({totalFirePercent.toFixed(2)}%)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dosyalar & Görseller Section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">
                    📎 Dosyalar & Görseller
                  </h4>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="text-gray-400 text-sm">
                      {order.attachments && order.attachments.length > 0 ? (
                        <div className="space-y-2">
                          {order.attachments.map((file, idx) => (
                            <div key={idx} className="text-left bg-gray-50 p-2 rounded">
                              📄 {file.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl mb-2">📋</div>
                          <div>Henüz dosya eklenmemiş</div>
                          <div className="text-xs text-gray-400 mt-1">(0 dosya)</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipping_ready' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'production_started' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'completed' ? '✅ Tamamlandı' :
                       order.status === 'shipping_ready' ? '📦 Sevkiyat Hazır' :
                       order.status === 'production_started' ? '⚙️ Üretimde' :
                       order.status === 'planned' ? '📅 Planlandı' :
                       order.status === 'planning_pending' ? '⏳ Planlama Bekliyor' :
                       order.status === 'warehouse_pending' ? '📦 Depo Bekliyor' :
                       '🎨 Grafik Bekliyor'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Son güncelleme: {order.updatedAt || order.createdAt || new Date().toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <History size={64} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">Bu filtrede sipariş bulunamadı.</p>
        </div>
      )}
    </div>
  );
}
