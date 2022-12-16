"""
CLI for CS100 PZ01,
group 2, topic 14

Completed by Arkadii Senemov, 5833
Software Engineering, year 1

Description:
1. Get input in commends from the user

"""

class CLI:
    def __init__(self):
        self._history = []
        self._run = True

    def main_loop(self):
        self.get_help()
        while self._run:
            com = self.get_command()
            if self.execute(com):
                self._history.append(com)
            else:
                print(f'Bad command, didn\'t understand "{com}"')

    def execute(self, com):
        com = com.split()

    def get_command(self):
        return input(f"{str(len(self._history)).ljust(5, ' ')}> ").strip(' ')

    def get_help(self):
        print('It is an introducton.')
        print("""
This program shows the information about the pollution in the specified city.

Possible commands:

forecast (plot/bar) (all/no2/so2/pm10/pm25/co/o3) -> (type of the graph) (which gas to use)
    avg -> average through all stations
    [@station_code] -> information for sepcific station
        avg     -> show average for the day
        max-min -> show min and max for the day
get
    get stations
        -> shows the list of all possible stations,
        -> their codes and locations
    get current city
        -> show current city code_name
    get info
        -> get info about current stations + city
help -> show the text with possible commands (this text)
""")


if __name__ == "__main__":
    cli = CLI()
    cli.main_loop()
