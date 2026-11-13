// Ürün modülleri: hava durumu, Google Harita, TV kumandası.
// Her modül: tile() Ana Sayfa kutusunu, detail() ürünün kendi sekmesini çizer.
window.Modules = (() => {
  const ICON = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    partly: '<circle cx="8" cy="8" r="3"/><path d="M8 2v1M2 8h1M3.8 3.8l.7.7M12.2 3.8l-.7.7"/><path d="M8 21h9a4 4 0 0 0 0-8 5.500 5.500 0 0 0-10.400 1.500A3.300 3.300 0 0 0 8 21z"/>',
    cloud: '<path d="M7 19h10a4.500 4.500 0 0 0 .5-9A6 6 0 0 0 6 11.500 3.800 3.800 0 0 0 7 19z"/>',
    rain: '<path d="M7 15h10a4 4 0 0 0 .4-8A5.500 5.500 0 0 0 6.500 8.500 3.300 3.300 0 0 0 7 15z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>',
    snow: '<path d="M7 14h10a4 4 0 0 0 .4-8A5.500 5.500 0 0 0 6.500 7.500 3.300 3.300 0 0 0 7 14z"/><path d="M8 18h.01M12 18h.01M16 18h.01M10 21h.01M14 21h.01"/>',
    storm: '<path d="M7 14h10a4 4 0 0 0 .4-8A5.500 5.500 0 0 0 6.500 7.500 3.300 3.300 0 0 0 7 14z"/><path d="M12 14l-2 4h4l-2 4"/>',
    fog: '<path d="M4 9h16M6 13h12M4 17h16"/>'
  };
  // Open-Meteo hava kodu -> Türkçe ad ve simge
  function wmo(code, day) {
    const d = day === undefined ? 1 : day;
    if (code === 0) return ["Açık", d ? "sun" : "moon"];
    if (code === 1) return ["Çoğunlukla açık", d ? "sun" : "moon"];
    if (code === 2) return ["Parçalı bulutlu", "partly"];
    if (code === 3) return ["Bulutlu", "cloud"];
    if (code === 45 || code === 48) return ["Sisli", "fog"];
    if (code >= 51 && code <= 57) return ["Çisenti", "rain"];
    if (code >= 61 && code <= 67) return ["Yağmurlu", "rain"];
    if (code >= 71 && code <= 77) return ["Karlı", "snow"];
    if (code >= 80 && code <= 82) return ["Sağanak yağış", "rain"];
    if (code === 85 || code === 86) return ["Kar sağanağı", "snow"];
    if (code >= 95) return ["Gök gürültülü fırtına", "storm"];
    return ["Bilinmiyor", "cloud"];
  }
  const deg = (v) => Math.round(v) + "°";

  // ---------- ev konumu (Home Assistant ayarından) ----------
  let homeP = null;
  function home(api) {
    const c = api.cfg.weather || {};
    if (c.latitude != null && c.longitude != null) return Promise.resolve([c.latitude, c.longitude]);
    if (!homeP) homeP = api.ha.send({ type: "get_config" })
      .then((r) => (r && (r.latitude || r.longitude)) ? [r.latitude, r.longitude] : [35.1856, 33.3823])
      .catch(() => [35.1856, 33.3823]);                       // alınamazsa Lefkoşa
    return homeP;
  }

  // ---------- hava durumu ----------
  let wcache = null, wprom = null;
  async function getWeather(api) {
    if (wcache && Date.now() - wcache.at < 15 * 60000) return wcache;
    if (wprom) return wprom;
    wprom = (async () => {
      try {
        const [la, lo] = await home(api);
        const url = "https://api.open-meteo.com/v1/forecast?latitude=" + la + "&longitude=" + lo +
          "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure" +
          "&hourly=temperature_2m,weather_code,precipitation_probability,is_day" +
          "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
          "&timezone=auto&forecast_days=7&wind_speed_unit=kmh";
        const r = await fetch(url);
        if (!r.ok) throw new Error("HTTP " + r.status);
        wcache = { at: Date.now(), j: await r.json() };
        return wcache;
      } catch (e) { if (wcache) return wcache; throw e; }     // internet gidince eski veriyi göster
      finally { wprom = null; }
    })();
    return wprom;
  }
  const dayName = (iso, i) => i === 0 ? "Bugün" : i === 1 ? "Yarın"
    : new Date(iso + "T12:00").toLocaleDateString("tr-TR", { weekday: "short" });

  const weather = {
    label: "Hava durumu",
    tile(it, body, node, api) {
      const el = api.el, svg = api.svg;
      const top = el("div", "wtop"), temp = el("div", "wx-temp", "--"), ico = el("div", "wx-ico");
      top.append(temp, ico);
      const meta = el("div", "wmeta"), nm = el("div", "name", it.name || "Hava durumu"), st = el("div", "state", "Yükleniyor");
      meta.append(nm, st);
      const days = el("div", "wx-days");
      body.append(top, meta); if (it.h >= 2) body.append(days);
      const fill = async () => {
        try {
          const { j } = await getWeather(api), c = j.current;
          const [label, key] = wmo(c.weather_code, c.is_day);
          temp.textContent = deg(c.temperature_2m);
          ico.innerHTML = svg(ICON[key]);
          st.textContent = label + ", " + deg(j.daily.temperature_2m_max[0]) + " / " + deg(j.daily.temperature_2m_min[0]);
          days.replaceChildren();
          for (let i = 1; i <= 3; i++) {
            const d = api.el("div", "wx-day"), k = wmo(j.daily.weather_code[i], 1)[1];
            const ic = api.el("div", "wx-dico"); ic.innerHTML = svg(ICON[k]);
            d.append(api.el("span", "", dayName(j.daily.time[i], i)), ic, api.el("b", "", deg(j.daily.temperature_2m_max[i])));
            days.append(d);
          }
        } catch (e) { st.textContent = "Alınamadı. İnternet bağlantısını kontrol et."; }
      };
      fill();
      const t = setInterval(fill, 15 * 60000); api.onCleanup("home", () => clearInterval(t));
    },
    async detail(root, it, api) {
      const el = api.el, svg = api.svg;
      const wrap = el("div", "wx-detail");
      root.append(wrap); wrap.append(el("p", "hint", "Hava durumu yükleniyor"));
      let j;
      try { j = (await getWeather(api)).j; }
      catch (e) { wrap.replaceChildren(el("p", "hint", "Hava durumu alınamadı. Tabletin internet bağlantısını kontrol et.")); return; }
      if (!wrap.isConnected) return;
      const c = j.current, [label, key] = wmo(c.weather_code, c.is_day);
      const now = el("div", "wx-now");
      const big = el("div", "wx-bigico"); big.innerHTML = svg(ICON[key]);
      const t = el("div", "wx-bigtemp", deg(c.temperature_2m));
      const info = el("div", "wx-info");
      info.append(el("div", "wx-label", label), el("div", "wx-sub", "Hissedilen " + deg(c.apparent_temperature)));
      now.append(big, t, info);
      const facts = el("div", "wx-facts");
      const fact = (k, v) => { const f = el("div", "wx-fact"); f.append(el("span", "", k), el("b", "", v)); facts.append(f); };
      fact("Nem", "%" + Math.round(c.relative_humidity_2m));
      fact("Rüzgâr", Math.round(c.wind_speed_10m) + " km/sa");
      fact("Basınç", Math.round(c.surface_pressure) + " hPa");
      fact("Gün doğumu", j.daily.sunrise[0].slice(11, 16));
      fact("Gün batımı", j.daily.sunset[0].slice(11, 16));
      // önümüzdeki 12 saat
      const hour = el("div", "wx-hours");
      const start = Math.max(0, j.hourly.time.findIndex((x) => x >= c.time.slice(0, 13) + ":00"));
      for (let i = start; i < start + 12 && i < j.hourly.time.length; i++) {
        const h = el("div", "wx-hour"), ic = el("div", "wx-dico");
        ic.innerHTML = svg(ICON[wmo(j.hourly.weather_code[i], j.hourly.is_day[i])[1]]);
        h.append(el("span", "", j.hourly.time[i].slice(11, 16)), ic, el("b", "", deg(j.hourly.temperature_2m[i])),
          el("em", "", j.hourly.precipitation_probability[i] ? "%" + j.hourly.precipitation_probability[i] : ""));
        hour.append(h);
      }
      // 7 gün
      const list = el("div", "wx-list");
      j.daily.time.forEach((d, i) => {
        const r = el("div", "wx-row"), ic = el("div", "wx-dico");
        ic.innerHTML = svg(ICON[wmo(j.daily.weather_code[i], 1)[1]]);
        const pr = j.daily.precipitation_probability_max[i];
        r.append(el("span", "d", dayName(d, i)), ic, el("span", "p", pr ? "%" + pr : ""),
          el("span", "lo", deg(j.daily.temperature_2m_min[i])), el("b", "hi", deg(j.daily.temperature_2m_max[i])));
        list.append(r);
      });
      wrap.replaceChildren(now, facts, el("h3", "", "Önümüzdeki saatler"), hour, el("h3", "", "7 günlük tahmin"), list);
    }
  };

  // ---------- Google Harita ----------
  function mapSrc(api, q, zoom, sat) {
    const key = api.cfg.mapsApiKey;
    const latlon = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(q);
    if (key) {                                               // resmi gömme API'si (anahtar ücretsiz)
      const base = "https://www.google.com/maps/embed/v1/" + (latlon ? "view" : "place") + "?key=" + encodeURIComponent(key);
      return base + (latlon ? "&center=" : "&q=") + encodeURIComponent(q.replace(/\s/g, "")) + "&zoom=" + zoom +
        "&maptype=" + (sat ? "satellite" : "roadmap") + "&language=tr";
    }
    return "https://maps.google.com/maps?q=" + encodeURIComponent(q.replace(/\s*,\s*/g, ",")) + "&z=" + zoom +
      "&t=" + (sat ? "k" : "m") + "&hl=tr&output=embed";
  }
  async function mapQuery(api, it) { if (it.query) return it.query; const [la, lo] = await home(api); return la + "," + lo; }

  const map = {
    label: "Harita",
    tile(it, body, node, api) {
      const f = document.createElement("iframe");
      f.setAttribute("referrerpolicy", "no-referrer"); f.setAttribute("loading", "lazy"); f.tabIndex = -1;
      mapQuery(api, it).then((q) => { f.src = mapSrc(api, q, it.zoom || 14, it.sat); });
      body.append(f, api.el("div", "label", it.name || "Harita"));
      node.classList.add("nopad");
    },
    async detail(root, it, api) {
      const el = api.el;
      const wrap = el("div", "map-detail");
      const bar = el("div", "map-bar");
      const inp = el("input"); inp.type = "text"; inp.placeholder = "Adres ya da enlem,boylam"; inp.value = it.query || "";
      const go = el("button", "btn solid", "Ara"), sat = el("button", "btn", it.sat ? "Harita" : "Uydu");
      const zi = el("button", "btn", "+"), zo = el("button", "btn", "−");
      bar.append(inp, go, sat, zo, zi);
      const frame = document.createElement("iframe"); frame.className = "map-frame";
      frame.setAttribute("referrerpolicy", "no-referrer");
      wrap.append(bar, frame);
      if (!api.cfg.mapsApiKey) wrap.append(el("p", "tip", "Harita Google'ın herkese açık gömme adresiyle açılıyor. Daha kararlı olması için config.js içine mapsApiKey (Maps Embed API anahtarı) yazabilirsin."));
      root.append(wrap);
      const load = async () => { frame.src = mapSrc(api, await mapQuery(api, it), it.zoom || 14, it.sat); };
      const save = () => { api.saveLayout(); load(); };
      go.addEventListener("click", () => { it.query = inp.value.trim(); save(); });
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go.click(); });
      sat.addEventListener("click", () => { it.sat = !it.sat; sat.textContent = it.sat ? "Harita" : "Uydu"; save(); });
      zi.addEventListener("click", () => { it.zoom = Math.min(20, (it.zoom || 14) + 1); save(); });
      zo.addEventListener("click", () => { it.zoom = Math.max(2, (it.zoom || 14) - 1); save(); });
      load();
    }
  };

  // ---------- TV kumandası ----------
  function findRemote(api, it) {
    if (it.remote && api.states()[it.remote]) return it.remote;
    const st = api.states(), obj = it.entity.split(".")[1];
    const remotes = Object.keys(st).filter((id) => id.startsWith("remote."));
    const name = (st[it.entity] && st[it.entity].attributes.friendly_name || "").toLowerCase();
    return remotes.find((id) => id.split(".")[1] === obj) ||
      remotes.find((id) => name && (st[id].attributes.friendly_name || "").toLowerCase() === name) ||
      remotes.find((id) => id.includes(obj) || obj.includes(id.split(".")[1])) ||
      remotes.find((id) => /samsung/i.test(id)) || "";
  }
  const tv = {
    label: "TV",
    detail(root, it, api) {
      const el = api.el;
      const wrap = el("div", "tv-detail");
      const head = el("div", "tv-head"), title = el("div", "tv-title"), stat = el("div", "tv-state");
      head.append(title, stat);
      const note = el("p", "tip");
      const remote = el("div", "remote");
      const pad = el("div", "tv-pad"), vol = el("div", "tv-row"), nums = el("div", "tv-nums"), play = el("div", "tv-row");
      let rid = "";
      const call = (domain, service, data) => api.ha.callService(domain, service, data || {}, { entity_id: domain === "remote" ? rid : it.entity })
        .catch((e) => api.toast("Komut gönderilemedi: " + ((e && e.message) || "bilinmeyen hata")));
      // key: remote varlığına gönderilen Samsung tuş adı; alt: kumanda varlığı yoksa media_player servisi
      const key = (label, k, alt, cls) => {
        const b = el("button", "rk" + (cls ? " " + cls : ""), label);
        b.addEventListener("click", () => {
          if (rid) call("remote", "send_command", { command: k });
          else if (alt) call("media_player", alt);
          else api.toast("Bu tuş için Samsung TV entegrasyonunda uzaktan kumanda (remote) varlığı gerekir");
        });
        return b;
      };
      const power = el("button", "rk power", "Aç / Kapat");
      power.addEventListener("click", () => call("media_player", "toggle"));
      const dpad = el("div", "dpad");
      dpad.append(el("span"), key("▲", "KEY_UP"), el("span"), key("◀", "KEY_LEFT"), key("OK", "KEY_ENTER", null, "ok"),
        key("▶", "KEY_RIGHT"), el("span"), key("▼", "KEY_DOWN"), el("span"));
      const nav = el("div", "tv-row");
      nav.append(key("Geri", "KEY_RETURN"), key("Ana ekran", "KEY_HOME"), key("Menü", "KEY_MENU"), key("Kaynak", "KEY_SOURCE"));
      vol.append(key("Ses −", "KEY_VOLDOWN", "volume_down"), key("Sessiz", "KEY_MUTE", "volume_mute"), key("Ses +", "KEY_VOLUP", "volume_up"));
      const ch = el("div", "tv-row");
      ch.append(key("Kanal −", "KEY_CHDOWN", "media_previous_track"), key("Kanal +", "KEY_CHUP", "media_next_track"));
      play.append(key("⏪", "KEY_REWIND"), key("▶", "KEY_PLAY", "media_play"), key("⏸", "KEY_PAUSE", "media_pause"), key("⏩", "KEY_FF"));
      for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) nums.append(key(String(n), "KEY_" + n));
      nums.append(el("span"), key("0", "KEY_0"), el("span"));
      remote.append(power, dpad, nav, vol, ch, play, nums);
      const srcRow = el("div", "tv-src");
      const sel = el("select"); sel.addEventListener("change", () => { if (sel.value) call("media_player", "select_source", { source: sel.value }); });
      srcRow.append(el("label", "", "Kaynak seç"), sel);
      wrap.append(head, el("div", "tv-body"));
      $$(wrap, ".tv-body").append(remote, (() => { const s = el("div", "tv-side"); s.append(srcRow, note); return s; })());
      root.append(wrap);

      const refresh = () => {
        const st = api.states()[it.entity];
        title.textContent = it.name || (st ? st.attributes.friendly_name || it.entity : it.entity);
        stat.textContent = st ? api.stateText(st) : "Bulunamadı";
        const list = (st && st.attributes.source_list) || [];
        const cur = (st && st.attributes.source) || "";
        sel.replaceChildren(el("option", "", list.length ? "Seç" : "Kaynak listesi yok"));
        sel.firstChild.value = "";
        list.forEach((s) => { const o = el("option", "", s); o.value = s; if (s === cur) o.selected = true; sel.append(o); });
        rid = findRemote(api, it);
        note.textContent = rid ? "Kumanda: " + rid
          : "Yön tuşları ve rakamlar için Samsung TV entegrasyonunun uzaktan kumanda (remote) varlığı gerekir. Ses, kanal ve oynat tuşları şimdilik medya oynatıcıyla çalışır.";
      };
      refresh();
      root._tvRefresh = refresh;
    },
    update(root, it, api, changed) { if (root._tvRefresh && (changed === it.entity || changed.startsWith("remote."))) root._tvRefresh(); }
  };
  function $$(r, s) { return r.querySelector(s); }

  return { weather, map, tv };
})();
