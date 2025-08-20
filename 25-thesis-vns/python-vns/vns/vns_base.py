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
            current_solution = self.config.acceptance_criterion.get_one_current_solution()

            for neighborhood_operator, search_function in self.config.neighborhood_operators:
                shaken_solution = self.config.shake_function(current_solution)
                local_optimum = search_function(shaken_solution, neighborhood_operator)

                accepted = self.config.acceptance_criterion.accept(local_optimum)

                if accepted:
                    self.logger.debug("Improved! Archive updated. New best overall: %s", local_optimum.objectives)
                    break

            yield improved_in_this_vns_iteration
