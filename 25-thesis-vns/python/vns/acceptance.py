from collections import deque
import logging
import random
from typing import Callable, Optional
from vns.abstract import AcceptanceCriterion, ObjectiveFunction, Solution


class TakeBestAcceptance(AcceptanceCriterion):
    """
    General-purpose Acceptance Criterion.

    For multi-objective problems, it maintains an archive of non-dominated solutions (Pareto front).

    Provides methods to get the full archive or a single solution for shaking.
    """

    def __init__(self, objective_func: ObjectiveFunction):
        super().__init__(objective_func)
        self.archive: list[Solution] = []
        self.logger = logging.getLogger(self.__class__.__name__)

    def accept(self, candidate_solution: Solution) -> bool:
        """
        Decides whether to accept candidate_solution and update the archive.
        Updates the non-dominated archive based on Pareto dominance.

        Returns True if the archive changes (solution added/removed).
        """
        self.objective_func.evaluate_and_set(candidate_solution)

        if not self.archive:
            self.archive.append(candidate_solution.copy())
            return True

        dominating = [
            solution
            for solution in self.archive
            if not self.objective_func.is_better(candidate_solution, solution)
        ]
        archive_changed = len(dominating) != len(self.archive)
        if archive_changed:
            # Means that candidate dominates some of the existing solutions
            dominating.append(candidate_solution.copy())

        self.archive = dominating
        return archive_changed


class SkewedAcceptance(AcceptanceCriterion):
    """
    Skewed Acceptance Criterion for SINGLE-OBJECTIVE VNS (minimization).

    It accepts solutions based on standard improvement, AND also accepts solutions
    that are 'skewed acceptable' even if not strictly better, allowing the search
    to escape local optima or explore plateaus.
    """

    def __init__(
        self,
        objective_func: ObjectiveFunction,
        alpha: float,
        distance_metric: Callable[[Solution, Solution], float],
    ):
        super().__init__(objective_func)
        self.alpha = alpha
        self.distance_metric = distance_metric

        self.archive: list[Solution] = []
        self.logger = logging.getLogger(self.__class__.__name__)

        if self.objective_func.n_dimensions > 1:
            raise ValueError("SkewedAcceptance is for single-objective problems only.")

        self.logger.info(
            "Initialized SkewedAcceptance for single-objective with alpha=%.2f",
            alpha,
        )

    def accept(self, candidate_solution: Solution) -> bool:
        self.objective_func.evaluate_and_set(
            candidate_solution
        )  # Ensure objectives are set

        # Extract scalar objective values
        candidate_value = candidate_solution.get_objectives()[
            0
        ]  # Only the first objective

        if not self.archive:  # Initial solution or empty archive
            self.archive.append(candidate_solution.copy())  # Store a copy
            return True

        current_best_in_archive = self.archive[0]
        current_best_value = current_best_in_archive.get_objectives()[
            0
        ]  # Only the first objective

        distance = self.distance_metric(current_best_in_archive, candidate_solution)
        skewed_candidate_value = candidate_value - self.alpha * distance

        if skewed_candidate_value < current_best_value:
            self.archive = [candidate_solution.copy()]  # Replace the old best
            return True

        return False


class BufferedAcceptanceCriterion(AcceptanceCriterion):
    def __init__(self, objective_func: ObjectiveFunction, buffer_size: int):
        super().__init__(objective_func)
        # Use deque for efficient FIFO behavior (append and popleft)
        self.buffer: deque[Solution] = deque(maxlen=buffer_size)

    def get_one_current_solution(self) -> Optional[Solution]:
        """Returns a single solution from either the main archive or buffer."""
        size = len(self.archive) + len(self.buffer)
        if size == 0:
            return None

        index = random.randint(0, size - 1)
        if index < len(self.archive):
            return self.archive[index]

        index -= len(self.archive)
        return self.buffer[index]


class BeamSearchAcceptance(BufferedAcceptanceCriterion):
    """General-purpose Acceptance Criterion with a beam search buffer."""

    def __init__(self, objective_func: ObjectiveFunction, buffer_size: int):
        super().__init__(objective_func, buffer_size)

    def accept(self, candidate_solution: Solution) -> bool:
        """
        Decides whether to accept candidate_solution and update the archive/buffer.
        Returns True if the archive changes, False otherwise.
        """
        self.objective_func.evaluate_and_set(candidate_solution)

        if not self.archive:  # First solution always goes into archive
            self.archive.append(candidate_solution.copy())
            return True

        dominating = []
        for solution in self.archive:
            if self.objective_func.is_better(candidate_solution, solution):
                self.buffer.append(solution)
            else:
                dominating.append(solution)

        archive_changed = len(dominating) != len(self.archive)
        if archive_changed:
            # Means that candidate dominates some of the existing solutions
            dominating.append(candidate_solution.copy())

        self.archive = dominating
        return archive_changed


class BeamSeachSkewedAcceptance(BufferedAcceptanceCriterion):
    """
    Skewed Acceptance Criterion for SINGLE-OBJECTIVE VNS (minimization).

    It accepts solutions based on standard improvement, AND also accepts solutions
    that are 'skewed acceptable' even if not strictly better, allowing the search
    to escape local optima or explore plateaus.
    """

    def __init__(
        self,
        objective_func: ObjectiveFunction,
        alpha: float,
        buffer_size: int,
        distance_metric: Callable[[Solution, Solution], float],
    ):
        super().__init__(objective_func, buffer_size)
        self.alpha = alpha
        self.distance_metric = distance_metric

        self.archive: list[Solution] = []
        self.logger = logging.getLogger(self.__class__.__name__)

        if self.objective_func.n_dimensions > 1:
            raise ValueError("SkewedAcceptance is for single-objective problems only.")

        self.logger.info(
            "Initialized SkewedAcceptance for single-objective with alpha=%.2f and buffer_size=%d",
            alpha,
            buffer_size,
        )

    def accept(self, candidate_solution: Solution) -> bool:
        self.objective_func.evaluate_and_set(candidate_solution)
        candidate_value = candidate_solution.get_objectives()[0]

        if not self.archive:
            self.archive.append(candidate_solution.copy())
            return True

        current_best_in_archive = self.archive[0]
        current_best_value = current_best_in_archive.get_objectives()[0]

        distance = self.distance_metric(current_best_in_archive, candidate_solution)
        skewed_candidate_value = candidate_value - self.alpha * distance

        if candidate_value < current_best_value:
            self.archive = [candidate_solution.copy()]
            return True

        if skewed_candidate_value < current_best_value:
            self.buffer.append(candidate_solution)

        return False
