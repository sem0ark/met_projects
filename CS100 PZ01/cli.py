"""
CLI for CS100 PZ01,
group 2, topic 14

Completed by Arkadii Senemov, 5833
Software Engineering, year 1

Description:
1. Get input in commends from the user
2. 
"""

from grapher import Interpreter

class CLI:
    def __init__(self, start_city='belgrade', use_api=True):
        self._history = []
        self._run = True
        print("Hello, we are retrieving data from API now!")
        self._interpreter = Interpreter(city=start_city, use_api=True)

    def main_loop(self):
        """The main loop of the program"""
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
        if com.split(' ')[0] == "help":
            self.parse_help(com.split(' ')[1:])
            self._history.append(com)
            return

        if com == "history":
            self.get_history()
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
        return input(f"{str(len(self._history) + 1).ljust(5, ' ')}> ").strip(' ')

    def get_history(self):
        print("History of the commands: ")
        for i in self._history[::-1]:
            print(i)

    def parse_help(self, com):
        if len(com) == 0:
            self.show_help()
            return True
        if len(com) == 1:
            poll_name = com[0]

            if poll_name == "pm10":
                print("""
Particulate matter (PM) includes microscopic matter suspended in air or water.
Airborne particles are called aerosols.
PM10 includes particles less than 10 µm in diameter.""")
            elif poll_name == "pm25":
                print("""
Particulate matter (PM) includes microscopic matter suspended in air or water.
Airborne particles are called aerosols.
PM2.5 includes particles less than 2.5 µm in diameter.""")
            elif poll_name == "no2":
                print("""
Nitrogen dioxide is a chemical compound with the formula NO2. 
It is one of several nitrogen oxides. NO ₂ is an intermediate in
the industrial synthesis of nitric acid, millions of tons of which are
produced each year for use primarily in the production of fertilizers.
At higher temperatures it is a reddish-brown gas.
""")
            elif poll_name == "so2":
                print("""
Sulfur dioxide or sulphur dioxide is the chemical compound with the formula SO2.
It is a toxic gas responsible for the odor of burnt matches.
It is released naturally by volcanic activity and is produced as a by-product of
copper extraction and the burning of sulfur-bearing fossil fuels.""")
            elif poll_name == "o3":
                print("""
Ozone is an odorless, colorless gas made up of three oxygen molecules (O3)
and is a natural part of the environment.
It occurs both in the Earth's upper atmosphere, or stratosphere,
and at ground level in the lower atmosphere, or troposphere.
""")
            else:
                print("Bad code for help")
                return False
        else:
            print("Bad command for help")
            return False

    def show_help(self):
        """Prints the general  help"""
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
    -> information about the specific gas with margins for min and max

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

history
    -> show the list of executed commands in the session

quit
    -> close the session
""")
        return True


if __name__ == "__main__":
    cli = CLI()
    cli.main_loop()
