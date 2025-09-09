package com.it355.it355pz02.controller;

import com.it355.it355pz02.controller.dto.ProductDTO;
import com.it355.it355pz02.controller.dto.ProductPostDTO;
import com.it355.it355pz02.model.Category;
import com.it355.it355pz02.model.Product;
import com.it355.it355pz02.model.ProductImage;
import com.it355.it355pz02.model.CategoryRepository;
import com.it355.it355pz02.model.ProductRepository;
import com.it355.it355pz02.utils.APIException;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;
import java.util.HashSet;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @Autowired
    public ProductController(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public ResponseEntity<List<ProductDTO>> getAllProducts() {
        List<Product> products = productRepository.findAll();
        List<ProductDTO> productDTOs = products.stream()
                .map(ProductDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(productDTOs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new APIException(HttpStatus.NOT_FOUND, "Product not found with ID: " + id));
        return ResponseEntity.ok(ProductDTO.fromEntity(product));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody ProductPostDTO productPostDTO) {
        Product product = new Product();
        product.setName(productPostDTO.getName());
        product.setDescription(productPostDTO.getDescription());
        product.setDescriptionLong(productPostDTO.getDescriptionLong());
        product.setPrice(productPostDTO.getPrice());

        if (productPostDTO.getCategoryIds() != null && !productPostDTO.getCategoryIds().isEmpty()) {
            List<Category> categories = categoryRepository.findAllById(productPostDTO.getCategoryIds());
            if (categories.size() != productPostDTO.getCategoryIds().size()) {
                // Some provided category IDs were not found in the database
                throw new APIException(HttpStatus.BAD_REQUEST, "One or more provided category IDs are invalid.");
            }
            product.setCategories(new HashSet<>(categories));
        } else {
            product.setCategories(new HashSet<>());
        }

        if (productPostDTO.getImageUrls() != null && !productPostDTO.getImageUrls().isEmpty()) {
            productPostDTO.getImageUrls().stream()
                .forEach(url -> {
                    ProductImage img = new ProductImage();
                    img.setImageUrl(url);
                    product.addImage(img); // This relies on CascadeType.PERSIST on Product.images
                });
        }

        Product savedProduct = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(ProductDTO.fromEntity(savedProduct));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ProductDTO> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductPostDTO productPostDTO) {
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new APIException(HttpStatus.NOT_FOUND, "Product not found with ID: " + id));

        existingProduct.setName(productPostDTO.getName());
        existingProduct.setDescription(productPostDTO.getDescription());
        existingProduct.setDescriptionLong(productPostDTO.getDescriptionLong());
        existingProduct.setPrice(productPostDTO.getPrice());

        if (productPostDTO.getCategoryIds() != null && !productPostDTO.getCategoryIds().isEmpty()) {
            List<Category> categories = categoryRepository.findAllById(productPostDTO.getCategoryIds());
            if (categories.size() != productPostDTO.getCategoryIds().size()) {
                // Some provided category IDs were not found in the database
                throw new APIException(HttpStatus.BAD_REQUEST, "One or more provided category IDs are invalid for update.");
            }
            existingProduct.setCategories(new HashSet<>(categories));
        } else {
            existingProduct.setCategories(new HashSet<>());
        }

        // Clear existing images and add new ones
        existingProduct.getImages().clear();
        if (productPostDTO.getImageUrls() != null && !productPostDTO.getImageUrls().isEmpty()) {
            productPostDTO.getImageUrls().forEach(url -> {
                ProductImage newImage = new ProductImage();
                newImage.setImageUrl(url);
                existingProduct.addImage(newImage);
            });
        }

        Product updatedProduct = productRepository.save(existingProduct);
        return ResponseEntity.ok(ProductDTO.fromEntity(updatedProduct));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        if (!productRepository.existsById(id)) {
            throw new APIException(HttpStatus.NOT_FOUND, "Product not found with ID: " + id);
        }
        productRepository.deleteById(id);
        return ResponseEntity.noContent().build(); // 204 No Content
    }
}