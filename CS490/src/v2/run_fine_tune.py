import sys
from pathlib import Path
from typing import Callable
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import argparse
import os
import time

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader

from ninasr import ninasr_b0
from dataset import HRLRDataset


def train(model, loader, optim, device, loss_fns: dict[str, Callable]):
    model.train()
    total_loss = 0.0
    comps_acc = defaultdict(float)

    for batch in loader:
        lr = batch["lr"].to(device)
        hr = batch["hr"].to(device)
        optim.zero_grad()
        out = model(lr)

        batch_loss = None
        comps_batch = {}

        for name, fn in loss_fns.items():
            val = fn(out, hr)
            if val is None:
                continue

            batch_loss = val if batch_loss is None else batch_loss + val
            try:
                comps_batch[name] = float(val.detach().cpu().item())
            except Exception:
                comps_batch[name] = float(val)

        if batch_loss is not None:
            batch_loss.backward()
            optim.step()

            bsz = lr.size(0)
            total_loss += batch_loss.item() * bsz
            for k, v in comps_batch.items():
                comps_acc[k] += v * bsz

    n = len(loader.dataset)
    comps_avg = {k: comps_acc[k] / n for k in comps_acc}
    return total_loss / n, comps_avg


def validate(model, loader, device, loss_fns: dict[str, Callable]):
    model.eval()
    total_loss = 0.0
    comps_acc = defaultdict(float)
    with torch.no_grad():
        for batch in loader:
            lr = batch["lr"].to(device)
            hr = batch["hr"].to(device)
            out = model(lr)

            batch_loss = None
            comps_batch = {}
            for name, fn in loss_fns.items():
                val = fn(out, hr)
                if val is None:
                    continue

                if batch_loss is None:
                    batch_loss = val
                else:
                    batch_loss = batch_loss + val

                try:
                    comps_batch[name] = float(val.detach().cpu().item())
                except Exception:
                    comps_batch[name] = float(val)

            if batch_loss is not None:
                batch_size = lr.size(0)
                total_loss += batch_loss.item() * batch_size
                for k, v in comps_batch.items():
                    comps_acc[k] += v * batch_size

    n = len(loader.dataset)
    comps_avg = {k: comps_acc[k] / n for k in comps_acc}
    return total_loss / n, comps_avg


def make_edge_loss(
    lambda_edge: float = 0.0,
):
    lambda_edge = float(lambda_edge)

    def extra_loss(out: torch.Tensor, hr: torch.Tensor):
        edge_out = _sobel_mag(out)
        edge_hr = _sobel_mag(hr)
        edge_loss = F.l1_loss(edge_out, edge_hr)
        return edge_loss * lambda_edge

    return extra_loss


def _sobel_mag(x: torch.Tensor) -> torch.Tensor:
    gray = _rgb_to_gray(x)
    gx = torch.tensor(
        [[[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]]],
        device=gray.device,
    )
    gy = torch.tensor(
        [[[-1.0, -2.0, -1.0], [0.0, 0.0, 0.0], [1.0, 2.0, 1.0]]],
        device=gray.device,
    )
    gx = gx.unsqueeze(1)
    gy = gy.unsqueeze(1)

    grad_x = F.conv2d(gray, gx, padding=1)
    grad_y = F.conv2d(gray, gy, padding=1)
    mag = torch.sqrt(grad_x * grad_x + grad_y * grad_y + 1e-12)
    return mag


def make_bin_loss(
    lambda_bin: float = 0.0,
    bin_k: float = 50.0,
    bin_thresh: float = 0.1,
):
    lambda_bin = float(lambda_bin)

    def extra_loss(out: torch.Tensor, hr: torch.Tensor):
        out_gray = _rgb_to_gray(out)
        hr_gray = _rgb_to_gray(hr)
        out_bin = _soft_bin(out_gray, bin_k, bin_thresh)
        hr_bin = _soft_bin(hr_gray, bin_k, bin_thresh)
        bin_loss = F.l1_loss(out_bin, hr_bin)
        return bin_loss * lambda_bin

    return extra_loss


def _rgb_to_gray(x: torch.Tensor) -> torch.Tensor:
    if x.size(1) == 1:
        return x

    r, g, b = x[:, 0:1, :, :], x[:, 1:2, :, :], x[:, 2:3, :, :]
    return 0.2989 * r + 0.5870 * g + 0.1140 * b


def _soft_bin(x: torch.Tensor, k: float = 50.0, thresh: float = 0.1) -> torch.Tensor:
    return torch.sigmoid(k * (x - thresh))


def load_state_dict(model, checkpoint_dict):
    """Load matching keys from checkpoint_dict into model.

    Returns (missing_keys, unexpected_keys)
    """
    model_dict = model.state_dict()
    ckpt_dict = checkpoint_dict
    if "state_dict" in checkpoint_dict:
        ckpt_dict = checkpoint_dict["state_dict"]

    matched = {}
    missing = []
    unexpected = []
    for k, v in ckpt_dict.items():
        if k in model_dict and model_dict[k].shape == v.shape:
            matched[k] = v
        else:
            unexpected.append(k)

    for k in model_dict.keys():
        if k not in matched:
            missing.append(k)

    model_dict.update(matched)
    model.load_state_dict(model_dict)
    return missing, unexpected


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dataset-root", type=str, required=True)
    p.add_argument("--batch-size", type=int, default=4)
    p.add_argument("--epochs", type=int, default=100)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--pretrained-path", type=str, default="")
    p.add_argument("--checkpoint-out", type=str, default="checkpoints/ft_ninasr_b0.pth")
    p.add_argument("--scale", type=int, default=2)

    p.add_argument(
        "--lambda-edge", type=float, default=0.5, help="Weight for Sobel edge loss"
    )
    p.add_argument(
        "--lambda-bin",
        type=float,
        default=0.25,
        help="Weight for soft-binarization hole-avoidance loss",
    )
    p.add_argument(
        "--bin-k",
        type=float,
        default=50.0,
        help="Sharpness for soft binarization (sigmoid)",
    )
    p.add_argument(
        "--bin-thresh",
        type=float,
        default=0.1,
        help="Threshold for soft binarization (in image scale)",
    )

    args = p.parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    model = ninasr_b0(scale=args.scale)
    model.to(device)

    loss_fns = {
        "l1": nn.L1Loss(),
        "edge": make_edge_loss(lambda_edge=args.lambda_edge),
        "bin": make_bin_loss(
            lambda_bin=args.lambda_bin, bin_k=args.bin_k, bin_thresh=args.bin_thresh
        ),
    }

    if args.pretrained_path:
        print("Loading pretrained:", args.pretrained_path)
        ck = torch.load(args.pretrained_path, map_location="cpu")
        missing, unexpected = load_state_dict(model, ck)
        print("Missing keys:", missing, "Unexpected ckpt keys:", unexpected)

    loader = DataLoader(
        HRLRDataset(args.dataset_root, split="train", augment=True),
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=0,
    )

    trainable = [p for p in model.parameters() if p.requires_grad]
    optim = torch.optim.Adam(trainable, lr=args.lr)

    best_val = float("inf")
    val_loader = DataLoader(
        HRLRDataset(args.dataset_root, split="val", augment=True),
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=0,
    )

    for epoch in range(1, args.epochs + 1):
        start = time.time()
        train_loss, train_comps = train(model, loader, optim, device, loss_fns=loss_fns)
        val_loss, val_comps = validate(model, val_loader, device, loss_fns=loss_fns)
        elapsed = time.time() - start

        def fmt_comps(comps: dict) -> str:
            return " ".join(
                [f"{k.upper()}={comps.get(k, 0.0):.6f}" for k in sorted(comps.keys())]
            )

        train_str = fmt_comps(train_comps)
        val_str = fmt_comps(val_comps)
        print(
            f"Epoch {epoch}: train={train_loss:.6f} ({train_str}) val={val_loss:.6f} ({val_str}) time={elapsed:.1f}s"
        )

        os.makedirs(os.path.dirname(args.checkpoint_out) or ".", exist_ok=True)
        state = {"epoch": epoch, "state_dict": model.state_dict(), "args": vars(args)}
        torch.save(state, args.checkpoint_out)
        if val_loss < best_val:
            best_val = val_loss
            best_path = os.path.splitext(args.checkpoint_out)[0] + "_best_model.pt"
            torch.save(model.state_dict(), best_path)
            print("Saved best model to", best_path)


if __name__ == "__main__":
    main()
