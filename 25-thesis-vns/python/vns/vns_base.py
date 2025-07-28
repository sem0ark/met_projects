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

        self.logger = logging.getLogger(self.__class__.__name__)
        if verbose:
            self.logger.setLevel(logging.DEBUG)
        else:
            self.logger.setLevel(logging.INFO)

        self.neighborhood_operators = (
            neighborhood_operators or problem.get_neighborhood_operators()
        )
        if not self.neighborhood_operators:
            self.logger.error(
                "At least one neighborhood operator must be provided or defined by the problem."
            )
            raise ValueError(
                "At least one neighborhood operator must be provided or defined by the problem."
            )

        self.local_search_strategy = local_search_strategy
        self.shaking_strategy = shaking_strategy
        self.acceptance_criterion = acceptance_criterion

    def optimize(self, initial_solution: Optional[Solution] = None) -> list[Solution]:
        """
        Runs the VNS optimization process.
        Returns the best solution found (for single-obj) or the Pareto front (for multi-obj).
        """
        initial_solution = initial_solution or self.problem.generate_initial_solution()
        self.objective_func.evaluate_and_set(initial_solution)

        self.acceptance_criterion.archive = []
        self.acceptance_criterion.accept(initial_solution)

        current_solution = self.acceptance_criterion.get_one_current_solution()
        if current_solution is None:
            self.logger.critical("Optimizer started without an initial solution in the archive.")
            raise ValueError("Optimizer started without an initial solution in the archive.")

        no_overall_improvement_count = 0

        for iteration in range(self.max_iterations):
            self.logger.info("Iteration %d/%d", iteration + 1, self.max_iterations)
            improved_in_this_vns_iteration = False
            k = 0

            while k < len(self.neighborhood_operators):
                operator_k_shake = self.neighborhood_operators[k]

                self.logger.debug(
                    "  Shaking with operator N_%d (%s)", k + 1, operator_k_shake.name
                )
                shaken_solution = self.shaking_strategy.shake(current_solution, operator_k_shake)
                local_optimum = self.local_search_strategy.search(shaken_solution)

                self.objective_func.evaluate_and_set(local_optimum)
                accepted = self.acceptance_criterion.accept(local_optimum)

                if accepted:
                    self.logger.info("    Improved! Archive updated. New best overall: %s", local_optimum.get_objectives())
                    current_solution: Solution = (
                        self.acceptance_criterion.get_one_current_solution()
                    )  # type: ignore
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
                self.logger.debug(
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

        return self.acceptance_criterion.get_all_solutions()
