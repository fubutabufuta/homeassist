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

## Yüz tanıma (Merhaba, <ad>)

Tabletin kamerası kişiyi görünce ekranda adıyla selam verir. Varsayılan **kapalı**.

1. `config.js` içine ekle: `faces: { enabled: true }` (diğer seçenekler `config.example.js` içinde).
2. Sayfayı yenile, **Yüzler** sekmesinden **Kişi ekle**: adı yaz, kameraya bakıp 3-5 fotoğraf ekle (başı biraz çevirerek), Kaydet.
3. Tarayıcı kamera izni sorar. Firefox'ta "Bu kararı hatırla"yı seç. Kamera yalnızca `http://localhost` ya da `https` adresinde açılır, tablette `localhost:8123` kullan.

Gizlilik: görüntü tarayıcıda işlenir, hiçbir yere gönderilmez. Kayda fotoğraf değil, her yüz için 128 sayılık bir dizi girer ve yalnızca bu Home Assistant'ta durur. Tanıma bilinen kişiler içindir. Evde birini kaydetmeden önce onun haberi olsun.

Kişi tanınınca Home Assistant'a `panel_face_seen` olayı (`name` ile) gönderilir. Otomasyonda tetikleyici olarak kullanabilirsin (örneğin gelince ışık aç).
Kütüphane: @vladmandic/face-api (MIT), modeller `faces/models` içinde, internet gerekmez.
