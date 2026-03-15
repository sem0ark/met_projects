import os
import random

import torchvision.transforms.functional as TF
from PIL import Image
from torch.utils.data import Dataset


class HRLRDataset(Dataset):
    """Pairs HR/LR PNG images by basename under dataset/{split}/{hr,lr}.

    Args:
        root: dataset root containing train/val folders.
        split: 'train' or 'val'
    """

    def __init__(self, root, split="train", augment=True):
        super().__init__()
        self.root = root
        self.split = split
        self.hr_dir = os.path.join(root, split, "hr")
        self.lr_dir = os.path.join(root, split, "lr")
        self.hr_files = sorted(
            [f for f in os.listdir(self.hr_dir) if f.lower().endswith(".png")]
        )
        self.lr_files = sorted(
            [f for f in os.listdir(self.lr_dir) if f.lower().endswith(".png")]
        )

        self.basenames = [os.path.splitext(f)[0] for f in self.hr_files]
        self.augment = augment

    def __len__(self):
        return len(self.basenames)

    def _load(self, path):
        with Image.open(path) as im:
            return im.convert("RGB")

    def __getitem__(self, idx):
        base = self.basenames[idx]
        hr_path = os.path.join(self.hr_dir, base + ".png")
        lr_path = os.path.join(self.lr_dir, base + ".png")
        hr = self._load(hr_path)
        lr = self._load(lr_path)

        # Add augmentation while running as well
        if self.augment:
            if random.random() < 0.5:
                angle = random.choice([0, 90, 180, 270])
            else:
                angle = random.uniform(-30, 30)
            hr = hr.rotate(angle, resample=Image.Resampling.BICUBIC)
            lr = lr.rotate(angle, resample=Image.Resampling.BICUBIC)

            if random.random() < 0.5:
                hr = HRLRDataset._vflip(hr)
                lr = HRLRDataset._vflip(lr)
            if random.random() < 0.5:
                hr = HRLRDataset._hflip(hr)
                lr = HRLRDataset._hflip(lr)

        hr_t = TF.to_tensor(hr)
        lr_t = TF.to_tensor(lr)
        return {"lr": lr_t, "hr": hr_t, "name": base}

    @staticmethod
    def _hflip(im):
        return im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    @staticmethod
    def _vflip(im):
        return im.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
