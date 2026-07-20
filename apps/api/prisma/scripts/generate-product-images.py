"""Génère les illustrations catégories médicaments (256x256 PNG)."""
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit("pip install pillow")

OUT = Path(__file__).resolve().parents[2] / "uploads" / "products"
OUT.mkdir(parents=True, exist_ok=True)

PALETTE = {
    "medicament": ("#ECFDF5", "#059669", "Med."),
    "antalgique": ("#EFF6FF", "#2563EB", "Antalg."),
    "anti-inflammatoire": ("#FEF3C7", "#D97706", "A.I."),
    "antibiotique": ("#F3E8FF", "#7C3AED", "Antibio"),
    "antipaludeen": ("#DCFCE7", "#15803D", "Palu"),
    "cardio": ("#FEE2E2", "#DC2626", "Cardio"),
    "dermato": ("#FFF7ED", "#EA580C", "Dermato"),
    "gastro": ("#F0FDF4", "#16A34A", "Gastro"),
    "respiratoire": ("#E0F2FE", "#0284C7", "Respi"),
    "neuro": ("#EDE9FE", "#6D28D9", "Neuro"),
    "vitamines": ("#FEF9C3", "#CA8A04", "Vitam"),
    "diabete": ("#FFE4E6", "#E11D48", "Diab"),
    "antiparasitaire": ("#D1FAE5", "#047857", "Parasit"),
    "musculo": ("#E2E8F0", "#475569", "Musculo"),
    "gyneco": ("#FCE7F3", "#DB2777", "Gyneco"),
    "hormones": ("#FAE8FF", "#A21CAF", "Horm"),
    "vaccin": ("#CFFAFE", "#0E7490", "Vaccin"),
    "divers": ("#F1F5F9", "#64748B", "Divers"),
    "sang": ("#FEE2E2", "#B91C1C", "Sang"),
    "oncologie": ("#F5F3FF", "#5B21B6", "Onco"),
    "sensoriel": ("#ECFEFF", "#0891B2", "Sens"),
}


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def draw_pill(draw: ImageDraw.ImageDraw, fg: tuple[int, int, int]) -> None:
    draw.rounded_rectangle((88, 48, 168, 168), radius=28, fill=fg)
    draw.rounded_rectangle((108, 88, 148, 100), radius=6, fill=(255, 255, 255))


def main() -> None:
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except OSError:
        font = ImageFont.load_default()

    for slug, (bg, fg, label) in PALETTE.items():
        img = Image.new("RGB", (256, 256), hex_rgb(bg))
        draw = ImageDraw.Draw(img)
        draw_pill(draw, hex_rgb(fg))
        bbox = draw.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((256 - tw) / 2, 200), label, fill=hex_rgb(fg), font=font)
        img.save(OUT / f"{slug}.png", "PNG")
        print("OK", slug)

    print(f"\n{len(PALETTE)} images -> {OUT}")


if __name__ == "__main__":
    main()
