import argparse
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

from mokp.ngsa2 import solve_mokp_ngsa2
from mokp.spea2 import solve_mokp_spea2

from vns.optimizer import VNSOptimizer
from vns.abstract import VNSConfig
from vns.acceptance import AcceptBatchBigger, AcceptBatchSkewedBigger
from vns.local_search import (
    best_improvement,
    first_improvement,
    noop,
)

from mokp_problem import MOKPProblem, MOKPSolution


logger = logging.getLogger("mokp-solver")


def shake_add_remove(
    solution: MOKPSolution, k: int, _config: VNSConfig
) -> MOKPSolution:
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


def shake_swap(solution: MOKPSolution, k: int, _config: VNSConfig) -> MOKPSolution:
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


def add_remove_op(solution: MOKPSolution, config: VNSConfig) -> Iterable[MOKPSolution]:
    """Generates neighbors by adding or removing a single item."""
    solution_data = solution.data
    num_items = len(solution_data)

    for i in shuffled(range(num_items)):
        new_data = solution_data.copy()
        new_data[i] = 1 - new_data[i]
        yield solution.new(new_data)


def swap_op(solution: MOKPSolution, config: VNSConfig) -> Iterable[MOKPSolution]:
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


def prepare_mokp_optimizers(mokp_problem: MOKPProblem) -> dict[str, VNSOptimizer]:
    """
    Prepares a set of VNS optimizers for the MOKP problem.
    """
    bvns = VNSConfig(
        problem=mokp_problem,
        search_functions=[noop()],
        acceptance_criterion=AcceptBatchBigger(),
        shake_function=shake_add_remove,
    )
    rvns = VNSConfig(
        problem=mokp_problem,
        search_functions=[noop()],
        acceptance_criterion=AcceptBatchBigger(),
        shake_function=shake_add_remove,
    )
    svns = VNSConfig(
        problem=mokp_problem,
        search_functions=[noop()],
        acceptance_criterion=AcceptBatchSkewedBigger(
            1, mokp_problem.calculate_solution_distance
        ),
        shake_function=shake_add_remove,
    )

    return {
        "RVNS": VNSOptimizer(
            replace(
                rvns,
                search_functions=[noop()] * 5,
                acceptance_criterion=AcceptBatchBigger(),
            )
        ),
        "BVNS_BI": VNSOptimizer(
            replace(bvns, search_functions=[best_improvement(add_remove_op)] * 5)
        ),
        "BVNS_FI": VNSOptimizer(
            replace(bvns, search_functions=[first_improvement(add_remove_op)] * 5)
        ),
        "SVNS_BI": VNSOptimizer(
            replace(svns, search_functions=[best_improvement(add_remove_op)] * 5)
        ),
        "SVNS_FI": VNSOptimizer(
            replace(svns, search_functions=[first_improvement(add_remove_op)] * 5)
        ),
    }


def run_mokp_optimizer(
    max_run_time_seconds: float,
    max_iterations_no_improvement: int,
    optimizer: VNSOptimizer,
    include_improvement_history=False,
):
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
            if include_improvement_history:
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

    pareto_front_objectives = []
    for solution in optimizer.config.acceptance_criterion.get_all_solutions():
        pareto_front_objectives.append(solution.objectives)

    pareto_front_objectives.sort()
    return list(improved_objectives_data), pareto_front_objectives


def plot_final_pareto_front(label, improved_objectives_data, pareto_front_objectives):
    if improved_objectives_data is not None:
        improved_objectives_data = list(improved_objectives_data)
        obj1_imp = [o[0] for o in improved_objectives_data]
        obj2_imp = [o[1] for o in improved_objectives_data]
        plt.scatter(
            obj1_imp,
            obj2_imp,
            marker="x",
            linestyle="",
            label=f"Pareto Front Changes ({label})",
            alpha=0.5,
        )

    if pareto_front_objectives is not None:
        obj1_pf = [o[0] for o in pareto_front_objectives]
        obj2_pf = [o[1] for o in pareto_front_objectives]
        plt.plot(
            obj1_pf,
            obj2_pf,
            marker="o",
            linestyle="-",
            label=f"Pareto Front ({label})",
        )


def plot_optimizer(
    filename: str,
    optimizer_type: str,
    run_time: str,
    max_iterations_no_improvement: int,
):
    setup_logging(level=logging.INFO)
    max_run_time_seconds = parse_time_string(run_time)

    logger.info(f"--- Running {optimizer_type} with {filename} ---")
    logger.info(f"Max run time: {max_run_time_seconds:.2f} seconds")
    logger.info(f"Max iterations without improvement: {max_iterations_no_improvement}")

    mokp_problem = MOKPProblem.load(filename)
    optimizers = prepare_mokp_optimizers(mokp_problem)

    optimizer = optimizers.get(optimizer_type)
    if not optimizer:
        logger.error(f"Unknown optimizer type: {optimizer_type}")
        return

    improved_objectives_data, pareto_front_objectives = run_mokp_optimizer(
        max_run_time_seconds,
        max_iterations_no_improvement,
        optimizer,
        include_improvement_history=True,
    )

    logger.info(f"--- {optimizer_type} Optimization Complete ---")
    logger.info(f"Final Pareto Front Size: {len(pareto_front_objectives)}")

    plot_final_pareto_front(
        optimizer_type, improved_objectives_data, pareto_front_objectives
    )


def plot_all_optimizers(
    filename: str, run_time: str, max_iterations_no_improvement: int
):
    max_run_time_seconds = parse_time_string(run_time)

    mokp_problem = MOKPProblem.load(filename)
    optimizers = prepare_mokp_optimizers(mokp_problem)

    for optimizer_type, optimizer in optimizers.items():
        logger.info(f"--- Running {optimizer_type} with {filename} ---")
        logger.info(f"Max run time: {max_run_time_seconds:.2f} seconds")
        logger.info(
            f"Max iterations without improvement: {max_iterations_no_improvement}"
        )

        _, pareto_front_objectives = run_mokp_optimizer(
            max_run_time_seconds, max_iterations_no_improvement, optimizer
        )
        plot_final_pareto_front(optimizer_type, None, pareto_front_objectives)

        logger.info(f"--- {optimizer_type} Optimization Complete ---")
        logger.info(f"Final Pareto Front Size: {len(pareto_front_objectives)}")


def plot_reference_algorithms(
    filename: str, run_time: str, max_iterations_no_improvement: int
):
    max_run_time_seconds = parse_time_string(run_time)

    ngsa2_data: np.ndarray = solve_mokp_ngsa2(filename, max_run_time_seconds)
    ngsa2_data = -ngsa2_data
    ngsa2_data_list = [(o[0], o[1]) for o in ngsa2_data]
    ngsa2_data_list.sort()
    plot_final_pareto_front("NGSA2", None, ngsa2_data_list)

    spea2_data: np.ndarray = solve_mokp_spea2(filename, max_run_time_seconds)
    spea2_data = -spea2_data
    spea2_data_list = [(o[0], o[1]) for o in spea2_data]
    spea2_data_list.sort()
    plot_final_pareto_front("SPEA2", None, spea2_data_list)


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
        default=None,
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
    parser.add_argument("--all", default=False, action="store_true")
    parser.add_argument(
        "--plot-reference-algorithms", default=False, action="store_true"
    )

    args = parser.parse_args()
    setup_logging(level=logging.INFO)

    mokp_problem = MOKPProblem.load(args.filename)
    max_run_time_seconds = parse_time_string(args.run_time)
    optimizer = VNSOptimizer(
        VNSConfig(
            problem=mokp_problem,
            search_functions=[noop()] * 5,
            acceptance_criterion=AcceptBatchBigger(),
            shake_function=shake_add_remove,
            name="RVNS Shake bit switch"
        )
    )
    solutions = run_vns_optimizer(max_run_time_seconds, optimizer)

    save_run_data(
        optimizer.config.acceptance_criterion.get_all_solutions(),
        optimizer.config,
        "mokp",
        args.filename,
        int(max_run_time_seconds),
    )

    # if args.all:
    #     plot_all_optimizers(
    #         args.filename,
    #         args.run_time,
    #         args.max_no_improvements,
    #     )
    #     plt.title(args.filename.split(".json")[0])

    # if args.optimizer_type:
    #     plot_optimizer(
    #         args.filename,
    #         args.optimizer_type,
    #         args.run_time,
    #         args.max_no_improvements,
    #     )
    #     plt.title(f"{args.optimizer_type} for MOKP {args.filename.split('.json')[0]}")

    # if args.plot_reference_algorithms:
    #     plot_reference_algorithms(
    #         args.filename,
    #         args.run_time,
    #         args.max_no_improvements,
    #     )
    #     plt.title(args.filename.split(".json")[0])

    # plt.xlabel("Z1")
    # plt.ylabel("Z2")
    # plt.gca().set_aspect("equal", adjustable="box")

    # plt.grid(True, linestyle="--", alpha=0.7)
    # plt.legend()
    # plt.tight_layout()
    # plt.show()
