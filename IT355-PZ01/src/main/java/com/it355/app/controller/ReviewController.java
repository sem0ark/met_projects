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
@RequestMapping("/reviews")
public class ReviewController {
    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository; // To link reviews to products
    private final CommentRepository commentRepository; // To list comments

    @Autowired
    public ReviewController(ReviewRepository reviewRepository, ProductRepository productRepository,
            CommentRepository commentRepository) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.commentRepository = commentRepository;
    }

    @GetMapping("/")
    public String listReviews(Model model) {
        model.addAttribute("reviews", reviewRepository.findAll());
        return "review_list";
    }

    @GetMapping("/new")
    public String newReviewForm(@RequestParam(required = false) Integer productId, Model model) {
        Review review = new Review();
        if (productId != null) {
            Optional<Product> productOpt = productRepository.findById(productId);
            productOpt.ifPresent(review::setProduct);
            model.addAttribute("product", productOpt.orElse(null)); // Pass product to display
        }
        model.addAttribute("review", review);
        return "review_form";
    }

    @PostMapping("/save")
    public String saveReview(@ModelAttribute Review review) {
        // Ensure product is correctly linked
        if (review.getProduct() != null && review.getProduct().getId() != null) {
            Optional<Product> productOpt = productRepository.findById(review.getProduct().getId());
            productOpt.ifPresent(review::setProduct);
        } else {
            throw new IllegalArgumentException("Review must be associated with a product.");
        }
        reviewRepository.save(review);
        return "redirect:/reviews/";
    }

    @GetMapping("/edit/{id}")
    public String editReviewForm(@PathVariable Integer id, Model model) {
        Review review = reviewRepository.findById(id).orElse(null);
        model.addAttribute("review", review);
        if (review != null && review.getProduct() != null) {
            model.addAttribute("product", review.getProduct());
        }
        return "review_form";
    }

    @GetMapping("/delete/{id}")
    public String deleteReview(@PathVariable Integer id) {
        reviewRepository.deleteById(id);
        return "redirect:/reviews/";
    }

    @GetMapping("/details/{id}")
    public String viewReviewDetails(@PathVariable Integer id, Model model) {
        Review review = reviewRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Invalid review Id:" + id));
        model.addAttribute("review", review);
        model.addAttribute("comments", commentRepository.findByReviewId(id));
        return "review_details"; // New template for details
    }
}
