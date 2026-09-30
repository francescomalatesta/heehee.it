# heehee.it

Un mini sito scherzoso: premi il pulsante, lascia la scheda aperta e prima o poi
Michael si fa sentire con un verso a caso. Tutto client side, nessun backend.

## Struttura

```
public/                 web root (è l'unica cartella da servire)
  index.html
  style.css
  app.js                logica: audio, timer casuale, animazioni
  sounds/
    manifest.json       elenco dei versi (id, file, label, weight)
    *.wav / *.mp3
tools/
  make-placeholders.py  genera versi segnaposto sintetici (solo stdlib)
  clips.csv             elenco dei versi veri: url YouTube, inizio, fine, nome
  build-clips.sh        scarica e ritaglia i versi veri (yt-dlp + ffmpeg)
```

## Sviluppo in locale

```sh
cd public && python3 -m http.server 8000
# poi apri http://localhost:8000
```

Serve un server HTTP: aprendo `index.html` come file il browser blocca il caricamento dei suoni.

## Versi

- **Segnaposto:** `python3 tools/make-placeholders.py`
- **Versi veri:** compila `tools/clips.csv` e lancia `./tools/build-clips.sh`.
  Lo script normalizza il volume ed esporta mp3 mono in `public/sounds/`,
  poi rigenera `manifest.json`. I download grezzi finiscono in `tools/.cache/` (ignorata da git).

## Frequenze

| Modalità        | Intervallo      |
| --------------- | --------------- |
| Smooth Criminal | ogni 2–5 minuti (predefinita) |
| Bad             | ogni 30–90 s    |
| Thriller        | ogni 3–10 s     |

Scorciatoia: **spazio** fa partire subito un verso.

## Deploy su Forge

1. Nuovo sito, dominio `heehee.it`, progetto di tipo *Static HTML*.
2. Collega questo repository e imposta la **web directory** su `/public`.
3. Lo script di deploy basta così:
   ```sh
   cd $FORGE_SITE_PATH
   git pull origin $FORGE_SITE_BRANCH
   ```
4. Attiva SSL con Let's Encrypt e *Quick Deploy*.

Per un ambiente di prova, crea un secondo sito (es. `dev.heehee.it`) sul branch di sviluppo.

---

Sito parodistico non ufficiale, senza alcun legame con gli eredi o le etichette di Michael Jackson.
