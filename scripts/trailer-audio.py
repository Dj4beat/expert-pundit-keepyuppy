#!/usr/bin/env python3
"""Synthesize KeepyUppy's original 34-second stereo score (no sampled audio).

Run: python3 scripts/trailer-audio.py
Requires Python 3 + numpy. Output is an editable production intermediate.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import wave

import numpy as np

RATE = 48_000
DURATION = 34.0
RNG = np.random.default_rng(17062026)
SCORE = np.zeros((int(DURATION * RATE), 2), dtype=np.float64)
CUES: list[dict[str, float | str]] = []


def add(signal: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.0) -> None:
    """Constant-power pan plus two quiet, short stadium reflections."""
    for delay, attenuation, placement in ((0, 1, pan), (0.083, 0.14, -pan), (0.171, 0.07, pan)):
        start = int((at + delay) * RATE)
        length = min(len(signal), len(SCORE) - start)
        if length <= 0:
            continue
        angle = (float(np.clip(placement, -1, 1)) + 1) * np.pi / 4
        stereo = np.array([np.cos(angle), np.sin(angle)])
        SCORE[start : start + length] += signal[:length, None] * stereo * gain * attenuation


def times(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * RATE), dtype=np.float64) / RATE


def filtered_noise(seconds: float, cutoff: float = 1500) -> np.ndarray:
    noise = RNG.normal(0, 1, int(seconds * RATE))
    frequencies = np.fft.rfftfreq(len(noise), 1 / RATE)
    spectrum = np.fft.rfft(noise)
    result = np.fft.irfft(spectrum / (1 + (frequencies / cutoff) ** 4), n=len(noise))
    return result / max(float(np.std(result)), 1e-8)


def cue(at: float, name: str) -> None:
    CUES.append({"time": at, "event": name})


def impact(at: float, gain: float = 0.8, pan: float = 0.0) -> None:
    t = times(0.9)
    # A leather-ball transient over an exponentially falling membrane pitch.
    phase = 2 * np.pi * (45 * t + 85 * 0.035 * (1 - np.exp(-t / 0.035)))
    body = np.sin(phase) * np.exp(-t * 9)
    leather = filtered_noise(0.9, 2600) * np.exp(-t * 80) * 0.24
    add((body + leather) * np.minimum(t / 0.001, 1), at, gain, pan)


def kick(at: float, gain: float = 0.43) -> None:
    t = times(0.5)
    phase = 2 * np.pi * (48 * t + 62 * 0.03 * (1 - np.exp(-t / 0.03)))
    add(np.sin(phase) * np.exp(-t * 13) * np.minimum(t * 1800, 1), at, gain)


def snare(at: float, gain: float = 0.22) -> None:
    t = times(0.32)
    noise = filtered_noise(0.32, 4700)
    signal = (noise * 0.7 + np.sin(2 * np.pi * 185 * t) * 0.3) * np.exp(-t * 18)
    add(signal * np.minimum(t * 2000, 1), at, gain, 0.14)


def tick(at: float, gain: float = 0.075, pan: float = -0.35) -> None:
    t = times(0.12)
    noise = RNG.normal(0, 1, len(t))
    high = noise - np.roll(noise, 1)
    add(high * np.exp(-t * 65), at, gain, pan)


def bass(at: float, frequency: float, length: float, gain: float = 0.2) -> None:
    t = times(length)
    envelope = np.minimum(t / 0.016, 1) * np.minimum((length - t) / 0.12, 1)
    sound = np.sin(2 * np.pi * frequency * t) + 0.18 * np.sin(4 * np.pi * frequency * t)
    add(sound * envelope, at, gain)


def chord(at: float, frequencies: list[float], length: float, gain: float = 0.05) -> None:
    t = times(length)
    envelope = np.minimum(t / 0.7, 1) * np.minimum((length - t) / 0.9, 1)
    for index, frequency in enumerate(frequencies):
        pad = (np.sin(2 * np.pi * frequency * t) + 0.35 * np.sin(2 * np.pi * frequency * 1.003 * t))
        add(pad * envelope, at, gain, -0.65 + index * 0.65)


def swell(at: float, length: float, gain: float = 0.14) -> None:
    t = times(length)
    envelope = (t / length) ** 2 * np.minimum((length - t) / 0.015, 1)
    add(filtered_noise(length, 3600) * envelope, at, gain, -0.25)


def star(at: float, frequency: float, gain: float = 0.15) -> None:
    t = times(1.5)
    # Bell partials, composed as an ascending D-minor pentatonic figure.
    signal = sum(np.sin(2 * np.pi * frequency * partial * t) * weight for partial, weight in ((1, 1), (2.01, 0.3), (3.97, 0.1)))
    envelope = np.minimum(t * 1000, 1) * np.exp(-t * 4)
    add(signal * envelope, at, gain, -0.5 + (at - 22.2) / 3.1)


def compose() -> None:
    t = times(DURATION)
    # Diffuse, distant crowd-like air: entirely synthetic, with no voices.
    for pan in (-0.8, 0.8):
        air = filtered_noise(DURATION, 700)
        envelope = (0.018 + 0.012 * np.sin(2 * np.pi * 0.13 * t) ** 2)
        envelope *= np.minimum(t / 0.8, 1) * np.minimum((DURATION - t) / 1.2, 1)
        add(air * envelope, 0, 1, pan)
    cue(0, "Distant stadium air; title emerges")
    impact(1.7, 0.85)
    cue(1.7, "Opening football impact")
    chord(0.8, [146.83, 174.61, 220], 4.1, 0.035)
    swell(3.1, 0.9)
    impact(4, 0.9)
    cue(4, "Ronaldinho reveal")
    chord(4, [146.83, 174.61, 220], 4, 0.055)
    bass(4, 73.416, 1.7, 0.13)
    bass(6, 73.416, 1.7, 0.15)
    swell(7, 1, 0.19)
    impact(8, 0.75)
    cue(8, "Gameplay introduction")
    impact(9.5, 0.35, -0.2)
    impact(10.3, 1.05)
    cue(10.3, "Perfect strike / launch")
    swell(11.2, 0.8)
    # 120 BPM; deeper beats open into a syncopated contact montage at 17s.
    harmony = [(8, 73.416, [146.83, 174.61, 220]), (12, 58.27, [116.54, 146.83, 174.61]),
               (16, 87.31, [174.61, 220, 261.63]), (20, 65.406, [130.81, 164.81, 196])]
    for at, root, frequencies in harmony:
        chord(at, frequencies, 4.15, 0.055)
        for beat in np.arange(at, min(at + 4, 22), 0.5):
            kick(float(beat), 0.35 if beat < 12 else 0.46)
            bass(float(beat), root, 0.34, 0.19)
            tick(float(beat + 0.25), 0.048 if beat < 17 else 0.075)
            if round((beat - at) * 2) % 2:
                snare(float(beat), 0.15 if beat < 17 else 0.23)
    cue(12, "Legends montage; full rhythm enters")
    for at in (12, 13.67, 15.33):
        impact(at, 0.5)
    cue(17, "Foot / knee / header contacts; rising percussion")
    for at, pan in ((17.94, -0.3), (19.60, 0.1), (21.27, 0.3)):
        impact(at, 0.55, pan)
    swell(20.7, 1.3, 0.2)
    cue(22, "Five-star dedication sequence")
    chord(22, [146.83, 174.61, 220], 4.2, 0.065)
    for at, frequency in zip((22.2, 22.9, 23.6, 24.3, 25.2), (587.33, 698.46, 783.99, 880, 1174.66)):
        star(at, frequency)
        cue(at, "Gold star")
    impact(25.2, 0.95)
    bass(25.2, 36.708, 0.8, 0.16)
    for at in (26, 27, 28):
        impact(at, 0.6)
        bass(at, 73.416, 0.55, 0.2)
    cue(26, "Three challenge durations")
    swell(28.2, 0.8, 0.2)
    impact(29, 1)
    cue(29, "KeepyUppy title and champion challenge")
    chord(29, [146.83, 174.61, 220], 4.6, 0.07)
    bass(29, 36.708, 3.5, 0.22)
    star(29.1, 587.33, 0.11)
    # Smooth saturation controls overlapping transients, then a conservative peak.
    SCORE[:] = np.tanh(SCORE * 1.2)
    SCORE[:] *= 0.841 / max(float(np.max(np.abs(SCORE))), 1e-8)
    SCORE[:] *= np.minimum((DURATION - t[:, None]) / 0.6, 1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("output/trailer/soundtrack.wav"))
    args = parser.parse_args()
    compose()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.rint(SCORE * 32767).astype("<i2")
    with wave.open(str(args.output), "wb") as stream:
        stream.setnchannels(2)
        stream.setsampwidth(2)
        stream.setframerate(RATE)
        stream.writeframes(pcm.tobytes())
    cue_path = args.output.with_suffix(".cues.json")
    cue_path.write_text(json.dumps({"duration": DURATION, "sampleRate": RATE, "seed": 17062026,
                                    "originalSynthesis": True, "cues": sorted(CUES, key=lambda cue: cue["time"])}, indent=2) + "\n")
    print(f"Wrote {args.output}: {DURATION:g}s, stereo {RATE}Hz, peak {np.max(np.abs(SCORE)):.3f}")


if __name__ == "__main__":
    main()
