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
        f'Something went worng, error {response.status_code}')


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

    def __init__(self, city=None):
        """
        Initialisation of the class,
        it is thought that there would be only one instance used.
        If the city is not specified we use defaul info about belgrade and its stations.
        """
        self._code = 'acqui'
        self._key = get_keys()[self._code]
        self._pollutions = ['o3', 'no2', 'so2', 'pm10', 'pm25']
        # a list of gases/pollutions provided by the API
        self._data = {}

        if city is None:
            self._locations = [
                '@8574','@8094','@9261','@12893','@10556',
                '@8575','@8093','@8761','@8816','@8766'
            ]

            self._location_names = [''] * 12
            self._city = 'belgrade'
            self._file = self._code + '_' + self._city + '.txt'
            self.m_url = 'https://api.waqi.info'
        else:
            self._locations = []
            self._location_names = []
            self._city = city
            self._file = self._code + '_' + self._city + '.txt'
            self.m_url = 'https://api.waqi.info'

            self.update_location_data(self._city)

####### Setters ################################################################
    def set_city(self, city):
        self.update_location_data(city)
        self._city = city

####### Getters ################################################################

    def get_city(self):
        return self._city

    def get_station_codes(self):
        return self._locations.copy()

    def get_station_names(self):
        return self._location_names.copy()

    def get_stations(self):
        return list(zip(
            self.get_station_codes(),
            self.get_station_names()
        ))

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

        for loc in self._locations:
            try:
                station_data = self.get_data_station(loc)
            except ValueError:
                print("Couldn't get information from " + loc)
                continue

            for k, days in station_data["data"]["forecast"]["daily"].items():
                for day in days:
                    date = day["day"]

                    if "day" not in self._data:
                        self._data["day"] = {}
                    if date  not in self._data["day"]:
                        self._data["day"][date] = {}
                    if loc not in self._data["day"][date]:
                        self._data["day"][date][loc] = {}

                    self._data["day"][date][loc][k] = {
                        "avg": day["avg"],
                        "max": day["max"],
                        "min": day["min"],
                    }

            for k in self._pollutions:
                if k not in station_data["data"]["forecast"]["daily"] and \
                        k in station_data["data"]["iaqi"]:
                    date = station_data["data"]["time"]["iso"].split('T')[0]

                    self._data["day"][date][loc][k] = {
                        "avg": station_data["data"]["iaqi"][k]["v"],
                        "max": station_data["data"]["iaqi"][k]["v"],
                        "min": station_data["data"]["iaqi"][k]["v"]
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

        for date in sorted(self._data["day"]):
            if station_code not in self._data["day"][date]:
                continue

            result_data[date] = self._data["day"][date][station_code][pollution_code].copy()
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

        for date in sorted(self._data["day"]):
            if station_code not in self._data["day"][date]:
                continue
            result_data["date"].append(date)
            for pollution_code in self._pollutions:
                if pollution_code not in result_data:
                    result_data[pollution_code] = []
                if pollution_code not in self._data["day"][date][station_code]:
                    result_data[pollution_code].append(0)
                else:
                    result_data[pollution_code].append(
                        self._data["day"][date][station_code][pollution_code]["avg"])

        return result_data

    def get_daily_data_stations(self, pollution_code):
        """
        Result structure:
        - date
        - [station code] -> array of averages
        """
        result_data = {}

        dates = list(sorted(set(self._data["day"].keys())))

        for station_code in self.get_station_codes():
            for date in dates:
                if station_code not in result_data:
                    result_data[station_code] = []
                if station_code not in self._data["day"][date]:
                    result_data[station_code].append(0)
                elif pollution_code not in self._data["day"][date][station_code]:
                    result_data[station_code].append(0)
                else:
                    result_data[station_code].append(
                        self._data["day"][date][station_code][pollution_code]["avg"])

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
            self._locations = ['@' + str(i["uid"]) for i in data["data"]]
            self._location_names = [i["station"]["name"] for i in data["data"]]
        else:
            raise ValueError('Can\'t find information about this city')

    def get_data_station(self, station_code):
        """
        Gets current data from the API by calling the API get current conditions.
        Uses location code of the station.
        """
        data = req_json(self.m_url + f"/feed/{station_code}/?token={self._key}")
        return data

    def retrieve_data(self):
        try:
            stream_file = open(self._file, 'rb')
            self._data = pickle.load(stream_file)
            stream_file.close()
        except FileNotFoundError:
            print('Data file wasn\'t found')

    def record_data(self):
        file_stream = open(self._file, 'wb')
        pickle.dump(self._data, file_stream)
        file_stream.close()


if __name__ == "__main__":
    con = ACConnector()
    con.update_weather_data(use_api=False)
    stations = con.get_station_codes()
    print(stations)
    # print(con._data["day"]['2022-12-18'][stations[0]])
    print(con.get_daily_data_pollution(stations[0], "o3"))
