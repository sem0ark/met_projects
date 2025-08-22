import logging
from typing import Iterable, Optional

from vns.abstract import Solution, VNSConfig


class VNSOptimizer:
    """Main VNS orchestrator, akin to a Scikit-learn estimator."""

    def __init__(
        self,
        config: VNSConfig,
        verbose: bool = False,
    ):
        self.config = config

        self.logger = logging.getLogger(self.__class__.__name__)
        if verbose:
            self.logger.setLevel(logging.DEBUG)
        else:
            self.logger.setLevel(logging.INFO)

    def optimize(self, initial_solution: Optional[Solution] = None) -> Iterable[bool]:
        """
        Runs the VNS optimization process.
        Returns the best solution found (for single-obj) or the Pareto front (for multi-obj).
        """
        initial_solution = self.config.problem.get_initial_solution()
        self.config.acceptance_criterion.accept(initial_solution)

        while True:
            improved_in_this_vns_iteration = False
            current_solution = (
                self.config.acceptance_criterion.get_one_current_solution()
            )

            for k, search_function in enumerate(self.config.search_functions, 1):
                shaken_solution = self.config.shake_function(current_solution, k, self.config)
                local_optimum = search_function(shaken_solution, self.config)

                accepted = self.config.acceptance_criterion.accept(local_optimum)

                if accepted:
                    improved_in_this_vns_iteration = True
                    break

            yield improved_in_this_vns_iteration
