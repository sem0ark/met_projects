// MIT, Made by Arkadii Semenov (@sem0ark)

using System;
using System.Collections;
using static FunctionalSignals;
using Signals;


namespace Components
{
  public static class Components
  {

    public static CForm<T> CF<T>(int width, int height, string text, Container<T> container) where T : Control, new()
    {
      return new CForm<T>(width, height, text, container);
    }

    public static Container<Panel> P(int width, int height) => new Container<Panel>(width, height, new Panel());

    public static Container<FlowLayoutPanel> Flow(int min_width = 0, int min_height = 0)
      => new Container<FlowLayoutPanel>(min_width, min_height, new FlowLayoutPanel())
              .Apply(p =>
              {
                p.AutoSize = true;
              });

    public static Container<TableLayoutPanel> Grid(int columns, int min_width = 0, int min_height = 0)
      => new Container<TableLayoutPanel>(min_width, min_height, new TableLayoutPanel())
              .Apply(p =>
              {
                p.AutoSize = true;
                p.ColumnCount = columns;
              });


    public static Tabs Tabs()
      => (Tabs)new Tabs(0, 0, new TabControl())
              .Apply(p => { p.Dock = DockStyle.Fill; });

    public static Container<FlowLayoutPanel> H(int min_width = 0, int min_height = 0)
      => new Container<FlowLayoutPanel>(min_width, min_height, new FlowLayoutPanel())
              .Apply(p =>
              {
                p.FlowDirection = FlowDirection.LeftToRight;
                p.WrapContents = false;
                p.AutoSize = true;
              });

    public static Container<FlowLayoutPanel> V(int min_width = 0, int min_height = 0)
      => new Container<FlowLayoutPanel>(min_width, min_height, new FlowLayoutPanel())
              .Apply(p =>
              {
                p.FlowDirection = FlowDirection.TopDown;
                p.WrapContents = false;
                p.AutoSize = true;
              });


    public static Container<GroupBox> GroupBox(string? name = null, int min_width = 0, int min_height = 0)
      => new Container<GroupBox>(min_width, min_height, new GroupBox())
              .Apply(p =>
              {
                p.Size = new Size(min_width, min_height);
                p.Text = name;
              });

    public static Func<(string, T)[], Container<C>> RadioGroup<C, T>(Action<T> callback, Container<C> container) where C : Panel
      => ((string, T)[] values) =>
      {
        foreach (var (name, value) in values)
        {
          container.Add(RadioButton(name).OnClick(_ => callback(value)));
        }

        return container;
      };

    public static Component<ListBox> ListBox<T>(ReadSignal<List<T>> values) {
      var c = Component(new ListBox()).Apply(lb => {
        lb.SelectionMode = SelectionMode.One;
        lb.Dock = DockStyle.Fill;
      });

      var items = c.Peek().Items;

      values.On(vals => {
        items.Clear();
        foreach (var value in vals)
        {
          if (value != null) items.Add(value);
          else throw new Exception("Can't contain null values in the list for ListBox");
        }  
      });

      return c;
    }

    public static Component<ListBox> ListBox<T>(List<T> values) {
      var c = Component(new ListBox()).Apply(lb => { lb.SelectionMode = SelectionMode.One; });
      var items = c.Peek().Items;

      foreach (var value in values)
      {
        if (value != null) items.Add(value);
        else throw new Exception("Can't contain null values in the list for ListBox");
      }

      return c;
    }

    public static Func<T[], Component<ListBox>> ListBox<T>(Action<T> callback)
      => (T[] values) =>
      {
        var c = Component(new ListBox()).Apply(lb => { lb.SelectionMode = SelectionMode.One; });
        var items = c.Peek().Items;

        foreach (var value in values)
        {
          if (value != null) items.Add(value);
          else throw new Exception("Can't contain null values in the list for ListBox");
        }

        c.Apply(lb =>
        {
          lb.SelectedIndexChanged += (s, e) =>
          {
            var i = lb.SelectedIndex;
            if (i >= 0 && i < values.Length) callback(values[i]);
          };
        });
        return c;
      };

    public static Menu Menu() => new Menu();
    public static MenuItem MenuItem(string text) => new MenuItem().Apply(i =>
    {
      i.Text = text;
    });

    public static Component<T> Component<T>(T control) where T : Control => new Component<T>(control);

    public static Component<Label> Text(string text) => Component(new Label { Text = text, AutoSize = true, Anchor = AnchorStyles.None });
    public static Component<Label> Text(ReadSignal<string> signal)
      => Component(new Label { Text = signal.Get(), AutoSize = true, Anchor = AnchorStyles.None })
          .Apply((c) => signal.On((text) => { c.Text = text; }));

    public static Component<Button> Button(string text) => Component(new Button { Text = text, AutoSize = true, Anchor = AnchorStyles.None });
    public static Component<RadioButton> RadioButton(string text) => Component(new RadioButton { Text = text, AutoSize = true, Anchor = AnchorStyles.None });
    public static Component<CheckBox> CheckBox(string text) => Component(new CheckBox { Text = text, AutoSize = true, Anchor = AnchorStyles.None });

    public static Component<TextBox> TextBox(int width)
      => Component(new TextBox { AutoSize = true, Size = new Size(width, 0), Anchor = AnchorStyles.None });

    public static Component<TextBox> TextBox(int width, WriteSignal<string> value)
      => Component(new TextBox { AutoSize = true, Size = new Size(width, 0), Anchor = AnchorStyles.None })
          .Apply(c => { c.Text = value.Get(); })
          .OnTextInput(value.Set);

    public static Component<NumericUpDown> NumberInput(int width, WriteSignal<int> value)
      => Component(new NumericUpDown { AutoSize = true, Size = new Size(width, 0), Anchor = AnchorStyles.None, DecimalPlaces = 0, })
          .Apply(c => {
            c.Value = value.Get();
            c.ValueChanged += (s, e) => {
              value.Set((int) c.Value);
            };
          });


    public static Component<DataGridView> DataGridView<T>(IQueryable<T> query)
    {
      var dataGrid = new DataGridView
      {
        AutoSize = true,
      };
      var l = query.ToList();
      dataGrid.DataSource = l;
      return Component(dataGrid);
    }

    public static Component<DataGridView> DataGridView<T>(ReadSignal<IQueryable<T>> query)
    {
      var dataGrid = new DataGridView
      {
        AutoSize = true,
      };
      Effect(() =>
      {
        dataGrid.DataSource = query.Get().ToList();
      });
      return Component(dataGrid);
    }
    
    public static Component<DataGridView> DataGridView<T>(ReadSignal<T> data)
    {
      var dataGrid = new DataGridView
      {
        AutoSize = true,
      };
      Effect(() =>
      {
        dataGrid.DataSource = data.Get();
      });
      return Component(dataGrid);
    }


    public static Component<MenuStrip> MenuStrip()
      => Component(new MenuStrip { });
  }

  public abstract class AComponent<T>
  {
    protected T value;
    public AComponent(T value) => this.value = value;
    public abstract void Dispose(bool disposing = true);
    public abstract T Render();
    public T Peek() => this.value;
    public virtual AComponent<T> Apply(Action<T> act) { act(this.value); return this; }
  }


  public class Component<T> : AComponent<T> where T : Control
  {
    public Component(T control) : base(control) { }
    public override Component<T> Apply(Action<T> act) { act(this.value); return this; }
    public Component<T> Apply(Action<T, Component<T>> act) { act(this.value, this); return this; }

    public override void Dispose(bool disposing = true) => this.value.Dispose();
    public override T Render() => this.value;

    public virtual Component<Control> ToGeneric() => new Component<Control>(this.value);


    public Component<T> OnClick(Action<Component<T>> callback) => this.Apply(c => c.Click += (s, e) => callback(this));
    public Component<T> OnClick(Action<Component<T>, EventArgs> callback) => this.Apply(c => c.Click += (s, e) => callback(this, e));
    public Component<T> OnTextInput(Action<string> callback) => this.Apply(c => c.TextChanged += (s, e) => callback(this.value.Text));
  }

  public class Container<T> : Component<T> where T : Control
  {
    public Size Size
    {
      get => this.value.Size;
      set => this.value.Size = value;
    }
    public Point Location
    {
      get => this.value.Location;
      set => this.value.Location = value;
    }

    public Container(int width, int height, T container) : base(container)
    {
      this.Size = new Size(width, height);
      this.value.SuspendLayout();
    }

    public Container<T> Functional(Func<StubContainer, StubContainer> innerComponents) {
      Effect(() =>
      {
        this.value.SuspendLayout();
        this.value.Controls.Clear();
        var components = innerComponents(new StubContainer()).GetControls();

        foreach (var newControl in components)
          this.value.Controls.Add(newControl);

        this.value.Size = new Size(
          Math.Max(this.Size.Width, this.value.Size.Width),
          Math.Max(this.Size.Height, this.value.Size.Height)
        );

        this.value.ResumeLayout(false);
      });

      return this;
    }

    public virtual Container<T> Add<C>(C newControl) where C : Control
    {
      this.value.Controls.Add(newControl);
      return this;
    }

    public virtual Container<T> Add<C>(Component<C> newComponent) where C : Control
    {
      this.value.Controls.Add(newComponent.Render());
      return this;
    }

    public override T Render()
    {
      this.value.Size = new Size(
        Math.Max(this.Size.Width, this.value.Size.Width),
        Math.Max(this.Size.Height, this.value.Size.Height)
      );
      this.value.ResumeLayout(false);
      return this.value;
    }

    public override Container<T> Apply(Action<T> act) { act(this.value); return this; }
    public override Component<Control> ToGeneric() => new Component<Control>(this.value);
  }

  public class StubContainer {
    private List<Control> Controls; 
    public StubContainer() {
      Controls = [];
    }

    public StubContainer Add<C>(C newControl) where C : Control
    {
      this.Controls.Add(newControl);
      return this;
    }

    public StubContainer Add<C>(Component<C> newComponent) where C : Control
    {
      this.Controls.Add(newComponent.Render());
      return this;
    }

    public List<Control> GetControls() => this.Controls;
  }

  public class FunctionalContainer<T> : Component<T> where T : Control
  {
    public Size Size
    {
      get => this.value.Size;
      set => this.value.Size = value;
    }
    public Point Location
    {
      get => this.value.Location;
      set => this.value.Location = value;
    }

    public FunctionalContainer(int width, int height, T container, Func<StubContainer, StubContainer> innerComponents) : base(container)
    {
      this.Size = new Size(width, height);
      Effect(() =>
      {
        this.value.SuspendLayout();
        this.value.Controls.Clear();
        var components = innerComponents(new StubContainer()).GetControls();

        foreach (var newControl in components)
          this.value.Controls.Add(newControl);

        this.value.Size = new Size(
          Math.Max(this.Size.Width, this.value.Size.Width),
          Math.Max(this.Size.Height, this.value.Size.Height)
        );

        this.value.ResumeLayout(true);
      });
    }

    public override T Render()
    {
      return this.value;
    }

    public override FunctionalContainer<T> Apply(Action<T> act) { act(this.value); return this; }
    public override Component<Control> ToGeneric() => new Component<Control>(this.value);
  }

  public class Tabs : Container<TabControl>
  {
    private Dictionary<string, TabPage> routes = new();

    public Tabs(int width, int height, TabControl container) : base(width, height, container) { }

    public Tabs Add<C>(string tabName, string codeName, Component<C> newComponent) where C : Control
    {
      var page = new Container<TabPage>(0, 0, new TabPage()).Apply(p =>
      {
        p.Text = tabName;
      }).Add(newComponent);

      routes[codeName] = page.Render();
      this.value.Controls.Add(routes[codeName]);
      return this;
    }

    public Tabs Update<C>(string tabName, string codeName, Component<C> newComponent) where C : Control
    {
      var page = new Container<TabPage>(0, 0, new TabPage()).Apply(p =>
      {
        p.Text = tabName;
      }).Add(newComponent);

      if (routes.ContainsKey(codeName))
        this.value.Controls.Remove(routes[codeName]);

      routes[codeName] = page.Render();
      this.value.Controls.Add(routes[codeName]);
      this.value.SelectedTab = routes[codeName];
      this.value.SelectedTab?.Refresh();
      return this;
    }

    public Tabs Close(string codeName)
    {
      if (!routes.ContainsKey(codeName)) return this;

      var ind = this.value.Controls.IndexOf(routes[codeName]);
      if (ind == -1)
      {
        routes.Remove(codeName);
        this.value.SelectedTab?.Refresh();
        return this;
      }

      this.value.Controls.Remove(routes[codeName]);

      if (this.value.Controls.Count > 0) this.value.SelectedIndex = 0;
      this.value.SelectedTab?.Refresh();
      return this;
    }

    public Tabs Redirect(string codeName)
    {

      if (routes.ContainsKey(codeName))
        this.value.SelectedTab = routes[codeName];
      this.value.SelectedTab?.Refresh();
      return this;
    }

    public override Container<TabControl> Add<C>(C newControl) { return this; }
    public override Container<TabControl> Add<C>(Component<C> newComponent) { return this; }
  }

  public class Menu : Container<MenuStrip>
  {
    public Menu() : base(0, 0, new MenuStrip()) { }

    public Menu Add(MenuItem newComponent)
    {
      if (newComponent.Peek() is ToolStripItem)
      {
        var rendered = newComponent.Render() as ToolStripItem;
        if (rendered != null) this.value.Items.Add(rendered);
      }
      return this;
    }
  }

  public class MenuItem : AComponent<ToolStripMenuItem>
  {
    public MenuItem() : base(new ToolStripMenuItem()) { }

    public MenuItem Add(MenuItem newComponent)
    {
      if (newComponent.Peek() is ToolStripItem)
      {
        var rendered = newComponent.Render() as ToolStripItem;
        if (rendered != null) this.value.DropDownItems.Add(rendered);
      }
      return this;
    }

    public MenuItem OnClick(Action<MenuItem> callback) => this.Apply(c => c.Click += (s, e) => callback(this));
    public override void Dispose(bool disposing = true) => this.value.Dispose();
    public override ToolStripMenuItem Render() => this.value;
    public override MenuItem Apply(Action<ToolStripMenuItem> act) { act(this.value); return this; }
  }

  public class CForm<T> : AComponent<Form> where T : Control, new()
  {
    private bool initialized = false;
    private Container<T> container;

    public CForm(int width, int height, string text, Container<T> container) : base(new Form
    {
      AutoScaleMode = AutoScaleMode.Font,
      Text = text,
      Size = new Size(width, height),
      AutoSize = true,
    })
    {
      this.container = container;
    }

    public CForm<T> Add(Control value)
    {
      this.container.Add(value);
      return this;
    }

    public CForm<T> Add(Component<Control> component)
    {
      this.container.Add(component);
      return this;
    }

    public override void Dispose(bool disposing = true) => this.value.Dispose();

    public override Form Render()
    {
      if (initialized) this.value.Refresh();
      else InitializeComponent();

      return this.value;
    }

    private void InitializeComponent()
    {
      this.value.SuspendLayout();
      this.value.Controls.Add(this.container.Render());
      this.value.ResumeLayout(false);
      this.value.PerformLayout();

      initialized = true;
    }
  }
}
