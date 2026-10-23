#!/bin/bash
# Запуск «Фрил-Бух» на локальном сервере.
cd "$(dirname "$0")" || exit 1
PORT=4174

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

printf '\n  Фрил-Бух — бухгалтерия для фрилансеров\n\n'
printf '  На этом Mac:  http://localhost:%s\n' "$PORT"
if [ -n "$IP" ]; then
  printf '  На телефоне:  http://%s:%s  (в той же Wi-Fi сети)\n' "$IP" "$PORT"
fi
printf '\n  Остановить: Ctrl+C\n\n'

(sleep 1; open "http://localhost:$PORT" 2>/dev/null) &
python3 -m http.server "$PORT"
