import sys
import logging
import math
import random

from pathlib import Path
from typing import Iterable

sys.path.insert(1, str(Path(__file__).parent.parent.absolute()))

from vns.local_search import BestImprovementLocalSearch, FirstImprovementLocalSearch
from vns.abstract import NeighborhoodOperator, ObjectiveFunction, Problem, Solution
from vns.default_configurations import (
    BasicVNSOptimizer,
    GeneralVNSOptimizer,
    SkewedVNSOptimizer,
)


logger = logging.getLogger(__file__)


class TSPSolution(Solution):
    def __init__(self, tour: list[int]):
        super().__init__(tour)
        self.tour = tour  # tour is the same as data for TSP

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
            FlipRegionOperator(self, name="region-flip"),
            SwapOperator(self, name="Swap 1", num_swaps=1),
            SwapOperator(self, name="Swap 2", num_swaps=2),
        ]

    def calculate_tour_difference_distance(
        self, sol1: Solution, sol2: Solution
    ) -> float:
        """
        Calculates a simple distance between two TSP tours (solutions).
        Counts the number of city positions that differ.
        A more sophisticated metric could be number of differing edges.
        """
        tour1 = sol1.data
        tour2 = sol2.data
        if len(tour1) != len(tour2):
            raise ValueError(
                "Tours must have the same length for distance calculation."
            )

        diff_count = 0
        for i in range(len(tour1)):
            if tour1[i] != tour2[i]:
                diff_count += 1
        self.logger.debug(f"Calculated tour difference: {diff_count}")
        return float(diff_count)  # Return float as required by skewed acceptance


class TSPObjectiveFunction(ObjectiveFunction):
    def __init__(self, problem: TSPProblem):
        super().__init__(1)
        self.problem = problem

    def evaluate(self, solution: Solution) -> tuple[float, ...]:
        tour = solution.data
        total_length = 0.0
        for i in range(len(tour)):
            city_a = tour[i]
            city_b = tour[(i + 1) % len(tour)]
            total_length += self.problem.get_distance(city_a, city_b)
        return (total_length,)


class FlipRegionOperator(NeighborhoodOperator):
    def __init__(self, problem: TSPProblem, name: str = "region-flip"):
        super().__init__(problem, name)

    def generate_neighbor(self, solution: Solution) -> Solution:
        """Generates a single neighbor by randomly choosing two cut points and flipping a region."""
        tour = list(solution.data)  # Make a mutable copy
        n = len(tour)

        i, j = random.sample(range(n), 2)
        if i > j:
            i, j = j, i

        # Flip some region of the path
        new_tour = tour[:i] + tour[i : j + 1][::-1] + tour[j + 1 :]
        return TSPSolution(new_tour)

    def generate_all_neighbors(self, solution: Solution) -> Iterable[Solution]:
        """Generates all possible region-flip neighbors for the given solution."""
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
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    console_handler.setFormatter(formatter)

    # Add the handler to the root logger
    root_logger.addHandler(console_handler)


logger = logging.getLogger(__name__)


def run_vns_example(optimizer_type: str):
    setup_logging(level=logging.INFO)  # Set to DEBUG for more detailed output

    logger.info(f"\n--- Running {optimizer_type} Example ---")

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

    # Neighborhood operators for shaking
    # These are the ones used by the VNS main loop for shaking (N_k operators)
    vns_shaking_operators = [
        FlipRegionOperator(tsp_problem, name="region-flip"),
        SwapOperator(tsp_problem, name="Swap 1", num_swaps=1),
        SwapOperator(tsp_problem, name="Swap 2", num_swaps=2),
    ]

    vns_optimizer = None

    if optimizer_type == "BasicVNS_BI":
        vns_optimizer = BasicVNSOptimizer(
            problem=tsp_problem,
            neighborhood_operators=vns_shaking_operators,
            max_iterations=500,
            max_no_improvement_iterations=300,
            local_search_strategy=BestImprovementLocalSearch(tsp_problem, FlipRegionOperator(tsp_problem, name="region-flip-VND")),
        )
    elif optimizer_type == "BasicVNS_FI":
        vns_optimizer = BasicVNSOptimizer(
            problem=tsp_problem,
            max_iterations=500,
            max_no_improvement_iterations=300,
            neighborhood_operators=vns_shaking_operators,
            local_search_strategy=FirstImprovementLocalSearch(tsp_problem, FlipRegionOperator(tsp_problem, name="region-flip-VND")),
        )
    elif optimizer_type == "GeneralVNS_VND":
        vns_optimizer = GeneralVNSOptimizer(
            problem=tsp_problem,
            neighborhood_operators=vns_shaking_operators,
            local_search_strategies=[
                BestImprovementLocalSearch(tsp_problem, FlipRegionOperator(tsp_problem, name="region-flip-VND")),
                BestImprovementLocalSearch(tsp_problem, SwapOperator(tsp_problem, name="Swap 1-VND", num_swaps=1)),
            ],
            max_iterations=500,
            max_no_improvement_iterations=300,
        )
    elif optimizer_type == "SkewedVNS":
        vns_optimizer = SkewedVNSOptimizer(
            problem=tsp_problem,
            alpha=0.1,  # Skewing parameter
            distance_metric=tsp_problem.calculate_tour_difference_distance,  # Problem-specific distance metric
            neighborhood_operators=vns_shaking_operators,
            max_iterations=500,
            max_no_improvement_iterations=100,  # Often a lower patience for skewed VNS
        )
    elif optimizer_type == "SkewedVNS_FI":
        vns_optimizer = SkewedVNSOptimizer(
            problem=tsp_problem,
            alpha=0.1,  # Skewing parameter
            distance_metric=tsp_problem.calculate_tour_difference_distance,  # Problem-specific distance metric
            neighborhood_operators=vns_shaking_operators,
            max_iterations=500,
            max_no_improvement_iterations=100,  # Often a lower patience for skewed VNS
            local_search_strategy=FirstImprovementLocalSearch(tsp_problem, vns_shaking_operators[0]),
        )
    else:
        logger.error(f"Unknown optimizer type: {optimizer_type}")
        return

    logger.info(
        f"Starting {optimizer_type} for TSP with {tsp_problem.num_cities} cities."
    )
    logger.info(
        f"Neighborhood Operators (for shaking): {[op.name for op in vns_optimizer.neighborhood_operators]}"
    )
    logger.info(
        f"Local Search Strategy: {vns_optimizer.local_search_strategy.__class__.__name__}"
    )
    if hasattr(vns_optimizer.local_search_strategy, "local_search_strategies"):
        logger.info(
            f"  VND Strategies: {[
                s.__class__.__name__ + '(' + (s.neighborhood_operator.name if s.neighborhood_operator else 'N/A') + ')'
                for s in vns_optimizer.local_search_strategy.local_search_strategies
            ]}"
        )

    final_solutions = vns_optimizer.optimize()

    logger.info(f"\n--- {optimizer_type} Optimization Complete ---")
    if final_solutions:
        best_solution = final_solutions[0]
        logger.info(f"Final Best Tour: {best_solution.data}")
        logger.info(f"Final Best Tour Length: {best_solution.get_objectives()[0]:.2f}")
    else:
        logger.info("No solution found.")


if __name__ == "__main__":
    # run_vns_example("BasicVNS_BI")
    # run_vns_example("BasicVNS_FI")
    # run_vns_example("GeneralVNS_VND")
    run_vns_example("SkewedVNS")
    # run_vns_example("SkewedVNS_FI")
