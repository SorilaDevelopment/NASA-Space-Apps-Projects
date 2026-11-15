#!/usr/bin/env bash
# terra.pura one-command installer for macOS and Linux.
# NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
# designed, reviewed and tested by the terra.pura team.
#
# Run in a terminal:
#   curl -fsSL 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.sh' | bash
#
# Stop it (keeps it installed):   curl -fsSL 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.sh' | TP_MODE=stop bash
# Uninstall it completely:        curl -fsSL 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.sh' | TP_MODE=remove bash
#
# It downloads terra.pura and asks how you want to run it: on this computer, shared on your network,
# kept running in the background, or removed. Needs python3 (3.8+), which macOS and most Linux systems have.
# Optional settings for scripted use: TP_MODE=local|lan|always|always-lan|stop|remove  TP_PORT=5173
set -euo pipefail

REPO='SorilaDevelopment/NASA-Space-Apps-Projects'
BRANCH='main'
FOLDER='2026 Hackathon - terra.pura'
OS="$(uname -s)"
if [ "$OS" = "Darwin" ]; then HOME_DIR="$HOME/Library/Application Support/terra.pura"; else HOME_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/terra.pura"; fi
APP_DIR="$HOME_DIR/app"
PLIST="$HOME/Library/LaunchAgents/dev.sorila.terrapura.plist"
UNIT="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/terrapura.service"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '\033[32m%s\033[0m\n' "$1"; }
warn() { printf '\033[33m%s\033[0m\n' "$1"; }
say()  { printf '%s\n' "$1"; }

stop_background() {
  if [ "$OS" = "Darwin" ]; then
    [ -f "$PLIST" ] && launchctl unload "$PLIST" 2>/dev/null || true
  elif command -v systemctl >/dev/null 2>&1; then
    systemctl --user stop terrapura.service 2>/dev/null || true
  fi
  pkill -f "$APP_DIR/serve.py" 2>/dev/null || true
}

stop_all() {
  echo; bold 'Stopping terra.pura'
  if pgrep -f "$APP_DIR/serve.py" >/dev/null 2>&1; then was=yes; else was=no; fi
  stop_background
  if [ "$OS" = "Darwin" ]; then [ -f "$PLIST" ] && { rm -f "$PLIST"; say '  It will no longer start when you log in.'; }
  elif command -v systemctl >/dev/null 2>&1 && [ -f "$UNIT" ]; then
    systemctl --user disable terrapura.service 2>/dev/null || true; rm -f "$UNIT"; systemctl --user daemon-reload 2>/dev/null || true
    say '  It will no longer start when you log in.'
  fi
  if [ "$was" = "yes" ]; then say '  Stopped the running server.'; else say "  It wasn't running."; fi
  [ -d "$APP_DIR" ] && ok '  It is still installed: run the install command again to start it, or choose 6 to uninstall.'
  return 0
}

remove_all() {
  echo; bold 'Removing terra.pura'
  stop_background
  if [ "$OS" = "Darwin" ]; then rm -f "$PLIST"
  elif command -v systemctl >/dev/null 2>&1; then
    systemctl --user disable terrapura.service 2>/dev/null || true; rm -f "$UNIT"; systemctl --user daemon-reload 2>/dev/null || true
  fi
  rm -rf "$HOME_DIR"
  ok '  Done. Your farms were stored in your browser; clear them in terra.pura (Settings > Start over) or with your browser data.'
}

find_python() {
  for c in python3 python; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' 2>/dev/null; then
      command -v "$c"; return 0
    fi
  done
  return 1
}

port_free() { "$PY" -c "import socket,sys; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('0.0.0.0', int(sys.argv[1]))); s.close()" "$1" 2>/dev/null; }

lan_ip() { "$PY" -c "import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('192.0.2.1', 80)); print(s.getsockname()[0])" 2>/dev/null || true; }

wait_server() { for _ in $(seq 1 40); do curl -fsS -o /dev/null "http://127.0.0.1:$1/" 2>/dev/null && return 0; sleep 0.25; done; return 1; }

open_browser() {
  [ -n "${TP_NOBROWSER:-}" ] && return 0
  if [ "$OS" = "Darwin" ]; then open "$1"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1 || true; fi
}

show_urls() {
  echo; bold 'terra.pura is running'
  ok "  On this computer:   http://localhost:$1"
  if [ "$2" = "yes" ]; then
    ip="$(lan_ip)"; [ -n "$ip" ] && ok "  On your network:    http://$ip:$1  (phones, tablets and other computers on the same Wi-Fi)"
  fi
}

get_app() {
  mkdir -p "$HOME_DIR"
  if [ -n "${TP_SOURCE:-}" ]; then say "  Copying from $TP_SOURCE..."; rm -rf "$APP_DIR"; cp -R "$TP_SOURCE" "$APP_DIR"; return; fi
  say "  Downloading terra.pura from github.com/$REPO..."
  tmp="$(mktemp -d)"
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" | tar -xz -C "$tmp"
  src="$(find "$tmp" -mindepth 2 -maxdepth 2 -type d -name "$FOLDER" | head -n 1)"
  [ -f "$src/serve.py" ] || { warn "Couldn't find '$FOLDER' in the download."; exit 1; }
  rm -rf "$APP_DIR"; mv "$src" "$APP_DIR"; rm -rf "$tmp"
}

# ------------------------------------------------------------------------------------------------
echo
printf '  \033[1mterra\033[32m.\033[0m\033[1mpura\033[0m\n'
say "  Find out what's worth growing on your land, using NASA Earth data."

MODE="${TP_MODE:-}"
if [ -z "$MODE" ]; then
  echo; bold 'How do you want to run it?'
  say '  [1] Open it now, on this computer only             (default)'
  say '  [2] Open it now, and share it on my network (LAN)   (phones and other computers on your Wi-Fi)'
  say '  [3] Keep it running in the background 24/7         (starts when you log in)'
  say '  [4] Keep it running 24/7 AND share it on my network'
  say '  [5] Stop terra.pura                               (stops it and turns off start-at-login; keeps it installed)'
  say '  [6] Uninstall terra.pura from this computer'
  printf '  Choose 1-6: '
  read -r choice < /dev/tty || choice=1
  case "$choice" in 2) MODE=lan ;; 3) MODE=always ;; 4) MODE=always-lan ;; 5) MODE=stop ;; 6) MODE=remove ;; *) MODE=local ;; esac
fi
if [ "$MODE" = "stop" ]; then stop_all; exit 0; fi
if [ "$MODE" = "remove" ]; then remove_all; exit 0; fi

LAN=no; ALWAYS=no
case "$MODE" in lan) LAN=yes ;; always) ALWAYS=yes ;; always-lan) LAN=yes; ALWAYS=yes ;; esac
HOST=127.0.0.1; [ "$LAN" = "yes" ] && HOST=0.0.0.0

echo; bold 'Getting everything ready'
if ! PY="$(find_python)"; then
  warn '  terra.pura needs Python 3.8 or newer.'
  if [ "$OS" = "Darwin" ]; then say '  Install it with:  xcode-select --install   (or: brew install python)'
  else say '  Install it with your package manager, e.g.:  sudo apt install python3   or   sudo dnf install python3'; fi
  say '  Then run this command again.'; exit 1
fi
say "  Using Python at $PY"
stop_background
get_app

PORT="${TP_PORT:-5173}"
while ! port_free "$PORT"; do PORT=$((PORT + 1)); done

if [ "$LAN" = "yes" ] && [ "$OS" != "Darwin" ] && command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q 'Status: active'; then
  warn "  Your firewall (ufw) is on. To let other devices in, run:  sudo ufw allow $PORT/tcp"
fi
[ "$LAN" = "yes" ] && [ "$OS" = "Darwin" ] && say '  If macOS asks whether Python may accept incoming connections, click Allow.'

if [ "$ALWAYS" = "yes" ]; then
  if [ "$OS" = "Darwin" ]; then
    mkdir -p "$(dirname "$PLIST")"
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>dev.sorila.terrapura</string>
  <key>ProgramArguments</key><array><string>$PY</string><string>$APP_DIR/serve.py</string><string>$PORT</string><string>--host</string><string>$HOST</string><string>--quiet</string></array>
  <key>WorkingDirectory</key><string>$APP_DIR</string>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
</dict></plist>
EOF
    launchctl load -w "$PLIST"
  elif command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; then
    mkdir -p "$(dirname "$UNIT")"
    cat > "$UNIT" <<EOF
[Unit]
Description=terra.pura local server

[Service]
WorkingDirectory=$APP_DIR
ExecStart="$PY" "$APP_DIR/serve.py" $PORT --host $HOST --quiet
Restart=on-failure

[Install]
WantedBy=default.target
EOF
    systemctl --user daemon-reload
    systemctl --user enable --now terrapura.service
    say '  Tip: to keep it running even when you are logged out, run:  loginctl enable-linger "$USER"'
  else
    warn "  This system has no launchd or systemd user services, so it can't start automatically."
    say  '  Starting it in the background for now instead.'
    nohup "$PY" "$APP_DIR/serve.py" "$PORT" --host "$HOST" --quiet >/dev/null 2>&1 &
  fi
  wait_server "$PORT" || { warn "  The server didn't answer. Try option 1 to see any error messages."; exit 1; }
  show_urls "$PORT" "$LAN"
  say '  It now runs in the background and starts automatically when you log in.'
  say '  To stop it, run the same command again and choose 5 (or 6 to uninstall).'
  open_browser "http://localhost:$PORT"
  exit 0
fi

# foreground: runs in this terminal until you press Ctrl+C
cd "$APP_DIR"
"$PY" serve.py "$PORT" --host "$HOST" &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; exit 0' INT TERM
wait_server "$PORT" || { warn "  The server didn't start. See the messages above."; kill $SERVER 2>/dev/null; exit 1; }
show_urls "$PORT" "$LAN"
say '  Keep this terminal open while you use it. Press Ctrl+C to stop.'
open_browser "http://localhost:$PORT"
wait $SERVER
