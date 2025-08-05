using System.Collections.Concurrent;
using Microsoft.Data.Sqlite;
using Utils;

namespace Queries.ECommerce.v1.Auth
{
  using FilterHandler = Func<EndpointFilterInvocationContext, EndpointFilterDelegate, ValueTask<object?>>;

  public record struct UserDTOPost(string Login, string Password);
  public record struct UserDTOUpdate(string Login, string Password);
  public record struct UserDTO(int Id, string Login, string Role)
  {
    public static UserDTO Parse(SqliteDataReader reader) => new UserDTO
    {
      Id = reader.GetInt32(0),
      Login = reader.GetString(1),
      Role = reader.GetString(2),
    };
  }
  public record struct UserDTOFull(int Id, string Login, string Role, string PasswordHash)
  {
    public static UserDTOFull Parse(SqliteDataReader reader) => new UserDTOFull
    {
      Id = reader.GetInt32(0),
      Login = reader.GetString(1),
      Role = reader.GetString(2),
      PasswordHash = reader.GetString(3),
    };
  }

  public record struct LoginResponse(string Token, UserDTO User);

  public class AuthService : Service
  {
    static string ADMIN_ROLE { get; } = "admin";
    static string USER_ROLE { get; } = "user";

    private SQLiteDB db;
    private string groupPrefix;
    private Hash hashGenerator;
    private Random random = new();

    private ConcurrentDictionary<string, int> tokenAssignments = new();

    public AuthService(string groupPrefix, string secret)
    {
      this.groupPrefix = groupPrefix;
      this.db = new SQLiteDB("User_data.db");
      this.hashGenerator = new(secret);
    }

    public async Task InitService()
    {
      Console.WriteLine("Creating User DB...");
      this.db.ClearDB();
      var err = await db.RunNonQueryScoped((command) =>
      {
        command.CommandText =
        @"
          CREATE TABLE users (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            login TEXT NOT NULL,
            role TEXT NOT NULL,
            passwordHash TEXT NOT NULL
          );
        ";
      });
      if (err != null) throw err;
      if ((err = await addProducts()) != null) throw err;
    }


    private Task<Exception?> addProducts()
    {
      return db.RunNonQueryScopedMultiple([
        new UserDTOFull{
          Id = 1,
          Login = "ito-1",
          Role = "user",
          PasswordHash = this.hashGenerator.getHash("password")
        },
        new UserDTOFull{
          Id = 2,
          Login = "admin",
          Role = "admin",
          PasswordHash = this.hashGenerator.getHash("password")
        },
        new UserDTOFull{
          Id = 3,
          Login = "ito-2",
          Role = "user",
          PasswordHash = this.hashGenerator.getHash("password")
        },
      ], (user) => @$"
          INSERT INTO users (id, login, role, passwordHash)
          VALUES ({user.Id}, '{user.Login}', '{user.Role}', '{user.PasswordHash}')"
      );
    }

    public Service BindApp(WebApplication app)
    {
      var UserItems = app.MapGroup(groupPrefix);
      UserItems.MapPost("/auth/signin", this.SignIn);
      UserItems.MapPost("/auth/signup", this.CreateUser);

      UserItems.MapGet("/", this.GetAllUsers).AddEndpointFilter(this.RequireAuthFilter(ADMIN_ROLE));
      UserItems.MapGet("/{id}", this.GetUser).AddEndpointFilter(this.RequireAuthFilter(ADMIN_ROLE));
      UserItems.MapPost("/", this.CreateUser).AddEndpointFilter(this.RequireAuthFilter(ADMIN_ROLE));
      UserItems.MapPut("/{id}", this.UpdateUser).AddEndpointFilter(this.RequireAuthFilter(ADMIN_ROLE));
      UserItems.MapDelete("/{id}", this.DeleteUser).AddEndpointFilter(this.RequireAuthFilter(ADMIN_ROLE));

      return this;
    }

    public FilterHandler RequireAuthFilter(params string[] roles)
    {
      return async (EndpointFilterInvocationContext context, EndpointFilterDelegate next) =>
      {
        string? token = context.HttpContext.Request.Headers["Auth"];
        if(token == null) return TypedResults.Unauthorized();

        int? userId = this.tokenAssignments.GetValueOrDefault(token, -1);
        if(userId == null || userId == -1) return TypedResults.Unauthorized();

        if(roles.Length > 0) {
          var (user, err) = await _getUser((int) userId);
          if (err != null) return TypedResults.Problem(err.Message);
          if (user == null) return TypedResults.Unauthorized();
          if(!roles.Any(role => user?.Role == role)) return TypedResults.Forbid();
        }

        return await next(context);
      };
    }

    public FilterHandler RequireAdminOnly() => RequireAuthFilter(ADMIN_ROLE);
    public FilterHandler RequireUserOnly() => RequireAuthFilter(USER_ROLE);
    public FilterHandler RequireAuth() => RequireAuthFilter();


    private string addUserToken(UserDTOFull user) {
      var token = this.hashGenerator.GetRandomToken(20);

      while(this.tokenAssignments.ContainsKey(token)) {
        token = this.hashGenerator.GetRandomToken(20);
      }

      this.tokenAssignments[token] = user.Id;
      return token;
    }

    public async Task<IResult> SignIn(UserDTOPost inputUser)
    {
      Exception? err;
      (var user, err) = await _getUserByLogin(inputUser.Login);
      if (err != null) return TypedResults.Problem(err.Message);
      if (user == null) return TypedResults.ValidationProblem(new Dictionary<string, string[]>{
        {"login", ["User does not exist."]}
      });

      var hash = this.hashGenerator.getHash(inputUser.Password);
      if(hash != user?.PasswordHash) return TypedResults.ValidationProblem(new Dictionary<string, string[]>{
        {"login", ["Incorrect login or password."]},
        {"password", ["Incorrect login or password."]},
      });

      UserDTOFull u = (UserDTOFull) user;
      string token = addUserToken((UserDTOFull) user);
      return TypedResults.Ok(new LoginResponse{
        Token = token,
        User = new UserDTO{
          Id = u.Id,
          Login = u.Login,
          Role = u.Role,
        }
      });
    }

    Task<(List<UserDTO>, Exception?)> _getUsers() => db.RunQueryScoped(
      @$"SELECT id, login, role FROM users WHERE role = '{USER_ROLE}'",
      UserDTO.Parse
    );

    public async Task<IResult> GetAllUsers()
    {
      var (data, err) = await _getUsers();
      if (err != null) return TypedResults.Problem(err.Message);
      return TypedResults.Ok(data);
    }

    async Task<(UserDTOFull?, Exception?)> _getUser(int id)
    {
      var (data, err) = await db.RunQueryScopedSingle(
        @$"SELECT id, login, role, passwordHash FROM users WHERE id = {id}",
        UserDTOFull.Parse
      );
      if (err != null) return (null, err);
      return (data, null);
    }

    async Task<(UserDTOFull?, Exception?)> _getUserByLogin(string login)
    {
      var (data, err) = await db.RunQueryScopedSingle(
        @$"SELECT id, login, role, passwordHash FROM users WHERE login = '{login}'",
        UserDTOFull.Parse
      );
      if (err != null) return (null, err);
      return (data, null);
    }

    async Task<(bool?, Exception?)> _userExists(int id)
    {
      var (data, err) = await db.RunQueryScopedSingle(
        @$"SELECT TRUE FROM users WHERE id = {id}",
        (reader) => reader.GetBoolean(0)
      );
      if (err != null) return (null, err);
      return (data, null);
    }

    async Task<(bool?, Exception?)> _userExistsByLogin(string login)
    {
      var (data, err) = await db.RunQueryScopedSingle(
        @$"SELECT TRUE FROM users WHERE login = '{login}'",
        (reader) => reader.GetBoolean(0)
      );
      if (err != null) return (null, err);
      return (data, null);
    }

    public async Task<IResult> GetUser(int id)
    {
      var (data, err) = await _getUser(id);
      if (err != null) return TypedResults.Problem(err.Message);
      if (data == null) return TypedResults.NotFound();
      return TypedResults.Ok(data);
    }

    public async Task<IResult> CreateUser(UserDTOPost inputUser)
    {
      Exception? err;
      (var exists, err) = await _userExistsByLogin(inputUser.Login);
      if (err != null) return TypedResults.Problem(err.Message);
      if (exists != null) return TypedResults.ValidationProblem(new Dictionary<string, string[]>{
        {"login", ["User already exists"]}
      });

      var hash = this.hashGenerator.getHash(inputUser.Password);
      err = await db.RunNonQueryScoped(@$"
        INSERT INTO users (login, role, passwordHash)
        VALUES ('{inputUser.Login}', '{USER_ROLE}', '{hash}')
      ");
      if (err != null) return TypedResults.Problem(err.Message);
      return TypedResults.Created();
    }

    public async Task<IResult> UpdateUser(int id, UserDTOUpdate inputUser)
    {
      Exception? err;

      (var exists, err) = await _userExists(id);
      if (err != null) return TypedResults.Problem(err.Message);
      if (exists == null) return TypedResults.NotFound();

      (var existingUser, err) = await _getUserByLogin(inputUser.Login);
      if (err != null) return TypedResults.Problem(err.Message);
      if (existingUser != null && existingUser?.Id != id) return TypedResults.ValidationProblem(new Dictionary<string, string[]>{
        {"login", ["User already exists"]}
      });

      var hash = this.hashGenerator.getHash(inputUser.Password);
      err = await db.RunNonQueryScoped(@$"
        UPDATE users
          SET login = '{inputUser.Login}',
              passwordHash = '{hash}'
        WHERE id = {id}
      ");

      if (err != null) return TypedResults.Problem(err.Message);
      return TypedResults.Ok(new UserDTO
      {
        Id = id,
        Login = inputUser.Login,
      });
    }

    public async Task<IResult> DeleteUser(int id)
    {
      var (exists, err) = await _userExists(id);
      if (err != null) return TypedResults.Problem(err.Message);
      if (exists == null) return TypedResults.NotFound();

      err = await db.RunNonQueryScoped(@$"DELETE FROM users WHERE id = {id}");
      if (err != null) return TypedResults.Problem(err.Message);
      return TypedResults.NoContent();
    }
  }
}