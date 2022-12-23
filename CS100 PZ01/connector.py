"""
API connector module for CS100 PZ01,
group 2, topic 14

Completed by Arkadii Senemov, 5833
Software Engineering, year 1

Module description:
The module implements solutions to the tasks:
1. Get keys to API's
2. Connect to the public API's
3. Query information from the API
4. Process JSON data and return as object
"""

import json
import pickle
import requests


def req_json(req_url, headers=''):
    """
    General method for getting JSON data from specified url and headers
    """
    response = requests.get(req_url, headers=headers, timeout=1000)

    if response.ok:
        return json.loads(response.text)

    raise ValueError(
        f'Something went worng, error code {response.status_code}')


def get_keys(filename='keys.txt'):
    """
    Reads the local file for keys for the APIs to later connect to them.
    Returns a dictionary with:
    - keys -> API keywords,
    - values -> API keys.
    """

    keys = {}
    with open(filename, 'r', encoding='utf8') as stream:
        for line in stream.read().split('\n'):
            (code, key_value) = line.split()
            keys[code] = key_value
    return keys


class ACConnector:
    """
    Connector class for the API by https://aqicn.org/
    """
    POLLUTIONS = ['o3', 'no2', 'so2', 'pm10', 'pm25']
    DATA = {}


    CODE = 'acqui'
    FILE = CODE + '.bin'
    URL = 'https://api.waqi.info'

    def __init__(self, city=None):
        """
        Initialisation of the class,
        it is thought that there would be only one instance used.
        If the city is not specified we use defaul info about belgrade and its stations.
        """
        self._key = get_keys()[self.__class__.CODE]
        # a list of gases/pollutions provided by the API

        if city == 'belgrade':
            self._station_codes = [
                '@12893',
                '@8094',
                '@10556',
                '@8574',
                '@9261',
                '@8093',
                '@8575',
                '@8761',
                '@8816',
                '@8766',
            ]

            self._station_names = [
                'Beograd Vračar, Serbia',
                'Zeleno Brdo, Beograd, Serbia',
                'Beograd Stari grad, Serbia',
                'Stari Grad, Beograd, Serbia',
                'Beograd Oml. brigada, Serbia',
                'Mostar, Beograd, Serbia',
                'Novi Beograd, Beograd, Serbia',
                'Beograd Des. Stefana, Serbia',
                'Beograd Panč most, Serbia',
                'Beograd Pančevački most, Serbia',
            ]
            self._city = 'belgrade'
        else:
            self._station_codes = []
            self._station_names = []
            self._city = city
            self.__class__.URL = 'https://api.waqi.info'

            self.update_location_data(self._city)

####### Setters ################################################################
    def set_city(self, city):
        """
        Sets a new city and updates the list of available stations.
        The list would be empty if the city name is incorrect.
        """
        self.update_location_data(city)
        self._city = city

####### Getters ################################################################
    def get_city(self):
        """
        Returns a code name of the city being examined.
        """
        return self._city

    def get_station_codes(self):
        """Returns a list of station code"""
        return self._station_codes.copy()

    def get_station_names(self):
        """Returns a list of station names"""
        return self._station_names.copy()

    def get_stations(self):
        """Returns a list of (station code, station name)"""
        return list(zip(
            self.get_station_codes(),
            self.get_station_names()
        ))

    def get_pollutions(self):
        """Returns a list of available pollution values"""
        return self.__class__.POLLUTIONS

    def update_weather_data(self, use_api=True):
        """
        Gets current data from the API by calling the API get current conditions
        for the current daily forecast.

        data structure:
        - day
            - [date]
                - [station code]
                    - [pollution type]
                        - avg
                        - min
                        - max
        """

        self.retrieve_data()

        if not use_api:
            return

        for loc in self._station_codes:
            try:
                station_data = self.get_data_station(loc)
            except ValueError:
                print("Couldn't get information from " + loc)
                continue

            for k, days in station_data["data"]["forecast"]["daily"].items():
                for day in days:
                    date = day["day"]

                    if "day" not in self.__class__.DATA:
                        self.__class__.DATA["day"] = {}
                    if date  not in self.__class__.DATA["day"]:
                        self.__class__.DATA["day"][date] = {}
                    if loc not in self.__class__.DATA["day"][date]:
                        self.__class__.DATA["day"][date][loc] = {}

                    #FIXME Add updating information about the averages
                    # Add additional branching:
                    # if the data in the date is already exists
                    #    if reads_number doesn't exist
                    #       create reads_number = 1
                    #    update avg (avg * reads_number + cur avg) / (reads_number + 1)
                    #    update max
                    #    update min
                    #    reads_number += 1
                    # else
                    #   write data
                    #   create reads_number = 1
                    if k in self.__class__.DATA["day"][date][loc]:
                        if "reads" not in self.__class__.DATA["day"][date][loc][k]:
                            self.__class__.DATA["day"][date][loc][k]["reads"] = 1

                        reads = self.__class__.DATA["day"][date][loc][k]["reads"]

                        self.__class__.DATA["day"][date][loc][k] = {
                            "avg": (day["avg"] * reads +
                                    self.__class__.DATA["day"][date][loc][k]["avg"]) / (reads + 1),
                            "max": max(day["max"],
                                    self.__class__.DATA["day"][date][loc][k]["max"]),
                            "min": min(day["min"],
                                    self.__class__.DATA["day"][date][loc][k]["min"]),
                            "reads": reads + 1,
                        }
                    else:
                        self.__class__.DATA["day"][date][loc][k] = {
                            "avg": day["avg"],
                            "max": day["max"],
                            "min": day["min"],
                            "reads": 1,
                        }

            for k in self.__class__.POLLUTIONS:
                if k not in station_data["data"]["forecast"]["daily"] and \
                        k in station_data["data"]["iaqi"]:
                    date = station_data["data"]["time"]["iso"].split('T')[0]
                    value = station_data["data"]["iaqi"][k]["v"]

                    if loc not in self.__class__.DATA["day"][date]:
                        self.__class__.DATA["day"][date][loc] = {}

                    if k in self.__class__.DATA["day"][date][loc]:
                        if "reads" not in self.__class__.DATA["day"][date][loc][k]:
                            self.__class__.DATA["day"][date][loc][k]["reads"] = 1
                        reads = self.__class__.DATA["day"][date][loc][k]["reads"]

                        self.__class__.DATA["day"][date][loc][k] = {
                            "avg": (value * reads +
                                    self.__class__.DATA["day"][date][loc][k]["avg"]) / (reads + 1),
                            "max": max(value,
                                    self.__class__.DATA["day"][date][loc][k]["max"]),
                            "min": min(value,
                                    self.__class__.DATA["day"][date][loc][k]["min"]),
                            "reads": reads + 1,
                        }
                    else:
                        self.__class__.DATA["day"][date][loc][k] = {
                            "avg": value,
                            "max": value,
                            "min": value,
                            "reads": 1,
                        }
        self.record_data()

##### Structuring ##############################################################
    def get_daily_data_pollution(self, station_code, pollution_code):
        """
        Result structure:
        - date
            - avg
            - max
            - min
        """
        result_data = {}

        for date in sorted(self.__class__.DATA["day"]):
            if station_code not in self.__class__.DATA["day"][date]:
                continue
            if pollution_code not in self.__class__.DATA["day"][date][station_code]:
                result_data[date] = {
                    "avg": 0,
                    "max": 0,
                    "min": 0,
                }
            else:
                result_data[date] = \
                    self.__class__.DATA["day"][date][station_code][pollution_code].copy()
        return result_data

    def get_daily_data_averages(self, station_code):
        """
        Result structure:
        - date
        - [pollution code] -> array of averages
        """
        result_data = {
            "date": []
        }

        for date in sorted(self.__class__.DATA["day"]):
            if station_code not in self.__class__.DATA["day"][date]:
                continue
            result_data["date"].append(date)
            for pollution_code in self.__class__.POLLUTIONS:
                if pollution_code not in result_data:
                    result_data[pollution_code] = []
                if pollution_code not in self.__class__.DATA["day"][date][station_code]:
                    result_data[pollution_code].append(0)
                else:
                    result_data[pollution_code].append(
                        self.__class__.DATA["day"][date][station_code][pollution_code]["avg"])

        return result_data

    def get_daily_data_stations(self, pollution_code):
        """
        Result structure:
        - date
        - [station code] -> array of averages
        """
        result_data = {}

        dates = list(sorted(set(self.__class__.DATA["day"].keys())))

        for station_code in self.get_station_codes():
            for date in dates:
                if station_code not in result_data:
                    result_data[station_code] = []
                if station_code not in self.__class__.DATA["day"][date]:
                    result_data[station_code].append(0)
                elif pollution_code not in self.__class__.DATA["day"][date][station_code]:
                    result_data[station_code].append(0)
                else:
                    result_data[station_code].append(
                        self.__class__.DATA["day"][date][station_code][pollution_code]["avg"])

        result_data["date"] = dates

        return result_data


#####   Private   ##############################################################
    def update_location_data(self, city):
        """
        The mothod is searhing possible stations that correspond to the keyword
        entered by the user to get data from the API list of possible stations.
        Uses user-agend in case of bot detection.
        """
        data = req_json(
            f'https://api.waqi.info/search/?token={self._key}&keyword={city}',
            headers={
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        })
        if len(data) != 0:
            self._station_codes = ['@' + str(i["uid"]) for i in data["data"]]
            self._station_names = [i["station"]["name"] for i in data["data"]]
        else:
            self._station_codes = []
            self._station_names = []

    def get_data_station(self, station_code):
        """
        Gets current data from the API by calling the API get current conditions.
        Uses location code of the station.
        """
        data = req_json(self.__class__.URL + f"/feed/{station_code}/?token={self._key}")
        return data

    def retrieve_data(self):
        """Reads binary data from the file"""
        try:
            with open(self.__class__.FILE, 'rb') as stream_file:
                self.__class__.DATA = pickle.load(stream_file)
        except FileNotFoundError:
            print('Data file wasn\'t found')

    def record_data(self):
        with open(self.__class__.FILE, 'wb') as stream_file:
            pickle.dump(self.__class__.DATA, stream_file)

if __name__ == "__main__":
    con = ACConnector()
    con.update_weather_data(use_api=True)
    stations = con.get_station_codes()
    print(stations)
    # print(con._data["day"]['2022-12-18'][stations[0]])
    print(con.get_daily_data_pollution(stations[0], "o3"))
