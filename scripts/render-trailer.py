#!/usr/bin/env python3
"""Encode both finished trailer orientations, then verify delivery constraints.

python3 scripts/trailer-audio.py
node scripts/trailer-capture-offline.mjs  # Or browser-based trailer-capture.mjs
python3 scripts/render-trailer.py

Inputs: output/trailer/{landscape,portrait}.mp4 and soundtrack.wav
Outputs: public/trailer/{landscape,portrait}.mp4 (34s, H.264/AAC, <=6 MB)
FFmpeg/FFprobe must be on PATH. Encoding uses bounded two-pass bitrate.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
LIMIT_BYTES = 6_000_000


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def probe(ffprobe: str, path: Path) -> dict:
    return json.loads(subprocess.check_output([
        ffprobe, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path),
    ], text=True))


def verify(ffmpeg: str, ffprobe: str, path: Path, orientation: str) -> dict:
    info = probe(ffprobe, path)
    video = next(stream for stream in info["streams"] if stream["codec_type"] == "video")
    audio = next(stream for stream in info["streams"] if stream["codec_type"] == "audio")
    expected_dimensions = (1280, 720) if orientation == "landscape" else (720, 1280)
    assert (video["width"], video["height"]) == expected_dimensions, "Unexpected video dimensions"
    assert video["codec_name"] == "h264", "Expected H.264 video"
    assert video["pix_fmt"] == "yuv420p", "Expected universally supported pixel format"
    assert video["r_frame_rate"] == "30/1", "Expected 30 fps"
    assert int(video.get("nb_frames", 1020)) == 1020, "Expected 1020 video frames"
    assert audio["codec_name"] == "aac", "Expected AAC audio"
    assert audio["channels"] == 2, "Expected stereo soundtrack"
    assert abs(float(info["format"]["duration"]) - 34) < 0.05, "Expected 34 seconds"
    assert path.stat().st_size <= LIMIT_BYTES, "Trailer exceeds the 6 MB delivery budget"
    run([ffmpeg, "-v", "error", "-i", str(path), "-f", "null", "-"])
    review = ROOT / "output/trailer/encoded-review"
    review.mkdir(parents=True, exist_ok=True)
    for timestamp in (10.3, 25.3, 31):
        run([ffmpeg, "-v", "error", "-y", "-ss", str(timestamp), "-i", str(path),
             "-frames:v", "1", "-q:v", "2", str(review / f"{orientation}-{timestamp}.jpg")])
    return {"file": str(path.relative_to(ROOT)), "bytes": path.stat().st_size,
            "duration": float(info["format"]["duration"]), "width": video["width"],
            "height": video["height"], "fps": video["r_frame_rate"], "video": "h264",
            "audio": "aac", "frames": int(video.get("nb_frames", 1020)),
            "decodedWithoutErrors": True}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--orientation", choices=("landscape", "portrait", "both"), default="both")
    args = parser.parse_args()
    ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        parser.error("FFmpeg and FFprobe are required on PATH")
    inputs = ROOT / "output/trailer"
    destination = ROOT / "public/trailer"
    destination.mkdir(parents=True, exist_ok=True)
    orientations = ("landscape", "portrait") if args.orientation == "both" else (args.orientation,)
    reports = []
    for orientation in orientations:
        target = destination / f"{orientation}.mp4"
        if not args.verify_only:
            source = inputs / f"{orientation}.mp4"
            soundtrack = inputs / "soundtrack.wav"
            if not source.exists() or not soundtrack.exists():
                parser.error(f"Missing source {source} or soundtrack {soundtrack}")
            with tempfile.TemporaryDirectory(prefix="keepyuppy-encode-") as temp:
                common = [ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-i", str(source)]
                encode = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-level:v", "3.1",
                          "-pix_fmt", "yuv420p", "-b:v", "1150k", "-maxrate", "1800k", "-bufsize", "3600k",
                          "-r", "30", "-g", "60", "-t", "34", "-passlogfile", str(Path(temp) / orientation)]
                run(common + ["-map", "0:v:0"] + encode + ["-pass", "1", "-an", "-f", "null", os.devnull])
                run(common + ["-i", str(soundtrack), "-map", "0:v:0", "-map", "1:a:0"] + encode + [
                    "-pass", "2", "-c:a", "aac", "-b:a", "112k", "-ar", "48000", "-ac", "2",
                    "-movflags", "+faststart", "-metadata", "title=KeepyUppy: Chase the champion",
                    "-metadata", "comment=Original synthesized soundtrack; actual camera-game renderer footage",
                    str(target),
                ])
        reports.append(verify(ffmpeg, ffprobe, target, orientation))
    report_path = inputs / "media-verification.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(reports, indent=2) + "\n")
    print(json.dumps(reports, indent=2))


if __name__ == "__main__":
    main()
