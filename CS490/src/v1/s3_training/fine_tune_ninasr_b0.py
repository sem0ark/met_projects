import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import argparse
import os
import time

import torch
import torch.nn as nn
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


def train_one_epoch(model, loader, optim, device):
    model.train()
    total_loss = 0.0
    criterion = nn.L1Loss()
    for batch in loader:
        lr = batch["lr"].to(device)
        hr = batch["hr"].to(device)
        optim.zero_grad()
        out = model(lr)
        loss = criterion(out, hr)
        loss.backward()
        optim.step()
        total_loss += loss.item() * lr.size(0)
    return total_loss / len(loader.dataset)


def validate(model, loader, device):
    model.eval()
    total_loss = 0.0
    criterion = nn.L1Loss()
    with torch.no_grad():
        for batch in loader:
            lr = batch["lr"].to(device)
            hr = batch["hr"].to(device)
            out = model(lr)
            loss = criterion(out, hr)
            total_loss += loss.item() * lr.size(0)
    return total_loss / len(loader.dataset)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dataset-root", type=str, required=True)
    p.add_argument("--split", type=str, default="train")
    p.add_argument("--batch-size", type=int, default=4)
    p.add_argument("--epochs", type=int, default=100)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--pretrained-path", type=str, default="")
    p.add_argument("--checkpoint-out", type=str, default="checkpoints/ft_ninasr_b0.pth")
    p.add_argument("--scale", type=int, default=2)

    args = p.parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    model = ninasr_b0(scale=args.scale)
    model.to(device)

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
        train_loss = train_one_epoch(model, loader, optim, device)
        val_loss = validate(model, val_loader, device)
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

    print("Done.")


if __name__ == "__main__":
    main()
