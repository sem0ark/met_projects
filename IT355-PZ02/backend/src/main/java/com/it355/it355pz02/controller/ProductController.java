package com.it355.it355pz02.controller;

import com.it355.it355pz02.model.ProductDTO;
import com.it355.it355pz02.model.ProductPostDTO;
import com.it355.it355pz02.model.Category;
import com.it355.it355pz02.model.Product;
import com.it355.it355pz02.model.ProductImage;
import com.it355.it355pz02.model.CategoryRepository;
import com.it355.it355pz02.model.ProductRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/app/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository; // To link categories to products

    @Autowired
    public ProductController(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    // GET all products
    // Corresponding frontend: useQuery_FetchProducts
    @GetMapping
    public ResponseEntity<List<ProductDTO>> getAllProducts() {
        List<Product> products = productRepository.findAll();
        List<ProductDTO> productDTOs = products.stream()
                .map(ProductDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(productDTOs);
    }

    // GET product by ID
    // Corresponding frontend: useQuery_FetchProduct(id), useQuery_FetchProductsFiltered (individually)
    @GetMapping("/{id}")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        Optional<Product> product = productRepository.findById(id);
        return product.map(p -> ResponseEntity.ok(ProductDTO.fromEntity(p)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // POST new product
    // Corresponding frontend: useQuery_AddProduct
    @PostMapping
    @Transactional // Ensures atomicity for saving product, categories, and images
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody ProductPostDTO productPostDTO) {
        Product product = new Product();
        product.setName(productPostDTO.getName());
        product.setDescription(productPostDTO.getDescription());
        product.setDescriptionLong(productPostDTO.getDescriptionLong());
        product.setPrice(productPostDTO.getPrice());
        product.setQuantity(productPostDTO.getQuantity());

        // Handle categories
        if (productPostDTO.getCategoryIds() != null && !productPostDTO.getCategoryIds().isEmpty()) {
            List<Category> categories = categoryRepository.findAllById(productPostDTO.getCategoryIds());
            if (categories.size() != productPostDTO.getCategoryIds().size()) {
                // Some category IDs were not found
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build(); // Or a more specific error
            }
            product.setCategories(new java.util.HashSet<>(categories));
        }

        // Handle images
        if (productPostDTO.getImageUrls() != null && !productPostDTO.getImageUrls().isEmpty()) {
            List<ProductImage> images = productPostDTO.getImageUrls().stream()
                    .map(url -> {
                        ProductImage img = new ProductImage();
                        img.setImageUrl(url);
                        img.setProduct(product); // Link back to the product
                        return img;
                    })
                    .collect(Collectors.toList());
            product.setImages(images);
        }

        Product savedProduct = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(ProductDTO.fromEntity(savedProduct));
    }

    // PUT update product
    // Corresponding frontend: useQuery_PutProduct(id)
    @PutMapping("/{id}")
    @Transactional // Ensures atomicity for updating product, categories, and images
    public ResponseEntity<ProductDTO> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductPostDTO productPostDTO) {
        Optional<Product> existingProductOptional = productRepository.findById(id);

        if (existingProductOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Product existingProduct = existingProductOptional.get();
        existingProduct.setName(productPostDTO.getName());
        existingProduct.setDescription(productPostDTO.getDescription());
        existingProduct.setDescriptionLong(productPostDTO.getDescriptionLong());
        existingProduct.setPrice(productPostDTO.getPrice());
        existingProduct.setQuantity(productPostDTO.getQuantity());

        // Update categories
        if (productPostDTO.getCategoryIds() != null && !productPostDTO.getCategoryIds().isEmpty()) {
            List<Category> categories = categoryRepository.findAllById(productPostDTO.getCategoryIds());
            if (categories.size() != productPostDTO.getCategoryIds().size()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build(); // Some category IDs were not found
            }
            existingProduct.setCategories(new java.util.HashSet<>(categories));
        } else {
            existingProduct.setCategories(new java.util.HashSet<>()); // Clear categories if none provided
        }

        // Update images: Clear old ones and add new ones
        existingProduct.getImages().clear(); // This will trigger orphanRemoval for old images
        if (productPostDTO.getImageUrls() != null && !productPostDTO.getImageUrls().isEmpty()) {
            productPostDTO.getImageUrls().forEach(url -> {
                ProductImage newImage = new ProductImage();
                newImage.setImageUrl(url);
                existingProduct.addImage(newImage); // Use helper method to set product on image
            });
        }

        Product updatedProduct = productRepository.save(existingProduct);
        return ResponseEntity.ok(ProductDTO.fromEntity(updatedProduct));
    }

    // DELETE product
    // Corresponding frontend: useQuery_DeleteProduct(id)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        if (!productRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        productRepository.deleteById(id);
        return ResponseEntity.noContent().build(); // 204 No Content
    }
}
