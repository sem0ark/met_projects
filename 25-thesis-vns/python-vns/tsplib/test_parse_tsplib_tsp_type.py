from pathlib import Path

import pytest
from parse_tsplib_problem import TSPLibParser

BASE = Path(__file__).parent.parent.parent.parent / "data" / "tsplib"

TSP_FILES = [path for path in BASE.glob("*.tsp") if path.is_file()]


@pytest.mark.parametrize(
    "path",
    [pytest.param(path, id=path.name) for path in TSP_FILES],
)
def test_can_parse(path):
    with open(path, encoding="ascii") as f:
        contents = f.read()

    parser = TSPLibParser()
    parser.parse_string(contents)
