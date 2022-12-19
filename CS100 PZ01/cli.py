"""
CLI for CS100 PZ01,
group 2, topic 14

Completed by Arkadii Senemov, 5833
Software Engineering, year 1

Description:
1. Get input in commends from the user

"""

from grapher import Interpreter

class CLI:
    def __init__(self):
        self._history = []
        self._run = True
        print("Hello, we are retrieving data from API now!")
        self._interpreter = Interpreter(city='belgrade', use_api=True)

    def main_loop(self):
        self.show_help()
        while self._run:
            com = self.get_command()
            self.execute(com)

    def execute(self, com):
        if com == "":
            return
        if com == "quit":
            self.quit()
            self._history.append(com)
            return
        if com == "help":
            self.show_help()
            self._history.append(com)
            return

        success = self._interpreter.execute(com)
        if success:
            self._history.append(com)
        else:
            if self._interpreter.get_error():
                print(f'Sorry, something went wrong while running "{com}": {self._interpreter.get_error()}')
            print(self._interpreter.get_text())

    def quit(self):
        self._run = False

    def get_command(self):
        return input(f"{str(len(self._history)).ljust(5, ' ')}> ").strip(' ')

    def get_history(self):
        print("History of the commands: ")
        for i in self._history[::-1]:
            print(i)

    def show_help(self):
        print("""
This program shows the information about the pollution in the specified city:
1. It would show the available forecast about the air conditions.
2. It would also show the available recorded data about the air conditions.
    The data is saved locally.

Possible commands:

forecast plot [pollution_type] all
    -> average through all available stations
forecast plot all [@station_code]
    -> information about averages of air quality for the specific station
forecast plot (no2/so2/pm10/pm25/o3) [@station_code]
    -> informaton about the specific gas with margins for min and max

get stations
    -> shows the list of all possible stations, their codes and locations
get city
    -> show current city code_name
get pollutions
    -> show available types of data about the air conditions

set city
    -> set another city to explore its information

help
    -> show the text with possible commands (this text).

quit
    -> close the session
""")


if __name__ == "__main__":
    cli = CLI()
    cli.main_loop()
