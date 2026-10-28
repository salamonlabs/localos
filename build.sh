   #!/bin/sh
   # Costruisce l'immagine ISO di local:os.
   # Va eseguito su Debian 13 (trixie) amd64 con il pacchetto live-build installato:
   #   sudo apt install live-build
   set -e

   # live-build richiede i permessi di root
   if [ "$(id -u)" -ne 0 ]; then
     exec sudo "$0" "$@"
   fi

   cd "$(dirname "$0")"
   chmod +x auto/* config/hooks/live/*.hook.chroot \
     config/includes.chroot/usr/local/bin/localos-session \
     config/includes.chroot/usr/lib/localos/localos-shell.py

   # Grafica del menu di avvio: parte dai bootloader standard di live-build
   # e sostituisce solo le immagini di sfondo con quelle di local:os.
   apply_boot_brand() {
     src=/usr/share/live/build/bootloaders
     [ -d "$src" ] || return 0
     rm -rf config/bootloaders
     # -a mantiene i collegamenti così come sono: live-build li risolve dentro il sistema in costruzione
     cp -a "$src" config/bootloaders
     echo "File dei bootloader:"; find config/bootloaders | sort
     find config/bootloaders \( -type f -o -type l \) \( -name 'splash*.png' -o -name 'splash*.svg' \) | while read -r f; do
       # GRUB (PC moderni, UEFI) scala l'immagine: alta risoluzione.
       # isolinux (PC vecchi, BIOS) richiede esattamente 640x480.
       case "$f" in
         *grub*) size=1920x1080 ;;
         *) size=640x480 ;;
       esac
       rm -f "$f"
       cp "branding/boot/splash-$size.${f##*.}" "$f"
       echo "Grafica di avvio: $f -> $size"
     done
   }

   lb clean --purge
   apply_boot_brand
   lb config
   lb build

   ISO=$(ls -1 *.iso 2>/dev/null | head -n 1)
   if [ -n "$ISO" ]; then
     mv "$ISO" localos-amd64.iso
     echo "Fatto: $(pwd)/localos-amd64.iso"
   else
     echo "Build terminata senza ISO: controlla build.log" >&2
     exit 1
   fi
