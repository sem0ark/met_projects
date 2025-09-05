import json
import sys
from pathlib import Path
from typing import Any, Iterable

import numpy as np

sys.path.insert(1, str(Path(__file__).parent.parent.absolute()))

from vns.abstract import Problem, Solution


BASE = Path(__file__).parent.parent.parent / "data" / "mokp"


type MOKPSolution = Solution[np.ndarray]


class _MOKPSolution(Solution[np.ndarray]):
    def equals(self, other: Any) -> bool:
        return all(
            abs(o1 - o2) < 1e-6 for o1, o2 in zip(self.objectives, other.objectives)
        )


class MOKPProblem(Problem[np.ndarray]):
    def __init__(self, weights: list[int], profits: list[list[int]], capacity: int):
        super().__init__(self.evaluate, self.generate_initial_solutions)

        self.weights = np.array(weights)
        self.profits = np.array(profits)
        self.capacity = np.array(capacity)

        self.num_items = len(weights)
        self.num_objectives = self.profits.shape[0]

    def generate_initial_solutions(
        self, num_solutions: int = 50
    ) -> Iterable[MOKPSolution]:
        """
        Generates a specified number of random feasible solutions for the MOKP.
        Each solution is created by iterating through items in a random order
        and adding them to the knapsack if they do not violate the capacity constraint.
        """
        return [_MOKPSolution(np.zeros(self.num_items, dtype=int), self)]

    def is_feasible(self, solution_data: np.ndarray) -> bool:
        """Checks if a solution is feasible with respect to knapsack capacity."""
        total_weight = np.sum(solution_data * self.weights)
        return total_weight <= self.capacity

    def evaluate(self, solution: MOKPSolution) -> tuple[float, ...]:
        """Calculates the profit for each objective."""
        solution_data = solution.data
        mult = 1 if self.is_feasible(solution.data) else -1

        result = tuple(
            mult * np.sum(solution_data * self.profits[i])
            for i in range(self.num_objectives)
        )
        return result

    def calculate_solution_distance(
        self, sol1: MOKPSolution, sol2: MOKPSolution
    ) -> float:
        """Calculates a distance between two MOKP solutions (binary vectors)."""
        return float(np.sum(sol1.data != sol2.data))


def load_mokp_problem(filename: str) -> MOKPProblem:
    """
    Creates a mock MOKP problem for the example.
    In a real scenario, this would load from a file like MOCOLib instances.
    """
    try:
        with open(BASE / filename, "r") as f:
            configuration = json.load(f)
    except FileNotFoundError:
        raise ValueError(f"Error: File not found at {BASE / filename}")
    except Exception as e:
        raise ValueError(f"Error reading file {filename}: {e}")

    weights = configuration["weights"]
    profits = configuration["objectives"]
    capacity = configuration["metadata"]["capacity"]

    return MOKPProblem(weights, profits, capacity)
