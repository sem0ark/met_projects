namespace Utils {
  public interface Service {
    public Task InitService();
    public Service BindApp(WebApplication app);
  }
}

