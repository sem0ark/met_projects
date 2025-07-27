from typing import Callable, Optional

from vns.abstract import (
    AcceptanceCriterion,
    LocalSearchStrategy,
    Problem,
    NeighborhoodOperator,
    ShakingStrategy,
    Solution,
)
from vns.acceptance import BestOfHistoryAcceptance, SkewedAcceptanceCriterion
from vns.local_search import BestImprovementLocalSearch
from vns.shaking import SimpleShaking
from vns.vns_base import VNSOptimizerBase


class BasicVNSOptimizer(VNSOptimizerBase):
    """Basic VNS optimizer."""

    def __init__(
        self,
        problem: Problem,
        neighborhood_operators: Optional[list[NeighborhoodOperator]] = None,
        max_iterations: int = 100,
        max_no_improvement_iterations: int = 20,
        verbose: bool = False,
        local_search_strategy: Optional[LocalSearchStrategy] = None,
        shaking_strategy: Optional[ShakingStrategy] = None,
        acceptance_criterion: Optional[AcceptanceCriterion] = None,
    ):
        objective_function = problem.get_objective_function()
        super().__init__(
            problem=problem,
            neighborhood_operators=neighborhood_operators or problem.get_neighborhood_operators(),
            local_search_strategy=local_search_strategy or BestImprovementLocalSearch(problem, objective_function),
            shaking_strategy=shaking_strategy or SimpleShaking(problem),
            acceptance_criterion=acceptance_criterion or BestOfHistoryAcceptance(objective_function),
            max_iterations = max_iterations,
            max_no_improvement_iterations = max_no_improvement_iterations,
            verbose = verbose,
        )


class SkewedVNSOptimizer(VNSOptimizerBase):
    """Skewed VNS optimizer."""

    def __init__(
        self,
        problem: Problem,
        alpha: float,
        distance_metric: Callable[[Solution, Solution], float],
        neighborhood_operators: Optional[list[NeighborhoodOperator]] = None,
        max_iterations: int = 100,
        max_no_improvement_iterations: int = 20,
        verbose: bool = False,

        local_search_strategy: Optional[LocalSearchStrategy] = None,
        shaking_strategy: Optional[ShakingStrategy] = None,
        acceptance_criterion: Optional[AcceptanceCriterion] = None,
    ):
        objective_function = problem.get_objective_function()
        super().__init__(
            problem=problem,
            neighborhood_operators=neighborhood_operators or problem.get_neighborhood_operators(),
            local_search_strategy=local_search_strategy or BestImprovementLocalSearch(problem, objective_function),
            shaking_strategy=shaking_strategy or SimpleShaking(problem),
            acceptance_criterion=acceptance_criterion or SkewedAcceptanceCriterion(objective_function, alpha, distance_metric),
            max_iterations = max_iterations,
            max_no_improvement_iterations = max_no_improvement_iterations,
            verbose = verbose,
        )
