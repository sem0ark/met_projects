import random

import cv2
import numpy as np
from PIL import Image, ImageFilter


def crop_and_rotate(img: Image.Image, min_size: int, scale=2):
    w, h = img.size

    left = random.randint(0, w - min_size)
    top = random.randint(0, h - min_size)
    img = img.crop((left, top, left + min_size, top + min_size))

    if random.random() < 0.5:
        angle = random.choice([0, 90, 180, 270])
    else:
        angle = random.uniform(-30, 30)

    if angle != 0:
        img = img.rotate(angle, resample=Image.Resampling.BICUBIC)
    return img


def add_gaussian_noise(image, std):
    """Adds Gaussian noise to a PIL image using numpy."""
    np_img = np.array(image)
    noise = np.random.normal(0, std, np_img.shape)
    noisy_img = np_img + noise

    noisy_img = np.clip(noisy_img, 0, 255).astype(np.uint8)
    return Image.fromarray(noisy_img)


def downscale(img: Image.Image, min_size: int, scale=2):
    lr_size = min_size // scale

    resample_methods = [
        Image.Resampling.BICUBIC,
        Image.Resampling.LANCZOS,
        Image.Resampling.BILINEAR,
        Image.Resampling.BOX,
    ]
    method = random.choice(resample_methods)

    if random.random() < 0.3:
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.2, 0.7)))

    img = img.resize((lr_size, lr_size), resample=method)
    return img


def degrade(img: Image.Image):
    blur_type = random.choice(["none", "gaussian", "box"])
    if blur_type == "gaussian":
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 1.5)))
    elif blur_type == "box":
        img = img.filter(ImageFilter.BoxBlur(radius=random.uniform(0.5, 1.2)))

    if random.random() > 0.3:
        img = add_gaussian_noise(img, std=random.uniform(2, 8))
    return img


def bileteral_smooth(img: Image.Image):
    d_val = 7
    sigma_color = 75
    sigma_space = 75

    np_img = np.array(img)
    bgr = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)
    filtered = cv2.bilateralFilter(bgr, d_val, sigma_color, sigma_space)
    filtered_rgb = cv2.cvtColor(filtered, cv2.COLOR_BGR2RGB)
    return Image.fromarray(filtered_rgb)
