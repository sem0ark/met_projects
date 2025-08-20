import logging

from vns.abstract import (
    Problem,
    NeighborhoodOperator,
    Solution,
    VNSConfig,
)


def noop_local_search(solution: Solution, _operator: NeighborhoodOperator, _config: VNSConfig):
    return solution


def best_improvement_local_search(initial: Solution, operator: NeighborhoodOperator, config: VNSConfig):
    current = initial
    is_better = config.acceptance_criterion.dominates

    while True:
        improved_in_iteration = False
        best_found_in_neighborhood = current

        for neighbor in operator(current):

            if is_better(neighbor, best_found_in_neighborhood):
                best_found_in_neighborhood = neighbor
                improved_in_iteration = True

        if not improved_in_iteration:
            break

        if not is_better(best_found_in_neighborhood, current):
            break

        current = best_found_in_neighborhood

    return current


def first_improvement_local_search(initial: Solution, operator: NeighborhoodOperator, config: VNSConfig):
    pass


class FirstImprovementLocalSearch(LocalSearchStrategy):
    def __init__(
        self,
        problem: Problem,
        neighborhood_operator: NeighborhoodOperator,
    ) -> None:
        super().__init__(problem, neighborhood_operator)
        self.logger = logging.getLogger(self.__class__.__name__)

    def search(self, initial_solution: Solution) -> Solution:
        current: Solution = initial_solution
        evaluate_and_set(current)

        visited_solutions = {current}

        while True:
            evaluate_and_set(current)

            found_improving_neighbor = False
            for neighbor in self.neighborhood_operator.generate_all_neighbors(current):
                evaluate_and_set(neighbor)

                if is_better(neighbor, current):
                    if neighbor not in visited_solutions:
                        current = neighbor  # Move to the first improving neighbor
                        visited_solutions.add(current)
                        found_improving_neighbor = True
                        self.logger.debug(
                            "First Improvement: Moved to new solution with obj %s",
                            current.objectives,
                        )
                        break
                    else:
                        self.logger.debug(
                            "First Improvement: Found improving neighbor but it was already visited. Searching for another."
                        )

            if not found_improving_neighbor:
                self.logger.debug(
                    "First Improvement: No improving neighbor found in neighborhood. Stopping."
                )
                break

        return current


class CompositeLocalSearch(LocalSearchStrategy):
    """
    A composite local search strategy that applies a sequence of
    single-neighborhood local search methods, typically used for VND.
    """

    def __init__(
        self,
        problem: Problem,
        local_search_strategies: list[LocalSearchStrategy],
    ) -> None:
        # The base LocalSearchStrategy expects a single neighborhood_operator,
        # but for Composite, it's not directly applicable. Pass None.
        super().__init__(
            problem,
            neighborhood_operator=local_search_strategies[0].neighborhood_operator,
        )

        if not local_search_strategies:
            raise ValueError(
                "CompositeLocalSearch requires a list of LocalSearchStrategy objects."
            )

        self.local_search_strategies = local_search_strategies
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(
            f"Initialized CompositeLocalSearch (VND) with strategies: "
            f"{[strat.__class__.__name__ + '(' + (strat.neighborhood_operator.name if strat.neighborhood_operator else 'N/A') + ')' for strat in local_search_strategies]}"
        )

    def search(self, initial_solution: Solution) -> Solution:
        """
        Performs a Variable Neighborhood Descent (VND) using the provided
        sequence of local search strategies.
        """
        current_solution: Solution = initial_solution.copy()
        evaluate_and_set(current_solution)
        self.logger.debug(
            "CompositeLocalSearch (VND) started with initial solution obj: %s",
            current_solution.objectives,
        )

        vnd_level = 0
        while vnd_level < len(self.local_search_strategies):
            current_strategy = self.local_search_strategies[vnd_level]
            self.logger.debug(
                "  VND: Applying strategy N_%d (%s with %s) from obj %s",
                vnd_level + 1,
                current_strategy.__class__.__name__,
                current_strategy.neighborhood_operator.name
                if current_strategy.neighborhood_operator
                else "N/A",
                current_solution.objectives,
            )

            new_solution_from_ls = current_strategy.search(current_solution)
            evaluate_and_set(new_solution_from_ls)

            if is_better(new_solution_from_ls, current_solution):
                self.logger.debug(
                    "  VND: Improvement found by strategy N_%d. New obj: %s",
                    vnd_level + 1,
                    new_solution_from_ls.objectives,
                )
                vnd_level = 0
                current_solution = new_solution_from_ls
            else:
                vnd_level += 1

        return current_solution  # Return the local optimum found by VND
