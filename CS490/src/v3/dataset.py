import logging
import os
import random
from typing import List, Tuple

import torchvision.transforms.functional as TF
from PIL import Image
from torch.utils.data import Dataset

logger = logging.getLogger(__name__)


def _refresh_file_lists_for(
    root: str, split: str
) -> Tuple[List[str], List[str], List[str]]:
    """Return (hr_files, lr_files, basenames) for a dataset root and split.

    This is used by the dataset initializer to discover existing samples.
    """
    hr_dir = os.path.join(root, split, "hr")
    lr_dir = os.path.join(root, split, "lr")
    hr_files = sorted([f for f in os.listdir(hr_dir) if f.lower().endswith(".png")])
    lr_files = sorted([f for f in os.listdir(lr_dir) if f.lower().endswith(".png")])
    basenames = [os.path.splitext(f)[0] for f in hr_files]
    return hr_files, lr_files, basenames


class HRLRDataset(Dataset):
    """Pairs HR/LR PNG images by basename under dataset/{split}/{hr,lr}.

    Args:
        root: dataset root containing train/val folders.
        split: 'train' or 'val'
    """

    def __init__(
        self,
        root,
        split="train",
        augment=True,
        source_dir=None,
        samples_per_image=20,
        hr_size=256,
        scale=2,
    ):
        super().__init__()
        self.root = root
        self.split = split
        self.hr_dir = os.path.join(root, split, "hr")
        self.lr_dir = os.path.join(root, split, "lr")
        # Ensure directories exist
        os.makedirs(self.hr_dir, exist_ok=True)
        os.makedirs(self.lr_dir, exist_ok=True)

        # Optionally generate missing data using data_gen.generate_dataset
        self.augment = augment
        self.source_dir = source_dir
        self.samples_per_image = samples_per_image
        self.hr_size = hr_size
        self.scale = scale

        self.hr_files, self.lr_files, self.basenames = _refresh_file_lists_for(
            self.root, self.split
        )

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
