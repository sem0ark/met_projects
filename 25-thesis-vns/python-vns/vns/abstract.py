from copy import deepcopy
import random
from typing import Iterable, Optional, Self


class Solution:
    """Abstract base class for a solution to any problem."""

    def __init__(self, data):
        self.data = data
        # Problem-specific representation (e.g., list, array)
        self.objectives: Optional[tuple[float, ...]] = None
        # Stores evaluation results after objective function application

    def __eq__(self, other):
        """Equality check for solutions."""
        return self.data == other.data

    def __hash__(self):
        """Hash for use in sets/dicts (if needed)."""
        # Ensure self.data is hashable. If it's a list, convert to tuple.
        if isinstance(self.data, list):
            return hash(tuple(self.data))
        # Assume data is directly hashable if not a list
        return hash(self.data)

    def get_objectives(self) -> tuple[float, ...]:
        if self.objectives is None:
            raise ValueError("Objectives are not computed")

        return self.objectives

    def copy(self) -> Self:
        return deepcopy(self)


class Problem:
    """
    Abstract interface for defining an optimization problem.
    Concrete problems (e.g., TSP, knapsack) will implement this.
    """

    def __init__(self):
        pass  # Potentially store problem-specific parameters (e.g., distances for TSP)

    def generate_initial_solution(self) -> Solution:
        """Generates a valid initial solution."""
        raise NotImplementedError

    def get_objective_function(self) -> "ObjectiveFunction":
        """Returns the objective function for this problem."""
        raise NotImplementedError

    def get_neighborhood_operators(self) -> list["NeighborhoodOperator"]:
        """
        Returns a list of default or common neighborhood operators for this problem,
        ordered by increasing size/complexity.
        """
        raise NotImplementedError


class ObjectiveFunction:
    """Abstract interface for evaluating a solution."""

    def __init__(self, n_dimensions: int) -> None:
        self.n_dimensions = n_dimensions

    def evaluate(self, solution: Solution) -> tuple[float, ...]:
        """
        Evaluates the solution and returns a list of objective values.
        For single-objective, list will have one element.
        """
        raise NotImplementedError

    def evaluate_and_set(self, solution: Solution) -> None:
        """
        Evaluates the solution and updates it with the list of objective values.
        """
        if not solution.objectives:
            solution.objectives = self.evaluate(solution)

    def is_better(self, new_solution: Solution, current_solution: Solution) -> bool:
        """
        Determines if 'new_solution' is better than 'current_solution' based on Pareto dominance.
        Assumes objectives have already been computed and set on the solutions.

        For multi-objective: new_solution dominates current_solution.
        For single-objective: new_solution > current_solution.
        """
        return self._dominates(
            new_solution.get_objectives(), current_solution.get_objectives()
        )

    def _dominates(
        self, new_objective: tuple[float, ...], current_objective: tuple[float, ...]
    ) -> bool:
        """
        Checks if objective vector obj1 dominates objective vector current_objective.
        Assumes minimization for all objectives.
        """
        if len(new_objective) != len(current_objective):
            raise ValueError(
                "Objective vectors must have the same number of objectives."
            )

        if (
            len(new_objective) == 1
            and abs(new_objective[0] - current_objective[0]) > 1e-6
        ):
            return new_objective[0] < current_objective[0]

        at_least_one_strictly_better = False
        for i in range(len(new_objective)):
            if abs(new_objective[i] - current_objective[i]) < 1e-6:
                continue
            if new_objective[i] > current_objective[i]:
                return False
            elif new_objective[i] < current_objective[i]:
                at_least_one_strictly_better = True

        return at_least_one_strictly_better


class NeighborhoodOperator:
    """Abstract interface for a neighborhood structure operator."""

    def __init__(self, problem: Problem, name: str = "Unnamed"):
        self.problem = problem
        self.name = name

    def generate_neighbor(self, solution: Solution) -> Solution:
        """
        Generates a single neighbor from the given solution using this operator.
        """
        raise NotImplementedError

    def generate_all_neighbors(self, solution: Solution) -> Iterable[Solution]:
        """
        Generates all neighbors for this solution using this operator.
        (Potentially expensive, used by some local search variants).
        """
        raise NotImplementedError


class LocalSearchStrategy:
    """Abstract interface for a local search strategy."""

    def __init__(
        self,
        problem: Problem,
        neighborhood_operator: NeighborhoodOperator,
    ):
        self.problem = problem
        self.objective_func = problem.get_objective_function()
        self.neighborhood_operator = neighborhood_operator

    def search(self, initial_solution: Solution) -> Solution:
        """
        Performs a local search starting from initial_solution using the given operator.
        Returns the local optimum found.
        """
        raise NotImplementedError


class ShakingStrategy:
    """Abstract interface for a shaking strategy."""

    def __init__(self, problem: Problem):
        self.problem = problem

    def shake(
        self, solution: Solution, neighborhood_operator: NeighborhoodOperator
    ) -> Solution:
        """
        Applies a perturbation (shake) to the solution using the given operator.
        """
        raise NotImplementedError


class AcceptanceCriterion:
    """
    Abstract interface for deciding whether to accept a new solution.
    Crucial for multi-objective problems.
    """

    def __init__(self, objective_func: "ObjectiveFunction"):
        self.objective_func = objective_func
        # The archive is now managed internally by the acceptance criterion
        self.archive: list[Solution] = []

    def accept(self, candidate_solution: Solution) -> bool:
        """
        Decides whether to accept candidate_solution and updates the internal archive.
        Returns True if the candidate leads to a new "current best" or improves the archive.
        (The definition of "current best" for the VNS loop might still need to be managed
        by the optimizer based on the archives state, e.g., the best non-dominated solution
        by one objective, or a randomly chosen one from the archive for multi-objective VNS).
        """
        raise NotImplementedError

    def get_all_solutions(self) -> list[Solution]:
        """Returns the full archive of accepted solutions."""
        return self.archive

    def get_one_current_solution(self) -> Solution:
        """Returns a single solution from the archive."""
        if not self.archive:
            raise ValueError("No solutions")

        return random.choice(self.archive)
