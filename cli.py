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
        self._interpreter = Interpreter()

    def main_loop(self):
        self.show_help()
        while self._run:
            com = self.get_command()
            self.execute(com)

    def execute(self, com):
        if com == "quit":
            self.quit()
            self._history.append(com)
            return
        if com == "help":
            self.show_help()
            self._history.append(com)
            return

        self._interpreter.execute(com)
        if self._interpreter.is_ok():
            self._history.append(com)
        elif self._interpreter.get_error() is None:
            if self._interpreter.text() == "Bad command":
                print(f'Bad command, didn\'t understand "{com}"')

            if self._interpreter.text() == "Bad station code":
                print(f'Bad station code, please enter a correct one')
                self._interpreter.execute("get stations")
        else:
            print(f'Sorry, something went wrong while running "{com}": {self._interpreter.get_error()}')
            print(self._interpreter.text())

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

forecast plot (no2/so2/pm10/pm25/o3) avg
    -> average through all stations
forecast plot all [@station_code]
    -> information about averages of gases for the specific station
forecast plot (no2/so2/pm10/pm25/o3) [@station_code]
    -> informaton about the specific gas with margins for min and max

get stations
    -> shows the list of all possible stations, their codes and locations
get city
    -> show current city code_name

set city
    -> set another city to explore its information

help
    -> show the text with possible commands (this text).
""")


if __name__ == "__main__":
    cli = CLI()
    cli.main_loop()
