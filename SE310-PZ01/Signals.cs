// MIT, Made by Arkadii Semenov (@sem0ark)

using System.Collections;
using System.Numerics;


// MIT, Made by Arkadii Semenov (@sem0ark)


using Signals;
using Signals.Extensions;

public static class FunctionalSignals
{
  public static ReactiveList<T> SList<T>(List<T>? initial = null) => new ReactiveList<T>(initial ?? []);

  public static NumberSignal<int> S(int value) => new NumberSignal<int>(value);
  public static NumberSignal<decimal> S(decimal value) => new NumberSignal<decimal>(value);
  public static NumberSignal<float> S(float value) => new NumberSignal<float>(value);
  public static NumberSignal<long> S(long value) => new NumberSignal<long>(value);
  public static NumberSignal<double> S(double value) => new NumberSignal<double>(value);
  public static BooleanSignal S(bool value) => new BooleanSignal(value);

  public static WriteSignal<T> S<T>(T value) => new WriteSignal<T>(value);
  public static ComputedSignal<T> S<T>(Func<T> updater) => ComputedSignal<T>.MakeComputedSignal(updater);

  public static void Effect(Action effect) => new EffectSignal(() => { effect(); return null; });
  public static void Effect(Func<Action?> effect) => new EffectSignal(effect);
  public static void Effect(Func<Action?> effect, params Signal[] explicitDependencies) => new EffectSignal(effect, false, explicitDependencies);
  public static Action<Func<Action?>> On(params Signal[] explicitDependencies) => (Func<Action?> effect) => new EffectSignal(effect, true, explicitDependencies);
  public static ReadSignal<T> readOnly<T>(WriteSignal<T> signal) => signal;

  public static void OnChange<T>(this ReadSignal<T> signal, Action<T> effect) => new EffectSignal(() => { effect(signal.Get()); return null; }, false, signal);
  public static void On<T>(this ReadSignal<T> signal, Action<T> effect) => new EffectSignal(() => { effect(signal.Get()); return null; }, true, signal);
  public static void OnChange<T>(this ReadSignal<T> signal, Func<T, Action> effect) => new EffectSignal(() => effect(signal.Get()), false, signal);
  public static void On<T>(this ReadSignal<T> signal, Func<T, Action> effect) => new EffectSignal(() => effect(signal.Get()), true, signal);

  public static ReadSignal<R> Map<T, R>(this ReadSignal<T> signal, Func<T, R> func) => S(() => func(signal.Get()));
}


namespace Signals
{
  static class Scope
  {
    static Stack<HashSet<Signal>> scopes = new();
    static public void AddToScope(Signal c)
    {
      if (scopes.Count > 0) scopes.Peek().Add(c);
    }
    static public void NewScope() => scopes.Push(new());
    static public HashSet<Signal> PopScope() => scopes.Pop();
  }

  public interface Signal
  {
    public void Update();
    public void AddTarget(Signal c);
    public void AddSource(Signal c);
    public void RemoveTarget(Signal c);
    public void ClearSources();
  }

  public class ReadSignal<T> : Signal
  {
    protected T data;
    protected HashSet<Signal>? targets;
    protected HashSet<Signal>? sources;

    public ReadSignal(T initial)
    {
      data = initial;
    }

    public virtual T Get()
    {
      Scope.AddToScope(this);
      return data;
    }

    public virtual T Peek()
    {
      return data;
    }

    public virtual void Update()
    {
      if (targets == null) return;
      foreach (var sub in targets) sub.Update();
    }

    public void AddTarget(Signal c)
    {
      if (targets == null) targets = [c];
      else targets.Add(c);
    }

    public void AddSource(Signal c)
    {
      if (sources == null) sources = [c];
      else sources.Add(c);
    }

    public void RemoveTarget(Signal c)
    {
      this.targets?.Remove(c);
    }

    public void ClearSources()
    {
      if (sources == null) return;
      foreach (var source in sources) source.RemoveTarget(this);
    }
  }

  public class WriteSignal<T> : ReadSignal<T>
  {
    public WriteSignal(T initial) : base(initial) { }

    public void Set(T newData)
    {
      data = newData;
      base.Update();
    }

    public void Set(Func<T, T> updater)
    {
      data = updater(data);
      base.Update();
    }
  }

  public class ComputedSignal<T> : ReadSignal<T>
  {
    Func<T> function;
    bool isStale = false;

    static public ComputedSignal<T> MakeComputedSignal(Func<T> function)
    {
      Scope.NewScope();
      var result = new ComputedSignal<T>(function(), function);
      foreach (var c in Scope.PopScope())
      {
        c.AddTarget(result);
        result.AddSource(c);
      }
      return result;
    }

    ComputedSignal(T initial, Func<T> function) : base(initial)
    {
      this.function = function;
    }

    public override void Update()
    {
      isStale = true;
      base.Update();
    }

    public override T Get()
    {
      Scope.AddToScope(this);

      if (isStale) data = function();

      isStale = false;
      return data;
    }


    public override T Peek()
    {
      if (isStale) data = function();

      isStale = false;
      return data;
    }
  }

  public class EffectSignal : ReadSignal<object?>
  {
    Func<Action?> function;
    Action? dispose;

    public EffectSignal(Func<Action?> function) : base(null)
    {
      this.function = function;
      Scope.NewScope();

      dispose = function();

      foreach (var c in Scope.PopScope())
      {
        c.AddTarget(this);
        this.AddSource(c);
      }
    }

    public EffectSignal(Func<Action?> function, bool runOnInit, params Signal[] explicitDependencies) : base(null)
    {
      this.function = function;

      if (runOnInit) dispose = function();

      foreach (var c in explicitDependencies)
      {
        c.AddTarget(this);
        this.AddSource(c);
      }
    }

    public override void Update()
    {
      if (dispose != null) dispose();
      dispose = function();
    }
  }
}






namespace Signals.Extensions
{

  public class NumberSignal<T> : WriteSignal<T> where T : INumber<T>
  {
    public NumberSignal(T initial) : base(initial) { }

    public void Inc(T step) => this.Set((c) => c + step);
    public void Inc() => this.Set(static (c) => c + T.CreateChecked(1));
    public void Dec(T step) => this.Set((c) => c - step);
    public void Dec() => this.Set(static (c) => c - T.CreateChecked(1));
    public void Reset() => this.Set(T.CreateChecked(0));
  }

  public class BooleanSignal : WriteSignal<bool>
  {
    public BooleanSignal(bool initial) : base(initial) { }

    public void Enable(params object?[] _) => this.Set(true);
    public void Disable(params object?[] _) => this.Set(false);
    public void Toggle(params object?[] _) => this.Set(static (v) => !v);
  }

  /// <summary>
  /// Will allow to "apply" some function to the value stored,
  /// will re-fire every time executed.
  /// </summary>
  /// <typeparam name="T"></typeparam>
  public class ReactiveWrapper<T> : WriteSignal<T>
  {
    public ReactiveWrapper(T initial) : base(initial) { }

    public void Apply(Func<T, bool> func)
    {
      var needUpdate = func(this.Peek());
      if (needUpdate) this.Set(this.Peek());
    }
    public void Apply(Action<T> func)
    {
      func(this.Peek());
      this.Set(this.Peek());
    }
  }

  public class ReactiveList<T> : ReactiveWrapper<List<T>>
  {
    /// <summary>
    /// Simple reactive list structure implementation,
    /// will fire as a whole value whenever changed.
    /// 
    /// It is recommended to use ReactiveMap or ReactiveKeyedMap
    /// </summary>
    /// <param name="values">Initial collection of values</param>
    public ReactiveList(IEnumerable<T> values) : base(new List<T>(values)) { }
    public ReactiveList() : base(new List<T>()) { }

    public void Set(int index, T value)
    {
      this.Apply((v) =>
      {
        var prev = v[index];
        v[index] = value;
        return Equals(prev, value);
      });
    }

    public void Add(T value) => this.Apply((v) => v.Add(value));
    public void Remove(T value) => this.Apply((v) => v.Remove(value));
    public void Pop() => this.Apply((v) => v.RemoveAt(v.Count - 1));

  }
}

