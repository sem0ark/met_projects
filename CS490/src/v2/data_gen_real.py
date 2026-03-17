import os
import random

import image_utils as image_utils
from PIL import Image
from tqdm import tqdm


def generate_dataset(
    source_dir, output_dir, samples_per_image=20, hr_size=256, scale=2
):
    """
    source_dir: Folder containing high-quality raw images (scans/vectors)
    output_dir: Folder where the dataset will be saved
    samples_per_image: How many random crops to take from each high-res image
    hr_size: Size of the high-res crop (pixels)
    scale: The ratio of HR/LR (e.g., 2 means LR is half the size)
    """

    # Create final directory structure
    for split in ["train", "val"]:
        os.makedirs(os.path.join(output_dir, split, "hr"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, split, "lr"), exist_ok=True)

    image_files = [
        f
        for f in os.listdir(source_dir)
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    ]

    if not image_files:
        print(f"No images found in {source_dir}. Please place clean images there.")
        return

    # Randomly shuffle and split source images into train/val
    random.shuffle(image_files)
    split_idx = int(len(image_files) * 0.8)
    train_files = image_files[:split_idx]
    val_files = image_files[split_idx:]

    files_mapping = {"train": train_files, "val": val_files}

    print(f"Processing {len(image_files)} source images...")

    for split, files in files_mapping.items():
        count = 0
        for filename in tqdm(files, desc=f"Generating {split} set"):
            img_path = os.path.join(source_dir, filename)
            try:
                with Image.open(img_path) as img:
                    img = img.convert("RGB")
                    w, h = img.size

                    if w < hr_size or h < hr_size:
                        continue

                    for i in range(samples_per_image):
                        base_name = f"{os.path.splitext(filename)[0]}_sample_{i}.png"

                        hr_crop = image_utils.crop_and_rotate(img, hr_size, scale)
                        hr_crop.save(os.path.join(output_dir, split, "hr", base_name))

                        lr_crop = image_utils.degrade(
                            image_utils.downscale(hr_crop, hr_size, scale)
                        )
                        lr_crop.save(os.path.join(output_dir, split, "lr", base_name))
                        count += 1
            except Exception as e:
                print(f"Error processing {filename}: {e}")

        print(f"Generated {count} samples for {split}.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate HR/LR training pairs from high-resolution images."
    )
    parser.add_argument(
        "-s",
        "--source-dir",
        help="Folder containing high-quality raw images (default: ./raw_source)",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        help="Output dataset folder (default: ./datasets)",
    )
    parser.add_argument(
        "-n",
        "--samples-per-image",
        type=int,
        default=20,
        help="Number of random crops to generate per source image (default: 15)",
    )
    parser.add_argument(
        "--hr-size",
        type=int,
        default=256,
        help="High-resolution crop size in pixels (default: 256)",
    )
    parser.add_argument(
        "--scale-factor",
        type=int,
        default=2,
        help="Scaling factor between HR and LR (default: 2)",
    )

    args = parser.parse_args()

    if not os.path.exists(args.source_dir):
        os.makedirs(args.source_dir)
        print(
            f"Created '{args.source_dir}' folder. Please place high-res images there and run again."
        )
    else:
        generate_dataset(
            source_dir=args.source_dir,
            output_dir=args.output_dir,
            samples_per_image=args.samples_per_image,
            hr_size=args.hr_size,
            scale=args.scale,
        )
