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
        print(response.text)
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

# class AWConnector:
#     def __init__(self):
#         self._code = 'accuweather'
#         self._key = get_keys()[self._code]
#         self._locations = 'Location'
#         self.m_url = 'http://dataservice.accuweather.com'

#     def set_location_find(self, text):
#         data = req_json(self.m_url + f"/locations/v1/cities/autocomplete?apikey={self._key}&q={text}", headers={
#             'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
#         })
#         self._locations = data[0]['Key']

#     def get_data(self):
#         data = req_json(self.m_url + f"/currentconditions/v1/{self._locations}/historical/24?apikey={self._key}&details=true", headers={
#             'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
#         })
#         return data


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

        if city is None:
            self._locations = ['@8574', '@8094', '@9261', '@12893', '@10556', '@8575', '@8093', '@8761', '@8816', '@8766']
            self._locations_name = [''] * 12
            self._city = 'belgrade'
            self._file = self._code + '_' + self._city + '.txt'
            self.m_url = 'https://api.waqi.info'
        else:
            self._locations = []
            self._locations_name = []
            self._city = city
            self._file = self._code + '_' + self._city + '.txt'
            self.m_url = 'https://api.waqi.info'

            self.set_location_find()

    def set_location_find(self):
        """
        The mothod is searhing possible stations that correspond to the keyword
        entered by the user to get data from the API list of possible stations.

        Uses user-agend in case of bot detection.
        """

        data = req_json(
            f'https://api.waqi.info/search/?token={self._key}&keyword={self._city}',
            headers={
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        })
        if len(data) != 0:
            self._locations = ['@' + str(i["uid"]) for i in data["data"]]
            self._locations_name = [i["station"]["name"] for i in data["data"]]
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

    def record_data(self, data):
        """
        Reads the cache file and checks if the data being recorded already in the file,
        writes the data down if it is not found already. Checked by the time of recording.
        """

        data_txt = []
        try:
            with open(self._file, 'r', encoding='utf8') as f:
                data_txt += [i.strip('\n') for i in f.readlines()]

            if json.loads(data_txt[-1])['time']['s'] != data['time']['s']:
                data_txt.append(json.dumps(data))
        except FileNotFoundError:
            data_txt.append(json.dumps(data))

        with open(self._file, 'w', encoding='utf8') as f:
            f.write('\n'.join(data_txt))

    def update_data(self):
        """
        High level method to get current conditions from the API and write it to the file.
        """
        data_cur = self.get_data_current_arr()
        self.record_data(data_cur)


if __name__ == "__main__":
    con2 = ACConnector(city='belgrade')
    for i in con2.get_data():
        print(i)
