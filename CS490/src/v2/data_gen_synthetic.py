import argparse
import os
import random

from image_utils import degrade, downscale
from PIL import Image, ImageDraw, ImageFont
from tqdm import tqdm

FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
]


def _find_fonts(n: int = 4) -> list[str]:
    """Return a list of available font file paths (strings).

    The renderer will load fonts at the required size per-sample.
    """
    fonts: list[str] = []
    for path in FONT_PATHS:
        if os.path.exists(path):
            fonts.append(path)
        if len(fonts) >= n:
            break

    return fonts


def _render_number_image(
    hr_size: int, fonts: list[str], max_digits: int = 5
) -> Image.Image:
    ss = 2
    upscale_size = hr_size * ss
    output_image = Image.new("RGB", (upscale_size, upscale_size), (255, 255, 255))

    # Render multiple smaller numbers per image to cover variety and avoid
    # cropping; each number is 1-2 digits and rendered at a small size.
    n_numbers = random.randint(1, 40)
    for _ in range(n_numbers):
        n_digits = random.randint(1, min(2, max_digits))
        txt = "".join(str(random.randint(0, 9)) for _ in range(n_digits))

        font_path = random.choice(fonts) if fonts else None
        base_size = int(hr_size * random.uniform(0.06, 0.3 / n_numbers**0.5) * ss)
        try:
            font = (
                ImageFont.truetype(font_path, base_size)
                if font_path
                else ImageFont.load_default()
            )
        except Exception:
            font = ImageFont.load_default()

        txt_im = Image.new(
            "RGBA", (base_size * len(txt) + 20, base_size + 20), (255, 255, 255, 0)
        )
        txt_draw = ImageDraw.Draw(txt_im)
        color = tuple(random.randint(0, 80) for _ in range(3))
        txt_draw.text((10, 10), txt, font=font, fill=color)

        if random.random() < 0.5:
            angle = random.choice([0, 90, 180, 270])
        else:
            angle = random.uniform(-30, 30)

        rotated = txt_im.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        rw, rh = rotated.size

        max_x = max(0, upscale_size - rw)
        max_y = max(0, upscale_size - rh)
        x = random.randint(0, max_x)
        y = random.randint(0, max_y)

        output_image.paste(rotated, (x, y), rotated)

    output_image = output_image.resize(
        (hr_size, hr_size), resample=Image.Resampling.LANCZOS
    )
    return output_image


def _render_lines_image(hr_size: int) -> Image.Image:
    ss = 2
    W = hr_size * ss
    im = Image.new("RGB", (W, W), (255, 255, 255))
    draw = ImageDraw.Draw(im)

    n = random.randint(3, 12)

    for _ in range(n):
        x1 = random.randint(0, W)
        y1 = random.randint(0, W)
        x2 = random.randint(0, W)
        y2 = random.randint(0, W)
        width = random.randint(2, 20)

        stroke_color = tuple(random.randint(0, 80) for _ in range(3))
        # draw the line
        draw.line((x1, y1, x2, y2), fill=stroke_color, width=width)

        # draw rounded end-caps
        r = max(1, width / 2)
        x1_min = int(max(0, x1 - r))
        y1_min = int(max(0, y1 - r))
        x1_max = int(min(W, x1 + r))
        y1_max = int(min(W, y1 + r))
        x2_min = int(max(0, x2 - r))
        y2_min = int(max(0, y2 - r))
        x2_max = int(min(W, x2 + r))
        y2_max = int(min(W, y2 + r))
        draw.ellipse((x1_min, y1_min, x1_max, y1_max), fill=stroke_color)
        draw.ellipse((x2_min, y2_min, x2_max, y2_max), fill=stroke_color)

    if random.random() < 0.3:
        for _ in range(random.randint(1, 4)):
            x = random.randint(0, W - 10)
            y = random.randint(0, W - 10)
            w = random.randint(10, W // 2)
            h = random.randint(10, W // 2)
            rect_color = tuple(random.randint(0, 80) for _ in range(3))
            draw.rectangle(
                (x, y, x + w, y + h), outline=rect_color, width=random.randint(1, 6)
            )

    im = im.resize((hr_size, hr_size), resample=Image.Resampling.LANCZOS)
    return im


def _ensure_dirs(output_dir: str):
    for split in ("train", "val"):
        os.makedirs(os.path.join(output_dir, split, "hr"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, split, "lr"), exist_ok=True)


def generate_synthetic_combined(
    output_dir: str,
    hr_size: int,
    scale: int,
    samples_per_mode: int = 1000,
    split_ratio: float = 0.8,
) -> None:
    _ensure_dirs(output_dir)
    font_objs = _find_fonts()

    modes = ["numbers", "lines"]
    total_counts = {m: 0 for m in modes}

    sample_id = 0
    for mode in modes:
        for i in tqdm(range(samples_per_mode), desc=f"Generating synthetic {mode}"):
            sample_id += 1
            is_train = random.random() < split_ratio
            split = "train" if is_train else "val"

            if mode == "numbers":
                hr_im = _render_number_image(hr_size, font_objs, max_digits=2)
            else:
                hr_im = _render_lines_image(hr_size)

            base_name = f"synthetic_{mode}_{i:05d}.png"
            hr_path = os.path.join(output_dir, split, "hr", base_name)
            lr_path = os.path.join(output_dir, split, "lr", base_name)

            hr_im.save(hr_path)

            lr_im = degrade(downscale(hr_im, hr_size, scale))
            lr_im.save(lr_path)

            total_counts[mode] += 1

    print(f"Generated synthetic samples: {total_counts}")


def _parse_args():
    p = argparse.ArgumentParser(
        description="Generate synthetic numbers and thick lines dataset"
    )
    p.add_argument(
        "-o",
        "--output-dir",
        required=True,
        help="Output dataset folder (will create train/val hr/lr)",
    )
    p.add_argument(
        "-n",
        "--samples-per-mode",
        type=int,
        default=1000,
        help="Number of synthetic samples to generate per mode (default: 1000)",
    )
    p.add_argument(
        "--hr-size",
        type=int,
        default=256,
        help="High-resolution crop size in pixels (default: 256)",
    )
    p.add_argument(
        "--scale-factor",
        type=int,
        default=2,
        help="Scaling factor between HR and LR (default: 2)",
    )
    return p.parse_args()


def main():
    args = _parse_args()
    generate_synthetic_combined(
        output_dir=args.output_dir,
        samples_per_mode=args.samples_per_mode,
        hr_size=args.hr_size,
        scale=args.scale_factor,
    )


if __name__ == "__main__":
    main()
