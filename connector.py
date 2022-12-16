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
    txt = ''
    with open(filename, 'r', encoding='utf8') as f:
        txt = f.read().split('\n')
        for i in txt:
            (k, v) = i.split()
            keys[k] = v
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
        self._data = []

        if city is None:
            self._locations = [
                '@8574',
                '@8094',
                '@9261',
                '@12893',
                '@10556',
                '@8575',
                '@8093',
                '@8761',
                '@8816',
                '@8766'
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

            self.set_location_find(self._city)

    def set_city(self, city):
        self.set_location_find(city)
        self._city = city

    def get_city(self):
        return self._city

    def get_stations(self):
        return (self._locations[:], self._location_names[:])

    def set_location_find(self, city):
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

    def get_data_current(self, station_code):
        """
        Gets current data from the API by calling the API get current conditions.
        Uses location code of the station.
        """
        data = req_json(
            self.m_url + f"/feed/{station_code}/?token={self._key}",
            headers={
            'user-agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        })

        return {
            "station_code": data["data"]["idx"],
            "time": data["data"]["time"]["iso"],
            "iaqi": data["data"]["iaqi"],
            "forecast": data["data"]["forecast"]["daily"],
        }


    def get_data_current_arr(self):
        """
        Gets current data from the API by calling the API get current conditions
        for the current hour.
        """

        result_data = []

        for loc in self._locations:
            try:
                data_station = self.get_data_current(loc)
                result_data.append(data_station)
            except ValueError:
                print("Couldn't get information from " + loc)
        
        return result_data

if __name__ == "__main__":
    con2 = ACConnector()
    for i in con2.get_data_current_arr():
        print(i["station_code"])
