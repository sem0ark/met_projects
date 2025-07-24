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
@RequestMapping("/comments")
public class CommentController {
    @Autowired
    private CommentRepository commentRepository;
    
    @Autowired
    private ReviewRepository reviewRepository; // To link comments to reviews

    @GetMapping("/")
    public String listComments(Model model) {
        model.addAttribute("comments", commentRepository.findAll());
        return "comment_list";
    }

    @GetMapping("/new")
    public String newCommentForm(@RequestParam Integer reviewId, Model model) {
        Comment comment = new Comment();
        Optional<Review> reviewOpt = reviewRepository.findById(reviewId);
        reviewOpt.ifPresent(comment::setReview);
        model.addAttribute("comment", comment);
        model.addAttribute("review", reviewOpt.orElse(null)); // Pass review to display
        return "comment_form";
    }

    @PostMapping("/save")
    public String saveComment(@ModelAttribute Comment comment) {
        // Ensure review is correctly linked
        if (comment.getReview() != null && comment.getReview().getId() != null) {
            Optional<Review> reviewOpt = reviewRepository.findById(comment.getReview().getId());
            reviewOpt.ifPresent(comment::setReview);
        } else {
            throw new IllegalArgumentException("Comment must be associated with a review.");
        }
        commentRepository.save(comment);
        return "redirect:/reviews/details/" + comment.getReview().getId(); // Redirect back to review details
    }

    @GetMapping("/edit/{id}")
    public String editCommentForm(@PathVariable Integer id, Model model) {
        Comment comment = commentRepository.findById(id).orElse(null);
        model.addAttribute("comment", comment);
        if (comment != null && comment.getReview() != null) {
            model.addAttribute("review", comment.getReview());
        }
        return "comment_form";
    }

    @GetMapping("/delete/{id}")
    public String deleteComment(@PathVariable Integer id) {
        Integer reviewId = commentRepository.findById(id).map(Comment::getReview).map(Review::getId).orElse(null);
        commentRepository.deleteById(id);
        if (reviewId != null) {
            return "redirect:/reviews/details/" + reviewId; // Redirect back to review details
        }
        return "redirect:/comments/"; // Fallback if review ID not found
    }
}
