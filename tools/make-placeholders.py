#!/usr/bin/env python3
"""Genera versi SEGNAPOSTO sintetici in public/sounds/.

Servono solo finché non ci sono i clip veri (vedi tools/build-clips.sh).
Solo libreria standard: sintesi additiva con formanti vocalici molto grezzi,
un po' di vibrato e un soffio di rumore per le consonanti.

    python3 tools/make-placeholders.py
"""
import json
import math
import random
import struct
import wave
from pathlib import Path

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public" / "sounds"

# Formanti (Hz) delle vocali: F1, F2, F3
VOWELS = {
    "i": (300, 2300, 3000),
    "a": (750, 1200, 2600),
    "o": (500, 900, 2500),
    "u": (350, 800, 2300),
}


def lerp(a, b, t):
    return a + (b - a) * t


def formant_gain(freq, formants, width=180.0):
    g = 0.0
    for i, f in enumerate(formants):
        g += math.exp(-((freq - f) / (width * (1 + i * 0.6))) ** 2) / (1 + i)
    return 0.08 + g


def voice(dur, f0_curve, vowel_curve, vibrato=6.0, depth=0.03, grit=0.0):
    """f0_curve e vowel_curve: funzioni t∈[0,1] → Hz / tupla di formanti."""
    n = int(dur * SR)
    phases = [0.0] * 24
    out = []
    for i in range(n):
        t = i / n
        f0 = f0_curve(t) * (1 + depth * math.sin(2 * math.pi * vibrato * i / SR))
        formants = vowel_curve(t)
        s = 0.0
        for k in range(1, 25):
            fk = f0 * k
            if fk > 9000:
                break
            phases[k - 1] += 2 * math.pi * fk / SR
            s += math.sin(phases[k - 1]) * formant_gain(fk, formants) / k ** 0.6
        if grit:
            s *= 1 + grit * (random.random() - 0.5)
        out.append(s)
    return envelope(out, 0.012, 0.06)


def noise(dur, brightness=0.85, amp=0.35):
    """Rumore passa-alto: 'h', 'sh'."""
    n = int(dur * SR)
    prev_in = prev_out = 0.0
    out = []
    for _ in range(n):
        x = random.uniform(-1, 1)
        y = brightness * (prev_out + x - prev_in)
        prev_in, prev_out = x, y
        out.append(y * amp)
    return envelope(out, 0.01, 0.03)


def silence(dur):
    return [0.0] * int(dur * SR)


def envelope(samples, attack, release):
    n = len(samples)
    a, r = int(attack * SR), int(release * SR)
    for i in range(n):
        g = 1.0
        if i < a:
            g = i / a
        elif i > n - r:
            g = max(0.0, (n - i) / r)
        samples[i] *= g
    return samples


def morph(v1, v2):
    return lambda t: tuple(lerp(a, b, t) for a, b in zip(VOWELS[v1], VOWELS[v2]))


def still(v):
    return lambda t: VOWELS[v]


def normalize(samples, peak=0.89):
    m = max(abs(s) for s in samples) or 1.0
    return [s / m * peak for s in samples]


def write(name, samples):
    samples = normalize(samples + silence(0.05))
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(s * 32767)) for s in samples))


def hee():
    return noise(0.05, amp=0.25) + voice(
        0.17, lambda t: lerp(1050, 1500, min(1, t * 1.6)) - 250 * max(0, t - 0.7), still("i")
    )


CLIPS = [
    ("hee-hee-01", "HEE-HEE!", 3, lambda: hee() + silence(0.06) + hee()),
    ("hee-01", "HEE!", 2, lambda: noise(0.05, amp=0.25) + voice(0.32, lambda t: 1100 + 500 * math.sin(math.pi * t), still("i"), depth=0.04)),
    ("ow-01", "OW!", 2, lambda: voice(0.36, lambda t: 650 + 550 * math.sin(math.pi * min(1, t * 1.3)), morph("a", "u"), grit=0.4)),
    ("aaow-01", "AAOW!", 1, lambda: voice(0.8, lambda t: 800 + 420 * math.sin(math.pi * t * 0.9), lambda t: morph("a", "o")(min(1, t * 1.4)), vibrato=7, depth=0.05, grit=0.3)),
    ("shamone-01", "SHAMONE!", 1, lambda: noise(0.12, brightness=0.95, amp=0.3) + voice(0.18, lambda t: 440, still("a")) + voice(0.34, lambda t: lerp(520, 900, t), morph("o", "i"))),
    ("dah-01", "DAH!", 1, lambda: voice(0.14, lambda t: 300 - 40 * t, still("a"), depth=0.0, grit=0.6)),
    ("hoo-01", "HOO!", 1, lambda: noise(0.05, amp=0.25) + voice(0.26, lambda t: 1150 - 150 * t, still("u"))),
]


def main():
    random.seed(7)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name, label, weight, make in CLIPS:
        write(name, make())
        manifest.append({"id": name, "file": f"sounds/{name}.wav", "label": label, "weight": weight})
        print("ok", name)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
