using System.Security.Cryptography;
using System.Text;


namespace Utils {
  public class Hash
  {
    private string secret;
    private Random random = new();
    
    public Hash(string secret) => this.secret = secret;

    public string getHash(string text)
    {
      byte[] bytes = Encoding.UTF8.GetBytes(text + secret);
      var hashstring = SHA256.Create();
      byte[] hash = hashstring.ComputeHash(bytes);
      var hashString = new StringBuilder();

      foreach (byte x in hash)
        hashString.Append(string.Format("{0:x2}", x));

      return hashString.ToString();
    }

    public string GetRandomToken(int digits)
    {
        byte[] buffer = new byte[digits / 2];
        random.NextBytes(buffer);
        string result = String.Concat(buffer.Select(x => x.ToString("X2")).ToArray());
        if (digits % 2 == 0)
            return result;
        return result + random.Next(16).ToString("X");
    }

  }
}
