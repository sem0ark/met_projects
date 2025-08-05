using Microsoft.Data.Sqlite;
using Utils;

namespace Queries.ECommerce.v1.Todos {
  record struct TodoDTOPost(
    string Name
  );

  record struct TodoDTOUpdate(
    string Name,
    bool IsComplete
  );
  
  record struct TodoDTO(
    int Id,
    string Name,
    bool IsComplete
  ) {
    public static TodoDTO Parse(SqliteDataReader reader) => new TodoDTO{
      Id = reader.GetInt32(0),
      Name = reader.GetString(1),
      IsComplete = reader.GetBoolean(2)
    };
  }

  public class TodoService : Service {
    private SQLiteDB db;
    private string groupPrefix;

    public TodoService(string groupPrefix) {
      this.groupPrefix = groupPrefix;
      this.db = new SQLiteDB("todo_data.db");
    }

    public async Task InitService()
    {
      Console.WriteLine("Creating Todo DB...");
      this.db.ClearDB();
      var err = await db.RunNonQueryScoped((command) => {
        command.CommandText =
        @"
          CREATE TABLE todos (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            isDone INTEGER NOT NULL
          );

          INSERT INTO todos (name, isDone)
          VALUES ('1', FALSE),
                 ('2', FALSE),
                 ('3', FALSE);
        ";
      });
      if(err != null) throw err;
    }

    public Service BindApp(WebApplication app) {
      var todoItems = app.MapGroup(groupPrefix);

      todoItems.MapGet("/", this.GetAllTodos);
      todoItems.MapGet("/complete", this.GetCompleteTodos);
      todoItems.MapGet("/{id}", this.GetTodo);
      todoItems.MapPost("/", this.CreateTodo);
      todoItems.MapPut("/{id}", this.UpdateTodo);
      todoItems.MapDelete("/{id}", this.DeleteTodo);

      return this;
    }
    

    Task<(List<TodoDTO>, Exception?)> _GetTodos() => db.RunQueryScoped(
      (command) => command.CommandText = @"SELECT id, name, isDone FROM todos",
      TodoDTO.Parse
    );
    async Task<IResult> GetAllTodos()
    {
      var (data, err) = await _GetTodos();
      if(err != null) return TypedResults.Problem(err.Message);
      return TypedResults.Ok(data);
    }


    Task<(List<TodoDTO>, Exception?)> _GetCompleteTodos() => db.RunQueryScoped(
      (command) => command.CommandText = @"SELECT id, name, isDone FROM todos WHERE isDone = TRUE",
      TodoDTO.Parse
    );
    async Task<IResult> GetCompleteTodos()
    {
      var (data, err) = await _GetCompleteTodos();
      if(err != null) return TypedResults.Problem(err.Message);
      return TypedResults.Ok(data);
    }


    async Task<(TodoDTO?, Exception?)> _GetTodo(int id) {
      var (data, err) = await db.RunQueryScoped(
        (command) => command.CommandText = @$"SELECT id, name, isDone FROM todos WHERE id = {id}",
        TodoDTO.Parse
      );
      if(err != null) return (null, err);
      if(data == null || data.Count == 0) return (null, null);
      return (data[0], null);
    }
    async Task<IResult> GetTodo(int id)
    {
      var (data, err) = await _GetTodo(id);
      if(err != null) return TypedResults.Problem(err.Message);
      if(data == null) return TypedResults.NotFound();
      return TypedResults.Ok(data);
    }


    async Task<IResult> CreateTodo(TodoDTOPost todo)
    {
      var err = await db.RunNonQueryScoped(
        (command) => command.CommandText = @$"
          INSERT INTO todos (name, isDone)
          VALUES ('{todo.Name}', FALSE)
        "
      );
      if(err != null) return TypedResults.Problem(err.Message);
      return TypedResults.Created();
    }

    async Task<IResult> UpdateTodo(int id, TodoDTOUpdate inputTodo)
    {
      var err = await db.RunNonQueryScoped(
        (command) => command.CommandText = @$"
          UPDATE todos
            SET name = '{inputTodo.Name}',
                isDone = {inputTodo.IsComplete}
          WHERE id = {id}
        "
      );
      if(err != null) return TypedResults.Problem(err.Message);
      return TypedResults.Ok(new TodoDTO{
        Id = id,
        Name = inputTodo.Name,
        IsComplete = inputTodo.IsComplete,
      });
    }

    async Task<IResult> DeleteTodo(int id)
    {
      var (todo, err) = await _GetTodo(id);
      if(err != null) return TypedResults.Problem(err.Message);
      if(todo == null) return TypedResults.NotFound();


      err = await db.RunNonQueryScoped(
        (command) => command.CommandText = @$"
          DELETE FROM todos
          WHERE id = {id}
        "
      );
      if(err != null) return TypedResults.Problem(err.Message);
      return TypedResults.NoContent();
    }
  }
}