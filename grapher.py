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
    def __init__(self):
        self._connection = ACConnector()
        self._grapher = Grapher()
        
        self.status = {
            "ok": None,
            "text": '',
            "error": None,
        }

    def execute(self, com):
        try:
            com = com.split()

            if com[0] == "forecast":
                if len(com) == 1:
                    self.blame()
                else:
                    self.parse_forecast(com[1:])
            elif com[0] == 'get':
                if len(com) == 1:
                    self.blame()
                else:
                    self.parse_get(com[1:])
            elif com[0] == 'set':
                if len(com) == 1:
                    self.blame()
                else:
                    self.parse_set(com[1:])
        except Exception as e:
            self.error("Inner error", e)

        self.blame()

    def text(self):
        return self.status["text"]

    def is_ok(self):
        return self.status["ok"]

    def get_error(self):
        return self.status["error"]

    def good(self):
        self.status["ok"] = True
        self.status["text"] = ''
        self.status["error"] = None
        return True

    def blame(self, text="Bad command"):
        self.status["ok"] = False
        self.status["text"] = text
        self.status["error"] = None
        return False

    def error(self, text, e):
        self.status["ok"] = False
        self.status["text"] = text
        self.status["error"] = e
        return False

    def parse_get(self, com):
        if com[0] == 'city':
            print(f"Currently selected city is: {self.com_get_city()}")
            return self.good()
        elif com[0] == 'stations':
            data = self._connection.get_stations()
            print("Currently available stations:")
            for (i, j) in data:
                print(i, j)
            return self.good()
        else:
            return self.blame()

    def parse_set(self, com):
        if com[0] == 'city':
            if len(com) != 2:
                return self.blame()
            self.com_set_city(com[1])
            return self.good()

    def parse_forecast(self, com):
        if com[0] == "plot":
            if len(com) != 3:
                self.blame()
            elif com[1] == "all":
                if com[2] in self.com_get_stations():
                    self.com_plot_average_pollutions(com[2])
                    return self.good()
                else:
                    return self.blame("Bad station code")
            elif com[2] in ['no2','so2','pm10','pm25','o3']:
                if com[3] == "avg":
                    self.com_plot_average_stations(com[2])
                    return self.good()
                elif com[3] in self.com_get_stations():
                    self.com_plot_pollution_margin(com[2], com[3])

            self.blame()


    def com_set_city(self, city):
        self._connection.set_city(city)

    def com_get_city(self):
        return self._connection.get_city()

    def com_get_stations(self):
        return self._connection.get_stations()

    def com_plot_average_stations(self, pollution_type):
        grapher.plot_values_average(
            con.get_daily_data_stations(pollution_type))

    def com_plot_average_pollutions(self, station_code):
        grapher.plot_values_average(
            con.get_daily_data_averages(station_code))

    def com_plot_pollution_margin(self, station_code, pollution_type):
        grapher.plot_values_margin(
            con.get_daily_data_pollution(station_code, pollution_type))

if __name__ == "__main__":
    con = ACConnector()
    con.update_weather_data(use_api=False)
    stations = con.get_station_codes()

    grapher = Grapher()
    # grapher.plot_values_average(con.get_daily_data_averages(stations[0]))
    # grapher.plot_values_margin(con.get_daily_data_pollution(stations[3], "pm25"))
    # grapher.plot_values_average(con.get_daily_data_averages(stations[3]))
    # grapher.plot_values_average(con.get_daily_data_stations("pm10"))
