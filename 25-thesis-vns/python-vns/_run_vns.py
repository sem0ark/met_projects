import json
import logging
import time
from datetime import datetime
from pathlib import Path

import numpy as np

from vns.abstract import Solution, VNSConfig
from vns.optimizer import VNSOptimizer

BASE = Path(__file__).parent.parent / "runs"


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


def run_vns_optimizer(
    run_time_seconds: float,
    optimizer: VNSOptimizer,
) -> list[Solution]:
    """
    Runs the VNS optimizer for a specified duration and returns the final
    list of non-dominated solutions.

    Args:
        run_time_seconds: The maximum duration in seconds for the optimization run.
        optimizer: The VNSOptimizer instance to run.

    Returns:
        A list of Solution objects representing the final Pareto front.
    """
    logger = logging.getLogger(optimizer.config.get_name())
    start_time = time.time()
    optimizer.config.acceptance_criterion.clear()
    for iteration, improved in enumerate(optimizer.optimize(), 1):
        elapsed_time = time.time() - start_time

        if elapsed_time > run_time_seconds:
            logger.info(
                "Timeout after %d iterations, ran for %d seconds.",
                iteration,
                elapsed_time,
            )
            break
        if improved:
            num_solutions = len(
                optimizer.config.acceptance_criterion.get_all_solutions()
            )
            logger.info(
                "Iteration %d: Improved! Total # solutions: %d",
                iteration,
                num_solutions,
            )

    return optimizer.config.acceptance_criterion.get_all_solutions()


def save_run_data(
    solutions: list[Solution],
    config: VNSConfig,
    problem_name: str,
    problem_instance_file: str,
    run_time_seconds: float,
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
    run_path = (
        BASE
        / f"{problem_name}_{instance_name}_{timestamp.split('.')[0].replace(':', '-')}.json"
    )

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
            "instance_file": Path(problem_instance_file).name,
            "run_time": int(run_time_seconds),
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
