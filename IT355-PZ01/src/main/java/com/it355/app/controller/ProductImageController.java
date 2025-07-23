package com.it355.app.controller;

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
@RequestMapping("/images")
public class ProductImageController {
    private final ProductImageRepository productImageRepository;
    private final ProductRepository productRepository;

    @Autowired
    public ProductImageController(ProductImageRepository productImageRepository, ProductRepository productRepository) {
        this.productImageRepository = productImageRepository;
        this.productRepository = productRepository;
    }

    @GetMapping("/new")
    public String newProductImageForm(@RequestParam Integer productId, Model model) {
        ProductImage image = new ProductImage();
        Optional<Product> productOpt = productRepository.findById(productId);
        productOpt.ifPresent(image::setProduct);
        model.addAttribute("image", image);
        model.addAttribute("product", productOpt.orElse(null));
        return "image_form"; // You'd create image_form.html
    }

    @PostMapping("/save")
    public String saveProductImage(@ModelAttribute ProductImage image) {
        if (image.getProduct() != null && image.getProduct().getId() != null) {
            Optional<Product> productOpt = productRepository.findById(image.getProduct().getId());
            productOpt.ifPresent(image::setProduct);
        } else {
            throw new IllegalArgumentException("Image must be associated with a product.");
        }
        productImageRepository.save(image);
        return "redirect:/products/details/" + image.getProduct().getId(); // Redirect back to product details
    }

    @GetMapping("/delete/{id}")
    public String deleteProductImage(@PathVariable Integer id) {
        Integer productId = productImageRepository.findById(id).map(ProductImage::getProduct).map(Product::getId)
                .orElse(null);
        productImageRepository.deleteById(id);
        if (productId != null) {
            return "redirect:/products/details/" + productId;
        }
        return "redirect:/products/"; // Fallback
    }
}
