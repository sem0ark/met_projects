package com.it355.app.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.it355.app.model.*;

@Controller
@RequestMapping("/products")
public class ProductController {
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private ProductImageRepository productImageRepository;
    @Autowired
    private ReviewRepository reviewRepository;

    @GetMapping("/") // Updated to /products/ for consistency with @RequestMapping
    public String listProducts(Model model) {
        model.addAttribute("products", productRepository.findAll());
        return "product_list";
    }

    @GetMapping("/new")
    public String newProductForm(Model model) {
        Product product = new Product();
        product.setPrice(BigDecimal.ZERO); // Initialize BigDecimal price
        model.addAttribute("product", product);
        model.addAttribute("categories", categoryRepository.findAll()); // Pass categories to the form
        return "product_form";
    }

    @PostMapping("/save")
    public String saveProduct(@ModelAttribute Product product,
            @RequestParam(value = "imageUrls", required = false) List<String> imageUrls) {

        Optional<Category> categoryOpt = categoryRepository.findById(product.getCategory().getId());
        categoryOpt.ifPresent(product::setCategory);

        Product savedProduct = productRepository.save(product);

        if (imageUrls != null) {
            if (savedProduct.getId() != null) {
                List<ProductImage> existingImages = productImageRepository.findByProductId(savedProduct.getId());
                productImageRepository.deleteAll(existingImages);
            }

            List<ProductImage> newImages = new ArrayList<>();
            for (String url : imageUrls) {
                if (url != null && !url.trim().isEmpty()) {
                    ProductImage image = new ProductImage();
                    image.setProduct(savedProduct);
                    image.setImageUrl(url.trim());
                    newImages.add(image);
                }
            }
            productImageRepository.saveAll(newImages);
        }

        return "redirect:/products/";
    }

    @GetMapping("/edit/{id}")
    public String editProductForm(@PathVariable Integer id, Model model) {
        Product product = productRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Invalid product Id:" + id));
        model.addAttribute("product", product);
        model.addAttribute("categories", categoryRepository.findAll());
        return "product_form";
    }

    @GetMapping("/delete/{id}")
    public String deleteProduct(@PathVariable Integer id) {
        productRepository.deleteById(id);
        return "redirect:/products/";
    }

    // New: View product details, including reviews and images
    @GetMapping("/details/{id}")
    public String viewProductDetails(@PathVariable Integer id, Model model) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invalid product Id:" + id));
        model.addAttribute("product", product);
        model.addAttribute("reviews", reviewRepository.findByProductId(id));
        model.addAttribute("images", productImageRepository.findByProductId(id));
        return "product_details"; // New template for details
    }
}
