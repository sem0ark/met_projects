import json
from pathlib import Path
from datetime import datetime

import numpy as np

from vns.abstract import Solution, VNSConfig

BASE = Path(__file__).parent.parent.parent / "runs"


class NpEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, np.bool):
            return bool(o)
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        return super(NpEncoder, self).default(o)


def save_run_data(
    solutions: list[Solution],
    config: VNSConfig,
    problem_name: str,
    problem_instance_file: str,
    run_time_seconds: int,
):
    """
    Saves the optimization run data, including solutions, configuration,
    and metadata, to a JSON file.
    
    The file is stored in a structured directory within the 'runs' folder.
    
    Args:
        solutions: A list of Solution objects representing the Pareto front.
        config: The optimizer configuration object.
        problem_name: The name of the optimization problem.
        problem_instance_file: The name of the data file used for the problem.
    """
    timestamp = datetime.now().isoformat()
    BASE.mkdir(parents=True, exist_ok=True)
    instance_name = Path(problem_instance_file).stem
    run_path = BASE / f"{problem_name}_{instance_name}_{timestamp.split('.')[0].replace(':', '-')}.json"

    solutions_data = [
        {
            "objectives": sol.objectives,
            "data": sol.get_data(),
        }
        for sol in solutions
    ]

    run_data = {
        "metadata": {
            "date": timestamp,
            "problem_name": problem_name,
            "instance_file": Path(problem_name) / problem_instance_file,
            "run_time": run_time_seconds,
        },
        "config": {
            "name": config.get_name(),
            "algorithm": "VNS",
        },
        "solutions": solutions_data,
    }
    
    with open(run_path, "w") as f:
        json.dump(run_data, f, cls=NpEncoder)

    print(f"Optimization run data saved to: {run_path}")
