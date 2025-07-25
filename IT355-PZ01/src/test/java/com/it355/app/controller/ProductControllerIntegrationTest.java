package com.it355.app.controller;

import com.it355.app.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// For full MVC testing with DB we use @SpringBootTest.
// @AutoConfigureMockMvc works best with @SpringBootTest.

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test") // Using application-test.properties configuration, so that we will use H2 in-memory DB
public class ProductControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private ProductImageRepository productImageRepository;
    @Autowired
    private ReviewRepository reviewRepository;
    @Autowired
    private CommentRepository commentRepository;

    private Category testCategory;

    @BeforeEach
    void setUp() {
        commentRepository.deleteAllInBatch();
        reviewRepository.deleteAllInBatch();
        productImageRepository.deleteAllInBatch();
        productRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();

        // Setup a common category for tests
        testCategory = new Category(null, "Electronics", "Devices and gadgets", new ArrayList<Product>());
        testCategory = categoryRepository.save(testCategory);
        categoryRepository.flush();
    }

    @Test
    void viewProductDetails_ShouldThrowExceptionIfProductNotFound() throws Exception {
        mockMvc.perform(get("/products/details/{id}", 9999)) // Non-existent ID
                .andExpect(status().isInternalServerError()) // By default, uncaught exceptions return 500
                .andExpect(result -> assertTrue(result.getResolvedException() instanceof IllegalArgumentException))
                .andExpect(
                        result -> assertEquals("Invalid product Id:9999", result.getResolvedException().getMessage()));
    }

    @Test
    void listProducts_ShouldReturnProductListPageWithProducts() throws Exception {
        Product p1 = new Product(null, "Laptop", "Powerful laptop", BigDecimal.valueOf(1200.00), 10, testCategory,
                new ArrayList<ProductImage>(), new ArrayList<Review>());
        Product p2 = new Product(null, "Mouse", "Wireless mouse", BigDecimal.valueOf(25.00), 50, testCategory,
                new ArrayList<ProductImage>(), new ArrayList<Review>());
        productRepository.save(p1);
        productRepository.save(p2);

        mockMvc.perform(get("/products/"))
                .andExpect(status().isOk())
                .andExpect(view().name("product_list"))
                .andExpect(model().attributeExists("products"))
                .andExpect(model().attribute("products", hasSize(2)))
                .andExpect(model().attribute("products", hasItem(hasProperty("name", is("Laptop")))))
                .andExpect(model().attribute("products", hasItem(hasProperty("name", is("Mouse")))));
    }

    @Test
    void newProductForm_ShouldReturnProductFormWithCategories() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/products/new"))
                .andExpect(status().isOk())
                .andExpect(view().name("product_form"))
                .andExpect(model().attributeExists("product"))
                .andExpect(model().attribute("product", hasProperty("price", is(BigDecimal.ZERO))))
                .andExpect(model().attributeExists("categories"))
                .andExpect(model().attribute("categories", hasSize(1))) // Only testCategory initially
                .andExpect(model().attribute("categories", hasItem(hasProperty("name", is("Electronics")))));
    }

    @Test
    void saveProduct_ShouldSaveNewProductAndImagesSuccessfully() throws Exception {
        // Arrange
        String productName = "New Smartphone";
        String productDescription = "Latest model smartphone";
        BigDecimal productPrice = BigDecimal.valueOf(999.99);
        Integer stockQuantity = 20;
        List<String> imageUrls = Arrays.asList("http://image.com/phone1.jpg", "http://image.com/phone2.jpg");

        // Act
        mockMvc.perform(post("/products/save")
                .param("name", productName)
                .param("description", productDescription)
                .param("price", productPrice.toString())
                .param("stockQuantity", stockQuantity.toString())
                .param("category.id", testCategory.getId().toString())
                .param("imageUrls", imageUrls.get(0), imageUrls.get(1))) // Pass multiple values for imageUrls
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/products/"));

        // Assert from DB
        List<Product> products = productRepository.findAll();
        assertEquals(1, products.size());
        Product savedProduct = products.get(0);
        assertEquals(productName, savedProduct.getName());
        assertEquals(testCategory.getId(), savedProduct.getCategory().getId());

        List<ProductImage> images = productImageRepository.findByProductId(savedProduct.getId());
        assertEquals(2, images.size());
        assertTrue(images.stream().anyMatch(img -> img.getImageUrl().equals("http://image.com/phone1.jpg")));
        assertTrue(images.stream().anyMatch(img -> img.getImageUrl().equals("http://image.com/phone2.jpg")));
    }

    @Test
    void saveProduct_ShouldUpdateExistingProductAndReplaceImagesSuccessfully() throws Exception {
        // Arrange
        Product existingProduct = new Product(null, "Old Laptop", "Old description", BigDecimal.valueOf(1000.00), 5, testCategory, new ArrayList<ProductImage>(), new ArrayList<Review>());
        existingProduct = productRepository.save(existingProduct);

        ProductImage oldImage = new ProductImage(null, existingProduct, "http://old.com/image.jpg", "Old laptop image");
        productImageRepository.save(oldImage);

        String updatedName = "Updated Laptop";
        BigDecimal updatedPrice = BigDecimal.valueOf(1100.00);
        List<String> newImageUrls = Arrays.asList("http://new.com/image1.jpg", "http://new.com/image2.jpg");

        // Act
        mockMvc.perform(post("/products/save")
                        .param("id", existingProduct.getId().toString())
                        .param("name", updatedName)
                        .param("description", "Updated description")
                        .param("price", updatedPrice.toString())
                        .param("stockQuantity", "7")
                        .param("category.id", testCategory.getId().toString())
                        .param("imageUrls", newImageUrls.get(0), newImageUrls.get(1)))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/products/"));

        // Assert from DB
        Optional<Product> updatedProductOpt = productRepository.findById(existingProduct.getId());
        assertTrue(updatedProductOpt.isPresent());
        Product updatedProduct = updatedProductOpt.get();
        assertEquals(updatedName, updatedProduct.getName());
        assertEquals(updatedPrice, updatedProduct.getPrice());

        List<ProductImage> images = productImageRepository.findByProductId(updatedProduct.getId());
        assertEquals(2, images.size());
        assertFalse(images.stream().anyMatch(img -> img.getImageUrl().equals("http://old.com/image.jpg"))); // Old image should be gone
        assertTrue(images.stream().anyMatch(img -> img.getImageUrl().equals("http://new.com/image1.jpg")));
        assertTrue(images.stream().anyMatch(img -> img.getImageUrl().equals("http://new.com/image2.jpg")));
    }

    @Test
    void saveProduct_ShouldHandleNoImageUrlsProvidedOnUpdate() throws Exception {
        // Arrange
        Product existingProduct = new Product(null, "Tablet", "Description", BigDecimal.valueOf(500.00), 5,
                testCategory, new ArrayList<ProductImage>(), new ArrayList<Review>());
        existingProduct = productRepository.save(existingProduct);
        ProductImage oldImage = new ProductImage(null, existingProduct, "http://old.com/tablet.jpg", "Tablet image");
        productImageRepository.save(oldImage);

        // Act (no imageUrls parameter)
        mockMvc.perform(post("/products/save")
                .param("id", existingProduct.getId().toString())
                .param("name", "Updated Tablet")
                .param("description", "Updated description")
                .param("price", "550.00")
                .param("stockQuantity", "6")
                .param("category.id", testCategory.getId().toString())) // No image param provided will be considered as
                                                                        // no change
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/products/"));

        List<ProductImage> images = productImageRepository.findByProductId(existingProduct.getId());
        assertFalse(images.isEmpty()); // Existing images should still exist
    }

    @Test
    void saveProduct_ShouldHandleEmptyImageUrlsProvidedOnUpdate() throws Exception {
        // Arrange
        Product existingProduct = new Product(null, "Keyboard", "Description", BigDecimal.valueOf(100.00), 10,
                testCategory, new ArrayList<ProductImage>(), new ArrayList<Review>());
        existingProduct = productRepository.save(existingProduct);
        ProductImage oldImage = new ProductImage(null, existingProduct, "http://old.com/keyboard.jpg",
                "Keyboard image");
        productImageRepository.save(oldImage);

        // Act (empty imageUrls parameter)
        mockMvc.perform(post("/products/save")
                .param("id", existingProduct.getId().toString())
                .param("name", "Updated Keyboard")
                .param("description", "Updated description")
                .param("price", "110.00")
                .param("stockQuantity", "12")
                .param("category.id", testCategory.getId().toString())
                .param("imageUrls", "")) // Pass an empty string for imageUrls
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/products/"));

        List<ProductImage> images = productImageRepository.findByProductId(existingProduct.getId());
        assertTrue(images.isEmpty()); // Existing images should be deleted
    }

    @Test
    void editProductForm_ShouldLoadProductAndCategoriesAndReturnViewName() throws Exception {
        // Arrange
        Product product = new Product(null, "Test Product", "Test Desc", BigDecimal.ONE, 1, testCategory,
                new ArrayList<ProductImage>(), new ArrayList<Review>());
        product = productRepository.save(product);

        // Act & Assert
        mockMvc.perform(get("/products/edit/{id}", product.getId()))
                .andExpect(status().isOk())
                .andExpect(view().name("product_form"))
                .andExpect(model().attributeExists("product"))
                .andExpect(model().attribute("product", hasProperty("name", is("Test Product"))))
                .andExpect(model().attributeExists("categories"))
                .andExpect(model().attribute("categories", hasSize(1)));
    }

    @Test
    void editProductForm_ShouldErrorIfNotFound() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/products/edit/{id}", 9999)) // Non-existent ID
                .andExpect(status().isInternalServerError()) // By default, uncaught exceptions return 500
                .andExpect(result -> assertTrue(result.getResolvedException() instanceof IllegalArgumentException))
                .andExpect(
                        result -> assertEquals("Invalid product Id:9999", result.getResolvedException().getMessage()));
    }

    @Test
    void deleteProduct_ShouldDeleteProductAndAssociatedEntities() throws Exception {
        // Arrange
        Product product = new Product(null, "Deletable Product", "Desc", BigDecimal.TEN, 5, testCategory, null, null);
        product = productRepository.save(product);
        productRepository.flush();
        
        Review review1 = new Review(null, product, "User1", 5, "Great product!", null);
        Review review2 = new Review(null, product, "User2", 3, "Okay.", null);

        if (product.getReviews() == null) {
            product.setReviews(new ArrayList<>());
        }
        product.getReviews().add(review1);
        product.getReviews().add(review2);
        
        reviewRepository.saveAll(Arrays.asList(review1, review2));

        ProductImage img1 = new ProductImage(null, product, "http://del.com/img1.jpg", "Img 1");
        if (product.getImages() == null) {
            product.setImages(new ArrayList<>());
        }
        product.getImages().add(img1);
        
        productImageRepository.save(img1);

        reviewRepository.flush();
        productImageRepository.flush();

        // Act
        mockMvc.perform(get("/products/delete/{id}", product.getId()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/products/"));

        // Assert
        assertFalse(productRepository.findById(product.getId()).isPresent());
        assertTrue(reviewRepository.findByProductId(product.getId()).isEmpty());
        assertTrue(productImageRepository.findByProductId(product.getId()).isEmpty());
    }

    @Test
    void viewProductDetails_ShouldReturnDetailsPageWithProductReviewsAndImages() throws Exception {
        // Arrange
        Product product = new Product(null, "Detail Product", "Full description", BigDecimal.valueOf(50.00), 10,
                testCategory, new ArrayList<ProductImage>(), new ArrayList<Review>());
        product = productRepository.save(product);
        productRepository.flush();

        Review review = new Review(null, product, "John Doe", 4, "Very good.", new ArrayList<>());
        reviewRepository.save(review);
        reviewRepository.flush();

        ProductImage image = new ProductImage(null, product, "http://detail.com/image.jpg", "Product detail image");
        productImageRepository.save(image);
        productImageRepository.flush();

        // Act & Assert
        mockMvc.perform(get("/products/details/{id}", product.getId()))
                .andExpect(status().isOk())
                .andExpect(view().name("product_details"))
                .andExpect(model().attributeExists("product", "reviews", "images"))
                .andExpect(model().attribute("product", hasProperty("name", is("Detail Product"))))
                .andExpect(model().attribute("reviews", hasSize(1)))
                .andExpect(model().attribute("reviews", hasItem(hasProperty("reviewerName", is("John Doe")))))
                .andExpect(model().attribute("images", hasSize(1)))
                .andExpect(model().attribute("images",
                        hasItem(hasProperty("imageUrl", is("http://detail.com/image.jpg")))));
    }
}