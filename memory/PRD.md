# Agora Etiket - Sipariş Takip Sistemi PRD

## Orijinal Problem Tanımı
Etiket ve ambalaj üretimi yapan bir matbaa firması için kapsamlı bir ERP/sipariş takip sistemi. Mobil uyumlu React PWA, Firebase backend.

## Kullanıcı Personaları
1. **Pazarlama**: Sipariş oluşturma ve müşteri yönetimi
2. **Grafik**: Teknik detaylar, görsel onay, sarım yönü görseli yükleme
3. **Depo**: Malzeme rezervasyonu ve bobin yönetimi
4. **Planlama**: Üretim planlaması ve Excel iş emri çıktısı (görsel gömme destekli)
5. **Üretim**: İstasyon bazlı üretim takibi (dinamik operatör listesi)
6. **Yönetim**: Genel izleme, admin işlemleri, operatör yönetimi

## Temel Gereksinimler
1. ✅ Responsive mobil UI (hamburger menü, collapsible sidebar)
2. ✅ Firebase Authentication & Firestore
3. ✅ Sipariş akışı: Pazarlama → Grafik → Depo → Planlama → Üretim → Sevkiyat
4. ✅ AI destekli süre tahmini (Gemini)
5. ✅ Super Admin özellikleri (toplu silme, sipariş no düzenleme)
6. ✅ Sarım yönü görsel yükleme + kırpma (react-easy-crop)
7. ✅ Excel iş emri export (ExcelJS - görsel gömme destekli, tüm sipariş detayları)
8. ✅ Kademeli metre aktarımı (istasyonlar arası)
9. ✅ Dinamik operatör listesi (Admin panelinden Firestore tabanlı yönetim)
10. ✅ Stok hareketleri silme (Super Admin - tek tek ve toplu)
11. ✅ Raporlama & İstatistikler sayfası
12. ✅ Karışık birimli varyant miktar hesaplama (quantityByUnit)
13. ✅ Ambalaj varyantlarında birim seçimi (Adet/KG/Metre)

## Mevcut Mimari
```
/app/frontend/
├── src/
│   ├── App.js (ana layout, sidebar, routing, otomatik URL yönlendirme)
│   ├── components/
│   │   ├── Marketing/MarketingDashboard.js
│   │   ├── Graphics/GraphicsDashboard.js, WrapDirectionImageUpload.js
│   │   ├── Warehouse/WarehouseDashboard.js
│   │   ├── Planning/PlanningDashboard.js (ExcelJS ile görsel gömme)
│   │   ├── Production/ProductionDashboard.js (dinamik operatör)
│   │   ├── Reports/ReportsDashboard.js
│   │   ├── Admin/AdminDashboard.js (operatör yönetimi)
│   │   ├── Archive/ArchiveDashboard.js
│   │   └── Auth/AuthScreen.js
│   ├── services/firebase.js
│   └── utils/productionHelpers.js, stockHelpers.js
```

## Tamamlanan İşler

### 27 Şubat 2026
- ✅ Excel export ExcelJS'e taşındı (SheetJS yerine) — görsel gömme desteği eklendi
- ✅ Excel'de tüm sipariş detayları: Sipariş bilgileri, Teknik detaylar (Grafik), Depo/Malzeme, Planlama bilgileri, Sarım yönü görseli (gömülü), Açıklama/Notlar, Onay alanı
- ✅ Otomatik URL yönlendirme: REACT_APP_BACKEND_URL tabanlı (platform otomatik günceller)

### 26 Şubat 2026
- ✅ P0: Karışık birimli varyant miktar hesaplama düzeltildi (quantityByUnit)
- ✅ Sarım yönü modalı kaldırıldı → Görsel yükleme + kırpma (react-easy-crop)
- ✅ Dinamik operatör yönetimi: Admin paneline Firestore tabanlı CRUD
- ✅ Üretim operatör dropdown'u: Hardcoded liste → Firestore
- ✅ generateProductionJobs: Her işe birim bilgisi eklendi

### Önceki Oturumlar
- ✅ Üretim akışında kademeli metre aktarımı
- ✅ Operatör seçimi dropdown'u, Flat Kesim & Serigrafi istasyonları
- ✅ Stok hareketleri silme, Raporlama sayfası
- ✅ ZET/Adımlama/Metraj hesaplama motoru
- ✅ Baskılı/Baskısız ambalaj iş akışı

## Öncelikli Backlog

### P1
- Firebase/React DOM kararlılık sorunları (kullanıcı doğrulaması bekleniyor)

### P2
- Otomatik e-posta raporlama
- Firebase offline persistence yeniden değerlendirme

## Firestore Koleksiyonları
- `orders`, `users`, `operators` (YENİ), `stock_rolls`, `stock_movements`, `customer_cards`

## 3. Parti Entegrasyonlar
- Firebase (Auth, Firestore), Google Gemini (AI), ExcelJS (Excel export), Recharts (grafikler), react-easy-crop (görsel kırpma), file-saver (dosya indirme)

## Test Hesabı
- Email: eyupkayd@gmail.com / Şifre: Agr154627-
