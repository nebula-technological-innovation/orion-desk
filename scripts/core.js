const KEY = "orion.v2";
const PRICE_IDS = { BTC: "bitcoin", LTC: "litecoin", DOGE: "dogecoin", KAS: "kaspa", USDT: "tether" };
const WORDS = ["amber","anchor","apex","arc","ash","atlas","aurora","axis","basalt","beacon","birch","bloom","bolt","brine","bronze","brook","cinder","cipher","cliff","comet","copper","crest","crown","crux","delta","drift","dusk","ember","epoch","fault","field","flint","forge","frost","garnet","glen","grain","grove","harbor","haven","hearth","helix","hollow","honor","horizon","iron","ivory","jade","keel","lance","lumen","magma","maple","mesa","mirror","mist","north","nova","oak","onyx","orbit","ore","osprey","oxide","pearl","pine","plume","prism","quartz","ridge","rift","ripple","river","sable","sage","scale","shard","sierra","signal","slate","solstice","spark","spire","stone","storm","summit","tide","timber","torch","vale","vault","vein","velvet","vertex","vessel","violet","volt","wake","walnut","wave","willow","wind","winter","wisp","wolf","yarn","yield","zephyr","zinc","anvil","kepler","lodestar"];
const COINS = {
  BTC: { name: "Bitcoin", algo: "SHA-256", port: 3333, scheme: "FPPS", min: 0.0001, unit: "TH/s", merge: ["FB"] },
  LTC: { name: "Litecoin", algo: "Scrypt", port: 4333, scheme: "FPPS", min: 0.01, unit: "GH/s", merge: ["DOGE", "BELLS", "LKY"] },
  DOGE: { name: "Dogecoin", algo: "Scrypt merge", port: 4333, scheme: "FPPS", min: 10, unit: "GH/s", merge: [] },
  KAS: { name: "Kaspa", algo: "kHeavyHash", port: 5333, scheme: "PPLNS", min: 10, unit: "GH/s", merge: [] },
  USDT: { name: "Tether", algo: "—", port: null, scheme: "—", min: 1, unit: "—", merge: [] }
};
const FALLBACK = { BTC: 78980, LTC: 55.2, DOGE: 0.0902, KAS: 0.0362, USDT: 1 };
let prices = { ...FALLBACK };
let changes = { BTC: -1.5, LTC: 0.8, DOGE: -0.3, KAS: 12.8, USDT: 0 };
let netEh = 930.7;
let priceAsOf = "cached";
function rand(n) { const a = new Uint32Array(n); crypto.getRandomValues(a); return [...a]; }
function generateSeed() { return rand(12).map((n) => WORDS[n % WORDS.length]); }
function mockAddress(coin, seed) {
  const src = (seed || ["orion"]).join("-") + coin;
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) h = Math.imul(h ^ src.charCodeAt(i), 16777619);
  const hex = Math.abs(h).toString(16).padStart(8, "0") + "c56a32e0a25a";
  if (coin === "BTC") return "bc1q" + hex.slice(0, 28);
  if (coin === "LTC") return "ltc1q" + hex.slice(0, 26);
  if (coin === "DOGE") return "D" + hex.slice(0, 33).toUpperCase();
  if (coin === "KAS") return "kaspa:" + hex + "vault";
  return "0x" + hex + "a0";
}
function defaultState() {
  return {
    version: 2, vaultOn: true, seed: generateSeed(), reveal: false, convertTo: "BTC", autoConvert: true, powerKw: 3.4, kwh: 0.07,
    workers: [
      { id: "s21-01", coin: "BTC", th: 245, reject: 0.4, temp: 66, status: "up" },
      { id: "s21-02", coin: "BTC", th: 243, reject: 0.6, temp: 69, status: "up" },
      { id: "l7-01", coin: "LTC", th: 9.5, reject: 1.1, temp: 61, status: "up" },
      { id: "ks5-01", coin: "KAS", th: 18.0, reject: 2.8, temp: 74, status: "warn" }
    ],
    balances: { BTC: 0.02184, LTC: 18.4, DOGE: 2410, KAS: 1340, USDT: 120.5 },
    pending: { BTC: 0.00042, LTC: 0.31, DOGE: 44, KAS: 19 },
    payouts: [
      { t: "2026-09-07 06:12", coin: "BTC", amt: 0.00118, via: "FPPS", note: "on-chain" },
      { t: "2026-09-07 06:12", coin: "DOGE", amt: 86, via: "merge", note: "auto → BTC" },
      { t: "2026-09-06 06:08", coin: "LTC", amt: 0.62, via: "FPPS", note: "auto → BTC" },
      { t: "2026-09-06 06:08", coin: "KAS", amt: 41.2, via: "PPLNS", note: "held" },
      { t: "2026-09-05 06:11", coin: "BTC", amt: 0.00109, via: "FPPS", note: "on-chain" }
    ],
    swaps: [], feeBps: 100, deskBps: 70, notes: ""
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { const s = defaultState(); save(s); return s; }
    const s = JSON.parse(raw);
    if (!s.version || s.version < 2) return defaultState();
    return s;
  } catch { return defaultState(); }
}
function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }
let state = load();
let quote = null;
let quoteLeft = 0;
let quoteTimer = null;
function route() { const h = location.hash.replace("#", "") || "/"; return h.startsWith("/") ? h : "/" + h; }
function setCurrent() {
  const r = route();
  document.querySelectorAll(".app-nav a.item").forEach((a) => {
    const target = a.getAttribute("data-route");
    if (target === r || (target !== "/" && r.startsWith(target))) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}
function fmt(n, d = 4) { return Number(n).toLocaleString(undefined, { maximumFractionDigits: d }); }
function usd(coin, amt) { return (amt * (prices[coin] || 0)).toLocaleString(undefined, { style: "currency", currency: "USD" }); }
function portfolio() { return Object.entries(state.balances).reduce((s, [c, a]) => s + a * (prices[c] || 0), 0); }
function btcTh() { return state.workers.filter((w) => w.coin === "BTC").reduce((s, w) => s + w.th, 0); }
function btcPerThDay() { return (3.125 * 144) / (netEh * 1e6); }
function dailyGrossUsd() {
  const btcDay = btcTh() * btcPerThDay() * prices.BTC;
  const ltcTh = state.workers.filter((w) => w.coin === "LTC").reduce((s, w) => s + w.th, 0);
  const kasTh = state.workers.filter((w) => w.coin === "KAS").reduce((s, w) => s + w.th, 0);
  return (btcDay + ltcTh * 0.0042 * prices.LTC + ltcTh * 18 * prices.DOGE + kasTh * 22 * prices.KAS) * (1 - state.feeBps / 10000);
}
function dailyPowerUsd() { return state.powerKw * 24 * state.kwh; }
function bars(n = 28) {
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(`<i style="height:${18 + ((i * 19 + 7) % 78)}%"></i>`);
  return `<div class="bars" aria-hidden="true">${parts.join("")}</div>`;
}
function banner() {
  return `<p class="banner"><strong>Prototype desk.</strong> Live marks from CoinGecko when the network allows. Shares, sends, and fills stay on this device. Orion is not a live pool or a licensed book.</p>`;
}
function chg(coin) {
  const n = changes[coin] || 0;
  return `<span class="${n >= 0 ? "up" : "dn"}">${n >= 0 ? "+" : ""}${n.toFixed(2)}%</span>`;
}
function workerTable() {
  return `<table class="dense"><thead><tr><th>Worker</th><th>Coin</th><th class="right">Rate</th><th class="right">Reject</th><th class="right">Temp</th><th>State</th></tr></thead><tbody>${state.workers.map((w) => `<tr><td>${w.id}</td><td>${w.coin}</td><td class="right">${fmt(w.th, 1)} ${COINS[w.coin].unit}</td><td class="right">${fmt(w.reject, 1)}%</td><td class="right">${w.temp}°</td><td><span class="pill ${w.status === "up" ? "ok" : "warn"}">${w.status}</span></td></tr>`).join("")}</tbody></table>`;
}
