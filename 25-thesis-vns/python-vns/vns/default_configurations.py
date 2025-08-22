from vns.abstract import (
    AcceptanceCriterion,
    Problem,
    ShakeFunction,
    VNSConfig,
)
from vns.local_search import noop_local_search


def get_RVNS_optimizer_config(
    problem: Problem,
    shake_function: ShakeFunction,
    acceptance_criterion: AcceptanceCriterion,
):
    """
    Reduced VNS optimizer with default components:
    - Empty Local Search (RVNS doesn't have this step)
    - Simple Shaking
    - Best-of-History Acceptance
    """
    return VNSConfig(
        problem=problem,
        search_functions=[noop_local_search()],
        shake_function=shake_function,
        acceptance_criterion=acceptance_criterion,
    )
