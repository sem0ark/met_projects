from pathlib import Path
import sys
import numpy as np
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.core.problem import Problem
from pymoo.optimize import minimize

sys.path.insert(1, str(Path(__file__).parent.parent.absolute()))

from mokp_problem import MOKPProblem, load_mokp_problem

class MOKP(Problem):
    """
    Multi-Objective Knapsack Problem.
    
    A problem is defined by inheriting from the Problem class and
    implementing the _evaluate method.
    """
    def __init__(self, problem: MOKPProblem):
        super().__init__(
            n_var=problem.num_items,      # Number of decision variables (items)
            n_obj=problem.num_objectives, # Number of objectives (profit, weight)
            n_constr=1,                   # Number of constraints (max weight)
            xl=0.0,                       # Lower bound for each variable
            xu=1.0,                       # Upper bound for each variable
            vtype=bool,                   # Decision variables are boolean (item included or not)
        )
        self.n_items = problem.num_items
        self.max_weight = problem.capacity
        
        # Randomly generate weights and profits for the items
        self.weights = problem.weights
        self.profits = problem.profits

    def _evaluate(self, x, out, *args, **kwargs):
        """
        Evaluate a solution `x`.
        `x` is a NumPy array where each row is a solution (a vector of booleans).
        """
        # Calculate total profits and total weight for each solution in `x`
        total_profits = np.sum(x * self.profits)
        total_weight = np.sum(x * self.weights)

        # Objectives:
        # 1. Maximize total profit (minimize negative profit)
        # 2. Minimize total weight
        f1 = -total_profits[:, 0]  # Objective 1: negative of profit 1
        f2 = -total_profits[:, 1]  # Objective 2: negative of profit 2

        # Constraint: total weight must be less than or equal to max_weight
        # A positive value means the constraint is violated.
        g1 = total_weight - self.max_weight

        # Assign the objective and constraint values to the output dictionary
        out["F"] = np.column_stack([f1, f2])
        out["G"] = g1


def solve_mokp(filename: str):
    problem = MOKP(load_mokp_problem(filename))
    
    algorithm = NSGA2(
        pop_size=100,
        eliminate_duplicates=True
    )
    
    res = minimize(
        problem,
        algorithm,
        ("n_gen", 200),
        verbose=True,
    )

    return res.F
