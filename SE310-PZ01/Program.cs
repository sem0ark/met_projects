namespace ArkadiiSemenov5833DZ07;

// By Arkadii Semenov 5833 SI FIT

using static FunctionalSignals;
using static Components.Components;
using Components;

static class Program
{

  static Container<FlowLayoutPanel> Task45() {
    var numbers = SList<int>();
    var random = new Random();

    var mean = numbers.Map((nums) => nums.Count == 0 ? 0 : Math.Round(nums.Sum() * 1.0 / nums.Count, 2));
    var max = numbers.Map((nums) => nums.Count == 0 ? 0 : nums.Max());
    var min = numbers.Map((nums) => nums.Count == 0 ? 0 : nums.Min());
    var sum = numbers.Map((nums) => nums.Sum());

    return H()
      .Add(P(200, 400).Add(ListBox(numbers)))
      .Add(V()
        .Add(Text(S(() => $"Sum {sum.Get()}")))
        .Add(Text(S(() => $"Mean {mean.Get()}")))
        .Add(Text(S(() => $"Max {max.Get()}")))
        .Add(Text(S(() => $"Min {min.Get()}")))
        .Add(Button("Add Number").OnClick((_) => {
          numbers.Add(Math.Abs(random.Next()) % 100);
        }))
        .Add(Button("Remove Number").OnClick((_) => {
          numbers.Pop();
        }))
      )
    ;
  }

  static int Task3Func(int a, int b) {
    int result = 0;
    for(int i=a; i<=b; i++) {
      if(i % 2 == 0) result += i;
    }
    return result;
  }

  static Container<FlowLayoutPanel> Task3() {
    var start = S(21);
    var end = S(99);
    var sum = S(() => Task3Func(start.Get(), end.Get()));

    return V()
      .Add(Text(S(() => $"Sum of event numbers from {start.Get()} to {end.Get()} is {sum.Get()}")))
      .Add(H().Add(Text("Enter a start: ")).Add(NumberInput(100, start)))
      .Add(H().Add(Text("Enter a end: ")).Add(NumberInput(100, end)));
  }

  static int Task2Func(int n) {
    n /= 2;
    return n * (n + 1);
  }

  static Container<FlowLayoutPanel> Task2() {
    var num = S(100);
    var sum = num.Map(Task2Func);

    return V()
      .Add(Text(S(() => $"Sum of event numbers from 2 to {num.Get()} is {sum.Get()}")))
      .Add(H().Add(Text("Enter a number: ")).Add(NumberInput(100, num)));
  }

  static Container<FlowLayoutPanel> Task1() {
    var counter = S(1);
    var sum = S(0);
    counter.On(sum.Inc);

    return V()
      .Add(Text(S(() => $"Counter {counter.Get()}")))
      .Add(Text(S(() => $"Total {sum.Get()}")))
      .Add(Button("Start Counter").OnClick((_) => {
        new Task(() => {
          while(counter.Peek() < 3000) counter.Inc();
        }).Start();
      }))
    ;
  } 

  static Form App()
  {
    var tabs = Tabs();
    
    return CF(640, 480, "Arkadii Semenov DZ09",
      tabs
        .Add("Task 1 Couter", "task-1", Task1())
        .Add("Task 2", "task-23", Task2())
        .Add("Task 3", "task-3", Task3())
        .Add("Task 4 / 5", "task-45", Task45())
    ).Render();
  }

  [STAThread]
  static void Main()
  {
    try {
      ApplicationConfiguration.Initialize();
      Application.Run(App());
    } catch (Exception e) {
      Console.WriteLine(e.StackTrace);
      Console.WriteLine(e.Message);
      Console.ReadLine();
    }
  }
}