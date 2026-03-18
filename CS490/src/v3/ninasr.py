"""
All credit to https://github.com/Coloquinte/torchSR/blob/main/torchsr/models/ninasr.py
Moved here to tweak the implemetation and avoid manual installation.
"""

import math

import torch
import torch.nn as nn


class _WrappedModel(nn.Module):
    def __init__(self, model):
        super(_WrappedModel, self).__init__()
        self.model = model

    def state_dict(self):
        return self.model.state_dict()

    def load_state_dict(self, state_dict, strict=True):
        return self.model.load_state_dict(state_dict, strict)


def _get_windows(tot_size, chop_size, chop_overlap):
    stride = chop_size - chop_overlap
    starts = list(range(0, tot_size - chop_overlap, stride))
    starts[-1] = min(starts[-1], tot_size - stride)  # Right-side
    starts[-1] = max(starts[-1], 0)  # Left-side, if there's only one element
    return starts


def _chop_and_forward(model, x, scale, chop_size, chop_overlap):
    if x.ndim != 4:
        raise ValueError("Super-Resolution models expect a tensor with 4 dimensions")
    width = x.shape[2]
    height = x.shape[3]
    if chop_overlap > chop_size / 2:
        raise ValueError(
            f"Chop size {chop_size} is too small for overlap {chop_overlap}"
        )
    if width <= chop_size and height <= chop_size:
        return model(x)
    x_starts = _get_windows(width, chop_size, chop_overlap)
    y_starts = _get_windows(height, chop_size, chop_overlap)
    result_shape = (x.shape[0], x.shape[1], scale * x.shape[2], scale * x.shape[3])
    result = torch.zeros(result_shape, device=x.device)
    for i, x_s in enumerate(x_starts):
        for j, y_s in enumerate(y_starts):
            # Range (saturated for when only one tile fits)
            x_e = min(x_s + chop_size, width)
            y_e = min(y_s + chop_size, height)
            # Run model on the tile
            out = model(x[:, :, x_s:x_e, y_s:y_e])
            # Compute margins
            l_margin = 0 if i == 0 else chop_overlap // 2
            r_margin = 0 if i == len(x_starts) - 1 else chop_overlap - chop_overlap // 2
            b_margin = 0 if j == 0 else chop_overlap // 2
            t_margin = 0 if j == len(y_starts) - 1 else chop_overlap - chop_overlap // 2
            l_margin *= scale
            r_margin *= scale
            b_margin *= scale
            t_margin *= scale
            # Compute bounds for result
            x_a = scale * x_s + l_margin
            x_b = scale * x_e - r_margin
            y_a = scale * y_s + b_margin
            y_b = scale * y_e - t_margin
            # Update the result
            assert x_b > x_a and y_b > y_a
            r_margin = None if r_margin == 0 else -r_margin
            t_margin = None if t_margin == 0 else -t_margin
            tile = out[:, :, l_margin:r_margin, b_margin:t_margin]
            result[:, :, x_a:x_b, y_a:y_b] = tile
    return result


class ChoppedModel(_WrappedModel):
    """
    Wrapper to run a model on small image tiles in order to use less memory

    Args:
        model (torch.nn.Module): The super-resolution model to wrap
        scale (int): the scaling factor
        chop_size (int): the size of the tiles, in pixels
        chop_overlap (int): the overlap between the tiles, in pixels
    """

    def __init__(self, model, scale, chop_size, chop_overlap):
        super(ChoppedModel, self).__init__(model)
        self.scale = scale
        self.chop_size = chop_size
        self.chop_overlap = chop_overlap

    def forward(self, x):
        return _chop_and_forward(
            self.model, x, self.scale, self.chop_size, self.chop_overlap
        )


class SelfEnsembleModel(_WrappedModel):
    """
    Wrapper to run a model with the self-ensemble method

    Args:
        model (torch.nn.Module): The super-resolution model to wrap
        median (boolean, optional): Use the median of the runs instead of the mean
    """

    def __init__(self, model, median=False):
        super(SelfEnsembleModel, self).__init__(model)
        self.median = median

    def forward_transformed(self, x, hflip, vflip, rotate):
        if hflip:
            x = torch.flip(x, (-2,))
        if vflip:
            x = torch.flip(x, (-1,))
        if rotate:
            x = torch.rot90(x, dims=(-2, -1))
        x = self.model(x)
        if rotate:
            x = torch.rot90(x, dims=(-2, -1), k=3)
        if vflip:
            x = torch.flip(x, (-1,))
        if hflip:
            x = torch.flip(x, (-2,))
        return x

    def forward(self, x):
        t = []
        for hflip in [False, True]:
            for vflip in [False, True]:
                for rot in [False, True]:
                    t.append(self.forward_transformed(x, hflip, vflip, rot))
        t = torch.stack(t)
        if self.median:
            return torch.quantile(t, 0.5, dim=0)
        else:
            return torch.mean(t, dim=0)


class AttentionBlock(nn.Module):
    """
    Squeeze-Excite attention block, with local pooling.
    """

    def __init__(self, n_feats, reduction=4, stride=16):
        super(AttentionBlock, self).__init__()
        self.body = nn.Sequential(
            nn.AvgPool2d(
                2 * stride - 1,
                stride=stride,
                padding=stride - 1,
                count_include_pad=False,
            ),
            nn.Conv2d(n_feats, n_feats // reduction, 1, bias=True),
            nn.ReLU(True),
            nn.Conv2d(n_feats // reduction, n_feats, 1, bias=True),
            nn.Sigmoid(),
            nn.Upsample(scale_factor=stride, mode="nearest"),
        )

    def forward(self, x):
        res = self.body(x)
        if res.shape != x.shape:
            res = res[:, :, : x.shape[2], : x.shape[3]]
        return res * x


class ResBlock(nn.Module):
    def __init__(self, n_feats, mid_feats, in_scale, out_scale):
        super(ResBlock, self).__init__()

        self.in_scale = in_scale
        self.out_scale = out_scale

        m = []
        conv1 = nn.Conv2d(n_feats, mid_feats, 3, padding=1, bias=True)
        nn.init.kaiming_normal_(conv1.weight)
        nn.init.zeros_(conv1.bias)  # type: ignore
        m.append(conv1)

        m.append(nn.ReLU(True))
        m.append(AttentionBlock(mid_feats))

        conv2 = nn.Conv2d(mid_feats, n_feats, 3, padding=1, bias=False)
        nn.init.kaiming_normal_(conv2.weight)
        m.append(conv2)

        self.body = nn.Sequential(*m)

    def forward(self, x):
        res = self.body(x * self.in_scale) * (2 * self.out_scale)
        res += x
        return res


class Rescale(nn.Module):
    def __init__(self, sign):
        super(Rescale, self).__init__()
        rgb_mean = (0.4488, 0.4371, 0.4040)
        bias = sign * torch.Tensor(rgb_mean).reshape(1, 3, 1, 1)
        self.bias = nn.Parameter(bias, requires_grad=False)

    def forward(self, x):
        return x + self.bias


class NinaSR(nn.Module):
    def __init__(
        self,
        n_resblocks,
        n_feats,
        scale,
        expansion=2.0,
    ):
        super(NinaSR, self).__init__()
        self.scale = scale

        n_colors = 3
        self.head = NinaSR.make_head(n_colors, n_feats)
        self.body = NinaSR.make_body(n_resblocks, n_feats, expansion)
        self.tail = NinaSR.make_tail(n_colors, n_feats, scale)

        self.refinement, self.ref_alpha = NinaSR.make_refinement(n_colors, n_feats)

    @staticmethod
    def make_head(n_colors, n_feats) -> nn.Sequential:
        m_head = [
            Rescale(-1),
            nn.Conv2d(n_colors, n_feats, 3, padding=1, bias=False),
        ]
        return nn.Sequential(*m_head)

    @staticmethod
    def make_body(n_resblocks, n_feats, expansion) -> nn.Sequential:
        mid_feats = int(n_feats * expansion)
        out_scale = 4 / n_resblocks
        expected_variance = 1.0
        m_body = []
        for _ in range(n_resblocks):
            in_scale = 1.0 / math.sqrt(expected_variance)
            m_body.append(ResBlock(n_feats, mid_feats, in_scale, out_scale))
            expected_variance += out_scale**2
        return nn.Sequential(*m_body)

    @staticmethod
    def make_tail(n_colors, n_feats, scale):
        m_tail = [
            # Unwrap features into scale^2 RGB
            nn.Conv2d(n_feats, n_colors * scale**2, 3, padding=1, bias=True),
            # Shuffle RGB values for smoother image
            nn.PixelShuffle(scale),
            # Reintroduce color bias
            Rescale(1),
        ]
        return nn.Sequential(*m_tail)

    @staticmethod
    def make_refinement(n_colors, n_feats) -> tuple[nn.Sequential, nn.Parameter]:
        conv1 = nn.Conv2d(n_colors, max(16, n_feats), 3, padding=1, bias=True)
        conv2 = nn.Conv2d(max(16, n_feats), n_colors, 3, padding=1, bias=True)

        nn.init.kaiming_normal_(conv1.weight)
        if conv1.bias is not None:
            nn.init.zeros_(conv1.bias)

        nn.init.zeros_(conv2.weight)
        if conv2.bias is not None:
            nn.init.zeros_(conv2.bias)

        m_refinement = [conv1, nn.ReLU(True), conv2]
        return nn.Sequential(*m_refinement), nn.Parameter(torch.zeros(1))

    def forward(self, x, scale=None):
        if scale is not None and scale != self.scale:
            raise ValueError(f"Network scale is {self.scale}, not {scale}")
        x = self.head(x)
        res = self.body(x)
        res += x
        x = self.tail(res)
        x = x + self.ref_alpha * self.refinement(x)
        return x


def ninasr_b0(scale):
    return NinaSR(10, 16, scale, expansion=2.0)
