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
5. ⏳ Super Admin özellikleri (toplu silme, sipariş no düzenleme)
6. ⏳ Sarım yönü görsel seçimi (placeholder ikonlar mevcut)
7. ✅ Excel iş emri export (mobil uyumlu Blob yöntemi)
8. ✅ Kademeli metre aktarımı (istasyonlar arası)

## Mevcut Mimari
```
/app/frontend/
├── src/
│   ├── App.js (ana layout, sidebar, routing)
│   ├── components/
│   │   ├── Marketing/MarketingDashboard.js
│   │   ├── Graphics/GraphicsDashboard.js, WrapDirectionModal.js
│   │   ├── Warehouse/WarehouseDashboard.js
│   │   ├── Planning/PlanningDashboard.js (Excel export)
│   │   ├── Production/ProductionDashboard.js (kademeli metre)
│   │   ├── Archive/ArchiveDashboard.js
│   │   └── Admin/AdminDashboard.js
│   └── services/firebase.js
```

## Tamamlanan İşler (27 Ocak 2026)
- ✅ P0: Üretim akışında kademeli metre aktarımı düzeltildi
  - `handleSelectOrder` fonksiyonu güncellendi
  - Önceki istasyonun `outputMeterage` → Sonraki istasyonun `inputMeterage`
- ✅ P1: Mobil Excel export sorunu düzeltildi
  - Blob tabanlı indirme yöntemi eklendi
  - iOS Safari için özel işlem

## Öncelikli Backlog

### P0 - Kritik
- (Tamamlandı)

### P1 - Yüksek
- Super Admin: Toplu silme ve sipariş no düzenleme test edilmeli
- Sarım yönü: Kullanıcıdan 8 adet PNG/SVG görsel bekleniyor

### P2 - Orta
- Firebase offline persistence yeniden değerlendirilmeli
- Kod kalitesi geçişi

## Test Hesabı
- Email: eyupkayd@gmail.com
- Şifre: Agr154627-

## 3. Parti Entegrasyonlar
- Firebase (Auth, Firestore)
- Google Gemini (AI tahmin)
- SheetJS/xlsx (Excel export)
