"""
Main file for CS100 PZ01 application,
group 2, topic 14

Completed by Arkadii Senemov, 5833
Software Engineering, year 1

Program description:
1. Functioning CLI that user can use to interact with the program.
2. Retrieving the current data about air conditions for a general city
    (searching functionality is included).
3. Plotting data various way, so the user could analyze the changes
    in the state of the city.
4. Printing a forecast data for some types of available pollution values.
"""

from cli import CLI

if __name__ == "__main__":
    cli = CLI()
    cli.main_loop()
