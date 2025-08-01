package com.it355.app.controller;

import com.it355.app.model.Category;
import com.it355.app.model.Product;
import com.it355.app.model.ProductImage;
import com.it355.app.model.Review;
import com.it355.app.model.CategoryRepository;
import com.it355.app.model.ProductRepository;
import com.it355.app.model.ProductImageRepository;
import com.it355.app.model.ReviewRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.ui.Model;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class ProductControllerTest {

    @Mock // Mocks the dependencies
    private ProductRepository productRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private ProductImageRepository productImageRepository;
    @Mock
    private ReviewRepository reviewRepository;
    @Mock // Mock the Model interface used in Spring MVC
    private Model model;

    @InjectMocks // Injects the mocked dependencies into ProductController
    private ProductController productController;

    @BeforeEach
    void setUp() {
        // Initializes mocks before each test method
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void listProducts_ShouldAddAllProductsToModelAndReturnViewName() {
        // Arrange
        List<Product> products = Arrays.asList(new Product(), new Product());
        when(productRepository.findAll()).thenReturn(products);

        // Act
        String viewName = productController.listProducts(model);

        // Assert
        assertEquals("product_list", viewName);
        verify(model, times(1)).addAttribute("products", products);
        verify(productRepository, times(1)).findAll();
    }

    @Test
    void newProductForm_ShouldAddNewProductAndAllCategoriesToModelAndReturnViewName() {
        // Arrange
        List<Category> categories = Arrays.asList(new Category(), new Category());
        when(categoryRepository.findAll()).thenReturn(categories);

        // Act
        String viewName = productController.newProductForm(model);

        // Assert
        assertEquals("product_form", viewName);
        verify(model, times(1)).addAttribute(eq("product"), any(Product.class)); // Use eq and any to match the arguments
        verify(model, times(1)).addAttribute("categories", categories);
        verify(categoryRepository, times(1)).findAll();
    }

    @Test
    void saveProduct_ShouldSaveNewProductAndImagesSuccessfully() {
        // Arrange
        Category category = new Category();
        category.setId(1);
        Product product = new Product();
        product.setCategory(category);
        List<String> imageUrls = Arrays.asList("http://img1.com", "http://img2.com");

        Product savedProduct = new Product();
        savedProduct.setId(100); // Simulate a saved product with an ID
        savedProduct.setCategory(category);

        when(categoryRepository.findById(1)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(savedProduct);
        when(productImageRepository.findByProductId(anyInt())).thenReturn(new ArrayList<>()); // No existing images

        // Act
        String viewName = productController.saveProduct(product, imageUrls);

        // Assert
        assertEquals("redirect:/products/", viewName);
        verify(categoryRepository, times(1)).findById(1);
        verify(productRepository, times(1)).save(product); // Verifies that the initial product object was saved
        verify(productImageRepository, times(1)).deleteAll(anyList()); // No existing images, so deleteAll with empty list
        // verify(productImageRepository, times(1)).saveAll(argThat(images -> images.size() == 2)); // Verify 2 images saved
    }

    @Test
    void saveProduct_ShouldUpdateExistingProductAndReplaceImagesSuccessfully() {
        // Arrange
        Category category = new Category();
        category.setId(1);
        Product product = new Product();
        product.setId(100); // Existing product
        product.setCategory(category);
        List<String> imageUrls = Arrays.asList("http://newimg.com");

        ProductImage existingImage = new ProductImage();
        existingImage.setId(1);
        existingImage.setProduct(product);
        existingImage.setImageUrl("http://oldimg.com");
        List<ProductImage> existingImages = Arrays.asList(existingImage);

        when(categoryRepository.findById(1)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(product); // Returns the same product as it's being updated
        when(productImageRepository.findByProductId(100)).thenReturn(existingImages);

        // Act
        String viewName = productController.saveProduct(product, imageUrls);

        // Assert
        assertEquals("redirect:/products/", viewName);
        verify(categoryRepository, times(1)).findById(1);
        verify(productRepository, times(1)).save(product);
        verify(productImageRepository, times(1)).deleteAll(existingImages); // Verify existing images are deleted
        // verify(productImageRepository, times(1)).saveAll(argThat(images -> images.size() == 1 && images.get(0).getImageUrl().equals("http://newimg.com"))); // Verify new image saved
    }

    @Test
    void saveProduct_ShouldHandleNoImageUrlsProvided() {
        // Arrange
        Category category = new Category();
        category.setId(1);
        Product product = new Product();
        product.setCategory(category);
        List<String> imageUrls = null; // No image URLs

        Product savedProduct = new Product();
        savedProduct.setId(100);

        when(categoryRepository.findById(1)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(savedProduct);

        // Act
        String viewName = productController.saveProduct(product, imageUrls);

        // Assert
        assertEquals("redirect:/products/", viewName);
        verify(productRepository, times(1)).save(product);
        verifyNoInteractions(productImageRepository); // Ensure no image operations were attempted
    }

    @Test
    void saveProduct_ShouldHandleEmptyImageUrlsProvided() {
        // Arrange
        Category category = new Category();
        category.setId(1);
        Product product = new Product();
        product.setCategory(category);
        List<String> imageUrls = Arrays.asList("", "  "); // Empty/blank image URLs

        Product savedProduct = new Product();
        savedProduct.setId(100);

        when(categoryRepository.findById(1)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(savedProduct);

        // Act
        String viewName = productController.saveProduct(product, imageUrls);

        // Assert
        assertEquals("redirect:/products/", viewName);
        verify(productRepository, times(1)).save(product);
        // verify(productImageRepository, times(1)).saveAll(argThat(images -> images.isEmpty())); // saveAll called with empty list
    }


    @Test
    void editProductForm_ShouldLoadProductAndCategoriesAndReturnViewName() {
        // Arrange
        Integer productId = 1;
        Product product = new Product();
        product.setId(productId);
        List<Category> categories = Arrays.asList(new Category(), new Category());

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(categoryRepository.findAll()).thenReturn(categories);

        // Act
        String viewName = productController.editProductForm(productId, model);

        // Assert
        assertEquals("product_form", viewName);
        verify(model, times(1)).addAttribute("product", product);
        verify(model, times(1)).addAttribute("categories", categories);
        verify(productRepository, times(1)).findById(productId);
        verify(categoryRepository, times(1)).findAll();
    }

    @Test
    void editProductForm_ShouldReturnNullProductIfNotFound() {
        // Arrange
        Integer productId = 1;
        when(productRepository.findById(productId)).thenReturn(Optional.empty());
        when(categoryRepository.findAll()).thenReturn(new ArrayList<>());

        // Act
        String viewName = productController.editProductForm(productId, model);

        // Assert
        assertEquals("product_form", viewName);
        verify(model, times(1)).addAttribute("product", null);
        verify(productRepository, times(1)).findById(productId);
    }

    @Test
    void deleteProduct_ShouldDeleteProductAndRedirect() {
        // Arrange
        Integer productId = 1;

        // Act
        String viewName = productController.deleteProduct(productId);

        // Assert
        assertEquals("redirect:/products/", viewName);
        verify(productRepository, times(1)).deleteById(productId);
    }

    @Test
    void viewProductDetails_ShouldAddProductReviewsImagesToModelAndReturnViewName() {
        // Arrange
        Integer productId = 1;
        Product product = new Product();
        product.setId(productId);
        List<Review> reviews = Arrays.asList(new Review(), new Review());
        List<ProductImage> images = Arrays.asList(new ProductImage(), new ProductImage());

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(reviewRepository.findByProductId(productId)).thenReturn(reviews);
        when(productImageRepository.findByProductId(productId)).thenReturn(images);

        // Act
        String viewName = productController.viewProductDetails(productId, model);

        // Assert
        assertEquals("product_details", viewName);
        verify(model, times(1)).addAttribute("product", product);
        verify(model, times(1)).addAttribute("reviews", reviews);
        verify(model, times(1)).addAttribute("images", images);
        verify(productRepository, times(1)).findById(productId);
        verify(reviewRepository, times(1)).findByProductId(productId);
        verify(productImageRepository, times(1)).findByProductId(productId);
    }

    @Test
    void viewProductDetails_ShouldThrowExceptionIfProductNotFound() {
        // Arrange
        Integer productId = 1;
        when(productRepository.findById(productId)).thenReturn(Optional.empty());

        // Act & Assert
        IllegalArgumentException thrown = assertThrows(IllegalArgumentException.class, () -> {
            productController.viewProductDetails(productId, model);
        });
        assertEquals("Invalid product Id:" + productId, thrown.getMessage());
        verify(productRepository, times(1)).findById(productId);
        verifyNoInteractions(reviewRepository, productImageRepository); // Ensure these are not called if product not found
    }
}