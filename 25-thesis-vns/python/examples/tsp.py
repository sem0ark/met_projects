import sys
import logging
import math
import random

from pathlib import Path
from typing import Iterable


sys.path.insert(1, str(Path(__file__).parent.parent.absolute()))

from vns.abstract import NeighborhoodOperator, ObjectiveFunction, Problem, Solution
from vns.default_configurations import BasicVNSOptimizer, SkewedVNSOptimizer


logger = logging.getLogger(__file__)


class TSPSolution(Solution):
    def __init__(self, tour: list[int]):
        super().__init__(tour)
        self.tour = tour  # tour is the same as data for TSP

    def copy(self) -> "TSPSolution":
        return TSPSolution(list(self.tour))

    def __repr__(self):
        return f"TSPSolution(Tour={self.tour}, Objectives={self.objectives})"


class TSPProblem(Problem):
    def __init__(self, cities: dict):
        super().__init__()
        self.cities = cities
        self.num_cities = len(cities)
        self.distance_matrix = self._precompute_distances()
        self.logger = logging.getLogger(self.__class__.__name__)

    def _precompute_distances(self):
        matrix = {}
        for i in range(self.num_cities):
            for j in range(self.num_cities):
                if i == j:
                    matrix[(i, j)] = 0.0
                elif (j, i) in matrix:
                    matrix[(i, j)] = matrix[(j, i)]
                else:
                    x1, y1 = self.cities[i]
                    x2, y2 = self.cities[j]
                    matrix[(i, j)] = math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
        return matrix

    def get_distance(self, city1_idx: int, city2_idx: int) -> float:
        return self.distance_matrix[(city1_idx, city2_idx)]

    def generate_initial_solution(self) -> TSPSolution:
        initial_tour = list(range(self.num_cities))
        random.shuffle(initial_tour)
        return TSPSolution(initial_tour)

    def get_objective_function(self) -> "TSPObjectiveFunction":
        return TSPObjectiveFunction(self)

    def get_neighborhood_operators(self) -> list[NeighborhoodOperator]:
        return [
            TwoOptOperator(self, name="2-opt"),
            SwapOperator(self, name="Swap 1", num_swaps=1),
            SwapOperator(self, name="Swap 2", num_swaps=2),
        ]

    def calculate_tour_difference_distance(self, sol1: Solution, sol2: Solution) -> float:
        """
        Calculates a simple distance between two TSP tours (solutions).
        Counts the number of city positions that differ.
        A more sophisticated metric could be number of differing edges.
        """
        tour1 = sol1.data
        tour2 = sol2.data
        if len(tour1) != len(tour2):
            raise ValueError("Tours must have the same length for distance calculation.")
        
        diff_count = 0
        for i in range(len(tour1)):
            if tour1[i] != tour2[i]:
                diff_count += 1
        self.logger.debug(f"Calculated tour difference: {diff_count}")
        return float(diff_count) # Return float as required by skewed acceptance


class TSPObjectiveFunction(ObjectiveFunction):
    def __init__(self, problem: TSPProblem):
        super().__init__()
        self.problem = problem

    def evaluate(self, solution: Solution) -> tuple[float, ...]:
        tour = solution.data
        total_length = 0.0
        for i in range(len(tour)):
            city_a = tour[i]
            city_b = tour[(i + 1) % len(tour)]
            total_length += self.problem.get_distance(city_a, city_b)
        return (total_length,)

    def is_better(self, new_solution: Solution, current_solution: Solution) -> bool:
        return new_solution.get_objectives()[0] < current_solution.get_objectives()[0]


class TwoOptOperator(NeighborhoodOperator):
    def __init__(self, problem: TSPProblem, name: str = "2-opt"):
        super().__init__(problem, name)

    def generate_neighbor(self, solution: Solution) -> Solution:
        """Generates a single 2-opt neighbor by randomly choosing two cut points."""
        tour = list(solution.data)  # Make a mutable copy
        n = len(tour)
        # Choose two random distinct indices i and j
        i, j = random.sample(range(n), 2)
        # Ensure i < j for consistent segment definition
        if i > j:
            i, j = j, i

        # Perform the 2-opt swap (reverse the segment between i and j)
        new_tour = tour[:i] + tour[i : j + 1][::-1] + tour[j + 1 :]
        return TSPSolution(new_tour)

    def generate_all_neighbors(self, solution: Solution) -> Iterable[Solution]:
        """Generates all possible 2-opt neighbors for the given solution."""
        tour = list(solution.data)
        n = len(tour)
        for i in range(n - 1):  # Exclude last point for first segment
            for j in range(i + 1, n):  # J must be after I
                # Create a new tour by reversing the segment between i and j
                new_tour = tour[:i] + tour[i : j + 1][::-1] + tour[j + 1 :]
                yield TSPSolution(new_tour)


class SwapOperator(NeighborhoodOperator):
    def __init__(self, problem: TSPProblem, name: str = "Swap", num_swaps: int = 1):
        super().__init__(problem, name)
        self.num_swaps = num_swaps

    def generate_neighbor(self, solution: Solution) -> Solution:
        """Generates a single neighbor by performing 'num_swaps' random swaps."""
        tour = list(solution.data)  # Make a mutable copy
        n = len(tour)
        for _ in range(self.num_swaps):
            idx1, idx2 = random.sample(range(n), 2)
            tour[idx1], tour[idx2] = tour[idx2], tour[idx1]
        return TSPSolution(tour)

    def generate_all_neighbors(self, solution: Solution) -> Iterable[Solution]:
        """
        Generates all 1-swap neighbors for the given solution.
        (If num_swaps > 1, this becomes computationally expensive to generate ALL,
        so this implementation is for num_swaps=1 scenario).
        """
        if self.num_swaps > 1:
            # For num_swaps > 1, generating all neighbors is combinatorially explosive.
            # This method should only be used if it's feasible to generate all relevant neighbors.
            # For a general shaking operator, generate_neighbor is more appropriate.
            logger.info(
                f"Warning: generate_all_neighbors in {self.name} is expensive for num_swaps > 1. "
                f"Generating all 1-swaps for local search."
            )

        tour = list(solution.data)
        n = len(tour)
        for i in range(n):
            for j in range(i + 1, n):  # Swap (i, j) only once to avoid duplicates
                new_tour = list(tour)  # Copy for each new neighbor
                new_tour[i], new_tour[j] = new_tour[j], new_tour[i]
                yield TSPSolution(new_tour)


# Configure logging
def setup_logging(level=logging.INFO):
    # Get the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Clear existing handlers to prevent duplicate output if called multiple times
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    # Create a console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)

    # Create a formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)

    # Add the handler to the root logger
    root_logger.addHandler(console_handler)


if __name__ == "__main__":
    setup_logging(
        # level=logging.DEBUG
    )
    
    cities_data = {
        0: (0, 0),
        1: (1, 5),
        2: (4, 1),
        3: (7, 3),
        4: (3, 7),
        5: (6, 0),
        6: (2, 2),
        7: (5, 6),
        8: (8, 4),
        9: (0, 8),
        10: (9, 2),
        11: (1, 9),
        12: (7, 7),
        13: (4, 4),
        14: (10, 5),
        15: (2, 6),
        16: (8, 1),
        17: (5, 9),
        18: (10, 0),
        19: (0, 10),
    }

    tsp_problem = TSPProblem(cities_data)

    vns_operators = [
        TwoOptOperator(tsp_problem, name="2-opt"),
        SwapOperator(tsp_problem, name="Swap 1", num_swaps=1),
        SwapOperator(tsp_problem, name="Swap 2", num_swaps=2),
    ]

    vns = BasicVNSOptimizer(
        problem=tsp_problem,
        neighborhood_operators=vns_operators,
        max_iterations=500,
        max_no_improvement_iterations=100,
        verbose=True,
    )
    # vns = SkewedVNSOptimizer(
    #     problem=tsp_problem,
    #     alpha = 0.1,
    #     distance_metric=tsp_problem.calculate_tour_difference_distance,
    #     neighborhood_operators=vns_operators,
    #     max_iterations=500,
    #     max_no_improvement_iterations=100,
    #     verbose=True,
    # )

    logger.info(f"Starting VNS for TSP with {tsp_problem.num_cities} cities.")
    logger.info(
        f"Initial solution generated by TSPProblem: {tsp_problem.generate_initial_solution().data}"
    )
    logger.info(
        f"Neighborhood Operators: {[op.name for op in vns.neighborhood_operators]}"
    )

    final_solutions = vns.optimize()

    logger.info("\n--- VNS Optimization Complete ---")
    if final_solutions:
        best_solution = final_solutions[
            0
        ]  # For single-objective, it's the first element
        logger.info(f"Final Best Tour: {best_solution.data}")
        logger.info(f"Final Best Tour Length: {best_solution.get_objectives()[0]:.2f}")
    else:
        logger.info("No solution found.")
