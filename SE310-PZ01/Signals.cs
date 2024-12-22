// MIT, Made by Arkadii Semenov (@sem0ark)

using System.Numerics;

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
  public static Action<Action> On(params Signal[] explicitDependencies) => (Action effect) => new EffectSignal(() => { effect(); return null; }, true, explicitDependencies);
  public static ReadSignal<T> readOnly<T>(WriteSignal<T> signal) => signal;

  public static void OnChange<T>(this ReadSignal<T> signal, Action<T> effect) => new EffectSignal(() => { effect(signal.Get()); return null; }, false, signal);
  public static void On<T>(this ReadSignal<T> signal, Action<T> effect) => new EffectSignal(() => { effect(signal.Get()); return null; }, true, signal);
  public static void OnChange<T>(this ReadSignal<T> signal, Func<T, Action> effect) => new EffectSignal(() => effect(signal.Get()), false, signal);
  public static void On<T>(this ReadSignal<T> signal, Func<T, Action> effect) => new EffectSignal(() => effect(signal.Get()), true, signal);
  public static ReadSignal<R> Map<T, R>(this ReadSignal<T> signal, Func<T, R> func) => S(() => func(signal.Get()));

  public static QueryKey QKey(params string[] keys) => new QueryKey(keys);
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
    public void RemoveAt(int i) => this.Apply((v) => v.RemoveAt(i));
    public void Pop() => this.Apply((v) => v.RemoveAt(v.Count - 1));
  }


  public class QueryKey
  {
    public string[] keys { get; }
    public QueryKey(params string[] keys)
    {
      this.keys = keys;
    }

    public override bool Equals(object obj)
    {
      if (obj == null) return false;
      if (obj is not QueryKey) return false;
      return GetHashCode() == ((QueryKey)obj).GetHashCode();
    }

    public override int GetHashCode()
    {
      unchecked {
        int result = 1;
        foreach (var v in keys) result *= v.GetHashCode();
        return result;
      }
    }

    public override string ToString()
    {
      return "QueryKey(" + String.Join(", ", this.keys) + ")";
    }
  }

  public class QueryData<T>
  {
    public QueryKey Key;
    public T? result = default;
    public Exception? error = null;
    public bool isError = false;
    public bool isInProgress = false;
    public bool isSuccess = false;

    public QueryData(
      QueryKey Key,
      T? result = default,
      Exception? error = null,
      bool isError = false,
      bool isInProgress = false,
      bool isSuccess = false
    )
    {
      this.Key = Key;
      this.result = result;
      this.error = error;
      this.isError = isError;
      this.isInProgress = isInProgress;
      this.isSuccess = isSuccess;
    }

    public override string ToString()
    {
      return $"Query({Key}" + (isInProgress ? " in progress " : " ") + (isSuccess ? " success " : " ") + (isError ? " error)" : ")");
    }
  }

  interface Query {
    public void Reload();
    public void Start();
  }

  public class Query<ReturnType> : ReactiveWrapper<QueryData<ReturnType>>, Query
  {
    public Func<Task<ReturnType>> func;

    public Query(QueryKey key, Func<Task<ReturnType>> func) : base(new QueryData<ReturnType>(key))
    {
      this.func = func;
    }

    public void Reload()
    {
      if (this.Peek().isInProgress) return;
      this.Apply((v) =>
      {
        v.isError = false;
        v.isInProgress = false;
        v.isSuccess = false;
      });
      Start();
    }

    public void Start()
    {
      if (this.Peek().isInProgress || this.Peek().isSuccess)
      {
        return;
      }

      try
      {
        this.Apply((v) =>
        {
          v.isInProgress = true;
        });

        // Synchronous, because still not sure how to work with UI threads...
        var t = this.func();
        t.Wait();
        if (t.Exception != null) throw t.Exception;

        this.Apply((v) =>
        {
          v.result = t.Result;
          v.isSuccess = true;
          v.isInProgress = false;
          v.isError = false;
          v.error = null;
        });
      }
      catch (Exception err)
      {
        this.Apply((v) =>
        {
          v.error = err;
          v.isError = true;
          v.isSuccess = false;
          v.isInProgress = false;
          v.result = default;
        });
      }
    }

    public override string ToString() => Peek().ToString();
  }


  public class Mutation<ReturnType> : ReactiveWrapper<QueryData<ReturnType>>
  {
    public Func<Task<ReturnType>> func;
    Action? onSuccess = null;
    Action? onFail = null;

    public Mutation(Func<Task<ReturnType>> func) : base(new QueryData<ReturnType>(new QueryKey()))
    {
      this.func = func;
    }

    public Mutation<ReturnType> OnSuccess(Action act)
    {
      onSuccess = act;
      return this;
    }
    public Mutation<ReturnType> OnFail(Action act)
    {
      onFail = act;
      return this;
    }

    public void Start()
    {
      if (this.Peek().isInProgress || this.Peek().isSuccess)
      {
        return;
      }

      try
      {
        Console.WriteLine("Starting mutation");
        this.Apply((v) =>
        {
          v.isInProgress = true;
        });

        var t = this.func();
        t.Wait();
        if (t.Exception != null) throw t.Exception;

        Console.WriteLine("Mutation is done");
        this.Apply((v) =>
        {
          v.result = t.Result;
          v.isSuccess = true;
          v.isInProgress = false;
        });
        if (onSuccess != null) onSuccess();
      }
      catch (Exception err)
      {
        this.Apply((v) =>
        {
          v.error = err;
          v.isError = true;
          v.isSuccess = false;
          v.isInProgress = false;
        });
        if (onFail != null) onFail();
      }
    }

    public override string ToString() => Peek().ToString();
  }

  public class QueryClient
  {
    private Utils.Trie<string, Query> queries = new();

    public QueryClient() {}

    public Query<T> useQuery<T>(QueryKey key, Func<Task<T>> func)
    {
      var cached = queries.Get(key.keys);
      if (cached != null) return (Query<T>) cached;

      Console.WriteLine($"Setting {key}");
      Query<T> query = new(key, func);
      queries.Set(key.keys, query);
      query.Start();
      return query;
    }

    public (Action, Mutation<T>) useMutation<T>(Func<Task<T>> func)
    {
      var result = new Mutation<T>(func);
      return (result.Start, result);
    }

    public (Action, Mutation<object?>) useMutation(Func<Task> func)
    {
      var result = new Mutation<object?>(async () =>
      {
        await func();
        return null;
      });
      return (result.Start, result);
    }

    public void invalidateQueries(params QueryKey[] keys)
    {
      foreach (var key in keys)
        queries.ApplyRecursive(key.keys, (q) => q.Reload());
    }
  }
}

namespace Utils
{
  public class Trie<K, T> where K : notnull
  {
    sealed class TrieNode<V>
    {
      private Dictionary<K, TrieNode<V>>? children = null;
      public V? value;

      public TrieNode() { }
      public TrieNode(V value) => this.value = value;

      public void Set(K key, TrieNode<V> child)
      {
        if (children == null) children = new();
        children[key] = child;
      }

       public void Remove(K key)
      {
        if (children == null) return;
        children.Remove(key);
      }

      public TrieNode<V>? GetChild(K key)
      {
        if (children == null) return null;
        if (!children.ContainsKey(key)) return null;
        return children[key];
      }

      public void ApplyRecursive(Action<V> act)
      {
        if (this.value != null) act(value);
        if (this.children != null)
          foreach (var child in this.children.Values)
            child.ApplyRecursive(act);
      }
    }
    private TrieNode<T> root = new();

    TrieNode<T>? GetNode(params K[] keys)
    {
      TrieNode<T>? current = root;
      for (int i = 0; current != null && i < keys.Length; i++)
        current = current.GetChild(keys[i]);

      return current;
    }

    public void Set(K[] keys, T value)
    {
      TrieNode<T>? current = root;
      for (int i = 0; i < keys.Length; i++)
      {
        var next = current.GetChild(keys[i]);
        if (next == null)
        {
          next = new TrieNode<T>();
          current.Set(keys[i], next);
        }
        current = next;
      }

      current.value = value;
    }

    public T? Get(params K[] keys)
    {
      var result = this.GetNode(keys);
      if (result != null) return result.value;
      return default;
    }

    public void Remove(params K[] keys)
    {
      TrieNode<T>? current = root;
      for (int i = 0; i < keys.Length - 1; i++)
      {
        var next = current.GetChild(keys[i]);
        if (next == null) return;
        current = next;
      }
      current.Remove(keys[keys.Length - 1]);
    }


    public void ApplyRecursive(K[] keys, Action<T> act)
    {
      this.GetNode(keys)?.ApplyRecursive(act);
    }
  }
}
