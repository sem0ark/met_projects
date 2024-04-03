## Project description
The project created as a course project-based learning task.
for CS100 Introduction to Programming course from Metropolitan University in Belgrade.
The topic of the project: Create a monitoring system for air quality in the area of one city.

## Program destription
The completed program has features such as:
1. Functioning CLI that user can use to interact with the program.
2. Retrieving the current data about air conditions for a general city (searching functionality is included).
3. Plotting data various way, so the user could analize the canges in the state of the city.
4. Printing a forecast data for some types of available polution values.

## Program structure
Main parts, to later subdivide the tasks:
1. API connector -> Created as a set of classes for every API (right now only ACConnector, that gets data from api.acqui.info)
    1. Connect to API of data service (we can use `requests` module)
    2. Request data for specified city and get the set of stations from getting the information about current air conditions
    3. Retrieve data as a JSON file (we can use built-in `json` module) and process to an object form
    5. Return data as a nested dictionary for futher processing and plotting
2. Data structuring -> integrated as a set of methods for standard data retrieving from the API connector object
    1. Get interesting for us data form parsed object
    2. Structure the data in a easy for processing way and save it in a fast data structure for data modelling. (we can use `numpy` for quick computations)
    3. Send organised data into displaying module
3. Displaying module -> as Grapher in the grapher.py
    1. Receive data from the data structure and produce graphs of needed type (Uses `matplotlib`)
    2. Receive commands from User CLI and react to them
4. CLI
    1. For quicker development it is easier to create a simple CLI with commands available for different types of representation.
    2. Show documentation and available commands to the user.

List of used libraries:
1. `matplotlib` -> for plotting and showing the information for the user
2. `requests` -> for getting data from the API
3. `json` -> parsing and saving data from the API to the object (dictionary)
3. `pickle` -> for simple serialization of the cached data
