import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, cast

import numpy as np
from pymoo.algorithms.moo.spea2 import SPEA2
from pymoo.core.problem import ElementwiseProblem
from pymoo.optimize import minimize
from pymoo.termination.max_time import TimeBasedTermination

sys.path.insert(1, str(Path(__file__).parent.parent.absolute()))

from mokp.mokp_problem import MOKPProblem

BASE = Path(__file__).parent.parent.parent / "runs"


class MOKP(ElementwiseProblem):
    """
    Multi-Objective Knapsack Problem.

    A problem is defined by inheriting from the Problem class and
    implementing the _evaluate method.
    """

    def __init__(self, problem: MOKPProblem):
        super().__init__(
            n_var=problem.num_items,
            n_obj=problem.num_objectives,
            n_constr=problem.capacity.size,
            xl=0.0,
            xu=1.0,
            vtype=bool,
        )
        self.n_items = problem.num_items
        self.max_weight = problem.capacity

        # Randomly generate weights and profits for the items
        self.weights = problem.weights
        self.profits = problem.profits

    def _evaluate(self, x, out, *args, **kwargs):
        """
        Evaluate a solution `x`.
        `x` is a NumPy array where each row is a solution (a vector of booleans).
        """
        total_profits = np.sum(x * self.profits, axis=1)
        total_weight = np.sum(x * self.weights)

        # Objectives:
        # 1. Maximize total profit (minimize negative profit)
        # 2. Minimize total weight
        f1 = -total_profits[0]  # Objective 1: negative of profit 1
        f2 = -total_profits[1]  # Objective 2: negative of profit 2

        g1 = total_weight - self.max_weight

        out["F"] = np.column_stack([f1, f2])
        out["G"] = g1


def solve_mokp_spea2(instance_path: str, run_seconds: float):
    problem = MOKP(MOKPProblem.load(instance_path))

    algorithm = SPEA2(pop_size=200, eliminate_duplicates=True)

    res = minimize(
        problem=problem,
        algorithm=algorithm,
        termination=TimeBasedTermination(run_seconds),
        verbose=True,
    )

    solutions = cast(np.ndarray, -res.F).tolist()

    timestamp = datetime.now().isoformat()
    BASE.mkdir(parents=True, exist_ok=True)
    instance_name = Path(instance_path).stem
    run_path = (
        BASE / f"mokp_{instance_name}_{timestamp.split('.')[0].replace(':', '-')}.json"
    )

    solutions_data = [
        {
            "objectives": sol,
            "data": [],
        }
        for sol in solutions
    ]

    run_data = {
        "metadata": {
            "date": timestamp,
            "problem_name": "mokp",
            "instance_file": instance_name,
            "run_time": int(run_seconds),
        },
        "config": {
            "name": "SPEA2",
            "algorithm": "SPEA2",
        },
        "solutions": solutions_data,
    }

    with open(run_path, "w") as f:
        json.dump(run_data, f)

    print(f"Optimization run data saved to: {run_path}")


def register_cli(cli: Any) -> None:
    cli.register_runner("mokp", [("SPEA2", solve_mokp_spea2)])
