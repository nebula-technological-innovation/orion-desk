function render() {
  document.getElementById("workspace").innerHTML = (views[route()] || viewOverview)();
  setCurrent();
  bind();
}
function toast(msg) {
  document.querySelectorAll(".toast").forEach((n) => n.remove());
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
function copyText(t) { navigator.clipboard?.writeText(t).then(() => toast("Copied")); }
function buildQuote(from, to, amt, destMode) {
  return { from, to, amt, out: amt * (prices[from] / prices[to]) * (1 - state.deskBps / 10000), destMode, deskBps: state.deskBps };
}
function startQuoteClock() {
  clearInterval(quoteTimer);
  quoteLeft = 20;
  quoteTimer = setInterval(() => {
    quoteLeft -= 1;
    if (quoteLeft <= 0) { quote = null; clearInterval(quoteTimer); if (route() === "/swap") render(); return; }
    const k = document.querySelector("#quote-box .kicker");
    if (k && quote) k.textContent = `Locked · ${quoteLeft}s · ${quote.deskBps} bps`;
  }, 1000);
}
function bind() {
  const root = document.getElementById("workspace");
  root.querySelector("#add-worker")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    state.workers.push({ id: String(f.get("id")).trim(), coin: String(f.get("coin")), th: Number(f.get("th")), reject: 0.5, temp: 64, status: "up" });
    save(state); render();
  });
  root.querySelector("#calc-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    state.powerKw = Number(f.get("kw")); state.kwh = Number(f.get("kwh"));
    save(state); render(); toast("Power inputs saved");
  });
  root.querySelector("#import-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const words = String(new FormData(e.target).get("words")).trim().split(/\s+/).filter(Boolean);
    if (words.length < 8) { toast("Need at least 8 words"); return; }
    state.seed = words; state.vaultOn = true; save(state); render();
  });
  root.querySelector("#send-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const coin = String(f.get("coin")); const amt = Number(f.get("amt"));
    if (amt <= 0 || amt > (state.balances[coin] || 0)) { toast("Amount exceeds vault"); return; }
    state.balances[coin] -= amt;
    state.payouts.unshift({ t: new Date().toISOString().slice(0, 16).replace("T", " "), coin, amt, via: "send", note: "local sign" });
    save(state); toast("Signed locally. No broadcast."); render();
  });
  root.querySelector("#swap-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const from = String(f.get("from")); const to = String(f.get("to")); const amt = Number(f.get("amt"));
    if (from === to) { toast("Pick two assets"); return; }
    if (amt <= 0 || amt > (state.balances[from] || 0)) { toast("Amount exceeds vault"); return; }
    quote = buildQuote(from, to, amt, String(f.get("dest")));
    startQuoteClock(); render();
  });
  root.querySelector("#dest-mode")?.addEventListener("change", (e) => {
    const wrap = document.getElementById("dest-wrap");
    if (wrap) wrap.classList.toggle("is-hidden", e.target.value !== "external");
  });
  root.querySelector("#settings-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    state.autoConvert = String(f.get("auto")) === "1";
    state.convertTo = String(f.get("into"));
    state.feeBps = Number(f.get("fee"));
    state.deskBps = Number(f.get("desk"));
    state.notes = String(f.get("notes"));
    save(state); toast("Policy saved"); render();
  });
  root.querySelector("#recv-coin")?.addEventListener("change", (e) => {
    document.getElementById("recv-addr").textContent = mockAddress(e.target.value, state.seed);
  });
  root.querySelectorAll("[data-pair]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [from, to] = btn.getAttribute("data-pair").split(":");
      const fs = document.getElementById("from-coin"); const ts = document.getElementById("to-coin");
      if (fs) fs.value = from; if (ts) ts.value = to;
    });
  });
  root.querySelectorAll("[data-copy]").forEach((btn) => btn.addEventListener("click", () => copyText(btn.getAttribute("data-copy"))));
  root.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.getAttribute("data-act");
      if (act === "create") { state.seed = generateSeed(); state.vaultOn = true; state.reveal = true; }
      if (act === "reveal") state.reveal = true;
      if (act === "hide") state.reveal = false;
      if (act === "copy-seed" && state.seed) copyText(state.seed.join(" "));
      if (act === "copy-addr") { const t = document.getElementById("recv-addr")?.textContent; if (t) copyText(t); }
      if (act === "max") {
        const from = document.getElementById("from-coin")?.value || "BTC";
        const inp = document.getElementById("swap-amt");
        if (inp) inp.value = String(state.balances[from] || 0);
        return;
      }
      if (act === "fill" && quote) {
        if (quote.amt > (state.balances[quote.from] || 0)) { toast("Balance moved"); quote = null; render(); return; }
        state.balances[quote.from] -= quote.amt;
        state.balances[quote.to] = (state.balances[quote.to] || 0) + quote.out;
        state.swaps.unshift({ t: new Date().toISOString().slice(0, 16).replace("T", " "), from: quote.from, to: quote.to, amt: quote.amt, out: quote.out, destMode: quote.destMode });
        quote = null; clearInterval(quoteTimer); toast("Filled into vault (simulated)");
      }
      if (act === "drop-quote") { quote = null; clearInterval(quoteTimer); }
      if (act === "export") {
        copyText(["when,coin,amount,via,note", ...state.payouts.map((p) => `${p.t},${p.coin},${p.amt},${p.via},${p.note}`)].join("\n"));
        toast("CSV copied"); return;
      }
      if (act === "wipe" && confirm("Remove the seed from this browser?")) { state.seed = null; state.vaultOn = false; state.reveal = false; }
      if (act === "reset" && confirm("Reset Orion on this device?")) { localStorage.removeItem(KEY); state = defaultState(); }
      save(state); render();
    });
  });
}
async function refreshMarks() {
  try {
    const [px, chain] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,dogecoin,kaspa,tether&vs_currencies=usd&include_24hr_change=true").then((r) => r.json()),
      fetch("https://mempool.space/api/v1/mining/hashrate/3d").then((r) => r.json()).catch(() => null)
    ]);
    Object.entries(PRICE_IDS).forEach(([sym, id]) => {
      if (px[id]?.usd) prices[sym] = px[id].usd;
      if (typeof px[id]?.usd_24h_change === "number") changes[sym] = px[id].usd_24h_change;
    });
    if (chain?.currentHashrate) netEh = chain.currentHashrate / 1e18;
    priceAsOf = "live " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    render();
  } catch { priceAsOf = "cached fallback"; }
}
window.addEventListener("hashchange", render);
if (!location.hash) location.hash = "#/";
render();
refreshMarks();
