// local:os – schermata principale.
// Parla con il servizio locale (localos-shell.py) usando il token inserito nella pagina.
"use strict";

const TOKEN = document.querySelector('meta[name="localos-token"]').content;
const $ = (id) => document.getElementById(id);

async function api(path, body) {
  const opts = { headers: { "X-Localos-Token": TOKEN } };
  if (body !== undefined) {
    opts.method = "POST";
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error("Errore " + res.status);
  return res.json();
}

// ------------------------------------------------------------ orologio e saluto

function tick() {
  const now = new Date();
  $("st-clock").textContent = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  $("date").textContent = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const h = now.getHours();
  $("greeting").textContent = h < 6 ? "Buonanotte" : h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
}
tick();
setInterval(tick, 15000);

// ------------------------------------------------------------ ricerca

function toUrl(text) {
  const t = text.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (!/\s/.test(t) && /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(t)) return "https://" + t;
  return "https://duckduckgo.com/?q=" + encodeURIComponent(t);
}

$("search").addEventListener("submit", (e) => {
  e.preventDefault();
  const url = toUrl($("q").value);
  if (url) location.href = url;
});

// ------------------------------------------------------------ app web

const DEFAULT_APPS = [
  { name: "DuckDuckGo", url: "https://duckduckgo.com" },
  { name: "Proton Mail", url: "https://mail.proton.me" },
  { name: "Wikipedia", url: "https://it.wikipedia.org" },
  { name: "OpenStreetMap", url: "https://www.openstreetmap.org" },
  { name: "CryptPad", url: "https://cryptpad.fr" },
  { name: "Jitsi Meet", url: "https://meet.jit.si" },
];
// Toni della palette Orbit, scuri abbastanza da far leggere la lettera bianca
const COLORS = ["#3665F3", "#8055EF", "#1A8FB0", "#2A4BC4", "#6A44D4", "#3D5A99", "#5B3FB8"];
let editing = false;

function loadApps() {
  try {
    const saved = JSON.parse(localStorage.getItem("localos.apps"));
    if (Array.isArray(saved)) return saved;
  } catch (_) { /* memoria del browser non disponibile */ }
  return DEFAULT_APPS.slice();
}

function saveApps(apps) {
  try { localStorage.setItem("localos.apps", JSON.stringify(apps)); } catch (_) { /* ignora */ }
}

function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

function renderApps() {
  const apps = loadApps();
  const list = $("apps");
  list.replaceChildren();
  apps.forEach((app, i) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "app";
    a.href = app.url;
    const icon = document.createElement("span");
    icon.className = "icon";
    icon.style.background = colorFor(app.name);
    icon.textContent = app.name.charAt(0).toUpperCase();
    const label = document.createElement("span");
    label.textContent = app.name;
    a.append(icon, label);
    if (editing) {
      const rm = document.createElement("button");
      rm.className = "remove";
      rm.title = "Rimuovi " + app.name;
      rm.textContent = "×";
      rm.addEventListener("click", (e) => {
        e.preventDefault();
        apps.splice(i, 1);
        saveApps(apps);
        renderApps();
      });
      a.append(rm);
    }
    li.append(a);
    list.append(li);
  });
}

$("edit-apps").addEventListener("click", () => {
  editing = !editing;
  $("edit-apps").textContent = editing ? "Fatto" : "Modifica";
  $("add-app").hidden = !editing;
  renderApps();
});

$("add-app").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("app-name").value.trim();
  let url = $("app-url").value.trim();
  if (!name || !url) return;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const apps = loadApps();
  apps.push({ name, url });
  saveApps(apps);
  $("app-name").value = "";
  $("app-url").value = "";
  renderApps();
});

renderApps();

// ------------------------------------------------------------ impostazioni rapide

function say(text) { $("quick-msg").textContent = text || ""; }

$("quick-toggle").addEventListener("click", () => {
  const panel = $("quick");
  panel.hidden = !panel.hidden;
  $("quick-toggle").setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) refresh();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("quick").hidden = true;
});

function renderStatus(s) {
  if (Array.isArray(s.wifi)) {
    const active = s.wifi.find((n) => n.active);
    $("st-wifi").textContent = active ? "Wi-Fi · " + active.ssid : "Wi-Fi —";
    renderWifi(s.wifi);
  }

  if (s.volume) {
    $("st-vol").textContent = s.volume.muted ? "Audio muto" : "Audio " + s.volume.level + "%";
    $("volume").value = s.volume.level;
    $("mute").textContent = s.volume.muted ? "Riattiva" : "Muto";
  }

  if (s.battery) {
    $("st-bat").hidden = false;
    $("st-bat").textContent = "Batteria " + s.battery.level + "%" + (s.battery.charging ? " ⚡" : "");
  }
}

function renderWifi(nets) {
  const list = $("wifi-list");
  list.replaceChildren();
  if (!nets.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Nessuna rete trovata";
    list.append(li);
    return;
  }
  for (const net of nets) {
    const li = document.createElement("li");
    const row = document.createElement("button");
    row.className = "wifi-row" + (net.active ? " active" : "");
    const name = document.createElement("span");
    name.textContent = net.ssid;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = (net.active ? "Connesso · " : "") + net.signal + "%" + (net.secure ? " · protetta" : " · aperta");
    row.append(name, meta);
    row.addEventListener("click", () => {
      if (net.active) return;
      if (!net.secure) return connect(net.ssid, "");
      if (li.querySelector(".wifi-pass")) return;
      const form = document.createElement("form");
      form.className = "wifi-pass";
      const pass = document.createElement("input");
      pass.type = "password";
      pass.placeholder = "Password";
      pass.autocomplete = "off";
      const go = document.createElement("button");
      go.type = "submit";
      go.textContent = "Connetti";
      form.append(pass, go);
      form.addEventListener("submit", (e) => { e.preventDefault(); connect(net.ssid, pass.value); });
      li.append(form);
      pass.focus();
    });
    li.append(row);
    list.append(li);
  }
}

async function refresh() {
  try {
    renderStatus(await api("/api/status"));
  } catch (_) {
    say("Servizio di sistema non raggiungibile");
  }
}

async function connect(ssid, password) {
  say("Connessione a " + ssid + "…");
  try {
    const r = await api("/api/wifi/connect", { ssid, password });
    say(r.ok ? "Connesso a " + ssid : "Connessione non riuscita: " + (r.error || "errore sconosciuto"));
  } catch (e) {
    say(e.message);
  }
  refresh();
}

$("wifi-scan").addEventListener("click", async () => {
  say("Ricerca delle reti…");
  try {
    const r = await api("/api/wifi/scan", {});
    renderWifi(r.wifi || []);
    say("");
  } catch (e) {
    say(e.message);
  }
});

let volTimer;
$("volume").addEventListener("input", (e) => {
  clearTimeout(volTimer);
  const level = Number(e.target.value);
  volTimer = setTimeout(async () => {
    try {
      const r = await api("/api/volume", { level });
      if (r.volume) renderStatus({ volume: r.volume });
    } catch (_) { /* ignora */ }
  }, 120);
});

$("mute").addEventListener("click", async () => {
  try { await api("/api/volume", { toggleMute: true }); } catch (_) { /* ignora */ }
  refresh();
});

async function power(action, question) {
  if (!confirm(question)) return;
  try { await api("/api/power", { action }); } catch (e) { say(e.message); }
}
$("reboot").addEventListener("click", () => power("reboot", "Riavviare il computer?"));
$("poweroff").addEventListener("click", () => power("poweroff", "Spegnere il computer?"));

refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 15000);
