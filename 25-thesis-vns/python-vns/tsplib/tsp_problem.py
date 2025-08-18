import sys
import logging
from pathlib import Path
import random
from typing import Any, Callable, Iterable

import numpy as np

sys.path.insert(1, str(Path(__file__).parent.parent.absolute()))

from vns.abstract import NeighborhoodOperator, ObjectiveFunction, Problem, Solution

logger = logging.getLogger(__name__)


class TSPSolution(Solution):
    def __init__(self, tour: list[int]):
        super().__init__(tour)
        # Ensure tour is a numpy array for efficient operations
        self.tour = np.array(tour, dtype=int)

    def __repr__(self):
        return f"TSPSolution(Tour={self.tour.tolist()}, Objectives={self.objectives})"  # Convert back to list for representation


class TSPProblem(Problem):
    def __init__(self, cities: dict, distance_function: Callable[[Any, Any], float]):
        super().__init__()
        self.cities = cities
        self.num_cities = len(cities)
        self.distance_function = distance_function
        self.logger = logging.getLogger(self.__class__.__name__)
        # Pre-calculate distance matrix if distance_function is a simple lookup
        # This is a significant optimization for repeated distance calls.
        self.distance_matrix = self._precompute_distance_matrix()

    def _precompute_distance_matrix(self) -> np.ndarray:
        """Precomputes the distance matrix from the cities and distance function."""
        matrix = np.zeros((self.num_cities, self.num_cities))
        for i in range(self.num_cities):
            for j in range(self.num_cities):
                if i == j:
                    matrix[i, j] = 0.0
                else:
                    matrix[i, j] = self.distance_function(
                        self.cities[i], self.cities[j]
                    )
        return matrix

    def get_distance(self, city1_idx: int, city2_idx: int) -> float:
        # Use the precomputed distance matrix
        return self.distance_matrix[city1_idx, city2_idx]

    def generate_initial_solution(self) -> TSPSolution:
        initial_tour = np.arange(self.num_cities)
        np.random.shuffle(initial_tour)
        return TSPSolution(
            initial_tour.tolist()
        )  # Convert to list as TSPSolution expects list

    def get_objective_function(self) -> "TSPObjectiveFunction":
        return TSPObjectiveFunction(self)

    def get_neighborhood_operators(self) -> list[NeighborhoodOperator]:
        return [
            FlipRegionOperator(self, name="Region flip"),
            SwapOperator(self, name="Swap 1", num_swaps=1),
            SwapOperator(self, name="Swap 2", num_swaps=2),
            ShuffleOperator(self, name="Shuffle"),
        ]

    def calculate_tour_difference_distance(
        self, sol1: Solution, sol2: Solution
    ) -> float:
        """
        Calculates a simple distance between two TSP tours (solutions).
        Counts the number of city positions that differ using NumPy.
        """
        tour1 = np.array(sol1.data)
        tour2 = np.array(sol2.data)
        if len(tour1) != len(tour2):
            raise ValueError(
                "Tours must have the same length for distance calculation."
            )

        # Using NumPy for element-wise comparison and sum
        diff_count = np.sum(tour1 != tour2)
        return float(diff_count)


class TSPObjectiveFunction(ObjectiveFunction):
    def __init__(self, problem: TSPProblem):
        super().__init__(1)
        self.problem = problem

    def evaluate(self, solution: Solution) -> tuple[float, ...]:
        tour = np.array(solution.data)  # Ensure tour is a NumPy array

        # Vectorized calculation of total tour length using NumPy
        # This leverages the precomputed distance matrix
        shifted_tour = np.roll(tour, -1)
        total_length = np.sum(self.problem.distance_matrix[tour, shifted_tour])
        return (float(total_length),)


class FlipRegionOperator(NeighborhoodOperator):
    def __init__(self, problem: TSPProblem, name: str = "Region flip"):
        super().__init__(problem, name)

    def generate_neighbor(self, solution: Solution) -> Solution:
        """Generates a single neighbor by randomly choosing two cut points and flipping a region."""
        tour = np.array(solution.data)
        n = len(tour)

        i, j = random.sample(range(n), 2)
        if i > j:
            i, j = j, i

        # Using NumPy slicing and concatenation for efficiency
        new_tour = np.concatenate((tour[:i], tour[i : j + 1][::-1], tour[j + 1 :]))
        return TSPSolution(new_tour.tolist())  # Convert back to list for TSPSolution

    def generate_all_neighbors(self, solution: Solution) -> Iterable[Solution]:
        """Generates all possible Region flip neighbors for the given solution."""
        tour = np.array(solution.data)
        n = len(tour)
        for i in range(n - 1):
            for j in range(i + 1, n):
                # Using NumPy slicing and concatenation for efficiency
                new_tour = np.concatenate(
                    (tour[:i], tour[i : j + 1][::-1], tour[j + 1 :])
                )
                yield TSPSolution(
                    new_tour.tolist()
                )  # Convert back to list for TSPSolution


class SwapOperator(NeighborhoodOperator):
    def __init__(self, problem: TSPProblem, name: str = "Swap", num_swaps: int = 1):
        super().__init__(problem, name)
        self.num_swaps = num_swaps

    def generate_neighbor(self, solution: Solution) -> Solution:
        """Generates a single neighbor by performing 'num_swaps' random swaps."""
        tour = np.array(solution.data)
        n = len(tour)
        for _ in range(self.num_swaps):
            idx1, idx2 = random.sample(range(n), 2)
            # In-place swap using NumPy
            tour[[idx1, idx2]] = tour[[idx2, idx1]]
        return TSPSolution(tour.tolist())  # Convert back to list for TSPSolution

    def generate_all_neighbors(self, solution: Solution) -> Iterable[Solution]:
        """
        Generates all 1-swap neighbors for the given solution using NumPy.
        (If num_swaps > 1, this becomes computationally expensive to generate ALL,
        so this implementation is for num_swaps=1 scenario).
        """
        if self.num_swaps > 1:
            logger.info(
                f"Warning: generate_all_neighbors in {self.name} is expensive for num_swaps > 1. "
                f"Generating all 1-swaps for local search."
            )

        tour = np.array(solution.data)
        n = len(tour)
        for i in range(n):
            for j in range(i + 1, n):
                new_tour = tour.copy()  # Create a copy to modify
                # Perform the swap using NumPy
                new_tour[[i, j]] = new_tour[[j, i]]
                yield TSPSolution(
                    new_tour.tolist()
                )  # Convert back to list for TSPSolution


class ShuffleOperator(NeighborhoodOperator):
    def __init__(self, problem: TSPProblem, name: str = "Shuffle"):
        super().__init__(problem, name)

    def generate_neighbor(self, solution: Solution) -> Solution:
        """Generates a single neighbor by performing 'num_swaps' random swaps."""
        tour = np.array(solution.data)
        np.random.shuffle(tour)
        return TSPSolution(tour.tolist())

    def generate_all_neighbors(self, solution: Solution) -> Iterable[Solution]:
        """
        Generates all 1-swap neighbors for the given solution using NumPy.
        (If num_swaps > 1, this becomes computationally expensive to generate ALL,
        so this implementation is for num_swaps=1 scenario).
        """
        tour = np.array(solution.data)
        np.random.shuffle(tour)
        yield TSPSolution(tour.tolist())
