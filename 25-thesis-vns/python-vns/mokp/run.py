import sys
import logging
import time
import matplotlib.pyplot as plt
import random
from pathlib import Path
from typing import Any, Callable, Iterable, Optional, cast

# Assume these are available from your project structure
from vns.abstract import NeighborhoodOperator, ObjectiveFunction, Problem, Solution
from vns.default_configurations import BasicVNSOptimizer, ReducedVNSOptimizer, GeneralVNSOptimizer, SkewedVNSOptimizer
from vns.local_search import BestImprovementLocalSearch, FirstImprovementLocalSearch, CompositeLocalSearch
from vns.acceptance import BeamSearchAcceptance, BeamSeachSkewedAcceptance
from utils import setup_logging, parse_time_string

# --- MOKP Specific Classes ---

class MOKPSolution(Solution):
    """
    Represents a solution for the Multi-Objective Knapsack Problem.
    data is a list of booleans indicating if an item is selected.
    """
    def __init__(self, item_selection: list[bool]):
        super().__init__(item_selection)
        self.item_selection = item_selection

    def __repr__(self):
        return f"MOKPSolution(Selection={''.join(['1' if x else '0' for x in self.item_selection])}, Objectives={self.objectives})"

class MOKPProblem(Problem):
    """
    Defines a Multi-Objective Knapsack Problem instance.
    """
    def __init__(self, items: list[dict], capacity: float):
        super().__init__()
        self.items = items # List of dicts: [{'weight': w, 'profits': [p1, p2, ...]}, ...]
        self.capacity = capacity
        self.num_items = len(items)
        # Assuming all items have the same number of profit objectives
        self.num_objectives = len(items[0]['profits']) if items else 0

    def generate_initial_solution(self) -> MOKPSolution:
        """
        Generates an initial feasible solution for MOKP using a simple greedy approach.
        Prioritizes items with higher profit sum / weight ratio.
        """
        initial_selection = [False] * self.num_items
        current_weight = 0.0
        
        # Calculate a "density" for each item to prioritize
        # For multi-objective, a simple sum of profits can be used for initial greedy selection
        item_densities = []
        for i, item in enumerate(self.items):
            total_profit_sum = sum(item['profits'])
            if item['weight'] > 0:
                item_densities.append((total_profit_sum / item['weight'], i))
            else: # Handle zero weight items - prioritize highly
                item_densities.append((float('inf'), i))
        
        # Sort items by density in descending order
        item_densities.sort(key=lambda x: x[0], reverse=True)

        for _, item_idx in item_densities:
            item_weight = self.items[item_idx]['weight']
            if current_weight + item_weight <= self.capacity:
                initial_selection[item_idx] = True
                current_weight += item_weight
        
        return MOKPSolution(initial_selection)

    def get_objective_function(self) -> "MOKPObjectiveFunction":
        return MOKPObjectiveFunction(self)

    def get_neighborhood_operators(self) -> list[NeighborhoodOperator]:
        # For VNS, multiple shaking operators with increasing 'strength' (k) are useful
        # Here, we use a single flip operator but it could be extended.
        return [MOKPFlipOperator(self, name="Flip 1")]

    def calculate_solution_difference_distance(self, sol1: Solution, sol2: Solution) -> float:
        """
        Calculates the Hamming distance between two MOKP solutions (binary vectors).
        Used by SkewedVNSOptimizer.
        """
        selection1 = sol1.data
        selection2 = sol2.data
        if len(selection1) != len(selection2):
            raise ValueError("Solutions must have the same length for distance calculation.")
        
        # Hamming distance: count of positions at which the corresponding elements are different
        distance = sum(1 for i in range(len(selection1)) if selection1[i] != selection2[i])
        return float(distance)

class MOKPObjectiveFunction(ObjectiveFunction):
    """
    Evaluates a MOKP solution, calculating total profits and handling capacity constraint.
    Assumes maximization, so returns negative profits for minimization.
    """
    def __init__(self, problem: MOKPProblem):
        super().__init__(problem.num_objectives) # Set number of objectives
        self.problem = problem
        # A large penalty for exceeding capacity
        self.penalty_factor = 1000000.0

    def evaluate(self, solution: Solution) -> tuple[float, ...]:
        item_selection = solution.data
        
        total_weight = 0.0
        total_profits = [0.0] * self.problem.num_objectives

        for i, is_selected in enumerate(item_selection):
            if is_selected:
                item = self.problem.items[i]
                total_weight += item['weight']
                for obj_idx in range(self.problem.num_objectives):
                    total_profits[obj_idx] += item['profits'][obj_idx]
        
        # Apply penalty for infeasible solutions
        if total_weight > self.problem.capacity:
            # Penalize all objectives heavily
            # If objectives are maximized, return very negative numbers.
            # Convert to minimization by negating profits, then adding penalty makes them even larger (worse)
            penalized_profits = tuple(-p + self.penalty_factor * (total_weight - self.problem.capacity) for p in total_profits)
            return penalized_profits
        else:
            # Return negative profits for minimization
            return tuple(-p for p in total_profits)

class MOKPFlipOperator(NeighborhoodOperator):
    """
    A simple neighborhood operator for MOKP: randomly flips the selection status of an item.
    """
    def __init__(self, problem: MOKPProblem, name: str = "Flip"):
        super().__init__(problem, name)

    def generate_neighbor(self, solution: Solution) -> Solution:
        """
        Generates a neighbor by flipping a random item's status.
        """
        current_selection = list(solution.data)
        n = len(current_selection)
        
        # Choose a random item to flip
        idx_to_flip = random.randrange(n)
        current_selection[idx_to_flip] = not current_selection[idx_to_flip]
        
        return MOKPSolution(current_selection)

    def generate_all_neighbors(self, solution: Solution) -> Iterable[Solution]:
        """
        Generates all neighbors by flipping each item's status one by one.
        """
        current_selection = list(solution.data)
        n = len(current_selection)

        for i in range(n):
            new_selection = list(current_selection)
            new_selection[i] = not new_selection[i]
            yield MOKPSolution(new_selection)


# --- Refactoring the run function for MOKP ---

# Mocking setup_logging and parse_time_string if not in scope
def setup_logging(level):
    logging.basicConfig(level=level, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
    global logger
    logger = logging.getLogger(__name__)

def parse_time_string(time_str):
    if time_str.endswith('s'):
        return float(time_str[:-1])
    elif time_str.endswith('m'):
        return float(time_str[:-1]) * 60
    return float(time_str)

logger = logging.getLogger(__name__)


def run_single_vns_configuration_mokp(
    problem_instance: MOKPProblem,
    optimizer_type: str,
    run_time: str,
    max_iterations_no_improvement: int,
    # For multi-objective, we don't have a single optimal_value, but a Pareto front.
    # We can use a reference point for hypervolume calculation if needed, but for plotting,
    # we'll show the discovered front.
) -> dict:
    """
    Runs a single VNS configuration for MOKP and returns performance data.
    """
    setup_logging(level=logging.INFO)
    max_run_time_seconds = parse_time_string(run_time)

    logger.info(f"\n--- Running {optimizer_type} Example for MOKP ---")
    logger.info(f"Max run time: {run_time} ({max_run_time_seconds:.2f} seconds)")
    logger.info(f"Max iterations without improvement: {max_iterations_no_improvement}")
    
    vns_shaking_operators = problem_instance.get_neighborhood_operators()
    vns_optimizer = None

    optimizer_common_params = {
        "problem": problem_instance,
        "neighborhood_operators": vns_shaking_operators,
        # For MOKP, we want to maximize. The ObjectiveFunction returns negative values for minimization.
        # The acceptance criteria need to correctly handle Pareto dominance.
    }

    # Custom MultiObjectiveAcceptance for all multi-objective optimizers
    mo_acceptance_criterion = MultiObjectiveAcceptance(problem_instance.get_objective_function(), beam_width=100) # Arbitrary beam width

    # Replicated optimizer configuration logic (simplified for demonstration)
    # Note: BVNS, RVNS, GVNS, SVNS are typically tailored for single-objective.
    # For multi-objective, the *acceptance criterion* and how the best solution is managed
    # (i.e., the Pareto front) becomes paramount.
    # The current VNS framework needs a Solution object to return the "best solution".
    # For MO-VNS, the "best solution" is the entire set of non-dominated solutions (Pareto front).
    # This implies the Solution wrapper needs to store a *set* of solutions.
    # The existing `Solution` class has `get_all_solutions()` which suggests it *can* hold multiple.

    # Let's assume the optimizers (BasicVNSOptimizer etc.) are adapted to use the
    # `acceptance_criterion` to manage a *set* of non-dominated solutions, and that
    # `best_objective_sol` in the `optimize` generator is actually a wrapper containing the current Pareto front.

    if optimizer_type == "BVNS":
        vns_optimizer = BasicVNSOptimizer(
            **optimizer_common_params,
            local_search_strategy=BestImprovementLocalSearch(problem_instance, vns_shaking_operators[0]),
            acceptance_criterion=mo_acceptance_criterion, # Use our MO acceptance
        )
    elif optimizer_type == "RVNS":
        vns_optimizer = ReducedVNSOptimizer(
            **optimizer_common_params,
            acceptance_criterion=mo_acceptance_criterion, # Use our MO acceptance
        )
    elif optimizer_type == "GVNS":
         vns_optimizer = GeneralVNSOptimizer(
            **optimizer_common_params,
            local_search_strategies=[
                BestImprovementLocalSearch(problem_instance, vns_shaking_operators[0]),
                FirstImprovementLocalSearch(problem_instance, vns_shaking_operators[0]),
            ],
            acceptance_criterion=mo_acceptance_criterion, # Use our MO acceptance
        )
    elif optimizer_type == "SVNS":
        vns_optimizer = SkewedVNSOptimizer(
            **optimizer_common_params,
            alpha=0.5, # Example alpha
            distance_metric=problem_instance.calculate_solution_difference_distance,
            local_search_strategy=BestImprovementLocalSearch(problem_instance, vns_shaking_operators[0]),
            acceptance_criterion=mo_acceptance_criterion,
        )
    else:
        logger.error(f"Unknown optimizer type for MOKP: {optimizer_type}")
        return {}

    logger.info(
        f"Starting {optimizer_type} for MOKP with {problem_instance.num_items} items and {problem_instance.num_objectives} objectives."
    )
    
    # Store the Pareto front over time
    pareto_front_snapshots = [] # List of lists of (profit1, profit2) tuples
    elapsed_times_data = []

    start_time = time.time()
    last_improved = 1

    for iteration, (improved, best_solution_wrapper) in enumerate(vns_optimizer.optimize(), start=1):
        elapsed_time = time.time() - start_time
        elapsed_times_data.append(elapsed_time)

        # best_solution_wrapper is expected to contain the current Pareto front
        current_pareto_front_solutions = best_solution_wrapper.get_all_solutions()
        
        # Convert objective values back to positive for plotting (since we negated them for minimization)
        current_pareto_front_objectives = []
        for sol in current_pareto_front_solutions:
            objectives = sol.get_objectives()
            current_pareto_front_objectives.append(tuple(-o for o in objectives))

        pareto_front_snapshots.append(current_pareto_front_objectives)
        
        # Log summary of the current front
        if iteration % 10 == 0 or improved: # Log more frequently on improvement
            avg_profit1 = sum(p[0] for p in current_pareto_front_objectives) / len(current_pareto_front_objectives) if current_pareto_front_objectives else 0
            avg_profit2 = sum(p[1] for p in current_pareto_front_objectives) / len(current_pareto_front_objectives) if current_pareto_front_objectives else 0
            logger.info(f"Iteration {iteration}: Pareto Front Size = {len(current_pareto_front_objectives)}, Avg Profits = ({avg_profit1:.2f}, {avg_profit2:.2f})")

        if elapsed_time > max_run_time_seconds:
            logger.info("Timeout.")
            break

        if improved:
            last_improved = iteration
        elif iteration - last_improved > max_iterations_no_improvement:
            logger.info(f"No improvements for {max_iterations_no_improvement} iterations.")
            break

    logger.info(f"\n--- {optimizer_type} Optimization Complete ---")
    final_pareto_front = pareto_front_snapshots[-1] if pareto_front_snapshots else []
    
    # For multi-objective, 'final_best_objective' is not a single value.
    # We return the set of objectives on the Pareto front.
    final_objectives_for_plotting = [(-s.get_objectives()[0], -s.get_objectives()[1]) for s in best_solution_wrapper.get_all_solutions()]

    return {
        "optimizer_type": optimizer_type,
        "problem_name": "MOKP",
        "elapsed_times_data": elapsed_times_data,
        "pareto_front_snapshots": pareto_front_snapshots,
        "final_pareto_front_objectives": final_objectives_for_plotting,
    }

def plot_mokp_pareto_fronts(results: list[dict]):
    """
    Plots the final Pareto fronts for all MOKP configurations on a single graph.
    """
    plt.figure(figsize=(10, 8))

    for res in results:
        final_front = res["final_pareto_front_objectives"]
        if not final_front:
            continue
        
        # Extract x (profit1) and y (profit2) coordinates
        x_coords = [p[0] for p in final_front]
        y_coords = [p[1] for p in final_front]

        plt.scatter(
            x_coords,
            y_coords,
            label=f'{res["optimizer_type"]} (Points: {len(final_front)})',
            alpha=0.7,
            s=50 # Marker size
        )

    plt.title('MOKP Pareto Front Approximations', fontsize=16)
    plt.xlabel('Z1', fontsize=12)
    plt.ylabel('Z2', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend(loc='upper left', bbox_to_anchor=(1.05, 1), fontsize='small')
    plt.show()

# --- Example Usage for MOKP ---

if __name__ == "__main__":
    # Define a sample MOKP instance
    # Items: (weight, [profit1, profit2])
    sample_items = [
        {'weight': 2, 'profits': [10, 5]},
        {'weight': 3, 'profits': [8, 12]},
        {'weight': 4, 'profits': [15, 7]},
        {'weight': 5, 'profits': [6, 18]},
        {'weight': 1, 'profits': [3, 2]},
        {'weight': 2, 'profits': [12, 6]},
        {'weight': 3, 'profits': [7, 10]},
        {'weight': 6, 'profits': [20, 4]},
        {'weight': 1, 'profits': [4, 15]},
        {'weight': 4, 'profits': [9, 9]},
    ]
    sample_capacity = 10.0 # Knapsack capacity

    mokp_problem = MOKPProblem(items=sample_items, capacity=sample_capacity)

    mokp_configurations = [
        "BVNS",
        "RVNS",
        "GVNS",
        "SVNS",
    ]

    all_mokp_results = []
    for config_type in mokp_configurations:
        result = run_single_vns_configuration_mokp(
            problem_instance=mokp_problem,
            optimizer_type=config_type,
            run_time="5s", # Short run time for demonstration
            max_iterations_no_improvement=20,
        )
        if result:
            all_mokp_results.append(result)

    if all_mokp_results:
        plot_mokp_pareto_fronts(all_mokp_results)
    else:
        print("No MOKP results to plot.")