import logging
from typing import Optional

from vns.abstract import (
    Problem,
    NeighborhoodOperator,
    LocalSearchStrategy,
    ShakingStrategy,
    AcceptanceCriterion,
    Solution,
)


class VNSOptimizerBase:
    """Main VNS orchestrator, akin to a Scikit-learn estimator."""

    def __init__(
        self,
        problem: Problem,
        neighborhood_operators: list[NeighborhoodOperator],
        local_search_strategy: LocalSearchStrategy,
        shaking_strategy: ShakingStrategy,
        acceptance_criterion: AcceptanceCriterion,
        max_iterations: int = 100,
        max_no_improvement_iterations: int = 20,
        verbose: bool = False,
    ):
        self.problem = problem
        self.objective_func = problem.get_objective_function()
        self.max_iterations = max_iterations
        self.max_no_improvement_iterations = max_no_improvement_iterations
        self.verbose = verbose  # Verbose now controls logging level potentially, or just extra info

        self.logger = logging.getLogger(self.__class__.__name__)
        if verbose:
            self.logger.setLevel(logging.DEBUG)

        # Default components if not provided
        self.neighborhood_operators = (
            neighborhood_operators or problem.get_neighborhood_operators()
        )
        if not self.neighborhood_operators:
            self.logger.error("At least one neighborhood operator must be provided or defined by the problem.")
            raise ValueError("At least one neighborhood operator must be provided or defined by the problem.")

        self.local_search_strategy = local_search_strategy
        self.shaking_strategy = shaking_strategy
        self.acceptance_criterion = acceptance_criterion

    def optimize(self, initial_solution: Optional[Solution] = None) -> list[Solution]:
        """
        Runs the VNS optimization process.
        Returns the best solution found (for single-obj) or the Pareto front (for multi-obj).
        """
        # Get or generate initial solution
        current_solution = initial_solution or self.problem.generate_initial_solution()
        self.objective_func.evaluate_and_set(current_solution)

        # Initialize the acceptance criterion's internal archive
        self.acceptance_criterion.archive = []
        self.acceptance_criterion.accept(current_solution)

        current_solution_for_shaking = (
            self.acceptance_criterion.get_current_best_solution()
        )
        if current_solution_for_shaking is None:
            self.logger.critical(
                "Optimizer started without an initial solution in the archive."
            )
            raise ValueError(
                "Optimizer started without an initial solution in the archive."
            )

        no_overall_improvement_count = 0

        for iteration in range(self.max_iterations):
            self.logger.info("Iteration %d/%d", iteration + 1, self.max_iterations)
            best_in_archive = self.acceptance_criterion.get_current_best_solution()
            if best_in_archive:
                self.logger.info(
                    "  Current best in archive: %.2f",
                    best_in_archive.get_objectives()[0],
                )

            improved_in_this_vns_iteration = False
            k = 0

            while k < len(self.neighborhood_operators):
                operator_k_shake = self.neighborhood_operators[k]
                operator_k_local_search = self.neighborhood_operators[0]

                self.logger.debug("  Shaking with operator N_%d (%s)", k + 1, operator_k_shake.name)
                shaken_solution = self.shaking_strategy.shake(
                    current_solution_for_shaking, operator_k_shake
                )
                # objectives for shaken_solution are set in local search

                self.logger.debug("  Performing local search with operator N_1 (%s) on shaken solution.", operator_k_local_search.name)
                local_optimum = self.local_search_strategy.search(
                    shaken_solution, operator_k_local_search
                )

                # Ensure objectives are evaluated for local_optimum
                self.objective_func.evaluate_and_set(local_optimum)
                accepted = self.acceptance_criterion.accept(local_optimum)

                if accepted:
                    current_best: Solution = (
                        self.acceptance_criterion.get_current_best_solution()
                    )  # type: ignore
                    best_obj_now = current_best.get_objectives()[0]
                    self.logger.info(
                        "    Improved! Archive updated. New best overall: %.2f",
                        best_obj_now,
                    )

                    current_solution_for_shaking = current_best
                    k = 0  # Reset to smallest neighborhood for next shake
                    no_overall_improvement_count = 0
                    improved_in_this_vns_iteration = True
                else:
                    self.logger.debug(
                        "    No improvement with operator N_%d. Moving to next neighborhood.",
                        k + 1,
                    )
                    k += 1

            if not improved_in_this_vns_iteration:
                no_overall_improvement_count += 1
                self.logger.info(
                    "  No improvement in this VNS iteration. Consecutive no-improvements: %d",
                    no_overall_improvement_count,
                )
            else:
                self.logger.info("  Improvement found in this VNS iteration.")
                no_overall_improvement_count = 0

            if no_overall_improvement_count >= self.max_no_improvement_iterations:
                self.logger.info(
                    "Stopping after %d consecutive VNS iterations without overall improvement.",
                    self.max_no_improvement_iterations,
                )
                break

        return self.acceptance_criterion.get_archive()
