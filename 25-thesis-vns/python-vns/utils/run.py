import time
import logging

from vns.optimizer import VNSOptimizer
from vns.abstract import Solution


def run_vns_optimizer(
    run_seconds: float,
    optimizer: VNSOptimizer,
) -> list[Solution]:
    """
    Runs the VNS optimizer for a specified duration and returns the final
    list of non-dominated solutions.
    
    Args:
        run_seconds: The maximum duration in seconds for the optimization run.
        optimizer: The VNSOptimizer instance to run.

    Returns:
        A list of Solution objects representing the final Pareto front.
    """
    logger = logging.getLogger(optimizer.config.get_name())
    start_time = time.time()
    
    optimizer.config.acceptance_criterion.clear()
    
    for iteration, improved in enumerate(optimizer.optimize(), 1):
        elapsed_time = time.time() - start_time

        if elapsed_time > run_seconds:
            logger.info("Timeout after %d iterations, ran for %d seconds.", iteration, elapsed_time)
            break
        
        if improved:
            num_solutions = len(optimizer.config.acceptance_criterion.get_all_solutions())
            logger.info("Iteration %d: Improved! Total # solutions: %d", iteration, num_solutions)

    return optimizer.config.acceptance_criterion.get_all_solutions()
