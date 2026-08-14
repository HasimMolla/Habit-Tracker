#!/usr/bin/env python3
"""
Generates Tally's icon set.

The mark is a tally group: four upright strokes crossed by a diagonal fifth —
the oldest habit-counting notation there is, which is exactly what the app does.
Strokes are drawn with rounded caps at 4x and downsampled, so the edges stay
clean without needing a vector toolchain.

Run: python3 scripts/generate-icons.py
"""

from PIL import Image, ImageDraw
import os

SS = 4  # supersampling factor

BACKGROUND = (16, 16, 20)
ACCENT = (124, 107, 240)
ACCENT_LIGHT = (154, 140, 255)

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "assets")


def rounded_line(draw, start, end, width, fill):
    """A line with round caps, drawn as a line plus two end circles."""
    draw.line([start, end], fill=fill, width=width)
    r = width // 2
    for (x, y) in (start, end):
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def draw_mark(size, stroke_color, cross_color, scale=1.0, background=None):
    """Draws the tally mark centred on a transparent (or filled) square."""
    canvas = size * SS
    image = Image.new("RGBA", (canvas, canvas), background or (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Mark occupies `scale` of the canvas, centred.
    box = canvas * scale
    left = (canvas - box) / 2
    top = (canvas - box) / 2

    stroke_w = int(box * 0.093)
    top_y = int(top + box * 0.16)
    bottom_y = int(top + box * 0.84)

    # Four upright strokes, evenly spread across the middle of the box.
    span = box * 0.62
    first_x = left + (box - span) / 2
    gap = span / 3

    for i in range(4):
        x = int(first_x + gap * i)
        rounded_line(draw, (x, top_y), (x, bottom_y), stroke_w, stroke_color)

    # The fifth stroke crosses the other four, overhanging just enough at each
    # end to read as a separate stroke rather than a strike-through.
    overhang = gap * 0.26
    rounded_line(
        draw,
        (int(first_x - overhang), bottom_y - int(box * 0.13)),
        (int(first_x + span + overhang), top_y + int(box * 0.13)),
        stroke_w,
        cross_color,
    )

    return image.resize((size, size), Image.LANCZOS)


def with_background(size, color, mark):
    base = Image.new("RGBA", (size, size), color + (255,))
    base.alpha_composite(mark)
    return base


def save(image, name):
    path = os.path.abspath(os.path.join(ASSETS, name))
    image.save(path, "PNG")
    print(f"  {name}  {image.size[0]}x{image.size[1]}")


def main():
    os.makedirs(os.path.abspath(ASSETS), exist_ok=True)
    print("Generating Tally icons:")

    # Main app icon — mark on the dark brand background.
    mark = draw_mark(1024, ACCENT, ACCENT_LIGHT, scale=0.60)
    save(with_background(1024, BACKGROUND, mark), "icon.png")

    # Adaptive icon: Android masks the outer ~28%, so the mark is drawn smaller.
    save(draw_mark(1024, ACCENT, ACCENT_LIGHT, scale=0.42), "android-icon-foreground.png")
    save(Image.new("RGBA", (1024, 1024), BACKGROUND + (255,)), "android-icon-background.png")

    # Monochrome (themed icons) must be a solid white silhouette on transparent.
    save(
        draw_mark(1024, (255, 255, 255), (255, 255, 255), scale=0.42),
        "android-icon-monochrome.png",
    )

    # Notification icon: white silhouette, small canvas, status-bar safe area.
    save(
        draw_mark(96, (255, 255, 255), (255, 255, 255), scale=0.80),
        "notification-icon.png",
    )

    # Splash mark, transparent so it sits on the configured background.
    save(draw_mark(512, ACCENT, ACCENT_LIGHT, scale=0.72), "splash-icon.png")

    save(with_background(48, BACKGROUND, draw_mark(48, ACCENT, ACCENT_LIGHT, 0.62)), "favicon.png")


if __name__ == "__main__":
    main()
