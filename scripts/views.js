function viewOverview() {
  const net = dailyGrossUsd() - dailyPowerUsd();
  return `${banner()}<div class="topbar"><div><p class="kicker">Farm</p><h1>One desk for hash, keys, and convert</h1><p>Marks ${priceAsOf} · auto-convert ${state.autoConvert ? "on → " + state.convertTo : "off"}</p></div></div>
    <div class="grid-4">
      <div class="card metric"><b>${fmt(btcTh(), 0)} TH/s</b><span>BTC accepted</span><div class="up">${state.workers.filter((w) => w.status === "up").length} workers up</div></div>
      <div class="card metric"><b>${portfolio().toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</b><span>Vault mark</span><div>${chg("BTC")} BTC</div></div>
      <div class="card metric"><b>${net.toLocaleString(undefined, { style: "currency", currency: "USD" })}</b><span>Est. net / day</span><div class="${net >= 0 ? "up" : "dn"}">after ${state.kwh.toFixed(2)} $/kWh</div></div>
      <div class="card metric"><b>${fmt(state.balances.BTC, 5)}</b><span>BTC held</span><div class="up">${usd("BTC", state.balances.BTC)}</div></div>
    </div>
    <div class="grid-2" style="margin-top:1rem">
      <div class="card wide-card"><h2>24h accepted shares</h2>${bars()}<p class="kicker" style="margin-top:.7rem">Simulated farm curve · network ${fmt(netEh, 1)} EH/s</p></div>
      <div class="card"><h2>Convert policy</h2>
        <p style="color:var(--muted);margin:0 0 .7rem">Most pools pay the mined coin. Orion can settle merge dust into one asset at payout so you do not keep a CEX account just to tidy the ledger.</p>
        <div class="row"><span>Policy</span><b>${state.autoConvert ? "Auto → " + state.convertTo : "Keep mined coin"}</b></div>
        <div class="row"><span>Desk fee</span><b>${state.deskBps} bps</b></div>
        <div class="row"><span>Pool fee</span><b>${state.feeBps / 100}%</b></div>
        <div class="btn-row"><a class="btn btn-fill" href="#/swap">Open desk</a><a class="btn" href="#/pool">Connect hardware</a></div>
      </div>
    </div>
    <div class="card" style="margin-top:1rem"><h2>Workers</h2>${workerTable()}</div>`;
}
function viewPool() {
  return `${banner()}<div class="topbar"><div><p class="kicker">Pool</p><h1>Stratum, merge, and net profit</h1><p>Copy a port. Worker name is <code>orion.WORKER</code>. Password <code>x</code>.</p></div></div>
    <div class="card"><table class="dense"><thead><tr><th>Coin</th><th>Algo</th><th>Scheme</th><th>Min</th><th>Merge</th><th>Endpoint</th><th></th></tr></thead><tbody>
      ${["BTC", "LTC", "DOGE", "KAS"].map((c) => { const x = COINS[c]; const url = `stratum+tcp://pool.orion.invalid:${x.port}`; return `<tr><td>${x.name}</td><td>${x.algo}</td><td>${x.scheme}</td><td class="right">${x.min} ${c}</td><td>${(x.merge || []).join(" · ") || "—"}</td><td><code>${url}</code></td><td><button class="btn btn-slim" data-copy="${url}">Copy</button></td></tr>`; }).join("")}
    </tbody></table></div>
    <div class="grid-2" style="margin-top:1rem">
      <form class="card" id="calc-form"><h2>Net calculator</h2>
        <p style="color:var(--muted)">BTC uses live network EH/s when fetched. Scrypt and KAS use farm factors — estimates.</p>
        <label class="field">Facility power (kW)<input name="kw" type="number" step="0.1" value="${state.powerKw}"></label>
        <label class="field">Power price ($/kWh)<input name="kwh" type="number" step="0.001" value="${state.kwh}"></label>
        <div class="quote"><span class="kicker">Today’s book</span><b>${dailyGrossUsd().toLocaleString(undefined, { style: "currency", currency: "USD" })} gross</b>
          <span>Power ${dailyPowerUsd().toLocaleString(undefined, { style: "currency", currency: "USD" })} · net ${(dailyGrossUsd() - dailyPowerUsd()).toLocaleString(undefined, { style: "currency", currency: "USD" })}</span>
          <span>BTC ${fmt(btcPerThDay() * 1e8, 0)} sats / TH / day before fee</span></div>
        <button class="btn btn-fill" type="submit">Save power inputs</button>
      </form>
      <div class="card"><h2>Why this pool shape</h2>
        <p>Most pools stop at a payout address. The better product is accepted shares → on-chain to keys you hold → optional convert on public rails. Merge coins are listed, not hidden as bonus.</p>
        <h2 style="margin-top:1rem">Add worker</h2>
        <form id="add-worker"><label class="field">Name<input name="id" required placeholder="s21-03"></label>
          <label class="field">Coin<select name="coin"><option>BTC</option><option>LTC</option><option>KAS</option></select></label>
          <label class="field">Rate<input name="th" type="number" step="0.1" value="240" required></label>
          <button class="btn" type="submit">Add to farm</button></form>
      </div>
    </div>
    <div class="card" style="margin-top:1rem"><h2>Farm</h2>${workerTable()}</div>`;
}
function seedGrid() {
  if (!state.seed) return `<p>No vault on this device.</p>`;
  if (!state.reveal) return `<button class="btn" data-act="reveal">Reveal seed on this screen</button>`;
  return `<div class="seed">${state.seed.map((w, i) => `<span><i>${i + 1}</i>${w}</span>`).join("")}</div><button class="btn" data-act="hide">Hide seed</button>`;
}
function viewWallet() {
  const has = state.vaultOn && state.seed;
  return `${banner()}<div class="topbar"><div><p class="kicker">Vault</p><h1>Keys stay here</h1><p>Demo wordlist — not BIP-39. Pool payouts target these receive addresses.</p></div></div>
    ${!has ? `<div class="card"><h2>Create or import</h2><div class="btn-row"><button class="btn btn-fill" data-act="create">Generate 12 words</button></div>
      <form id="import-form" style="margin-top:1rem"><label class="field">Import words<textarea name="words"></textarea></label><button class="btn" type="submit">Import</button></form></div>` : `
      <div class="grid-2">
        <div class="card wide-card"><h2>Recovery words</h2>${seedGrid()}<div class="btn-row"><button class="btn" data-act="copy-seed">Copy seed</button><button class="btn" data-act="wipe">Wipe this browser</button></div></div>
        <div class="card"><h2>Receive</h2><label class="field">Asset<select id="recv-coin">${["BTC","LTC","DOGE","KAS"].map((c)=>`<option>${c}</option>`).join("")}</select></label>
          <div class="addr" id="recv-addr">${mockAddress("BTC", state.seed)}</div><div class="btn-row"><button class="btn" data-act="copy-addr">Copy address</button></div></div>
        <div class="card"><h2>Send (local sign)</h2><form id="send-form">
          <label class="field">Asset<select name="coin">${["BTC","LTC","DOGE","KAS","USDT"].map((c)=>`<option>${c}</option>`).join("")}</select></label>
          <label class="field">To<input name="to" required placeholder="destination"></label>
          <label class="field">Amount<input name="amt" type="number" step="any" required></label>
          <button class="btn btn-fill" type="submit">Sign locally</button></form></div>
      </div>
      <div class="card" style="margin-top:1rem"><h2>Holdings</h2><div class="list">${["BTC","LTC","DOGE","KAS","USDT"].map((c)=>`<div class="row"><div class="who"><b>${c}</b><small>${COINS[c].name} · ${chg(c)}</small></div><div class="right">${fmt(state.balances[c]||0, c==="BTC"?5:2)}<br><small>${usd(c, state.balances[c]||0)}</small></div></div>`).join("")}</div></div>`}`;
}
function quoteHtml() {
  if (!quote) return `<div class="quote" id="quote-box"><span class="kicker">Idle</span><p>Lock a quote. The desk does not open an account or take a deposit book.</p></div>`;
  return `<div class="quote" id="quote-box"><span class="kicker">Locked · ${quoteLeft}s · ${quote.deskBps} bps</span>
    <b>${fmt(quote.amt, 6)} ${quote.from} → ${fmt(quote.out, 6)} ${quote.to}</b>
    <span>${usd(quote.from, quote.amt)} notional · dest ${quote.destMode}</span>
    <div class="btn-row"><button class="btn btn-fill" data-act="fill">Sign fill</button><button class="btn" data-act="drop-quote">Drop</button></div></div>`;
}
function viewSwap() {
  return `${banner()}<div class="topbar"><div><p class="kicker">Desk</p><h1>Convert without a passport</h1><p>No hosted book. Quote uses live marks, then a simulated fill into the vault or an address you paste.</p></div></div>
    <div class="pair-row">${[["BTC","USDT"],["LTC","BTC"],["DOGE","BTC"],["KAS","USDT"],["BTC","LTC"]].map(([a,b])=>`<button class="pair" type="button" data-pair="${a}:${b}">${a} → ${b}</button>`).join("")}</div>
    <div class="grid-2" style="margin-top:1rem">
      <form class="card" id="swap-form"><h2>Route</h2>
        <label class="field">From<select name="from" id="from-coin">${["BTC","LTC","DOGE","KAS","USDT"].map((c)=>`<option>${c}</option>`).join("")}</select></label>
        <label class="field">Amount<input name="amt" id="swap-amt" type="number" step="any" value="0.002" required></label>
        <button type="button" class="linkish" data-act="max">Use vault max</button>
        <label class="field">To<select name="to" id="to-coin"><option>USDT</option><option>BTC</option><option>LTC</option><option>DOGE</option><option>KAS</option></select></label>
        <label class="field">Destination<select name="dest" id="dest-mode"><option value="vault">This vault</option><option value="external">External address</option></select></label>
        <label class="field" id="dest-wrap" class="is-hidden">External receive<input name="destAddr" placeholder="address you control"></label>
        <button class="btn btn-fill" type="submit">Lock quote 20s</button>
        <p style="color:var(--muted);margin:.8rem 0 0">A live desk routes over public non-custodial protocols and asks this vault to sign. No KYC file because Orion is not your custodian.</p>
      </form>
      <div class="card"><h2>Quote</h2>${quoteHtml()}
        <h2 style="margin-top:1.1rem">Marks</h2>
        <div class="list">${["BTC","LTC","DOGE","KAS"].map((c)=>`<div class="row"><div class="who"><b>${c}</b><small>${priceAsOf}</small></div><div class="right">${prices[c].toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:c==="BTC"?0:c==="LTC"?2:4})} ${chg(c)}</div></div>`).join("")}</div>
      </div>
    </div>
    <div class="card" style="margin-top:1rem"><h2>Desk history</h2>${state.swaps.length===0?`<p style="color:var(--muted)">No fills on this device yet.</p>`:`<table class="dense"><thead><tr><th>When</th><th>Route</th><th class="right">Out</th><th>Dest</th></tr></thead><tbody>${state.swaps.slice(0,10).map((s)=>`<tr><td>${s.t}</td><td>${s.from} → ${s.to}</td><td class="right">${fmt(s.out,6)}</td><td>${s.destMode}</td></tr>`).join("")}</tbody></table>`}</div>`;
}
function viewPayouts() {
  return `${banner()}<div class="topbar"><div><p class="kicker">Payouts</p><h1>On-chain ledger</h1><p>Production entries are pool wallet → your receive address.</p></div></div>
    <div class="card"><div class="btn-row" style="margin-bottom:.8rem"><button class="btn" data-act="export">Export CSV</button></div>
      <table class="dense"><thead><tr><th>When</th><th>Coin</th><th class="right">Amount</th><th>Via</th><th>Note</th></tr></thead>
      <tbody>${state.payouts.map((p)=>`<tr><td>${p.t}</td><td>${p.coin}</td><td class="right">${fmt(p.amt,5)}</td><td>${p.via}</td><td>${p.note}</td></tr>`).join("")}</tbody></table></div>`;
}
function viewSettings() {
  return `${banner()}<div class="topbar"><div><p class="kicker">Settings</p><h1>Desk policy</h1></div></div>
    <form class="card" id="settings-form">
      <label class="field">Auto-convert mined coins<select name="auto"><option value="1" ${state.autoConvert?"selected":""}>On</option><option value="0" ${!state.autoConvert?"selected":""}>Off — keep mined asset</option></select></label>
      <label class="field">Convert into<select name="into"><option ${state.convertTo==="BTC"?"selected":""}>BTC</option><option ${state.convertTo==="USDT"?"selected":""}>USDT</option></select></label>
      <label class="field">Pool fee (bps)<input name="fee" type="number" min="0" max="500" value="${state.feeBps}"></label>
      <label class="field">Desk fee (bps)<input name="desk" type="number" min="0" max="200" value="${state.deskBps}"></label>
      <label class="field">Operator notes<textarea name="notes">${state.notes||""}</textarea></label>
      <button class="btn btn-fill" type="submit">Save policy</button>
    </form>
    <div class="card" style="margin-top:1rem"><h2>Reset demo</h2><p style="color:var(--muted)">Clears Orion v2 state on this browser.</p><div class="btn-row"><button class="btn" data-act="reset">Reset</button></div></div>`;
}
const views = { "/": viewOverview, "/pool": viewPool, "/workers": viewPool, "/wallet": viewWallet, "/swap": viewSwap, "/payouts": viewPayouts, "/settings": viewSettings };
