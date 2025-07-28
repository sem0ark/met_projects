from typing import Callable, Literal, Optional

from vns.abstract import (
    AcceptanceCriterion,
    LocalSearchStrategy,
    Problem,
    NeighborhoodOperator,
    ShakingStrategy,
    Solution,
)
from vns.acceptance import (
    BeamSeachSkewedAcceptance,
    TakeBestAcceptance,
    SkewedAcceptance,
)
from vns.local_search import (
    BestImprovementLocalSearch,
    CompositeLocalSearch,
    FirstImprovementLocalSearch,
)
from vns.shaking import SimpleShaking
from vns.vns_base import VNSOptimizerBase


class BasicVNSOptimizer(VNSOptimizerBase):
    """
    Basic VNS optimizer with default components:
    - Best Improvement Local Search (using the first neighborhood operator)
    - Simple Shaking
    - Best-of-History Acceptance
    """

    def __init__(
        self,
        problem: Problem,
        neighborhood_operators: Optional[list[NeighborhoodOperator]] = None,
        max_iterations: int = 100,
        max_no_improvement_iterations: int = 20,
        verbose: bool = False,
        # Allow overriding specific components if user wants to
        local_search_strategy: Optional[LocalSearchStrategy] = None,
        shaking_strategy: Optional[ShakingStrategy] = None,
        acceptance_criterion: Optional[AcceptanceCriterion] = None,
    ):
        objective_function = problem.get_objective_function()

        # Default local search: Best Improvement with the first shaking operator
        # This assumes neighborhood_operators is not empty, which is checked in VNSOptimizerBase
        default_neighborhoods = (
            neighborhood_operators or problem.get_neighborhood_operators()
        )
        default_local_search = local_search_strategy
        if default_local_search is None:
            if not default_neighborhoods:
                raise ValueError(
                    "Cannot set default BestImprovementLocalSearch without any neighborhood operators."
                )
            default_local_search = BestImprovementLocalSearch(
                problem, default_neighborhoods[0]
            )

        # Default shaking strategy
        default_shaking = shaking_strategy or SimpleShaking(problem)

        # Default acceptance criterion
        default_acceptance = acceptance_criterion or TakeBestAcceptance(
            objective_function
        )

        super().__init__(
            problem=problem,
            neighborhood_operators=default_neighborhoods,
            local_search_strategy=default_local_search,
            shaking_strategy=default_shaking,
            acceptance_criterion=default_acceptance,
            max_iterations=max_iterations,
            max_no_improvement_iterations=max_no_improvement_iterations,
            verbose=verbose,
        )
        self.logger.info("Initialized BasicVNSOptimizer.")


class GeneralVNSOptimizer(VNSOptimizerBase):
    """
    General VNS optimizer allowing selection of common local search heuristics
    (Best Improvement, First Improvement, or VND).
    """

    def __init__(
        self,
        problem: Problem,
        neighborhood_operators: Optional[list[NeighborhoodOperator]] = None,
        max_iterations: int = 100,
        max_no_improvement_iterations: int = 20,
        verbose: bool = False,
        local_search_strategies: Optional[list[LocalSearchStrategy]] = None,
        shaking_strategy: Optional[ShakingStrategy] = None,
        acceptance_criterion: Optional[AcceptanceCriterion] = None,
    ):
        objective_function = problem.get_objective_function()
        default_neighborhoods = (
            neighborhood_operators or problem.get_neighborhood_operators()
        )
        if not default_neighborhoods:
            raise ValueError(
                "Neighborhood operators must be provided or defined by the problem."
            )

        if local_search_strategies is None:
            selected_local_search = CompositeLocalSearch(problem, [BestImprovementLocalSearch(problem, op) for op in default_neighborhoods])
        else:
            selected_local_search = CompositeLocalSearch(problem, local_search_strategies)

        default_shaking = shaking_strategy or SimpleShaking(problem)
        default_acceptance = acceptance_criterion or TakeBestAcceptance(objective_function)

        super().__init__(
            problem=problem,
            neighborhood_operators=default_neighborhoods,
            local_search_strategy=selected_local_search,
            shaking_strategy=default_shaking,
            acceptance_criterion=default_acceptance,
            max_iterations=max_iterations,
            max_no_improvement_iterations=max_no_improvement_iterations,
            verbose=verbose,
        )


class SkewedVNSOptimizer(VNSOptimizerBase):
    """
    Skewed VNS optimizer, characterized by its SkewedAcceptance.
    Other components default to Best Improvement Local Search and Simple Shaking.
    """

    def __init__(
        self,
        problem: Problem,
        alpha: float,
        distance_metric: Callable[[Solution, Solution], float],
        neighborhood_operators: Optional[list[NeighborhoodOperator]] = None,
        max_iterations: int = 100,
        max_no_improvement_iterations: int = 20,
        max_skewed_solutions: int = 10,
        verbose: bool = False,
        # Allow overriding other components
        local_search_strategy: Optional[LocalSearchStrategy] = None,
        shaking_strategy: Optional[ShakingStrategy] = None,
    ):
        objective_function = problem.get_objective_function()
        default_neighborhoods = (
            neighborhood_operators or problem.get_neighborhood_operators()
        )
        if not default_neighborhoods:
            raise ValueError(
                "Neighborhood operators must be provided or defined by the problem."
            )

        # Skewed acceptance criterion is mandatory for this optimizer type
        skewed_acceptance = BeamSeachSkewedAcceptance(
            objective_function, alpha, max_skewed_solutions, distance_metric
        )

        # Default local search for Skewed VNS (usually Best Improvement)
        default_local_search = local_search_strategy or BestImprovementLocalSearch(
            problem, default_neighborhoods[0]
        )

        # Default shaking strategy
        default_shaking = shaking_strategy or SimpleShaking(problem)

        super().__init__(
            problem=problem,
            neighborhood_operators=default_neighborhoods,
            local_search_strategy=default_local_search,
            shaking_strategy=default_shaking,
            acceptance_criterion=skewed_acceptance,  # This is the key difference
            max_iterations=max_iterations,
            max_no_improvement_iterations=max_no_improvement_iterations,
            verbose=verbose,
        )
        self.logger.info(f"Initialized SkewedVNSOptimizer with alpha={alpha}.")
