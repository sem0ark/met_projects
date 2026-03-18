import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import os

import torch
import torchvision.transforms.functional as TF
from image_utils import bileteral_smooth
from ninasr import ChoppedModel, SelfEnsembleModel, ninasr_b0
from PIL import Image
from tqdm import tqdm


def load_model(model_path: str, scale: int, device: str):
    model = ninasr_b0(scale=scale)
    model.to(device)
    if not model_path:
        return model

    ck = torch.load(model_path, map_location=device)
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


def predict(source_dir, output_dir, model, device, scale=2, include_multiple=False):
    """Generate SR images from source_dir using model and save to output_dir.

    If include_multiple is True, the function will iteratively feed the model's
    output back into the model to produce twice- and thrice-processed images
    (i.e. multiple passes). Files are saved with a _pass{n} and scaled_x{factor}
    suffix.
    """

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
                img = bileteral_smooth(img)

                input_t = TF.to_tensor(img).unsqueeze(0).to(device)
                with torch.no_grad():
                    out_t = model(input_t)

                out_t = out_t.clamp(0, 1).squeeze(0).cpu()
                out_img = TF.to_pil_image(out_t)

                base_no_ext = os.path.splitext(filename)[0]
                out_name = f"{base_no_ext}_scaled_x{scale}_pass1.png"
                out_img.save(os.path.join(output_dir, out_name))

                if include_multiple:
                    prev_img = out_img
                    for p in (2,):
                        input_t = TF.to_tensor(prev_img).unsqueeze(0).to(device)
                        with torch.no_grad():
                            out_t = model(input_t)

                        out_t = out_t.clamp(0, 1).squeeze(0).cpu()
                        out_img = TF.to_pil_image(out_t)

                        overall_scale = scale**p
                        out_name = f"{base_no_ext}_scaled_x{overall_scale}_pass{p}.png"
                        out_img.save(os.path.join(output_dir, out_name))
                        prev_img = out_img
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
        "--ensemble", action="store_true", help="Enable self-ensemble wrapper"
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
    parser.add_argument(
        "--include-multiple",
        action="store_true",
        help="Also save outputs after processing images twice and thrice (iterative passes)",
    )

    args = parser.parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"

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
        model = SelfEnsembleModel(model)
        model.to(device)

    model.eval()

    predict(
        source_dir=args.source_dir,
        output_dir=args.output_dir,
        model=model,
        device=device,
        scale=2,
        include_multiple=args.include_multiple,
    )
