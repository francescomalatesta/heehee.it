#!/usr/bin/env python3
"""Rigenera public/sounds/manifest.json con l'elenco degli mp3 presenti.

Il sito non può leggere il contenuto di una cartella, quindi usa questo elenco.
Lancialo ogni volta che aggiungi, rinomini o togli un file:

    python3 tools/update-manifest.py
"""
import json
from pathlib import Path

SOUNDS = Path(__file__).resolve().parent.parent / "public" / "sounds"

files = sorted(p.name for p in SOUNDS.glob("*.mp3"))
(SOUNDS / "manifest.json").write_text(json.dumps(files, indent=2, ensure_ascii=False) + "\n")
print(f"manifest.json: {len(files)} versi")
for f in files:
    print(" ", f)
