// local:os 0.3 – desktop.
// Parla con il servizio locale (localos-shell.py) usando il token inserito nella pagina.
// Le app locali si aprono in finestre qui dentro; i siti in finestre del browser sopra il desktop.
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
  if (!res.ok) throw new Error("Il servizio di sistema ha risposto con errore " + res.status);
  return res.json();
}

/** Crea un elemento: h("button", { class: "btn", onclick }, "Testo", altroNodo) */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;          // solo markup nostro (icone SVG)
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) { return null; }
}

/* ================================================================ icone */
const ICON = {
  files: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v8.3A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z"/></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/></svg>',
  sync: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 11A7.5 7.5 0 0 0 6 7.2L4.5 9"/><path d="M4.5 4.5V9H9"/><path d="M4.5 13A7.5 7.5 0 0 0 18 16.8l1.5-1.8"/><path d="M19.5 19.5V15H15"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="#A9B4CF" stroke-width="1.6" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
  fileSmall: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.5 2.6 14.5 0 17M12 3.5c-2.6 2.5-2.6 14.5 0 17"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  min: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 12h12"/></svg>',
  max: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="5.5" y="5.5" width="13" height="13" rx="2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

/* ================================================================ app */
const LOCAL_APPS = [
  { id: "files", name: "File", tone: "t-files", icon: ICON.files },
  { id: "notes", name: "Note", tone: "t-notes", icon: ICON.notes },
  { id: "sync", name: "Sincronizza", tone: "t-sync", icon: ICON.sync },
];
const SETTINGS_APP = { id: "settings", name: "Impostazioni", tone: "t-settings", icon: ICON.settings };
const DEFAULT_WEB = [
  { name: "DuckDuckGo", url: "https://duckduckgo.com" },
  { name: "Proton Mail", url: "https://mail.proton.me" },
  { name: "Wikipedia", url: "https://it.wikipedia.org" },
  { name: "OpenStreetMap", url: "https://www.openstreetmap.org" },
  { name: "CryptPad", url: "https://cryptpad.fr" },
  { name: "Jitsi Meet", url: "https://meet.jit.si" },
];

function webApps() {
  const saved = store("localos.apps");
  return Array.isArray(saved) ? saved : DEFAULT_WEB.slice();
}
function toneFor(name) {
  let x = 0;
  for (const c of name) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  return "t-web" + (x % 7);
}
function iconEl(app, cls) {
  return h("span", { class: `${cls} ${app.tone || toneFor(app.name)}`, "aria-hidden": "true", html: app.icon || "" },
    app.icon ? null : app.name.charAt(0).toUpperCase());
}

/* ================================================================ dock */
const tip = h("div", { class: "tip", role: "tooltip", hidden: true });
document.body.append(tip);

function dockItem(app, kindLabel, onClick) {
  const b = h("button", {
    class: "dock-item" + (wins.has(app.id) ? " running" : ""),
    "aria-label": `${app.name} (${kindLabel})`,
    onclick: onClick,
  }, iconEl(app, "ico"), h("span", { class: "dot" }));
  const show = () => {
    tip.replaceChildren(app.name, h("span", { class: "tag" }, kindLabel));
    tip.hidden = false;
    const r = b.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(r.left + r.width / 2 - tip.offsetWidth / 2, innerWidth - tip.offsetWidth - 8)) + "px";
    tip.style.top = (r.top - tip.offsetHeight - 12) + "px";
  };
  b.addEventListener("mouseenter", show);
  b.addEventListener("focus", show);
  b.addEventListener("mouseleave", () => { tip.hidden = true; });
  b.addEventListener("blur", () => { tip.hidden = true; });
  return b;
}

function renderDock() {
  const dock = $("dock");
  dock.replaceChildren(
    ...LOCAL_APPS.map((a) => dockItem(a, "offline", () => openApp(a.id))),
    h("span", { class: "dock-sep" }),
    ...webApps().map((a) => dockItem(a, "web", () => openUrl(a.url, a.name))),
    h("span", { class: "dock-sep" }),
    dockItem(SETTINGS_APP, "sistema", () => openApp("settings")),
  );
}

/* ================================================================ siti e file */
async function openUrl(url, label) {
  toast(`Apertura di ${label || url.replace(/^https?:\/\//, "")}…`);
  try {
    const r = await api("/api/open", { url });
    if (!r.ok) toast(r.error || "Non riesco ad aprire il sito");
  } catch (e) { toast(e.message); }
}
async function openFile(path) {
  if (/^Note\/[^/]+\.md$/i.test(path)) { openApp("notes", { note: path.slice(5, -3) }); return; }
  try {
    const r = await api("/api/open", { file: path });
    if (!r.ok) toast(r.error || "Non riesco ad aprire il file");
  } catch (e) { toast(e.message); }
}
// Nessun link porta via il desktop: si aprono sempre in una finestra del browser
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a) return;
  e.preventDefault();
  if (/^https?:/i.test(a.href)) openUrl(a.href);
});

/* ================================================================ finestre */
const wins = new Map();
let zTop = 22, cascade = 0;

const APP_VIEWS = {
  files: viewFiles,
  notes: viewNotes,
  sync: viewSync,
  settings: viewSettings,
};
const ALL_LOCAL = [...LOCAL_APPS, SETTINGS_APP];

function openApp(id, opts = {}) {
  const app = ALL_LOCAL.find((a) => a.id === id);
  if (!app) return;
  if (wins.has(id)) {
    const w = wins.get(id);
    focusWin(w);
    if (opts.note && w.notesApi) w.notesApi.open(opts.note);
    return;
  }
  const body = h("div", { class: "win-body" });
  const titleEl = h("span", { class: "win-title" }, app.name);
  const w = h("section", { class: "win", "aria-label": app.name },
    h("div", { class: "win-bar", ondblclick: (e) => { if (!e.target.closest("button")) toggleMax(w); } },
      iconEl(app, "mini"), titleEl,
      h("button", { class: "win-ctrl", "aria-label": "Riduci", html: ICON.min, onclick: () => { w.hidden = true; updateTitle(); } }),
      h("button", { class: "win-ctrl", "aria-label": "Ingrandisci", html: ICON.max, onclick: () => toggleMax(w) }),
      h("button", { class: "win-ctrl close", "aria-label": `Chiudi ${app.name}`, html: ICON.close, onclick: () => closeWin(id) }),
    ),
    body);
  w.dataset.app = id;
  placeWin(w);
  w.addEventListener("pointerdown", () => focusWin(w));
  makeDraggable(w);
  $("windows").append(w);
  wins.set(id, w);
  APP_VIEWS[id](body, w, opts);
  focusWin(w);
  renderDock();
}

function placeWin(w) {
  const ww = Math.min(820, innerWidth - 32), wh = Math.min(520, innerHeight - 160);
  w.style.width = ww + "px";
  w.style.height = wh + "px";
  w.style.left = Math.max(16, (innerWidth - ww) / 2 + cascade) + "px";
  w.style.top = Math.max(46, (innerHeight - wh) / 2 - 36 + cascade) + "px";
  cascade = (cascade + 28) % 140;
}
function toggleMax(w) {
  if (w.classList.toggle("max")) {
    w.dataset.prev = JSON.stringify([w.style.left, w.style.top, w.style.width, w.style.height]);
    Object.assign(w.style, { left: "0px", top: "34px", width: innerWidth + "px", height: (innerHeight - 34 - 86) + "px" });
  } else if (w.dataset.prev) {
    const [l, t, ww, wh] = JSON.parse(w.dataset.prev);
    Object.assign(w.style, { left: l, top: t, width: ww, height: wh });
  }
}
function focusWin(w) {
  w.hidden = false;
  document.querySelectorAll(".win.focused").forEach((x) => x.classList.remove("focused"));
  w.classList.add("focused");
  w.style.zIndex = ++zTop;
  updateTitle();
}
function closeWin(id) {
  const w = wins.get(id);
  if (w) { if (w.onClose) w.onClose(); w.remove(); wins.delete(id); }
  renderDock();
  updateTitle();
}
function updateTitle() {
  const f = document.querySelector(".win.focused:not([hidden])");
  $("mb-app").textContent = f ? ALL_LOCAL.find((a) => a.id === f.dataset.app).name : "Desktop";
}
function makeDraggable(w) {
  const bar = w.querySelector(".win-bar");
  let sx, sy, ox, oy, drag = false;
  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button") || w.classList.contains("max")) return;
    drag = true; sx = e.clientX; sy = e.clientY; ox = w.offsetLeft; oy = w.offsetTop;
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener("pointermove", (e) => {
    if (!drag) return;
    w.style.left = Math.min(Math.max(ox + e.clientX - sx, -w.offsetWidth + 90), innerWidth - 90) + "px";
    w.style.top = Math.min(Math.max(oy + e.clientY - sy, 34), innerHeight - 60) + "px";
  });
  bar.addEventListener("pointerup", () => { drag = false; });
}

function fmtSize(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 ** 2) return (n / 1024).toFixed(0) + " KB";
  if (n < 1024 ** 3) return (n / 1024 ** 2).toFixed(1) + " MB";
  return (n / 1024 ** 3).toFixed(1) + " GB";
}
function fmtDate(sec) {
  return new Date(sec * 1000).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ---------------------------------------------------------------- File */
async function viewFiles(body) {
  body.replaceChildren(h("p", { class: "msg" }, "Caricamento…"));
  let r;
  try { r = await api("/api/files", {}); } catch (e) { body.replaceChildren(h("p", { class: "msg err" }, e.message)); return; }
  const files = r.files || [];
  body.replaceChildren(
    h("span", { class: "pill local" }, "OFFLINE · cartella Documenti"),
    h("h2", {}, "File"),
    h("p", {}, persistent
      ? "I tuoi documenti, salvati nella memoria cifrata. Le note sono in Documenti › Note."
      : "Attenzione: la memoria non è attiva, quindi questi file spariscono allo spegnimento. Attivala da Impostazioni."),
    files.length
      ? h("div", { class: "files" }, files.map((f) =>
          h("button", { class: "file", title: f.path, onclick: () => openFile(f.path) },
            h("span", { html: ICON.file }), f.name, h("small", {}, (f.folder ? f.folder + " · " : "") + fmtSize(f.size)))))
      : h("div", { class: "empty" }, "Documenti è vuota. Crea una nota con l'app Note: comparirà qui."),
    h("p", { class: "actions" }, h("button", { class: "btn", onclick: () => viewFiles(body) }, "Aggiorna")),
  );
}

/* ---------------------------------------------------------------- Note */
async function viewNotes(body, win, opts) {
  const list = h("ul", { class: "note-list", "aria-label": "Elenco delle note" });
  const title = h("input", { class: "note-title", id: "note-title", "aria-label": "Titolo della nota", maxlength: "80" });
  const text = h("textarea", { class: "note-text", id: "note-text", "aria-label": "Testo della nota", spellcheck: "true" });
  const state = h("span", {}, "");
  const del = h("button", { class: "btn", onclick: () => askDelete() }, "Elimina");
  const foot = h("div", { class: "note-foot" }, state, del);
  const main = h("div", { class: "notes-main" }, title, text, foot);
  body.replaceChildren(h("div", { class: "notes" },
    h("div", { class: "notes-side" },
      h("div", { class: "actions" }, h("button", { class: "btn primary", onclick: () => newNote() }, "Nuova nota")),
      list),
    main));

  let notes = [], current = null, timer = null, dirty = false;

  async function refresh() {
    const r = await api("/api/notes/list", {});
    notes = r.notes || [];
    list.replaceChildren(...notes.map((n) => h("li", {},
      h("button", { class: n.name === current ? "on" : "", onclick: () => open(n.name) },
        h("strong", {}, n.name), h("span", {}, n.preview || "Nota vuota")))));
    if (!notes.length) list.append(h("li", { class: "msg" }, "Nessuna nota ancora."));
  }
  async function open(name) {
    await flush();
    const r = await api("/api/notes/read", { name });
    if (!r.ok) { toast(r.error); return; }
    current = r.name; title.value = r.name; text.value = r.text;
    state.textContent = "Salvata"; main.hidden = false;
    refresh();
  }
  async function newNote() {
    await flush();
    const base = "Nota del " + new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long" });
    let name = base, i = 2;
    while (notes.some((n) => n.name === name)) name = `${base} (${i++})`;
    const r = await api("/api/notes/write", { name, text: "", create: true });
    if (!r.ok) { toast(r.error); return; }
    await open(r.name);
    title.focus(); title.select();
  }
  async function save() {
    if (!current) return;
    const wanted = title.value.trim() || current;
    const r = await api("/api/notes/write", { name: wanted, text: text.value, previous: current !== wanted ? current : undefined });
    dirty = false;
    if (!r.ok) { state.textContent = r.error; return; }
    current = r.name;
    state.textContent = "Salvata alle " + new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    refresh();
  }
  function schedule() { dirty = true; state.textContent = "Modifiche non salvate…"; clearTimeout(timer); timer = setTimeout(save, 700); }
  async function flush() { clearTimeout(timer); if (dirty) await save(); }
  function askDelete() {
    if (!current) return;
    foot.replaceChildren(h("span", {}, `Eliminare “${current}”? Non si può annullare.`),
      h("span", { class: "actions" },
        h("button", { class: "btn danger", onclick: async () => {
          await api("/api/notes/delete", { name: current });
          current = null; title.value = ""; text.value = ""; main.hidden = true;
          foot.replaceChildren(state, del); refresh();
        } }, "Elimina"),
        h("button", { class: "btn", onclick: () => foot.replaceChildren(state, del) }, "Annulla")));
  }
  text.addEventListener("input", schedule);
  title.addEventListener("input", schedule);
  win.onClose = () => { if (dirty) save(); };
  win.notesApi = { open };

  main.hidden = true;
  try {
    await refresh();
    if (opts.note) await open(opts.note);
    else if (notes.length) await open(notes[0].name);
    else await newNote();
  } catch (e) { list.replaceChildren(h("li", { class: "msg err" }, e.message)); }
}

/* ---------------------------------------------------------------- Sincronizza */
function viewSync(body) {
  body.replaceChildren(
    h("span", { class: "pill local" }, "DA PARI A PARI"),
    h("h2", {}, "Sincronizza"),
    h("p", {}, "Syncthing tiene allineata la cartella Documenti tra local:os e gli altri tuoi dispositivi (computer, telefono). I file viaggiano cifrati direttamente da un dispositivo all'altro: nessun cloud in mezzo."),
    persistent ? null : h("p", { class: "msg err" }, "La memoria non è attiva: Syncthing dimenticherebbe i dispositivi collegati a ogni spegnimento. Attiva prima la memoria da Impostazioni."),
    h("h3", {}, "Come si collega un dispositivo"),
    h("ul", { class: "facts" },
      h("li", {}, "Installa Syncthing sull'altro dispositivo (è gratuito e libero)."),
      h("li", {}, "In Syncthing: Aggiungi dispositivo e inserisci l'ID dell'altro."),
      h("li", {}, "Condividi la cartella Documenti e accetta sull'altro dispositivo.")),
    h("p", { class: "actions" },
      h("button", { class: "btn primary", onclick: startSync }, "Apri Syncthing")),
    h("p", { class: "msg" }, "Syncthing si avvia solo quando lo apri da qui: finché non lo usi, local:os non contatta i suoi server."),
  );
}

async function startSync() {
  toast("Avvio di Syncthing…");
  try {
    const r = await api("/api/sync/start", {});
    if (!r.ok) { toast(r.error || "Syncthing non si avvia"); return; }
  } catch (e) { toast(e.message); return; }
  setTimeout(() => openUrl("http://127.0.0.1:8384/", "Syncthing"), 2500);   // il tempo di aprire la sua pagina
}

/* ---------------------------------------------------------------- Impostazioni */
function viewSettings(body) {
  const memory = h("div", { class: "stack" }, h("p", { class: "msg" }, "Controllo della memoria…"));
  const appsBox = h("div", {});
  body.replaceChildren(
    h("span", { class: "pill local" }, "SISTEMA"),
    h("h2", {}, "Impostazioni"),
    h("h3", {}, "Memoria persistente"), memory,
    h("h3", {}, "App web nel dock"), appsBox,
    h("h3", {}, "Privacy (sempre attiva)"),
    h("ul", { class: "facts" },
      h("li", {}, "Nessuna telemetria nel sistema e nel browser."),
      h("li", {}, "DNS cifrato e Encrypted Client Hello: il provider non vede quali siti visiti."),
      h("li", {}, "Tracker, banner dei cookie e parametri traccianti bloccati."),
      h("li", {}, "Firewall che blocca le connessioni in ingresso; MAC Wi-Fi diverso per ogni rete."),
      h("li", {}, "Ora esatta e autenticata (NTS).")),
    h("h3", {}, "Informazioni"),
    h("p", {}, `local:os ${version} · Libero. Locale. Tuo.`),
  );
  renderMemory(memory);
  renderAppsEditor(appsBox);
}

async function renderMemory(box) {
  let r;
  try { r = await api("/api/persistence/check", {}); } catch (e) { box.replaceChildren(h("p", { class: "msg err" }, e.message)); return; }
  if (r.state === "active") {
    box.replaceChildren(h("p", {}, h("span", { class: "pill ok" }, "ATTIVA")),
      h("p", {}, "Wi-Fi, impostazioni, note e file restano salvati, cifrati sulla chiavetta. Senza la frase segreta nessuno può leggerli."));
    return;
  }
  if (r.state === "locked") {
    box.replaceChildren(h("p", {}, h("span", { class: "pill warn" }, "BLOCCATA")), h("p", {}, r.message));
    return;
  }
  if (r.state !== "available") {
    box.replaceChildren(h("p", {}, h("span", { class: "pill warn" }, "NON DISPONIBILE")), h("p", {}, r.message || "Funzione non disponibile."));
    return;
  }
  const p1 = h("input", { class: "field", id: "phrase-1", type: "password", autocomplete: "new-password", placeholder: "Frase segreta (almeno 8 caratteri)" });
  const p2 = h("input", { class: "field", id: "phrase-2", type: "password", autocomplete: "new-password", placeholder: "Ripeti la frase segreta" });
  const msg = h("p", { class: "msg" });
  const go = h("button", { class: "btn primary", type: "submit" }, `Crea memoria cifrata (${fmtSize(r.free_bytes)})`);
  const form = h("form", { class: "stack" },
    h("p", {}, h("span", { class: "pill warn" }, "NON ATTIVA")),
    h("p", {}, "Ora local:os dimentica tutto allo spegnimento. Puoi usare lo spazio libero della chiavetta per una memoria cifrata: Wi-Fi, impostazioni, note e file resteranno salvati."),
    h("ul", { class: "facts" },
      h("li", {}, "La frase segreta serve a ogni avvio. Se la dimentichi, i dati non si recuperano: scrivila in un posto sicuro."),
      h("li", {}, "Viene modificata solo la chiavetta, mai il disco del computer."),
      h("li", {}, "Se un giorno riscrivi la chiavetta con balenaEtcher, la memoria viene cancellata.")),
    p1, p2, h("div", { class: "actions" }, go), msg);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "msg err";
    if (p1.value.length < 8) { msg.textContent = "La frase segreta deve avere almeno 8 caratteri."; return; }
    if (p1.value !== p2.value) { msg.textContent = "Le due frasi non coincidono."; return; }
    go.disabled = true; msg.className = "msg"; msg.textContent = "Creazione in corso: può richiedere un minuto. Non togliere la chiavetta.";
    try {
      const res = await api("/api/persistence/create", { phrase: p1.value });
      p1.value = p2.value = "";
      if (res.ok) {
        box.replaceChildren(h("p", {}, h("span", { class: "pill ok" }, "CREATA")), h("p", {}, res.message),
          h("p", { class: "actions" }, h("button", { class: "btn primary", onclick: () => api("/api/power", { action: "reboot" }) }, "Riavvia ora")));
      } else { go.disabled = false; msg.className = "msg err"; msg.textContent = res.message || "Creazione non riuscita."; }
    } catch (err) { go.disabled = false; msg.className = "msg err"; msg.textContent = err.message; }
  });
  box.replaceChildren(form);
}

function renderAppsEditor(box) {
  const apps = webApps();
  const name = h("input", { class: "field", id: "app-name", placeholder: "Nome, es. CryptPad", maxlength: "24", required: true });
  const url = h("input", { class: "field", id: "app-url", placeholder: "Indirizzo, es. cryptpad.fr", required: true });
  const form = h("form", { class: "stack" }, name, url, h("div", { class: "actions" }, h("button", { class: "btn primary", type: "submit" }, "Aggiungi al dock")));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let u = url.value.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    apps.push({ name: name.value.trim(), url: u });
    store("localos.apps", apps); renderDock(); renderAppsEditor(box);
  });
  box.replaceChildren(
    h("ul", { class: "facts" }, apps.map((a, i) => h("li", {},
      h("span", {}, `${a.name} · ${a.url.replace(/^https?:\/\//, "")} `),
      h("button", { class: "link-btn", onclick: () => { apps.splice(i, 1); store("localos.apps", apps); renderDock(); renderAppsEditor(box); } }, "Rimuovi")))),
    form);
}

/* ================================================================ barra di sistema */
let sys = { wifi: [], volume: null, battery: null }, version = "", persistent = false;
let openFor = null, connecting = null;

function menuContent(kind) {
  if (kind === "orbit") return [
    h("h4", {}, `local:os ${version}`),
    h("button", { class: "menu-item", onclick: () => { closeMenu(); openApp("settings"); } }, "Impostazioni"),
    h("button", { class: "menu-item", onclick: () => { closeMenu(); openApp("files"); } }, "Documenti"),
    h("hr"),
    h("div", { class: "note" }, "Libero. Locale. Tuo.", h("br"), "Nessuna telemetria · DNS cifrato · Tracker bloccati"),
  ];
  if (kind === "wifi") {
    const nets = sys.wifi || [];
    return [
      h("h4", {}, "Wi-Fi", h("button", { onclick: scanWifi }, "Aggiorna")),
      ...(nets.length ? nets.map((n) => [
        h("button", { class: "menu-item" + (n.active ? " on" : ""), onclick: () => pickNet(n) },
          h("span", {}, n.ssid), h("span", { class: "meta" }, `${n.active ? "Connesso · " : ""}${n.signal}%${n.secure ? " · protetta" : " · aperta"}`)),
        connecting === n.ssid ? passForm(n.ssid) : null,
      ]) : [h("div", { class: "note" }, "Nessuna rete trovata. Premi Aggiorna.")]),
      h("hr"),
      h("div", { class: "note" }, persistent ? "Le reti a cui ti colleghi restano salvate." : "Senza memoria attiva le reti vanno ricollegate a ogni avvio."),
    ];
  }
  if (kind === "vol") {
    const v = sys.volume || { level: 0, muted: false };
    const range = h("input", { type: "range", id: "vol-range", min: "0", max: "100", step: "5", value: String(v.level), "aria-label": "Volume" });
    const val = h("span", { class: "meta" }, v.level + "%");
    let t;
    range.addEventListener("input", () => {
      val.textContent = range.value + "%";
      clearTimeout(t);
      t = setTimeout(async () => { const r = await api("/api/volume", { level: +range.value }); if (r.volume) { sys.volume = r.volume; paintVol(); } }, 120);
    });
    return [
      h("h4", {}, "Suono"),
      h("div", { class: "row" }, range, val),
      h("button", { class: "menu-item", onclick: async () => { const r = await api("/api/volume", { toggleMute: true }); if (r.volume) sys.volume = r.volume; paintVol(); closeMenu(); } },
        v.muted ? "Riattiva l'audio" : "Disattiva l'audio"),
    ];
  }
  if (kind === "bat") {
    const b = sys.battery;
    return [h("h4", {}, "Batteria"), h("div", { class: "row" }, h("span", {}, b ? b.level + "%" : "—"), h("span", { class: "meta" }, b && b.charging ? "In carica" : "A batteria"))];
  }
  if (kind === "power") return [
    h("h4", {}, "Sessione"),
    h("button", { class: "menu-item", onclick: () => confirmPower("reboot") }, "Riavvia…"),
    h("button", { class: "menu-item danger", onclick: () => confirmPower("poweroff") }, "Spegni…"),
  ];
  return [];
}

function passForm(ssid) {
  const input = h("input", { type: "password", id: "wifi-pass", placeholder: "Password", autocomplete: "off", "aria-label": `Password di ${ssid}` });
  const f = h("form", {}, input, h("button", { class: "btn primary", type: "submit" }, "Connetti"));
  f.addEventListener("submit", (e) => { e.preventDefault(); connect(ssid, input.value); });
  setTimeout(() => input.focus(), 0);
  return f;
}
function pickNet(n) {
  if (n.active) return;
  if (!n.secure) { connect(n.ssid, ""); return; }
  connecting = connecting === n.ssid ? null : n.ssid;
  refillMenu();
}
async function connect(ssid, password) {
  closeMenu(); connecting = null;
  toast(`Connessione a ${ssid}…`);
  try {
    const r = await api("/api/wifi/connect", { ssid, password });
    toast(r.ok ? `Connesso a ${ssid}` : `Connessione non riuscita: ${r.error || "controlla la password"}`);
  } catch (e) { toast(e.message); }
  refresh();
}
async function scanWifi(e) {
  e.stopPropagation();
  toast("Ricerca delle reti…");
  try { const r = await api("/api/wifi/scan", {}); sys.wifi = r.wifi || []; } catch (err) { toast(err.message); }
  refillMenu();
}
function confirmPower(action) {
  const what = action === "reboot" ? "Riavviare" : "Spegnere";
  fillMenu([
    h("h4", {}, "Conferma"),
    h("div", { class: "note" }, `${what} il computer? Le finestre aperte verranno chiuse.`),
    h("button", { class: "menu-item" + (action === "poweroff" ? " danger" : ""), onclick: () => { closeMenu(); api("/api/power", { action }); } }, `${what} ora`),
    h("button", { class: "menu-item", onclick: closeMenu }, "Annulla"),
  ]);
}

function fillMenu(nodes) { $("menu").replaceChildren(...nodes.flat().filter(Boolean)); }
function refillMenu() { if (openFor) fillMenu(menuContent(openFor)); }
function openMenu(kind, anchor) {
  const m = $("menu");
  if (openFor === kind && !m.hidden) { closeMenu(); return; }
  closeMenu();
  connecting = null;
  fillMenu(menuContent(kind));
  m.hidden = false;
  const r = anchor.getBoundingClientRect();
  const left = kind === "orbit" ? r.left : r.right - m.offsetWidth;
  m.style.left = Math.max(10, Math.min(left, innerWidth - m.offsetWidth - 10)) + "px";
  m.style.top = (r.bottom + 6) + "px";
  openFor = kind; m.anchor = anchor;
  anchor.setAttribute("aria-expanded", "true");
  if (kind !== "orbit" && kind !== "power") refresh().then(refillMenu);
}
function closeMenu() {
  const m = $("menu");
  m.hidden = true;
  if (m.anchor) m.anchor.setAttribute("aria-expanded", "false");
  openFor = null;
}
for (const [id, kind] of [["mb-orbit", "orbit"], ["mb-wifi", "wifi"], ["mb-vol", "vol"], ["mb-bat", "bat"], ["mb-power", "power"]]) {
  $(id).addEventListener("click", (e) => { e.stopPropagation(); openMenu(kind, $(id)); });
}
$("mb-clock").addEventListener("click", () => toast(new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })));
document.addEventListener("pointerdown", (e) => { if (!e.target.closest("#menu") && !e.target.closest(".mb-btn")) closeMenu(); });

function paintVol() {
  const v = sys.volume;
  $("vol-wave").style.opacity = !v || v.muted || v.level === 0 ? 0 : v.level < 40 ? 0.5 : 1;
}
function paintStatus() {
  const active = (sys.wifi || []).find((n) => n.active);
  $("mb-wifi-name").textContent = active ? active.ssid : "Non connesso";
  paintVol();
  const b = sys.battery;
  $("mb-bat").hidden = !b;
  if (b) {
    $("bat-fill").setAttribute("width", (15.6 * b.level / 100).toFixed(1));
    $("mb-bat-pct").textContent = b.level + "%" + (b.charging ? " ⚡" : "");
  }
  $("desk-persist").hidden = persistent;
}
async function refresh() {
  try {
    const s = await api("/api/status");
    sys = s; version = s.version || ""; persistent = !!s.persistent;
    paintStatus();
  } catch (_) { /* il servizio si sta avviando */ }
}
$("persist-cta").addEventListener("click", () => openApp("settings"));

/* ================================================================ orologio */
function tick() {
  const now = new Date();
  const hm = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const day = now.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  $("mb-clock").replaceChildren(h("span", { class: "mb-hide-sm" }, day + "  "), hm);
  $("desk-time").textContent = hm;
  $("desk-date").textContent = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const hr = now.getHours();
  $("desk-greet").textContent = hr < 6 ? "Buonanotte" : hr < 13 ? "Buongiorno" : hr < 18 ? "Buon pomeriggio" : "Buonasera";
}

/* ================================================================ ricerca */
let results = [], sel = 0, notesCache = [], filesCache = [];

function toUrl(t) {
  if (/^https?:\/\//i.test(t)) return t;
  if (!/\s/.test(t) && /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(t)) return "https://" + t;
  return null;
}
function buildResults(q) {
  const s = q.trim().toLowerCase();
  const out = [];
  const apps = [
    ...ALL_LOCAL.map((a) => ({ app: a, kind: "App · offline", run: () => openApp(a.id) })),
    ...webApps().map((a) => ({ app: a, kind: "Sito web", run: () => openUrl(a.url, a.name) })),
  ].filter((x) => !s || x.app.name.toLowerCase().includes(s));
  apps.slice(0, s ? 6 : 4).forEach((x) => out.push({ group: s ? "App" : "Suggerite", label: x.app.name, ...x }));
  if (s) {
    notesCache.filter((n) => (n.name + " " + n.preview).toLowerCase().includes(s)).slice(0, 4)
      .forEach((n) => out.push({ group: "Note", label: n.name, kind: n.preview || "Nota", mini: ICON.notes, tone: "t-notes", run: () => openApp("notes", { note: n.name }) }));
    filesCache.filter((f) => f.name.toLowerCase().includes(s) && !/^Note\//.test(f.path)).slice(0, 4)
      .forEach((f) => out.push({ group: "File", label: f.name, kind: f.folder || "Documenti", mini: ICON.fileSmall, tone: "t-file", run: () => openFile(f.path) }));
    const url = toUrl(q.trim());
    if (url) out.push({ group: "Web", label: "Apri " + url.replace(/^https?:\/\//, ""), kind: "Indirizzo", mini: ICON.link, tone: "t-link", run: () => openUrl(url) });
    out.push({ group: "Web", label: `Cerca “${q.trim()}” con DuckDuckGo`, kind: "Ricerca", mini: ICON.globe, tone: "t-link",
      run: () => openUrl("https://duckduckgo.com/?q=" + encodeURIComponent(q.trim()), "DuckDuckGo") });
  }
  return out;
}
function renderResults() {
  const list = $("spot-list");
  list.replaceChildren();
  let last = "";
  results.forEach((r, i) => {
    if (r.group !== last) { list.append(h("li", { class: "spot-group" }, r.group)); last = r.group; }
    const icon = r.app ? iconEl(r.app, "mini") : h("span", { class: `mini ${r.tone}`, html: r.mini });
    list.append(h("li", {
      class: "spot-res" + (i === sel ? " sel" : ""), role: "option", "aria-selected": String(i === sel),
      onmouseenter: () => { sel = i; paintSel(); }, onclick: () => runResult(i),
    }, icon, h("span", { class: "lbl" }, r.label), h("span", { class: "kind" }, r.kind)));
  });
}
function paintSel() {
  document.querySelectorAll(".spot-res").forEach((el, i) => { el.classList.toggle("sel", i === sel); el.setAttribute("aria-selected", String(i === sel)); });
  document.querySelectorAll(".spot-res")[sel]?.scrollIntoView({ block: "nearest" });
}
function runResult(i) { const r = results[i]; if (!r) return; closeSpot(); r.run(); }
function openSpot() {
  closeMenu();
  $("spot-back").hidden = false;
  const inp = $("spot-input");
  inp.value = "";
  results = buildResults(""); sel = 0; renderResults();
  inp.focus();
  api("/api/notes/list", {}).then((r) => { notesCache = r.notes || []; }).catch(() => {});
  api("/api/files", {}).then((r) => { filesCache = r.files || []; }).catch(() => {});
}
function closeSpot() { $("spot-back").hidden = true; }
$("spot-input").addEventListener("input", (e) => { results = buildResults(e.target.value); sel = 0; renderResults(); });
$("spot-input").addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); paintSel(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); paintSel(); }
  else if (e.key === "Enter") { e.preventDefault(); runResult(sel); }
});
$("spot-back").addEventListener("click", (e) => { if (e.target.id === "spot-back") closeSpot(); });
$("mb-search").addEventListener("click", (e) => { e.stopPropagation(); openSpot(); });
$("hint-btn").addEventListener("click", openSpot);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.code === "Space" || e.key.toLowerCase() === "k")) {
    e.preventDefault();
    if ($("spot-back").hidden) openSpot(); else closeSpot();
  } else if (e.key === "Escape") {
    if (!$("spot-back").hidden) closeSpot(); else closeMenu();
  }
});
// Il desktop non ha menu contestuale del browser
document.addEventListener("contextmenu", (e) => { if (!e.target.closest("input, textarea")) e.preventDefault(); });

/* ================================================================ avviso */
let toastTimer;
function toast(text) {
  const t = $("toast");
  t.textContent = text; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

/* ================================================================ avvio */
tick(); setInterval(tick, 10000);
renderDock();
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 15000);
addEventListener("resize", () => { document.querySelectorAll(".win.max").forEach((w) => { w.classList.remove("max"); toggleMax(w); }); });
