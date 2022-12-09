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


class Cacher:
    def __init__(self, filename='cached.txt'):
        pass


class Connector:
    """Abstract class for the whole bunch of conectors to the API's"""

    URL = 'URL'
    _key = 'key'

    def req_txt(self, req_url, headers=''):
        response = requests.get(link, headers=headers)

        if response.ok:
            return response.text
        else:
            raise ValueError(
                f'Something went worng, error {response.status_code}')


    def get_data(self):
        pass

    def cache_data(self):
        pass


class ConnectorAW(Connector):
    """Connector to the AccuWeather API"""
    URL = ''

    def __init__(self):
        with open('key_aw.txt', 'r') as f:
            _key = f.read()

    def get_data(self):
        

    def cache_data(self):
        pass
