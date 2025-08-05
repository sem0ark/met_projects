using Queries.ECommerce.v1.Auth;
using Queries.ECommerce.v1.FrontEnd;
using Queries.ECommerce.v1.Products;
using Queries.ECommerce.v1.Todos;

public static class Program {
  public static async Task Main(string[] args) {
    var builder = WebApplication.CreateBuilder(args);

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddOpenApiDocument(config =>
    {
      config.DocumentName = "TodoAPI";
      config.Title = "TodoAPI v1";
      config.Version = "v1";
    });

    var app = builder.Build();
    

    var config =
    new ConfigurationBuilder()
        .SetBasePath(Directory.GetCurrentDirectory())
        .AddJsonFile(
            app.Environment.IsDevelopment()
            ? "appsettings.Development.json"
            : "appsettings.json", true)
        .AddEnvironmentVariables()
        .Build();

    app.UseStaticFiles();

    if (app.Environment.IsDevelopment())
    {
      app.UseOpenApi();
      app.UseSwaggerUi(config =>
      {
        config.DocumentTitle = "TodoAPI";
        config.Path = "/swagger";
        config.DocumentPath = "/swagger/{documentName}/swagger.json";
        config.DocExpansion = "list";
      });
    }

    var authService = new AuthService("/api/users", Environment.GetEnvironmentVariable("Secret") ?? "default");
    var frontendService = new FrontEndService();
    var todoService = new TodoService("/api/todoitems");
    var productService = new ProductService("/api/app", authService);

    await Task.WhenAll([
      frontendService.BindApp(app).InitService(),
      todoService.BindApp(app).InitService(),
      productService.BindApp(app).InitService(),
      authService.BindApp(app).InitService(),
    ]);
    app.Run();
  }
}