from vns.abstract import (
    NeighborhoodOperator,
    SearchFunction,
    Solution,
    VNSConfig,
)


def noop_local_search():
    def search(initial: Solution, _config: VNSConfig) -> Solution:
        return initial

    return search


def best_improvement_local_search(operator: NeighborhoodOperator):
    def search(initial: Solution, config: VNSConfig) -> Solution:
        current = initial
        is_better = config.acceptance_criterion.dominates

        while True:
            best_found_in_neighborhood = current

            for neighbor in operator(current, config):
                if is_better(neighbor, best_found_in_neighborhood):
                    best_found_in_neighborhood = neighbor

            if is_better(current, best_found_in_neighborhood):
                current = best_found_in_neighborhood
            else:
                break

        return current

    return search


def first_improvement_local_search(operator: NeighborhoodOperator):
    def search(initial: Solution, config: VNSConfig) -> Solution:
        current = initial
        is_better = config.acceptance_criterion.dominates

        while True:
            improvement_found = False
            
            for neighbor in operator(current, config):
                if is_better(neighbor, current):
                    current = neighbor
                    improvement_found = True
                    break
            
            if not improvement_found:
                break
        
        return current

    return search


def composite_local_search(search_functions: list[SearchFunction]):
    def search(initial: Solution, config: VNSConfig) -> Solution:
        current = initial
        is_better = config.acceptance_criterion.dominates

        vnd_level = 0
        while vnd_level < len(search_functions):
            new_solution_from_ls = search_functions[vnd_level](current, config)

            if is_better(new_solution_from_ls, current):
                vnd_level = 0
                current = new_solution_from_ls
            else:
                vnd_level += 1

        return current

    return search
