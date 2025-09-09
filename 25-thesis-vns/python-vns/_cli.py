import re
from typing import Callable, Self
import click


def parse_time_string(time_str: str) -> float:
    """Parses a time string like '5s', '2m', '1h' into seconds."""
    if not time_str:
        return float("inf")

    match = re.match(r"(\d+)([smh])", time_str)
    if not match:
        raise ValueError(
            "Invalid time format. Use digits followed by 's' (seconds), 'm' (minutes), or 'h' (hours). "
            "Example: '30s', '5m', '1h'."
        )
    value = int(match.group(1))
    unit = match.group(2)

    if unit == "s":
        return float(value)
    elif unit == "m":
        return float(value * 60)
    elif unit == "h":
        return float(value * 3600)
    return float("inf")


class CLI:
    def __init__(self) -> None:
        self.runners: dict[str, list[tuple[str, Callable[[str, float], None]]]] = {}

    def register_runner(self, name: str, configs: list[tuple[str, Callable[[str, float], None]]]) -> Self:
        self.runners[name] = configs
        return self

    def run(self) -> None:
        @click.group(help='CLI for optimization problems.')
        def cli():
            pass

        @click.group(help='Show and plot metrics.')
        @click.option('-t', '--max-time', help='Filter by max time.')
        @click.option('-i', '--instance', help='Path to the problem instance file.')
        def show_command(max_time, instance):
            pass

        @show_command.command(name='plot', help='Plot the metrics.')
        def show_plot():
            click.echo("Plotting metrics...")


        @show_command.command(name='metrics', help='Display raw metrics.')
        def show_metrics():
            click.echo("Displaying metrics...")

        cli.add_command(show_command, name='show')


        @click.group(help='Run an optimization algorithm for a given problem.')
        @click.option('-t', '--max-time', required=True, help='Maximum execution time (e.g., 30s, 1h).')
        @click.option('-i', '--instance', required=True, type=click.Path(exists=True), help='Path to the problem instance file.')
        def run_command(max_time, instance):
            pass

        for problem_name, configs in self.runners.items():
            @run_command.group(name=problem_name, help='Commands for the Multi-objective Knapsack Problem.')
            def problem_runner():
                pass

            for config_name, runner in configs:
                @problem_runner.command(name=config_name.replace(" ", "_"), help=f'Run {config_name}.')
                @click.pass_context
                def run_instance(ctx):
                    args = ctx.parent.parent.params
                    click.echo(f"Running {config_name} on problem '{problem_name}' from instance '{args['instance']}' for {args['max_time']}.")
                    run_time_seconds = parse_time_string(args['max_time'])
                    runner(args['instance'], run_time_seconds)

            @problem_runner.command(name='all', help="Run all configs, optionally filtered.")
            @click.option(
                '-f',
                '--filter-configs',
                help='A comma-separated list of config names or substrings to match.',
                default=None,
            )
            @click.pass_context
            def run_all(ctx, filter_configs):
                args = ctx.parent.parent.params
                run_time_seconds = parse_time_string(args['max_time'])
                instance = args['instance']

                filters = [f.strip().lower() for f in filter_configs.split(',')] if filter_configs else []
                configs_filtered = {
                    config_name: runner
                    for config_name, runner in configs
                    if any(fliter_name in config_name.lower() for fliter_name in filters)
                }

                if not configs_filtered:
                    raise click.UsageError(f"Failed to match any runner with filters: {filters}")

                click.echo(f"Running configs for problem: {problem_name}")
                for config_name, runner in configs_filtered.items():
                    click.echo(f"Running {config_name} on problem '{problem_name}' from instance '{instance}' for {run_time_seconds} seconds.")
                    try:
                        runner(instance, run_time_seconds)
                    except Exception as e:
                        click.echo(f"Error running '{config_name}': {e}", err=True)

        cli.add_command(run_command, name='run')
        cli()
