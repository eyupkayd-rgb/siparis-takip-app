# 🔄 Otomatik URL Yönlendirme Sistemi

## 📋 Genel Bakış

Bu sistem, kullanıcıların eski preview URL'lerinden veya deprecated deployment linklerinden otomatik olarak en güncel production URL'inize yönlendirilmesini sağlar.

## ⚙️ Nasıl Çalışır?

Uygulama yüklendiğinde:
1. Mevcut URL'i kontrol eder
2. Production URL ile karşılaştırır
3. Eğer farklıysa ve localhost değilse, otomatik olarak yönlendirir
4. Kullanıcının bulunduğu sayfa ve query parametreleri korunur

## 🔧 Kurulum

### 1. Production URL'inizi Ayarlayın

`/app/frontend/.env` dosyasını düzenleyin:

```env
REACT_APP_PRODUCTION_URL=https://your-production-domain.com
```

**Örnekler:**
- `REACT_APP_PRODUCTION_URL=https://stockmate.com`
- `REACT_APP_PRODUCTION_URL=https://uretim.yourcompany.com`
- `REACT_APP_PRODUCTION_URL=https://app.yourdomain.com`

### 2. Yeniden Build ve Restart

```bash
cd /app/frontend
yarn build
sudo supervisorctl restart frontend
```

## ✅ Özellikler

### Akıllı Yönlendirme
- ✅ **Eski URL'lerden otomatik yönlendirme**
- ✅ **Sayfa konumunu korur** (örn: `/archive` sayfasındaysanız, production'da da `/archive` açılır)
- ✅ **Query parametrelerini korur** (örn: `?order=123` korunur)
- ✅ **Localhost'ta çalışmaz** (development ortamını etkilemez)
- ✅ **Sonsuz döngü yok** (production URL'de yönlendirme yapmaz)

### Güvenlik
- ✅ Localhost ve 127.0.0.1 adreslerini korur
- ✅ Sadece farklı domain'lerde çalışır
- ✅ Console log ile şeffaf bilgilendirme

## 📝 Kullanım Senaryoları

### Senaryo 1: Preview URL'den Production'a
**Eski Link:** `https://production-hub-105.preview.emergentagent.com`
**Yönlendirilir:** `https://stockmate.com`

### Senaryo 2: Eski Version'dan Yeni Version'a
**Eski Link:** `https://app-v1.company.com/orders`
**Yönlendirilir:** `https://app.company.com/orders`

### Senaryo 3: Test Domain'den Production'a
**Eski Link:** `https://test.company.com/archive?filter=completed`
**Yönlendirilir:** `https://app.company.com/archive?filter=completed`

## 🔍 Debug & Monitoring

### Console Log Kontrolü

Yönlendirme yapıldığında browser console'da şu mesajı göreceksiniz:

```
🔄 Redirecting from https://old-url.com to https://new-url.com
```

### Test Etme

1. `.env` dosyasında `REACT_APP_PRODUCTION_URL` ayarlayın
2. Build yapın: `yarn build`
3. Farklı bir URL'den erişmeyi simüle edin
4. Console'u açın ve yönlendirme logunu kontrol edin

## ⚠️ Önemli Notlar

### Development Ortamı
Localhost'ta (`http://localhost:3000`) çalışırken yönlendirme **YAPILMAZ**. Bu sayede geliştirme yapabilirsiniz.

### Production URL Değiştirme
Production URL'inizi değiştirdiyseniz:
1. `.env` dosyasını güncelleyin
2. Yeniden build yapın
3. Frontend'i restart edin

### Eski URL'leri Silme
Artık eski deployment'ları silmenize gerek yok! Kullanıcılar hangi eski linkten gelirse gelsin, otomatik olarak doğru yere yönlendirilecek.

## 🎯 Avantajlar

✅ **Tek Ayar:** Sadece production URL'i ayarlayın
✅ **Otomatik:** Kod çalışır, siz uğraşmazsınız
✅ **Güvenli:** Development ortamını etkilemez
✅ **Hızlı:** Anında yönlendirme
✅ **SEO Dostu:** 301 redirect gibi çalışır
✅ **Bakım Kolay:** Eski link'leri silmeye gerek yok

## 📚 Teknik Detaylar

### Kod Konumu
`/app/frontend/src/App.js` - OrderApp component başlangıcında

### Kullanılan Teknolojiler
- React useEffect hook
- window.location API
- Environment variables (.env)

### Performans
- İlk yüklenmede tek bir kontrol
- Milisaniyeler içinde yönlendirme
- Hiçbir performans kaybı yok

## 🆘 Sorun Giderme

### Yönlendirme Çalışmıyor
1. `.env` dosyasında `REACT_APP_PRODUCTION_URL` var mı kontrol edin
2. Build yaptınız mı? (`yarn build`)
3. Frontend restart ettiniz mi? (`sudo supervisorctl restart frontend`)

### Sonsuz Döngü
Production URL'i yanlış yazmış olabilirsiniz. Kontrol edin:
```env
# Yanlış (trailing slash)
REACT_APP_PRODUCTION_URL=https://app.com/

# Doğru
REACT_APP_PRODUCTION_URL=https://app.com
```

### Localhost'ta Yönlendirme Yapıyor
Bu durumda kod hatalı. Ancak mevcut implementasyonda localhost korumalı.

## 📞 Destek

Herhangi bir sorunla karşılaşırsanız:
1. Console log'larını kontrol edin
2. `.env` dosyasını doğrulayın
3. Build log'larını inceleyin

---

**Not:** Bu sistem production'a deploy ettiğinizde otomatik olarak aktif olacaktır. Development ortamında (localhost) hiçbir etkisi yoktur.
