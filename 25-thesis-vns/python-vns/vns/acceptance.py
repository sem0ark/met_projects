from collections import deque
import logging
import random
from typing import Callable
from vns.abstract import AcceptanceCriterion, Solution


def dominates_minimize(
    new_objective: tuple[float, ...],
    current_objective: tuple[float, ...],
    buffer_value: float,
) -> bool:
    """
    Checks if objective vector new_objective dominates objective vector current_objective.
    Assumes minimization for all objectives.
    """
    if len(new_objective) != len(current_objective):
        raise ValueError("Objective vectors must have the same number of objectives.")

    at_least_one_strictly_better = False
    for i in range(len(new_objective)):
        if abs(new_objective[i] - current_objective[i]) < 1e-6:
            continue

        if new_objective[i] > current_objective[i]:
            buffer_value -= new_objective[i] - current_objective[i]
            if buffer_value > 0:
                continue
            return False
        elif new_objective[i] < current_objective[i]:
            at_least_one_strictly_better = True

    return at_least_one_strictly_better


def dominates_maximize(
    new_objective: tuple[float, ...],
    current_objective: tuple[float, ...],
    buffer_value: float,
) -> bool:
    """
    Checks if objective vector new_objective dominates objective vector current_objective.
    Assumes maximization for all objectives.
    """
    if len(new_objective) != len(current_objective):
        raise ValueError("Objective vectors must have the same number of objectives.")

    at_least_one_strictly_better = False
    for i in range(len(new_objective)):
        if abs(new_objective[i] - current_objective[i]) < 1e-6:
            continue

        if new_objective[i] < current_objective[i]:
            buffer_value -= current_objective[i] - new_objective[i]
            if buffer_value > 0:
                continue
            return False
        elif new_objective[i] > current_objective[i]:
            at_least_one_strictly_better = True

    return at_least_one_strictly_better


class TakeSmaller(AcceptanceCriterion):
    """
    General-purpose Acceptance Criterion (minimization).

    For multi-objective problems, it maintains an archive of non-dominated solutions (Pareto front).
    """

    def __init__(self, buffer_size: int = 0):
        super().__init__()

        self.archive: list[Solution] = []
        self.buffer: deque[Solution] = deque(maxlen=buffer_size)
        self.buffer_size = buffer_size

        self.logger = logging.getLogger(self.__class__.__name__)

    def accept(self, candidate: Solution) -> bool:
        """
        Decides whether to accept candidate and update the archive.
        Updates the non-dominated archive based on Pareto dominance.

        Returns True if the archive changes (solution added/removed).
        """

        new_archive = []

        for solution in self.archive:
            if self.dominates(solution, candidate) or all(
                abs(o1 - o2) < 1e-6
                for o1, o2 in zip(solution.objectives, candidate.objectives)
            ):
                return False

            if not self.dominates(candidate, solution):
                new_archive.append(solution)
            else:
                self.buffer.append(solution)

        new_archive.append(candidate)
        self.archive = new_archive

        return True

    def get_one_current_solution(self) -> Solution:
        """Returns a single solution from either the main archive or buffer."""
        # Check if prioritizing better solutions will help
        # https://numpy.org/doc/stable/reference/random/generated/numpy.random.triangular.html

        size = len(self.archive) + len(self.buffer)
        if size == 0:
            raise ValueError("No solutions")

        index = random.randint(0, size - 1)
        if index < len(self.archive):
            return self.archive[index]

        index -= len(self.archive)
        return self.buffer[index]

    def dominates(self, new_solution: Solution, current_solution: Solution) -> bool:
        return dominates_minimize(
            new_solution.objectives, current_solution.objectives, 0.0
        )

    def clear(self):
        super().clear()
        self.buffer = deque(maxlen=self.buffer_size)


class TakeSmallerSkewed(TakeSmaller):
    """
    Skewed Acceptance Criterion for SVNS (minimization).

    It accepts solutions based on standard improvement, AND also accepts solutions
    that are 'skewed acceptable' even if not strictly better, allowing the search
    to escape local optima or explore plateaus.
    """

    def __init__(
        self,
        alpha: float,
        distance_metric: Callable[[Solution, Solution], float],
        buffer_size: int,
    ):
        super().__init__()

        self.alpha = alpha
        self.distance_metric = distance_metric

        self.archive: list[Solution] = []
        self.buffer: deque[Solution] = deque(maxlen=buffer_size)

        self.logger = logging.getLogger(self.__class__.__name__)

    def accept(self, candidate: Solution) -> bool:
        if super().accept(candidate):
            return True

        if all(
            solution is not candidate
            and self.dominates_buffered(
                candidate,
                solution,
                self.alpha * self.distance_metric(candidate, solution),
            )
            for solution in self.archive
        ):
            self.buffer.append(candidate)

        return False

    def dominates_buffered(
        self, new_solution: Solution, current_solution: Solution, buffer_value: float
    ) -> bool:
        return dominates_minimize(
            new_solution.objectives, current_solution.objectives, buffer_value
        )


class TakeBigger(TakeSmaller):
    """
    General-purpose Acceptance Criterion (maximization).

    For multi-objective problems, it maintains an archive of non-dominated solutions (Pareto front).
    """

    def dominates(self, new_solution: Solution, current_solution: Solution) -> bool:
        return dominates_maximize(
            new_solution.objectives, current_solution.objectives, 0.0
        )


class TakeBiggerSkewed(TakeSmallerSkewed, TakeBigger):
    """
    Skewed Acceptance Criterion for SVNS (maximization).

    It accepts solutions based on standard improvement, AND also accepts solutions
    that are 'skewed acceptable' even if not strictly better, allowing the search
    to escape local optima or explore plateaus.
    """

    def dominates_buffered(
        self, new_solution: Solution, current_solution: Solution, buffer_value: float
    ) -> bool:
        return dominates_maximize(
            new_solution.objectives, current_solution.objectives, buffer_value
        )
