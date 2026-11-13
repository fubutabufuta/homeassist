# Ev Paneli

Home Assistant üstünde çalışan, sürükle-bırak düzenlenebilir kendi panelimiz.
Tarayıcıda açılır; cihaz durumlarını canlı gösterir, komut gönderir.

## Kurulum (Fedora, HA Docker ile çalışıyor)

Bu depoyu HA'nın `www` klasörüne `panel` adıyla klonla:

    cd ~/homeserver/homeassistant/config/www
    git clone https://github.com/fubutabufuta/homeassist panel
    cd panel
    cp config.example.js config.js
    nano config.js        # token satırına HA'dan aldığın jetonu yaz

Aç: http://localhost:8123/local/panel/index.html

`config.js` jeton içerir ve `.gitignore`'dadır; depoya girmez, güncellemede ezilmez.

## Güncelleme

    cd ~/homeserver/homeassistant/config/www/panel
    git pull

Sonra tarayıcıda `Ctrl+Shift+R` (önbelleği atlayarak yenile).

## Görünüm

- Gündüz ve gece temaları otomatik değişir (HA'daki `sun.sun` varlığına göre; yoksa saate göre).
  Sabitlemek için `config.js` içinde `theme: "day"` ya da `"night"` yaz.
- Açık kutular lamba sarısıyla dolar, robot temizlerken mavi olur.
- Yazı tipi Archivo (SIL Open Font License), `fonts/` klasöründe, internet gerekmez.

## Kullanım

- Ana Sayfa > Düzenle: kutuyu sürükle, sağ alt köşeden büyüt, ✎ ile adlandır, ✕ ile kaldır.
- `+ Ekle`: cihaz, kamera veya robot kartı ekler. Düzen HA kullanıcı verisine kaydedilir.
- Tüm Cihazlar: her cihazın entity_id adını gösterir.
- Kameralar: go2rtc kurulunca çalışır. Kat planı 3D modülü sonraki aşamada.
