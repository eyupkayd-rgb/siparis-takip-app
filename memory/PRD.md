# Agora Etiket - Sipariş Takip Sistemi PRD

## Orijinal Problem Tanımı
Etiket ve ambalaj üretimi yapan bir matbaa firması için kapsamlı bir ERP/sipariş takip sistemi. Mobil uyumlu React PWA, Firebase backend.

## Kullanıcı Personaları
1. **Pazarlama**: Sipariş oluşturma ve müşteri yönetimi
2. **Grafik**: Teknik detaylar ve görsel onay
3. **Depo**: Malzeme rezervasyonu ve bobin yönetimi
4. **Planlama**: Üretim planlaması ve Excel iş emri çıktısı
5. **Üretim**: İstasyon bazlı üretim takibi
6. **Yönetim**: Genel izleme ve admin işlemleri

## Temel Gereksinimler
1. ✅ Responsive mobil UI (hamburger menü, collapsible sidebar)
2. ✅ Firebase Authentication & Firestore
3. ✅ Sipariş akışı: Pazarlama → Grafik → Depo → Planlama → Üretim → Sevkiyat
4. ✅ AI destekli süre tahmini (Gemini)
5. ✅ Super Admin özellikleri (toplu silme, sipariş no düzenleme)
6. ✅ Sarım yönü görsel yükleme + kırpma (eski modal seçimi kaldırıldı)
7. ✅ Excel iş emri export (mobil uyumlu Blob yöntemi)
8. ✅ Kademeli metre aktarımı (istasyonlar arası)
9. ✅ Dinamik operatör listesi (Admin panelinden yönetim)
10. ✅ Stok hareketleri silme (Super Admin - tek tek ve toplu)
11. ✅ Raporlama & İstatistikler sayfası
12. ✅ Karışık birimli varyant miktar hesaplama düzeltildi
13. ✅ Ambalaj varyantlarında birim seçimi (Adet/KG/Metre)

## Mevcut Mimari
```
/app/frontend/
├── src/
│   ├── App.js (ana layout, sidebar, routing)
│   ├── components/
│   │   ├── Marketing/MarketingDashboard.js
│   │   ├── Graphics/GraphicsDashboard.js, WrapDirectionImageUpload.js
│   │   ├── Warehouse/WarehouseDashboard.js (stok silme özellikleri)
│   │   ├── Planning/PlanningDashboard.js (Excel export)
│   │   ├── Production/ProductionDashboard.js (dinamik operatör)
│   │   ├── Reports/ReportsDashboard.js (raporlama)
│   │   ├── Admin/AdminDashboard.js (operatör yönetimi)
│   │   ├── Archive/ArchiveDashboard.js
│   │   └── Auth/AuthScreen.js
│   ├── services/firebase.js
│   └── utils/productionHelpers.js, stockHelpers.js
```

## Tamamlanan İşler

### 26 Şubat 2026 (Bu Oturum)
- ✅ P0: Karışık birimli varyant miktar hesaplama düzeltildi (quantityByUnit objesi eklendi)
- ✅ Sarım yönü modalı kaldırıldı → Görsel yükleme + kırpma (react-easy-crop) eklendi
- ✅ Dinamik operatör yönetimi: Admin paneline Firestore tabanlı CRUD eklendi
- ✅ Üretim operatör dropdown'u: Hardcoded liste kaldırıldı, Firestore'dan çekiliyor
- ✅ Excel iş emri export: Sarım yönü alanı yeni görsel formatına güncellendi
- ✅ generateProductionJobs: Her iş öğesine birim (unit) bilgisi eklendi

### Önceki Oturumlar
- ✅ Üretim akışında kademeli metre aktarımı
- ✅ Mobil Excel export (Blob yöntemi)
- ✅ Operatör seçimi dropdown'u
- ✅ Stok hareketleri silme
- ✅ Raporlama & İstatistikler sayfası
- ✅ ZET/Adımlama/Metraj hesaplama motoru
- ✅ Baskılı/Baskısız ambalaj iş akışı
- ✅ Flat Kesim & Serigrafi istasyonları

## Öncelikli Backlog

### P1 - Yüksek
- Firebase/React DOM kararlılık sorunları (removeChild/insertBefore) - Kullanıcı doğrulaması bekleniyor

### P2 - Orta
- Otomatik e-posta raporlama
- Firebase offline persistence yeniden değerlendirilmesi

## Test Hesabı
- Email: eyupkayd@gmail.com
- Şifre: Agr154627-

## 3. Parti Entegrasyonlar
- Firebase (Auth, Firestore)
- Google Gemini (AI tahmin)
- SheetJS/xlsx (Excel export)
- Recharts (grafikler ve raporlama)
- react-easy-crop (görsel kırpma)

## Firestore Koleksiyonları
- `orders`: Sipariş verileri
- `users`: Kullanıcı profilleri
- `operators`: Dinamik operatör listesi (YENİ)
- `stock_rolls`: Bobin stok
- `stock_movements`: Stok hareketleri
- `customer_cards`: Müşteri kartları
