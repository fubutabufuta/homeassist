(() => {
  const cfg = window.PANEL_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const TOGGLE = ["light", "switch", "input_boolean", "fan"];
  const SWITCHY = TOGGLE.concat(["media_player", "cover"]);
  const ON_STATES = ["on", "playing", "open", "heat", "cool", "home"];
  let states = {};
  let currentTab = "home";

  // ---------- ikonlar (sabit çizimler) ----------
  const svg = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
  const P = {
    light: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    switch: '<path d="M9 2v5M15 2v5M7 7h10v4a5 5 0 0 1-10 0V7zM12 16v6"/>',
    fan: '<circle cx="12" cy="12" r="1.6"/><path d="M12 10.4C12 6 14 3 17 3c0 3-2 5.5-5 7.4zM13.6 12c4.4 0 7.4 2 7.4 5-3 0-5.5-2-7.4-5zM12 13.6C12 18 10 21 7 21c0-3 2-5.500 5-7.400zM10.400 12C6 12 3 10 3 7c3 0 5.500 2 7.400 5z"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    cover: '<path d="M4 4h16M5 8h14M6 12h12M7 16h10M12 16v4"/>',
    vacuum: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3"/>',
    thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>',
    gauge: '<path d="M4 16a8 8 0 1 1 16 0M12 16l4-5"/>',
    dot: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
    camera: '<path d="M3 8a2 2 0 0 1 2-2h2l1.500-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.500" r="3.500"/>',
    climate: '<path d="M12 3v18M4.500 7.500l15 9M19.500 7.500l-15 9"/>',
    scene: '<path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800z"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.400 1.400M17.600 17.600L19 19M5 19l1.400-1.400M17.600 6.400L19 5"/>',
    cube: '<path d="M12 3l8 4.500v9L12 21l-8-4.500v-9z"/>',
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    plan: '<path d="M3 3h18v18H3zM3 12h8M11 3v18M11 15h10"/>',
    face: '<circle cx="12" cy="12" r="9"/><path d="M9 10v1.500M15 10v1.500M8.500 15c1.800 1.600 5.200 1.600 7 0"/>',
    pin: '<path d="M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
    cloudsun: '<circle cx="8" cy="8" r="3"/><path d="M8 2v1M2 8h1M3.800 3.800l.7.7M12.200 3.800l-.7.7"/><path d="M8 21h9a4 4 0 0 0 0-8 5.500 5.500 0 0 0-10.400 1.500A3.300 3.300 0 0 0 8 21z"/>',
    all: '<rect x="3" y="3" width="7" height="7" rx="1.500"/><rect x="14" y="3" width="7" height="7" rx="1.500"/><rect x="3" y="14" width="7" height="7" rx="1.500"/><rect x="14" y="14" width="7" height="7" rx="1.500"/>'
  };
  function iconFor(id) {
    const d = domain(id), s = states[id], dc = s && s.attributes && s.attributes.device_class;
    if (d === "sensor") return svg(dc === "humidity" ? P.drop : dc === "temperature" ? P.thermo : P.gauge);
    const m = { light: "light", switch: "switch", input_boolean: "switch", fan: "fan", media_player: "tv", cover: "cover",
      vacuum: "vacuum", binary_sensor: "dot", camera: "camera", climate: "climate", scene: "scene", script: "scene",
      button: "dot", person: "person", sun: "sun", weather: "sun" };
    return svg(P[m[d] || "cube"]);
  }
  const NAV_ICONS = { home: P.home, plan: P.plan, faces: P.face, all: P.all, weather: P.cloudsun, map: P.pin, tv: P.tv, robot: P.vacuum, camera: P.camera };
  document.querySelectorAll("#tabs button").forEach((b) => b.insertAdjacentHTML("afterbegin", svg(NAV_ICONS[b.dataset.tab])));
  const NAMES = { light: "Işıklar", switch: "Prizler ve anahtarlar", input_boolean: "Sanal anahtarlar", fan: "Fanlar",
    sensor: "Sensörler", binary_sensor: "Algılayıcılar", media_player: "Medya", vacuum: "Süpürge", camera: "Kameralar",
    climate: "İklim", cover: "Perdeler", scene: "Sahneler", script: "Komutlar", button: "Düğmeler", person: "Kişiler",
    automation: "Otomasyonlar", sun: "Güneş", weather: "Hava", update: "Güncellemeler" };

  // ---------- yardımcılar ----------
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const domain = (id) => id.split(".")[0];
  const fname = (s) => (s.attributes && s.attributes.friendly_name) || s.entity_id;
  const isOn = (s) => ON_STATES.includes(s.state);
  const toast = (msg) => {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2000);
  };
  const unitOf = (s) => (s.attributes && s.attributes.unit_of_measurement) || "";
  const numFmt = (v) => { const n = Number(v); return isFinite(n) && v !== "" ? String(Math.round(n * 10) / 10) : v; };
  const stateText = (s) => {
    const map = { on: "Açık", off: "Kapalı", unavailable: "Ulaşılamıyor", unknown: "Bilinmiyor",
      playing: "Oynatıyor", paused: "Duraklatıldı", idle: "Boşta", open: "Açık", closed: "Kapalı",
      cleaning: "Temizliyor", docked: "İstasyonda", returning: "Şarja dönüyor", home: "Evde", not_home: "Dışarıda",
      above_horizon: "Gün doğdu", below_horizon: "Gün battı", error: "Hata", paused_: "Duraklatıldı" };
    const u = unitOf(s);
    return (map[s.state] || numFmt(s.state)) + (u ? " " + u : "");
  };
  // Robot süpürge: config'te yazılıysa o, yoksa Home Assistant'taki ilk vacuum.* cihazı
  const vacuumId = () => {
    if (cfg.vacuum && states[cfg.vacuum]) return cfg.vacuum;
    return Object.keys(states).filter((id) => id.startsWith("vacuum.")).sort()[0] || "";
  };
  const controllable = (id) => SWITCHY.concat(["scene", "script", "button"]).includes(domain(id));

  // ---------- tema: güneşe göre gündüz / gece ----------
  function applyTheme() {
    let mode = cfg.theme || "auto";
    if (mode === "auto") {
      const sun = states["sun.sun"];
      if (sun && sun.state === "below_horizon") mode = "night";
      else if (sun && sun.state === "above_horizon") mode = "day";
      else { const h = new Date().getHours(); mode = (h >= 7 && h < 19) ? "day" : "night"; }
    }
    document.documentElement.dataset.theme = mode;
  }
  if (cfg.accent) document.documentElement.style.setProperty("--lit", cfg.accent);

  // ---------- saat, selam, özet ----------
  function tick() {
    const d = new Date(), h = d.getHours();
    $("#clock").textContent = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    $("#date").textContent = d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
    $("#greet").textContent = h < 5 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : h < 22 ? "İyi akşamlar" : "İyi geceler";
    applyTheme();
  }
  tick(); setInterval(tick, 20000);

  function updateChips() {
    const box = $("#chips"); box.replaceChildren();
    const all = Object.values(states);
    if (!all.length) return;
    const lights = all.filter((s) => domain(s.entity_id) === "light");
    const lightsOn = lights.filter((s) => s.state === "on").length;
    const others = all.filter((s) => ["switch", "fan", "media_player", "input_boolean"].includes(domain(s.entity_id)));
    const othersOn = others.filter((s) => isOn(s)).length;
    const mk = (on, text) => { const c = el("div", "chip" + (on ? " on" : "")); c.append(el("i"), el("span", "", text)); box.append(c); };
    if (lights.length) mk(lightsOn > 0, lightsOn > 0 ? lightsOn + " ışık yanıyor" : "Işıklar kapalı");
    if (others.length) mk(othersOn > 0, othersOn > 0 ? othersOn + " cihaz açık" : "Cihazlar kapalı");
  }

  // ---------- bağlantı ----------
  const ha = new HAClient({
    url: cfg.haUrl, token: cfg.token,
    onStatus: (st) => {
      const b = $("#status");
      const t = { baglaniyor: ["Bağlanıyor", ""], bagli: ["Bağlı", "ok"], kopuk: ["Bağlantı koptu", "bad"],
        jeton_hatali: ["Jeton hatalı", "bad"] }[st] || [st, ""];
      b.textContent = t[0]; b.className = "badge " + t[1];
    },
    onState: (all, changed) => {
      states = all; updateChips();
      if (!changed || changed === "sun.sun") applyTheme();
      if (changed) renderChanged(changed); else { renderAll(); loadLayout(); }
    }
  });

  function toggle(id) {
    const s = states[id]; if (!s) return;
    const d = domain(id);
    let p;
    if (TOGGLE.includes(d)) p = ha.callService("homeassistant", "toggle", {}, { entity_id: id });
    else if (d === "media_player") p = ha.callService("media_player", "toggle", {}, { entity_id: id });
    else if (d === "cover") p = ha.callService("cover", "toggle", {}, { entity_id: id });
    else if (d === "scene" || d === "script") p = ha.callService(d, "turn_on", {}, { entity_id: id });
    else if (d === "button") p = ha.callService("button", "press", {}, { entity_id: id });
    else return;
    p.catch((e) => toast("Komut gönderilemedi: " + ((e && e.message) || "bilinmeyen hata")));
  }

  // ---------- sekmeler ----------
  // Ana sayfaya eklenen "ürünler" (hava, harita, TV, robot, kamera) solda kendi sekmesini alır.
  const KIND_LABEL = { weather: "Hava durumu", map: "Harita", tv: "TV", robot: "Robot", camera: "Kamera" };
  function detailKind(it) {
    if (it.type === "weather" || it.type === "map" || it.type === "robot") return it.type;
    if (it.type === "camera") return "camera";
    if (it.type === "entity") {
      const d = domain(it.entity);
      if (d === "camera") return "camera";
      if (d === "vacuum") return "robot";
      if (d === "media_player" || d === "remote") return "tv";
    }
    return null;
  }
  const findItem = (tab) => (layout || []).find((o) => "w_" + o.id === tab);
  const itemName = (it) => it.name || (it.entity && states[it.entity] ? fname(states[it.entity]) : "") || it.src || KIND_LABEL[detailKind(it)];
  function syncTabs() {
    const box = $("#ptabs"); if (!box || !layout) return;
    const items = layout.filter((o) => detailKind(o));
    const sig = items.map((o) => o.id + ":" + itemName(o) + ":" + detailKind(o)).join("|");
    if (box.dataset.sig !== sig) {
      box.dataset.sig = sig; box.replaceChildren();
      items.forEach((o) => {
        const b = el("button"); b.dataset.tab = "w_" + o.id;
        b.insertAdjacentHTML("afterbegin", svg(NAV_ICONS[detailKind(o)]));
        b.append(el("span", "", itemName(o)));
        box.append(b);
      });
    }
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x.dataset.tab === currentTab));
    if (currentTab.startsWith("w_") && !findItem(currentTab)) setTab("home");
  }
  function setTab(t) {
    currentTab = t;
    const sec = t.startsWith("w_") ? "tab-detail" : "tab-" + t;
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x.id === sec));
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x.dataset.tab === t));
    renderAll();
  }
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]"); if (b) setTab(b.dataset.tab);
  });

  // ---------- HA kamera görüntüsü (camera.* cihazları) ----------
  // Önce HA'nın MJPEG akışı denenir, olmazsa 2 saniyede bir anlık görüntü yenilenir.
  const camStops = { home: [], tab: [] };
  const runStops = (k) => { camStops[k].forEach((f) => { try { f(); } catch (e) {} }); camStops[k] = []; };
  function makeHaCam(entity, name, bucket) {
    const box = el("div", "hacam");
    const img = document.createElement("img"); img.alt = ""; img.draggable = false;
    const lab = el("div", "label", name || entity);
    const note = el("div", "camnote");
    box.append(img, lab, note);
    let mode = "stream", timer = null;
    const attrs = () => (states[entity] && states[entity].attributes) || {};
    const say = (t) => { note.textContent = t; note.style.display = t ? "grid" : "none"; };
    const snap = () => { const t = attrs().access_token; if (!t) return say("Kameranın erişim anahtarı yok");
      img.src = ha.base + "/api/camera_proxy/" + entity + "?token=" + encodeURIComponent(t) + "&_=" + Date.now(); };
    img.onload = () => say("");
    img.onerror = () => {
      if (mode === "stream") { mode = "snap"; snap(); timer = setInterval(snap, 2000); }
      else say("Görüntü alınamıyor. Kamera Home Assistant'ta çalışıyor mu?");
    };
    const t0 = attrs().access_token;
    if (!states[entity]) say("Kamera bulunamadı");
    else if (!t0) say("Kameranın erişim anahtarı yok");
    else {
      say("Bağlanıyor"); img.src = ha.base + "/api/camera_proxy_stream/" + entity + "?token=" + encodeURIComponent(t0);
      // 6 saniyede ilk kare gelmezse anlık görüntü yöntemine geç
      setTimeout(() => { if (mode === "stream" && note.textContent === "Bağlanıyor" && img.onerror) img.onerror(); }, 6000);
    }
    const stop = () => { clearInterval(timer); img.onerror = null; img.onload = null; img.removeAttribute("src"); };
    camStops[bucket].push(stop);
    return box;
  }

  // ---------- ana sayfa: sürükle-bırak tuval ----------
  const PITCH = 120, GAP = 12;
  let layout = null, editMode = false, layoutLoaded = false;
  const widgetRefs = {};
  const uid = () => "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  function seedLayout() {
    const out = [];
    (cfg.favorites || []).forEach((f) => {
      const it = { id: uid(), type: "entity", entity: f.entity, name: f.name || "", w: 2, h: 1 };
      const p = findFree(out, it.w, it.h, 8); it.x = p.x; it.y = p.y; out.push(it);
    });
    return out;
  }
  async function loadLayout() {
    if (layoutLoaded) return;
    let v = null;
    try { const r = await ha.send({ type: "frontend/get_user_data", key: "panel_layout" }); v = r && r.value; } catch (e) {}
    if (!v) { try { v = JSON.parse(localStorage.getItem("panel_layout")); } catch (e) {} }
    layout = Array.isArray(v) ? v : seedLayout();
    layoutLoaded = true;
    syncTabs();
    if (currentTab === "home") renderHome();
  }
  function saveLayout() {
    syncTabs();
    try { localStorage.setItem("panel_layout", JSON.stringify(layout)); } catch (e) {}
    ha.send({ type: "frontend/set_user_data", key: "panel_layout", value: layout }).catch(() => {});
  }
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  function findFree(items, w, h, cols, ignoreId) {
    for (let y = 0; y < 200; y++) for (let x = 0; x <= Math.max(0, cols - w); x++) {
      const t = { x, y, w, h };
      if (!items.some((o) => o.id !== ignoreId && overlap(t, o))) return { x, y };
    }
    return { x: 0, y: 0 };
  }
  const colsNow = () => Math.max(2, Math.floor(($("#tab-home").clientWidth + GAP) / PITCH));

  function renderHome() {
    runStops("home");
    const root = $("#tab-home"); root.replaceChildren();
    Object.keys(widgetRefs).forEach((k) => delete widgetRefs[k]);
    if (!layout) { root.append(el("div", "hint", "Düzen yükleniyor")); return; }
    syncTabs();

    const bar = el("div", "toolbar");
    const eb = el("button", "btn" + (editMode ? " solid" : ""), editMode ? "Tamam" : "Düzenle");
    eb.addEventListener("click", () => { editMode = !editMode; renderHome(); });
    bar.append(eb);
    if (editMode) {
      const ab = el("button", "btn", "+ Ekle"); ab.addEventListener("click", openPicker); bar.append(ab);
      bar.append(el("span", "tip", "Kutuyu sürükleyerek taşı, sağ alt köşesinden büyüt, ✕ ile kaldır."));
    }
    root.append(bar);

    if (!layout.length) {
      root.append(el("div", "hint", editMode ? "Tuval boş. + Ekle ile ilk kutunu koy."
        : "Ana sayfa boş. Düzenle'ye dokunup + Ekle ile ilk kutunu koy."));
    }
    const canvas = el("div", "canvas" + (editMode ? " edit" : ""));
    let maxY = 0;
    layout.forEach((it) => { canvas.append(buildWidget(it)); maxY = Math.max(maxY, it.y + it.h); });
    canvas.style.height = (maxY + 2) * PITCH + "px";
    root.append(canvas);
  }

  function place(node, it) {
    node.style.left = it.x * PITCH + "px"; node.style.top = it.y * PITCH + "px";
    node.style.width = it.w * PITCH - GAP + "px"; node.style.height = it.h * PITCH - GAP + "px";
  }

  function buildWidget(it) {
    const node = el("div", "w w-" + it.type); place(node, it);
    const body = el("div", "wbody"); node.append(body);

    if (it.type === "entity" && domain(it.entity) === "camera") {
      body.append(makeHaCam(it.entity, it.name || (states[it.entity] ? fname(states[it.entity]) : ""), "home"));
      node.classList.add("nopad");
      node.addEventListener("click", () => { if (!editMode) setTab("w_" + it.id); });
    } else if (it.type === "entity") {
      const d = domain(it.entity);
      const top = el("div", "wtop"), ico = el("div", "ico");
      ico.innerHTML = iconFor(it.entity);
      top.append(ico);
      const opens = !!detailKind(it);
      if (SWITCHY.includes(d)) { const sw = el("div", "sw"); sw.append(el("i")); top.append(sw);
        if (opens) sw.addEventListener("click", (e) => { e.stopPropagation(); if (!editMode) toggle(it.entity); }); }
      const meta = el("div", "wmeta"), nm = el("div", "name"), stt = el("div", "state");
      meta.append(nm, stt); body.append(top, meta);
      if (d === "sensor") node.classList.add("sensor");
      const upd = () => {
        const s = states[it.entity];
        nm.textContent = it.name || (s ? fname(s) : it.entity);
        if (!s) stt.textContent = "Bulunamadı";
        else if (d === "sensor") {
          const v = el("span", "v", numFmt(s.state)), u = el("span", "u", unitOf(s));
          stt.replaceChildren(v, u);
        } else stt.textContent = stateText(s);
        node.classList.toggle("on", !!s && isOn(s));
        node.classList.toggle("unavail", !s || s.state === "unavailable");
      };
      upd(); widgetRefs[it.id] = { entity: it.entity, update: upd };
      node.addEventListener("click", () => {
        if (editMode) return;
        if (opens) setTab("w_" + it.id); else if (controllable(it.entity)) toggle(it.entity);
      });
    } else if (it.type === "camera") {
      const f = document.createElement("iframe");
      f.src = cfg.go2rtcUrl + "/stream.html?src=" + encodeURIComponent(it.src) + "&mode=webrtc,mse";
      f.allow = "autoplay; fullscreen";
      body.append(f, el("div", "label", it.name || it.src));
      node.classList.add("nopad");
      node.addEventListener("click", () => { if (!editMode) setTab("w_" + it.id); });
    } else if (window.Modules && window.Modules[it.type] && window.Modules[it.type].tile) {
      window.Modules[it.type].tile(it, body, node, api);
      node.addEventListener("click", () => { if (!editMode) setTab("w_" + it.id); });
    } else if (it.type === "robot") {
      const top = el("div", "wtop"), ico = el("div", "ico");
      ico.innerHTML = svg(P.vacuum); top.append(ico);
      const meta = el("div", "wmeta"), title = el("div", "name"), stt = el("div", "state big");
      meta.append(title, stt);
      const bat = el("div", "bat"), segs = el("div", "segs"), pct = el("span", "pct");
      for (let i = 0; i < 10; i++) segs.append(el("i"));
      bat.append(segs, pct);
      const row = el("div", "btnrow small");
      const act = (label, svc, cls) => {
        const b = el("button", "btn " + (cls || ""), label);
        b.addEventListener("click", (e) => { e.stopPropagation(); if (editMode) return;
          ha.callService("vacuum", svc, {}, { entity_id: it.entity }).then(() => toast(label))
            .catch(() => toast("Komut gönderilemedi")); });
        row.append(b);
      };
      act("Başlat", "start", "primary"); act("Duraklat", "pause"); act("Şarja dön", "return_to_base");
      body.append(top, meta, bat, row);
      const upd = () => {
        const s = states[it.entity];
        title.textContent = it.name || (s ? fname(s) : it.entity);
        stt.textContent = s ? stateText(s) : "Bulunamadı";
        const b = s && s.attributes && s.attributes.battery_level;
        bat.style.visibility = b === undefined ? "hidden" : "visible";
        if (b !== undefined) { segs.querySelectorAll("i").forEach((x, i) => x.classList.toggle("f", i < Math.round(b / 10))); pct.textContent = "%" + b; }
        node.classList.toggle("cleaning", !!s && s.state === "cleaning");
      };
      upd(); widgetRefs[it.id] = { entity: it.entity, update: upd };
      node.addEventListener("click", () => { if (!editMode) setTab("w_" + it.id); });
    }

    if (editMode) {
      const x = el("button", "xbtn", "✕"); x.setAttribute("aria-label", "Kaldır");
      x.addEventListener("pointerdown", (e) => e.stopPropagation());
      x.addEventListener("click", (e) => { e.stopPropagation();
        layout = layout.filter((o) => o.id !== it.id); saveLayout(); renderHome(); });
      const ren = el("button", "rbtn", "✎"); ren.setAttribute("aria-label", "Yeniden adlandır");
      ren.addEventListener("pointerdown", (e) => e.stopPropagation());
      ren.addEventListener("click", (e) => { e.stopPropagation();
        const n = window.prompt("Kutu adı:", it.name || ""); if (n === null) return;
        it.name = n.trim(); saveLayout(); renderHome(); });
      const h = el("div", "handle");
      node.append(x, ren, h);
      attachDrag(node, it); attachResize(h, node, it);
    }
    return node;
  }

  function attachDrag(node, it) {
    node.addEventListener("pointerdown", (e) => {
      if (e.target.classList.contains("handle")) return;
      node.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, ol = it.x * PITCH, ot = it.y * PITCH;
      node.classList.add("dragging");
      const move = (ev) => { node.style.left = Math.max(0, ol + ev.clientX - sx) + "px";
                             node.style.top = Math.max(0, ot + ev.clientY - sy) + "px"; };
      const up = (ev) => {
        node.removeEventListener("pointermove", move); node.removeEventListener("pointerup", up);
        node.removeEventListener("pointercancel", up); node.classList.remove("dragging");
        const cols = colsNow();
        const t = { id: it.id, w: it.w, h: it.h,
          x: Math.min(Math.max(0, Math.round((ol + ev.clientX - sx) / PITCH)), Math.max(0, cols - it.w)),
          y: Math.max(0, Math.round((ot + ev.clientY - sy) / PITCH)) };
        if (!layout.some((o) => o.id !== it.id && overlap(t, o))) { it.x = t.x; it.y = t.y; saveLayout(); }
        else toast("Orası dolu");
        renderHome();
      };
      node.addEventListener("pointermove", move); node.addEventListener("pointerup", up);
      node.addEventListener("pointercancel", up);
    });
  }
  function attachResize(handle, node, it) {
    handle.addEventListener("pointerdown", (e) => {
      e.stopPropagation(); handle.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, ow = it.w * PITCH - GAP, oh = it.h * PITCH - GAP;
      const move = (ev) => { node.style.width = Math.max(PITCH - GAP, ow + ev.clientX - sx) + "px";
                             node.style.height = Math.max(PITCH - GAP, oh + ev.clientY - sy) + "px"; };
      const up = (ev) => {
        handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
        const cols = colsNow();
        const t = { id: it.id, x: it.x, y: it.y,
          w: Math.min(Math.max(1, Math.round((ow + GAP + ev.clientX - sx) / PITCH)), Math.max(1, cols - it.x)),
          h: Math.max(1, Math.round((oh + GAP + ev.clientY - sy) / PITCH)) };
        if (!layout.some((o) => o.id !== it.id && overlap(t, o))) { it.w = t.w; it.h = t.h; saveLayout(); }
        else toast("Orası dolu");
        renderHome();
      };
      handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });
  }

  function addWidget(w) {
    const p = findFree(layout, w.w, w.h, colsNow());
    layout.push(Object.assign({ id: uid(), x: p.x, y: p.y }, w));
    saveLayout(); closePicker(); renderHome();
  }

  // ---------- ekleme penceresi ----------
  let picker = null;
  function closePicker() { if (picker) { picker.remove(); picker = null; } }
  function openPicker() {
    closePicker();
    picker = el("div", "modal");
    const box = el("div", "mbox"), top = el("div", "mtop");
    const inp = el("input"); inp.type = "search"; inp.placeholder = "Cihaz ara";
    const cl = el("button", "btn", "Kapat"); cl.addEventListener("click", closePicker);
    top.append(inp, cl);
    const list = el("div", "mlist");
    box.append(top, list); picker.append(box); document.body.append(picker);
    picker.addEventListener("click", (e) => { if (e.target === picker) closePicker(); });

    const row = (iconSvg, title, sub, right, fn) => {
      const r = el("div", "mrow"), ic = el("div", "ico"); ic.innerHTML = iconSvg;
      const n = el("div", "n"); n.append(el("b", "", title), el("span", "", sub));
      r.append(ic, n); if (right) r.append(el("div", "s", right));
      r.addEventListener("click", fn); list.append(r);
    };
    const render = () => {
      list.replaceChildren();
      const q = inp.value.trim().toLowerCase();
      const match = (t) => !q || t.toLowerCase().includes(q);
      if (match("hava durumu hava")) row(svg(P.cloudsun), "Hava durumu", "Open-Meteo, anahtar gerekmez", "Ürün", () => addWidget({ type: "weather", name: "", w: 3, h: 2 }));
      if (match("harita google map")) row(svg(P.pin), "Harita", "Google Harita, dokununca tam ekran", "Ürün", () => addWidget({ type: "map", name: "Harita", query: "", zoom: 14, w: 4, h: 3 }));
      Object.keys(states).sort().filter((id) => (domain(id) === "media_player" || domain(id) === "remote") && match("tv kumanda televizyon " + id + " " + fname(states[id]))).forEach((id) =>
        row(svg(P.tv), "TV kumandası: " + fname(states[id]), id, "Ürün", () => addWidget({ type: "entity", entity: id, name: "", w: 2, h: 1 })));
      const haCams = Object.keys(states).some((id) => domain(id) === "camera");
      (haCams ? [] : cfg.cameras).forEach((c) => { if (match("kamera " + c.name))
        row(svg(P.camera), "Kamera: " + c.name, "go2rtc, " + c.src, "", () => addWidget({ type: "camera", src: c.src, name: c.name, w: 4, h: 3 })); });
      Object.keys(states).filter((id) => domain(id) === "vacuum" && match("robot " + fname(states[id]) + id)).forEach((id) =>
        row(svg(P.vacuum), "Robot kartı: " + fname(states[id]), id, "", () => addWidget({ type: "robot", entity: id, name: "", w: 3, h: 2 })));
      Object.keys(states).sort().filter((id) => match(id + " " + fname(states[id]))).slice(0, q ? 400 : 150).forEach((id) =>
        row(iconFor(id), fname(states[id]), id, domain(id) === "camera" ? "Görüntü" : stateText(states[id]),
          () => addWidget(domain(id) === "camera" ? { type: "entity", entity: id, name: "", w: 4, h: 3 } : { type: "entity", entity: id, name: "", w: 2, h: 1 })));
    };
    inp.addEventListener("input", render); render();
  }

  // ---------- kat planı ----------
  function renderPlan() {
    const root = $("#tab-plan"); if (root.dataset.built) return; root.dataset.built = "1";
    const e = el("div", "empty");
    e.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 220 130" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h208v118H6zM6 66h86M92 6v118M92 90h122M150 90v34"/></svg>');
    e.append(el("h2", "", "Kat planı yakında"),
      el("p", "", "Oda dosyaları (GLB) eklenince evin 3 boyutlu modeli burada görünecek. Odaya dokununca o odanın cihazları açılacak, robotun konumu planın üstünde canlı çıkacak."));
    root.append(e);
  }

  // ---------- robot sekmesi ----------
  function renderRobot(root, id) {
    root.replaceChildren();
    const s = id && states[id];
    if (!s) {
      const h = el("div", "hint");
      h.append("Home Assistant'ta robot süpürge bulunamadı. Roborock'u Ayarlar, Cihazlar ve hizmetler bölümünden ekledikten sonra burada kendiliğinden görünür.");
      root.append(h); return;
    }
    const wrap = el("div", "robot");
    wrap.append(el("div", "big", stateText(s)), el("div", "meta", fname(s) + (s.attributes && s.attributes.battery_level !== undefined ? ", pil %" + s.attributes.battery_level : "")));
    const row = el("div", "btnrow");
    const act = (label, svc, cls) => {
      const b = el("button", "btn " + (cls || ""), label);
      b.addEventListener("click", () => ha.callService("vacuum", svc, {}, { entity_id: id })
        .then(() => toast(label)).catch(() => toast("Komut gönderilemedi")));
      row.append(b);
    };
    act("Başlat", "start", "primary"); act("Duraklat", "pause"); act("Şarja dön", "return_to_base"); act("Beni bul", "locate");
    wrap.append(row); root.append(wrap);
  }

  // ---------- ürün sekmesi (ayrıntı) ----------
  const api = {
    cfg, ha, el, svg, toast, stateText, saveLayout, states: () => states,
    onCleanup: (k, f) => camStops[k].push(f)
  };
  function renderDetailTab() {
    const root = $("#tab-detail");
    runStops("tab"); root.replaceChildren(); root._tvRefresh = null;
    const it = findItem(currentTab);
    if (!it) { if (layout) setTab("home"); else root.append(el("div", "hint", "Düzen yükleniyor")); return; }
    const kind = detailKind(it);
    if (kind === "weather" || kind === "map" || kind === "tv") window.Modules[kind].detail(root, it, api);
    else if (kind === "robot") renderRobot(root, it.entity);
    else if (kind === "camera") {
      const box = el("div", "camfull");
      if (it.type === "camera") {
        const f = document.createElement("iframe");
        f.src = cfg.go2rtcUrl + "/stream.html?src=" + encodeURIComponent(it.src) + "&mode=webrtc,mse";
        f.allow = "autoplay; fullscreen"; box.append(f);
      } else box.append(makeHaCam(it.entity, itemName(it), "tab"));
      root.append(box);
    }
  }

  // ---------- tüm cihazlar ----------
  let filterDomain = "";
  function renderAll() {
    if (currentTab === "home") renderHome();
    else if (currentTab === "plan") renderPlan();
    else if (currentTab.startsWith("w_")) renderDetailTab();
    else if (currentTab === "faces") { if (window.Faces) window.Faces.renderTab($("#tab-faces")); }
    else if (currentTab === "all") renderList();
    if (currentTab !== "faces" && window.Faces) window.Faces.leaveTab();
    if (currentTab !== "home") { runStops("home"); $("#tab-home").replaceChildren(); }
    if (!currentTab.startsWith("w_")) { runStops("tab"); $("#tab-detail").replaceChildren(); }
    syncTabs();
  }
  function renderChanged(id) {
    if (currentTab === "home") Object.values(widgetRefs).forEach((w) => { if (w.entity === id) w.update(); });
    else if (currentTab.startsWith("w_")) {
      const it = findItem(currentTab); if (!it) return;
      const kind = detailKind(it);
      if (kind === "robot" && id === it.entity) renderRobot($("#tab-detail"), it.entity);
      else if (kind === "tv") window.Modules.tv.update($("#tab-detail"), it, api, id);
    }
    else if (currentTab === "all") updateRow(id);
  }
  function renderList() {
    const q = $("#search").value.trim().toLowerCase();
    const root = $("#all-list"); root.replaceChildren();
    const doms = {};
    Object.keys(states).forEach((id) => { const d = domain(id); doms[d] = (doms[d] || 0) + 1; });
    const fb = $("#filters"); fb.replaceChildren();
    const chip = (d, label) => { const b = el("button", filterDomain === d ? "active" : "", label);
      b.addEventListener("click", () => { filterDomain = d; renderList(); }); fb.append(b); };
    chip("", "Tümü " + Object.keys(states).length);
    Object.keys(doms).sort().forEach((d) => chip(d, (NAMES[d] || d) + " " + doms[d]));
    const ids = Object.keys(states).filter((id) => (!filterDomain || domain(id) === filterDomain) &&
      (!q || id.toLowerCase().includes(q) || fname(states[id]).toLowerCase().includes(q))).sort();
    let last = "", count = 0, head = null;
    ids.forEach((id) => {
      const d = domain(id);
      if (d !== last) { if (head) head.append(el("span", "", String(count))); head = el("div", "group", NAMES[d] || d); root.append(head); last = d; count = 0; }
      count++; root.append(makeRow(id));
    });
    if (head) head.append(el("span", "", String(count)));
    if (!ids.length) root.append(el("div", "hint", "Eşleşen cihaz yok."));
  }
  function makeRow(id) {
    const s = states[id];
    const r = el("div", "row"); r.dataset.entity = id;
    const ic = el("div", "ico"); ic.innerHTML = iconFor(id);
    const n = el("div", "n"); n.append(el("b", "", fname(s)), el("span", "", id));
    const st = el("div", "s" + (isOn(s) ? " on" : ""), stateText(s));
    r.append(ic, n, st);
    if (controllable(id)) {
      const b = el("button", "", "Değiştir"); b.addEventListener("click", () => toggle(id)); r.append(b);
    }
    return r;
  }
  function updateRow(id) {
    const old = $('#all-list .row[data-entity="' + CSS.escape(id) + '"]');
    if (old && states[id]) old.replaceWith(makeRow(id));
  }
  $("#search").addEventListener("input", renderList);

  renderAll();
  window.PanelAPI = { ha, toast, cfg };
})();
