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
    manifest.json       elenco dei file mp3 (generato)
    *.mp3
tools/
  update-manifest.py    rigenera manifest.json dagli mp3 presenti
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

1. Metti gli mp3 in `public/sounds/`.
2. Lancia `python3 tools/update-manifest.py` per aggiornare l'elenco.

Il **nome del file** decide il testo mostrato a schermo, in maiuscolo e con il punto esclamativo:

| File                   | Testo               |
| ---------------------- | ------------------- |
| `heehee.mp3`           | HEEHEE!             |
| `hee-hee.mp3`          | HEE-HEE!            |
| `annie_are_you_ok.mp3` | ANNIE ARE YOU OK!   |
| `shamone-2.mp3`        | SHAMONE! (il numero finale serve per le varianti e non compare) |

In alternativa puoi elencare i versi in `tools/clips.csv` e lanciare `./tools/build-clips.sh`:
scarica da YouTube, ritaglia, normalizza il volume, esporta gli mp3 e aggiorna l'elenco.
I download grezzi finiscono in `tools/.cache/` (ignorata da git).

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
