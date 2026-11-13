// Küçük, bağımlılıksız Home Assistant WebSocket istemcisi
class HAClient {
  constructor({ url, token, onState, onStatus }) {
    this.base = (url && url.length) ? url.replace(/\/$/, "") : location.origin;
    this.token = token;
    this.onState = onState || (() => {});
    this.onStatus = onStatus || (() => {});
    this.states = {};
    this.id = 1;
    this.pending = new Map();
    this.retry = 0;
    this.connect();
  }
  connect() {
    const wsUrl = this.base.replace(/^http/, "ws") + "/api/websocket";
    this.onStatus("baglaniyor");
    let ws;
    try { ws = new WebSocket(wsUrl); } catch (e) { return this.reconnect(); }
    this.ws = ws;
    ws.onmessage = (ev) => this.handle(JSON.parse(ev.data));
    ws.onclose = () => { this.onStatus("kopuk"); this.reconnect(); };
    ws.onerror = () => {};
  }
  reconnect() {
    const wait = Math.min(15000, 1000 * Math.pow(2, this.retry++));
    setTimeout(() => this.connect(), wait);
  }
  send(msg, wantReply = true) {
    msg.id = this.id++;
    this.ws.send(JSON.stringify(msg));
    if (!wantReply) return Promise.resolve();
    return new Promise((res, rej) => this.pending.set(msg.id, { res, rej }));
  }
  async handle(m) {
    if (m.type === "auth_required") {
      this.ws.send(JSON.stringify({ type: "auth", access_token: this.token }));
    } else if (m.type === "auth_invalid") {
      this.onStatus("jeton_hatali");
      this.retry = 99; // sık sık denemesin
    } else if (m.type === "auth_ok") {
      this.retry = 0;
      this.onStatus("bagli");
      const r = await this.send({ type: "get_states" });
      this.states = {};
      r.forEach(s => { this.states[s.entity_id] = s; });
      this.onState(this.states, null);
      this.send({ type: "subscribe_events", event_type: "state_changed" }, false);
    } else if (m.type === "event" && m.event && m.event.event_type === "state_changed") {
      const d = m.event.data;
      if (d.new_state) this.states[d.entity_id] = d.new_state;
      else delete this.states[d.entity_id];
      this.onState(this.states, d.entity_id);
    } else if (m.type === "result") {
      const p = this.pending.get(m.id);
      if (p) { this.pending.delete(m.id); m.success ? p.res(m.result) : p.rej(m.error); }
    }
  }
  callService(domain, service, data = {}, target = {}) {
    return this.send({ type: "call_service", domain, service, service_data: data, target });
  }
}
window.HAClient = HAClient;
