import React, { useState, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Calendar, Package, Users, Truck, 
  Clock, CheckCircle, AlertCircle, Filter, Download, RefreshCw,
  ArrowUp, ArrowDown, Minus, PieChart as PieChartIcon, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function ReportsDashboard({ orders, stockMovements, stockRolls }) {
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'quarter', 'year'
  const [selectedTab, setSelectedTab] = useState('overview'); // 'overview', 'production', 'orders', 'stock'

  // Tarih filtreleme fonksiyonu
  const getDateFilter = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch(dateRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }
    return startDate;
  };

  // Filtrelenmiş siparişler
  const filteredOrders = useMemo(() => {
    const startDate = getDateFilter();
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate;
    });
  }, [orders, dateRange]);

  // Durum bazlı sipariş sayıları
  const ordersByStatus = useMemo(() => {
    const statusCounts = {};
    const statusLabels = {
      'graphics_pending': 'Grafik Bekliyor',
      'warehouse_raw_pending': 'Depo Bekliyor',
      'warehouse_processing': 'Depo İşlemde',
      'planning_pending': 'Planlama Bekliyor',
      'planned': 'Planlandı',
      'production_started': 'Üretimde',
      'shipping_ready': 'Sevkiyat Hazır',
      'completed': 'Tamamlandı'
    };
    
    filteredOrders.forEach(order => {
      const status = order.status || 'unknown';
      const label = statusLabels[status] || status;
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Haftalık üretim trendi
  const weeklyProductionData = useMemo(() => {
    const weeks = {};
    const now = new Date();
    
    // Son 8 hafta
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      const weekKey = `Hafta ${8-i}`;
      weeks[weekKey] = { name: weekKey, completed: 0, inProgress: 0, pending: 0 };
    }
    
    filteredOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const weeksDiff = Math.floor((now - orderDate) / (7 * 24 * 60 * 60 * 1000));
      if (weeksDiff >= 0 && weeksDiff < 8) {
        const weekKey = `Hafta ${8 - weeksDiff}`;
        if (weeks[weekKey]) {
          if (order.status === 'completed' || order.status === 'shipping_ready') {
            weeks[weekKey].completed++;
          } else if (order.status === 'production_started' || order.status === 'planned') {
            weeks[weekKey].inProgress++;
          } else {
            weeks[weekKey].pending++;
          }
        }
      }
    });
    
    return Object.values(weeks);
  }, [filteredOrders]);

  // Kategori bazlı dağılım
  const ordersByCategory = useMemo(() => {
    const categories = {};
    filteredOrders.forEach(order => {
      const category = order.category || 'Diğer';
      categories[category] = (categories[category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Müşteri bazlı sipariş sayıları (Top 10)
  const topCustomers = useMemo(() => {
    const customers = {};
    filteredOrders.forEach(order => {
      const customer = order.customer || 'Bilinmeyen';
      customers[customer] = (customers[customer] || 0) + 1;
    });
    return Object.entries(customers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name: name.substring(0, 20), fullName: name, value }));
  }, [filteredOrders]);

  // İstasyon bazlı üretim verileri
  const productionByStation = useMemo(() => {
    const stations = {};
    const stationNames = {
      'bobst_m1': 'Bobst M1',
      'etiket_qc': 'Etiket QC',
      'bobst_m1_ambalaj': 'Bobst M1 (Amb)',
      'hibrit': 'Hibrit',
      'muhürleme': 'Mühürleme',
      'sleeve_qc': 'Sleeve QC',
      'tabakalama': 'Tabakalama'
    };
    
    filteredOrders.forEach(order => {
      if (order.productionData && order.productionData.length > 0) {
        order.productionData.forEach(pd => {
          const stationKey = pd.station || 'unknown';
          const stationName = stationNames[stationKey] || pd.stationName || stationKey;
          if (!stations[stationName]) {
            stations[stationName] = { completed: 0, totalMeterage: 0 };
          }
          stations[stationName].completed++;
          stations[stationName].totalMeterage += parseFloat(pd.outputMeterage) || 0;
        });
      }
    });
    
    return Object.entries(stations).map(([name, data]) => ({
      name,
      completed: data.completed,
      meterage: Math.round(data.totalMeterage)
    }));
  }, [filteredOrders]);

  // Operatör bazlı performans
  const operatorPerformance = useMemo(() => {
    const operators = {};
    
    filteredOrders.forEach(order => {
      if (order.productionData && order.productionData.length > 0) {
        order.productionData.forEach(pd => {
          const operatorName = pd.operatorName || 'Belirtilmemiş';
          if (!operators[operatorName]) {
            operators[operatorName] = { jobs: 0, totalMeterage: 0 };
          }
          operators[operatorName].jobs++;
          operators[operatorName].totalMeterage += parseFloat(pd.outputMeterage) || 0;
        });
      }
    });
    
    return Object.entries(operators)
      .map(([name, data]) => ({
        name: name.substring(0, 15),
        fullName: name,
        jobs: data.jobs,
        meterage: Math.round(data.totalMeterage)
      }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 10);
  }, [filteredOrders]);

  // Stok hareketleri özeti
  const stockMovementsSummary = useMemo(() => {
    const startDate = getDateFilter();
    const filtered = (stockMovements || []).filter(m => {
      const moveDate = new Date(m.createdAt);
      return moveDate >= startDate;
    });
    
    const summary = {
      giris: filtered.filter(m => m.type === 'GIRIS').length,
      rezerve: filtered.filter(m => m.type === 'REZERVE').length,
      sarfiyat: filtered.filter(m => m.type === 'SARFIYAT').length,
      totalMeterage: filtered.reduce((sum, m) => sum + (m.quantity || 0), 0)
    };
    
    return summary;
  }, [stockMovements, dateRange]);

  // Günlük sipariş trendi
  const dailyOrderTrend = useMemo(() => {
    const days = {};
    const now = new Date();
    
    // Son 30 gün
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayKey = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
      days[dayKey] = { name: dayKey, orders: 0 };
    }
    
    filteredOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dayKey = orderDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
      if (days[dayKey]) {
        days[dayKey].orders++;
      }
    });
    
    return Object.values(days);
  }, [filteredOrders]);

  // Özet istatistikler
  const summaryStats = useMemo(() => {
    const total = filteredOrders.length;
    const completed = filteredOrders.filter(o => o.status === 'completed' || o.status === 'shipping_ready').length;
    const inProduction = filteredOrders.filter(o => o.status === 'production_started').length;
    const pending = total - completed - inProduction;
    
    // Önceki dönemle karşılaştırma
    const previousStartDate = new Date(getDateFilter());
    const periodLength = new Date() - previousStartDate;
    previousStartDate.setTime(previousStartDate.getTime() - periodLength);
    
    const previousOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= previousStartDate && orderDate < getDateFilter();
    });
    
    const previousTotal = previousOrders.length;
    const changePercent = previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : 0;
    
    return {
      total,
      completed,
      inProduction,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      changePercent
    };
  }, [filteredOrders, orders, dateRange]);

  const renderChangeIndicator = (value) => {
    if (value > 0) return <ArrowUp size={16} className="text-green-500" />;
    if (value < 0) return <ArrowDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-400" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <BarChart3 size={32} />
            Raporlar & İstatistikler
          </h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Üretim performansı ve iş analitiği
          </p>
        </div>
        
        {/* Tarih Filtresi */}
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border-2 border-gray-300 rounded-lg px-4 py-2 bg-white text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
          >
            <option value="week">Son 1 Hafta</option>
            <option value="month">Son 1 Ay</option>
            <option value="quarter">Son 3 Ay</option>
            <option value="year">Son 1 Yıl</option>
          </select>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'overview', label: 'Genel Bakış', icon: Activity },
          { id: 'production', label: 'Üretim', icon: TrendingUp },
          { id: 'orders', label: 'Siparişler', icon: Package },
          { id: 'stock', label: 'Stok', icon: Truck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              selectedTab === tab.id
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* GENEL BAKIŞ */}
      {selectedTab === 'overview' && (
        <>
          {/* Özet Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Toplam Sipariş</p>
                  <p className="text-3xl font-bold mt-1">{summaryStats.total}</p>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-xs">
                  {renderChangeIndicator(summaryStats.changePercent)}
                  <span>{Math.abs(summaryStats.changePercent)}%</span>
                </div>
              </div>
              <Package size={32} className="mt-3 opacity-50" />
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-2xl text-white shadow-xl">
              <div>
                <p className="text-green-100 text-sm font-medium">Tamamlanan</p>
                <p className="text-3xl font-bold mt-1">{summaryStats.completed}</p>
              </div>
              <div className="mt-2 text-xs text-green-100">
                Tamamlanma: %{summaryStats.completionRate}
              </div>
              <CheckCircle size={32} className="mt-1 opacity-50" />
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-5 rounded-2xl text-white shadow-xl">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Üretimde</p>
                <p className="text-3xl font-bold mt-1">{summaryStats.inProduction}</p>
              </div>
              <Activity size={32} className="mt-3 opacity-50" />
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl text-white shadow-xl">
              <div>
                <p className="text-purple-100 text-sm font-medium">Bekleyen</p>
                <p className="text-3xl font-bold mt-1">{summaryStats.pending}</p>
              </div>
              <Clock size={32} className="mt-3 opacity-50" />
            </div>
          </div>

          {/* Grafikler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Haftalık Trend */}
            <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                Haftalık Üretim Trendi
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyProductionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Tamamlanan" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inProgress" name="Devam Eden" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Bekleyen" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Durum Dağılımı */}
            <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChartIcon size={20} className="text-purple-600" />
                Sipariş Durumu Dağılımı
              </h3>
              {ordersByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} sipariş`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <PieChartIcon size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Veri bulunamadı</p>
                </div>
              )}
            </div>
          </div>

          {/* Günlük Sipariş Trendi */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" />
              Günlük Sipariş Trendi (Son 30 Gün)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyOrderTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="orders" name="Sipariş" stroke="#8B5CF6" fill="#C4B5FD" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ÜRETİM */}
      {selectedTab === 'production' && (
        <>
          {/* İstasyon Performansı */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity size={20} className="text-teal-600" />
              İstasyon Bazlı Üretim
            </h3>
            {productionByStation.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productionByStation} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Tamamlanan İş" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Activity size={48} className="mx-auto mb-3 opacity-30" />
                <p>Henüz üretim verisi yok</p>
              </div>
            )}
          </div>

          {/* Operatör Performansı */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              Operatör Performansı (Top 10)
            </h3>
            {operatorPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={operatorPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'jobs' ? 'İş Sayısı' : 'Metraj (m)']}
                    labelFormatter={(label) => {
                      const op = operatorPerformance.find(o => o.name === label);
                      return op?.fullName || label;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="jobs" name="İş Sayısı" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="meterage" name="Metraj (m)" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Users size={48} className="mx-auto mb-3 opacity-30" />
                <p>Henüz operatör verisi yok</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* SİPARİŞLER */}
      {selectedTab === 'orders' && (
        <>
          {/* Kategori Dağılımı */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChartIcon size={20} className="text-orange-600" />
                Kategori Dağılımı
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ordersByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {ordersByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Müşteriler */}
            <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users size={20} className="text-green-600" />
                En Çok Sipariş Veren Müşteriler
              </h3>
              {topCustomers.length > 0 ? (
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                  {topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate" title={customer.fullName}>
                          {customer.fullName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg text-blue-600">{customer.value}</span>
                        <span className="text-gray-500 text-sm ml-1">sipariş</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Users size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Henüz müşteri verisi yok</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* STOK */}
      {selectedTab === 'stock' && (
        <>
          {/* Stok Hareketleri Özeti */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-2xl border-2 border-green-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-3 rounded-lg">
                  <Package size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">Stok Girişi</p>
                  <p className="text-2xl font-bold text-green-900">{stockMovementsSummary.giris}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-2xl border-2 border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500 p-3 rounded-lg">
                  <AlertCircle size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Rezervasyon</p>
                  <p className="text-2xl font-bold text-yellow-900">{stockMovementsSummary.rezerve}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-2xl border-2 border-red-200">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-3 rounded-lg">
                  <Truck size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-red-700 font-medium">Sarfiyat</p>
                  <p className="text-2xl font-bold text-red-900">{stockMovementsSummary.sarfiyat}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">Toplam Metraj</p>
                  <p className="text-2xl font-bold text-blue-900">{Math.round(stockMovementsSummary.totalMeterage)} m</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stok Durumu */}
          <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Package size={20} className="text-purple-600" />
              Mevcut Stok Durumu
            </h3>
            {stockRolls && stockRolls.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b-2">
                    <tr>
                      <th className="p-3 text-left font-bold">Hammadde</th>
                      <th className="p-3 text-center font-bold">Bobin Sayısı</th>
                      <th className="p-3 text-center font-bold">Toplam Metraj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const grouped = {};
                      stockRolls.forEach(roll => {
                        const material = roll.materialName || 'Diğer';
                        if (!grouped[material]) {
                          grouped[material] = { count: 0, meterage: 0 };
                        }
                        grouped[material].count++;
                        grouped[material].meterage += roll.currentLength || 0;
                      });
                      return Object.entries(grouped)
                        .sort((a, b) => b[1].meterage - a[1].meterage)
                        .map(([material, data], idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{material}</td>
                            <td className="p-3 text-center">{data.count}</td>
                            <td className="p-3 text-center font-bold text-green-600">{Math.round(data.meterage)} m</td>
                          </tr>
                        ));
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Package size={48} className="mx-auto mb-3 opacity-30" />
                <p>Henüz stok verisi yok</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
