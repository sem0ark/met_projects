import argparse
import json
import random
import sys
import logging
from pathlib import Path
from typing import Any, Iterable
from dataclasses import replace

import matplotlib.pyplot as plt
import time

import numpy as np

sys.path.insert(1, str(Path(__file__).parent.parent.absolute()))

from vns.vns_base import VNSOptimizer
from vns.abstract import Problem, Solution, VNSConfig
from vns.acceptance import TakeBigger, TakeBiggerSkewed
from vns.local_search import (
    best_improvement,
    first_improvement,
    first_improvement_quick,
    noop,
)

from utils import setup_logging, parse_time_string


BASE = Path(__file__).parent.parent.parent / "data" / "mokp"


logger = logging.getLogger("mokp-solver")


class MOKPSolution(Solution[np.ndarray]):
    def __init__(self, data: np.ndarray, problem: "MOKPProblem"):
        super().__init__(data, problem)

    def __repr__(self):
        return f"MOKPSolution(Items={self.data.tolist()}, Objectives={self.objectives})"


class MOKPProblem(Problem):
    def __init__(self, weights: list[int], profits: list[list[int]], capacity: int):
        super().__init__(self.evaluate, self.generate_initial_solutions)

        self.weights = np.array(weights)
        self.profits = np.array(profits)
        self.capacity = np.array(capacity)

        self.num_items = len(weights)
        self.num_objectives = self.profits.shape[0]

    def generate_initial_solutions(self, num_solutions: int = 50) -> Iterable[Solution]:
        """
        Generates a specified number of random feasible solutions for the MOKP.
        Each solution is created by iterating through items in a random order
        and adding them to the knapsack if they do not violate the capacity constraint.
        """
        item_indices = list(range(self.num_items))
        for _ in range(num_solutions):
            solution_data = np.zeros(self.num_items, dtype=int)
            current_weight = 0

            # Shuffle the items to ensure randomness in which ones are considered first
            random.shuffle(item_indices)

            for item_idx in item_indices:
                if current_weight + self.weights[item_idx] <= self.capacity:
                    solution_data[item_idx] = 1
                    current_weight += self.weights[item_idx]

            yield MOKPSolution(solution_data, self)

    def is_feasible(self, solution_data: np.ndarray) -> bool:
        """Checks if a solution is feasible with respect to knapsack capacity."""
        total_weight = np.sum(solution_data * self.weights)
        return total_weight <= self.capacity

    def evaluate(self, solution: Solution) -> tuple[float, ...]:
        """Calculates the profit for each objective."""
        solution_data = solution.data
        mult = 1 if self.is_feasible(solution.data) else -1

        result = tuple(
            mult * np.sum(solution_data * self.profits[i])
            for i in range(self.num_objectives)
        )
        return result

    def calculate_solution_distance(self, sol1: Solution, sol2: Solution) -> float:
        """Calculates a distance between two MOKP solutions (binary vectors)."""
        return float(np.sum(sol1.data != sol2.data))


def shake_add_remove(solution: Solution, k: int, config: VNSConfig) -> Solution:
    """
    Randomly adds or removes 'k' items.
    """
    solution_data = solution.data.copy()

    for _ in range(k):
        is_add_operation = random.random() > 0.5

        if is_add_operation:
            unselected_items = np.where(solution_data == 0)[0]
            if unselected_items.size > 0:
                item_to_add = random.choice(unselected_items)
                solution_data[item_to_add] = 1
        else:
            selected_items = np.where(solution_data == 1)[0]
            if selected_items.size > 0:
                item_to_remove = random.choice(selected_items)
                solution_data[item_to_remove] = 0

    return solution.new(solution_data)


def shake_swap(solution: Solution, k: int, config: VNSConfig) -> Solution:
    """
    Randomly swaps a selected item with an unselected item 'k' times.
    """
    solution_data = solution.data.copy()

    for _ in range(k):
        selected_items = np.where(solution_data == 1)[0]
        unselected_items = np.where(solution_data == 0)[0]

        if selected_items.size > 0 and unselected_items.size > 0:
            item_to_swap_out = random.choice(selected_items)
            item_to_swap_in = random.choice(unselected_items)
            solution_data[item_to_swap_out] = 0
            solution_data[item_to_swap_in] = 1

    return solution.new(solution_data)


def shuffled(lst: Iterable) -> list[Any]:
    lst = list(lst)
    random.shuffle(lst)
    return lst


def add_remove_op(solution: Solution, config: VNSConfig) -> Iterable[Solution]:
    """Generates neighbors by adding or removing a single item."""
    solution_data = solution.data
    num_items = len(solution_data)

    for i in shuffled(range(num_items)):
        new_data = solution_data.copy()
        new_data[i] = 1 - new_data[i]
        yield solution.new(new_data)


def swap_op(solution: Solution, config: VNSConfig) -> Iterable[Solution]:
    """Generates neighbors by swapping one selected item with one unselected item."""
    solution_data = solution.data

    selected_items = np.where(solution_data == 1)[0]
    unselected_items = np.where(solution_data == 0)[0]

    for i in shuffled(selected_items):
        for j in shuffled(unselected_items):
            new_data = solution_data.copy()
            new_data[i] = 0
            new_data[j] = 1

            yield solution.new(new_data)


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


def prepare_mokp_optimizers(mokp_problem: MOKPProblem) -> dict[str, VNSOptimizer]:
    """
    Prepares a set of VNS optimizers for the MOKP problem.
    """
    bvns = VNSConfig(
        problem=mokp_problem,
        search_functions=[noop()],
        acceptance_criterion=TakeBigger(10),
        shake_function=shake_add_remove,
    )
    rvns = VNSConfig(
        problem=mokp_problem,
        search_functions=[noop()],
        acceptance_criterion=TakeBigger(10),
        shake_function=shake_add_remove,
    )
    svns = VNSConfig(
        problem=mokp_problem,
        search_functions=[noop()],
        acceptance_criterion=TakeBiggerSkewed(
            1, mokp_problem.calculate_solution_distance, 20
        ),
        shake_function=shake_add_remove,
    )

    return {
        "RVNS": VNSOptimizer(replace(rvns, search_functions=[noop()] * 5)),
        "BVNS_BI": VNSOptimizer(
            replace(bvns, search_functions=[best_improvement(add_remove_op)] * 5)
        ),
        "BVNS_FI": VNSOptimizer(
            replace(bvns, search_functions=[first_improvement(add_remove_op)] * 5)
        ),
        "BVNS_QFI": VNSOptimizer(
            replace(bvns, search_functions=[first_improvement_quick(add_remove_op)] * 5)
        ),
        "SVNS_BI": VNSOptimizer(
            replace(svns, search_functions=[best_improvement(add_remove_op)] * 5)
        ),
        "SVNS_FI": VNSOptimizer(
            replace(svns, search_functions=[first_improvement(add_remove_op)] * 5)
        ),
        "SVNS_QFI": VNSOptimizer(
            replace(svns, search_functions=[first_improvement_quick(add_remove_op)] * 5)
        ),
        # "BVNS_BI_Beam10": VNSOptimizer(replace(bvns, acceptance_criterion=TakeBigger(10))),
        # "BVNS_BI_Beam20": VNSOptimizer(replace(bvns, acceptance_criterion=TakeBigger(20))),
        # "BVNS_FI_Beam10": VNSOptimizer(replace(bvns, search_functions=[first_improvement_quick(add_remove_op)] * 5, acceptance_criterion=TakeBigger(10))),
        # "BVNS_FI_Beam20": VNSOptimizer(replace(bvns, search_functions=[first_improvement_quick(add_remove_op)] * 5, acceptance_criterion=TakeBigger(20))),
        # "BVNS_QFI_Beam10": VNSOptimizer(replace(bvns, search_functions=[first_improvement_quick(add_remove_op)] * 5, acceptance_criterion=TakeBigger(10))),
        # "BVNS_QFI_Beam20": VNSOptimizer(replace(bvns, search_functions=[first_improvement_quick(add_remove_op)] * 5, acceptance_criterion=TakeBigger(20))),
        # "RVNS_Beam10":    VNSOptimizer(replace(rvns, acceptance_criterion=TakeBigger(10))),
        # "RVNS_Beam20":    VNSOptimizer(replace(rvns, acceptance_criterion=TakeBigger(20))),
    }


def run_mokp_example(
    filename: str,
    optimizer_type: str,
    run_time: str,
    max_iterations_no_improvement: int,
):
    setup_logging(level=logging.INFO)
    max_run_time_seconds = parse_time_string(run_time)

    logger.info(f"--- Running {optimizer_type} with {filename} ---")
    logger.info(f"Max run time: {run_time} ({max_run_time_seconds:.2f} seconds)")
    logger.info(f"Max iterations without improvement: {max_iterations_no_improvement}")

    mokp_problem = load_mokp_problem(filename)
    optimizers = prepare_mokp_optimizers(mokp_problem)

    optimizer = optimizers.get(optimizer_type)
    if not optimizer:
        logger.error(f"Unknown optimizer type: {optimizer_type}")
        return

    start_time = time.time()
    last_improved = 1
    improved_objectives_data = set()

    optimizer.config.acceptance_criterion.clear()

    for iteration, improved in enumerate(optimizer.optimize(), 1):
        elapsed_time = time.time() - start_time

        if improved:
            logger.info(
                "Iteration %d: # solutions = %d",
                iteration,
                len(optimizer.config.acceptance_criterion.get_all_solutions()),
            )

            for sol in optimizer.config.acceptance_criterion.get_all_solutions():
                improved_objectives_data.add(sol.objectives)

        if elapsed_time > max_run_time_seconds:
            logger.info("Timeout.")
            break

        if improved:
            last_improved = iteration
        elif iteration - last_improved > max_iterations_no_improvement:
            logger.info(
                "No improvements for %d iterations.", max_iterations_no_improvement
            )
            break

    logger.info(f"--- {optimizer_type} Optimization Complete ---")

    pareto_front_objectives = []
    for solution in optimizer.config.acceptance_criterion.get_all_solutions():
        pareto_front_objectives.append(solution.objectives)

    logger.info(f"Overall Best Pareto Front Size: {len(pareto_front_objectives)}")

    # Plotting the Pareto front

    if improved_objectives_data:
        improved_objectives_data = list(improved_objectives_data)
        obj1_imp = [o[0] for o in improved_objectives_data]
        obj2_imp = [o[1] for o in improved_objectives_data]
        plt.scatter(
            obj1_imp,
            obj2_imp,
            marker="x",
            linestyle="",
            color="red",
            label="Improved Solutions",
            alpha=0.5,
        )

    # Plot the final Pareto front
    if pareto_front_objectives:
        obj1_pf = [o[0] for o in pareto_front_objectives]
        obj2_pf = [o[1] for o in pareto_front_objectives]
        plt.scatter(
            obj1_pf,
            obj2_pf,
            marker="o",
            linestyle="",
            color="blue",
            label="Final Pareto Front",
        )

    plt.title(f"{optimizer_type} for MOKP {filename.split('.json')[0]}")
    plt.xlabel("Z1")
    plt.ylabel("Z2")
    plt.gca().set_aspect("equal", adjustable="box")

    plt.grid(True, linestyle="--", alpha=0.7)
    plt.legend()
    plt.tight_layout()
    plt.show()


def compare_mokp(filename: str, run_time: str, max_iterations_no_improvement: int):
    setup_logging(level=logging.INFO)
    max_run_time_seconds = parse_time_string(run_time)

    mokp_problem = load_mokp_problem(filename)
    optimizers = prepare_mokp_optimizers(mokp_problem)

    for optimizer_type, optimizer in optimizers.items():
        logger.info(f"--- Running {optimizer_type} Example {filename} ---")
        logger.info(f"Max run time: {run_time} ({max_run_time_seconds:.2f} seconds)")
        logger.info(
            f"Max iterations without improvement: {max_iterations_no_improvement}"
        )

        start_time = time.time()
        last_improved = 1

        optimizer.config.acceptance_criterion.clear()

        for iteration, improved in enumerate(optimizer.optimize(), 1):
            elapsed_time = time.time() - start_time

            if improved:
                logger.info(
                    "Iteration %d: # solutions = %d",
                    iteration,
                    len(optimizer.config.acceptance_criterion.get_all_solutions()),
                )

            if elapsed_time > max_run_time_seconds:
                logger.info("Timeout.")
                break

            if improved:
                last_improved = iteration
            elif iteration - last_improved > max_iterations_no_improvement:
                logger.info(
                    "No improvements for %d iterations.", max_iterations_no_improvement
                )
                break

        logger.info(f"--- {optimizer_type} Optimization Complete ---")

        pareto_front_objectives = []
        for solution in optimizer.config.acceptance_criterion.get_all_solutions():
            pareto_front_objectives.append(solution.objectives)

        pareto_front_objectives.sort()
        obj1_pf = [o[0] for o in pareto_front_objectives]
        obj2_pf = [o[1] for o in pareto_front_objectives]

        plt.plot(
            obj1_pf,
            obj2_pf,
            marker="o",
            linestyle="-",
            label=optimizer_type,
        )

    plt.title(filename.split(".json")[0])
    plt.xlabel("Z1")
    plt.ylabel("Z2")
    plt.gca().set_aspect("equal", adjustable="box")

    plt.grid(True, linestyle="--", alpha=0.7)
    plt.legend()
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run VNS optimization for MOKP using a problem file at data/mokp."
    )
    parser.add_argument(
        "filename",
        type=str,
        help="Path to the TSPLIB .tsp file (e.g., data/linho_100_tsp.tsp)",
    )
    parser.add_argument(
        "--optimizer-type",
        type=str,
        default="RVNS",
        help="Type of VNS optimizer to run.",
    )
    parser.add_argument(
        "--run-time",
        type=str,
        default="10h",
        help="Maximum duration for the script to run (e.g., '30s', '5m', '1h').",
    )
    parser.add_argument(
        "--max-no-improvements",
        type=int,
        default=sys.maxsize,
        help="Secondary limit: Maximum number of VNS iterations without any improvements.",
    )
    parser.add_argument(
        "--optimal-value",
        type=float,
        help="Optional: Known optimal solution value for comparison in plot.",
    )
    parser.add_argument(
        "--compare",
        action="store_true",
    )

    args = parser.parse_args()

    if not args.compare:
        run_mokp_example(
            args.filename,
            args.optimizer_type,
            args.run_time,
            args.max_no_improvements,
        )
    else:
        compare_mokp(
            args.filename,
            args.run_time,
            args.max_no_improvements,
        )
