(() => {
  const cfg = window.PANEL_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const TOGGLE = ["light", "switch", "input_boolean", "fan"];
  const ON_STATES = ["on", "playing", "open", "heat", "cool", "cleaning", "home"];
  let states = {};
  let currentTab = "home";

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
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 1800);
  };
  const stateText = (s) => {
    const u = s.attributes && s.attributes.unit_of_measurement;
    const map = { on: "Açık", off: "Kapalı", unavailable: "Ulaşılamıyor", unknown: "Bilinmiyor",
      playing: "Oynatıyor", paused: "Duraklatıldı", idle: "Boşta", open: "Açık", closed: "Kapalı",
      cleaning: "Temizliyor", docked: "İstasyonda", returning: "Dönüyor", home: "Evde", not_home: "Dışarıda" };
    return (map[s.state] || s.state) + (u ? " " + u : "");
  };

  // ---------- saat ----------
  function tick() {
    const d = new Date();
    $("#clock").textContent = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    $("#date").textContent = d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  }
  tick(); setInterval(tick, 10000);

  // ---------- bağlantı ----------
  const ha = new HAClient({
    url: cfg.haUrl, token: cfg.token,
    onStatus: (st) => {
      const b = $("#status");
      const t = { baglaniyor: ["bağlanıyor…", ""], bagli: ["bağlı", "ok"], kopuk: ["bağlantı koptu", "bad"],
        jeton_hatali: ["jeton hatalı", "bad"] }[st] || [st, ""];
      b.textContent = t[0]; b.className = "badge " + t[1];
    },
    onState: (all, changed) => { states = all; if (changed) renderChanged(changed); else { renderAll(); loadLayout(); } }
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
    p.catch((e) => toast("Hata: " + (e && e.message || "komut gönderilemedi")));
  }
  const controllable = (id) => TOGGLE.concat(["media_player", "cover", "scene", "script", "button"]).includes(domain(id));

  // ---------- sekmeler ----------
  document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab));
    currentTab = b.dataset.tab;
    renderAll();
  }));

  // ---------- ana sayfa: sürükle-bırak tuval ----------
  const PITCH = 120, GAP = 12;
  let layout = null, editMode = false, layoutLoaded = false;
  const widgetRefs = {};            // item.id -> { update() }
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
    if (currentTab === "home") renderHome();
  }
  function saveLayout() {
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
    const root = $("#tab-home"); root.replaceChildren();
    Object.keys(widgetRefs).forEach((k) => delete widgetRefs[k]);
    if (!layout) { root.append(el("div", "hint", "Düzen yükleniyor…")); return; }

    const bar = el("div", "toolbar");
    const eb = el("button", "btn" + (editMode ? " primary" : ""), editMode ? "Bitti" : "Düzenle");
    eb.addEventListener("click", () => { editMode = !editMode; renderHome(); });
    bar.append(eb);
    if (editMode) {
      const ab = el("button", "btn", "+ Ekle"); ab.addEventListener("click", openPicker); bar.append(ab);
      bar.append(el("span", "tip", "Kutuyu sürükle · köşeden büyüt · ✕ ile kaldır"));
    }
    root.append(bar);

    if (!layout.length) {
      root.append(el("div", "hint", editMode ? "Boş tuval. + Ekle ile cihaz, kamera veya robot ekle."
        : "Ana sayfa boş. Sağ üstteki Düzenle'ye basıp + Ekle ile istediğin cihazları yerleştir."));
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

    if (it.type === "entity") {
      const nm = el("div", "name"), stt = el("div", "state");
      body.append(nm, stt);
      const upd = () => {
        const s = states[it.entity];
        nm.textContent = it.name || (s ? fname(s) : it.entity);
        stt.textContent = s ? stateText(s) : "bulunamadı";
        node.classList.toggle("on", !!s && isOn(s));
        node.classList.toggle("unavail", !s || s.state === "unavailable");
      };
      upd(); widgetRefs[it.id] = { entity: it.entity, update: upd };
      node.addEventListener("click", () => { if (!editMode && controllable(it.entity)) toggle(it.entity); });
    } else if (it.type === "camera") {
      const f = document.createElement("iframe");
      f.src = cfg.go2rtcUrl + "/stream.html?src=" + encodeURIComponent(it.src) + "&mode=webrtc,mse";
      f.allow = "autoplay; fullscreen";
      body.append(f, el("div", "label", it.name || it.src));
      node.classList.add("nopad");
    } else if (it.type === "robot") {
      const title = el("div", "name"), stt = el("div", "state"), row = el("div", "btnrow small");
      body.append(title, stt, row);
      const act = (label, svc, cls) => {
        const b = el("button", "btn " + (cls || ""), label);
        b.addEventListener("click", (e) => { e.stopPropagation(); if (editMode) return;
          ha.callService("vacuum", svc, {}, { entity_id: it.entity }).then(() => toast(label)).catch(() => toast("Hata")); });
        row.append(b);
      };
      act("Başlat", "start", "primary"); act("Duraklat", "pause"); act("Şarja dön", "return_to_base");
      const upd = () => {
        const s = states[it.entity];
        title.textContent = it.name || (s ? fname(s) : it.entity);
        const bat = s && s.attributes && s.attributes.battery_level;
        stt.textContent = s ? stateText(s) + (bat !== undefined ? " · %" + bat : "") : "bulunamadı";
        node.classList.toggle("on", !!s && s.state === "cleaning");
      };
      upd(); widgetRefs[it.id] = { entity: it.entity, update: upd };
    }

    if (editMode) {
      const x = el("button", "xbtn", "✕");
      x.addEventListener("pointerdown", (e) => e.stopPropagation());
      x.addEventListener("click", (e) => { e.stopPropagation();
        layout = layout.filter((o) => o.id !== it.id); saveLayout(); renderHome(); });
      const ren = el("button", "rbtn", "✎");
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
    const box = el("div", "mbox");
    const top = el("div", "mtop");
    const inp = el("input"); inp.type = "search"; inp.placeholder = "Cihaz ara…";
    const cl = el("button", "btn", "Kapat"); cl.addEventListener("click", closePicker);
    top.append(inp, cl);
    const list = el("div", "mlist");
    box.append(top, list); picker.append(box); document.body.append(picker);

    const render = () => {
      list.replaceChildren();
      const q = inp.value.trim().toLowerCase();
      const special = [];
      cfg.cameras.forEach((c) => special.push({ label: "Kamera: " + c.name, sub: "go2rtc · " + c.src,
        add: () => addWidget({ type: "camera", src: c.src, name: c.name, w: 4, h: 3 }) }));
      Object.keys(states).filter((id) => domain(id) === "vacuum").forEach((id) =>
        special.push({ label: "Robot kartı: " + fname(states[id]), sub: id,
          add: () => addWidget({ type: "robot", entity: id, name: "", w: 3, h: 2 }) }));
      special.filter((s) => !q || s.label.toLowerCase().includes(q)).forEach((s) => {
        const r = el("div", "mrow"); const n = el("div", "n"); n.append(el("b", "", s.label), el("span", "", s.sub));
        r.append(n); r.addEventListener("click", s.add); list.append(r); });
      Object.keys(states).sort().filter((id) => !q || id.toLowerCase().includes(q) ||
        fname(states[id]).toLowerCase().includes(q)).slice(0, 150).forEach((id) => {
        const r = el("div", "mrow"); const n = el("div", "n");
        n.append(el("b", "", fname(states[id])), el("span", "", id));
        r.append(n, el("div", "s", stateText(states[id])));
        r.addEventListener("click", () => addWidget({ type: "entity", entity: id, name: "", w: 2, h: 1 }));
        list.append(r); });
    };
    inp.addEventListener("input", render); render();
  }

  // ---------- kameralar ----------
  function renderCams() {
    const root = $("#tab-cams");
    if (currentTab !== "cams") { root.replaceChildren(); return; } // sekmeden çıkınca akışı kapat
    if (root.dataset.built === "1") return;
    root.dataset.built = "1";
    const g = el("div", "camgrid");
    cfg.cameras.forEach((c) => {
      const box = el("div", "cam");
      const f = document.createElement("iframe");
      f.src = cfg.go2rtcUrl + "/stream.html?src=" + encodeURIComponent(c.src) + "&mode=webrtc,mse";
      f.allow = "autoplay; fullscreen";
      box.append(f, el("div", "label", c.name));
      g.append(box);
    });
    root.append(g);
  }

  // ---------- kat planı ----------
  function renderPlan() {
    const root = $("#tab-plan"); if (root.dataset.built) return; root.dataset.built = "1";
    const h = el("div", "hint");
    h.append(el("b", "", "Kat planı 3D modülü sonraki aşamada."),
      document.createElement("br"),
      "7 oda GLB dosyası birleştirilince burada ev modeli görünecek: odaya dokununca o odanın ",
      "cihazları açılacak, robot süpürgenin konumu planın üstünde canlı çıkacak.");
    root.append(h);
  }

  // ---------- robot ----------
  function renderRobot() {
    const root = $("#tab-robot"); root.replaceChildren();
    const id = cfg.vacuum;
    const s = id && states[id];
    if (!s) {
      const h = el("div", "hint");
      h.append("Robot süpürge ayarlanmadı. HA'ya Roborock entegrasyonunu ekledikten sonra ",
        el("b", "", "Tüm Cihazlar"), " sekmesinde ", el("code", "", "vacuum."), " ile başlayan adı bul, ",
        el("code", "", "config.js"), " içindeki ", el("code", "", "vacuum"), " alanına yaz.");
      root.append(h); return;
    }
    const wrap = el("div", "robot");
    wrap.append(el("div", "big", fname(s) + " — " + stateText(s)));
    const bat = s.attributes && s.attributes.battery_level;
    if (bat !== undefined) wrap.append(el("div", "state", "Pil: %" + bat));
    const row = el("div", "btnrow");
    const act = (label, svc, cls) => {
      const b = el("button", "btn " + (cls || ""), label);
      b.addEventListener("click", () => ha.callService("vacuum", svc, {}, { entity_id: id })
        .then(() => toast(label)).catch((e) => toast("Hata: " + (e && e.message || ""))));
      row.append(b);
    };
    act("Başlat", "start", "primary"); act("Duraklat", "pause");
    act("Şarja dön", "return_to_base"); act("Beni bul", "locate");
    wrap.append(row); root.append(wrap);
  }

  // ---------- tüm cihazlar ----------
  function renderAll() {
    if (currentTab === "home") renderHome();
    else if (currentTab === "cams") renderCams();
    else if (currentTab === "plan") renderPlan();
    else if (currentTab === "robot") renderRobot();
    else if (currentTab === "all") renderList();
    if (currentTab !== "cams") { const c = $("#tab-cams"); c.dataset.built = ""; c.replaceChildren(); }
  }
  function renderChanged(id) {
    if (currentTab === "home") Object.values(widgetRefs).forEach((w) => { if (w.entity === id) w.update(); });
    else if (currentTab === "robot" && id === cfg.vacuum) renderRobot();
    else if (currentTab === "all") updateRow(id);
  }
  function renderList() {
    const q = $("#search").value.trim().toLowerCase();
    const root = $("#all-list"); root.replaceChildren();
    const ids = Object.keys(states).filter((id) => !q || id.toLowerCase().includes(q) ||
      fname(states[id]).toLowerCase().includes(q)).sort();
    let last = "";
    ids.forEach((id) => {
      const d = domain(id);
      if (d !== last) { root.append(el("div", "group", d)); last = d; }
      root.append(makeRow(id));
    });
    if (!ids.length) root.append(el("div", "hint", "Eşleşen cihaz yok."));
  }
  function makeRow(id) {
    const s = states[id];
    const r = el("div", "row"); r.dataset.entity = id;
    const n = el("div", "n"); n.append(el("b", "", fname(s)), el("span", "", id));
    const st = el("div", "s" + (isOn(s) ? " on" : ""), stateText(s));
    r.append(n, st);
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
})();
