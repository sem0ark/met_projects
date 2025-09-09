Will contain a log info about the runs.

Example of expected structure to be used by the visualizer.
```json
{
    "metadata": {
        "date": "2025-09-05T17:06:11.570206",
        "problem_name": "mokp",
        "problem_data_file": "2KP100.dat"
    },
    "config": {
        "algorithm": "VNS",
        ...
    },
    "solutions": [
        {
            "objectives": [1, 2, 3],
            "data": [1, 1, 1, 1, 0, 0, 0, 0]
        },
        {
            "objectives": [3, 2, 1],
            "data": [1, 1, 1, 1, 0, 0, 0, 0]
        }
    ]
}
```
