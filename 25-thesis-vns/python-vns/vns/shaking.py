from vns.abstract import NeighborhoodOperator, ShakingStrategy, Solution


class SimpleShaking(ShakingStrategy):
    def shake(
        self, solution: Solution, neighborhood_operator: NeighborhoodOperator
    ) -> Solution:
        # Just apply the given neighborhood operator once to generate a shaken solution
        return neighborhood_operator.generate_neighbor(solution)
