from connector import ACConnector

"""
forecast (plot/bar) (all/no2/so2/pm10/pm25/co/o3) -> (type of the graph) (which gas to use)
    avg -> average through all stations
    [@station_code] -> information for sepcific station
        avg     -> show average for the day
        max-min -> show min and max for the day
"""

class Grapher:
    def __init__(self, style='deepocean'):
        self.style = style

    def 



"""
get
    get stations
        -> shows the list of all possible stations,
        -> their codes and locations
    get current city
        -> show current city code_name
    get info
        -> get info about current stations + city
"""
class Interpreter:
    def __init__(self):
        self._connection = ACConnector()
        self._grapher = Grapher()

    def set_city(self, city):
        self._connection.set_city(city)

    def get_city(self):
        return self._connection.
