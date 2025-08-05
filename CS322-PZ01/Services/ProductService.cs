using Microsoft.Data.Sqlite;
using Utils;
using static Utils.CommonQueries;

namespace Queries.ECommerce.v1.Products
{
  using Queries.ECommerce.v1.Auth;


  record struct CategoryDTOPost(string Name);
  record struct CategoryDTO(int Id, string Name)
  {
    public static CategoryDTO Parse(SqliteDataReader reader) => new CategoryDTO
    {
      Id = reader.GetInt32(0),
      Name = reader.GetString(1)
    };
  }

  record struct ProductSmallDTO(
    int Id,
    string Name,
    string Description,
    double Price,
    string ImageUrl,
    List<int>? CategoryIds = null
  )
  {
    public static ProductSmallDTO Parse(SqliteDataReader reader) => new ProductSmallDTO
    {
      Id = reader.GetInt32(0),
      Name = reader.GetString(1),
      Description = reader.GetString(2),
      Price = reader.GetDouble(3),
      ImageUrl = reader.GetString(4),
    };
  }

  record struct ProductFullDTO(
    int Id,
    string Name,
    string Description,
    string DescriptionLong,
    double Price,
    string ImageUrl,
    List<string>? ImageUrls = null,
    List<int>? CategoryIds = null
  )
  {
    public static ProductFullDTO Parse(SqliteDataReader reader) => new ProductFullDTO
    {
      Id = reader.GetInt32(0),
      Name = reader.GetString(1),
      Description = reader.GetString(2),
      DescriptionLong = reader.GetString(3),
      Price = reader.GetDouble(4),
      ImageUrl = reader.GetString(5),
    };
  }

  record struct ProductFullDTOPost(
    string Name,
    string Description,
    string DescriptionLong,
    double Price,
    string ImageUrl,
    List<string>? ImageUrls = null,
    List<int>? CategoryIds = null
  );

  public class ProductService : Service
  {
    private SQLiteDB db;
    private string groupPrefix;
    private AuthService authService;

    public ProductService(string groupPrefix, AuthService authService)
    {
      this.authService = authService;
      this.groupPrefix = groupPrefix;
      this.db = new SQLiteDB("products_data.db");
    }

    public async Task InitService()
    {
      Console.WriteLine("Creating Products DB...");
      this.db.ClearDB();

      var err = await db.RunNonQueryScoped(@"
        CREATE TABLE categories (
          category_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        );

        CREATE TABLE products (
          product_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          descriptionLong TEXT NOT NULL,
          price REAL NOT NULL,
          imageUrl TEXT NOT NULL
        );

        CREATE TABLE product_categories (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,

          FOREIGN KEY (product_id)
            REFERENCES products (product_id)
            ON DELETE CASCADE
            ON UPDATE CASCADE,

          FOREIGN KEY (category_id)
            REFERENCES categories (category_id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
        );

        CREATE TABLE product_images (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          url TEXT NOT NULL,

          FOREIGN KEY (product_id)
            REFERENCES products (product_id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
        );
      ");
      if (err != null) throw err;

      if ((err = await addCategories()) != null) throw err;
      if ((err = await addProducts()) != null) throw err;
      if ((err = await addCategoryRelations()) != null) throw err;
      if ((err = await addProductImages()) != null) throw err;
    }

    private Task<Exception?> addCategories()
    {
      return db.RunNonQueryScopedMultiple([
        new CategoryDTO(1, "Electonics"),
        new CategoryDTO(2, "Clothes"),
        new CategoryDTO(3, "Home Appliances"),
      ], (category) => @$"INSERT INTO categories (category_id, name) VALUES ({category.Id}, '{category.Name}')");
    }

    private Task<Exception?> addProducts()
    {
      return db.RunNonQueryScopedMultiple([
        new ProductFullDTO{
          Id = 2,
          Name = "Laptop",
          Description = "15-inch laptop with 16GB RAM and 512GB SSD",
          DescriptionLong = "15-inch laptop with 16GB RAM and 512GB SSD, built to handle intensive tasks like video editing, graphic design, and gaming. With a stunning Full HD display and a high-end graphics card, this laptop delivers rich visuals and smooth performance. It features an ergonomic keyboard and a responsive touchpad, providing comfort for long work hours. The slim and lightweight design makes it easy to carry.",
          Price= 1023,
          ImageUrl = "https://picsum.photos/300?random=2",
        },
        new ProductFullDTO{
          Id = 4,
          Name = "Smartwatch",
          Description = "Smartwatch with heart rate monitor and fitness tracking",
          DescriptionLong = "Smartwatch with heart rate monitor, fitness tracking, and GPS, making it an essential accessory for fitness enthusiasts. It monitors various activities such as walking, running, and cycling, while also tracking sleep patterns. The watch is water-resistant and has a long battery life, ensuring it stays powered through all your activities. It’s compatible with multiple apps for customization.",
          Price = 199.99,
          ImageUrl = "https://picsum.photos/300?random=4",
        },
        new ProductFullDTO{
          Id = 5,
          Name = "Bluetooth Headphones",
          Description = "Noise-cancelling Bluetooth headphones with 20 hours of playtime",
          DescriptionLong = "Noise-cancelling Bluetooth headphones with 20 hours of playtime, ideal for enjoying music or calls in noisy environments. The cushioned ear pads provide comfort for extended use, while the adjustable headband ensures a snug fit. It features easy touch controls for adjusting volume, changing tracks, and answering calls, along with a built-in mic for hands-free communication.",
          Price = 89.99,
          ImageUrl = "https://picsum.photos/300?random=5",
        },
        new ProductFullDTO{
          Id = 6,
          Name = "Gaming Console",
          Description = "Next-gen gaming console with 4K support and 1TB storage",
          DescriptionLong = "Next-gen gaming console with 4K support and 1TB storage, bringing games to life with stunning graphics and high frame rates. It includes a wireless controller with haptic feedback and adaptive triggers, adding a new layer of immersion. The console supports a library of exclusive games and offers backward compatibility with previous generations. Ideal for both casual and hardcore gamers.",
          Price = 499.99,
          ImageUrl = "https://picsum.photos/300?random=6",
        },
        new ProductFullDTO{
          Id = 7,
          Name = "Blender",
          Description = "High-powered blender with multiple speed settings and 1.5L jar",
          DescriptionLong = "High-powered blender with multiple speed settings and a 1.5L jar, designed to handle anything from smoothies to soups. The sharp stainless-steel blades ensure efficient blending, even with tough ingredients like ice or nuts. The blender has a robust motor and a pulse function, giving you precise control over consistency. Easy to clean and ideal for daily use in any kitchen.",
          Price = 49.99,
          ImageUrl = "https://picsum.photos/300?random=7",
        },
        new ProductFullDTO{
          Id = 8,
          Name = "Coffee Maker",
          Description = "Automatic coffee maker with a built-in grinder and milk frother",
          DescriptionLong = "Automatic coffee maker with a built-in grinder and milk frother, perfect for coffee enthusiasts. It grinds beans to your preferred coarseness and brews fresh coffee with a rich aroma. The frother allows for cappuccinos and lattes, making it versatile for various coffee styles. The machine has an intuitive control panel and a timer function for a customized brewing experience.",
          Price = 129.99,
          ImageUrl = "https://picsum.photos/300?random=8",
        },
        new ProductFullDTO{
          Id = 9,
          Name = "Vacuum Cleaner",
          Description = "Cordless vacuum cleaner with a powerful suction system and multiple attachments",
          DescriptionLong = "Cordless vacuum cleaner with a powerful suction system and multiple attachments, suitable for cleaning carpets, hardwood floors, and upholstery. It offers up to 40 minutes of runtime and has a compact design for easy storage. The detachable dust bin allows for quick disposal, and its lightweight build makes it convenient for quick cleanups around the house.",
          Price = 229.99,
          ImageUrl = "https://picsum.photos/300?random=9",
        },
        new ProductFullDTO{
          Id = 10,
          Name = "Air Fryer",
          Description = "Healthy air fryer with rapid air circulation and adjustable temperature control",
          DescriptionLong = "Healthy air fryer with rapid air circulation and adjustable temperature control, designed to make crispy, delicious meals with less oil. With a large capacity basket, it can cook for the whole family. The digital control panel offers easy adjustments, and its non-stick coating makes cleaning effortless. Enjoy fried food with up to 80% less fat than traditional frying.",
          Price = 99.99,
          ImageUrl = "https://picsum.photos/300?random=10",
        },
        new ProductFullDTO{
          Id = 11,
          Name = "Electric Kettle",
          Description = "Fast-boiling electric kettle with temperature control and automatic shut-off",
          DescriptionLong = "Fast-boiling electric kettle with temperature control and automatic shut-off, ideal for tea, coffee, or instant meals. The stainless-steel design is durable and stylish, while the clear water level indicator ensures accurate filling. It has a 1.7L capacity, perfect for multiple cups. The stay-cool handle provides a secure grip, and the kettle is cordless for convenience.",
          Price = 39.99,
          ImageUrl = "https://picsum.photos/300?random=11",
        },
        new ProductFullDTO{
          Id = 12,
          Name = "Running Shoes",
          Description = "Comfortable and durable running shoes with memory foam insoles",
          DescriptionLong = "Comfortable and durable running shoes with memory foam insoles, providing excellent support and cushioning for long runs or everyday use. Made with breathable mesh fabric, they keep your feet cool and dry. The outsole is made of rubber, offering great traction and stability. These shoes are designed to enhance performance while minimizing impact on your joints.",
          Price = 79.99,
          ImageUrl = "https://picsum.photos/300?random=12",
        },
        new ProductFullDTO{
          Id = 13,
          Name = "Jeans",
          Description = "Slim-fit jeans with stretch material and a classic design",
          DescriptionLong = "Slim-fit jeans with stretch material and a classic design, offering a comfortable fit without compromising on style. These jeans are made from durable fabric that withstands wear and tear, making them suitable for both casual and semi-formal occasions. They feature multiple pockets and come in various washes to suit your preference.",
          Price = 39.99,
          ImageUrl = "https://picsum.photos/300?random=13",
        },
        new ProductFullDTO{
          Id = 14,
          Name = "Jacket",
          Description = "Water-resistant jacket with adjustable cuffs and a hood",
          DescriptionLong = "Water-resistant jacket with adjustable cuffs and a hood, ideal for rainy or windy days. The lightweight yet durable material keeps you dry while allowing freedom of movement. It has multiple pockets for storage and a modern design, making it both functional and fashionable. Perfect for outdoor activities or layering over everyday outfits.",
          Price = 89.99,
          ImageUrl = "https://picsum.photos/300?random=14",
        },
        new ProductFullDTO{
          Id = 15,
          Name = "Backpack",
          Description = "Durable and spacious backpack with multiple compartments and padded straps",
          DescriptionLong = "Durable and spacious backpack with multiple compartments and padded straps, perfect for travel or school. It has a laptop compartment, an organizer panel, and mesh pockets for water bottles. The backpack is designed to distribute weight evenly, providing comfort even on long journeys. Made from water-resistant material, it keeps your belongings safe.",
          Price = 59.99,
          ImageUrl = "https://picsum.photos/300?random=15",
        },
        new ProductFullDTO{
          Id = 16,
          Name = "Sweater",
          Description = "Cozy knitted sweater with a stylish design and soft material",
          DescriptionLong = "Cozy knitted sweater with a stylish design and soft material, offering warmth and comfort for cooler weather. Its timeless look pairs well with jeans, skirts, or trousers. The sweater features ribbed cuffs and hem, ensuring a snug fit that retains shape over time. Available in a variety of colors to match any wardrobe.",
          Price = 49.99,
          ImageUrl = "https://picsum.photos/300?random=16",
        },
        new ProductFullDTO{
          Id = 17,
          Name = "Tablet",
          Description = "10-inch tablet with high resolution display and 64GB storage",
          DescriptionLong = "10-inch tablet with high resolution display and 64GB storage, perfect for streaming, reading, or light gaming. With a powerful processor and long battery life, this tablet is ideal for entertainment and productivity on the go. It has a slim and lightweight design, making it easy to carry. Supports both Wi-Fi and Bluetooth for seamless connectivity.",
          Price = 399.99,
          ImageUrl = "https://picsum.photos/300?random=17",
        },
        new ProductFullDTO{
          Id = 18,
          Name = "Portable Speaker",
          Description = "Wireless portable speaker with deep bass and 12 hours of playtime",
          DescriptionLong = "Wireless portable speaker with deep bass and 12 hours of playtime, great for outdoor gatherings or home use. It has a durable, splash-proof design and connects easily to devices via Bluetooth. The speaker provides rich, clear sound and is compact enough to carry anywhere. Perfect for music lovers who want high-quality sound on the go.",
          Price = 59.99,
          ImageUrl = "https://picsum.photos/300?random=18",
        }
      ], (product) => @$"
          INSERT INTO products (product_id, name, description, descriptionLong, price, imageUrl)
          VALUES ({product.Id}, '{product.Name}', '{product.Description}', '{product.DescriptionLong}', {product.Price}, '{product.ImageUrl}')"
      );
    }

    private Task<Exception?> addCategoryRelations()
    {
      return db.RunNonQueryScopedMultiple([
        (2,  1), (4,  2), (4,  3), (5,  1), (5,  2),
        (6,  1), (7,  3), (8,  3), (9,  3), (10, 3),
        (11, 3), (12, 2), (13, 2), (14, 2), (15, 2),
        (16, 2), (17, 1), (18, 1),
      ], (pair, command) =>
      {
        command.CommandText = @$"
          INSERT INTO product_categories (product_id, category_id)
          VALUES ({pair.Item1}, {pair.Item2})";
      });
    }

    private Task<Exception?> addProductImages()
    {
      return db.RunNonQueryScopedMultiple([
        (2, "https://picsum.photos/800?random=1"),
        (2, "https://picsum.photos/800?random=2"),
        (2, "https://picsum.photos/800?random=3"),
        (4, "https://picsum.photos/800?random=1"),
        (4, "https://picsum.photos/800?random=2"),
        (4, "https://picsum.photos/800?random=3"),
        (5, "https://picsum.photos/800?random=1"),
        (5, "https://picsum.photos/800?random=2"),
        (5, "https://picsum.photos/800?random=3"),
        (6, "https://picsum.photos/800?random=1"),
        (6, "https://picsum.photos/800?random=2"),
        (6, "https://picsum.photos/800?random=3"),
        (7, "https://picsum.photos/800?random=1"),
        (7, "https://picsum.photos/800?random=2"),
        (7, "https://picsum.photos/800?random=3"),
        (8, "https://picsum.photos/800?random=1"),
        (8, "https://picsum.photos/800?random=2"),
        (8, "https://picsum.photos/800?random=3"),
        (9, "https://picsum.photos/800?random=1"),
        (9, "https://picsum.photos/800?random=2"),
        (9, "https://picsum.photos/800?random=3"),
        (10, "https://picsum.photos/800?random=11"),
        (10, "https://picsum.photos/800?random=12"),
        (10, "https://picsum.photos/800?random=13"),
        (11, "https://picsum.photos/800?random=11"),
        (11, "https://picsum.photos/800?random=12"),
        (11, "https://picsum.photos/800?random=13"),
        (12, "https://picsum.photos/800?random=11"),
        (12, "https://picsum.photos/800?random=12"),
        (12, "https://picsum.photos/800?random=13"),
        (13, "https://picsum.photos/800?random=11"),
        (13, "https://picsum.photos/800?random=12"),
        (13, "https://picsum.photos/800?random=13"),
        (14, "https://picsum.photos/800?random=11"),
        (14, "https://picsum.photos/800?random=12"),
        (14, "https://picsum.photos/800?random=13"),
        (15, "https://picsum.photos/800?random=11"),
        (15, "https://picsum.photos/800?random=12"),
        (15, "https://picsum.photos/800?random=13"),
        (16, "https://picsum.photos/800?random=11"),
        (16, "https://picsum.photos/800?random=12"),
        (16, "https://picsum.photos/800?random=13"),
        (17, "https://picsum.photos/800?random=11"),
        (17, "https://picsum.photos/800?random=12"),
        (17, "https://picsum.photos/800?random=13"),
        (18, "https://picsum.photos/800?random=11"),
        (18, "https://picsum.photos/800?random=12"),
        (18, "https://picsum.photos/800?random=13"),
      ], (pair, command) =>
      {
        command.CommandText = @$"
          INSERT INTO product_images (product_id, url)
          VALUES ({pair.Item1}, '{pair.Item2}')";
      });
    }


    public Service BindApp(WebApplication app)
    {
      var categoryAPI = app.MapGroup(groupPrefix + "/categories");

      categoryAPI.MapGet("/", this.GetAllCategories);
      categoryAPI.MapGet("/{id}", this.GetCategory);
      categoryAPI.MapPost("/", this.CreateCategory).AddEndpointFilter(this.authService.RequireAdminOnly());
      categoryAPI.MapPut("/{id}", this.UpdateCategory).AddEndpointFilter(this.authService.RequireAdminOnly());
      categoryAPI.MapDelete("/{id}", this.DeleteCategory).AddEndpointFilter(this.authService.RequireAdminOnly());

      var productAPI = app.MapGroup(groupPrefix + "/products");

      productAPI.MapGet("/", this.GetAllProducts);
      productAPI.MapGet("/{id}", this.GetProduct);
      productAPI.MapPost("/", this.CreateProduct).AddEndpointFilter(this.authService.RequireAdminOnly());
      productAPI.MapPut("/{id}", this.UpdateProduct).AddEndpointFilter(this.authService.RequireAdminOnly());
      productAPI.MapDelete("/{id}", this.DeleteProduct).AddEndpointFilter(this.authService.RequireAdminOnly());

      return this;
    }


    Task<(List<CategoryDTO>, Exception?)> _getCategories() => db.RunQueryScoped(
      @"SELECT category_id, name FROM categories",
      CategoryDTO.Parse
    );
    async Task<IResult> GetAllCategories()
    {
      var (data, err) = await _getCategories();
      if (err != null) return TypedResults.Problem(err.Message);
      return TypedResults.Ok(data);
    }


    async Task<(CategoryDTO?, Exception?)> _getCategory(int id)
    {
      var (data, err) = await db.RunQueryScopedSingle(
        @$"SELECT category_id, name FROM categories WHERE category_id = {id}",
        CategoryDTO.Parse
      );
      if (err != null) return (null, err);
      return (data, null);
    }
    async Task<IResult> GetCategory(int id)
    {
      var (data, err) = await _getCategory(id);
      if (err != null) return TypedResults.Problem(err.Message);
      if (data == null) return TypedResults.NotFound();
      return TypedResults.Ok(data);
    }


    async Task<IResult> CreateCategory(CategoryDTOPost Category)
    {
      var err = await db.RunNonQueryScoped(
        @$"
          INSERT INTO categories (name)
          VALUES ('{Category.Name}')
        "
      );
      if (err != null) return TypedResults.Problem(err.Message);
      return TypedResults.Created();
    }


    async Task<IResult> UpdateCategory(int id, CategoryDTOPost inputCategory)
    {
      var err = await db.RunNonQueryScoped(
        @$"
          UPDATE categories
            SET name = '{inputCategory.Name}'
          WHERE category_id = {id}
        ");

      if (err != null) return TypedResults.Problem(err.Message);
      return TypedResults.Ok(new CategoryDTO
      {
        Id = id,
        Name = inputCategory.Name,
      });
    }


    async Task<IResult> DeleteCategory(int id)
    {
      var (category, err) = await _getCategory(id);
      if (err != null) return TypedResults.Problem(err.Message);
      if (category == null) return TypedResults.NotFound();

      err = await db.RunNonQueryScoped(
        @$"DELETE FROM categories WHERE category_id = {id}");

      if (err != null) return TypedResults.Problem(err.Message);
      return TypedResults.NoContent();
    }

    Task<(List<int>, Exception?)> _getProductCategories(int id) => db.RunQueryScoped(
      @$"
        SELECT product_categories.category_id
        FROM products
          INNER JOIN product_categories ON products.product_id = product_categories.product_id
        WHERE products.product_id = {id}
      ",
      (reader) => reader.GetInt32(0)
    );

    Task<(List<string>, Exception?)> _getProductImages(int id) => db.RunQueryScoped(
      @$"
        SELECT product_images.url
        FROM products
          INNER JOIN product_images ON products.product_id = product_images.product_id
        WHERE products.product_id = {id}
      ",
      (reader) => reader.GetString(0)
    );

    Task<(List<ProductSmallDTO>, Exception?)> _getProducts() => db.RunQueryScoped(
      @"SELECT product_id, name, description, price, imageUrl FROM products",
      ProductSmallDTO.Parse
    );

    async Task<(ProductFullDTO?, Exception?)> _getProduct(int id)
    {
      var (productData, product_err) = await db.RunQueryScopedSingle(
        @$"
          SELECT product_id, name, description, descriptionLong, price, imageUrl
          FROM products
          WHERE product_id = {id}
        ",
        ProductFullDTO.Parse
      );

      if (product_err != null) return (null, product_err);
      if (productData == null) return (null, null);

      ProductFullDTO product = (ProductFullDTO)productData;
      product.CategoryIds = [];
      product.ImageUrls = [];

      var (productCategories, categories_err) = await _getProductCategories(id);
      if (categories_err != null) return (product, categories_err);
      product.CategoryIds = productCategories;

      var (productImages, images_err) = await _getProductImages(id);
      if (images_err != null) return (product, images_err);
      product.ImageUrls = productImages;

      return (product, null);
    }

    Task<(bool?, Exception?)> _productExists(int id) => db.RunQueryScopedSingle(
      @$"SELECT 1 FROM products WHERE product_id = {id}",
      reader => true
    );


    async Task<IResult> GetAllProducts()
    {
      var (data, err) = await _getProducts();
      if (err != null) return TypedResults.Problem(err.Message);

      ProductSmallDTO[] enriched = await Task.WhenAll(data.Select(
        async (product) =>
        {
          var (categoryIds, err) = await _getProductCategories(product.Id);

          if (err == null) product.CategoryIds = categoryIds;
          else Console.WriteLine(err);

          return product;
        }
      ));

      return TypedResults.Ok(enriched);
    }


    async Task<IResult> GetProduct(int id)
    {
      var (data, err) = await _getProduct(id);

      if (err == null && data == null) return TypedResults.NotFound();
      if (err == null && data != null) return TypedResults.Ok(data);

      if (err != null) Console.WriteLine(err);
      if (data != null) return TypedResults.Ok(data);

      return TypedResults.Problem(err?.Message);
    }


    async Task<Exception?> AddCategories(int productId, List<int>? categoryIds)
    {
      if (categoryIds == null) return null;
      return await db.RunNonQueryScopedMultiple(
        categoryIds,
        (categoryId, command) => command.CommandText = @$"
          INSERT INTO product_categories (product_id, category_id)
          VALUES ({productId}, {categoryId})"
      );
    }

    async Task<Exception?> AddImages(int productId, List<string>? urls)
    {
      if (urls == null) return null;
      return await db.RunNonQueryScopedMultiple(
        urls,
        (url, command) => command.CommandText = @$"
          INSERT INTO product_images (product_id, url)
          VALUES ({productId}, '{url}')
        "
      );
    }

    async Task<Exception?> DeleteCategories(int productId)
    {
      return await db.RunNonQueryScoped(@$"DELETE FROM product_categories WHERE product_id = {productId}");
    }

    async Task<Exception?> DeleteImages(int productId)
    {
      return await db.RunNonQueryScoped(@$"DELETE FROM product_images WHERE product_id = {productId}");
    }

    async Task<IResult> CreateProduct(ProductFullDTOPost inputProduct)
    {
      Exception? err;
      err = await db.RunNonQueryScoped(
        @$"
          INSERT INTO products (name, description, descriptionLong, price, imageUrl)
          VALUES ('{inputProduct.Name}', '{inputProduct.Description}', '{inputProduct.DescriptionLong}', {inputProduct.Price}, '{inputProduct.ImageUrl}')"
      );
      if (err != null) return TypedResults.Problem(err.Message);

      (var productId, err) = await SelectLastInsertedRowId(db);
      if (err != null || productId == null) return TypedResults.Problem(err?.Message);

      err = await AddCategories((int)productId, inputProduct.CategoryIds);
      if (err != null) return TypedResults.Problem(err.Message);

      err = await AddImages((int)productId, inputProduct.ImageUrls);
      if (err != null) return TypedResults.Problem(err.Message);

      return TypedResults.Created();
    }


    async Task<IResult> UpdateProduct(int id, ProductFullDTOPost inputProduct)
    {
      Exception? err;
      err = await db.RunNonQueryScoped(@$"
        UPDATE products
          SET name = '{inputProduct.Name}',
              description = '{inputProduct.Description}',
              descriptionLong = '{inputProduct.DescriptionLong}',
              price = {inputProduct.Price},
              imageUrl = '{inputProduct.ImageUrl}'
          WHERE product_id = {id}
      ");
      Console.WriteLine($"Updating product {id}");
      if (err != null) return TypedResults.Problem(err.Message);

      Console.WriteLine($"Updating product {id} - delete categories");
      err = await DeleteCategories(id);
      if (err != null) return TypedResults.Problem(err.Message);

      Console.WriteLine($"Updating product {id} - add categories");
      err = await AddCategories(id, inputProduct.CategoryIds);
      if (err != null) return TypedResults.Problem(err.Message);

      return TypedResults.Ok(new ProductFullDTO
      {
        Id = id,
        Name = inputProduct.Name,
        Description = inputProduct.Description,
        DescriptionLong = inputProduct.DescriptionLong,
        Price = inputProduct.Price,
        ImageUrl = inputProduct.ImageUrl,
        ImageUrls = inputProduct.ImageUrls,
        CategoryIds = inputProduct.CategoryIds,
      });
    }

    async Task<IResult> DeleteProduct(int id)
    {
      var (ex, err) = await _productExists(id);
      if (err != null) return TypedResults.Problem(err.Message);
      if (ex == null) return TypedResults.NotFound();

      err = await db.RunNonQueryScoped(
        @$"DELETE FROM products WHERE product_id = {id}");

      if (err != null) return TypedResults.Problem(err.Message);
      return TypedResults.NoContent();
    }
  }
}
