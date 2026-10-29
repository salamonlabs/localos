# local:os

*Il nome tecnico è `localos`: repository, utente, file di sistema e immagine (`localos-amd64.iso`).*

Un sistema operativo leggero, libero e attento alla privacy, che usa il web come interfaccia, nello spirito di ChromeOS Flex. Pensato per ridare vita a computer vecchi e per essere distribuito liberamente.

## Com'è fatto

| Strato | Scelta | Perché |
|---|---|---|
| Base | Debian 13 "trixie" (amd64) | Stabile, libera, aggiornata per anni |
| Grafica | Cage (compositor Wayland "kiosk") | Mostra una sola app a schermo intero, pesa pochissimo |
| Browser | Firefox ESR + uBlock Origin | Pacchetti ufficiali Debian, policy di privacy bloccate |
| Interfaccia | Shell web locale (`/usr/share/localos/shell`) | Home con ricerca, app web, Wi-Fi, volume, spegnimento |
| Servizio di sistema | `localos-shell.py` (Python, solo libreria standard) | Collega la home a Wi-Fi, audio, batteria e alimentazione |

All'avvio: login automatico → Cage → Firefox, che apre la home su `http://127.0.0.1:8088`.

## Privacy, già attiva

- **Browser**: niente telemetria, studi, Pocket o account Mozilla; protezione antitracciamento rigorosa e bloccata; cookie di terze parti isolati; HTTPS-only; Global Privacy Control; ricerca predefinita DuckDuckGo; uBlock Origin preinstallato.
- **DNS cifrato** (DNS-over-TLS verso Quad9) per tutto il sistema.
- **Firewall** che blocca ogni connessione in ingresso.
- **MAC address casuale** durante la ricerca Wi-Fi e diverso per ogni rete; IPv6 con indirizzi temporanei; il nome del computer non viene comunicato al router.
- **Ora esatta e autenticata** (NTS), DNS cifrato anche nel browser con Encrypted Client Hello, protezione antitracciamento rigorosa.
- **Servizio locale protetto**: ascolta solo su 127.0.0.1, verifica Host e Origin e richiede un token generato a ogni avvio, così i siti web non possono comandare il sistema.
- Nessun font o script caricato da server esterni nella home.

## Come costruire l'ISO

### Opzione A – Con GitHub (consigliata se hai un Mac)

1. Crea un repository su GitHub e caricaci questa cartella.
2. Vai su **Actions → Costruisci ISO → Run workflow**.
3. Dopo circa 15–25 minuti scarichi `localos-iso` dagli artefatti della build.

### Opzione B – Su un computer o una VM Debian 13 amd64

```sh
sudo apt install live-build
./build.sh
```

Il risultato è `localos-amd64.iso`.

## Come provarlo

- **Su chiavetta USB**: scrivi l'ISO con balenaEtcher o `dd`, poi avvia il PC dalla chiavetta.
- **In macchina virtuale** (su Linux):
  ```sh
  qemu-system-x86_64 -m 2048 -enable-kvm -cdrom localos-amd64.iso
  ```
- **Su Mac**: con UTM, scegliendo "Emula" e architettura x86_64 (più lento, ma funziona per le prove).

Per sviluppare solo la home web, sul tuo computer basta:

```sh
LOCALOS_SHELL_DIR=config/includes.chroot/usr/share/localos/shell \
  python3 config/includes.chroot/usr/lib/localos/localos-shell.py
```

e aprire `http://127.0.0.1:8088` (Wi-Fi e volume risulteranno vuoti fuori da local:os).

**Terminale per la diagnosi**: `Ctrl + Alt + F2` (utente `localos`, password `live`), poi `journalctl -b -p err --no-pager | tail -n 40`. Per tornare all'interfaccia: `Ctrl + Alt + F1`.

## Memoria persistente

Di default local:os è *live*: dimentica tutto allo spegnimento. Da **Impostazioni › Memoria persistente** si crea una memoria cifrata nello spazio libero della chiavetta:

- viene aggiunta **una** partizione dopo l'immagine (tabella MBR, come nelle ISO Debian); il disco del computer non viene mai toccato;
- la partizione è cifrata con LUKS2 (Argon2id, 256 MB di memoria: sicura ma sopportabile dai PC vecchi) e contiene un ext4 con etichetta `persistence`;
- `persistence.conf` salva `/home` (Documenti, note, impostazioni, browser) e le reti Wi-Fi;
- a ogni avvio live-boot chiede la frase segreta. **Senza frase i dati non si recuperano.** Riscrivere la chiavetta con balenaEtcher cancella la memoria.

Lo script è `/usr/lib/localos/localos-persistence` (`check` / `create`); l'utente può eseguire solo quello come amministratore (`/etc/sudoers.d/localos`).

## Struttura

```
auto/config                     opzioni di live-build
config/package-lists/           pacchetti installati
config/hooks/live/              script eseguiti durante la costruzione
config/includes.chroot/         file copiati così come sono nel sistema
  etc/firefox/policies/         policy di privacy del browser
  etc/nftables.conf             firewall
  etc/NetworkManager/conf.d/    privacy di rete
  etc/systemd/resolved.conf.d/  DNS cifrato
  etc/chrony/sources.d/         ora con NTS
  etc/sysctl.d/                 irrobustimento del kernel
  etc/profile.d/                avvio dell'interfaccia grafica e tastiera
  usr/lib/localos/localos-shell.py   servizio locale
  usr/share/localos/shell/      interfaccia web (HTML/CSS/JS)
.github/workflows/              build automatica dell'ISO
branding/localos-orbit-kit.zip  identità visiva completa (sorgente, compressa)
branding/boot/                  sfondi del menu di avvio (1920×1080 GRUB, 640×480 BIOS)
branding/wallpaper/             sfondo "onde di seta" (con e senza logo, fino a 4K) e script che lo genera
```

## Identità visiva

Il segno **Orbit**: un anello aperto con un punto, cioè l'utente al centro del proprio sistema. Payoff: *Libero. Locale. Tuo.*

| Colore | Codice | Uso |
|---|---|---|
| Blu | `#3665F3` | colore principale, link e pulsanti (tema chiaro) |
| Ciano | `#20C9E8` | punto del simbolo, accento nel tema scuro |
| Viola | `#8055EF` | inizio del gradiente |
| Notte | `#10182C` | testo, sfondo scuro, menu di avvio |
| Ghiaccio | `#F5F8FF` | sfondo chiaro |

Lo **sfondo** della home è `branding/wallpaper/sfondo-1920x1080.jpg`: un'immagine statica già pronta, quindi leggera anche sui PC vecchi. Le versioni con logo servono per presentazioni, sito e social.

Kit completo in `branding/localos-orbit-kit.zip` (regole d'uso in `06-guidelines/LEGGIMI.txt`).

## Limiti attuali

- Funziona **in modalità live**: le modifiche non restano dopo lo spegnimento. L'installazione su disco arriva nella Fase 4.
- Solo **PC a 64 bit** (amd64): Debian non supporta più l'installazione a 32 bit.
- Include **firmware non libero** (ramo `non-free-firmware`) per far funzionare Wi-Fi e schede video dei portatili più comuni. Va dichiarato chiaramente quando si distribuisce.
- Con il DNS cifrato rigoroso, le reti con pagina di accesso (hotel, treni) possono non aprirsi: vedi `90-localos-privacy.conf`.
- Non è ancora stato provato su hardware reale: la prima build serve proprio a scoprire cosa manca.

## Prossime fasi

1. ~~Prototipo avviabile~~
2. Versione 0.2 – correzioni e privacy rafforzata senza costi di prestazioni:
   - ✅ Wi-Fi funzionante (wpasupplicant), utente live creato correttamente (user-setup)
   - ✅ Ora esatta e autenticata con NTS (chrony), senza server suggeriti dal router
   - ✅ DoH in Firefox + Encrypted Client Hello (nasconde i siti visitati al provider)
   - ✅ Protezione antitracciamento "Rigorosa", rimozione parametri traccianti, rifiuto banner cookie, niente suggerimenti di ricerca, referrer ridotto
   - ✅ Niente controlli di connettività verso server esterni
   - ✅ zram al posto della swap, log di sistema solo in RAM
   - ✅ Irrobustimento del kernel (sysctl)
   - ✅ Decodifica video H.264 per tutti i siti
   - Da fare: AppArmor con profilo per il browser, liste uBlock extra, MAC casuale sulle reti pubbliche, pagina "Diagnostica"
   - *Eventuale*: "modalità anonima" opzionale con Tor Browser originale (non Tor di sistema: si perderebbe velocità e compatibilità, e un Firefox modificato su Tor è riconoscibile)
   - Provato su: Lenovo ThinkPad E14 (2023) – avvio con Secure Boot, Wi-Fi, ora NTS ed ECH verificati
   - ✅ 0.2.1: nuovo nome local:os, identità visiva Orbit (home e menu di avvio), tastiera italiana, sfondo "onde di seta" nella home – verificata sul Lenovo E14
3. Versione 0.3 – local:os diventa **local-first** ← siamo qui:
   - Memoria persistente cifrata (LUKS2, Argon2id) nello spazio libero della chiavetta, creata da Impostazioni: ricorda Wi-Fi, impostazioni, note e file. La frase segreta si chiede all'avvio
   - Nuova interfaccia desktop: barra di sistema (Wi-Fi, suono, batteria, ora, spegnimento), dock, ricerca con `Ctrl + Spazio`
   - Il desktop gira in Firefox in modalità kiosk; i siti si aprono in finestre normali del browser sopra il desktop (profilo separato)
   - App locali offline: **Note** (file Markdown in Documenti › Note), **File** (cartella Documenti), **Sincronizza** (Syncthing, da pari a pari), **Impostazioni**
   - I dati restano file in formati aperti: nessun blocco, nessun cloud obbligatorio
   - Da fare in 0.3.x: Disegno (Excalidraw offline), app proprie con sincronizzazione CRDT (Automerge/Yjs), impostazioni di lingua, tastiera e luminosità, gestione download e aggiornamenti
4. Versione 0.4 – vero desktop leggero (labwc): barra e dock sempre visibili, siti e app in finestre
5. Installer su disco con cifratura completa (LUKS; Adiantum sui PC senza accelerazione AES) e pulizia di cookie/cronologia alla chiusura
6. Aggiornamenti automatici e sistema di sola lettura con aggiornamenti A/B

## Licenza

Da scegliere prima della distribuzione pubblica. Suggerimento: **GPL-3.0** per il codice di local:os; i pacchetti Debian mantengono le proprie licenze (vedi `/usr/share/doc/*/copyright` nel sistema).
