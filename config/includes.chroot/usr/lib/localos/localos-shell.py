#!/usr/bin/env python3
"""local:os shell: serve l'interfaccia web locale e una piccola API di sistema.

Ascolta solo su 127.0.0.1. Protezioni contro i siti web esterni:
  - controllo dell'header Host (blocca il "DNS rebinding");
  - controllo dell'header Origin sulle richieste che modificano qualcosa;
  - token segreto generato a ogni avvio, inserito solo nella pagina servita da qui;
  - la pagina non può essere incorniciata da altri siti (clickjacking).
"""
import json
import os
import re
import secrets
import subprocess
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = int(os.environ.get("LOCALOS_PORT", "8088"))
SHELL_DIR = Path(os.environ.get("LOCALOS_SHELL_DIR", "/usr/share/localos/shell")).resolve()
TOKEN = secrets.token_urlsafe(32)
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
ALLOWED_ORIGINS = {f"http://{h}" for h in ALLOWED_HOSTS}
MAX_BODY = 512 * 1024                     # le note possono essere lunghe
DOCS = Path(os.environ.get("LOCALOS_DOCS", Path.home() / "Documenti"))
NOTES = DOCS / "Note"
BROWSER = os.environ.get("LOCALOS_BROWSER", "firefox-esr")
WEB_PROFILE = os.environ.get("LOCALOS_WEB_PROFILE", str(Path.home() / ".local/share/localos/web-profile"))
PERSIST_HELPER = os.environ.get("LOCALOS_PERSIST_HELPER", "/usr/lib/localos/localos-persistence")
SUDO = os.environ.get("LOCALOS_SUDO", "sudo -n").split()   # solo i test lo cambiano
NOTE_NAME = re.compile(r"^[^/\\\x00-\x1f.][^/\\\x00-\x1f]{0,79}$")

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".woff2": "font/woff2",
}

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; "
    "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; "
    "base-uri 'none'; form-action https:"
)


# ---------------------------------------------------------------- comandi

def run(cmd, timeout=20):
    """Esegue un comando senza shell; restituisce (codice, stdout, stderr)."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except FileNotFoundError:
        return 127, "", f"comando non trovato: {cmd[0]}"
    except subprocess.TimeoutExpired:
        return 124, "", "tempo scaduto"


def nmcli_fields(line):
    """Divide una riga di 'nmcli -t' rispettando i ':' preceduti da backslash."""
    parts = re.split(r"(?<!\\):", line)
    return [p.replace("\\:", ":").replace("\\\\", "\\") for p in parts]


def wifi_networks():
    code, out, _ = run(["nmcli", "-t", "-f", "IN-USE,SSID,SIGNAL,SECURITY",
                        "device", "wifi", "list", "--rescan", "no"])
    if code != 0:
        return []
    best = {}
    for line in out.splitlines():
        f = nmcli_fields(line)
        if len(f) < 4 or not f[1]:
            continue
        net = {
            "ssid": f[1],
            "active": f[0].strip() == "*",
            "signal": int(f[2]) if f[2].isdigit() else 0,
            "secure": f[3] not in ("", "--"),
        }
        prev = best.get(net["ssid"])
        if prev is None or net["active"] or net["signal"] > prev["signal"]:
            if prev and prev["active"]:
                net["active"] = True
            best[net["ssid"]] = net
    return sorted(best.values(), key=lambda n: (not n["active"], -n["signal"]))


def volume():
    code, out, _ = run(["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"])
    m = re.search(r"Volume:\s*([\d.]+)", out) if code == 0 else None
    if not m:
        return None
    return {"level": round(float(m.group(1)) * 100), "muted": "MUTED" in out}


def battery():
    for bat in sorted(Path("/sys/class/power_supply").glob("BAT*")):
        try:
            return {
                "level": int((bat / "capacity").read_text().strip()),
                "charging": (bat / "status").read_text().strip() in ("Charging", "Full"),
            }
        except (OSError, ValueError):
            continue
    return None


def version():
    try:
        return Path("/etc/localos-release").read_text().strip()
    except OSError:
        return "sviluppo"


def persistence_active():
    try:
        return "/run/live/persistence/" in Path("/proc/mounts").read_text()
    except OSError:
        return False


def status():
    return {"wifi": wifi_networks(), "volume": volume(), "battery": battery(),
            "version": version(), "persistent": persistence_active()}


# ---------------------------------------------------------------- documenti e note

def safe_doc(rel):
    """Percorso dentro Documenti, oppure None se prova a uscirne."""
    target = (DOCS / str(rel)).resolve()
    root = DOCS.resolve()
    return target if target == root or root in target.parents else None


def list_files():
    DOCS.mkdir(parents=True, exist_ok=True)
    items = []
    root = DOCS.resolve()
    for path in sorted(root.rglob("*")):
        rel = path.relative_to(root)
        if any(part.startswith(".") for part in rel.parts) or len(rel.parts) > 3:
            continue
        if path.is_file():
            st = path.stat()
            items.append({"path": str(rel), "name": path.name, "size": st.st_size,
                          "mtime": int(st.st_mtime), "folder": str(rel.parent) if rel.parent != Path(".") else ""})
        if len(items) >= 500:
            break
    items.sort(key=lambda i: -i["mtime"])
    return items


def note_path(name):
    name = str(name).strip()
    if name.lower().endswith(".md"):
        name = name[:-3]
    if not NOTE_NAME.match(name):
        return None
    return NOTES / f"{name}.md"


def list_notes():
    NOTES.mkdir(parents=True, exist_ok=True)
    out = []
    for p in NOTES.glob("*.md"):
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        first = next((l.strip("# ").strip() for l in text.splitlines() if l.strip()), "")
        out.append({"name": p.stem, "mtime": int(p.stat().st_mtime), "preview": first[:90]})
    out.sort(key=lambda n: -n["mtime"])
    return out


# ---------------------------------------------------------------- azioni

def act_wifi_scan(_):
    code, _, err = run(["nmcli", "device", "wifi", "rescan"], timeout=30)
    return {"ok": code == 0, "error": err.strip() or None, "wifi": wifi_networks()}


def act_wifi_connect(data):
    ssid = str(data.get("ssid", ""))[:64]
    password = str(data.get("password", ""))[:128]
    if not ssid:
        return {"ok": False, "error": "Nome della rete mancante"}
    cmd = ["nmcli", "device", "wifi", "connect", ssid]
    if password:
        cmd += ["password", password]
    code, _, err = run(cmd, timeout=45)
    return {"ok": code == 0, "error": err.strip() or None}


def act_volume(data):
    if data.get("toggleMute"):
        code, _, err = run(["wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"])
    else:
        try:
            level = max(0, min(100, int(data.get("level", 50))))
        except (TypeError, ValueError):
            return {"ok": False, "error": "Livello non valido"}
        code, _, err = run(["wpctl", "set-volume", "-l", "1.0",
                            "@DEFAULT_AUDIO_SINK@", f"{level / 100:.2f}"])
    return {"ok": code == 0, "error": err.strip() or None, "volume": volume()}


def act_power(data):
    action = data.get("action")
    if action not in ("poweroff", "reboot"):
        return {"ok": False, "error": "Azione non valida"}
    code, _, err = run(["systemctl", action])
    return {"ok": code == 0, "error": err.strip() or None}


def spawn_browser(target):
    """Apre un indirizzo in una finestra normale del browser (profilo web, separato dal desktop)."""
    try:
        subprocess.Popen([BROWSER, "--profile", WEB_PROFILE, "--new-window", target],
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, start_new_session=True)
        return {"ok": True}
    except OSError as e:
        return {"ok": False, "error": f"Impossibile aprire il browser: {e}"}


def act_open(data):
    if "url" in data:
        url = str(data["url"]).strip()[:2048]
        if not re.match(r"^https?://", url, re.I):
            return {"ok": False, "error": "Indirizzo non valido"}
        return spawn_browser(url)
    if "file" in data:
        path = safe_doc(data["file"])
        if path is None or not path.is_file():
            return {"ok": False, "error": "File non trovato"}
        return spawn_browser(path.as_uri())
    return {"ok": False, "error": "Niente da aprire"}


def act_sync_start(_):
    """Avvia Syncthing solo su richiesta (nessuna connessione finché non lo apri)."""
    code, _, err = run(["systemctl", "--user", "start", "syncthing.service"])
    return {"ok": code == 0, "error": err.strip() or None}


def act_files(_):
    return {"ok": True, "files": list_files(), "root": str(DOCS)}


def act_notes_list(_):
    return {"ok": True, "notes": list_notes()}


def act_notes_read(data):
    p = note_path(data.get("name", ""))
    if p is None or not p.is_file():
        return {"ok": False, "error": "Nota non trovata"}
    return {"ok": True, "name": p.stem, "text": p.read_text(encoding="utf-8", errors="replace")}


def act_notes_write(data):
    p = note_path(data.get("name", ""))
    if p is None:
        return {"ok": False, "error": "Nome non valido: niente barre e non può iniziare con un punto"}
    text = str(data.get("text", ""))
    old = note_path(data["previous"]) if data.get("previous") else None
    if data.get("create") and p.exists():
        return {"ok": False, "error": "Esiste già una nota con questo nome"}
    NOTES.mkdir(parents=True, exist_ok=True)
    tmp = p.with_name(f".{p.name}.tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, p)                       # scrittura atomica: niente note a metà
    if old is not None and old != p and old.is_file():
        old.unlink()                         # rinomina
    return {"ok": True, "name": p.stem, "saved": int(time.time())}


def act_notes_delete(data):
    p = note_path(data.get("name", ""))
    if p is None or not p.is_file():
        return {"ok": False, "error": "Nota non trovata"}
    p.unlink()
    return {"ok": True}


def persistence_helper(action, stdin=None, timeout=20):
    try:
        r = subprocess.run([*SUDO, PERSIST_HELPER, action], input=stdin,
                           capture_output=True, timeout=timeout)
        return json.loads(r.stdout.decode() or "{}") or {
            "ok": False, "state": "unavailable",
            "message": "Funzione disponibile solo con local:os avviato dalla chiavetta"}
    except (OSError, ValueError, subprocess.TimeoutExpired) as e:
        return {"ok": False, "state": "unavailable", "message": f"Controllo non riuscito: {e}"}


def act_persistence_check(_):
    if persistence_active():
        return {"state": "active", "message": "Memoria persistente attiva"}
    return persistence_helper("check")


def act_persistence_create(data):
    phrase = str(data.get("phrase", ""))
    if len(phrase) < 8:
        return {"ok": False, "message": "La frase segreta deve avere almeno 8 caratteri"}
    return persistence_helper("create", stdin=phrase.encode("utf-8"), timeout=300)


ACTIONS = {
    "/api/open": act_open,
    "/api/files": act_files,
    "/api/sync/start": act_sync_start,
    "/api/notes/list": act_notes_list,
    "/api/notes/read": act_notes_read,
    "/api/notes/write": act_notes_write,
    "/api/notes/delete": act_notes_delete,
    "/api/persistence/check": act_persistence_check,
    "/api/persistence/create": act_persistence_create,
    "/api/wifi/scan": act_wifi_scan,
    "/api/wifi/connect": act_wifi_connect,
    "/api/volume": act_volume,
    "/api/power": act_power,
}


# ---------------------------------------------------------------- server

class Handler(BaseHTTPRequestHandler):
    server_version = "localos"
    sys_version = ""

    def log_message(self, *args):  # niente log delle richieste
        pass

    def send(self, code, body, ctype="application/json; charset=utf-8", extra=None):
        if isinstance(body, (dict, list)):
            body = json.dumps(body)
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def host_ok(self):
        return self.headers.get("Host", "") in ALLOWED_HOSTS

    def token_ok(self):
        return secrets.compare_digest(self.headers.get("X-Localos-Token", ""), TOKEN)

    def do_GET(self):
        if not self.host_ok():
            return self.send(403, {"error": "host non consentito"})
        path = self.path.split("?", 1)[0]

        if path == "/api/status":
            if not self.token_ok():
                return self.send(403, {"error": "token non valido"})
            return self.send(200, status())

        if path == "/":
            path = "/index.html"
        target = (SHELL_DIR / path.lstrip("/")).resolve()
        if SHELL_DIR not in target.parents or not target.is_file():
            return self.send(404, {"error": "non trovato"})

        ctype = MIME.get(target.suffix, "application/octet-stream")
        if target.suffix == ".html":
            html = target.read_text(encoding="utf-8").replace("__LOCALOS_TOKEN__", TOKEN)
            return self.send(200, html, ctype, {"Content-Security-Policy": CSP})
        return self.send(200, target.read_bytes(), ctype)

    def do_POST(self):
        if not self.host_ok():
            return self.send(403, {"error": "host non consentito"})
        if self.headers.get("Origin") not in ALLOWED_ORIGINS or not self.token_ok():
            return self.send(403, {"error": "richiesta non autorizzata"})
        action = ACTIONS.get(self.path.split("?", 1)[0])
        if action is None:
            return self.send(404, {"error": "non trovato"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = -1
        if length < 0 or length > MAX_BODY:
            return self.send(413, {"error": "richiesta troppo grande"})
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(data, dict):
                raise ValueError
        except ValueError:
            return self.send(400, {"error": "JSON non valido"})
        return self.send(200, action(data))


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
