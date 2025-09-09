import argparse
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from pymoo.indicators.hv import HV
from pymoo.util.nds.non_dominated_sorting import NonDominatedSorting

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

BASE = Path(__file__).parent.parent.parent / "runs"
PROBLEM_DATA_DIR = Path(__file__).parent.parent.parent / "problems"


def load_instance_data_json(instance_name: str) -> Dict[str, Any]:
    file_path = PROBLEM_DATA_DIR / instance_name
    if not file_path.exists():
        logging.error(f"Problem file not found: {file_path}")
        return {}

    with open(file_path, "r") as f:
        return json.load(f)


@dataclass
class Metadata:
    date: datetime
    problem_name: str
    problem_data_file: str


@dataclass
class Config:
    name: str
    algorithm: str


@dataclass
class Solution:
    objectives: List[float]
    data: List[int]


@dataclass
class Metrics:
    epsilon: float
    hypervolume: float
    r_metric: float
    inverted_generational_distance: float


@dataclass
class RunConfig:
    metadata: Metadata
    config: Config
    solutions: List[Solution]


def get_all_runs(problem_name: str, name_filter: str = "") -> List[RunConfig]:
    """
    Parses and returns a list of RunConfig objects for a given problem,
    optionally filtered by optimizer name.
    """
    run_configs: List[RunConfig] = []

    run_dirs = [
        d
        for d in BASE.iterdir()
        if d.is_dir() and d.name.startswith(f"{problem_name}_")
    ]

    for run_dir in run_dirs:
        data_file = run_dir / "run_data.json"

        if not data_file.exists():
            continue

        try:
            with open(data_file, "r") as f:
                run_data = json.load(f)

            config_dict = run_data.get("config", {})
            if (
                name_filter
                and name_filter.lower() not in config_dict.get("name", "").lower()
            ):
                continue

            metadata_dict = run_data.get("metadata", {})
            metadata = Metadata(
                date=datetime.fromisoformat(metadata_dict.get("date")),
                problem_name=metadata_dict.get("problem_name"),
                problem_data_file=metadata_dict.get("problem_data_file"),
            )

            config = Config(**config_dict)
            solutions_list = [Solution(**sol) for sol in run_data.get("solutions", [])]

            run_config = RunConfig(
                metadata=metadata, config=config, solutions=solutions_list
            )
            run_configs.append(run_config)

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logging.warning(
                f"Skipping malformed or incomplete run file {data_file}: {e}"
            )
            continue

    return run_configs


def calculate_reference_front(
    runs: list[RunConfig], predefined_front: list | None = None
):
    if predefined_front:
        return np.array(predefined_front)

    all_objectives = []

    for run in runs:
        for sol in run.solutions:
            all_objectives.append(sol.objectives)

    combined_objectives = np.concatenate(all_objectives, axis=0)
    nd_sorting = NonDominatedSorting()
    non_dominated_indices = nd_sorting.do(
        combined_objectives, only_non_dominated_front=True
    )
    reference_front = combined_objectives[non_dominated_indices]

    return reference_front


def calculate_metrics(
    run: RunConfig,
    reference_front: np.ndarray,
    ref_point: np.ndarray,
):
    results = []
    for run_name, front in runs:
        if front.size == 0:
            logging.warning(
                f"Run '{run_name}' has an empty front. Skipping metrics calculation."
            )
            results.append({"name": run_name, "epsilon": "N/A", "hypervolume": "N/A"})
            continue
        hv_indicator = HV(ref_point=ref_point)
        hypervolume_value = hv_indicator.do(front)
        results.append(
            {
                "name": run_name,
                "epsilon": 0,
                "hypervolume": hypervolume_value,
            }
        )
    return results


def is_weakly_dominated(p1: np.ndarray, p2: np.ndarray) -> bool:
    """
    Checks if point p1 weakly dominates point p2 for a minimization problem.
    A point p1 weakly dominates p2 if p1 is not worse than p2 in any objective
    and strictly better in at least one objective.

    Args:
        p1: A NumPy array representing the first point.
        p2: A NumPy array representing the second point.

    Returns:
        True if p1 weakly dominates p2, False otherwise.
    """
    dominates_in_at_least_one = np.any(p1 < p2)
    not_worse_in_all = np.all(p1 <= p2)
    return not_worse_in_all and dominates_in_at_least_one


def calculate_c_metric(A: np.ndarray, B: np.ndarray) -> float:
    """
    Calculates the Coverage metric C(A, B).

    This represents the proportion of points in set B that are weakly dominated by
    at least one point in set A.

    Args:
        A: The NumPy array for the first Pareto front.
        B: The NumPy array for the second Pareto front.

    Returns:
        The coverage value C(A, B) as a float between 0 and 1.
    """
    if B.size == 0:
        return 0.0

    dominated_count = 0
    for b_point in B:
        # Check if the b_point is weakly dominated by any point in A
        if np.any([is_weakly_dominated(a_point, b_point) for a_point in A]):
            dominated_count += 1

    return dominated_count / len(B)


def calculate_r2_metric(
    front: np.ndarray, ideal_point: np.ndarray, weights: np.ndarray
) -> float:
    """
    Calculates the R2 unary indicator.

    This is based on the weighted Tchebycheff utility function, as defined by Zitzler et al.
    The formula is R2(A, Λ, i) = (1/|Λ|) * sum over all λ in Λ of (min over all a in A of (max over all j in {1,...,d} of {λj * |ij - aj|})).

    Args:
        front: The NumPy array of the solution set A.
        ideal_point: The NumPy array of the ideal point i.
        weights: The NumPy array of weight vectors Λ.

    Returns:
        The R2 indicator value.
    """
    if weights.size == 0:
        logging.warning(
            "No weight vectors provided for R2 metric calculation. Returning 0."
        )
        return 0.0

    if front.size == 0:
        logging.warning("Front is empty for R2 metric calculation. Returning 0.")
        return 0.0

    # The PISA R2 indicator is the average of the minimum utility values.
    min_utilities = np.zeros(weights.shape[0])

    # Calculate the Tchebycheff value for each solution and weight vector
    for i, lambda_vec in enumerate(weights):
        tchebycheff_values = np.max(lambda_vec * np.abs(ideal_point - front), axis=1)
        min_utilities[i] = np.min(tchebycheff_values)

    return np.mean(min_utilities)


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


# def main():
#     """
#     Main function for the CLI utility.
#     """
#     parser = argparse.ArgumentParser(description="Compare saved optimization runs.")
#     parser.add_argument("--problem-instance", '-p', type=str, required=True, help="The name of the problem file (e.g., '2KP100-1B.json').")
#     parser.add_argument("--filter-run-name", '-f', type=str, default=None, help="Filter runs by optimizer name (e.g., 'RVNS').")
#     parser.add_argument("--group-by-run-time", action="store_true", help="Group runs by run time.")

#     args = parser.parse_args()
#     problem_instance, filter_run_name = args.problem_instance, args.filter_run_name

#     problem_data = load_instance_data_json(problem_instance)
#     if not problem_data:
#         return

#     runs = get_all_runs(problem_instance, filter_run_name)
#     if not runs:
#         logging.warning(f"No runs found for problem '{problem_instance}' with filter '{filter_run_name}'.")
#         return

#     # reference_front = calculate_reference_front(runs, problem_data.get("reference_front"))
#     # metrics_results = calculate_metrics(runs_data, reference_front, ref_point)

#     print("\n--- Optimization Run Comparison ---")
#     print(f"Problem: {args.problem}")
#     if args.name:
#         print(f"Filtered by Optimizer Name: {args.name}")

#     header = f"{'Run Name':<30} | {'Hypervolume':<15} | {'Epsilon':<15}"
#     print("-" * len(header))
#     print(header)
#     print("-" * len(header))

#     for result in metrics_results:
#         hv_str = f"{result['hypervolume']:.4f}" if isinstance(result['hypervolume'], (float, int)) else "N/A"
#         eps_str = f"{result['epsilon']:.4f}" if isinstance(result['epsilon'], (float, int)) else "N/A"
#         print(f"{result['name']:<30} | {hv_str:<15} | {eps_str:<15}")

#     print("-" * len(header))


if __name__ == "__main__":
    main()
