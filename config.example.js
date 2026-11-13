// ============================================================
//  PANEL AYARLARI  — sadece bu dosyayı düzenlemen yeterli
// ============================================================
window.PANEL_CONFIG = {
  // Home Assistant adresi. Panel HA'nın /local/ klasöründen açılıyorsa boş bırak.
  haUrl: "",                       // örn: "http://192.168.1.50:8123"

  // HA > Profil (sol altta adın) > Güvenlik > Uzun ömürlü erişim jetonları
  // Jetonu buraya yapıştır. Bu dosyayı kimseyle paylaşma.
  token: "BURAYA_JETONU_YAPISTIR",

  // go2rtc adresi (kameralar için). Henüz kurulmadıysa kamera sekmesi uyarı gösterir.
  go2rtcUrl: "http://localhost:1984",

  // Kameralar: src = go2rtc içindeki yayın adı
  cameras: [
    { name: "Kamera 1", src: "tapo1" },
    { name: "Kamera 2", src: "tapo2" }
  ],

  // Ana sayfadaki "sık kullanılanlar". Boş bırakırsan "Tüm cihazlar" sekmesinden
  // entity_id'leri görüp buraya eklersin. Örnek:
  //   { entity: "light.salon", name: "Salon" }
  favorites: [],

  // Robot süpürge entity_id'si (Roborock entegrasyonu eklenince "Tüm cihazlar"da görünür)
  vacuum: "",

  // Yüz tanıma: kişi gelince panel "Merhaba <ad>" gösterir. Varsayılan kapalı.
  // Kişileri panelde Yüzler sekmesinden eklersin. Kamera görüntüsü hiçbir yere gönderilmez.
  faces: {
    enabled: false,        // true yapınca tabletin kamerası açılır
    greetUnknown: false,   // tanınmayan yüze sadece "Merhaba" de
    speak: false,          // sesli selam (tarayıcının Türkçe sesi gerekir)
    cooldownMin: 5,        // aynı kişiyi tekrar karşılamadan önce bekleme (dakika)
    threshold: 0.5         // küçüldükçe daha katı eşleşme (0.4 - 0.6 arası dene)
  },

  // Görünüm: "auto" (HA'daki güneşe göre gündüz/gece), "day" ya da "night"
  theme: "auto",

  // Kat planı: GLB dosyası (panel klasörüne koy) — şimdilik boş
  floorplan: ""
};
