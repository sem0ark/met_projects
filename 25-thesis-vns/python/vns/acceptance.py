import logging
from typing import Callable, Optional
from vns.abstract import AcceptanceCriterion, ObjectiveFunction, Solution


class BestOfHistoryAcceptance(AcceptanceCriterion):
    def __init__(self, objective_func: ObjectiveFunction):
        super().__init__(objective_func)
        # For single objective, the archive will always contain at most one solution.
        self.archive: list[Solution] = []

    def accept(self, candidate_solution: Solution) -> bool:
        if not self.archive:  # Archive is empty, always accept the first solution
            self.archive.append(candidate_solution)
            return True

        current_best_in_archive = self.archive[0]

        if self.objective_func.is_better(candidate_solution, current_best_in_archive):
            self.archive = [candidate_solution]  # Replace the old best
            return True
        return False

    def get_current_best_solution(self) -> Optional[Solution]:
        if self.archive:
            return self.archive[0]
        return None


class SkewedAcceptanceCriterion(AcceptanceCriterion):
    def __init__(self, objective_func: ObjectiveFunction, alpha: float, distance_metric: Callable[[Solution, Solution], float]):
        super().__init__(objective_func)
        self.alpha = alpha
        self.distance_metric = distance_metric
        self.archive: list[Solution] = []
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Initialized SkewedAcceptanceCriterion with alpha={alpha}")

    def accept(self, candidate_solution: Solution) -> bool:
        candidate_objectives = candidate_solution.get_objectives()

        if not self.archive: # Initial solution or empty archive
            self.archive.append(candidate_solution)
            self.logger.debug(f"Archive empty, accepted initial solution: {candidate_objectives[0]:.2f}")
            return True

        current_best_in_archive = self.archive[0]
        current_best_objectives = current_best_in_archive.get_objectives()

        # Standard VNS improvement condition
        if self.objective_func.is_better(candidate_solution, current_best_in_archive):
            self.archive = [candidate_solution]
            self.logger.debug(f"Accepted (standard improvement): {candidate_objectives[0]:.2f} (prev: {current_best_objectives[0]:.2f})")
            return True
        else:
            # Skewed acceptance condition
            distance = self.distance_metric(current_best_in_archive, candidate_solution)
            skewed_candidate_value = candidate_objectives[0] - self.alpha * distance
            current_best_value = current_best_objectives[0]

            # We are minimizing, so a smaller value is better.
            # If (candidate_value - alpha*distance) is less than current_best_value, accept.
            if skewed_candidate_value < current_best_value:
                self.archive = [candidate_solution]
                self.logger.info(
                    "Accepted (skewed): Candidate %.2f (skewed to %.2f) vs Current %.2f. Distance: %.2f",
                    candidate_objectives[0], skewed_candidate_value, current_best_value, distance
                )
                return True
        
        self.logger.debug(f"Rejected candidate {candidate_objectives[0]:.2f} (not better than {current_best_objectives[0]:.2f} nor skewed acceptable)")
        return False
