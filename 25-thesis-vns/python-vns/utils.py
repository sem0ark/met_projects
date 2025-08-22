import logging
import re


def setup_logging(level=logging.INFO):
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    console_handler.setFormatter(formatter)

    root_logger.addHandler(console_handler)


def parse_time_string(time_str: str) -> float:
    """Parses a time string like '5s', '2m', '1h' into seconds."""
    if not time_str:
        return float("inf")

    match = re.match(r"(\d+)([smh])", time_str)
    if not match:
        raise ValueError(
            "Invalid time format. Use digits followed by 's' (seconds), 'm' (minutes), or 'h' (hours). "
            "Example: '30s', '5m', '1h'."
        )
    value = int(match.group(1))
    unit = match.group(2)

    if unit == "s":
        return float(value)
    elif unit == "m":
        return float(value * 60)
    elif unit == "h":
        return float(value * 3600)
    return float("inf")
