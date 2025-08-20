from vns.abstract import (
    AcceptanceCriterion,
    Problem,
    ShakeFunction,
    VNSConfig,
)


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
        neighborhood_operators=[(lambda sol: [], lambda solution, op, conf: solution)],
        shake_function=shake_function,
        acceptance_criterion=acceptance_criterion,
    )
