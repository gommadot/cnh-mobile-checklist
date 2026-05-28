"""Genera le icone PWA per l'app mobile (iOS + Android).

Esegui dalla cartella `mobile-static/`:
    python _generate_icons.py

Crea:
  icon-192.png             standard Android home / favicon
  icon-512.png             alta risoluzione (splash, store)
  icon-maskable-512.png    icona adattiva Android (con safe zone)
  apple-touch-icon.png     iOS Home Screen 180x180
"""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

BASE = Path(__file__).resolve().parent
RED = (192, 0, 0)
RED_DARK = (139, 0, 0)
WHITE = (255, 255, 255)


def draw_logo(size: int, padding_ratio: float = 0.12, with_radius: bool = True) -> Image.Image:
    """Disegna sfondo rosso (rounded) + checkmark bianco centrato."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = int(size * 0.22) if with_radius else 0
    # sfondo gradiente semplice (due rettangoli sovrapposti)
    d.rounded_rectangle((0, 0, size, size), radius=radius, fill=RED)
    d.rounded_rectangle((0, int(size * 0.55), size, size), radius=radius, fill=RED_DARK)
    # ri-disegno sopra l'angolo arrotondato preservando la forma
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg.paste(img, mask=mask)
    img = bg
    d = ImageDraw.Draw(img)

    # checkmark al centro
    pad = int(size * padding_ratio) + int(size * 0.05)
    inset = int(size * 0.18)
    w = size - 2 * inset
    h = w
    cx_left = inset
    cy_top = inset
    # check: due segmenti spessi
    line_w = max(int(size * 0.10), 4)
    p1 = (cx_left + int(w * 0.12), cy_top + int(h * 0.55))
    p2 = (cx_left + int(w * 0.38), cy_top + int(h * 0.78))
    p3 = (cx_left + int(w * 0.86), cy_top + int(h * 0.28))
    d.line([p1, p2, p3], fill=WHITE, width=line_w, joint="curve")
    # cerchietti agli estremi per arrotondare
    r = line_w // 2
    for p in (p1, p2, p3):
        d.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=WHITE)

    return img


def make_maskable(size: int = 512) -> Image.Image:
    """Maskable: rosso pieno bordo a bordo + check dentro safe-zone (80% centrale)."""
    img = Image.new("RGBA", (size, size), RED)
    overlay = draw_logo(size, with_radius=False)
    # riduco il check al 70% centrale (safe zone Android: 80%)
    inner_size = int(size * 0.7)
    inner = draw_logo(inner_size, with_radius=False)
    # rimuovo il bg rosso dell'inner mettendolo trasparente fuori dal check:
    # in alternativa, sovrappongo solo il check (semplice approccio: paste centrato con
    # mask uguale al canale alpha della scena interna)
    inner_canvas = Image.new("RGBA", (inner_size, inner_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(inner_canvas)
    # checkmark dentro safe zone
    line_w = max(int(inner_size * 0.12), 4)
    p1 = (int(inner_size * 0.12), int(inner_size * 0.55))
    p2 = (int(inner_size * 0.38), int(inner_size * 0.78))
    p3 = (int(inner_size * 0.86), int(inner_size * 0.28))
    d.line([p1, p2, p3], fill=WHITE, width=line_w, joint="curve")
    r = line_w // 2
    for p in (p1, p2, p3):
        d.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=WHITE)
    pos = ((size - inner_size) // 2, (size - inner_size) // 2)
    img.paste(inner_canvas, pos, inner_canvas)
    return img


def main() -> None:
    targets = [
        ("icon-192.png", 192, "standard"),
        ("icon-512.png", 512, "standard"),
        ("apple-touch-icon.png", 180, "standard"),
        ("favicon.png", 64, "standard"),
    ]
    for name, size, _kind in targets:
        img = draw_logo(size)
        out = BASE / name
        img.save(out, "PNG", optimize=True)
        print(f"OK  {name}  ({size}x{size})")
    mask = make_maskable(512)
    mask.save(BASE / "icon-maskable-512.png", "PNG", optimize=True)
    print("OK  icon-maskable-512.png  (512x512, maskable)")


if __name__ == "__main__":
    main()
