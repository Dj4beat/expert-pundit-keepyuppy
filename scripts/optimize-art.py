"""Resize/encode generated originals without changing composition or alpha."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
for path in (root/'assets/originals').glob('*.png'):
    if path.name=='logo.png': continue
    im=Image.open(path)
    im.thumbnail((768,1152),Image.Resampling.LANCZOS)
    out=root/'public/art'/path.with_suffix('.webp').name
    im.save(out,quality=85,method=6)
    print(path.stem, out.stat().st_size)
