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

## Kameralar

Home Assistant'a eklediğin kameralar (`camera.*`) panelde görüntü olarak görünür: Ana Sayfa'da Düzenle, + Ekle ile
kamerayı seç (büyük kutu olarak gelir), Kameralar sekmesinde hepsi birden listelenir. Önce Home Assistant'ın canlı akışı,
olmazsa 2 saniyede bir yenilenen anlık görüntü kullanılır. go2rtc şart değil, `cameras` listesi yalnız HA'da kamera yoksa devreye girer.

## Yüz tanıma (Merhaba, <ad>)

Tabletin kamerası kişiyi görünce ekranda adıyla selam verir. Varsayılan **kapalı**.

1. `config.js` içine ekle: `faces: { enabled: true }` (diğer seçenekler `config.example.js` içinde).
2. Sayfayı yenile, **Yüzler** sekmesinden **Kişi ekle**: adı yaz, kameraya bakıp 3-5 fotoğraf ekle (başı biraz çevirerek), Kaydet.
3. Tarayıcı kamera izni sorar. Firefox'ta "Bu kararı hatırla"yı seç. Kamera yalnızca `http://localhost` ya da `https` adresinde açılır, tablette `localhost:8123` kullan.

Gizlilik: görüntü tarayıcıda işlenir, hiçbir yere gönderilmez. Kayda fotoğraf değil, her yüz için 128 sayılık bir dizi girer ve yalnızca bu Home Assistant'ta durur. Tanıma bilinen kişiler içindir. Evde birini kaydetmeden önce onun haberi olsun.

Kişi tanınınca Home Assistant'a `panel_face_seen` olayı (`name` ile) gönderilir. Otomasyonda tetikleyici olarak kullanabilirsin (örneğin gelince ışık aç).
Kütüphane: @vladmandic/face-api (MIT), modeller `faces/models` içinde, internet gerekmez.

## Ürün sekmeleri (hava durumu, harita, TV, robot, kamera)
Ana sayfada **Düzenle, + Ekle** ile hava durumu, harita, medya oynatıcı (TV), robot ya da kamera ekle.
Eklenen her ürün solda kendi sekmesini alır. Ana sayfadaki kutuya dokununca ayrıntısı o sekmede açılır.
Kutu kaldırılınca sekmesi de kaybolur. TV kutusundaki anahtar TV'yi açıp kapatır, kutunun kendisi kumandayı açar.

- **Hava durumu**: Open-Meteo kullanır, anahtar gerekmez. Konum boşsa Home Assistant'taki ev konumu alınır, `weather` ayarıyla değiştirilir.
- **Harita**: Google Harita. Sekmede adres ya da `enlem,boylam` yazıp ara, uydu görünümü ve yakınlaştırma düğmeleri var. Daha kararlı olması için `mapsApiKey` (Maps Embed API) yazabilirsin.
- **TV kumandası (Samsung)**: Home Assistant'a Samsung Smart TV entegrasyonunu ekle. Güç, ses, kanal ve kaynak `media_player` ile çalışır. Yön tuşları ve rakamlar için entegrasyonun oluşturduğu `remote.*` varlığı gerekir, panel eşleşeni kendi bulur. Bulamazsa kutuyu düzenleyip adı TV ile aynı yap.

## Sesli selam: doğal Türkçe ses (Piper)
Tarayıcının sesi kötüyse Home Assistant üzerinden Piper kullan:
1. `piper/docker-compose.yml` dosyasını `~/homeserver/piper/` içine koy, `docker compose up -d` çalıştır.
2. Home Assistant, Ayarlar, Cihazlar ve hizmetler, Entegrasyon ekle: **Wyoming Protocol**. Sunucu `127.0.0.1`, port `10200`.
3. Eklenince `tts.piper` gibi bir varlık oluşur (Geliştirici araçları, Durumlar'da `tts.` ara).
4. `config.js` içinde `faces: { ..., speak: true, voice: "tts.piper" }` yaz, sayfayı yenile. Yüzler sekmesindeki **Sesi dene** ile dinle.

`voice` boşsa ya da Piper yanıt vermezse tarayıcı sesine geri döner.
