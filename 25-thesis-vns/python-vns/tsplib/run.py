import re
import sys
import logging
from pathlib import Path
from typing import Optional, cast
import argparse
import matplotlib.pyplot as plt
import time

from parse_tsplib_problem import TSPLibParser
from distance_functions import get_distance_function
from tsp_problem import FlipRegionOperator, SwapOperator, TSPProblem

sys.path.insert(1, str(Path(__file__).parent.parent.absolute()))

from vns.acceptance import BeamSeachSkewedAcceptance, BeamSearchAcceptance
from vns.local_search import (
    BestImprovementLocalSearch,
    CompositeLocalSearch,
    FirstImprovementLocalSearch,
)
from vns.vns_base import VNSOptimizerBase
from vns.default_configurations import (
    BasicVNSOptimizer,
    GeneralVNSOptimizer,
    ReducedVNSOptimizer,
    SkewedVNSOptimizer,
)

BASE = Path(__file__).parent.parent.parent / "data" / "tsplib"



logger = logging.getLogger(__name__)

def load_tsp_problem(
    filename: str,
) -> TSPProblem:
    """
    Loads a TSP problem from a TSPLIB file, handling both coordinate-based
    and explicit distance matrix formats.
    """
    try:
        with open(BASE / filename, "r") as f:
            file_content = f.read()
    except FileNotFoundError:
        raise ValueError(f"Error: File not found at {BASE / filename}")
    except Exception as e:
        raise ValueError(f"Error reading file {filename}: {e}")

    parser = TSPLibParser()
    try:
        parsed_data = parser.parse_string(file_content)
    except Exception as e:
        raise ValueError(f"Error parsing TSPLIB file {filename}: {e}")

    # Determine problem dimension
    expected_num_cities = parsed_data["specification"].get("DIMENSION")
    if expected_num_cities is None:
        logger.warning(
            f"DIMENSION not specified in TSPLIB file {filename}. Attempting to infer."
        )

        # Try to infer from NODE_COORDS or EDGE_WEIGHTS if DIMENSION is missing
        if parsed_data["data"].get("NODE_COORDS"):
            expected_num_cities = len(parsed_data["data"]["NODE_COORDS"])
        elif parsed_data["data"].get("EDGE_WEIGHTS") and isinstance(
            parsed_data["data"]["EDGE_WEIGHTS"], list
        ):
            # For FULL_MATRIX, dimension is len(matrix)
            # For other explicit formats, it's more complex, relying on parse_edge_weight_section to have created a square matrix
            if parsed_data["data"]["EDGE_WEIGHTS"] and isinstance(
                parsed_data["data"]["EDGE_WEIGHTS"][0], list
            ):
                expected_num_cities = len(parsed_data["data"]["EDGE_WEIGHTS"])
            else:
                raise ValueError(
                    "Could not infer DIMENSION from EDGE_WEIGHTS. Please specify DIMENSION in TSPLIB file."
                )
        else:
            raise ValueError(
                f"DIMENSION not specified and cannot be inferred from file {filename}."
            )

    if (
        expected_num_cities is None
    ):  # Should not happen if above logic is sound, but for safety
        raise ValueError(f"DIMENSION could not be determined for {filename}.")

    edge_weight_type = parsed_data["specification"].get("EDGE_WEIGHT_TYPE")

    if edge_weight_type == "EXPLICIT":
        distance_matrix = parsed_data["data"].get("EDGE_WEIGHTS")
        if not distance_matrix:
            raise ValueError(
                f"Error: EDGE_WEIGHTS section not found in {filename} while EDGE_WEIGHT_TYPE is EXPLICIT. Cannot create TSP problem."
            )

        # Ensure the matrix is 0-indexed and correct size
        if not isinstance(distance_matrix, list) or not all(
            isinstance(row, list) for row in distance_matrix
        ):
            raise ValueError(
                f"Explicit distance matrix in {filename} is not in expected list of lists format."
            )

        if len(distance_matrix) != expected_num_cities or not all(
            len(row) == expected_num_cities for row in distance_matrix
        ):
            raise ValueError(
                f"Explicit distance matrix in {filename} has incorrect dimensions. Expected {expected_num_cities}x{expected_num_cities}."
            )

        def distance_function_matrix(a, b):
            return distance_matrix[a][b]

        total_cities = len(distance_matrix)
        city_data = {i: i for i in range(total_cities)}

        return TSPProblem(city_data, distance_function_matrix)
    else:
        raw_cities_data = parsed_data["data"].get("NODE_COORDS")
        if not raw_cities_data:
            raise ValueError(
                f"Error: NODE_COORDS section not found in {filename}. Cannot create coordinate-based TSP problem."
            )

        min_node_id = min(raw_cities_data.keys())
        cities_data_0_indexed = {}
        for node_id, coords in raw_cities_data.items():
            new_index = node_id - min_node_id
            if new_index < 0:
                raise ValueError(
                    f"Error: Invalid node ID {node_id} results in negative 0-indexed key for file {filename}."
                )
            cities_data_0_indexed[new_index] = coords

        if len(cities_data_0_indexed) != expected_num_cities:
            raise ValueError(
                f"Mismatch: Parsed {len(cities_data_0_indexed)} cities from NODE_COORDS, but DIMENSION specified {expected_num_cities} for file {filename}."
            )

        if not all(i in cities_data_0_indexed for i in range(expected_num_cities)):
            raise ValueError(
                f"Error: 0-indexed city IDs are not contiguous from 0 to DIMENSION-1 for file {filename}."
            )

        distance_function = get_distance_function(edge_weight_type)

        return TSPProblem(cities_data_0_indexed, distance_function)


def prepare_optimizers(tsp_problem: TSPProblem) -> dict[str, VNSOptimizerBase]:
    vns_shaking_operators = tsp_problem.get_neighborhood_operators()
    optimizer_common_params = {
        "problem": tsp_problem,
        "neighborhood_operators": vns_shaking_operators,
    }

    return {
        "BVNS_BI": BasicVNSOptimizer(
            **optimizer_common_params,
            local_search_strategy=BestImprovementLocalSearch(
                tsp_problem, FlipRegionOperator(tsp_problem, name="Region flip")
            ),
        ),
        "BVNS_BI_Beam10": BasicVNSOptimizer(
            **optimizer_common_params,
            local_search_strategy=BestImprovementLocalSearch(
                tsp_problem, FlipRegionOperator(tsp_problem, name="Region flip")
            ),
            acceptance_criterion=BeamSearchAcceptance(
                tsp_problem.get_objective_function(), 10
            ),
        ),
        "BVNS_BI_Beam20": BasicVNSOptimizer(
            **optimizer_common_params,
            local_search_strategy=BestImprovementLocalSearch(
                tsp_problem, FlipRegionOperator(tsp_problem, name="Region flip")
            ),
            acceptance_criterion=BeamSearchAcceptance(
                tsp_problem.get_objective_function(), 20
            ),
        ),
        "BVNS_FI": BasicVNSOptimizer(
            **optimizer_common_params,
            local_search_strategy=FirstImprovementLocalSearch(
                tsp_problem, FlipRegionOperator(tsp_problem, name="Region flip")
            ),
        ),
        "BVNS_FI_Beam10": BasicVNSOptimizer(
            **optimizer_common_params,
            local_search_strategy=FirstImprovementLocalSearch(
                tsp_problem, FlipRegionOperator(tsp_problem, name="Region flip")
            ),
            acceptance_criterion=BeamSearchAcceptance(
                tsp_problem.get_objective_function(), 10
            ),
        ),
        "BVNS_FI_Beam20": BasicVNSOptimizer(
            **optimizer_common_params,
            local_search_strategy=FirstImprovementLocalSearch(
                tsp_problem, FlipRegionOperator(tsp_problem, name="Region flip")
            ),
            acceptance_criterion=BeamSearchAcceptance(
                tsp_problem.get_objective_function(), 20
            ),
        ),
        "RVNS": ReducedVNSOptimizer(
            **optimizer_common_params,
        ),
        "RVNS_Beam10": ReducedVNSOptimizer(
            **optimizer_common_params,
            acceptance_criterion=BeamSearchAcceptance(
                tsp_problem.get_objective_function(), 10
            ),
        ),
        "RVNS_Beam20": ReducedVNSOptimizer(
            **optimizer_common_params,
            acceptance_criterion=BeamSearchAcceptance(
                tsp_problem.get_objective_function(), 20
            ),
        ),
        "GVNS": GeneralVNSOptimizer(
            **optimizer_common_params,
            local_search_strategies=[
                BestImprovementLocalSearch(tsp_problem, vns_shaking_operators[0]),
                BestImprovementLocalSearch(tsp_problem, vns_shaking_operators[1]),
            ],
        ),
        "GVNS_Beam10": GeneralVNSOptimizer(
            **optimizer_common_params,
            local_search_strategies=[
                BestImprovementLocalSearch(
                    tsp_problem, FlipRegionOperator(tsp_problem, name="Region flip")
                ),
                BestImprovementLocalSearch(
                    tsp_problem, SwapOperator(tsp_problem, name="Swap 1", num_swaps=1)
                ),
            ],
        ),
        "GVNS_Beam20": GeneralVNSOptimizer(
            **optimizer_common_params,
            local_search_strategies=[
                BestImprovementLocalSearch(
                    tsp_problem, FlipRegionOperator(tsp_problem, name="Region flip")
                ),
                BestImprovementLocalSearch(
                    tsp_problem, SwapOperator(tsp_problem, name="Swap 1", num_swaps=1)
                ),
            ],
        ),
        "SVNS_BI": SkewedVNSOptimizer(
            **optimizer_common_params,
            alpha=0.1,
            distance_metric=tsp_problem.calculate_tour_difference_distance,
        ),
        "SVNS_BI_Beam10": SkewedVNSOptimizer(
            **optimizer_common_params,
            alpha=0.1,
            distance_metric=tsp_problem.calculate_tour_difference_distance,
            acceptance_criterion=BeamSeachSkewedAcceptance(
                tsp_problem.get_objective_function(),
                0.1,
                20,
                tsp_problem.calculate_tour_difference_distance,
            ),
        ),
        "SVNS_FI": SkewedVNSOptimizer(
            **optimizer_common_params,
            alpha=0.1,
            distance_metric=tsp_problem.calculate_tour_difference_distance,
            local_search_strategy=FirstImprovementLocalSearch(
                tsp_problem, vns_shaking_operators[0]
            ),
        ),
        "SVNS_FI_Beam10": SkewedVNSOptimizer(
            **optimizer_common_params,
            alpha=0.1,
            distance_metric=tsp_problem.calculate_tour_difference_distance,
            local_search_strategy=FirstImprovementLocalSearch(
                tsp_problem, vns_shaking_operators[0]
            ),
            acceptance_criterion=BeamSeachSkewedAcceptance(
                tsp_problem.get_objective_function(),
                0.1,
                20,
                tsp_problem.calculate_tour_difference_distance,
            ),
        ),
        "SVNS_BI_Beam20": SkewedVNSOptimizer(
            **optimizer_common_params,
            alpha=0.1,
            distance_metric=tsp_problem.calculate_tour_difference_distance,
            acceptance_criterion=BeamSeachSkewedAcceptance(
                tsp_problem.get_objective_function(),
                0.1,
                20,
                tsp_problem.calculate_tour_difference_distance,
            ),
        ),
        "SVNS_FI_Beam20": SkewedVNSOptimizer(
            **optimizer_common_params,
            alpha=0.1,
            distance_metric=tsp_problem.calculate_tour_difference_distance,
            local_search_strategy=FirstImprovementLocalSearch(
                tsp_problem, vns_shaking_operators[0]
            ),
            acceptance_criterion=BeamSeachSkewedAcceptance(
                tsp_problem.get_objective_function(),
                0.1,
                20,
                tsp_problem.calculate_tour_difference_distance,
            ),
        ),
    }


def run_vns_example_from_tsplib(
    filename: str,
    optimizer_type: str,
    run_time: str,
    max_iterations_no_improvement: int,
    optimal_value: Optional[float] = None,
):
    setup_logging(level=logging.INFO)
    max_run_time_seconds = parse_time_string(run_time)

    logger.info(
        f"\n--- Running {optimizer_type} Example with TSPLIB file: {filename} ---"
    )
    logger.info(f"Max run time: {run_time} ({max_run_time_seconds:.2f} seconds)")
    logger.info(f"Max iterations without improvement: {max_iterations_no_improvement}")
    if optimal_value is not None:
        logger.info(f"Optimal solution value provided: {optimal_value:.2f}")

    tsp_problem = load_tsp_problem(filename)
    optimizers = prepare_optimizers(tsp_problem)

    vns_optimizer = None
    if optimizer_type in optimizers:
        vns_optimizer = optimizers[optimizer_type]
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
            f"  VND Strategies: {
                [
                    s.__class__.__name__
                    + '('
                    + (
                        s.neighborhood_operator.name
                        if s.neighborhood_operator
                        else 'N/A'
                    )
                    + ')'
                    for s in cast(
                        CompositeLocalSearch, vns_optimizer.local_search_strategy
                    ).local_search_strategies
                ]
            }"
        )

    best_objectives_data = []
    elapsed_times_data = []

    start_time = time.time()
    last_improved = 1

    for iteration, (improved, best_objective) in enumerate(
        vns_optimizer.optimize(), start=1
    ):
        obj_value = best_objective.get_all_solutions()[0].get_objectives()[0]
        best_objectives_data.append(obj_value)
        elapsed_time = time.time() - start_time
        elapsed_times_data.append(elapsed_time)

        if improved:
            logger.info("Iteration %d: Best Objective = %.2f", iteration, obj_value)

        if elapsed_time > max_run_time_seconds:
            logger.info(f"Timeout. Best Objective = {obj_value}")
            break

        if improved:
            last_improved = iteration
        elif iteration - last_improved > max_iterations_no_improvement:
            logger.info(
                f"No improvements for {max_iterations_no_improvement} iterations. Best Objective = {obj_value}"
            )
            break

    logger.info(f"\n--- {optimizer_type} Optimization Complete ---")
    if best_objectives_data:
        final_best_objective = min(
            best_objectives_data
        )  # Find the true best among all iterations
        logger.info(f"Overall Best Tour Length found: {final_best_objective:.2f}")
    else:
        logger.info("No solution data collected.")

    plt.figure(figsize=(10, 6))
    plt.plot(
        elapsed_times_data,
        best_objectives_data,
        marker="o",
        linestyle="-",
        markersize=4,
        label="Best Objective Found",
    )  # Plot against time

    if optimal_value is not None:
        plt.axhline(
            y=optimal_value,
            color="r",
            linestyle="--",
            label=f"Optimal Value ({optimal_value:.2f})",
        )
        plt.title(
            f"{optimizer_type} Optimization Progress for {Path(filename).name}\n (Optimal: {optimal_value:.2f})"
        )
    else:
        plt.title(f"{optimizer_type} Optimization Progress for {Path(filename).name}")

    plt.xlabel("Time Elapsed (seconds)")
    plt.ylabel("Best Objective Value (Tour Length)")
    plt.grid(True, linestyle="--", alpha=0.7)
    plt.legend()
    plt.tight_layout()
    plt.show()


def compare_vns_optimizers(
    filename: str,
    run_time: str,
    max_iterations_no_improvement: int,
    optimal_value: Optional[float] = None,
):
    setup_logging(level=logging.INFO)
    max_run_time_seconds = parse_time_string(run_time)

    logger.info(
        f"\n--- Running optimizers with TSPLIB file: {filename} ---"
    )
    logger.info(f"Max run time: {run_time} ({max_run_time_seconds:.2f} seconds)")
    logger.info(f"Max iterations without improvement: {max_iterations_no_improvement}")
    if optimal_value is not None:
        logger.info(f"Optimal solution value provided: {optimal_value:.2f}")

    tsp_problem = load_tsp_problem(filename)
    optimizers = prepare_optimizers(tsp_problem)

    for optimizer_type, vns_optimizer in optimizers.items():
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
                f"  VND Strategies: {
                    [
                        s.__class__.__name__
                        + '('
                        + (
                            s.neighborhood_operator.name
                            if s.neighborhood_operator
                            else 'N/A'
                        )
                        + ')'
                        for s in cast(
                            CompositeLocalSearch, vns_optimizer.local_search_strategy
                        ).local_search_strategies
                    ]
                }"
            )

        best_objectives_data = []
        elapsed_times_data = []

        start_time = time.time()
        last_improved = 1

        for iteration, (improved, best_objective) in enumerate(
            vns_optimizer.optimize(), start=1
        ):
            obj_value = best_objective.get_all_solutions()[0].get_objectives()[0]
            best_objectives_data.append(obj_value)
            elapsed_time = time.time() - start_time
            elapsed_times_data.append(elapsed_time)
            if iteration % 10 == 0:
                logger.info("Iteration %d: Best Objective = %.2f", iteration, obj_value)

            if elapsed_time > max_run_time_seconds:
                logger.info(f"Timeout. Best Objective = {obj_value}")
                break

            if improved:
                last_improved = iteration
            elif iteration - last_improved > max_iterations_no_improvement:
                logger.info(
                    f"No improvements for {max_iterations_no_improvement} iterations. Best Objective = {obj_value}"
                )
                break

        logger.info(f"\n--- {optimizer_type} Optimization Complete ---")
        if best_objectives_data:
            final_best_objective = min(best_objectives_data)
            logger.info(f"Overall Best Tour Length found: {final_best_objective:.2f}")
        else:
            logger.info("No solution data collected.")

        plt.plot(
            elapsed_times_data,
            best_objectives_data,
            marker="o",
            linestyle="-",
            markersize=4,
            label=optimizer_type,
        )

    if optimal_value is not None:
        plt.axhline(
            y=optimal_value,
            color="r",
            linestyle="--",
            label=f"Optimal Value ({optimal_value:.2f})",
        )
        plt.title(
            f"Optimization Progress for {Path(filename).name}\n (Optimal: {optimal_value:.2f})"
        )
    else:
        plt.title(f"Optimization Progress for {Path(filename).name}")

    plt.xlabel("Time Elapsed (seconds)")
    plt.ylabel("Best Objective Value (Tour Length)")
    plt.grid(True, linestyle="--", alpha=0.7)
    plt.legend()
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run VNS optimization for TSP using a TSPLIB file."
    )
    parser.add_argument(
        "filename",
        type=str,
        help="Path to the TSPLIB .tsp file (e.g., data/linho_100_tsp.tsp)",
    )
    parser.add_argument(
        "--optimizer-type",
        type=str,
        default="SkewedVNS",
        help="Type of VNS optimizer to run.",
    )
    parser.add_argument(
        "--run-time",
        type=str,
        default="10s",
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
        action='store_true',
    )

    args = parser.parse_args()

    if args.compare:
        compare_vns_optimizers(
            args.filename,
            args.run_time,
            args.max_no_improvements,
            args.optimal_value,
        )

    else:
        run_vns_example_from_tsplib(
            args.filename,
            args.optimizer_type,
            args.run_time,
            args.max_no_improvements,
            args.optimal_value,
        )
