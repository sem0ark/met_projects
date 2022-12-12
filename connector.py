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


Possible sites to connect to:
https://www.accuweather.com/en/rs/belgrade/298198/air-quality-index/298198
https://aqicn.org/map/serbia/
https://www.iqair.com/serbia

https://waqi.info/#/c/7.512/8.866/2.8z
https://airly.org/map/en/
https://gispub.epa.gov/airnow/?showgreencontours=false
https://www.breezometer.com/air-quality-map/
https://map.purpleair.com/1/mAQI/a10/p604800/cC0#11/44.8046/20.4637
https://app.cpcbccr.com/AQI_India/
https://gispub.epa.gov/airnow/?showgreencontours=false&xmin=2124944.1404892257&xmax=2417850.8328778795&ymin=5458109.406784477&ymax=5713409.081256842
https://spokanecleanair.org/air-quality/current-air-quality/
https://www.aqi.in/
"""

import requests

import json


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
    keys = {}
    txt = ''
    with open(filename, 'r', encoding='utf8') as f:
        txt = f.read().split('\n')
        for i in txt:
            (k, v) = i.split()
            keys[k] = v
    return keys

class AWConnector:
    def __init__(self):
        self._code = 'accuweather'
        self._key = get_keys()[self._code]
        self._location = 'Location'
        self.m_url = 'http://dataservice.accuweather.com'

    def set_location_find(self, text):
        data = req_json(self.m_url + f"/locations/v1/cities/autocomplete?apikey={self._key}&q={text}", headers={
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        })
        self._location = data[0]['Key']

    def get_data(self):
        data = req_json(self.m_url + f"/currentconditions/v1/{self._location}/historical/24?apikey={self._key}&details=true", headers={
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        })
        return data

class ACConnector:
    def __init__(self, city=None):
        self._code = 'acqui'
        self._key = get_keys()[self._code]
        if city is None:
            self._location = ['@8574', '@8094', '@9261', '@12893', '@10556', '@8575', '@8093', '@8761', '@8816', '@8766']
            self._city = 'belgrade'
            self._file = self._code + '_' + self._city + '.txt'
            self.m_url = 'https://api.waqi.info'
        else:
            self._location = 'Location'
            self._city = city
            self._file = self._code + '_' + self._city + '.txt'
            self.m_url = 'https://api.waqi.info'

            self.set_location_find()

    def set_location_find(self):
        data = req_json(f'https://api.waqi.info/search/?token={self._key}&keyword={self._city}', headers={
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        })
        if len(data) != 0:
            self._location = ['@' + str(i["uid"]) for i in data["data"]]
        else:
            raise ValueError('Can\'t find information about this city')

    def get_data_current(self):
        data = req_json(self.m_url + f"/feed/{self._location[0]}/?token={self._key}")
        return {
            "iaqi": data["data"]["iaqi"],
            "time": data["data"]["time"],
        }

    def record_data(self, data):
        data_txt = []
        try:
            with open(self._file, 'r', encoding='utf8') as f:
                data_txt = f.readlines()

            if json.loads(data_txt[-1])['time']['s'] != data['time']['s']:
                data_txt.append(json.dumps(data))
        except FileNotFoundError:
            data_txt.append(json.dumps(data))

        with open(self._file, 'w', encoding='utf8') as f:
            f.write('\n'.join(data_txt))

    def update_data(self):
        data_cur = self.get_data_current()
        self.record_data(data_cur)

    def structure_data(self, data):
        d_v = {
            "co": [],
            "so2" : [],
            "no2" : [],
            "pm10" : [],
            "pm25" : [],
            "o3" : [],
        }
        for metric in data:
            for (k, v) in d_v.items():
                if k in metric["iaqi"]:
                    v.append((metric["iaqi"], metric["time"]["s"]))
        return d_v

    def get_data(self):
        data_txt = ''

        # self.update_data()

        with open(self._file, 'r', encoding='utf8') as f:
            data_txt = f.readlines()

        values = [json.loads(i) for i in data_txt]

        return values


if __name__ == "__main__":
    con2 = ACConnector()
    print(con2._location)
    for i in con2.get_data():
        print(i)
