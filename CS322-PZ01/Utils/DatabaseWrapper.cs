using Microsoft.Data.Sqlite;


namespace Utils
{

  public class SQLiteDB
  {
    private string filename;
    private string connectionString;

    public SQLiteDB(string filename)
    {
      this.filename = filename;
      this.connectionString = $"Data Source={filename}";
    }

    public Exception? RunNonQueryScopedSynchronous(Action<SqliteCommand> createCommand)
    {
      try
      {
        using (var connection = new SqliteConnection(this.connectionString))
        {
          connection.Open();
          var command = connection.CreateCommand();
          createCommand(command);
          command.ExecuteNonQuery();
        }
        return null;
      }
      catch (Exception err)
      {
        Console.WriteLine($"Failed Query: {err.Message}\n{err.StackTrace}");
        return err;
      }
    }

    public async Task<Exception?> RunNonQueryScoped(string commandText)
      => await RunNonQueryScoped((command) => { command.CommandText = commandText; });

    public async Task<Exception?> RunNonQueryScoped(Action<SqliteCommand> createCommand)
    {
      try
      {
        using (var connection = new SqliteConnection(this.connectionString))
        {
          await connection.OpenAsync();
          var command = connection.CreateCommand();
          createCommand(command);
          await command.ExecuteNonQueryAsync();
        }
        return null;
      }
      catch (Exception err)
      {
        Console.WriteLine($"Failed Query: {err.Message}\n{err.StackTrace}");
        return err;
      }
    }

    public async Task<Exception?> RunNonQueryScopedMultiple<T>(IEnumerable<T> values, Func<T, string> createCommand)
      => await RunNonQueryScopedMultiple(values, (value, command) => { command.CommandText = createCommand(value); });

    public async Task<Exception?> RunNonQueryScopedMultiple<T>(IEnumerable<T> values, Action<T, SqliteCommand> createCommand)
    {
      try
      {
        using (var connection = new SqliteConnection(this.connectionString))
        {
          await connection.OpenAsync();
          var command = connection.CreateCommand();

          using (var transaction = connection.BeginTransaction())
          {
            command.Transaction = transaction;

            foreach (var value in values)
            {
              createCommand(value, command);
              await command.ExecuteNonQueryAsync();
            }

            transaction.Commit();
          }
        }
        return null;
      }
      catch (Exception err)
      {
        Console.WriteLine($"Failed Query: {err.Message}\n{err.StackTrace}");
        return err;
      }
    }

    public async Task<(List<T>, Exception?)> RunQueryScoped<T>(string queryText, Func<SqliteDataReader, T> onLineRead)
      => await RunQueryScoped<T>((command) => { command.CommandText = queryText; }, onLineRead);

    public async Task<(List<T>, Exception?)> RunQueryScoped<T>(Action<SqliteCommand> createQuery, Func<SqliteDataReader, T> onLineRead)
    {
      try
      {
        using (var connection = new SqliteConnection(this.connectionString))
        {
          await connection.OpenAsync();
          var command = connection.CreateCommand();
          createQuery(command);

          List<T> result = [];
          using (var reader = await command.ExecuteReaderAsync())
          {
            while (await reader.ReadAsync())
              result.Add(onLineRead(reader));
          }
          return (result, null);
        }
      }
      catch (Exception err)
      {
        Console.WriteLine($"Failed Query: {err.Message}\n{err.StackTrace}");
        return ([], err);
      }
    }

    public async Task<(T?, Exception?)> RunQueryScopedSingle<T>(string queryText, Func<SqliteDataReader, T> onLineRead) where T : struct
      => await RunQueryScopedSingle<T>((command) => { command.CommandText = queryText; }, onLineRead);

    public async Task<(T?, Exception?)> RunQueryScopedSingle<T>(Action<SqliteCommand> createQuery, Func<SqliteDataReader, T> onLineRead) where T : struct
    {
      try
      {
        using (var connection = new SqliteConnection(this.connectionString))
        {
          await connection.OpenAsync();
          var command = connection.CreateCommand();
          createQuery(command);

          using (var reader = await command.ExecuteReaderAsync())
            if (await reader.ReadAsync())
              return (onLineRead(reader), null);

          return (null, null);
        }
      }
      catch (Exception err)
      {
        Console.WriteLine($"Failed Query: {err.Message}\n{err.StackTrace}");
        return (default(T), err);
      }
    }


    public async Task<(List<List<R>>, Exception?)> RunQueryScopedMultiple<T, R>(List<T> values, Func<T, string> createQuery, Func<SqliteDataReader, R> onLineRead)
      => await RunQueryScopedMultiple(values, (value, command) => { command.CommandText = createQuery(value); }, onLineRead);

    public async Task<(List<List<R>>, Exception?)> RunQueryScopedMultiple<T, R>(List<T> values, Action<T, SqliteCommand> createQuery, Func<SqliteDataReader, R> onLineRead)
    {
      try
      {
        using (var connection = new SqliteConnection(this.connectionString))
        {
          await connection.OpenAsync();
          var command = connection.CreateCommand();
          List<List<R>> result = [];

          foreach (var value in values)
          {
            List<R> single_result = [];
            createQuery(value, command);

            using (var reader = await command.ExecuteReaderAsync())
            {
              while (await reader.ReadAsync())
                single_result.Add(onLineRead(reader));
            }

            result.Add(single_result);
          }

          return (result, null);
        }
      }
      catch (Exception err)
      {
        Console.WriteLine($"Failed Query: {err.Message}\n{err.StackTrace}");
        return ([], err);
      }
    }

    public void ClearDB()
    {
      try
      {
        if (File.Exists(this.filename)) File.Delete(this.filename);
      }
      catch (Exception err)
      {
        Console.WriteLine($"Failed to remove the db ({this.filename}): {err}\n{err.StackTrace}");
      }
    }
  }

  public static class CommonQueries
  {
    public static Task<(int?, Exception?)> SelectLastInsertedRowId(SQLiteDB db)
      => db.RunQueryScopedSingle("SELECT last_insert_rowid()", (reader) => reader.GetInt32(0));
  }
}
