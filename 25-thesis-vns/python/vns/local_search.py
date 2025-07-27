import logging

from vns.abstract import Problem, ObjectiveFunction, NeighborhoodOperator, Solution, LocalSearchStrategy

class BestImprovementLocalSearch(LocalSearchStrategy):
    def __init__(self, problem: Problem, objective_func: ObjectiveFunction) -> None:
        super().__init__(problem, objective_func)
        self.logger = logging.getLogger(self.__class__.__name__)

    def search(
        self, initial_solution: Solution, neighborhood_operator: NeighborhoodOperator
    ) -> Solution:
        current: Solution = initial_solution # Start with a copy to not modify initial_solution
        self.objective_func.evaluate_and_set(current)

        visited_solutions = {current}

        while True:
            improved_in_iteration = False
            best_found_in_neighborhood = current # This will hold the best neighbor found in this iteration

            # Generating all neighbors is necessary for Best Improvement
            for neighbor in neighborhood_operator.generate_all_neighbors(current):
                self.objective_func.evaluate_and_set(neighbor)

                if self.objective_func.is_better(neighbor, best_found_in_neighborhood):
                    best_found_in_neighborhood = neighbor # Make a copy to hold the best candidate
                    improved_in_iteration = True # Mark that an improvement was found

            if improved_in_iteration: # If we found any neighbor better than 'current'
                if self.objective_func.is_better(best_found_in_neighborhood, current):
                    if best_found_in_neighborhood not in visited_solutions:
                        current = best_found_in_neighborhood
                        visited_solutions.add(current)
                        self.logger.debug(f"Best Improvement: Moved to new solution with obj {current.get_objectives()[0]:.2f}")
                    else:
                        self.logger.debug("Best Improvement: Hit previously visited solution, stopping.")
                        break # Avoid cycling on plateaus
                else:
                    self.logger.debug("Best Improvement: No strictly better overall neighbor found, stopping.")
                    break # No strict improvement over the initial `current` of this iteration
            else:
                self.logger.debug("Best Improvement: No improvement found in the neighborhood, stopping.")
                break  # No improvement at all

        return current


class FirstImprovementLocalSearch(LocalSearchStrategy):
    def __init__(self, problem: Problem, objective_func: ObjectiveFunction) -> None:
        super().__init__(problem, objective_func)
        self.logger = logging.getLogger(self.__class__.__name__)

    def search(
        self, initial_solution: Solution, neighborhood_operator: NeighborhoodOperator
    ) -> Solution:
        current: Solution = initial_solution
        self.objective_func.evaluate_and_set(current)

        visited_solutions = {current}

        while True:
            x_prime: Solution = current
            self.objective_func.evaluate_and_set(x_prime) # Ensure objectives are set on x_prime

            found_improving_neighbor = False
            for neighbor in neighborhood_operator.generate_all_neighbors(current):
                self.objective_func.evaluate_and_set(neighbor)

                if self.objective_func.is_better(neighbor, x_prime):
                    if neighbor not in visited_solutions:
                        current = neighbor # Move to the first improving neighbor
                        visited_solutions.add(current)
                        found_improving_neighbor = True
                        self.logger.debug(f"First Improvement: Moved to new solution with obj {current.get_objectives()[0]:.2f}")
                        break
                    else:
                        self.logger.debug("First Improvement: Found improving neighbor but it was already visited. Searching for another.")

            if not found_improving_neighbor:
                self.logger.debug("First Improvement: No improving neighbor found in neighborhood. Stopping.")
                break

        return current
