import matplotlib.pyplot as plt

from connector import ACConnector

"""
forecast (plot/bar) (all/no2/so2/pm10/pm25/co/o3) -> (type of the graph) (which gas to use)
    avg -> average through all stations
    [@station_code] -> information for sepcific station
        avg     -> show average for the day
        max-min -> show min and max for the day
"""

class Grapher:
    def __init__(self, style='classic'):
        self.style = style

    def plot_values_margin(self, data):
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
        plt.style.use(self.style)

        x = range(len(data["date"]))
        plt.xticks(x, data["date"], rotation=45)

        for (key, value) in data.items():
            if key == "date":
                continue
            plt.plot(x, value, label=key)

        plt.legend(bbox_to_anchor=(1.5, 1.05))
        plt.tight_layout()
        plt.show()


"""
get
    get stations
        -> shows the list of all possible stations,
        -> their codes and locations
    get current city
        -> show current city code_name
"""
class Interpreter:
    def __init__(self):
        self._connection = ACConnector()
        self._grapher = Grapher()

    def set_city(self, city):
        self._connection.set_city(city)

    def get_city(self):
        return self._connection.get_city()

    def get_stations(self):
        return self._connection.get_stations()

    def forecast_plot(self, pollution_type):
        pass

if __name__ == "__main__":
    con = ACConnector()
    con.update_weather_data(use_api=False)
    stations = con.get_station_codes()

    grapher = Grapher()
    # grapher.plot_values_margin(con.get_daily_data_averages(stations[0]))
    # grapher.plot_values_average(con.get_daily_data_averages(stations[3]))
    # grapher.plot_values_average(con.get_daily_data_stations("no2"))
