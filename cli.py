import structurer
import grapher

class CLI:
    def __init__(self):
        self.history = []
        self.run = True

    def main_loop(self):
        self.show_intro()
        while self.run:
            com = self.get_command()
            if self.execute(com):
                self.history.append(com)
            else:
                print(f'Bad command, didn\'t understand "{com}"')

    def get_command(self):
        return input(f"{len(self.history)}> ").strip(' ')

    def execute(self, com):
        com = com.split(' ')
        if com[0] == 'quit':
            self.run = False
            return True

        return False

    def show_intro(self):
        print('It is an introducton.')


if __name__ == "__main__":
    cli = CLI()
    cli.main_loop()
