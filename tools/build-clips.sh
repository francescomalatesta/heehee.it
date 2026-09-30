#!/usr/bin/env bash
# Scarica e ritaglia i versi veri elencati in tools/clips.csv.
# Richiede: yt-dlp, ffmpeg, python3.
#
#   ./tools/build-clips.sh
#
# Per ogni riga del CSV: scarica l'audio (una volta sola, in tools/.cache),
# ritaglia [start, end], toglie il silenzio, aggiunge un micro-fade,
# uniforma il volume ed esporta public/sounds/<name>.mp3.
# Alla fine rigenera public/sounds/manifest.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CSV="$ROOT/tools/clips.csv"
CACHE="$ROOT/tools/.cache"
OUT="$ROOT/public/sounds"
mkdir -p "$CACHE" "$OUT"

tail -n +2 "$CSV" | while IFS=, read -r url start end name label weight; do
  [[ -z "${url// }" || "$url" == \#* ]] && continue
  id="$(python3 -c 'import sys,urllib.parse as u; q=u.urlparse(sys.argv[1]); print(u.parse_qs(q.query).get("v",[q.path.strip("/")])[0])' "$url")"
  src="$CACHE/$id.wav"
  if [[ ! -f "$src" ]]; then
    echo "↓ $url"
    yt-dlp -q -x --audio-format wav -o "$CACHE/$id.%(ext)s" "$url"
  fi
  echo "✂ $name ($start → $end)"
  ffmpeg -loglevel error -y -ss "$start" -to "$end" -i "$src" \
    -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,afade=t=in:d=0.01,loudnorm=I=-16:TP=-1.5:LRA=11" \
    -ac 1 -ar 44100 -b:a 128k "$OUT/$name.mp3"
done

python3 - "$CSV" "$OUT/manifest.json" <<'EOF'
import csv, json, sys
rows = [r for r in csv.DictReader(open(sys.argv[1])) if r["url"].strip() and not r["url"].startswith("#")]
manifest = [{"id": r["name"], "file": f"sounds/{r['name']}.mp3", "label": r["label"], "weight": int(r["weight"] or 1)} for r in rows]
json.dump(manifest, open(sys.argv[2], "w"), indent=2, ensure_ascii=False)
print(f"manifest.json: {len(manifest)} versi")
EOF
