import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from torchview import draw_graph

from v1.ninasr import NinaSR

model_graph = draw_graph(
    NinaSR(1, 16, 2), input_size=(1, 3, 256, 256), expand_nested=True
)
model_graph.visual_graph.render(format="png")
