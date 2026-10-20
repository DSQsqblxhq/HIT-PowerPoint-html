#!/usr/bin/env bash
set -euo pipefail

# A headless fullscreen flag does not move the native browser window. Use two
# XRandR outputs and a window manager to verify real fullscreen placement.
display_dir=$(mktemp -d)
display_number=90
while [[ -e /tmp/.X${display_number}-lock ]]; do display_number=$((display_number + 1)); done
export DISPLAY=:$display_number
cleanup() {
  kill "${wm_pid:-}" 2>/dev/null || true
  sudo kill "${x_pid:-}" 2>/dev/null || true
  rm -rf "$display_dir"
}
trap cleanup EXIT
cat > "$display_dir/xorg.conf" <<'XORG'
Section "Device"
  Identifier "DummyDevice"
  Driver "dummy"
  VideoRam 256000
EndSection
Section "Monitor"
  Identifier "DummyMonitor"
  HorizSync 5.0-1000.0
  VertRefresh 5.0-200.0
  Modeline "1920x1080" 148.50 1920 2008 2052 2200 1080 1084 1089 1125 +HSync +VSync
  Modeline "2560x1440" 241.50 2560 2608 2640 2720 1440 1443 1448 1481 +HSync -VSync
EndSection
Section "Screen"
  Identifier "DummyScreen"
  Device "DummyDevice"
  Monitor "DummyMonitor"
  DefaultDepth 24
  SubSection "Display"
    Depth 24
    Virtual 4480 1440
  EndSubSection
EndSection
XORG
sudo Xorg "$DISPLAY" -config "$display_dir/xorg.conf" -noreset -nolisten tcp -ac > "$display_dir/xorg.log" 2>&1 &
x_pid=$!
for attempt in {1..100}; do
  if xdpyinfo >/dev/null 2>&1; then break; fi
  if ! kill -0 "$x_pid" 2>/dev/null; then cat "$display_dir/xorg.log"; exit 1; fi
  sleep .1
done
xdpyinfo >/dev/null
xrandr --query
xrandr --newmode HIT-1920x1080 148.50 1920 2008 2052 2200 1080 1084 1089 1125 +HSync +VSync
xrandr --newmode HIT-2560x1440 241.50 2560 2608 2640 2720 1440 1443 1448 1481 +HSync -VSync
xrandr --addmode DUMMY0 HIT-1920x1080
xrandr --addmode DUMMY1 HIT-2560x1440
xrandr --output DUMMY0 --mode HIT-1920x1080 --primary --pos 0x0 --output DUMMY1 --mode HIT-2560x1440 --pos 1920x0
openbox --sm-disable > "$display_dir/openbox.log" 2>&1 &
wm_pid=$!
for attempt in {1..100}; do
  if xprop -root _NET_SUPPORTING_WM_CHECK | rg -q 'window id'; then break; fi
  sleep .1
done
xrandr --listmonitors
HIT_NATIVE_DISPLAYS=1 node tests/web-presenter-fullscreen.cjs
