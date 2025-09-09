import logging
from _cli import CLI


logger = logging.getLogger()


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


def run_instance(path, time):
    pass


if __name__ == "__main__":
    setup_logging(level=logging.INFO)

    CLI().register_runner(
        "mokp",
        [
            ("RVNS batch shake 1", run_instance)
        ]
    ).run()
