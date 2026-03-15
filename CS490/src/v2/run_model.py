import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import os
import random

import numpy as np
import torch
import torchvision.transforms.functional as TF
from PIL import Image
from tqdm import tqdm

from v2.ninasr import ChoppedModel, SelfEnsembleModel, ninasr_b0


def load_model(model_path: str, scale: int, device: str):
    model = ninasr_b0(scale=scale)
    model.to(device)
    if not model_path:
        return model

    ck = torch.load(model_path, map_location=device)
    # checkpoint may be a state_dict or a dict with 'state_dict'
    state_dict = ck.get("state_dict", ck) if isinstance(ck, dict) else ck
    model_dict = model.state_dict()
    matched = {
        k: v
        for k, v in state_dict.items()
        if k in model_dict and v.shape == model_dict[k].shape
    }
    model_dict.update(matched)
    model.load_state_dict(model_dict)
    model.to(device)
    model.eval()
    return model


def predict(source_dir, output_dir, model, device):
    """Generate SR images from source_dir using model and save to output_dir."""

    image_files = [
        f
        for f in os.listdir(source_dir)
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    ]

    if not image_files:
        print(f"No images found in {source_dir}. Please place clean images there.")
        return

    os.makedirs(output_dir, exist_ok=True)

    for filename in tqdm(image_files, desc="Generating SR outputs"):
        img_path = os.path.join(source_dir, filename)
        try:
            with Image.open(img_path) as img:
                img = img.convert("RGB")
                input_t = TF.to_tensor(img).unsqueeze(0).to(device)
                with torch.no_grad():
                    out_t = model(input_t)
                out_t = out_t.clamp(0, 1).squeeze(0).cpu()
                out_img = TF.to_pil_image(out_t)

                base_name = f"{os.path.splitext(filename)[0]}_scaled_x2.png"
                out_img.save(os.path.join(output_dir, base_name))
        except Exception as e:
            print(f"Error processing {filename}: {e}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Run NinaSR model on images and save outputs."
    )
    parser.add_argument(
        "-s",
        "--source-dir",
        default="data/source/crochet_images",
        help="Folder containing raw images",
    )
    parser.add_argument(
        "-o", "--output-dir", default="output", help="Folder to save SR images"
    )
    parser.add_argument(
        "-m", "--model-path", required=True, help="Path to .pth model checkpoint"
    )
    parser.add_argument(
        "--device",
        default=None,
        help="Device to run on (cpu or cuda). Auto-detect if not set",
    )
    parser.add_argument("--seed", type=int, default=None, help="Optional random seed")

    parser.add_argument(
        "--ensemble", action="store_true", help="Enable self-ensemble wrapper"
    )
    parser.add_argument(
        "--median",
        action="store_true",
        help="Use median aggregation for self-ensemble (default: mean)",
    )
    parser.add_argument(
        "--chop",
        action="store_true",
        help="Enable chopped/tiled inference to reduce memory",
    )
    parser.add_argument(
        "--chop-size",
        type=int,
        default=256,
        help="Tile size for chopped inference (default: 256)",
    )
    parser.add_argument(
        "--chop-overlap",
        type=int,
        default=32,
        help="Overlap between tiles for chopped inference (default: 32)",
    )

    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)
        np.random.seed(args.seed)

    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")

    if not os.path.exists(args.source_dir):
        os.makedirs(args.source_dir)
        print(
            f"Created '{args.source_dir}' folder. Please place high-res images there and run again."
        )
        raise SystemExit(1)

    model = load_model(args.model_path, scale=2, device=device)

    if args.chop:
        model = ChoppedModel(
            model, scale=2, chop_size=args.chop_size, chop_overlap=args.chop_overlap
        )
        model.to(device)

    if args.ensemble:
        model = SelfEnsembleModel(model, median=args.median)
        model.to(device)

    model.eval()

    predict(
        source_dir=args.source_dir,
        output_dir=args.output_dir,
        model=model,
        device=device,
    )
