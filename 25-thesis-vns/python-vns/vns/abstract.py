from dataclasses import dataclass
from functools import cached_property
from typing import Any, Callable, Generic, Iterable, Self, TypeVar


ObjectiveFunction = Callable[["Solution"], tuple[float, ...]]


@dataclass
class Problem:
    """
    Abstract interface for defining an optimization problem.
    Concrete problems (e.g., TSP, knapsack) will implement this.
    """

    objective_function: ObjectiveFunction
    """Objective function for this problem."""

    get_initial_solution: Callable[[], "Solution"]
    """Get a random solution to start with."""


T = TypeVar("T")


@dataclass
class Solution(Generic[T]):
    """Abstract base class for a solution to a given problem."""

    data: T  # Problem-specific representation (list, array, etc.)
    problem: Problem

    @cached_property
    def objectives(self) -> tuple[float, ...]:
        return self.problem.objective_function(self)

    def new(self, data: Any) -> Self:
        return self.__class__(data, self.problem)


class AcceptanceCriterion:
    """
    Abstract interface for deciding whether to accept a new solution.
    Used to compare and store currently the best solutions found.
    """

    def __init__(self):
        self.archive: list[Solution] = []
        """The archive is now managed internally by the acceptance criterion."""

    def dominates(self, new_solution: Solution, current_solution: Solution) -> bool:
        """
        Determines if 'new_solution' is better than 'current_solution' based on Pareto dominance.
        """
        raise NotImplementedError

    def accept(self, candidate: Solution) -> bool:
        """
        Decides whether to accept candidate_solution and updates the internal archive.
        Returns True if the candidate leads to a new "current best" or improves the archive.
        """
        raise NotImplementedError

    def get_all_solutions(self) -> list[Solution]:
        """Returns the full archive of accepted solutions."""
        return self.archive

    def get_one_current_solution(self) -> Solution:
        """Returns a single solution from the archive."""
        raise NotImplementedError

    def clear(self):
        self.archive = []


NeighborhoodOperator = Callable[["Solution", "VNSConfig"], Iterable["Solution"]]

ShakeFunction = Callable[["Solution", int, "VNSConfig"], "Solution"]
SearchFunction = Callable[["Solution", "VNSConfig"], "Solution"]


@dataclass
class VNSConfig:
    """Configuration for an abstract VNS optimizer."""

    problem: Problem

    search_functions: list[SearchFunction]
    """Neighborhood operators for a given problem, ordered by increasing size/complexity."""

    shake_function: ShakeFunction

    acceptance_criterion: AcceptanceCriterion

    def __post_init__(self):
        if not self.search_functions:
            raise ValueError(
                "At least one neighborhood operator must be provided or defined by the problem."
            )
