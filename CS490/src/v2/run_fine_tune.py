import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import argparse
import os
import time

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader

from v1.ninasr import ninasr_b0
from v1.s3_training.dataset import HRLRDataset


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


def train_one_epoch(model, loader, optim, device, extra_loss_fn=None):
    model.train()
    total_loss = 0.0
    criterion = nn.L1Loss()
    for batch in loader:
        lr = batch["lr"].to(device)
        hr = batch["hr"].to(device)
        optim.zero_grad()
        out = model(lr)
        loss = criterion(out, hr)
        # optional extra losses provided via closure
        if extra_loss_fn is not None:
            extra = extra_loss_fn(out, hr)
            if extra is not None:
                loss = loss + extra
        loss.backward()
        optim.step()
        total_loss += loss.item() * lr.size(0)
    return total_loss / len(loader.dataset)


def validate(model, loader, device, extra_loss_fn=None):
    model.eval()
    total_loss = 0.0
    criterion = nn.L1Loss()
    with torch.no_grad():
        for batch in loader:
            lr = batch["lr"].to(device)
            hr = batch["hr"].to(device)
            out = model(lr)
            loss = criterion(out, hr)
            if extra_loss_fn is not None:
                extra = extra_loss_fn(out, hr)
                if extra is not None:
                    loss = loss + extra
            total_loss += loss.item() * lr.size(0)
    return total_loss / len(loader.dataset)


def rgb_to_gray(x: torch.Tensor) -> torch.Tensor:
    if x.size(1) == 1:
        return x

    r, g, b = x[:, 0:1, :, :], x[:, 1:2, :, :], x[:, 2:3, :, :]
    return 0.2989 * r + 0.5870 * g + 0.1140 * b


def sobel_mag(x: torch.Tensor) -> torch.Tensor:
    gray = rgb_to_gray(x)
    gx = torch.tensor(
        [[[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]]], device=gray.device
    )
    gy = torch.tensor(
        [[[-1.0, -2.0, -1.0], [0.0, 0.0, 0.0], [1.0, 2.0, 1.0]]], device=gray.device
    )
    gx = gx.unsqueeze(1)
    gy = gy.unsqueeze(1)

    grad_x = F.conv2d(gray, gx, padding=1)
    grad_y = F.conv2d(gray, gy, padding=1)
    mag = torch.sqrt(grad_x * grad_x + grad_y * grad_y + 1e-12)
    return mag


def soft_bin(x: torch.Tensor, k: float = 50.0, thresh: float = 0.1) -> torch.Tensor:
    return torch.sigmoid(k * (x - thresh))


def make_extra_loss(
    lambda_edge: float = 0.0,
    lambda_bin: float = 0.0,
    bin_k: float = 50.0,
    bin_thresh: float = 0.1,
):
    """Return a function(extra_loss_fn) that computes weighted extra losses (edge + bin)"""
    lambda_edge = float(lambda_edge)
    lambda_bin = float(lambda_bin)

    def extra_loss(out: torch.Tensor, hr: torch.Tensor):
        total = None
        if lambda_edge > 0.0:
            edge_out = sobel_mag(out)
            edge_hr = sobel_mag(hr)
            edge_loss = F.l1_loss(edge_out, edge_hr)
            total = (
                edge_loss * lambda_edge
                if total is None
                else total + edge_loss * lambda_edge
            )

        if lambda_bin > 0.0:
            out_gray = rgb_to_gray(out)
            hr_gray = rgb_to_gray(hr)
            out_bin = soft_bin(out_gray, bin_k, bin_thresh)
            hr_bin = soft_bin(hr_gray, bin_k, bin_thresh)
            bin_loss = F.l1_loss(out_bin, hr_bin)
            total = (
                bin_loss * lambda_bin
                if total is None
                else total + bin_loss * lambda_bin
            )

        return total

    return extra_loss


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

    extra_loss_fn = make_extra_loss(
        lambda_edge=args.lambda_edge,
        lambda_bin=args.lambda_bin,
        bin_k=args.bin_k,
        bin_thresh=args.bin_thresh,
    )

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
        train_loss = train_one_epoch(
            model, loader, optim, device, extra_loss_fn=extra_loss_fn
        )
        val_loss = validate(model, val_loader, device, extra_loss_fn=extra_loss_fn)
        elapsed = time.time() - start
        print(
            f"Epoch {epoch}: train={train_loss:.6f} val={val_loss:.6f} time={elapsed:.1f}s"
        )

        os.makedirs(os.path.dirname(args.checkpoint_out) or ".", exist_ok=True)
        state = {"epoch": epoch, "state_dict": model.state_dict(), "args": vars(args)}
        torch.save(state, args.checkpoint_out)
        if val_loss < best_val:
            best_val = val_loss
            best_path = os.path.splitext(args.checkpoint_out)[0] + "_best_model.pth"
            torch.save(model.state_dict(), best_path)
            print("Saved best model to", best_path)


if __name__ == "__main__":
    main()
