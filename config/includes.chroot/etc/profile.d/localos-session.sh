# Sul primo terminale avvia l'interfaccia grafica di local:os.
# Se il browser viene chiuso, la sessione si chiude e il login automatico la riapre.
if [ -z "$WAYLAND_DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ] && [ "$(id -un)" = "localos" ]; then
  # Tastiera: usa la lingua scelta all'avvio (italiano se non indicato)
  [ -r /etc/default/keyboard ] && . /etc/default/keyboard
  export XKB_DEFAULT_LAYOUT="${XKBLAYOUT:-it}"
  export XKB_DEFAULT_VARIANT="${XKBVARIANT:-}"
  export XKB_DEFAULT_OPTIONS="${XKBOPTIONS:-}"
  exec cage -s -- /usr/local/bin/localos-session
fi
