import logging

from vns.abstract import (
    Problem,
    NeighborhoodOperator,
    Solution,
    LocalSearchStrategy,
)


class NoopLocalSearch(LocalSearchStrategy):
    """
    A local search strategy that does nothing, used for RVNS.
    """

    def __init__(
        self,
        problem: Problem,
        neighborhood_operator: NeighborhoodOperator,
    ) -> None:
        super().__init__(problem, neighborhood_operator)
        self.logger = logging.getLogger(self.__class__.__name__)

    def search(self, initial_solution: Solution) -> Solution:
        current: Solution = initial_solution.copy()
        self.objective_func.evaluate_and_set(current)
        return current


class BestImprovementLocalSearch(LocalSearchStrategy):
    def __init__(
        self,
        problem: Problem,
        neighborhood_operator: NeighborhoodOperator,
    ) -> None:
        super().__init__(problem, neighborhood_operator)
        self.logger = logging.getLogger(self.__class__.__name__)

    def search(self, initial_solution: Solution) -> Solution:
        current: Solution = initial_solution.copy()
        self.objective_func.evaluate_and_set(current)

        visited_solutions = {current}

        while True:
            improved_in_iteration = False
            best_found_in_neighborhood = current

            # Generating all neighbors is necessary for Best Improvement
            for neighbor in self.neighborhood_operator.generate_all_neighbors(current):
                self.objective_func.evaluate_and_set(neighbor)

                if self.objective_func.is_better(neighbor, best_found_in_neighborhood):
                    best_found_in_neighborhood = neighbor
                    improved_in_iteration = True

            if improved_in_iteration:  # If we found any neighbor better than 'current'
                if self.objective_func.is_better(best_found_in_neighborhood, current):
                    if best_found_in_neighborhood not in visited_solutions:
                        current = best_found_in_neighborhood
                        visited_solutions.add(current)
                        self.logger.debug(
                            "Best Improvement: Moved to new solution with obj %s",
                            current.get_objectives(),
                        )
                    else:
                        self.logger.debug(
                            "Best Improvement: Hit previously visited solution, stopping."
                        )
                        break  # Avoid cycling on plateaus
                else:
                    self.logger.debug(
                        "Best Improvement: No strictly better overall neighbor found, stopping."
                    )
                    break  # No strict improvement over the initial "current" of this iteration
            else:
                self.logger.debug(
                    "Best Improvement: No improvement found in the neighborhood, stopping."
                )
                break  # No improvement at all

        return current


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
        self.objective_func.evaluate_and_set(current)

        visited_solutions = {current}

        while True:
            self.objective_func.evaluate_and_set(current)

            found_improving_neighbor = False
            for neighbor in self.neighborhood_operator.generate_all_neighbors(current):
                self.objective_func.evaluate_and_set(neighbor)

                if self.objective_func.is_better(neighbor, current):
                    if neighbor not in visited_solutions:
                        current = neighbor  # Move to the first improving neighbor
                        visited_solutions.add(current)
                        found_improving_neighbor = True
                        self.logger.debug(
                            "First Improvement: Moved to new solution with obj %s",
                            current.get_objectives(),
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
        self.objective_func.evaluate_and_set(current_solution)
        self.logger.debug(
            "CompositeLocalSearch (VND) started with initial solution obj: %s",
            current_solution.get_objectives(),
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
                current_solution.get_objectives(),
            )

            new_solution_from_ls = current_strategy.search(current_solution)
            self.objective_func.evaluate_and_set(new_solution_from_ls)

            if self.objective_func.is_better(new_solution_from_ls, current_solution):
                self.logger.debug(
                    "  VND: Improvement found by strategy N_%d. New obj: %s",
                    vnd_level + 1,
                    new_solution_from_ls.get_objectives(),
                )
                vnd_level = 0
                current_solution = new_solution_from_ls
            else:
                vnd_level += 1

        return current_solution  # Return the local optimum found by VND
