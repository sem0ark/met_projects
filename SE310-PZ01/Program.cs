// By Arkadii Semenov 5833 SI FIT
// @sem0ark (MIT)

namespace SE310Demo;

using static FunctionalSignals;
using static Components.Components;
using Components;

static class Program
{
  static Container<FlowLayoutPanel> Demo4() {
    var numbers = SList<int>();
    var random = new Random();

    var mean = numbers.Map((nums) => nums.Count == 0 ? 0 : Math.Round(nums.Sum() * 1.0 / nums.Count, 2));
    var max = numbers.Map((nums) => nums.Count == 0 ? 0 : nums.Max());
    var min = numbers.Map((nums) => nums.Count == 0 ? 0 : nums.Min());
    var sum = numbers.Map((nums) => nums.Sum());

    return Horizontal()
      .Add(P(200, 400).Add(ListBox(numbers)))
      .Add(Vertical()
        .Add(Text(S(() => $"Sum {sum.Get()}")))
        .Add(Text(S(() => $"Mean {mean.Get()}")))
        .Add(Text(S(() => $"Max {max.Get()}")))
        .Add(Text(S(() => $"Min {min.Get()}")))
        .Add(Button("Add Number").OnClick((_) => {
          numbers.Add(Math.Abs(random.Next()) % 100);
        }))
        .Add(Button("Remove Number").OnClick((_) => {
          if(numbers.Count > 0) numbers.Pop();
        }))
      )
    ;
  }

  static int Demo3Func(int a, int b) {
    int result = 0;
    for(int i=a; i<=b; i++) {
      if(i % 2 == 0) result += i;
    }
    return result;
  }

  static Container<FlowLayoutPanel> Demo3() {
    var start = S(21);
    var end = S(99);
    var sum = S(() => Demo3Func(start.Get(), end.Get()));

    return Vertical()
      .Add(Text(S(() => $"Sum of even numbers from {start.Get()} to {end.Get()} is {sum.Get()}")))
      .Add(Horizontal().Add(Text("Enter a start: ")).Add(NumberInput(100, start)))
      .Add(Horizontal().Add(Text("Enter a end: ")).Add(NumberInput(100, end)));
  }

  static int Demo2Func(int n) {
    n /= 2;
    return n * (n + 1);
  }

  static Container<FlowLayoutPanel> Demo2() {
    var num = S(100);
    var sum = num.Map(Demo2Func);

    return Vertical()
      .Add(Text(S(() => $"Sum of event numbers from 2 to {num.Get()} is {sum.Get()}")))
      .Add(Horizontal().Add(Text("Enter a number: ")).Add(NumberInput(100, num)));
  }

  static Container<FlowLayoutPanel> Demo1() {
    var counter = S(1);
    var sum = S(0);
    counter.On(sum.Inc);

    return Vertical()
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
    
    return CF(640, 480, "Arkadii Semenov SE310 PZ01 Demo",
      tabs
        .Add("Demo 1", "Demo-1", Demo1())
        .Add("Demo 2", "Demo-2", Demo2())
        .Add("Demo 3", "Demo-3", Demo3())
        .Add("Demo 4", "Demo-4", Demo4())
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