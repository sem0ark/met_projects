"""
API connector module for CS100 PZ01,
group 2, topic 14

Completed by Arkadii Senemov, 5833
Software Engineering, year 1

Module description:
The module implements solutions to the tasks:
1. Get the commends from CLI
2. Use connector.py to get nescessary data
3. Execute commends provided by the CLI
"""

import matplotlib.pyplot as plt

from connector import ACConnector


class Grapher:
    """
    The Grapher class is in charge of plotting and showing data using matplotlib.
    The data should be in the specified structure.
    """

    def __init__(self, style='classic'):
        self.style = style

    def set_style(self, style):
        self.style = style

    def plot_values_margin(self, data):
        """
        Receives data in a form of {[date]: {max ; min ; avg}.
        Using plt, shows the plot with margins for the specific pollution / gas
        """
        date_list  = []
        max_values = []
        min_values = []
        avg_values = []

        for (date, value) in data.items():
            date_list.append(date)
            max_values.append(value["max"])
            min_values.append(value["min"])
            avg_values.append(value["avg"])

        x = range(len(date_list))

        plt.style.use(self.style)
        plt.fill_between(x, min_values, max_values, facecolor='lightgreen')
        plt.plot(x, avg_values)
        plt.ylim(0, 400)
        plt.xticks(x, date_list, rotation=45)
        plt.tight_layout()
        plt.show()

    def plot_values_average(self, data):
        """
        Plots a data in a plot graph with a legend for keys, creates a plot with a legend.
        Used for showing data about AQI (0 - 400) for the specified pollution types.
        Receives {
            "date": [list of dates],
            key1: [list of data for every date],
            key2: [list of data for every date],
            ...
        }
        """
        plt.style.use(self.style)

        x = range(len(data["date"]))
        plt.xticks(x, data["date"], rotation=45)

        for (key, value) in data.items():
            if key == "date":
                continue
            plt.plot(x, value, label=key)

        plt.ylim(0, 400)
        plt.legend(bbox_to_anchor=(0., 1.02, 1., .102), loc='lower left',
                      ncol=4, mode="expand", borderaxespad=0.)
        plt.tight_layout()
        plt.show()

    #TODO add bar chart to the Grapher
    #TODO add bar chart option to the Interpreter and cli.py


class Interpreter:
    """
    Main class in charge of interpreting and executing commands
    passed from the cli.py.
    """

    def __init__(self, city='belgrade', use_api=True):
        self._connection = ACConnector(city=city)
        self._grapher = Grapher()
        self._connection.update_weather_data(use_api=use_api)
        self.status = {
            "text": '',
            "error": None,
        }

    def get_text(self):
        """Returns the last string message from the interpreter."""
        return self.status["text"]

    def get_error(self):
        """Returns the last exception object from the interpreter."""
        return self.status["error"]

    def set_text(self, text):
        """Set the text message for the interpreter."""
        self.status["text"] = text

    def set_error(self, err):
        """Set the exception object for the interpreter."""
        self.status["error"] = err

    def execute(self, com):
        """
        Main execution function.
        Receives a commend as a string and passes it to the subroutines.
        Returns True for the successive execution of teh command,
                False otherwise.
        """
        try: # hadles any possible errors and reports as a message from the interpreter
            com = com.split()

            if com[0] == "forecast" and len(com) > 2:
                if self.exec_forecast(com[1:]):
                    return True
            elif com[0] == 'get' and len(com) > 1:
                if self.exec_get(com[1:]):
                    return True
            elif com[0] == 'set' and len(com) > 1:
                if self.exec_set(com[1:]):
                    return True
        except Exception as e:
            self.set_text("It looks like there's an error...")
            self.set_error(e)
            return False

        self.set_text(f"Bad command, don't understand get {' '.join(com)}")
        return False

    def exec_get(self, com):
        """Execution subroutine for teh branch of 'get' commands"""
        if com[0] == 'city':
            print(f"Currently selected city is: {self.com_get_city()}")
            return True

        if com[0] == 'stations':
            data = self._connection.get_stations()
            print("Currently available stations:")
            for (i, j) in data:
                print(i, j)
            return True

        if com[0] == 'pollutions':
            data = self.com_get_pollutions()
            print("Currently available data:")
            for i in data: print(i)
            return True

        self.set_text(f"Bad command, don't understand get {' '.join(com)}")
        return False

    def exec_set(self, com):
        """Execution subroutine for the branch of 'set' commands"""

        if com[0] == 'city' and len(com) == 2:
            print("Updating teh list of stations...")
            self.com_set_city(com[1])
            print("Retrieving data from the list of stations...")
            self._connection.update_weather_data(use_api=True)
            print(f"Completed! The city now is: {self.com_get_city()}")
            return True
        self.set_text(f"Bad command, don't understand set {' '.join(com)}")
        return False

    def exec_forecast(self, com):
        """Execution subroutine for the branch of 'forecast' commands"""

        if com[0] == "plot" and len(com) == 3:
            if com[1] == "all":
                if com[2] in self._connection.get_station_codes():
                    self.com_plot_average_pollutions(com[2])
                    return True

            if com[1] in self.com_get_pollutions():
                if com[2] == "avg":
                    self.com_plot_average_stations(com[1])
                    return True
                elif com[2] in self._connection.get_station_codes():
                    self.com_plot_pollution_margin(com[2], com[1])
                    return True
        self.set_text(f"Bad command, don't understand forecast {' '.join(com)}")
        return False

    def com_set_city(self, city):
        """Sets a new city for the session"""
        self._connection.set_city(city)

    def com_set_style(self, style):
        """Sets a new style of plots for the session"""
        self._grapher.set_style(style)
        #TODO Create a handling of the command for the cli.py
        #TODO Create a handling of the command for listing available styles

    def com_get_city(self):
        """Returns the current city code name for the session"""
        return self._connection.get_city()

    def com_get_stations(self):
        """Returns the list of station codes and names for the session"""
        return self._connection.get_stations()

    def com_get_pollutions(self):
        """Returns the available types of pollution for the session"""
        return self._connection.get_pollutions()

    def com_plot_average_stations(self, pollution_type):
        """
        Uses Grapher class and prints a plot for
            the pollution type throughout available list of stations
        """
        self._grapher.plot_values_average(
            self._connection.get_daily_data_stations(pollution_type))

    def com_plot_average_pollutions(self, station_code):
        """
        Uses Grapher class and prints a plot for
            data from the specified station for all available types of pollution
        """
        self._grapher.plot_values_average(
            self._connection.get_daily_data_averages(station_code))

    def com_plot_pollution_margin(self, station_code, pollution_type):
        """
        Uses Grapher class and prints a plot with margins
            for max and min values (if they are available) for
            data from the specified station and type of pollution
        """
        self._grapher.plot_values_margin(
            self._connection.get_daily_data_pollution(station_code, pollution_type))

if __name__ == "__main__":
    # con = ACConnector(city='belgrade')
    # con.update_weather_data(use_api=True)
    # stations = con.get_station_codes()

    # grapher = Grapher()
    # grapher.plot_values_average(con.get_daily_data_averages(stations[0]))
    # grapher.plot_values_margin(con.get_daily_data_pollution(stations[3], "pm25"))
    # grapher.plot_values_average(con.get_daily_data_averages(stations[3]))
    # grapher.plot_values_average(con.get_daily_data_stations("pm10"))
    pass
