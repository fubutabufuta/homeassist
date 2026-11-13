// Yüz tanıma ve karşılama: kamera görüntüsü tarayıcıda işlenir, hiçbir yere gönderilmez.
// Kayıtlı kişilerin yüz verisi (sayı dizisi, fotoğraf değil) yalnızca bu Home Assistant'ta durur.
(() => {
  const DEF = { enabled: false, greetUnknown: false, speak: false, threshold: 0.5, cooldownMin: 5, intervalMs: 800 };
  const cfg = Object.assign({}, DEF, (window.PANEL_CONFIG && window.PANEL_CONFIG.faces) || {});
  const MODELS = new URL("faces/models", location.href).href;
  let api = null;                      // { ha, el, toast }
  let people = [];                     // [{ name, descriptors: [[128 sayı], ...] }]
  let matcher = null, modelsP = null;
  let stream = null, video = null, users = 0;
  let timer = null, busy = false, running = false;
  const seen = {}, last = {};
  let overlay = null, hideT = null;
  let form = null;                     // kişi ekleme formu durumu

  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  // ---------- kütüphane ve modeller (gerektiğinde yüklenir) ----------
  function loadLib() {
    if (window.faceapi) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = "faces/face-api.js";
      s.onload = res; s.onerror = () => rej(new Error("face-api.js yüklenemedi")); document.head.append(s);
    });
  }
  function ensureModels() {
    if (!modelsP) modelsP = (async () => {
      await loadLib();
      const f = window.faceapi;
      await Promise.all([f.nets.tinyFaceDetector.loadFromUri(MODELS), f.nets.faceLandmark68TinyNet.loadFromUri(MODELS),
        f.nets.faceRecognitionNet.loadFromUri(MODELS)]);
    })();
    return modelsP;
  }

  // ---------- kamera (sayaçlı: tanıma ve kayıt aynı akışı paylaşır) ----------
  async function acquireCam() {
    if (!stream) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
        throw new Error("Kamera yalnızca localhost ya da https adresinde açılır");
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      video = document.createElement("video"); video.muted = true; video.playsInline = true; video.srcObject = stream;
      await video.play();
    }
    users++; return video;
  }
  function releaseCam() {
    users = Math.max(0, users - 1);
    if (users === 0 && stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; video = null; }
  }

  // ---------- kayıtlı kişiler ----------
  async function loadPeople() {
    let v = null;
    try { const r = await api.ha.send({ type: "frontend/get_user_data", key: "panel_faces" }); v = r && r.value; } catch (e) {}
    if (!v) { try { v = JSON.parse(localStorage.getItem("panel_faces")); } catch (e) {} }
    people = Array.isArray(v) ? v : [];
  }
  function savePeople() {
    try { localStorage.setItem("panel_faces", JSON.stringify(people)); } catch (e) {}
    api.ha.send({ type: "frontend/set_user_data", key: "panel_faces", value: people }).catch(() => {});
    buildMatcher();
  }
  function buildMatcher() {
    const f = window.faceapi;
    if (!f || !people.length) { matcher = null; return; }
    matcher = new f.FaceMatcher(people.map((p) => new f.LabeledFaceDescriptors(p.name, p.descriptors.map((d) => new Float32Array(d)))), cfg.threshold);
  }
  const round4 = (arr) => Array.from(arr, (x) => Math.round(x * 10000) / 10000);

  // ---------- karşılama ekranı ----------
  function showGreeting(text) {
    if (!overlay) {
      overlay = el("div", "greeting"); overlay.id = "greeting"; overlay.append(el("div", "gtext"));
      overlay.addEventListener("click", hideGreeting); document.body.append(overlay);
    }
    $(".gtext", overlay).textContent = text;
    overlay.classList.remove("show"); void overlay.offsetWidth; overlay.classList.add("show");
    clearTimeout(hideT); hideT = setTimeout(hideGreeting, 6000);
  }
  function hideGreeting() { if (overlay) overlay.classList.remove("show"); }

  function greet(label) {
    const text = label === "unknown" ? "Merhaba" : "Merhaba " + label;
    showGreeting(text);
    if (cfg.speak && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text); u.lang = "tr-TR"; window.speechSynthesis.speak(u);
    }
    // Home Assistant otomasyonları bu olayı dinleyebilir (ör. gelince ışık aç)
    if (label !== "unknown") api.ha.send({ type: "fire_event", event_type: "panel_face_seen", event_data: { name: label } }, false).catch(() => {});
  }

  // ---------- tanıma döngüsü ----------
  function handle(labels) {
    const now = Date.now(), cur = new Set(labels);
    Object.keys(seen).forEach((k) => { if (!cur.has(k)) seen[k] = 0; });
    cur.forEach((l) => {
      seen[l] = (seen[l] || 0) + 1;
      if (seen[l] < 2) return;                                   // art arda 2 karede görülmeli
      if (l === "unknown" && !cfg.greetUnknown) return;
      if (now - (last[l] || 0) < cfg.cooldownMin * 60000) return; // aynı kişiyi tekrar tekrar karşılama
      last[l] = now; greet(l);
    });
  }
  async function tick() {
    if (busy || document.hidden || !video || video.readyState < 2) return;
    busy = true;
    try {
      const f = window.faceapi;
      const res = await f.detectAllFaces(video, new f.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true).withFaceDescriptors();
      handle(res.map((r) => matcher ? matcher.findBestMatch(r.descriptor).label : "unknown"));
    } catch (e) {} finally { busy = false; }
  }
  async function start() {
    if (running || !cfg.enabled) return;
    if (!people.length && !cfg.greetUnknown) return;             // tanıyacak kimse yok
    running = true;
    try {
      await ensureModels(); buildMatcher(); await acquireCam();
      timer = setInterval(tick, cfg.intervalMs); setChip(true);
    } catch (e) { running = false; setChip(false); api.toast("Yüz tanıma başlamadı: " + (e.message || e.name)); }
  }
  function stop() {
    if (!running) return; running = false; clearInterval(timer); timer = null; releaseCam(); setChip(false);
  }
  function setChip(on) { const c = $("#camchip"); if (c) { c.hidden = !on; c.classList.toggle("live", on); } }

  // ---------- Yüzler sekmesi ----------
  function renderTab(root) {
    root.replaceChildren();
    const wrap = el("div", "faces");
    wrap.append(el("h2", "", "Tanınacak kişiler"),
      el("p", "hint", "Kişi gelince panel ekranda adıyla selam verir. Yüz verisi fotoğraf değil, sayı dizisi olarak kaydedilir ve yalnızca bu Home Assistant'ta durur. Kamera görüntüsü hiçbir yere gönderilmez."));
    if (!cfg.enabled) {
      const h = el("p", "hint"); h.append("Tanıma şu an kapalı. ", el("code", "", "config.js"), " içinde ", el("code", "", "faces: { enabled: true }"), " yaz, sayfayı yenile.");
      wrap.append(h);
    }
    const list = el("div", "plist");
    if (!people.length) list.append(el("p", "hint", "Henüz kimse kayıtlı değil."));
    people.forEach((p, i) => {
      const r = el("div", "row");
      const n = el("div", "n"); n.append(el("b", "", p.name), el("span", "", p.descriptors.length + " fotoğraf"));
      const b = el("button", "", "Sil");
      b.addEventListener("click", () => {
        if (b.dataset.sure) { people.splice(i, 1); savePeople(); if (!people.length) stop(); renderTab(root); return; }
        b.dataset.sure = "1"; b.textContent = "Emin misin?"; setTimeout(() => { b.dataset.sure = ""; b.textContent = "Sil"; }, 3000);
      });
      r.append(n, b); list.append(r);
    });
    wrap.append(list);
    const add = el("button", "btn solid", "Kişi ekle");
    add.addEventListener("click", () => openForm(root));
    wrap.append(add);
    root.append(wrap);
    if (form) openForm(root, true);
  }

  async function openForm(root, again) {
    const wrap = $(".faces", root); if (!wrap) return;
    const old = $(".enroll", wrap); if (old) old.remove();
    const box = el("div", "enroll");
    const nameIn = el("input"); nameIn.type = "text"; nameIn.placeholder = "Kişinin adı"; nameIn.maxLength = 30;
    if (form) nameIn.value = form.name;
    const pv = document.createElement("video"); pv.className = "preview"; pv.muted = true; pv.playsInline = true;
    const msg = el("p", "hint", "Kamera açılıyor");
    const shot = el("button", "btn primary", "Fotoğraf ekle"); shot.disabled = true;
    const save = el("button", "btn solid", "Kaydet"); save.disabled = true;
    const cancel = el("button", "btn", "Vazgeç");
    const row = el("div", "btnrow"); row.append(shot, save, cancel);
    box.append(nameIn, pv, msg, row); wrap.append(box);
    if (!again) form = { name: "", samples: [] };
    const upd = () => { msg.textContent = form.samples.length + " fotoğraf eklendi. En az 3 gerekli, farklı açılardan 5 ideal; başını biraz çevirerek ekle.";
      save.disabled = !(form.samples.length >= 3 && nameIn.value.trim()); };
    nameIn.addEventListener("input", () => { form.name = nameIn.value; upd(); });
    const close = () => { form = null; if (pv.srcObject) { pv.srcObject = null; releaseCam(); } renderTab(root); };
    cancel.addEventListener("click", close);
    try {
      await ensureModels(); await acquireCam(); pv.srcObject = stream; await pv.play(); shot.disabled = false; upd();
    } catch (e) { msg.textContent = "Kamera açılamadı: " + (e.message || e.name) + ". Tarayıcıda kamera iznini ver."; return; }
    shot.addEventListener("click", async () => {
      shot.disabled = true;
      try {
        const f = window.faceapi;
        const dets = await f.detectAllFaces(video, new f.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withFaceLandmarks(true).withFaceDescriptors();
        if (dets.length === 0) api.toast("Yüz bulunamadı. Kameraya biraz yaklaş, ışığa dön.");
        else if (dets.length > 1) api.toast("Kamerada birden fazla yüz var. Yalnız kişi görünsün.");
        else { form.samples.push(round4(dets[0].descriptor)); upd(); }
      } catch (e) { api.toast("Fotoğraf alınamadı"); }
      shot.disabled = false;
    });
    save.addEventListener("click", () => {
      const name = nameIn.value.trim();
      if (name.toLowerCase() === "unknown") { api.toast("Bu ad kullanılamaz"); return; }
      const ex = people.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (ex) ex.descriptors.push(...form.samples); else people.push({ name, descriptors: form.samples });
      savePeople(); api.toast(name + " kaydedildi");
      pv.srcObject = null; releaseCam(); form = null; renderTab(root);
      stop(); start();
    });
  }
  function leaveTab() { if (form) { form = null; /* kamera akışı form kapanınca bırakılır */ releaseFormCam(); } }
  function releaseFormCam() { const v = $("#tab-faces .preview"); if (v && v.srcObject) { v.srcObject = null; releaseCam(); } }

  // ---------- başlangıç ----------
  function boot() {
    api = window.PanelAPI; if (!api) return;
    const t = setInterval(async () => {
      const h = api.ha;
      if (!(h && h.ws && h.ws.readyState === 1 && Object.keys(h.states).length)) return;
      clearInterval(t);
      await loadPeople();
      if (cfg.enabled && (people.length || cfg.greetUnknown)) { try { await ensureModels(); buildMatcher(); } catch (e) {} start(); }
    }, 500);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { Object.keys(seen).forEach((k) => (seen[k] = 0)); } });
  window.Faces = { renderTab, leaveTab };
  boot();
})();
