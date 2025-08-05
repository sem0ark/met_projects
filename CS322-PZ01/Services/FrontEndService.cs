using Microsoft.Data.Sqlite;
using Utils;

namespace Queries.ECommerce.v1.FrontEnd {

  public class FrontEndService : Service {

    public FrontEndService() {}

    public async Task InitService() { }

    public Service BindApp(WebApplication app) {
      app.MapGet("/", async context => context.Response.Redirect("/index.html"));
      return this;
    }
  }
}