import logging

import mokp.ngsa2
import mokp.spea2
import mokp.vns
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


if __name__ == "__main__":
    setup_logging(level=logging.INFO)
    cli = CLI()

    mokp.vns.register_cli(cli)
    mokp.ngsa2.register_cli(cli)
    mokp.spea2.register_cli(cli)

    cli.run()
