import click

# Define the common arguments that can be used globally
# This is a Click-specific pattern to avoid repeating options
def common_options(f):
    f = click.option('--verbose', '-v', is_flag=True, help='Enable verbose output.')(f)
    return f

# --- Command Implementations (Modules) ---

# The 'run' command and its subcommands
@click.group(help='Run an optimization algorithm for a given problem.')
@click.option('-p', '--problem', required=True, type=str, help='The problem type to run.')
@click.option('-t', '--max-time', required=True, help='Maximum execution time (e.g., 30s, 1h).')
@click.option('-i', '--instance', required=True, type=click.Path(exists=True), help='Path to the problem instance file.')
def run_command(problem, max_time, instance):
    """
    This function is a placeholder for the 'run' group.
    Its arguments are passed down to subcommands.
    """
    pass

# Nested 'run' subcommands for the 'mokp' problem
@run_command.group(help='Commands for the Multi-objective Knapsack Problem.')
def mokp():
    pass

@mokp.command(name='RVNS_batch_shake_1', help='Run RVNS batch shake 1.')
@click.pass_context
def mokp_rvns1(ctx):
    # 'ctx' holds the arguments from the parent commands
    args = ctx.parent.params
    click.echo(f"Running RVNS batch shake 1 on problem '{args['problem']}' from instance '{args['instance']}' for {args['max_time']}.")

@mokp.command(name='NGSA_II', help='Run NGSA II algorithm.')
@click.pass_context
def mokp_ngsa(ctx):
    args = ctx.parent.params
    click.echo(f"Running NGSA II on problem '{args['problem']}' from instance '{args['instance']}' for {args['max_time']}.")
# ... other mokp commands can be added here ...

# Nested 'run' subcommands for the 'tsp' problem
@run_command.group(help='Commands for the Traveling Salesperson Problem.')
def tsp():
    pass

@tsp.command(name='RVNS', help='Run RVNS for TSP.')
@click.pass_context
def tsp_rvns(ctx):
    args = ctx.parent.params
    click.echo(f"Running RVNS on problem '{args['problem']}' from instance '{args['instance']}' for {args['max_time']}.")
# ... other tsp commands can be added here ...


# The 'show' command
@click.group(help='Show and plot metrics.')
@click.option('-p', '--problem', required=True, help='Problem type to show metrics for.')
@click.option('-t', '--max-time', help='Filter by max time.')
@click.option('-i', '--instance', help='Path to the problem instance file.')
def show_command(problem, max_time, instance):
    """
    This function is a placeholder for the 'show' group.
    """
    pass

@show_command.command(name='plot', help='Plot the metrics.')
def show_plot():
    click.echo("Plotting metrics...")

@show_command.command(name='metrics', help='Display raw metrics.')
def show_metrics():
    click.echo("Displaying metrics...")


# --- Main CLI Entry Point ---

# Create the top-level command group
@click.group(help='A command-line tool for solving optimization problems.')
@common_options
def cli():
    """
    This is the main entry point for the CLI.
    """
    pass

# Add the 'run' and 'show' command groups to the main CLI
cli.add_command(run_command, name='run')
cli.add_command(show_command, name='show')

if __name__ == '__main__':
    cli()

# mokp = CLIProblem(lambda file_path: ...)
#         .add_run("RVNS batch shake 1", lambda problem: VNSOptimizer(VNSConfig(problem=problem)))
#         .add_run("RVNS batch shake 2", lambda problem: VNSOptimizer(VNSConfig(...)))
#         .add_run("RVNS batch shake 3", lambda problem: VNSOptimizer(VNSConfig(...)))
#         .add_run("BVNS batch shake 1", lambda problem: VNSOptimizer(VNSConfig(...)))
#         .add_run("GVNS batch shake 1", lambda problem: VNSOptimizer(VNSConfig(...)))
#         .add_run("NGSA II", lambda problem: VNSOptimizer(VNSConfig(...)))

# tsp = CLIProblem(lambda file_path: ...)
#         .add_run("RVNS", lambda problem: VNSOptimizer(VNSConfig(problem=problem)))
#         .add_run("BVNS", lambda problem: VNSOptimizer(VNSConfig(...)))
#         .add_run("GVNS", lambda problem: VNSOptimizer(VNSConfig(...)))

# cli = CLI()
#     .add_command("run", "mokp", mokp)
#     .add_command("run", "tsp", tsp)
#     .add_command("show", CLIMetrics())


# """
# main.py run --problem "mokp" --max-time 30s --instance ./mokp/2KP50-1A.json --prefixes "RVNS"
# main.py run --problem "mokp" --max-time 1h --instance ./mokp/2KP50-1A.json --prefixes "BVNS,GVNS,NGSA"
# main.py run --problem "mokp" --max-time 500s --instance ./mokp/2KP100-1B.json
# main.py run --problem "mokp" --max-time 30s --instance ./mokp/2KP50-1A.json

# main.py run -p "mokp" -t 30s -i ./mokp/2KP50-1A.json --prefixes "RVNS"
# main.py run -p "mokp" -t 1h -i ./mokp/2KP50-1A.json --prefixes "BVNS,GVNS,NGSA"
# main.py run -p "mokp" -t 500s -i ./mokp/2KP100-1B.json
# main.py run -p "mokp" -t 30s -i ./mokp/2KP50-1A.json

# main.py show --problem "mokp" --max-time 30s --instance ./mokp/2KP50-1A.json plot
# main.py show -p "mokp" -t 30s -i ./mokp/2KP50-1A.json plot

# main.py show -p "mokp" -i ./mokp/2KP50-1A.json metrics
# """

# cli.run()
