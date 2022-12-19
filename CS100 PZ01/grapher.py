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

# forecast (plot/bar) (all/no2/so2/pm10/pm25/co/o3) -> (type of the graph) (which gas to use)
#     avg -> average through all stations
#     [@station_code] -> information for sepcific station
#         avg     -> show average for the day
#         max-min -> show min and max for the day for the specific pollution
class Grapher:
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
        Plots a data in a standard manner, creates a 
        """
        plt.style.use(self.style)

        x = range(len(data["date"]))
        plt.xticks(x, data["date"], rotation=45)

        for (key, value) in data.items():
            if key == "date":
                continue
            plt.plot(x, value, label=key)
        
        plt.ylim(0, 400)
        plt.legend(bbox_to_anchor=(-0.1, 1.05))
        plt.tight_layout()
        plt.show()



# get
#     get stations
#         -> shows the list of all possible stations,
#         -> their codes and locations
#     get current city
#         -> show current city code_name
class Interpreter:
    def __init__(self, city='belgrade', use_api=False):
        self._connection = ACConnector(city=city)
        self._grapher = Grapher()
        self._connection.update_weather_data(use_api=use_api)
        self.status = {
            "text": '',
            "error": None,
        }

    def execute(self, com):
        try:
            com = com.split()

            if com[0] == "forecast":
                if len(com) == 1:
                    return False
                elif self.parse_forecast(com[1:]):
                    return True
            elif com[0] == 'get':
                if len(com) == 1:
                    return False
                elif self.parse_get(com[1:]):
                    return True
            elif com[0] == 'set':
                if len(com) == 1:
                    return False
                elif self.parse_set(com[1:]):
                    return True
        except Exception as e:
            self.set_text("It looks like there's an error...")
            self.set_error(e)
            return False
        self.set_text(f"Bad command, don't understand get {' '.join(com)}")

        return False

    def get_text(self):
        return self.status["text"]

    def get_error(self):
        return self.status["error"]

    def set_text(self, text):
        self.status["text"] = text

    def set_error(self, e):
        self.status["error"] = e

    def parse_get(self, com):
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
            data = self._connection.get_pollutions()
            print("Currently available data:")
            for i in data: print(i)
            return True

        self.set_text(f"Bad command, don't understand get {' '.join(com)}")
        return False

    def parse_set(self, com):
        if com[0] == 'city' and len(com) == 2:
            self.com_set_city(com[1])
            return True
        self.set_text(f"Bad command, don't understand set {' '.join(com)}")
        return False

    def parse_forecast(self, com):
        if com[0] == "plot" and len(com) == 3:
            if com[1] == "all":
                if com[2] in self._connection.get_station_codes():
                    self.com_plot_average_pollutions(com[2])
                    return True

            if com[1] in ['no2','so2','pm10','pm25','o3']:
                if com[2] == "avg":
                    self.com_plot_average_stations(com[1])
                    return True
                elif com[2] in self._connection.get_station_codes():
                    self.com_plot_pollution_margin(com[2], com[1])
                    return True
        self.set_text(f"Bad command, don't understand forecast {' '.join(com)}")
        return False

    def com_set_city(self, city):
        self._connection.set_city(city)
        self._connection.update_weather_data(use_api=True)

    def com_set_style(self, style):
        self._grapher.set_style(style)

    def com_get_city(self):
        return self._connection.get_city()

    def com_get_stations(self):
        return self._connection.get_stations()

    def com_plot_average_stations(self, pollution_type):
        self._grapher.plot_values_average(
            self._connection.get_daily_data_stations(pollution_type))

    def com_plot_average_pollutions(self, station_code):
        self._grapher.plot_values_average(
            self._connection.get_daily_data_averages(station_code))

    def com_plot_pollution_margin(self, station_code, pollution_type):
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
