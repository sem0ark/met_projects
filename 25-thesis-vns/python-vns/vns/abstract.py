from dataclasses import dataclass
from functools import cached_property
from typing import Any, Callable, Iterable


ObjectiveFunction = Callable[["Solution"], float]


@dataclass(frozen=True)
class Problem:
    """
    Abstract interface for defining an optimization problem.
    Concrete problems (e.g., TSP, knapsack) will implement this.
    """

    objective_functions: list[ObjectiveFunction]
    """Objective functions for this problem."""

    get_initial_solution: Callable[[], "Solution"]
    """Get a random solution to start with."""
    

@dataclass(frozen=True)
class Solution:
    """Abstract base class for a solution to a given problem."""

    data: Any  # Problem-specific representation (list, array, etc.)
    problem: Problem

    @cached_property
    def objectives(self) -> tuple[float, ...]:
        return tuple(
            obj(self)
            for obj in self.problem.objective_functions
        )


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



NeighborhoodOperator = Callable[["Solution"], Iterable["Solution"]]

ShakeFunction = Callable[["Solution"], "Solution"]
SearchFunction = Callable[["Solution", NeighborhoodOperator, "VNSConfig"], "Solution"]


@dataclass
class VNSConfig:
    """Configuration for an abstract VNS optimizer."""

    problem: Problem

    neighborhood_operators: list[
        tuple[NeighborhoodOperator, SearchFunction]
    ]
    """Neighborhood operators for a given problem, ordered by increasing size/complexity."""

    shake_function: ShakeFunction

    acceptance_criterion: AcceptanceCriterion

    def __post_init__(self):
        if not self.neighborhood_operators:
            raise ValueError(
                "At least one neighborhood operator must be provided or defined by the problem."
            )
